import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Home, Database, ListMusic, Search, Clapperboard, Layers, Music, CheckCircle2, BarChart3 } from 'lucide-react';
import api from './lib/api';
import MasterLibrary from './views/MasterLibrary';
import SetPlanner from './views/SetPlanner';
import TrackScout from './views/TrackScout';
import CoverGenerator from './views/CoverGenerator';
import VideoHighlight from './views/VideoHighlight';

function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4 text-primary">Dashboard</h1>
      <p className="text-lg opacity-80 mb-8">Welcome to DJ Central Hub.</p>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-3xl font-black text-blue-400">{stats.total_tracks}</div>
            <div className="text-xs uppercase text-slate-500 font-semibold mt-1">Total Tracks</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-3xl font-black text-emerald-400">{stats.played_tracks}</div>
            <div className="text-xs uppercase text-slate-500 font-semibold mt-1">Played in Sets</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-3xl font-black text-purple-400">{stats.total_played_sets}</div>
            <div className="text-xs uppercase text-slate-500 font-semibold mt-1">Released Sets</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-3xl font-black text-amber-400">{stats.total_planned_sets}</div>
            <div className="text-xs uppercase text-slate-500 font-semibold mt-1">Planned Sets</div>
          </div>
        </div>
      )}

      {/* Top Genres */}
      {stats?.top_genres?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
          <h3 className="text-sm uppercase text-slate-500 font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Top Genres
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.top_genres.map(g => (
              <span key={g.genre} className="bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold">
                {g.genre} <span className="text-slate-500 ml-1">{g.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

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
        <Link to="/scout" className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl hover:border-primary transition cursor-pointer">
          <Search className="w-8 h-8 text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Track Scout</h2>
          <p className="text-sm opacity-70">Parse tracklists and match against your library.</p>
        </Link>
        <Link to="/plugins/video" className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl hover:border-primary transition cursor-pointer">
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

function NavLink({ to, icon: Icon, children }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
        active
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5" /> {children}
    </Link>
  );
}

function Sidebar() {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 min-h-screen p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-10 px-2 mt-4 text-primary">
        <Music className="w-6 h-6" />
        <span className="font-bold text-xl tracking-tight">DJ Hub</span>
      </div>
      <nav className="flex flex-col gap-2">
        <NavLink to="/" icon={Home}>Dashboard</NavLink>
        <div className="text-xs uppercase text-slate-500 font-semibold px-3 mt-6 mb-2">Library</div>
        <NavLink to="/library" icon={Database}>Master Library</NavLink>
        <NavLink to="/sets" icon={ListMusic}>Set Planner</NavLink>
        <NavLink to="/scout" icon={Search}>Track Scout</NavLink>
        <div className="text-xs uppercase text-slate-500 font-semibold px-3 mt-6 mb-2">Plugins</div>
        <NavLink to="/plugins/covers" icon={Layers}>Covers</NavLink>
        <NavLink to="/plugins/video" icon={Clapperboard}>Videos</NavLink>
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
            <Route path="/scout" element={<TrackScout />} />
            <Route path="/plugins/covers" element={<CoverGenerator />} />
            <Route path="/plugins/video" element={<VideoHighlight />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
