import React, { useState } from 'react';
import { 
  Camera, Layers, Eye, Cpu, Target, ShieldCheck, 
  ChevronRight, X, Sparkles, Activity
} from 'lucide-react';

export const PRIMARY_NAV_PAGES = [
  {
    id: 'inspection',
    num: '01',
    label: 'Inspection Workstation',
    subtitle: 'Live Inference & Human Scrutiny',
    icon: Camera,
    badge: 'MobileNetV3'
  },
  {
    id: 'evaluation',
    num: '02',
    label: 'Dataset Evaluation',
    subtitle: '5-Class Matrix & FAR/FRR',
    icon: Layers,
    badge: '1,800 Test'
  },
  {
    id: 'explainability',
    num: '03',
    label: 'Explainability & Robustness',
    subtitle: 'Grad-CAM Hooks & 6x Stress Tests',
    icon: Eye,
    badge: 'Grad-CAM'
  },
  {
    id: 'rootcause',
    num: '04',
    label: 'Process Root Cause',
    subtitle: 'Statistical Link & TreeSHAP',
    icon: Cpu,
    badge: 'TreeSHAP'
  },
  {
    id: 'secondary_benchmark',
    num: '05',
    label: 'Localization Benchmark',
    subtitle: 'NEU-DET Secondary Model',
    icon: Target,
    badge: 'mAP@50'
  },
];

export const AUDIT_NAV_PAGES = [
  {
    id: 'traceability',
    num: '06',
    label: 'Requirements Traceability',
    subtitle: 'Full Compliance Matrix',
    icon: ShieldCheck,
    badge: '100% Proven'
  }
];

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-72 bg-[#05080e]/95 border-r border-white/[0.08] flex flex-col backdrop-blur-2xl
      transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:z-auto
      ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
    `}>
      {/* Brand Header */}
      <div className="h-18 px-5 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center shadow-lg shadow-sky-500/10">
            <Camera className="w-4.5 h-4.5 text-sky-400" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
              <span>VISUAL AI</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-sky-500/10 border border-sky-500/30 text-sky-300 font-semibold">
                COPILOT
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">Precision Inspection Workstation</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div>
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
            Inspection Workstation
          </div>
          <div className="space-y-1">
            {PRIMARY_NAV_PAGES.map((page) => {
              const Icon = page.icon;
              const isActive = activeTab === page.id || (page.id === 'inspection' && activeTab === 'vision') || (page.id === 'evaluation' && activeTab === 'defect_explorer');
              
              return (
                <button
                  key={page.id}
                  onClick={() => {
                    setActiveTab(page.id);
                    onClose();
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 group cursor-pointer
                    ${isActive 
                      ? 'bg-gradient-to-r from-sky-500/15 via-sky-500/5 to-transparent border border-sky-500/30 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' 
                        : 'bg-white/[0.03] text-slate-400 group-hover:text-slate-200'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold tracking-wide ${isActive ? 'text-white' : 'text-slate-300'}`}>
                        {page.label}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate font-sans">
                        {page.subtitle}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                    isActive 
                      ? 'bg-sky-500/20 border-sky-400/40 text-sky-300' 
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-500'
                  }`}>
                    {page.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Audit & Compliance Section */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
            Governance & Audit
          </div>
          <div className="space-y-1">
            {AUDIT_NAV_PAGES.map((page) => {
              const Icon = page.icon;
              const isActive = activeTab === page.id;
              
              return (
                <button
                  key={page.id}
                  onClick={() => {
                    setActiveTab(page.id);
                    onClose();
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 group cursor-pointer
                    ${isActive 
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-white/[0.03] text-slate-400 group-hover:text-slate-200'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold tracking-wide ${isActive ? 'text-white' : 'text-slate-300'}`}>
                        {page.label}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate font-sans">
                        {page.subtitle}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                    isActive 
                      ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' 
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-500'
                  }`}>
                    {page.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer System Telemetry */}
      <div className="p-4 border-t border-white/[0.08] bg-[#030508]/80 text-xs">
        <div className="flex items-center justify-between mb-2 font-mono text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>MODEL READY</span>
          </span>
          <span className="text-slate-500">v1.0-prod</span>
        </div>
        <div className="text-[11px] text-slate-500 font-sans leading-relaxed">
          Validation Calibrated (T*=0.6728) • Organizer 5-Class Manufacturing Model
        </div>
      </div>
    </aside>
  );
}
