import crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import { query, transaction } from './db.js';
import { syncStatus } from './server.js';

// Genre-to-color mapping for cover art generation
const GENRE_COLORS = {
    techno: '#f43f5e',
    house: '#10b981',
    trance: '#8b5cf6',
    'drum and bass': '#f59e0b',
    'drum & bass': '#f59e0b',
    dnb: '#f59e0b',
    dubstep: '#6366f1',
    ambient: '#06b6d4',
    minimal: '#ec4899',
    progressive: '#14b8a6',
};

function genreToColor(genre) {
    if (!genre) return '#3b82f6';
    const lower = genre.toLowerCase();
    for (const [key, color] of Object.entries(GENRE_COLORS)) {
        if (lower.includes(key)) return color;
    }
    return '#3b82f6';
}

function generateTraktorId(filePath) {
    if (!filePath) return crypto.randomUUID();
    return crypto.createHash('sha256').update(filePath).digest('hex');
}

function extractFilePath(location) {
    if (!location) return '';
    const volume = location['@_VOLUME'] || '';
    const dir = location['@_DIR'] || '';
    const file = location['@_FILE'] || '';
    return volume + dir + file;
}

export async function syncTraktorNML(xmlData) {
    console.log('Starting Traktor NML Sync...');

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
    });

    const parsed = parser.parse(xmlData);

    const collection = parsed.NML?.COLLECTION?.ENTRY;
    if (!collection) {
        throw new Error('No entries found in NML file. Invalid or empty collection.');
    }

    const entries = Array.isArray(collection) ? collection : [collection];
    console.log(`Found ${entries.length} tracks in NML.`);

    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const totalEntries = entries.length;

    // Process tracks in batches of 100 within transactions
    const BATCH_SIZE = 100;
    for (let batchStart = 0; batchStart < entries.length; batchStart += BATCH_SIZE) {
        const batch = entries.slice(batchStart, batchStart + BATCH_SIZE);

        try {
            await transaction(async (client) => {
                for (let j = 0; j < batch.length; j++) {
                    const i = batchStart + j;
                    const entry = batch[j];

                    // Update progress
                    if (i % Math.ceil(totalEntries / 20) === 0) {
                        syncStatus.traktor.progress = Math.round(10 + (i / totalEntries) * 75);
                        syncStatus.traktor.message = `Processing track ${i + 1} of ${totalEntries}...`;
                    }

                    const title = entry['@_TITLE'] || '';
                    const artist = entry['@_ARTIST'] || '';
                    const info = entry.INFO || {};
                    const filePath = extractFilePath(entry.LOCATION);
                    const traktorId = generateTraktorId(filePath);

                    const bpm = entry.TEMPO ? parseFloat(entry.TEMPO['@_BPM']) || 0 : 0;
                    const album = entry.ALBUM ? (entry.ALBUM['@_TITLE'] || '') : '';
                    const genre = info['@_GENRE'] || '';
                    const comment = info['@_COMMENT'] || '';
                    const keyInfo = info['@_KEY_TEXT'] || info['@_KEY'] || '';
                    const rating = parseInt(info['@_RATING']) || 0;
                    const colorPattern = genreToColor(genre);

                    try {
                        const result = await client.query(`
                            INSERT INTO tracks (traktor_id, artist, title, album, genre, color_pattern, bpm, key, comment, rating, file_path)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                            ON CONFLICT (traktor_id) DO UPDATE SET
                                artist = EXCLUDED.artist,
                                title = EXCLUDED.title,
                                album = EXCLUDED.album,
                                genre = EXCLUDED.genre,
                                color_pattern = EXCLUDED.color_pattern,
                                bpm = EXCLUDED.bpm,
                                key = EXCLUDED.key,
                                comment = EXCLUDED.comment,
                                rating = EXCLUDED.rating,
                                file_path = EXCLUDED.file_path,
                                updated_at = CURRENT_TIMESTAMP
                            RETURNING (xmax = 0) AS is_insert
                        `, [traktorId, artist, title, album, genre, colorPattern, bpm, keyInfo, comment, rating, filePath]);

                        if (result.rows[0].is_insert) {
                            inserted++;
                        } else {
                            updated++;
                        }
                    } catch (err) {
                        console.error(`Failed to upsert track "${artist} - ${title}":`, err.message);
                        failed++;
                    }
                }
            });
        } catch (err) {
            console.error(`Batch transaction failed at offset ${batchStart}:`, err.message);
            failed += batch.length;
        }
    }

    // Process playlists
    syncStatus.traktor.progress = 90;
    syncStatus.traktor.message = 'Syncing playlists...';

    const playlistsNode = parsed.NML?.PLAYLISTS?.NODE;
    if (playlistsNode) {
        await syncPlaylistNode(playlistsNode, '');
    }

    console.log(`NML sync complete: ${inserted} inserted, ${updated} updated, ${failed} failed.`);
    return { inserted, updated, failed };
}

/**
 * Recursively traverse playlist folders and sync PLAYLIST-type nodes.
 */
async function syncPlaylistNode(node, prefix) {
    const subnodes = node.SUBNODES?.NODE;
    if (!subnodes) return;

    const nodes = Array.isArray(subnodes) ? subnodes : [subnodes];

    for (const child of nodes) {
        if (!child) continue;
        const name = child['@_NAME'] || '';
        const type = child['@_TYPE'] || '';

        if (type === 'FOLDER') {
            // Recurse into folders
            await syncPlaylistNode(child, prefix ? `${prefix}/${name}` : name);
        } else if (type === 'PLAYLIST') {
            const fullName = prefix ? `${prefix}/${name}` : name;
            await syncSinglePlaylist(child, fullName);
        }
    }
}

async function syncSinglePlaylist(pNode, fullName) {
    try {
        // Upsert playlist
        const res = await query(
            `INSERT INTO playlists (name, type) VALUES ($1, 'local') ON CONFLICT (name) DO NOTHING RETURNING id`,
            [fullName]
        );
        let playlistId;
        if (res.rows.length > 0) {
            playlistId = res.rows[0].id;
        } else {
            const sel = await query('SELECT id FROM playlists WHERE name = $1', [fullName]);
            if (sel.rows.length === 0) return;
            playlistId = sel.rows[0].id;
        }

        const pTracks = pNode.PLAYLIST?.ENTRY;
        if (!pTracks) return;

        const pTrackArray = Array.isArray(pTracks) ? pTracks : [pTracks];

        await transaction(async (client) => {
            // Clear existing mapping
            await client.query('DELETE FROM playlist_tracks WHERE playlist_id = $1', [playlistId]);

            for (let i = 0; i < pTrackArray.length; i++) {
                const pt = pTrackArray[i];
                const primaryKey = pt?.PRIMARYKEY;
                if (!primaryKey) continue;

                const pkKey = primaryKey['@_KEY'] || '';
                if (!pkKey) continue;

                // Match by file_path (Traktor PRIMARYKEY is the file location)
                const dbTrack = await client.query(
                    'SELECT id FROM tracks WHERE file_path = $1 LIMIT 1',
                    [pkKey]
                );
                if (dbTrack.rows.length > 0) {
                    await client.query(
                        'INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                        [playlistId, dbTrack.rows[0].id, i + 1]
                    );
                }
            }
        });

        console.log(`Synced playlist: ${fullName} (${pTrackArray.length} tracks)`);
    } catch (err) {
        console.error(`Error syncing playlist "${fullName}":`, err.message);
    }
}
