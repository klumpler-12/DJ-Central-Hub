import { useState } from 'react';
import { Clapperboard, Scissors, Film, FastForward } from 'lucide-react';

export default function VideoHighlight() {
  const [audioFile, setAudioFile] = useState(null);
  const [startTime, setStartTime] = useState("01:23:45");
  const [duration, setDuration] = useState(30);
  const [isPreview, setIsPreview] = useState(false);
  const [status, setStatus] = useState("idle");

  const handleGenerate = () => {
    setStatus("processing");
    // Conceptual PoC: In reality, this would submit to the backend API,
    // which then creates a network share/SSH call to the Mac's extraction and Blender rendering queue.
    const mode = isPreview ? "--preview" : "High Quality";
    setTimeout(() => {
      setStatus("done");
      alert(`Highlight generation (${mode}) sent to Blender rendering queue on the Mac!`);
    }, 2000);
  };

  return (
    <div className="p-8 h-screen flex gap-8">
      <div className="w-[450px] flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-primary">
            <Clapperboard className="w-8 h-8" /> Video Highlights
          </h1>
          <p className="opacity-70 mt-2">Extract an audio clip and generate a 3D animated Lightshow in Blender.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl flex flex-col gap-5">
          <div>
            <label className="block text-sm text-slate-400 mb-2">DJ Set (MP3/WAV)</label>
            <input 
              type="file" 
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files[0])}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 transition cursor-pointer"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Start Time</label>
              <input 
                type="text" 
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                placeholder="00:00:00"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-center outline-none focus:border-primary transition"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm text-slate-400 mb-1">Duration (s)</label>
              <input 
                type="number" 
                min="10" max="60"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-center outline-none focus:border-primary transition"
              />
            </div>
          </div>

          <div
            onClick={() => setIsPreview(!isPreview)}
            className={`mt-2 p-4 rounded-lg flex items-center gap-4 cursor-pointer border transition-colors ${
              isPreview ? 'bg-indigo-900/40 border-indigo-500/50 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className={`p-2 rounded-full ${isPreview ? 'bg-indigo-500 text-white' : 'bg-slate-800'}`}>
              <FastForward className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className={`font-bold text-sm ${isPreview ? 'text-indigo-300' : 'text-slate-300'}`}>Fast Preview Mode</h3>
              <p className="text-xs opacity-70 mt-0.5">Renders 5 seconds at 25% resolution & 16 samples for quick testing.</p>
            </div>
            <div className={`w-12 h-6 rounded-full relative transition-colors ${isPreview ? 'bg-indigo-500' : 'bg-slate-700'}`}>
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${isPreview ? 'left-[26px]' : 'left-0.5'}`} />
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={status === "processing"}
            className="mt-4 bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "processing" ? (
              <>Processing...</>
            ) : status === "done" ? (
              <>Generated!</>
            ) : (
              <><Scissors className="w-5 h-5" /> Generate Highlight</>
            )}
          </button>
        </div>

        <div className="text-sm opacity-60 bg-slate-900 p-4 border border-slate-800 rounded-lg">
          <p><strong>Note:</strong> Video rendering happens natively on your Mac. The Pi merely queues the task over SSH.</p>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col items-center justify-center p-8 text-center gap-4">
        {status === "done" ? (
           <div className="text-primary flex flex-col items-center gap-4">
             <Film className="w-24 h-24 mb-4" />
             <h2 className="text-2xl font-bold text-white">Render Sent to Mac!</h2>
             <p className="text-slate-400">output_highlight.mp4 will be saved to your Assets once Blender finishes.</p>
           </div>
        ) : (
          <>
            <Clapperboard className="w-24 h-24 text-slate-800 mb-4" />
            <h2 className="text-2xl font-bold text-slate-600">Video Preview</h2>
            <p className="text-slate-500 max-w-sm">
              Upload an audio file and select your favorite transition frame to generate a 3D animated visual perfectly synced to the energy of your beat.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
