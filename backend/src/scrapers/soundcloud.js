import axios from 'axios';
import * as cheerio from 'cheerio';
import { query } from '../db.js';

const SC_USER = 'tripadvisordj';

export async function syncSoundcloudSets() {
    console.log(`Starting SoundCloud sync for user: ${SC_USER}`);
    
    // PoC: SoundCloud scraping is notoriously heavily protected against simple axios GETs.
    // In a real scenario, we'd use SoundCloud API with a clientId, or a headless browser (Puppeteer).
    // For this PoC, we will simulate the extraction logic of parsing a description.

    try {
        // Mock data representing a fetched set description:
        const mockSets = [
            {
                id: 'sc-12345',
                title: 'Summer Set 2025',
                url: 'https://soundcloud.com/tripadvisordj/summer-set-2025',
                description: `
                    Great vibes!
                    Tracklist:
                    1. Fisher - Losing It
                    2. Fred Again - Delilah
                    3. Unknown Artist - Test Track
                `
            }
        ];

        for (const set of mockSets) {
            // Upsert set
            await query(`
                INSERT INTO played_sets (platform, platform_id, title, url)
                VALUES ('soundcloud', $1, $2, $3)
                ON CONFLICT (platform_id) DO NOTHING;
            `, [set.id, set.title, set.url]);

            // Parse Description for tracks
            const lines = set.description.split('\n');
            let isTracklist = false;
            
            for (const line of lines) {
                if (line.toLowerCase().includes('tracklist')) {
                    isTracklist = true;
                    continue;
                }
                
                if (isTracklist && line.trim().length > 0) {
                    // Very naive parsing: "1. Artist - Title" 
                    const match = line.match(/\d+\.\s*(.+?)\s*-\s*(.+)/);
                    if (match) {
                        const artist = match[1].trim();
                        const title = match[2].trim();
                        
                        console.log(`Matched track in set: ${artist} - ${title}`);
                        
                        // Mark as played in DB
                        // We use ILIKE for case-insensitive matching
                        await query(`
                            UPDATE tracks 
                            SET played = true, last_played = CURRENT_TIMESTAMP
                            WHERE artist ILIKE $1 AND title ILIKE $2
                        `, [`%${artist}%`, `%${title}%`]);
                    }
                }
            }
        }
        console.log('SoundCloud sync complete.');
    } catch (err) {
        console.error('Error syncing SoundCloud:', err);
    }
}
