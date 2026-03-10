import { query, transaction } from '../db.js';

/**
 * Parses a raw text tracklist and matches tracks against the local database.
 * Supports common formats:
 *   "Artist - Title"
 *   "01. Artist - Title"
 *   "1) Artist - Title [Label]"
 *   "Artist - Title (Remix) [Label]"
 *   Timestamps like "01:23:45 Artist - Title"
 */
const LINE_PATTERNS = [
    // "01:23:45 Artist - Title" (timestamp prefix)
    /^[\[\(]?\d{1,2}[:\.]?\d{2}(?:[:\.]?\d{2})?[\]\)]?\s+(.+?)\s*[-–—]\s*(.+)/,
    // "01. Artist - Title" or "1) Artist - Title"
    /^\d+[\.\)]\s*(.+?)\s*[-–—]\s*(.+)/,
    // "Artist - Title" (most common)
    /^(.+?)\s*[-–—]\s*(.+)/,
];

function parseLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) return null;

    // Skip common non-track lines
    if (/^(tracklist|set\s*list|recorded|mixed\s*by|download|free|follow)/i.test(trimmed)) return null;
    if (/^https?:\/\//i.test(trimmed)) return null;
    if (/^[-=_*#]{3,}$/.test(trimmed)) return null;

    for (const pattern of LINE_PATTERNS) {
        const match = trimmed.match(pattern);
        if (match) {
            let artist = match[1].trim();
            let title = match[2].trim();

            // Clean up: remove trailing [Label], (feat. ...), etc. from title
            title = title.replace(/\s*\[.*?\]\s*$/, '').trim();

            // Skip if either part is too short
            if (artist.length < 2 || title.length < 2) continue;

            return { artist, title };
        }
    }

    return null;
}

export async function parseTracklist(rawText, source = 'manual', title = 'Untitled') {
    const lines = rawText.split('\n');
    const parsed = [];

    for (const line of lines) {
        const result = parseLine(line);
        if (result) {
            parsed.push(result);
        }
    }

    if (parsed.length === 0) {
        return {
            success: false,
            message: 'No tracks could be parsed from the input. Expected format: "Artist - Title" (one per line).',
            tracks: [],
            total_parsed: 0,
            total_matched: 0,
        };
    }

    // Match each parsed track against the database
    const results = [];
    let matchedCount = 0;

    for (let i = 0; i < parsed.length; i++) {
        const { artist, title: trackTitle } = parsed[i];

        // Exact match first
        let matchRes = await query(
            'SELECT id, artist, title, genre, bpm, key FROM tracks WHERE LOWER(artist) = LOWER($1) AND LOWER(title) = LOWER($2) LIMIT 1',
            [artist, trackTitle]
        );

        // Fuzzy fallback
        if (matchRes.rows.length === 0) {
            matchRes = await query(
                'SELECT id, artist, title, genre, bpm, key FROM tracks WHERE LOWER(artist) LIKE $1 AND LOWER(title) LIKE $2 LIMIT 1',
                [`%${artist.toLowerCase()}%`, `%${trackTitle.toLowerCase()}%`]
            );
        }

        const matched = matchRes.rows.length > 0 ? matchRes.rows[0] : null;
        if (matched) matchedCount++;

        results.push({
            position: i + 1,
            input_artist: artist,
            input_title: trackTitle,
            matched: !!matched,
            db_track: matched,
        });
    }

    // Save the import record and create a played_set
    let importId = null;
    let playedSetId = null;

    try {
        const importRes = await query(
            `INSERT INTO tracklist_imports (source, title, raw_text, total_tracks, matched_tracks)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [source, title, rawText, parsed.length, matchedCount]
        );
        importId = importRes.rows[0].id;

        // Also create a played_set for this import
        const setRes = await query(
            `INSERT INTO played_sets (platform, platform_id, title)
             VALUES ($1, $2, $3)
             ON CONFLICT (platform_id) DO UPDATE SET title = EXCLUDED.title
             RETURNING id`,
            [source, `import-${importId}`, title]
        );
        playedSetId = setRes.rows[0].id;

        // Store individual track matches
        await transaction(async (client) => {
            for (const track of results) {
                await client.query(
                    `INSERT INTO played_set_tracks (played_set_id, track_id, matched_artist, matched_title, position, is_matched)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [playedSetId, track.db_track?.id || null, track.input_artist, track.input_title, track.position, track.matched]
                );

                // Mark matched tracks as played
                if (track.db_track) {
                    await client.query(
                        'UPDATE tracks SET played = true, last_played = CURRENT_TIMESTAMP WHERE id = $1',
                        [track.db_track.id]
                    );
                }
            }
        });
    } catch (err) {
        console.error('Error saving tracklist import:', err.message);
    }

    return {
        success: true,
        import_id: importId,
        played_set_id: playedSetId,
        total_parsed: parsed.length,
        total_matched: matchedCount,
        match_rate: Math.round((matchedCount / parsed.length) * 100),
        tracks: results,
    };
}
