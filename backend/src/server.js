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
    
    // Fire and forget, or wait
    syncTraktorNML(xmlData).catch(console.error);
    res.json({ message: 'Traktor sync started from uploaded file' });
});

app.post('/api/sync/soundcloud', async (req, res) => {
    await syncSoundcloudSets().catch(console.error);
    res.json({ message: 'SoundCloud sync finished' });
});

app.post('/api/sync/mixcloud', async (req, res) => {
    await syncMixcloudSets().catch(console.error);
    res.json({ message: 'Mixcloud sync finished' });
});

import { initializeDatabase } from './initDb.js';

app.listen(PORT, async () => {
    await initializeDatabase();
    console.log(`Backend server running on port ${PORT}`);
});
