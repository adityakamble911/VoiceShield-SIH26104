import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Activity, PlusCircle, Radio } from 'lucide-react';
import { ScreenTab, ScanResult } from '../types';

interface NavbarProps {
  currentTab: ScreenTab;
  setCurrentTab: (tab: ScreenTab) => void;
  scans: ScanResult[];
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, scans }) => {
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeString(now.toTimeString().split(' ')[0] + ' UTC');
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const aiClonesCount = scans.filter((s) => s.verdict === 'AI_GENERATED').length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0a0f1d]/95 backdrop-blur-xl">
      <div className="w-full px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Logo & Screen Title */}
        <div className="flex items-center gap-4">
          <div 
            onClick={() => setCurrentTab('dashboard')} 
            className="flex items-center gap-3 cursor-pointer group"
            id="brand-logo-button"
          >
            <div className="w-8 h-8 bg-cyan-500 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold tracking-tight text-cyan-400">
              VOICESHIELD
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              {currentTab === 'dashboard'
                ? 'Analysis Dashboard'
                : currentTab === 'upload'
                ? 'Audio Upload & Inspection'
                : currentTab === 'detection'
                ? 'Voice Detection Verdict'
                : currentTab === 'analysis'
                ? 'Detailed Spectral Analysis'
                : currentTab === 'live'
                ? 'Live Interception Scanner'
                : 'Scan Audit History'}
            </span>
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full border border-blue-500/20">
              STITCH UI v2.0
            </span>
          </div>
        </div>

        {/* Status Indicators & User Profile */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>DEEPSCAN v4.2</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-cyan-400">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>GEMINI 3.8</span>
            </div>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-400">
              <Radio className="w-3.5 h-3.5 text-cyan-500" />
              <span>{timeString || 'LIVE'}</span>
            </div>

            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-xs">
              <Activity className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-slate-400">Clones:</span>
              <span className="font-bold text-rose-400">{aiClonesCount}</span>
            </div>
          </div>

          {/* User Profile capsule from theme */}
          <div className="bg-slate-800/50 p-1.5 sm:p-2 sm:px-3 rounded-lg border border-slate-700 flex items-center gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 shrink-0"></div>
            <span className="text-xs sm:text-sm font-semibold text-slate-200 hidden xs:inline">Shield_Admin</span>
          </div>

          {/* High-Contrast Action Button */}
          <button
            id="navbar-new-scan-btn"
            onClick={() => setCurrentTab('upload')}
            className="px-3 sm:px-4 py-2 bg-cyan-500 text-black text-xs font-black rounded-lg uppercase hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-colors flex items-center gap-1.5 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Scan</span>
          </button>
        </div>
      </div>
    </header>
  );
};
