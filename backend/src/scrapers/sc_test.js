import SoundCloud from 'soundcloud-scraper';
const client = new SoundCloud.Client();

async function run() {
    try {
        console.log("Fetching user...");
        const user = await client.getUser('tripadvisordj');
        console.log("User:", user.name);
        console.log("Tracks count:", user.tracks.length);
        if (user.tracks.length > 0) {
            const trackInfo = await client.getSongInfo(user.tracks[0].url);
            console.log("First track:", trackInfo.title);
            console.log("Description:", trackInfo.description.substring(0, 100));
        }
    } catch(e) {
        console.error(e);
    }
}
run();
