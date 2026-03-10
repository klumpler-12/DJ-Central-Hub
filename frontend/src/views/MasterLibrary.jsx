import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Database, DownloadCloud, Play, CheckCircle2, Search, Filter } from 'lucide-react';

export default function MasterLibrary() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      const { data } = await axios.get('http://192.168.178.81:5000/api/tracks');
      setTracks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [syncingFile, setSyncingFile] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSyncingFile(true);
    const formData = new FormData();
    formData.append('nml', file);

    try {
      await axios.post('http://192.168.178.81:5000/api/sync/traktor', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Traktor sync triggered! Check logs and refresh in a moment.');
    } catch (err) {
      console.error(err);
      alert('Failed to upload NML file');
    } finally {
      setSyncingFile(false);
      // Reset input
      e.target.value = null;
    }
  };

  const syncPlatforms = async (platform) => {
    await axios.post(`http://192.168.178.81:5000/api/sync/${platform}`);
    alert(`${platform} sync triggered`);
  };

  const filteredTracks = useMemo(() => {
    return tracks.filter(t => {
      const matchesSearch = (t.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                            (t.artist?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesGenre = genreFilter ? (t.genre?.toLowerCase() || '') === genreFilter.toLowerCase() : true;
      return matchesSearch && matchesGenre;
    });
  }, [tracks, searchQuery, genreFilter]);

  const uniqueGenres = useMemo(() => {
    const genres = new Set(tracks.map(t => t.genre).filter(Boolean));
    return Array.from(genres).sort();
  }, [tracks]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3 text-primary">
            <Database className="w-8 h-8" /> Master Library
          </h1>
          <p className="text-lg opacity-80 mt-2">All scanned tracks and metadata.</p>
        </div>
        <div className="flex gap-4">
          <label className={`bg-slate-800 hover:bg-slate-700 border border-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer ${syncingFile ? 'opacity-50' : ''}`}>
            <DownloadCloud className="w-4 h-4" /> {syncingFile ? 'Uploading...' : 'Sync Traktor.nml'}
            <input 
              type="file" 
              accept=".nml" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={syncingFile}
            />
          </label>
          <button 
            onClick={() => syncPlatforms('mixcloud')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Play className="w-4 h-4" /> Sync Mixcloud
          </button>
          <button 
            onClick={() => syncPlatforms('soundcloud')}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Play className="w-4 h-4" /> Sync SC Sets
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by artist or title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white focus:border-primary outline-none transition"
          />
        </div>
        <div className="relative w-64">
          <Filter className="w-5 h-5 absolute left-3 top-2.5 text-slate-500" />
          <select 
            value={genreFilter}
            onChange={e => setGenreFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white focus:border-primary outline-none transition appearance-none"
          >
            <option value="">All Genres</option>
            {uniqueGenres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-2xl">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-950 text-slate-400 text-sm uppercase tracking-wider">
              <th className="p-4 border-b border-slate-800">Status</th>
              <th className="p-4 border-b border-slate-800">Artist</th>
              <th className="p-4 border-b border-slate-800">Title</th>
              <th className="p-4 border-b border-slate-800">Genre</th>
              <th className="p-4 border-b border-slate-800">Key</th>
              <th className="p-4 border-b border-slate-800">BPM</th>
              <th className="p-4 border-b border-slate-800">Rating</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center opacity-50">Loading tracks...</td></tr>
            ) : filteredTracks.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center opacity-50">No tracks found. Hit sync to parse your NMLs.</td></tr>
            ) : (
              filteredTracks.map(track => (
                <tr key={track.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                  <td className="p-4">
                    {track.played ? (
                      <span className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded w-fit">
                        <CheckCircle2 className="w-3 h-3" /> PLAYED
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">Unplayed</span>
                    )}
                  </td>
                  <td className="p-4 font-semibold text-slate-200">{track.artist}</td>
                  <td className="p-4 text-slate-300">{track.title}</td>
                  <td className="p-4 text-slate-400">
                    <span 
                      className="px-2 py-1 rounded text-xs text-white" 
                      style={{ backgroundColor: track.color_pattern || '#3b82f6' }}
                    >
                      {track.genre || 'Unknown'}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-slate-400 text-sm">{track.key}</td>
                  <td className="p-4 text-slate-400">{track.bpm}</td>
                  <td className="p-4 text-accent font-bold">{track.rating || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
