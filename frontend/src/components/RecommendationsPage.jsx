import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertTriangle, ArrowRight, Sparkles, 
  ShieldCheck, HelpCircle, Zap, Sliders, Download,
  Check, FileText, ChevronRight, TrendingUp, Compass
} from 'lucide-react';
import SectionHeader from './ui/SectionHeader';
import StatusBadge from './ui/StatusBadge';
import MetricCard from './ui/MetricCard';
import TelemetryPanel from './ui/TelemetryPanel';

export default function RecommendationsPage({ onNavigate }) {
  const [recsData, setRecsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewedMap, setReviewedMap] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetch('/api/recommendations')
      .then(res => res.json())
      .then(data => {
        setRecsData(data);
        setLoading(false);
      })
      .catch(err => console.error("Error loading recommendations:", err));
  }, []);

  if (loading || !recsData) {
    return (
      <div className="hud-panel rounded-xl p-16 text-center text-slate-400 font-mono">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs uppercase tracking-wider text-cyan-300">
            Compiling Evidence-Based Advisory Recommendations...
          </span>
        </div>
      </div>
    );
  }

  const toggleReviewed = (id) => {
    setReviewedMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleExport = (rec) => {
    const text = `INDUSTRIAL AI COPILOT - ADVISORY DIRECTIVE [${rec.id.toUpperCase()}]\nTITLE: ${rec.title}\nPRIORITY: ${rec.priority}\nWHY: ${rec.problem}\nSUGGESTED ACTION: ${rec.suggested_intervention}\nASSUMPTIONS: ${rec.assumptions}\nSIMULATED IMPACT: ${JSON.stringify(rec.expected_impact, null, 2)}`;
    navigator.clipboard?.writeText(text);
    setCopiedId(rec.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const reviewedCount = Object.values(reviewedMap).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        code="VIEW #17"
        title="Evidence-Based Industrial Action Directives"
        subtitle={recsData?.executive_summary || 'Evidence-grounded actionable directives derived from bottleneck diagnostics and process drift.'}
        badge="ADVISORY INTERVENTIONS"
        badgeVariant="cyan"
      >
        <div className="flex items-center gap-2">
          <StatusBadge status="ACTIVE" variant="emerald" pulse />
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/10 text-xs font-mono text-cyan-300">
            Reviewed: <strong className="text-emerald-400">{reviewedCount} / {(recsData?.recommendations || []).length}</strong>
          </div>
        </div>
      </SectionHeader>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Advisory Directives"
          value={(recsData?.recommendations || []).length}
          subValue="Prioritized & Grounded"
          glowColor="cyan"
          icon={<Compass className="w-4 h-4 text-cyan-400" />}
          cornerBadge="ADVISORY"
        />
        <MetricCard
          label="Critical TOC Interventions"
          value="1 Active"
          subValue="Cell 1 Cycle Time Reduction"
          glowColor="rose"
          icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
          cornerBadge="BOTTLENECK"
        />
        <MetricCard
          label="Projected Revenue Recovery"
          value="+₹4.12 Lakh"
          subValue="Daily Simulated Run"
          glowColor="emerald"
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          cornerBadge="RECOVERY"
        />
        <MetricCard
          label="Governance Human Sign-Off"
          value={`${reviewedCount} Approved`}
          subValue="Advisory Guardrail active"
          glowColor="purple"
          icon={<ShieldCheck className="w-4 h-4 text-purple-400" />}
          cornerBadge="GOVERNANCE"
        />
      </div>

      {/* Recommendations Cards List */}
      <div className="space-y-4">
        {(recsData?.recommendations || []).map((rec) => {
          const isReviewed = !!reviewedMap[rec.id];

          return (
            <div 
              key={rec.id} 
              className={`hud-panel rounded-xl border transition-all duration-200 p-5 space-y-4 ${
                isReviewed 
                  ? 'border-emerald-500/40 bg-emerald-950/10' 
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 font-mono">
                    <span className="text-xs text-cyan-400 font-bold">{rec.id.toUpperCase()}</span>
                    <StatusBadge 
                      status={rec.priority} 
                      variant={rec.priority === 'CRITICAL' ? 'rose' : rec.priority === 'HIGH' ? 'amber' : 'cyan'}
                      pulse={rec.priority === 'CRITICAL'}
                    />
                    {isReviewed && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 font-bold">
                        <Check className="w-3 h-3 text-emerald-400" /> REVIEWED
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-white font-mono tracking-tight">
                    RECOMMENDED ACTION: {rec.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-400">Confidence:</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {rec.confidence}
                  </span>
                </div>
              </div>

              {/* Why? Root Cause Evidence */}
              <div>
                <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  Why? (Root Cause & Problem Statement)
                </div>
                <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/70 p-3 rounded-lg border border-white/5 font-sans">
                  {rec.problem}
                </p>
              </div>

              {/* Empirical Evidence List */}
              <div>
                <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Empirical Evidence & Data Points
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
                  {rec.evidence.map((ev, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-white/5">
                      <span className="text-cyan-400 font-bold shrink-0 font-mono text-xs">»</span>
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Two-Col: Suggested Intervention & Simulated Impact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div className="bg-slate-950/80 p-3.5 rounded-lg border border-white/5 space-y-1">
                  <div className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-cyan-400" /> Suggested Intervention
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {rec.suggested_intervention}
                  </p>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-lg border border-white/5 space-y-1.5">
                  <div className="text-[11px] font-mono font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Simulated Impact
                  </div>
                  <div className="space-y-1 text-xs font-mono">
                    {Object.entries(rec.expected_impact).map(([k, v], idx) => (
                      <div key={idx} className="flex justify-between py-0.5 border-b border-white/5 last:border-0">
                        <span className="text-slate-400">{k}:</span>
                        <span className="font-bold text-emerald-400">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Assumptions & Action Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs">
                <div className="text-slate-500 text-[11px] max-w-xl font-sans">
                  <strong className="text-slate-400 font-mono uppercase text-[10px]">Assumptions:</strong> {rec.assumptions}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center font-mono">
                  {/* Mark Reviewed */}
                  <button
                    onClick={() => toggleReviewed(rec.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                      isReviewed 
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-slate-800'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    <span>{isReviewed ? 'Reviewed' : 'Mark Reviewed'}</span>
                  </button>

                  {/* Export Advisory */}
                  <button
                    onClick={() => handleExport(rec)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 text-xs flex items-center gap-1.5 transition"
                    title="Copy formatted advisory directive to clipboard"
                  >
                    <Download className="w-3 h-3 text-cyan-400" />
                    <span>{copiedId === rec.id ? 'Copied!' : 'Export'}</span>
                  </button>

                  {/* Simulate in What-If */}
                  <button
                    onClick={() => onNavigate('whatif')}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 transition shadow-md shadow-cyan-500/20"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Simulate in What-If</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
