import { useState, useRef, useEffect } from 'react';
import { Layers, Download, Image as ImageIcon } from 'lucide-react';

export default function CoverGenerator() {
  const canvasRef = useRef(null);
  const [title, setTitle] = useState("SUMMER SET");
  const [subtitle, setSubtitle] = useState("DJ TRIPADVISOR");
  const [setNum, setSetNum] = useState("VoL 01");
  const [setType, setSetType] = useState("B2B Edition");
  const [genreColor, setGenreColor] = useState("#f43f5e"); // Default techno pink
  const [background, setBackground] = useState(null);

  useEffect(() => {
    drawCanvas();
  }, [title, subtitle, background, setNum, setType, genreColor]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    if (background) {
      const img = new Image();
      img.onload = () => {
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        drawOverlays(ctx, canvas);
      };
      img.src = background;
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawOverlays(ctx, canvas);
    }
  };

  const drawOverlays = (ctx, canvas) => {
    // 1. Dynamic Genre Color Gradient Overlay (Top to bottom)
    const baseGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    baseGradient.addColorStop(0, 'transparent');
    baseGradient.addColorStop(0.3, 'rgba(0,0,0,0.2)');
    baseGradient.addColorStop(0.8, 'rgba(0,0,0,0.85)');
    baseGradient.addColorStop(1, '#000000');
    
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Color Splash / Shadow matching genreColor at the bottom
    ctx.shadowColor = genreColor;
    ctx.shadowBlur = 100;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 20;

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(title.toUpperCase(), canvas.width / 2, canvas.height - 200);
    
    // Reset shadow for crisp text
    ctx.shadowBlur = 0;

    // Subtitle (DJ NAME)
    ctx.fillStyle = '#cbd5e1'; // slate-300
    ctx.font = '500 35px Inter';
    ctx.letterSpacing = '10px';
    ctx.fillText(subtitle.toUpperCase(), canvas.width / 2, canvas.height - 130);

    // Set Type Pillar (e.g. B2B, ASMR)
    ctx.fillStyle = genreColor; 
    ctx.font = 'bold 45px Inter';
    ctx.fillText(setType.toUpperCase(), canvas.width / 2, canvas.height - 70);

    // Top Right Corner badge for Set Number
    if (setNum) {
      ctx.fillStyle = genreColor;
      ctx.fillRect(canvas.width - 250, 40, 210, 80);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 35px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(setNum.toUpperCase(), canvas.width - 145, 93);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBackground(url);
    }
  };

  const downloadCover = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '_')}_${setNum}_cover.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="p-8 h-screen flex gap-8">
      <div className="w-96 flex flex-col gap-6 overflow-y-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-primary">
            <Layers className="w-8 h-8" /> Cover Gen
          </h1>
          <p className="opacity-70 mt-2">Generate artwork with dynamic types and colors.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl flex flex-col gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Set Title</label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-primary transition"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">DJ / Subtitle</label>
            <input 
              type="text" 
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-primary transition"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Type (e.g. B2B)</label>
              <input 
                type="text" 
                value={setType}
                onChange={e => setSetType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-primary transition"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm text-slate-400 mb-1">Vol #</label>
              <input 
                type="text" 
                value={setNum}
                onChange={e => setSetNum(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-primary transition text-center"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Genre / Vibe Color</label>
            <div className="flex gap-2 items-center">
              <input 
                type="color" 
                value={genreColor}
                onChange={e => setGenreColor(e.target.value)}
                className="w-12 h-10 rounded border border-slate-700 cursor-pointer"
              />
              <span className="text-sm font-mono text-slate-500">{genreColor}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1 mt-2">Base Template Image</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 transition cursor-pointer"
            />
          </div>

          <button 
            onClick={downloadCover}
            className="mt-4 bg-accent hover:bg-rose-500 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition"
          >
            <Download className="w-5 h-5" /> Export Cover
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex items-center justify-center p-8 overflow-hidden relative">
        <canvas 
          ref={canvasRef} 
          width={1000} 
          height={1000}
          className="max-h-full max-w-full drop-shadow-2xl border border-slate-800 rounded-xl bg-slate-950"
        />
      </div>
    </div>
  );
}
