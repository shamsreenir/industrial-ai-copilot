import React from 'react';
import { 
  Menu, Activity, Camera, ShieldCheck, Sparkles, ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { PRIMARY_NAV_PAGES, AUDIT_NAV_PAGES } from './Sidebar';

export default function Navbar({ activeTab, setActiveTab, onToggleSidebar, onOpenVisionModal, healthScore = 99.8 }) {
  const allPages = [...PRIMARY_NAV_PAGES, ...AUDIT_NAV_PAGES];
  const activeItem = allPages.find(p => p.id === activeTab || (p.id === 'inspection' && activeTab === 'vision') || (p.id === 'evaluation' && activeTab === 'defect_explorer'));

  return (
    <header className="sticky top-0 z-30 bg-[#05080e]/80 border-b border-white/[0.08] backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Toggle + Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] border border-white/[0.08] transition"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 text-xs font-mono">
              <span className="text-sky-300 font-semibold bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/25 text-[11px] shadow-sm">
                VIEW {activeItem?.num || '01'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-bold text-white text-xs tracking-wider uppercase font-sans">
                {activeItem?.label || 'Inspection Workstation'}
              </span>
            </div>
          </div>

          {/* Right: Framer Segmented Navigation Pill */}
          <div className="flex items-center gap-3">
            {/* Quick Segmented Nav */}
            <div className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1 rounded-full border border-white/[0.08] text-xs font-mono">
              <button
                onClick={() => setActiveTab('inspection')}
                className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                  activeTab === 'inspection' || activeTab === 'vision'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                01. Inspect
              </button>
              <button
                onClick={() => setActiveTab('evaluation')}
                className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                  activeTab === 'evaluation' || activeTab === 'defect_explorer'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                02. Evaluate
              </button>
              <button
                onClick={() => setActiveTab('explainability')}
                className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                  activeTab === 'explainability'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                03. Explain
              </button>
              <button
                onClick={() => setActiveTab('rootcause')}
                className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                  activeTab === 'rootcause' || activeTab === 'drift'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                04. Root Cause
              </button>
              <button
                onClick={() => setActiveTab('secondary_benchmark')}
                className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                  activeTab === 'secondary_benchmark'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                05. YOLO
              </button>
            </div>

            {/* Architecture Modal Button */}
            <button
              onClick={onOpenVisionModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5 text-sky-400" />
              <span className="hidden sm:inline">Architecture</span>
            </button>

            {/* Live Model Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-300 font-semibold hidden sm:inline">LIVE INFERENCE</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
