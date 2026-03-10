import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home, Database, ListMusic, Download, Clapperboard, Layers } from 'lucide-react';
import MasterLibrary from './views/MasterLibrary';
import SetPlanner from './views/SetPlanner';
import CoverGenerator from './views/CoverGenerator';
import VideoHighlight from './views/VideoHighlight';

function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4 text-primary">Dashboard</h1>
      <p className="text-lg opacity-80 mb-8">Welcome to DJ Central Hub.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/library" className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl hover:border-primary transition cursor-pointer">
          <Database className="w-8 h-8 text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Master Library</h2>
          <p className="text-sm opacity-70">Browse and sync tracks from Traktor.</p>
        </Link>
        <Link to="/sets" className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl hover:border-primary transition cursor-pointer">
          <ListMusic className="w-8 h-8 text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Set Planner</h2>
          <p className="text-sm opacity-70">Plan upcoming DJ sets.</p>
        </Link>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl hover:border-primary transition cursor-pointer">
          <Download className="w-8 h-8 text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Track Scout</h2>
          <p className="text-sm opacity-70">Find new tracks from Beatport.</p>
        </div>
        <Link to="/plugins/video" className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl hover:border-primary transition cursor-pointer md:col-start-2 lg:col-start-1">
          <Clapperboard className="w-8 h-8 text-accent mb-4" />
          <h2 className="text-xl font-semibold mb-2">Highlights</h2>
          <p className="text-sm opacity-70">Generate video highlights for social media.</p>
        </Link>
        <Link to="/plugins/covers" className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl hover:border-primary transition cursor-pointer">
          <Layers className="w-8 h-8 text-accent mb-4" />
          <h2 className="text-xl font-semibold mb-2">Covers</h2>
          <p className="text-sm opacity-70">Generate cover art from templates.</p>
        </Link>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 min-h-screen p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-10 px-2 mt-4 text-primary">
        <Database className="w-6 h-6" />
        <span className="font-bold text-xl tracking-tight">DJ Hub</span>
      </div>
      <nav className="flex flex-col gap-2">
        <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">
          <Home className="w-5 h-5" /> Dashboard
        </Link>
        <div className="text-xs uppercase text-slate-500 font-semibold px-3 mt-6 mb-2">Library</div>
        <Link to="/library" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">
          <Database className="w-5 h-5" /> Master Library
        </Link>
        <Link to="/sets" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">
          <ListMusic className="w-5 h-5" /> Set Planner
        </Link>
        <Link to="/scout" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">
          <Download className="w-5 h-5" /> Track Scout
        </Link>
        <div className="text-xs uppercase text-slate-500 font-semibold px-3 mt-6 mb-2">Plugins</div>
        <Link to="/plugins/covers" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">
          <Layers className="w-5 h-5" /> Covers
        </Link>
        <Link to="/plugins/video" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">
          <Clapperboard className="w-5 h-5" /> Videos
        </Link>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-950 text-slate-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/library" element={<MasterLibrary />} />
            <Route path="/sets" element={<SetPlanner />} />
            <Route path="/plugins/covers" element={<CoverGenerator />} />
            <Route path="/plugins/video" element={<VideoHighlight />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
