import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'dj_admin',
    password: process.env.DB_PASS || 'dj_password',
    database: process.env.DB_NAME || 'dj_hub',
    port: process.env.DB_PORT || 5432,
});

export const query = (text, params) => pool.query(text, params);
