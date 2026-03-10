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
      // Dynamic Gradient Background (Light top-left to Dark bottom-right)
      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGradient.addColorStop(0, '#f8fafc'); // Almost white
      
      // Use the genre color, but darkened for the bottom right
      const hex2rgb = (hex) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return {r, g, b};
      };
      const c = genreColor.startsWith('#') ? hex2rgb(genreColor) : {r:50, g:0, b:20};
      
      bgGradient.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${c.b}, 0.5)`);
      bgGradient.addColorStop(1, `rgba(${Math.max(0, c.r-100)}, ${Math.max(0, c.g-100)}, ${Math.max(0, c.b-100)}, 1)`);
      
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      drawOverlays(ctx, canvas);
    }
  };

  const drawOverlays = (ctx, canvas) => {
    // Large "A" watermark from the referenced Logo
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 - 50);
    // Slight skew
    ctx.transform(1, 0, -0.2, 1, 0, 0);
    ctx.fillStyle = 'rgba(20, 5, 10, 0.8)';
    ctx.font = 'bold 1200px "Times New Roman", Times, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("A", 0, 0);
    
    // Slicing effect for 'A' crossbar (like the reference)
    ctx.fillStyle = 'rgba(20, 5, 10, 0.8)';
    // We already skew'd, we can draw a massive thick bar
    ctx.fillRect(-600, 50, 1200, 120);
    ctx.restore();

    // Top Right Corner badge for Set Number
    if (setNum) {
      ctx.fillStyle = genreColor;
      ctx.fillRect(canvas.width - 250, 40, 210, 100);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 45px "Times New Roman", Times, serif';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '5px';
      ctx.fillText(setNum.toUpperCase(), canvas.width - 145, 103);
      ctx.letterSpacing = '0px'; // reset
    }

    // Bottom Content Alignment
    const bottomY = canvas.height - 100;

    // Title (e.g. SUMMER SET)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 110px "Times New Roman", Times, serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '10px';
    ctx.fillText(title.toUpperCase(), canvas.width / 2, bottomY - 140);
    
    // Subtitle (DJ NAME) (White overlaid on a slight red offset for that "b2b" mirroring effect)
    // Actually, in the reference, the DJ name is just white with wide tracking.
    ctx.fillStyle = '#f8fafc'; 
    ctx.font = '400 45px "Times New Roman", Times, serif';
    ctx.letterSpacing = '20px';
    ctx.fillText(subtitle.toUpperCase(), canvas.width / 2, bottomY - 60);

    // Set Type Pillar (e.g. B2B) - Chromatic Aberration
    ctx.font = 'bold 65px "Times New Roman", Times, serif';
    ctx.letterSpacing = '10px';
    const textStr = setType.toUpperCase();
    const cx = canvas.width / 2;
    const cy = bottomY + 20;

    // Chromatic Aberration Pass 1: Red (shifted left)
    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.fillText(textStr, cx - 4, cy);
    
    // Chromatic Aberration Pass 2: Cyan (shifted right)
    ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
    ctx.fillText(textStr, cx + 4, cy);
    
    // Slice Effect (Horizontal line cuts)
    // we do this by drawing the text shifted, then clipping?
    // Or just draw the base text:
    ctx.fillStyle = genreColor; 
    ctx.fillText(textStr, cx, cy);

    // Apply some horizontal artifact lines across the SetType for the "trippy" feel
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(cx - 300, cy - 35, 600, 3);
    ctx.fillRect(cx - 300, cy - 20, 600, 2);
    ctx.fillRect(cx - 300, cy - 5, 600, 4);

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
