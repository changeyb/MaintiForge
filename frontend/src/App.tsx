import { NavLink, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Maximize } from 'lucide-react';
import { useLang } from './i18n';
import { NOW } from './mock/data';
import Dashboard from './pages/Dashboard';
import Floor from './pages/Floor';
import Vehicles from './pages/Vehicles';
import VehicleDetail from './pages/VehicleDetail';
import Delays from './pages/Delays';
import Analytics from './pages/Analytics';
import Poc from './pages/Poc';

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Clock() {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const { lang } = useLang();
  const d = NOW;
  const wd = lang === 'zh' ? `周${WEEKDAYS_ZH[d.getDay()]}` : WEEKDAYS_EN[d.getDay()];
  return (
    <span className="num text-white/70 text-[13px] whitespace-nowrap">
      {d.getFullYear()}-{String(d.getMonth() + 1).padStart(2, '0')}-{String(d.getDate()).padStart(2, '0')} {wd}{' '}
      {String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}
    </span>
  );
}

const NAV = [
  { to: '/', key: 'nav.dashboard', sub: 'nav.sub.dashboard', end: true },
  { to: '/floor', key: 'nav.floor', sub: 'nav.sub.floor' },
  { to: '/vehicles', key: 'nav.vehicles', sub: 'nav.sub.vehicles' },
  { to: '/delays', key: 'nav.delays', sub: 'nav.sub.delays' },
  { to: '/analytics', key: 'nav.analytics', sub: 'nav.sub.analytics' },
  { to: '/poc', key: 'nav.poc', sub: 'nav.sub.poc' },
] as const;

export default function App() {
  const { t, lang, setLang } = useLang();
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-40 bg-primary shadow-[0_2px_12px_rgba(22,48,77,.25)]">
        <div className="max-w-[1500px] mx-auto px-5 h-[60px] flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal to-primary-deep flex items-center justify-center text-[15px] font-black text-white">K</div>
            <div>
              <div className="text-[14px] font-bold leading-tight text-white whitespace-nowrap">{t('app.title')}</div>
              <div className="text-[10px] text-white/65 leading-tight whitespace-nowrap">{t('app.subtitle')}</div>
            </div>
          </div>
          <nav className="flex items-center gap-1 ml-4">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={'end' in n}
                className={({ isActive }) =>
                  `px-3.5 py-1.5 rounded-md text-[13px] whitespace-nowrap transition-colors ${
                    isActive ? 'bg-white/15 text-white font-semibold' : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                {t(n.key as any)}
                <span className="ml-1.5 text-[10px] opacity-75">{t(n.sub as any)}</span>
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-300 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
              LIVE · {t('common.mockNotice')}
            </span>
            <Clock />
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="px-2.5 py-1 rounded border border-white/25 text-[12px] text-white/80 hover:border-white/60 hover:text-white transition-colors"
            >
              {t('common.lang')}
            </button>
            <button
              onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-white/25 text-[12px] text-white/80 hover:border-white/60 hover:text-white transition-colors"
            >
              <Maximize size={12} /> {t('common.fullscreen')}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-[1500px] w-full mx-auto px-5 py-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/floor" element={<Floor />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/vehicle/:id" element={<VehicleDetail />} />
          <Route path="/delays" element={<Delays />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/poc" element={<Poc />} />
        </Routes>
      </main>
    </div>
  );
}
