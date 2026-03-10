import { useState } from 'react';
import api from '../lib/api';
import { Search, CheckCircle2, XCircle, Loader2, FileText, Save } from 'lucide-react';

export default function TrackScout() {
  const [rawText, setRawText] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('manual');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const { data } = await api.post('/tracklist/parse', {
        text: rawText,
        source,
        title: title || 'Untitled Import',
      });
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse tracklist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen">
      <h1 className="text-4xl font-black flex items-center gap-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
        <Search className="w-10 h-10 text-blue-500" /> TRACK SCOUT
      </h1>
      <p className="text-slate-400 text-lg mb-8">
        Paste a tracklist from SoundCloud, Mixcloud, 1001Tracklists, or any source to match against your library.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 font-semibold uppercase mb-1">Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Summer Set 2025"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-primary/50 transition" />
            </div>
            <div className="w-40">
              <label className="block text-xs text-slate-500 font-semibold uppercase mb-1">Source</label>
              <select value={source} onChange={e => setSource(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-primary/50 transition appearance-none">
                <option value="manual">Manual</option>
                <option value="soundcloud">SoundCloud</option>
                <option value="mixcloud">Mixcloud</option>
                <option value="1001tracklists">1001Tracklists</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 font-semibold uppercase mb-1">Tracklist</label>
            <textarea value={rawText} onChange={e => setRawText(e.target.value)}
              placeholder={"Paste your tracklist here, one track per line.\n\nSupported formats:\n  Artist - Title\n  01. Artist - Title\n  01:23:45 Artist - Title\n  Artist - Title [Label]"}
              rows={16}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:border-primary/50 transition resize-none" />
          </div>

          <button onClick={handleParse} disabled={loading || !rawText.trim()}
            className="bg-primary hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {loading ? 'Matching...' : 'Parse & Match'}
          </button>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-sm">{error}</div>
          )}
        </div>

        {/* Results Panel */}
        <div className="flex flex-col">
          {results ? (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-blue-400">{results.total_parsed}</div>
                  <div className="text-[10px] uppercase text-slate-500 font-semibold">Parsed</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-emerald-400">{results.total_matched}</div>
                  <div className="text-[10px] uppercase text-slate-500 font-semibold">Matched</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                  <div className={`text-2xl font-black ${results.match_rate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {results.match_rate}%
                  </div>
                  <div className="text-[10px] uppercase text-slate-500 font-semibold">Match Rate</div>
                </div>
              </div>

              {/* Track List */}
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-950 p-3 border-b border-slate-800 text-xs font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Results
                </div>
                <div className="overflow-y-auto max-h-[500px] divide-y divide-slate-800/30">
                  {results.tracks.map((track, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-3 ${
                      track.matched ? 'bg-emerald-500/[0.03]' : 'bg-rose-500/[0.03]'
                    }`}>
                      <div className="w-6 text-center font-mono text-xs text-slate-600">{track.position}</div>
                      {track.matched ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500/50 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">
                          {track.input_artist} <span className="text-slate-600">-</span> {track.input_title}
                        </div>
                        {track.matched && track.db_track && (
                          <div className="text-[10px] text-slate-500 truncate flex items-center gap-2 mt-0.5">
                            Matched: {track.db_track.artist} - {track.db_track.title}
                            {track.db_track.bpm && <span className="font-mono">{Math.round(track.db_track.bpm)} BPM</span>}
                            {track.db_track.key && <span className="font-mono">{track.db_track.key}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {results.played_set_id && (
                <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
                  <Save className="w-3.5 h-3.5" /> Saved as played set #{results.played_set_id}. Matched tracks marked as played.
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-12 text-center gap-4">
              <Search className="w-16 h-16 text-slate-800" />
              <h2 className="text-xl font-bold text-slate-600">Tracklist Scanner</h2>
              <p className="text-slate-500 text-sm max-w-sm">
                Paste a tracklist and we'll match each track against your Traktor library.
                Works with SoundCloud descriptions, 1001Tracklists exports, or any "Artist - Title" format.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
