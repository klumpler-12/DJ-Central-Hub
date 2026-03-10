import axios from 'axios';
import { query } from '../db.js';
import { syncStatus } from '../server.js';

const MC_USER = process.env.MIXCLOUD_USER || 'DJTripadvisor';

export async function syncMixcloudSets() {
    console.log(`Starting Mixcloud sync for user: ${MC_USER}`);

    let setsProcessed = 0;
    let tracksMatched = 0;

    try {
        // Fetch all cloudcasts with pagination
        const allCasts = [];
        let nextUrl = `https://api.mixcloud.com/${MC_USER}/cloudcasts/?limit=20`;

        while (nextUrl) {
            const res = await axios.get(nextUrl, { timeout: 15000 });
            const casts = res.data?.data;
            if (!casts || casts.length === 0) break;

            allCasts.push(...casts);

            // Follow pagination
            nextUrl = res.data?.paging?.next || null;
        }

        if (allCasts.length === 0) {
            console.log('No Mixcloud sets found.');
            return { setsProcessed: 0, tracksMatched: 0 };
        }

        console.log(`Found ${allCasts.length} Mixcloud sets (all pages).`);
        const totalCasts = allCasts.length;

        for (let i = 0; i < allCasts.length; i++) {
            const cast = allCasts[i];

            syncStatus.mixcloud.progress = Math.round(10 + (i / totalCasts) * 85);
            syncStatus.mixcloud.message = `Processing set ${i + 1} of ${totalCasts}: ${cast.name}`;

            const title = cast.name;
            const key = cast.key;
            const url = cast.url;
            const setDate = cast.created_time || null;

            // Upsert the played set
            const setRes = await query(`
                INSERT INTO played_sets (platform, platform_id, title, url, set_date)
                VALUES ('mixcloud', $1, $2, $3, $4)
                ON CONFLICT (platform_id) DO UPDATE SET title = EXCLUDED.title
                RETURNING id
            `, [key, title, url, setDate]);

            const playedSetId = setRes.rows[0].id;

            // Fetch detailed set info for tracklist
            try {
                const detailRes = await axios.get(`https://api.mixcloud.com${key}`, { timeout: 15000 });
                const sections = detailRes.data?.sections;

                if (sections) {
                    let position = 0;
                    for (const section of sections) {
                        if (section.section_type !== 'track' || !section.track) continue;

                        const artist = section.track.artist?.name || '';
                        const trackTitle = section.track.name || '';
                        if (!artist && !trackTitle) continue;
                        position++;

                        // Try exact match first, then fallback to fuzzy
                        let matchRes = await query(
                            'SELECT id FROM tracks WHERE LOWER(artist) = LOWER($1) AND LOWER(title) = LOWER($2) LIMIT 1',
                            [artist, trackTitle]
                        );

                        if (matchRes.rows.length === 0) {
                            matchRes = await query(
                                'SELECT id FROM tracks WHERE LOWER(artist) LIKE $1 AND LOWER(title) LIKE $2 LIMIT 1',
                                [`%${artist.toLowerCase()}%`, `%${trackTitle.toLowerCase()}%`]
                            );
                        }

                        const trackId = matchRes.rows.length > 0 ? matchRes.rows[0].id : null;

                        // Store in played_set_tracks junction
                        await query(`
                            INSERT INTO played_set_tracks (played_set_id, track_id, matched_artist, matched_title, position, is_matched)
                            VALUES ($1, $2, $3, $4, $5, $6)
                            ON CONFLICT DO NOTHING
                        `, [playedSetId, trackId, artist, trackTitle, position, trackId !== null]);

                        // Mark track as played if matched
                        if (trackId) {
                            await query(
                                'UPDATE tracks SET played = true, last_played = COALESCE($2, CURRENT_TIMESTAMP) WHERE id = $1',
                                [trackId, setDate]
                            );
                            tracksMatched++;
                        }
                    }
                }
            } catch (detailErr) {
                console.error(`Failed to fetch details for set "${title}":`, detailErr.message);
            }

            setsProcessed++;
        }

        console.log(`Mixcloud sync complete: ${setsProcessed} sets, ${tracksMatched} tracks matched.`);
        return { setsProcessed, tracksMatched };
    } catch (err) {
        console.error('Mixcloud sync error:', err.message);
        throw err;
    }
}
