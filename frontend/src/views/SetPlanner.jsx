import { useState, useEffect } from 'react';
import axios from 'axios';
import { ListMusic, Plus, ArrowRight } from 'lucide-react';

export default function SetPlanner() {
  const [tracks, setTracks] = useState([]);
  const [plannedSet, setPlannedSet] = useState([]);

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      const { data } = await axios.get('http://192.168.178.81:5000/api/tracks');
      setTracks(data);
    } catch (err) {
      console.error(err);
    }
  };

  const addToSet = (track) => {
    if (!plannedSet.find(t => t.id === track.id)) {
      setPlannedSet([...plannedSet, track]);
    }
  };

  const removeFromSet = (trackId) => {
    setPlannedSet(plannedSet.filter(t => t.id !== trackId));
  };

  return (
    <div className="p-8 h-screen flex gap-8">
      <div className="flex-1 flex flex-col">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center gap-3 text-primary">
            <ListMusic className="w-8 h-8" /> Set Planner
          </h1>
        </div>
        
        <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
          <div className="bg-slate-950 p-4 border-b border-slate-800 text-slate-400 text-sm font-semibold uppercase">
            Available Tracks
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {tracks.map(track => (
              <div key={track.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700 transition">
                <div>
                  <div className="font-semibold text-slate-200">{track.artist}</div>
                  <div className="text-sm text-slate-400">{track.title} 
                    <span className="ml-2 px-2 py-0.5 bg-slate-950 rounded text-xs">BPM: {track.bpm}</span>
                    {track.played && <span className="ml-2 text-xs text-green-400 border border-green-500/30 bg-green-400/10 px-1 rounded">Played</span>}
                  </div>
                </div>
                <button 
                  onClick={() => addToSet(track)}
                  className="w-8 h-8 rounded-full bg-slate-600 hover:bg-primary text-white flex items-center justify-center transition"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-96 flex flex-col">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-200">Current Plan</h2>
          <p className="opacity-70 text-sm mt-1">{plannedSet.length} tracks selected</p>
        </div>

        <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-y-auto shadow-2xl relative">
          {plannedSet.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm text-center p-8">
              Click the + button on tracks to add them to your planned set.
            </div>
          ) : (
            <div className="space-y-3">
              {plannedSet.map((track, idx) => (
                <div key={track.id} className="relative group">
                  <div className="flex gap-3 items-center bg-slate-950 p-3 rounded-lg border border-slate-800 hover:border-accent transition">
                    <div className="text-accent font-mono font-bold w-6">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold text-slate-200">{track.artist}</div>
                      <div className="truncate text-xs text-slate-400">{track.title}</div>
                    </div>
                    <button 
                      onClick={() => removeFromSet(track.id)}
                      className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition absolute right-3"
                    >
                      ×
                    </button>
                  </div>
                  {idx < plannedSet.length - 1 && (
                    <div className="flex justify-center -my-1 relative z-10 text-slate-600">
                      <ArrowRight className="w-4 h-4 rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
