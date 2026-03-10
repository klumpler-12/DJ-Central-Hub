import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import {
  ListMusic, Plus, ArrowRight, ArrowUp, ArrowDown,
  Search, Trash2, Save, FolderOpen, PlusCircle, X, Music
} from 'lucide-react';

export default function SetPlanner() {
  const [tracks, setTracks] = useState([]);
  const [trackSearch, setTrackSearch] = useState('');
  const [savedSets, setSavedSets] = useState([]);
  const [activeSet, setActiveSet] = useState(null);
  const [setTracks_, setSetTracks] = useState([]);
  const [newSetName, setNewSetName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Load saved sets list
  const fetchSets = useCallback(async () => {
    try {
      const { data } = await api.get('/planned-sets');
      setSavedSets(data);
    } catch (err) {
      console.error('Failed to fetch sets:', err);
    }
  }, []);

  // Load available tracks
  const fetchTracks = useCallback(async () => {
    try {
      const { data } = await api.get('/tracks', { params: { limit: 200, sort: 'artist', order: 'asc', search: trackSearch } });
      setTracks(data.tracks || []);
    } catch (err) {
      console.error('Failed to fetch tracks:', err);
    }
  }, [trackSearch]);

  useEffect(() => { fetchSets(); }, [fetchSets]);
  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  // Load a specific set's tracks
  const loadSet = async (setId) => {
    try {
      const { data } = await api.get(`/planned-sets/${setId}`);
      setActiveSet(data);
      setSetTracks(data.tracks || []);
    } catch (err) {
      console.error('Failed to load set:', err);
    }
  };

  const createSet = async () => {
    if (!newSetName.trim()) return;
    try {
      const { data } = await api.post('/planned-sets', { name: newSetName.trim() });
      setNewSetName('');
      setShowCreateForm(false);
      await fetchSets();
      loadSet(data.id);
    } catch (err) {
      console.error('Failed to create set:', err);
    }
  };

  const deleteSet = async (setId) => {
    try {
      await api.delete(`/planned-sets/${setId}`);
      if (activeSet?.id === setId) {
        setActiveSet(null);
        setSetTracks([]);
      }
      fetchSets();
    } catch (err) {
      console.error('Failed to delete set:', err);
    }
  };

  const addTrackToSet = async (track) => {
    if (!activeSet) return;
    if (setTracks_.find(t => t.track_id === track.id)) return;
    try {
      await api.post(`/planned-sets/${activeSet.id}/tracks`, { track_id: track.id });
      loadSet(activeSet.id);
    } catch (err) {
      if (err.response?.status === 409) return; // already in set
      console.error('Failed to add track:', err);
    }
  };

  const removeTrackFromSet = async (trackId) => {
    if (!activeSet) return;
    try {
      await api.delete(`/planned-sets/${activeSet.id}/tracks/${trackId}`);
      loadSet(activeSet.id);
    } catch (err) {
      console.error('Failed to remove track:', err);
    }
  };

  const moveTrack = async (index, direction) => {
    const newTracks = [...setTracks_];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newTracks.length) return;
    [newTracks[index], newTracks[swapIdx]] = [newTracks[swapIdx], newTracks[index]];
    setSetTracks(newTracks);

    // Save new order
    try {
      await api.put(`/planned-sets/${activeSet.id}/reorder`, {
        track_ids: newTracks.map(t => t.track_id)
      });
    } catch (err) {
      console.error('Failed to reorder:', err);
      loadSet(activeSet.id); // revert on error
    }
  };

  return (
    <div className="p-8 h-screen flex gap-6">
      {/* Left: Available Tracks */}
      <div className="flex-1 flex flex-col min-w-0">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-primary mb-6">
          <ListMusic className="w-8 h-8" /> Set Planner
        </h1>

        <div className="relative mb-4">
          <Search className="w-5 h-5 absolute left-3 top-3 text-slate-500" />
          <input type="text" placeholder="Search tracks..." value={trackSearch}
            onChange={e => setTrackSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-primary/50 transition" />
        </div>

        <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
          <div className="bg-slate-950 p-3 border-b border-slate-800 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            Available Tracks ({tracks.length})
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {tracks.map(track => (
              <div key={track.id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/50 transition group">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-200 text-sm truncate">{track.artist}</div>
                  <div className="text-xs text-slate-400 truncate flex items-center gap-2">
                    {track.title}
                    <span className="px-1.5 py-0.5 bg-slate-950 rounded text-[10px] font-mono shrink-0">{track.bpm ? Math.round(track.bpm) : '--'}</span>
                    {track.key && <span className="px-1.5 py-0.5 bg-slate-950 rounded text-[10px] font-mono shrink-0">{track.key}</span>}
                  </div>
                </div>
                <button onClick={() => addTrackToSet(track)} disabled={!activeSet}
                  className="w-7 h-7 rounded-full bg-slate-700 hover:bg-primary text-white flex items-center justify-center transition shrink-0 ml-2 disabled:opacity-20 disabled:cursor-not-allowed">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Set Management */}
      <div className="w-[420px] flex flex-col">
        {/* Saved Sets List */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-slate-300">Your Sets</h2>
            <button onClick={() => setShowCreateForm(!showCreateForm)}
              className="text-xs flex items-center gap-1 text-primary hover:text-blue-300 transition">
              <PlusCircle className="w-4 h-4" /> New Set
            </button>
          </div>

          {showCreateForm && (
            <div className="flex gap-2 mb-3">
              <input type="text" placeholder="Set name..." value={newSetName}
                onChange={e => setNewSetName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createSet()}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50 transition" />
              <button onClick={createSet} className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition">
                <Save className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {savedSets.map(set => (
              <div key={set.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition border ${
                  activeSet?.id === set.id
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}>
                <span onClick={() => loadSet(set.id)} className="truncate max-w-[150px]">{set.name}</span>
                <span className="text-[10px] opacity-50">{set.track_count}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteSet(set.id); }}
                  className="text-slate-600 hover:text-rose-400 transition">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {savedSets.length === 0 && (
              <p className="text-xs text-slate-600">No sets yet. Create one to start planning.</p>
            )}
          </div>
        </div>

        {/* Active Set Tracks */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="mb-3">
            <h2 className="text-xl font-bold text-slate-200">
              {activeSet ? activeSet.name : 'Select a Set'}
            </h2>
            <p className="opacity-50 text-xs mt-1">{setTracks_.length} tracks</p>
          </div>

          <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-xl p-3 overflow-y-auto shadow-2xl relative">
            {!activeSet ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 text-sm text-center p-8 gap-3">
                <Music className="w-12 h-12 text-slate-800" />
                Select or create a set to start planning.
              </div>
            ) : setTracks_.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 text-sm text-center p-8 gap-2">
                <Plus className="w-8 h-8 text-slate-800" />
                Add tracks from the left panel.
              </div>
            ) : (
              <div className="space-y-2">
                {setTracks_.map((track, idx) => (
                  <div key={track.track_id} className="relative group">
                    <div className="flex gap-2 items-center bg-slate-950 p-3 rounded-lg border border-slate-800 hover:border-primary/30 transition">
                      <div className="text-primary font-mono font-bold w-5 text-sm text-center">{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-semibold text-slate-200 text-sm">{track.artist}</div>
                        <div className="truncate text-xs text-slate-500 flex items-center gap-2">
                          {track.title}
                          {track.bpm && <span className="font-mono">{Math.round(track.bpm)}</span>}
                          {track.key && <span className="font-mono px-1 bg-slate-800 rounded">{track.key}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => moveTrack(idx, -1)} disabled={idx === 0}
                          className="text-slate-500 hover:text-white disabled:opacity-20 transition">
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => moveTrack(idx, 1)} disabled={idx === setTracks_.length - 1}
                          className="text-slate-500 hover:text-white disabled:opacity-20 transition">
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                      <button onClick={() => removeTrackFromSet(track.track_id)}
                        className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {idx < setTracks_.length - 1 && (
                      <div className="flex justify-center -my-0.5 relative z-10 text-slate-700">
                        <ArrowRight className="w-3 h-3 rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
