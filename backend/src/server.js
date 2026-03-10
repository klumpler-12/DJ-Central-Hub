import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { query, transaction } from './db.js';
import { initializeDatabase } from './initDb.js';
import { syncTraktorNML } from './traktorSync.js';
import { syncMixcloudSets } from './scrapers/mixcloud.js';
import { parseTracklist } from './scrapers/tracklistParser.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max for NML/audio files
});

// ─── Sync Status ────────────────────────────────────────────────────────────
export const syncStatus = {
    traktor: { status: 'idle', last_sync: null, message: '', progress: 0 },
    soundcloud: { status: 'idle', last_sync: null, message: '', progress: 0 },
    mixcloud: { status: 'idle', last_sync: null, message: '', progress: 0 }
};

// ─── Health ─────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
    try {
        const result = await query('SELECT NOW()');
        res.json({ status: 'ok', db_time: result.rows[0].now });
    } catch (err) {
        console.error('Health check failed:', err.message);
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
});

// ─── Stats ──────────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
    try {
        const [totalRes, playedRes, genreRes, setsRes, plannedRes] = await Promise.all([
            query('SELECT COUNT(*) as count FROM tracks'),
            query('SELECT COUNT(*) as count FROM tracks WHERE played = true'),
            query('SELECT genre, COUNT(*) as count FROM tracks WHERE genre IS NOT NULL AND genre != \'\' GROUP BY genre ORDER BY count DESC LIMIT 10'),
            query('SELECT COUNT(*) as count FROM played_sets'),
            query('SELECT COUNT(*) as count FROM planned_sets'),
        ]);
        res.json({
            total_tracks: parseInt(totalRes.rows[0].count),
            played_tracks: parseInt(playedRes.rows[0].count),
            top_genres: genreRes.rows,
            total_played_sets: parseInt(setsRes.rows[0].count),
            total_planned_sets: parseInt(plannedRes.rows[0].count),
        });
    } catch (err) {
        console.error('Stats error:', err.message);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ─── Tracks (with server-side pagination, sorting, filtering) ───────────────
app.get('/api/tracks', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
        const offset = (page - 1) * limit;
        const sort = ['artist', 'title', 'genre', 'bpm', 'key', 'rating', 'played', 'created_at'].includes(req.query.sort)
            ? req.query.sort : 'artist';
        const order = req.query.order === 'desc' ? 'DESC' : 'ASC';
        const search = req.query.search || '';
        const genre = req.query.genre || '';

        let whereClauses = [];
        let params = [];
        let paramIdx = 1;

        if (search) {
            whereClauses.push(`(LOWER(artist) LIKE $${paramIdx} OR LOWER(title) LIKE $${paramIdx} OR LOWER(album) LIKE $${paramIdx})`);
            params.push(`%${search.toLowerCase()}%`);
            paramIdx++;
        }
        if (genre) {
            whereClauses.push(`LOWER(genre) = $${paramIdx}`);
            params.push(genre.toLowerCase());
            paramIdx++;
        }

        const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

        const [dataRes, countRes] = await Promise.all([
            query(`SELECT * FROM tracks ${whereSQL} ORDER BY ${sort} ${order} NULLS LAST LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
                [...params, limit, offset]),
            query(`SELECT COUNT(*) as count FROM tracks ${whereSQL}`, params),
        ]);

        res.json({
            tracks: dataRes.rows,
            total: parseInt(countRes.rows[0].count),
            page,
            limit,
            totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit),
        });
    } catch (err) {
        console.error('Tracks error:', err.message);
        res.status(500).json({ error: 'Failed to fetch tracks' });
    }
});

app.get('/api/genres', async (req, res) => {
    try {
        const result = await query("SELECT DISTINCT genre FROM tracks WHERE genre IS NOT NULL AND genre != '' ORDER BY genre");
        res.json(result.rows.map(r => r.genre));
    } catch (err) {
        console.error('Genres error:', err.message);
        res.status(500).json({ error: 'Failed to fetch genres' });
    }
});

// ─── Sync: Traktor ──────────────────────────────────────────────────────────
app.post('/api/sync/traktor', upload.single('nml'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No NML file uploaded' });
    }

    if (syncStatus.traktor.status === 'syncing') {
        return res.status(409).json({ error: 'Traktor sync already in progress' });
    }

    const xmlData = req.file.buffer.toString('utf8');
    syncStatus.traktor = { status: 'syncing', last_sync: new Date(), message: 'Processing NML file...', progress: 10 };

    syncTraktorNML(xmlData)
        .then((result) => {
            syncStatus.traktor = {
                status: 'completed', last_sync: new Date(),
                message: `Sync complete: ${result.inserted} new, ${result.updated} updated, ${result.failed} failed.`,
                progress: 100
            };
        })
        .catch(err => {
            console.error('Traktor sync error:', err);
            syncStatus.traktor = { status: 'error', last_sync: new Date(), message: err.message, progress: 0 };
        });

    res.json({ message: 'Traktor sync started' });
});

// ─── Sync: Mixcloud ─────────────────────────────────────────────────────────
app.post('/api/sync/mixcloud', async (req, res) => {
    if (syncStatus.mixcloud.status === 'syncing') {
        return res.status(409).json({ error: 'Mixcloud sync already in progress' });
    }

    syncStatus.mixcloud = { status: 'syncing', last_sync: new Date(), message: 'Fetching Mixcloud data...', progress: 10 };

    syncMixcloudSets()
        .then((result) => {
            syncStatus.mixcloud = {
                status: 'completed', last_sync: new Date(),
                message: `Synced ${result.setsProcessed} sets, ${result.tracksMatched} tracks matched.`,
                progress: 100
            };
        })
        .catch(err => {
            console.error('Mixcloud sync error:', err);
            syncStatus.mixcloud = { status: 'error', last_sync: new Date(), message: err.message, progress: 0 };
        });

    res.json({ message: 'Mixcloud sync started' });
});

// ─── Sync Status ────────────────────────────────────────────────────────────
app.get('/api/sync/status', (req, res) => {
    res.json(syncStatus);
});

// ─── Tracklist Parser (replaces broken SoundCloud scraper) ──────────────────
app.post('/api/tracklist/parse', async (req, res) => {
    try {
        const { text, source, title } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'No tracklist text provided' });
        }
        const result = await parseTracklist(text, source || 'manual', title || 'Untitled');
        res.json(result);
    } catch (err) {
        console.error('Tracklist parse error:', err.message);
        res.status(500).json({ error: 'Failed to parse tracklist' });
    }
});

app.get('/api/tracklist/imports', async (req, res) => {
    try {
        const result = await query('SELECT * FROM tracklist_imports ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        console.error('Tracklist imports error:', err.message);
        res.status(500).json({ error: 'Failed to fetch imports' });
    }
});

// ─── Planned Sets CRUD ──────────────────────────────────────────────────────
app.get('/api/planned-sets', async (req, res) => {
    try {
        const result = await query(`
            SELECT ps.*,
                   COUNT(pst.id) as track_count
            FROM planned_sets ps
            LEFT JOIN planned_set_tracks pst ON ps.id = pst.planned_set_id
            GROUP BY ps.id
            ORDER BY ps.updated_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Planned sets error:', err.message);
        res.status(500).json({ error: 'Failed to fetch planned sets' });
    }
});

app.post('/api/planned-sets', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Set name is required' });
        }
        const result = await query(
            'INSERT INTO planned_sets (name, description) VALUES ($1, $2) RETURNING *',
            [name.trim(), description || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Create planned set error:', err.message);
        res.status(500).json({ error: 'Failed to create planned set' });
    }
});

app.get('/api/planned-sets/:id', async (req, res) => {
    try {
        const setRes = await query('SELECT * FROM planned_sets WHERE id = $1', [req.params.id]);
        if (setRes.rows.length === 0) {
            return res.status(404).json({ error: 'Planned set not found' });
        }
        const tracksRes = await query(`
            SELECT pst.*, t.artist, t.title, t.genre, t.bpm, t.key, t.color_pattern, t.played, t.rating
            FROM planned_set_tracks pst
            JOIN tracks t ON pst.track_id = t.id
            WHERE pst.planned_set_id = $1
            ORDER BY pst.position
        `, [req.params.id]);
        res.json({ ...setRes.rows[0], tracks: tracksRes.rows });
    } catch (err) {
        console.error('Get planned set error:', err.message);
        res.status(500).json({ error: 'Failed to fetch planned set' });
    }
});

app.put('/api/planned-sets/:id', async (req, res) => {
    try {
        const { name, description } = req.body;
        const result = await query(
            'UPDATE planned_sets SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [name, description, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Planned set not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Update planned set error:', err.message);
        res.status(500).json({ error: 'Failed to update planned set' });
    }
});

app.delete('/api/planned-sets/:id', async (req, res) => {
    try {
        const result = await query('DELETE FROM planned_sets WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Planned set not found' });
        }
        res.json({ deleted: true });
    } catch (err) {
        console.error('Delete planned set error:', err.message);
        res.status(500).json({ error: 'Failed to delete planned set' });
    }
});

// Add track to planned set
app.post('/api/planned-sets/:id/tracks', async (req, res) => {
    try {
        const { track_id } = req.body;
        if (!track_id) return res.status(400).json({ error: 'track_id is required' });

        // Get next position
        const posRes = await query(
            'SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM planned_set_tracks WHERE planned_set_id = $1',
            [req.params.id]
        );
        const result = await query(
            'INSERT INTO planned_set_tracks (planned_set_id, track_id, position) VALUES ($1, $2, $3) RETURNING *',
            [req.params.id, track_id, posRes.rows[0].next_pos]
        );
        await query('UPDATE planned_sets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Track already in this set' });
        }
        console.error('Add track to set error:', err.message);
        res.status(500).json({ error: 'Failed to add track' });
    }
});

// Remove track from planned set
app.delete('/api/planned-sets/:id/tracks/:trackId', async (req, res) => {
    try {
        await query(
            'DELETE FROM planned_set_tracks WHERE planned_set_id = $1 AND track_id = $2',
            [req.params.id, req.params.trackId]
        );
        await query('UPDATE planned_sets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
        res.json({ deleted: true });
    } catch (err) {
        console.error('Remove track error:', err.message);
        res.status(500).json({ error: 'Failed to remove track' });
    }
});

// Reorder tracks in planned set
app.put('/api/planned-sets/:id/reorder', async (req, res) => {
    try {
        const { track_ids } = req.body; // array of track_id in desired order
        if (!Array.isArray(track_ids)) {
            return res.status(400).json({ error: 'track_ids array is required' });
        }

        await transaction(async (client) => {
            for (let i = 0; i < track_ids.length; i++) {
                await client.query(
                    'UPDATE planned_set_tracks SET position = $1 WHERE planned_set_id = $2 AND track_id = $3',
                    [i + 1, req.params.id, track_ids[i]]
                );
            }
        });
        await query('UPDATE planned_sets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
        res.json({ reordered: true });
    } catch (err) {
        console.error('Reorder error:', err.message);
        res.status(500).json({ error: 'Failed to reorder tracks' });
    }
});

// ─── Video Jobs ─────────────────────────────────────────────────────────────
app.post('/api/video/generate', upload.single('audio'), async (req, res) => {
    try {
        const { start_time, duration, is_preview } = req.body;
        const audioFilename = req.file ? req.file.originalname : req.body.audio_filename;

        if (!audioFilename) {
            return res.status(400).json({ error: 'Audio file or filename is required' });
        }

        const result = await query(
            `INSERT INTO video_jobs (audio_filename, start_time, duration, is_preview, status)
             VALUES ($1, $2, $3, $4, 'queued') RETURNING *`,
            [audioFilename, start_time || '00:00:00', parseInt(duration) || 30, is_preview === 'true' || is_preview === true]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Video generate error:', err.message);
        res.status(500).json({ error: 'Failed to create video job' });
    }
});

app.get('/api/video/jobs', async (req, res) => {
    try {
        const result = await query('SELECT * FROM video_jobs ORDER BY created_at DESC LIMIT 20');
        res.json(result.rows);
    } catch (err) {
        console.error('Video jobs error:', err.message);
        res.status(500).json({ error: 'Failed to fetch video jobs' });
    }
});

app.get('/api/video/jobs/:id', async (req, res) => {
    try {
        const result = await query('SELECT * FROM video_jobs WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Video job error:', err.message);
        res.status(500).json({ error: 'Failed to fetch video job' });
    }
});

// ─── Played Sets ────────────────────────────────────────────────────────────
app.get('/api/played-sets', async (req, res) => {
    try {
        const result = await query(`
            SELECT ps.*, COUNT(pst.id) as track_count
            FROM played_sets ps
            LEFT JOIN played_set_tracks pst ON ps.id = pst.played_set_id
            GROUP BY ps.id
            ORDER BY ps.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Played sets error:', err.message);
        res.status(500).json({ error: 'Failed to fetch played sets' });
    }
});

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
    await initializeDatabase();
    console.log(`DJ Central Hub backend running on port ${PORT}`);
});
