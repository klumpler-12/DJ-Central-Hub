import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { query } from './db.js';

export async function syncTraktorNML(xmlData) {
    console.log(`Starting Traktor NML Sync from uploaded file buffer...`);
    
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });

    const parsed = parser.parse(xmlData);

    // NML structure typically: NML -> COLLECTION -> ENTRY
    const collection = parsed.NML?.COLLECTION?.ENTRY;
    if (!collection) {
        console.log(`No entries found in uploaded NML.`);
        return;
    }

    const entries = Array.isArray(collection) ? collection : [collection];
    console.log(`Found ${entries.length} tracks in uploaded NML.`);

    for (const entry of entries) {
        const title = entry['@_TITLE'] || '';
        const artist = entry['@_ARTIST'] || '';
        
        // Extract INFO safely
        let bitrate, playCount, importDate;
        const info = entry.INFO;
        if (info) {
            bitrate = info['@_BITRATE'];
            playCount = info['@_PLAYCOUNT'];
            importDate = info['@_IMPORT_DATE'];
        }

        // Extract LOCATION info for file_path
        let filePath = '';
        let volume = '';
        let dir = '';
        let fileStr = '';
        
        const location = entry.LOCATION;
        if (location) {
            volume = location['@_VOLUME'] || '';
            dir = location['@_DIR'] || '';
            fileStr = location['@_FILE'] || '';
            filePath = volume + dir + fileStr;
        }

        // Extract TEMPO safely
        let bpm = 0;
        const tempo = entry.TEMPO;
        if (tempo) {
            bpm = parseFloat(tempo['@_BPM']);
        }

        // Extract MODIFICATION_INFO
        const modInfo = entry.MODIFICATION_INFO;
        const author = modInfo ? modInfo['@_AUTHOR_TYPE'] : '';

        // Extract additional metadata
        const album = entry.ALBUM ? (entry.ALBUM['@_TITLE'] || '') : '';
        const genre = info ? (info['@_GENRE'] || '') : '';
        const comment = info ? (info['@_COMMENT'] || '') : '';
        const keyInfo = info ? (info['@_KEY_TEXT'] || info['@_KEY'] || '') : '';
        const rating = info && info['@_RATING'] ? parseInt(info['@_RATING']) || 0 : 0;
        
        // Map genre to a visual color pattern for covers
        let color_pattern = '#3b82f6'; // default primary
        if (genre.toLowerCase().includes('techno')) color_pattern = '#f43f5e'; // red/pinkish
        if (genre.toLowerCase().includes('house')) color_pattern = '#10b981'; // green
        if (genre.toLowerCase().includes('trance')) color_pattern = '#8b5cf6'; // purple

        const uid = `${artist}-${title}-${filePath}`.substring(0, 250); // basic pseudo unique id for traktor_id

        try {
            // Upsert Track with full metadata
            await query(`
                INSERT INTO tracks (traktor_id, artist, title, album, genre, color_pattern, bpm, key, comment, rating, file_path)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (traktor_id) DO UPDATE SET
                    artist = EXCLUDED.artist,
                    title = EXCLUDED.title,
                    album = EXCLUDED.album,
                    genre = EXCLUDED.genre,
                    color_pattern = EXCLUDED.color_pattern,
                    bpm = EXCLUDED.bpm,
                    key = EXCLUDED.key,
                    comment = EXCLUDED.comment,
                    rating = EXCLUDED.rating,
                    file_path = EXCLUDED.file_path,
                    updated_at = CURRENT_TIMESTAMP
            `, [uid, artist, title, album, genre, color_pattern, bpm, keyInfo, comment, rating, filePath]);
        } catch (err) {
            console.error(`Error inserting track ${title}:`, err);
        }
    }
    
    // Also handling playlists inside NML
    // NML -> PLAYLISTS -> NODE (folders) or SUBNODES
    const playlistsNode = parsed.NML?.PLAYLISTS?.NODE;
    if (playlistsNode) {
        const subnodes = playlistsNode.SUBNODES?.NODE;
        const playlistEntries = Array.isArray(subnodes) ? subnodes : [subnodes].filter(Boolean);
        
        for (const pNode of playlistEntries) {
            if (pNode['@_TYPE'] === 'PLAYLIST') {
                const pName = pNode['@_NAME'];
                console.log(`Found Playlist: ${pName}`);
                
                try {
                    const res = await query(`
                        INSERT INTO playlists (name, type) VALUES ($1, 'local')
                        ON CONFLICT (name) DO NOTHING RETURNING id;
                    `, [pName]);
                    
                    let playlistId;
                    if (res.rows.length > 0) {
                        playlistId = res.rows[0].id;
                    } else {
                        const sel = await query(`SELECT id FROM playlists WHERE name = $1`, [pName]);
                        playlistId = sel.rows[0].id;
                    }

                    const pTracks = pNode.PLAYLIST?.ENTRY;
                    if (pTracks) {
                        const pTrackArray = Array.isArray(pTracks) ? pTracks : [pTracks];
                        // Clean existing mapping
                        await query(`DELETE FROM playlist_tracks WHERE playlist_id = $1`, [playlistId]);
                        
                        for (let i = 0; i < pTrackArray.length; i++) {
                            const pt = pTrackArray[i];
                            const primaryKey = pt.PRIMARYKEY; 
                            // In Traktor NMLs, primary keys can be tricky to match to our uid, 
                            // often they match the location. We will just use the location pieces.
                            const pkType = primaryKey['@_TYPE']; // TRACK
                            const pkKey = primaryKey['@_KEY']; // VOLUME+DIR+FILE
                            
                            // We match on file_path since we concatenated them earlier
                            const dbTrack = await query(`SELECT id FROM tracks WHERE file_path = $1 LIMIT 1`, [pkKey]);
                            if (dbTrack.rows.length > 0) {
                                await query(`
                                    INSERT INTO playlist_tracks (playlist_id, track_id, position)
                                    VALUES ($1, $2, $3)
                                `, [playlistId, dbTrack.rows[0].id, i]);
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Error parsing playlist ${pName}`, err);
                }
            }
        }
    }

    console.log(`Finished processing uploaded NML.`);
}
