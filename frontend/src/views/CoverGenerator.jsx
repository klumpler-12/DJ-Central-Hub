import { useState, useRef, useEffect, useCallback } from 'react';
import { Layers, Download } from 'lucide-react';

// Genre presets matching your SoundCloud branding
const GENRE_PRESETS = [
  { label: 'Hard Techno', color: '#f43f5e', gradient: ['#1a0a1e', '#3d0a2b', '#f43f5e'] },
  { label: 'Harder Styles', color: '#8b5cf6', gradient: ['#0a0a2e', '#1a0a3d', '#8b5cf6'] },
  { label: 'Techno', color: '#ec4899', gradient: ['#0f0a1e', '#2d0a3d', '#ec4899'] },
  { label: 'House', color: '#10b981', gradient: ['#0a1e15', '#0a3d2b', '#10b981'] },
  { label: 'Trance', color: '#6366f1', gradient: ['#0a0a2e', '#1a0a4d', '#6366f1'] },
  { label: 'DnB', color: '#f59e0b', gradient: ['#1e1a0a', '#3d2b0a', '#f59e0b'] },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CoverGenerator() {
  const canvasRef = useRef(null);
  const bgUrlRef = useRef(null);
  const logoRef = useRef(null);

  // Fields matching your SoundCloud cover template
  const [djName, setDjName] = useState('DJ TRIPADVISOR');
  const [seriesName, setSeriesName] = useState('Construction site ASMR');
  const [seriesNum, setSeriesNum] = useState('#8');
  const [collabName, setCollabName] = useState('');
  const [genre, setGenre] = useState('Hard Techno');
  const [genreColor, setGenreColor] = useState('#f43f5e');
  const [dateLabel, setDateLabel] = useState(`${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`);
  const [background, setBackground] = useState(null);

  // Load logo on mount
  useEffect(() => {
    const img = new Image();
    img.onload = () => { logoRef.current = img; drawCanvas(); };
    img.src = '/logo-trippy-mono.png';
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Find matching preset
    const preset = GENRE_PRESETS.find(p => p.label === genre) || GENRE_PRESETS[0];
    const colors = preset.gradient;

    const drawContent = () => {
      // Dark overlay for readability when using background image
      if (background) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, W, H);
      }

      // Draw logo watermark (large, centered, semi-transparent)
      if (logoRef.current) {
        const logo = logoRef.current;
        const logoSize = W * 0.6;
        const lx = (W - logoSize) / 2;
        const ly = (H - logoSize) / 2 - H * 0.05;
        ctx.globalAlpha = background ? 0.25 : 0.15;
        ctx.drawImage(logo, lx, ly, logoSize, logoSize);
        ctx.globalAlpha = 1.0;
      }

      // Subtle border
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 8;
      ctx.strokeRect(30, 30, W - 60, H - 60);

      // ─── Text Layout (bottom-aligned, matching SoundCloud covers) ───

      const margin = 60;
      let textY = H - margin;

      // Date (bottom)
      ctx.fillStyle = genreColor;
      ctx.font = '600 28px "Helvetica Neue", Helvetica, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(dateLabel.toUpperCase(), margin, textY);
      textY -= 50;

      // Genre badge
      const genreText = genre.toUpperCase();
      ctx.font = '900 42px "Helvetica Neue", Helvetica, Arial, sans-serif';
      const genreMetrics = ctx.measureText(genreText);
      const badgeW = genreMetrics.width + 40;
      const badgeH = 56;
      const badgeX = margin;
      const badgeY = textY - badgeH;

      // Badge background
      ctx.fillStyle = genreColor;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();

      // Badge text
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(genreText, badgeX + 20, badgeY + badgeH / 2);
      textY = badgeY - 20;

      // Collab line (if B2B)
      if (collabName.trim()) {
        textY -= 10;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '700 36px "Helvetica Neue", Helvetica, Arial, sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`B2B ${collabName.toUpperCase()}`, margin, textY);
        textY -= 50;
      }

      // Series name + number
      const seriesText = `${seriesName} ${seriesNum}`.trim().toUpperCase();
      if (seriesText) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '600 28px "Helvetica Neue", Helvetica, Arial, sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText(seriesText, margin, textY);
        textY -= 45;
      }

      // DJ Name (main title)
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 64px "Helvetica Neue", Helvetica, Arial, sans-serif';
      ctx.textBaseline = 'bottom';
      ctx.fillText(djName.toUpperCase(), margin, textY);
    };

    if (background) {
      const img = new Image();
      img.onload = () => {
        const scale = Math.max(W / img.width, H / img.height);
        const x = (W / 2) - (img.width / 2) * scale;
        const y = (H / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        drawContent();
      };
      img.src = background;
    } else {
      // Draw gradient background matching your SoundCloud style
      const grad = ctx.createLinearGradient(0, 0, W * 0.3, H);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(0.5, colors[1]);
      grad.addColorStop(1, colors[2] + '40'); // subtle accent at bottom
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Subtle radial glow in center (purple/pink ambiance)
      const radial = ctx.createRadialGradient(W * 0.4, H * 0.35, 0, W * 0.4, H * 0.35, W * 0.5);
      radial.addColorStop(0, genreColor + '25');
      radial.addColorStop(1, 'transparent');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, W, H);

      drawContent();
    }
  }, [background, djName, seriesName, seriesNum, collabName, genre, genreColor, dateLabel]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  useEffect(() => {
    return () => {
      if (bgUrlRef.current) URL.revokeObjectURL(bgUrlRef.current);
    };
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (bgUrlRef.current) URL.revokeObjectURL(bgUrlRef.current);
      const url = URL.createObjectURL(file);
      bgUrlRef.current = url;
      setBackground(url);
    }
  };

  const handleGenrePreset = (preset) => {
    setGenre(preset.label);
    setGenreColor(preset.color);
  };

  const downloadCover = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const safeName = `${djName}_${seriesName}_${seriesNum}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const link = document.createElement('a');
    link.download = `${safeName}_cover.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="p-8 h-screen flex gap-8">
      <div className="w-[400px] flex flex-col gap-5 overflow-y-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-primary">
            <Layers className="w-8 h-8" /> Cover Gen
          </h1>
          <p className="opacity-70 mt-2">Generate set covers matching your branding.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-xl flex flex-col gap-4">
          <div>
            <label className="block text-xs text-slate-500 font-semibold uppercase mb-1">DJ Name</label>
            <input type="text" value={djName} onChange={e => setDjName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-primary transition" />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 font-semibold uppercase mb-1">Series</label>
              <input type="text" value={seriesName} onChange={e => setSeriesName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-primary transition" />
            </div>
            <div className="w-20">
              <label className="block text-xs text-slate-500 font-semibold uppercase mb-1">#</label>
              <input type="text" value={seriesNum} onChange={e => setSeriesNum(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm text-center outline-none focus:border-primary transition" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 font-semibold uppercase mb-1">B2B Partner (optional)</label>
            <input type="text" value={collabName} onChange={e => setCollabName(e.target.value)}
              placeholder="Leave empty for solo"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-primary transition placeholder:text-slate-700" />
          </div>

          <div>
            <label className="block text-xs text-slate-500 font-semibold uppercase mb-1">Genre</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {GENRE_PRESETS.map(p => (
                <button key={p.label} onClick={() => handleGenrePreset(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    genre === p.label ? 'text-white ring-2 ring-offset-1 ring-offset-slate-900' : 'text-slate-400 bg-slate-800 hover:bg-slate-700'
                  }`} style={genre === p.label ? { background: p.color, ringColor: p.color } : {}}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input type="color" value={genreColor} onChange={e => setGenreColor(e.target.value)}
                className="w-10 h-8 rounded border border-slate-700 cursor-pointer" />
              <span className="text-xs font-mono text-slate-600">{genreColor}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 font-semibold uppercase mb-1">Date</label>
            <input type="text" value={dateLabel} onChange={e => setDateLabel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-primary transition" />
          </div>

          <div>
            <label className="block text-xs text-slate-500 font-semibold uppercase mb-1">Custom Background</label>
            <input type="file" accept="image/*" onChange={handleImageUpload}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 transition cursor-pointer" />
            {background && (
              <button onClick={() => { setBackground(null); if (bgUrlRef.current) { URL.revokeObjectURL(bgUrlRef.current); bgUrlRef.current = null; } }}
                className="text-xs text-rose-400 mt-1 hover:underline">Remove background</button>
            )}
          </div>

          <button onClick={downloadCover}
            className="mt-2 bg-accent hover:bg-rose-500 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition active:scale-[0.98]">
            <Download className="w-5 h-5" /> Export Cover (1000x1000)
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex items-center justify-center p-8 overflow-hidden relative">
        <canvas ref={canvasRef} width={1000} height={1000}
          className="max-h-full max-w-full drop-shadow-2xl border border-slate-800 rounded-xl bg-slate-950" />
      </div>
    </div>
  );
}
