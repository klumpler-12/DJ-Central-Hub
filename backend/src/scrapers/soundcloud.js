import axios from 'axios';
import { query } from '../db.js';

const SC_USER = 'tripadvisordj';

export async function syncSoundcloudSets() {
    console.log(`Starting SoundCloud sync for user: ${SC_USER}`);
    
    // PoC: SoundCloud scraping is notoriously heavily protected against simple axios GETs.
    // The previously used soundcloud-scraper NPM package relies on outdated selectors.
    console.error('SoundCloud extraction is currently blocked by Datadome/Cloudflare captchas. Please use Mixcloud for tracklist syncing!');
    return { success: false, message: 'SoundCloud API blocked. Use Mixcloud.' };
}
