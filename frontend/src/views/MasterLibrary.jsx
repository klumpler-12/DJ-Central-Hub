import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { 
  Database, DownloadCloud, Play, CheckCircle2, 
  Search, Filter, Loader2, AlertCircle, Clock,
  ChevronUp, ChevronDown, ListFilter
} from 'lucide-react';

const API_BASE = 'http://192.168.178.81:5000/api';

export default function MasterLibrary() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'artist', direction: 'asc' });
  const [syncStatus, setSyncStatus] = useState(null);

  // Poll for sync status
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/sync/status`);
        setSyncStatus(data);
      } catch (err) {
        console.error('Failed to poll sync status:', err);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/tracks`);
      setTracks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('nml', file);

    try {
      await axios.post(`${API_BASE}/sync/traktor`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const triggerSync = async (platform) => {
    try {
      await axios.post(`${API_BASE}/sync/${platform}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredTracks = useMemo(() => {
    let result = tracks.filter(t => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = (t.title?.toLowerCase() || '').includes(q) || 
                            (t.artist?.toLowerCase() || '').includes(q) ||
                            (t.album?.toLowerCase() || '').includes(q);
      const matchesGenre = genreFilter ? (t.genre?.toLowerCase() || '') === genreFilter.toLowerCase() : true;
      return matchesSearch && matchesGenre;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [tracks, searchQuery, genreFilter, sortConfig]);

  const uniqueGenres = useMemo(() => {
    const genres = new Set(tracks.map(t => t.genre).filter(Boolean));
    return Array.from(genres).sort();
  }, [tracks]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div>
          <h1 className="text-5xl font-black flex items-center gap-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            <Database className="w-12 h-12 text-blue-500" /> MASTER LIBRARY
          </h1>
          <p className="text-slate-400 mt-2 text-lg font-medium flex items-center gap-2">
            Central Repository &bull; {tracks.length} Tracks Scanned
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className={`
            group relative flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all
            ${isUploading ? 'bg-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 active:scale-95 cursor-pointer border border-slate-700 hover:border-blue-500/50'}
          `}>
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-blue-400" /> : <DownloadCloud className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />}
            <span>{isUploading ? 'Uploading...' : 'Import Traktor NML'}</span>
            <input type="file" accept=".nml" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>

          <button 
            onClick={() => triggerSync('mixcloud')}
            className="group flex items-center gap-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-6 py-3 rounded-xl font-bold border border-blue-500/20 transition-all active:scale-95"
          >
            <Play className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /> Sync Mixcloud
          </button>

          <button 
            onClick={() => triggerSync('soundcloud')}
            className="group flex items-center gap-3 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 px-6 py-3 rounded-xl font-bold border border-orange-500/20 transition-all active:scale-95"
          >
            <Play className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /> Sync SoundCloud
          </button>
        </div>
      </div>

      {/* Sync Status Panel */}
      {syncStatus && Object.values(syncStatus).some(s => s.status !== 'idle') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Object.entries(syncStatus).map(([platform, info]) => (
            info.status !== 'idle' && (
              <div key={platform} className={`
                p-4 rounded-xl border flex flex-col gap-2 transition-all duration-500
                ${info.status === 'syncing' ? 'bg-blue-500/10 border-blue-500/30' : 
                  info.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30' : 
                  'bg-rose-500/10 border-rose-500/30'}
              `}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-widest opacity-60">{platform}</span>
                  {info.status === 'syncing' && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                  {info.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {info.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 rounded-full ${
                      info.status === 'syncing' ? 'bg-blue-500' : 
                      info.status === 'completed' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${info.progress}%` }}
                  />
                </div>
                <p className="text-sm font-medium opacity-90 truncate">{info.message}</p>
                {info.last_sync && (
                  <span className="text-[10px] opacity-40 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Last Activity: {new Date(info.last_sync).toLocaleTimeString()}
                  </span>
                )}
              </div>
            )
          ))}
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-800/50 backdrop-blur-xl">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search library: artist, title, or album..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-600 font-medium"
          />
        </div>
        <div className="relative w-full md:w-72">
          <ListFilter className="w-5 h-5 absolute left-4 top-3.5 text-slate-500" />
          <select 
            value={genreFilter}
            onChange={e => setGenreFilter(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-12 pr-10 py-3.5 text-white focus:border-blue-500/50 outline-none transition-all appearance-none font-medium"
          >
            <option value="">All Genres</option>
            {uniqueGenres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <div className="absolute right-4 top-4 pointer-events-none opacity-40">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 text-xs font-black uppercase tracking-[0.2em] border-b border-slate-800/50">
                <th className="p-6">Status</th>
                <SortHeader label="Artist" field="artist" config={sortConfig} onSort={handleSort} />
                <SortHeader label="Title" field="title" config={sortConfig} onSort={handleSort} />
                <SortHeader label="Genre" field="genre" config={sortConfig} onSort={handleSort} />
                <SortHeader label="BPM" field="bpm" config={sortConfig} onSort={handleSort} />
                <SortHeader label="Key" field="key" config={sortConfig} onSort={handleSort} />
                <SortHeader label="Rating" field="rating" config={sortConfig} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {loading ? (
                <tr><td colSpan="7" className="p-20 text-center opacity-50 italic">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-blue-500" />
                  Analyzing library database...
                </td></tr>
              ) : sortedAndFilteredTracks.length === 0 ? (
                <tr><td colSpan="7" className="p-20 text-center opacity-50 flex flex-col items-center gap-4">
                  <Search className="w-12 h-12 text-slate-700" />
                  <div className="text-xl font-bold">No results found</div>
                  <p className="text-sm">Try adjusting your filters or search query.</p>
                </td></tr>
              ) : (
                sortedAndFilteredTracks.map(track => (
                  <tr key={track.id} className="group hover:bg-white/[0.03] transition-all duration-300">
                    <td className="p-6">
                      {track.played ? (
                        <div className="flex items-center gap-2 text-[10px] font-black tracking-tighter text-emerald-400 bg-emerald-400/5 border border-emerald-400/20 px-2 py-1 rounded-md w-fit">
                          <CheckCircle2 className="w-3 h-3" /> SET RELEASED
                        </div>
                      ) : (
                        <div className="text-[10px] font-black tracking-tighter text-slate-500 bg-slate-800/50 border border-slate-700/30 px-2 py-1 rounded-md w-fit">
                          UNPLAYED
                        </div>
                      )}
                    </td>
                    <td className="p-6 font-bold text-slate-100 group-hover:text-blue-400 transition-colors">{track.artist}</td>
                    <td className="p-6 text-slate-300 font-medium">{track.title}</td>
                    <td className="p-6">
                      <span 
                        className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase text-white shadow-lg" 
                        style={{ background: `linear-gradient(135deg, ${track.color_pattern || '#3b82f6'}, ${track.color_pattern}dd)` }}
                      >
                        {track.genre || 'UNSPECIFIED'}
                      </span>
                    </td>
                    <td className="p-6 font-mono text-slate-400 font-medium">{track.bpm ? Math.round(track.bpm) : '--'}</td>
                    <td className="p-6 font-mono text-slate-400">
                      <span className="bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50 text-xs">
                        {track.key || '??'}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <div 
                            key={star} 
                            className={`w-1.5 h-4 rounded-sm ${star <= (track.rating || 0) ? 'bg-amber-400' : 'bg-slate-800'}`} 
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SortHeader({ label, field, config, onSort }) {
  const active = config.key === field;
  return (
    <th 
      className={`p-6 cursor-pointer hover:text-white transition-colors group/th ${active ? 'text-blue-400' : ''}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        {label}
        <div className="flex flex-col opacity-0 group-hover/th:opacity-100 transition-opacity">
          <ChevronUp className={`w-3 h-3 -mb-1 ${active && config.direction === 'asc' ? 'opacity-100' : 'opacity-30'}`} />
          <ChevronDown className={`w-3 h-3 ${active && config.direction === 'desc' ? 'opacity-100' : 'opacity-30'}`} />
        </div>
      </div>
    </th>
  );
}

