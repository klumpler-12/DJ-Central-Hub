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

app.post('/api/sync/traktor', async (req, res) => {
    // Fire and forget PoC
    syncTraktorNML().catch(console.error);
    res.json({ message: 'Traktor sync started' });
});

app.post('/api/sync/soundcloud', async (req, res) => {
    syncSoundcloudSets().catch(console.error);
    res.json({ message: 'SoundCloud sync started' });
});

app.post('/api/sync/mixcloud', async (req, res) => {
    syncMixcloudSets().catch(console.error);
    res.json({ message: 'Mixcloud sync started' });
});

import { initializeDatabase } from './initDb.js';

app.listen(PORT, async () => {
    await initializeDatabase();
    console.log(`Backend server running on port ${PORT}`);
});
