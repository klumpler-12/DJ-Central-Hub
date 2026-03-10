import axios from 'axios';
import { query } from '../db.js';
import { syncStatus } from '../server.js';

const MC_USER = 'DJTripadvisor';

export async function syncMixcloudSets() {
    console.log(`Starting Mixcloud sync for user: ${MC_USER}`);
    
    // Mixcloud actually has a decent public API for endpoints:
    // https://api.mixcloud.com/DJTripadvisor/cloudcasts/
    
    try {
        const res = await axios.get(`https://api.mixcloud.com/${MC_USER}/cloudcasts/`);
        const casts = res.data.data;
        const totalCasts = casts.length;
        
        if (!casts || casts.length === 0) {
            console.log('No Mixcloud sets found.');
            syncStatus.mixcloud.message = 'No sets found.';
            return;
        }

        for (let i = 0; i < casts.length; i++) {
            const cast = casts[i];
            
            syncStatus.mixcloud.progress = Math.round(10 + (i / totalCasts) * 85);
            syncStatus.mixcloud.message = `Processing set ${i + 1} of ${totalCasts}: ${cast.name}`;
            const url = cast.url;
            const title = cast.name;
            const key = cast.key;

            await query(`
                INSERT INTO played_sets (platform, platform_id, title, url)
                VALUES ('mixcloud', $1, $2, $3)
                ON CONFLICT (platform_id) DO NOTHING;
            `, [key, title, url]);

            // To get tracks, we need to hit the specific cast endpoint:
            // https://api.mixcloud.com/DJTripadvisor/CAST_NAME/
            const detailRes = await axios.get(`https://api.mixcloud.com${key}`);
            const sections = detailRes.data.sections;

            if (sections) {
                for (const section of sections) {
                    if (section.section_type === 'track' && section.track) {
                        const artist = section.track.artist.name;
                        const trackTitle = section.track.name;

                        console.log(`Found track in Mixcloud set: ${artist} - ${trackTitle}`);

                        await query(`
                            UPDATE tracks 
                            SET played = true, last_played = CURRENT_TIMESTAMP
                            WHERE artist ILIKE $1 AND title ILIKE $2
                        `, [`%${artist}%`, `%${trackTitle}%`]);
                    }
                }
            }
        }
        
        console.log('Mixcloud sync complete.');
    } catch (err) {
        console.error('Error syncing Mixcloud:', err);
    }
}
