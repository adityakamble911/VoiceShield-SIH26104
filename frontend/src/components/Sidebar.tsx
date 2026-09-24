import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  ShieldAlert,
  BarChart3,
  Mic,
  History,
  Shield,
  Cpu,
} from 'lucide-react';
import { ScreenTab, ScanResult } from '../types';

interface SidebarProps {
  currentTab: ScreenTab;
  setCurrentTab: (tab: ScreenTab) => void;
  scans: ScanResult[];
  latestScan: ScanResult | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  scans,
  latestScan,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ScreenTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      desc: 'Overview & Statistics',
    },
    {
      id: 'upload' as ScreenTab,
      label: 'Audio Upload',
      icon: UploadCloud,
      badge: 'Drop',
      desc: 'WAV, MP3, M4A',
    },
    {
      id: 'detection' as ScreenTab,
      label: 'Voice Detection',
      icon: ShieldAlert,
      badge: latestScan ? (latestScan.verdict === 'AI_GENERATED' ? 'Clone' : 'Human') : null,
      badgeColor: latestScan?.verdict === 'AI_GENERATED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      desc: 'AI vs Real Human',
    },
    {
      id: 'analysis' as ScreenTab,
      label: 'Detailed Analysis',
      icon: BarChart3,
      badge: 'Spectra',
      desc: 'Waveform & Indicators',
    },
    {
      id: 'live' as ScreenTab,
      label: 'Live Detection',
      icon: Mic,
      badge: 'LIVE',
      badgeColor: 'bg-rose-600/20 text-rose-400 border-rose-500/40 animate-pulse',
      desc: 'Microphone Scanner',
    },
    {
      id: 'history' as ScreenTab,
      label: 'Scan History',
      icon: History,
      badge: scans.length.toString(),
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
      desc: 'Previous Records',
    },
  ];

  return (
    <aside className="w-full lg:w-64 bg-[#0d1425] border-r border-slate-800 flex flex-col shrink-0">
      {/* Brand Header */}
      <div 
        onClick={() => setCurrentTab('dashboard')}
        className="p-5 sm:p-6 flex items-center gap-3 cursor-pointer border-b border-slate-800/80 group"
      >
        <div className="w-8 h-8 bg-cyan-500 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center transition-transform group-hover:scale-105">
          <Shield className="w-5 h-5 text-black" />
        </div>
        <div>
          <span className="text-xl font-bold tracking-tight text-cyan-400 font-display">
            VOICESHIELD
          </span>
          <div className="text-[10px] font-mono text-slate-500 tracking-wider">
            HIGH DENSITY v2.0
          </div>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 p-4 space-y-1.5" id="main-navigation-menu">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full group flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    item.badgeColor || 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status in Sidebar from High Density theme */}
      <div className="p-4 sm:p-5 border-t border-slate-800 space-y-3">
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
          <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
            SYSTEM STATUS
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-slate-200 font-mono">DeepScan v4.2 Active</span>
          </div>
        </div>

        {/* Mini threat tracker */}
        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Threat Shield</span>
            <span className="text-rose-400 font-bold">ARMED</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-rose-500 h-full rounded-full" style={{ width: '82%' }}></div>
          </div>
        </div>
      </div>
    </aside>
  );
};
