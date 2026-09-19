import React, { useState } from 'react';
import { 
  Camera, 
  Layers, 
  Eye, 
  Cpu, 
  Target,
  ChevronRight,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { useInspection } from '../context/InspectionContext';

const DECISION_CHAIN_STEPS = [
  {
    id: 'inspect',
    tab: 'inspection',
    num: '01',
    label: 'INSPECTION',
    sub: 'Live Inference & Scrutiny',
    icon: Camera,
    color: 'emerald',
    activeTabs: ['inspection', 'vision'],
    badge: 'MobileNetV3'
  },
  {
    id: 'evaluate',
    tab: 'evaluation',
    num: '02',
    label: 'EVALUATION',
    sub: '5-Class Matrix & FAR/FRR',
    icon: Layers,
    color: 'cyan',
    activeTabs: ['evaluation', 'defect_explorer'],
    badge: '12K Dataset'
  },
  {
    id: 'explain',
    tab: 'explainability',
    num: '03',
    label: 'EXPLAINABILITY',
    sub: 'Grad-CAM & 6x Robustness',
    icon: Eye,
    color: 'purple',
    activeTabs: ['explainability'],
    badge: 'Grad-CAM'
  },
  {
    id: 'root_cause',
    tab: 'rootcause',
    num: '04',
    label: 'ROOT CAUSE',
    sub: 'Process Statistical Link',
    icon: Cpu,
    color: 'amber',
    activeTabs: ['rootcause', 'drift'],
    badge: 'TreeSHAP'
  },
  {
    id: 'secondary',
    tab: 'secondary_benchmark',
    num: '05',
    label: 'LOCALIZATION',
    sub: 'NEU-DET Benchmark',
    icon: Target,
    color: 'blue',
    activeTabs: ['secondary_benchmark'],
    badge: 'mAP@50'
  }
];

export default function DecisionChain({ activeTab, onNavigate }) {
  const { inspection, hasActiveInspection } = useInspection();
  const currentStepIndex = DECISION_CHAIN_STEPS.findIndex(step => 
    step.activeTabs.includes(activeTab)
  );

  return (
    <div className="framer-surface rounded-2xl p-2.5 mb-8 relative overflow-hidden">
      {/* Specular Top Glow line */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
      
      {/* Micro header status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 mb-1.5 text-xs">
        <div className="flex items-center gap-2.5 text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
          </span>
          <span className="text-[11px] font-mono font-medium tracking-wide text-slate-300">
            INDUSTRIAL VERIFICATION PIPELINE
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          {hasActiveInspection ? (
            <span className="text-[11px] font-mono font-bold text-emerald-400 hidden sm:inline flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              SPECIMEN: {inspection.predictedClass?.toUpperCase()} ({((inspection.calibratedConfidence ?? 0) * 100).toFixed(1)}%)
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              Zero-Fake Cross-Module Pipeline
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => onNavigate('traceability')}
            className="text-[11px] font-mono text-slate-400 hover:text-sky-300 flex items-center gap-1 transition group"
          >
            <span>Requirements Traceability</span>
            <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-sky-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>

      {/* 5-Step Segmented Flow Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {DECISION_CHAIN_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = step.activeTabs.includes(activeTab);

          return (
            <button
              key={step.id}
              onClick={() => onNavigate(step.tab)}
              className={`
                group relative text-left p-3 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between
                ${isActive 
                  ? 'bg-slate-900/90 border-sky-500/50 shadow-lg shadow-sky-500/10 ring-1 ring-sky-400/30' 
                  : 'bg-slate-950/40 border-white/[0.06] hover:bg-slate-900/40 hover:border-white/15'
                }
              `}
            >
              {/* Active Ambient Glow Background */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-b from-sky-500/[0.08] to-transparent rounded-xl pointer-events-none" />
              )}

              <div className="flex items-center justify-between w-full mb-3">
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className={`font-bold ${isActive ? 'text-sky-400' : 'text-slate-500'}`}>
                    {step.num}
                  </span>
                  <span className="text-slate-700">/</span>
                  <span className={`text-[10px] tracking-wider uppercase ${isActive ? 'text-sky-300 font-semibold' : 'text-slate-500'}`}>
                    {step.badge}
                  </span>
                </div>
                
                <div className={`p-1.5 rounded-lg border transition-all ${
                  isActive 
                    ? 'bg-sky-500/20 border-sky-400/40 text-sky-300' 
                    : 'bg-white/[0.03] border-white/[0.06] text-slate-500 group-hover:text-slate-300 group-hover:border-white/10'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono font-bold tracking-wide ${
                    isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                  }`}>
                    {step.label}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 group-hover:text-slate-400 truncate mt-0.5 font-sans">
                  {step.sub}
                </div>
              </div>

              {/* Dynamic Bottom Line Indicator */}
              <div className={`mt-3 h-[2px] w-full rounded-full transition-all duration-300 ${
                isActive 
                  ? 'bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]' 
                  : 'bg-white/[0.04] group-hover:bg-white/[0.08]'
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
