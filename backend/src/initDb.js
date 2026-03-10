import { query } from './db.js';

export async function initializeDatabase() {
    const tableQueries = [
        `
        CREATE TABLE IF NOT EXISTS tracks (
            id SERIAL PRIMARY KEY,
            traktor_id VARCHAR(255) UNIQUE, 
            artist VARCHAR(255),
            title VARCHAR(255),
            album VARCHAR(255),
            genre VARCHAR(100),
            set_type VARCHAR(100), -- 'B2B', 'ASMR Construction', etc.
            color_pattern VARCHAR(50), -- Hex or identifier for generators
            energy INTEGER DEFAULT 0, -- 1-10 energy rating
            bpm NUMERIC(7,3),
            key VARCHAR(50),
            comment TEXT,
            rating INTEGER DEFAULT 0,
            file_path TEXT,
            played BOOLEAN DEFAULT false,
            last_played TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `,
        `
        CREATE TABLE IF NOT EXISTS playlists (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            type VARCHAR(50) DEFAULT 'local', -- 'local', 'spotify', etc.
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `,
        `
        CREATE TABLE IF NOT EXISTS playlist_tracks (
            playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
            track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
            position INTEGER,
            PRIMARY KEY (playlist_id, track_id)
        );
        `,
        `
        CREATE TABLE IF NOT EXISTS played_sets (
            id SERIAL PRIMARY KEY,
            platform VARCHAR(50), -- 'soundcloud', 'mixcloud'
            platform_id VARCHAR(255) UNIQUE,
            title VARCHAR(255),
            set_date TIMESTAMP,
            url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `
    ];

    try {
        console.log('Initializing database schemas...');
        for (let q of tableQueries) {
            await query(q);
        }
        console.log('Database schemas initialized successfully.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}
