import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { Clapperboard, Scissors, Film, FastForward, Loader2, Clock, Copy, CheckCircle2, Zap } from 'lucide-react';

export default function VideoHighlight() {
  const [audioFile, setAudioFile] = useState(null);
  const [startTime, setStartTime] = useState("01:23:45");
  const [duration, setDuration] = useState(30);
  const [isPreview, setIsPreview] = useState(false);
  const [renderMode, setRenderMode] = useState("blender"); // "blender" or "ffmpeg"
  const [status, setStatus] = useState("idle");
  const [jobId, setJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef(null);

  // Poll for job status when a job is active
  useEffect(() => {
    if (!jobId) return;
    const poll = async () => {
      try {
        const { data } = await api.get(`/video/jobs/${jobId}`);
        setJob(data);
        if (data.status === 'completed' || data.status === 'error') {
          setStatus(data.status === 'completed' ? 'done' : 'error');
          clearInterval(pollRef.current);
        }
      } catch (err) {
        console.error('Failed to poll job:', err);
      }
    };
    pollRef.current = setInterval(poll, 3000);
    poll();
    return () => clearInterval(pollRef.current);
  }, [jobId]);

  const handleGenerate = async () => {
    setStatus("processing");
    try {
      const formData = new FormData();
      if (audioFile) {
        formData.append('audio', audioFile);
      }
      formData.append('audio_filename', audioFile?.name || 'set.mp3');
      formData.append('start_time', startTime);
      formData.append('duration', duration);
      formData.append('is_preview', isPreview);

      const { data } = await api.post('/video/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setJobId(data.id);
      setJob(data);
      setStatus("queued");
    } catch (err) {
      console.error('Failed to create video job:', err);
      setStatus("error");
    }
  };

  const getCommand = () => {
    const filename = audioFile?.name || 'YOUR_AUDIO_FILE.mp3';
    const outputName = `highlight_${filename.replace(/\.[^.]+$/, '')}.mp4`;
    return `cd ~/Dokumente/Programmieren/Dj/DJ-Central-Hub/plugins/video-highlight && ./generate_highlight.sh "${filename}" "${outputName}" --start ${startTime} --duration ${duration} --mode ${renderMode}${isPreview ? ' --preview' : ''}`;
  };

  const copyCommand = () => {
    navigator.clipboard.writeText(getCommand());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 h-screen flex gap-8">
      <div className="w-[450px] flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-primary">
            <Clapperboard className="w-8 h-8" /> Video Highlights
          </h1>
          <p className="opacity-70 mt-2">Generate music-reactive highlight clips with your T+A logo.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl flex flex-col gap-5">
          <div>
            <label className="block text-sm text-slate-400 mb-2">DJ Set (MP3/WAV)</label>
            <input type="file" accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files[0])}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 transition cursor-pointer" />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Start Time</label>
              <input type="text" value={startTime} onChange={e => setStartTime(e.target.value)}
                placeholder="00:00:00"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-center outline-none focus:border-primary transition" />
            </div>
            <div className="w-24">
              <label className="block text-sm text-slate-400 mb-1">Duration (s)</label>
              <input type="number" min="10" max="60" value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-center outline-none focus:border-primary transition" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Render Mode</label>
            <div className="flex gap-2">
              <button onClick={() => setRenderMode("blender")}
                className={`flex-1 p-3 rounded-lg text-sm font-bold transition border ${
                  renderMode === "blender" ? 'bg-purple-900/40 border-purple-500/50 text-purple-200' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}>
                <Clapperboard className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Blender (HQ)
              </button>
              <button onClick={() => setRenderMode("ffmpeg")}
                className={`flex-1 p-3 rounded-lg text-sm font-bold transition border ${
                  renderMode === "ffmpeg" ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}>
                <Zap className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                FFmpeg (Fast)
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1.5">
              {renderMode === "blender" ? "3D scene with logo, chromatic aberration, volumetric lights" : "Audio visualization with logo overlay, fast rendering"}
            </p>
          </div>

          <div onClick={() => setIsPreview(!isPreview)}
            className={`p-4 rounded-lg flex items-center gap-4 cursor-pointer border transition-colors ${
              isPreview ? 'bg-indigo-900/40 border-indigo-500/50 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}>
            <div className={`p-2 rounded-full ${isPreview ? 'bg-indigo-500 text-white' : 'bg-slate-800'}`}>
              <FastForward className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className={`font-bold text-sm ${isPreview ? 'text-indigo-300' : 'text-slate-300'}`}>Fast Preview</h3>
              <p className="text-xs opacity-70 mt-0.5">{renderMode === "blender" ? "5s at 25% resolution" : "5s at 540p"}</p>
            </div>
            <div className={`w-12 h-6 rounded-full relative transition-colors ${isPreview ? 'bg-indigo-500' : 'bg-slate-700'}`}>
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${isPreview ? 'left-[26px]' : 'left-0.5'}`} />
            </div>
          </div>

          <button onClick={handleGenerate}
            disabled={status === "processing" || status === "queued"}
            className="mt-4 bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {status === "processing" || status === "queued" ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {job ? `Job #${job.id} Queued` : 'Submitting...'}</>
            ) : status === "done" ? (
              <><CheckCircle2 className="w-5 h-5" /> Job Complete</>
            ) : (
              <><Scissors className="w-5 h-5" /> Generate Highlight</>
            )}
          </button>
        </div>

        <div className="text-sm opacity-60 bg-slate-900 p-4 border border-slate-800 rounded-lg">
          <p><strong>Note:</strong> Rendering runs on your Mac. {renderMode === "blender" ? "Blender renders a 3D lightshow with your T+A logo, chromatic aberration & volumetric effects." : "FFmpeg generates a quick audio visualization with logo overlay."}</p>
        </div>
      </div>

      {/* Right Panel: Status & Command */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col items-center justify-center p-8 text-center gap-4">
        {(status === "done" || status === "queued" || status === "error") ? (
          <div className="text-primary flex flex-col items-center gap-4 w-full max-w-lg">
            <Film className="w-16 h-16 mb-2" />
            <h2 className="text-2xl font-bold text-white">
              {status === "queued" ? "Job Queued" : status === "done" ? "Ready for your Mac!" : "Job Failed"}
            </h2>

            {job && (
              <div className="w-full bg-slate-950 rounded-lg p-4 border border-slate-800 text-left text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Job #{job.id}</span>
                  <span className={`font-bold ${job.status === 'queued' ? 'text-amber-400' : job.status === 'completed' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {job.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(job.created_at).toLocaleString()}
                </div>
              </div>
            )}

            <p className="text-slate-400 text-sm">Run this command on your Mac terminal:</p>
            <div className="w-full bg-black p-4 rounded-lg font-mono text-xs text-left text-green-400 overflow-x-auto border border-green-900 shadow-inner whitespace-pre-wrap break-all">
              {getCommand()}
            </div>
            <button onClick={copyCommand}
              className="text-xs text-slate-500 hover:text-white transition flex items-center gap-1">
              {copied ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy command</>}
            </button>
          </div>
        ) : (
          <>
            <Clapperboard className="w-24 h-24 text-slate-800 mb-4" />
            <h2 className="text-2xl font-bold text-slate-600">Video Preview</h2>
            <p className="text-slate-500 max-w-sm">
              Upload an audio file and configure your clip. You'll get a terminal command to render the highlight on your Mac.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
