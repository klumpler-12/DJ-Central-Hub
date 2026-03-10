import chokidar from 'chokidar';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Load from env or use defaults
const PI_URL = process.env.PI_URL || 'http://192.168.178.81:5000/api/sync/traktor';
// Note: User's absolute path to the main Traktor collection file:
// Assuming it's typically collection.nml inside their Playlists folder, or wherever Traktor saves it.
// Defaulting to the path they explicitly mentioned:
const TRAKTOR_DIR = '/Users/patrickwisniewski/Dokumente/DJ Rick/Playlists';
const NML_FILE = path.join(TRAKTOR_DIR, 'collection.nml'); 

// We use a debounce to prevent uploading a partially written file 10 times in a second
let timeout = null;

async function uploadNML() {
    try {
        if (!fs.existsSync(NML_FILE)) {
            console.log(`[WAITING] NML file not found at ${NML_FILE}. Waiting for Traktor to save it...`);
            return;
        }

        console.log(`[SYNC] Detected change in ${NML_FILE}. Uploading to Pi...`);
        
        const form = new FormData();
        form.append('nml', fs.createReadStream(NML_FILE));
        
        const response = await axios.post(PI_URL, form, {
            headers: {
                ...form.getHeaders()
            }
        });
        
        console.log(`[SUCCESS] Synced NML to Pi: ${response.data.message || 'Complete'}`);
    } catch (err) {
        console.error(`[ERROR] Failed to sync NML: ${err.message}`);
    }
}

// Initial Sync attempt on startup
uploadNML();

// Watcher
console.log(`[AGENT] Watching for changes to ${NML_FILE}...`);
chokidar.watch(NML_FILE, { persistent: true }).on('change', (path) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => uploadNML(), 5000); // 5 sec debounce
});
