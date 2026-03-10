import { query } from './db.js';

/**
 * Versioned migration system. Each migration runs exactly once.
 * Add new migrations to the end of the array — never modify existing ones.
 */
const migrations = [
    {
        version: 1,
        name: 'initial_schema',
        sql: `
            CREATE TABLE IF NOT EXISTS tracks (
                id SERIAL PRIMARY KEY,
                traktor_id VARCHAR(255) UNIQUE,
                artist VARCHAR(255),
                title VARCHAR(255),
                album VARCHAR(255),
                genre VARCHAR(100),
                set_type VARCHAR(100),
                color_pattern VARCHAR(50),
                energy INTEGER DEFAULT 0 CHECK (energy >= 0 AND energy <= 10),
                bpm NUMERIC(7,3),
                key VARCHAR(50),
                comment TEXT,
                rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
                file_path TEXT,
                played BOOLEAN DEFAULT false,
                last_played TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS playlists (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                type VARCHAR(50) DEFAULT 'local',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS playlist_tracks (
                playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
                track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
                position INTEGER,
                PRIMARY KEY (playlist_id, track_id)
            );

            CREATE TABLE IF NOT EXISTS played_sets (
                id SERIAL PRIMARY KEY,
                platform VARCHAR(50),
                platform_id VARCHAR(255) UNIQUE,
                title VARCHAR(255),
                set_date TIMESTAMP,
                url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `
    },
    {
        version: 2,
        name: 'add_indexes',
        sql: `
            CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks (LOWER(artist));
            CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks (LOWER(title));
            CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks (genre);
            CREATE INDEX IF NOT EXISTS idx_tracks_bpm ON tracks (bpm);
            CREATE INDEX IF NOT EXISTS idx_tracks_played ON tracks (played);
            CREATE INDEX IF NOT EXISTS idx_tracks_file_path ON tracks (file_path);
            CREATE INDEX IF NOT EXISTS idx_tracks_rating ON tracks (rating);
            CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks (playlist_id, position);
            CREATE INDEX IF NOT EXISTS idx_played_sets_platform ON played_sets (platform);
        `
    },
    {
        version: 3,
        name: 'add_planned_sets',
        sql: `
            CREATE TABLE IF NOT EXISTS planned_sets (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS planned_set_tracks (
                id SERIAL PRIMARY KEY,
                planned_set_id INTEGER REFERENCES planned_sets(id) ON DELETE CASCADE,
                track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
                position INTEGER NOT NULL,
                notes TEXT,
                UNIQUE (planned_set_id, track_id)
            );

            CREATE INDEX IF NOT EXISTS idx_planned_set_tracks_position ON planned_set_tracks (planned_set_id, position);
        `
    },
    {
        version: 4,
        name: 'add_played_set_tracks_and_tracklist_imports',
        sql: `
            CREATE TABLE IF NOT EXISTS played_set_tracks (
                id SERIAL PRIMARY KEY,
                played_set_id INTEGER REFERENCES played_sets(id) ON DELETE CASCADE,
                track_id INTEGER REFERENCES tracks(id) ON DELETE SET NULL,
                matched_artist VARCHAR(255),
                matched_title VARCHAR(255),
                position INTEGER,
                is_matched BOOLEAN DEFAULT false
            );

            CREATE INDEX IF NOT EXISTS idx_played_set_tracks_set ON played_set_tracks (played_set_id);

            CREATE TABLE IF NOT EXISTS tracklist_imports (
                id SERIAL PRIMARY KEY,
                source VARCHAR(100),
                title VARCHAR(255),
                raw_text TEXT NOT NULL,
                total_tracks INTEGER DEFAULT 0,
                matched_tracks INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `
    },
    {
        version: 5,
        name: 'add_video_jobs',
        sql: `
            CREATE TABLE IF NOT EXISTS video_jobs (
                id SERIAL PRIMARY KEY,
                audio_filename VARCHAR(255) NOT NULL,
                start_time VARCHAR(20) NOT NULL,
                duration INTEGER NOT NULL,
                is_preview BOOLEAN DEFAULT false,
                status VARCHAR(50) DEFAULT 'queued',
                output_path TEXT,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `
    }
];

export async function initializeDatabase() {
    try {
        // Create migrations tracking table
        await query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Check which migrations have been applied
        const applied = await query('SELECT version FROM schema_migrations ORDER BY version');
        const appliedVersions = new Set(applied.rows.map(r => r.version));

        let migrationsRun = 0;
        for (const migration of migrations) {
            if (appliedVersions.has(migration.version)) continue;

            console.log(`Running migration ${migration.version}: ${migration.name}...`);
            await query(migration.sql);
            await query(
                'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
                [migration.version, migration.name]
            );
            migrationsRun++;
        }

        if (migrationsRun > 0) {
            console.log(`Database initialized: ${migrationsRun} migration(s) applied.`);
        } else {
            console.log('Database schema is up to date.');
        }
    } catch (err) {
        console.error('Error initializing database:', err);
        throw err;
    }
}
