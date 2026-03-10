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
      // Dynamic Gradient Background (Light top to dark bottom, using genreColor)
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGradient.addColorStop(0, '#1e293b'); // Dark slate top
      
      const hex2rgb = (hex) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return {r, g, b};
      };
      const c = genreColor.startsWith('#') ? hex2rgb(genreColor) : {r:15, g:23, b:42};
      
      bgGradient.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 1)`);
      
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      drawOverlays(ctx, canvas);
    }
  };

  const drawOverlays = (ctx, canvas) => {
    // Add a solid border container design around the edges
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 15;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // Top Right Corner badge for Set Number
    if (setNum) {
      ctx.fillStyle = genreColor;
      ctx.fillRect(canvas.width - 320, 40, 280, 80);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Helvetica Neue", Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '5px';
      ctx.fillText(setNum.toUpperCase(), canvas.width - 180, 83);
      ctx.letterSpacing = '0px'; // reset
    }

    // Bottom Content Alignment
    const bottomY = canvas.height - 180;

    // Title (e.g. SUMMER SET)
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 120px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText(title.toUpperCase(), canvas.width / 2, bottomY - 120);
    
    // Subtitle (DJ NAME)
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = '600 40px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.letterSpacing = '18px';
    ctx.fillText(subtitle.toUpperCase(), canvas.width / 2, bottomY - 40);

    // Set Type Pillar (e.g. B2B)
    ctx.fillStyle = genreColor;
    ctx.font = '800 60px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.letterSpacing = '10px';
    ctx.fillText(setType.toUpperCase(), canvas.width / 2, bottomY + 60);
    ctx.letterSpacing = '0px'; // reset
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
