import express from 'express';
import cors from 'cors';
import { query } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

import { syncTraktorNML } from './traktorSync.js';
import { syncSoundcloudSets } from './scrapers/soundcloud.js';
import { syncMixcloudSets } from './scrapers/mixcloud.js';

// Sync status tracking
export const syncStatus = {
    traktor: { status: 'idle', last_sync: null, message: '', progress: 0 },
    soundcloud: { status: 'idle', last_sync: null, message: '', progress: 0 },
    mixcloud: { status: 'idle', last_sync: null, message: '', progress: 0 }
};

app.get('/api/health', async (req, res) => {
    try {
        const result = await query('SELECT NOW()');
        res.json({ status: 'ok', db_time: result.rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
});

app.get('/api/tracks', async (req, res) => {
    try {
        const result = await query('SELECT * FROM tracks ORDER BY artist, title');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tracks' });
    }
});

import multer from 'multer';

// Setup multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/sync/traktor', upload.single('nml'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No NML file uploaded' });
    }
    const xmlData = req.file.buffer.toString('utf8');
    
    syncStatus.traktor = { status: 'syncing', last_sync: new Date(), message: 'Processing NML file...', progress: 10 };
    
    syncTraktorNML(xmlData)
        .then(() => {
            syncStatus.traktor = { status: 'completed', last_sync: new Date(), message: 'Traktor sync complete.', progress: 100 };
        })
        .catch(err => {
            syncStatus.traktor = { status: 'error', last_sync: new Date(), message: err.message, progress: 0 };
        });

    res.json({ message: 'Traktor sync started' });
});

app.post('/api/sync/soundcloud', async (req, res) => {
    syncStatus.soundcloud = { status: 'syncing', last_sync: new Date(), message: 'Connecting to SoundCloud...', progress: 10 };
    
    syncSoundcloudSets()
        .then(result => {
             if (result && result.success === false) {
                 syncStatus.soundcloud = { status: 'error', last_sync: new Date(), message: result.message, progress: 0 };
             } else {
                 syncStatus.soundcloud = { status: 'completed', last_sync: new Date(), message: 'SoundCloud sync complete.', progress: 100 };
             }
        })
        .catch(err => {
            syncStatus.soundcloud = { status: 'error', last_sync: new Date(), message: err.message, progress: 0 };
        });
        
    res.json({ message: 'SoundCloud sync started' });
});

app.post('/api/sync/mixcloud', async (req, res) => {
    syncStatus.mixcloud = { status: 'syncing', last_sync: new Date(), message: 'Fetching Mixcloud data...', progress: 10 };
    
    syncMixcloudSets()
        .then(() => {
            syncStatus.mixcloud = { status: 'completed', last_sync: new Date(), message: 'Mixcloud sync complete.', progress: 100 };
        })
        .catch(err => {
            syncStatus.mixcloud = { status: 'error', last_sync: new Date(), message: err.message, progress: 0 };
        });

    res.json({ message: 'Mixcloud sync started' });
});

app.get('/api/sync/status', (req, res) => {
    res.json(syncStatus);
});

import { initializeDatabase } from './initDb.js';

app.listen(PORT, async () => {
    await initializeDatabase();
    console.log(`Backend server running on port ${PORT}`);
});
