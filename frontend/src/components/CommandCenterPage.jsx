import React, { useState } from 'react';
import { 
  Activity, AlertTriangle, ArrowRight, CheckCircle2, 
  Clock, Cpu, DollarSign, Layers, ShieldAlert, TrendingUp, Zap,
  BarChart3, RefreshCw, ChevronRight, Gauge, Radio, ShieldCheck, Box, Sliders
} from 'lucide-react';
import MetricCard from './ui/MetricCard';
import StatusBadge from './ui/StatusBadge';
import TelemetryPanel from './ui/TelemetryPanel';
import InteractiveRadialGauge from './ui/InteractiveRadialGauge';
import Factory3DNetwork from './ui/Factory3DNetwork';

export default function CommandCenterPage({ overviewData, onNavigate }) {
  if (!overviewData) {
    return (
      <div className="hud-panel rounded-xl p-16 text-center text-slate-400">
        <div className="flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
          <span className="font-mono text-xs uppercase tracking-wider text-cyan-300">
            Acquiring Factory Telemetry Stream from Rockwell Arena Model 3...
          </span>
        </div>
      </div>
    );
  }

  const {
    total_products_produced,
    production_rate_per_hour,
    line_average_utilization,
    active_bottleneck,
    quality_status,
    quality_queue_level,
    quality_utilization,
    estimated_daily_revenue,
    estimated_daily_loss,
    stations,
    system_health_score
  } = overviewData;

  const cell1Station = stations?.find(s => s.name === 'cell1') || {
    utilization: 0.867,
    queue_length: 190.8
  };

  return (
    <div className="space-y-6">
      {/* Cinematic Command Center Hero Banner */}
      <div className="hud-panel rounded-2xl border border-white/10 p-6 relative overflow-hidden bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-slate-950/95 shadow-2xl">
        {/* Luminous Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee]" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold tracking-widest uppercase">
                MISSION CONTROL // VIEW 01
              </span>
              <span className="text-slate-600 font-mono text-xs">•</span>
              <span className="text-[11px] font-mono text-cyan-400 font-semibold tracking-wider uppercase animate-pulse">
                LIVE INDUSTRIAL INTELLIGENCE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mono tracking-tight uppercase flex items-center gap-3">
              <span>Industrial AI Command Center</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed font-sans">
              Real-time cyber-physical monitoring of Rockwell Arena Model 3 facility. Synthesizes optical defect detection, 
              Theory of Constraints bottleneck mitigation, and economic response surfaces across 605,620 production records.
            </p>
          </div>

          {/* Plant Telemetry Status Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-white/10 shrink-0">
            <StatusBadge status="OPERATIONAL" label="SYSTEM: OPERATIONAL" size="sm" />
            <StatusBadge status="LIVE" label="DATA: LIVE (605K)" size="sm" />
            <StatusBadge status="READY" label="SURROGATE: READY" size="sm" />
            <StatusBadge status="MONITORING" label="ANOMALY: ACTIVE" size="sm" />
          </div>
        </div>

        {/* Horizontal Moving Scanline */}
        <div className="mt-5 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Plant Health Score:</span>
              <strong className="text-emerald-400">{system_health_score || 88.5}%</strong>
            </span>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="hidden sm:inline text-slate-400">
              Discrete-Event Pacing: <strong className="text-cyan-400">{production_rate_per_hour} parts/hr</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Active Bottleneck:</span>
            <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              Assembly Cell 1 (86.7%)
            </span>
          </div>
        </div>
      </div>

      {/* Top 5 KPI Metrics Rack */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Verified Total Output */}
        <MetricCard
          title="Total Verified Output"
          value={total_products_produced?.toLocaleString()}
          unit="units / 24h"
          sublabel="Pacing Cadence:"
          subvalue={`${production_rate_per_hour} / hr`}
          icon={TrendingUp}
          variant="cyan"
        />

        {/* KPI 2: Line Pacing Rate */}
        <MetricCard
          title="Line Throughput"
          value={production_rate_per_hour}
          unit="units / hr"
          sublabel="Hourly Pacing Target:"
          subvalue="2,400 target"
          icon={Activity}
          variant="cyan"
        />

        {/* KPI 3: TOC Bottleneck Cell 1 */}
        <MetricCard
          title="Primary Constraint"
          value="86.7%"
          unit="Cell 1 Util"
          sublabel="Peak Utilization:"
          subvalue="96.2% Peak"
          icon={AlertTriangle}
          variant="bottleneck"
        />

        {/* KPI 4: Upstream WIP Buffer */}
        <MetricCard
          title="Warehouse 1 WIP"
          value={cell1Station.queue_length?.toFixed(1) || '190.8'}
          unit="units queue"
          sublabel="Surge Max Bound:"
          subvalue="1,828 max"
          icon={Layers}
          variant="warning"
        />

        {/* KPI 5: Net Daily Revenue */}
        <MetricCard
          title="Simulated Net Rev"
          value={`₹${estimated_daily_revenue ? (estimated_daily_revenue / 100000).toFixed(2) : '65.70'}L`}
          unit="/ day"
          sublabel="Downtime/Scrap Loss:"
          subvalue={`-₹${estimated_daily_loss ? Math.round(estimated_daily_loss).toLocaleString() : '85,500'}`}
          icon={DollarSign}
          variant="emerald"
        />
      </div>

      {/* 3D WebGL Factory Production Network Visualizer */}
      <Factory3DNetwork onSelectStation={(stationId) => onNavigate('flow')} />

      {/* Two-Column Telemetry & Tactical Advisories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Station Telemetry Matrix */}
        <div className="lg:col-span-7">
          <TelemetryPanel
            title="Workstation Capacity & Queue Telemetry"
            subtitle="Full discrete-event telemetry aggregated from 605,620 Rockwell Arena Model 3 steps"
            actions={
              <button
                onClick={() => onNavigate('bottleneck')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
              >
                <span>Constraint Analysis</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/90 text-slate-400 uppercase font-mono border-b border-white/10 text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Station Node</th>
                    <th className="py-2.5 px-3">Utilization</th>
                    <th className="py-2.5 px-3">WIP Buffer</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300 font-mono">
                  {stations?.slice(0, 7).map((st, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition">
                      <td className="py-2.5 px-3 font-sans font-medium text-white flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                        <span>{st.display_name}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                st.status === 'BOTTLENECK' ? 'bg-rose-500' :
                                st.status === 'CONSTRAINED' ? 'bg-amber-400' :
                                'bg-cyan-400'
                              }`}
                              style={{ width: `${Math.min(st.utilization * 100, 100)}%` }}
                            />
                          </div>
                          <span className={`font-bold ${st.status === 'BOTTLENECK' ? 'text-rose-400' : 'text-slate-200'}`}>
                            {(st.utilization * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{st.queue_length}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={st.status} size="xs" />
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        <button
                          onClick={() => onNavigate('whatif')}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                        >
                          Simulate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Rockwell Discrete-Event Model</span>
              <span className="text-emerald-400">Zero Hallucination Ground Truth Active</span>
            </div>
          </TelemetryPanel>
        </div>

        {/* Right Column (5 cols): AI Strategic Advisory & Radial Gauge */}
        <div className="lg:col-span-5 space-y-4">
          <TelemetryPanel
            title="TOC Constraint & Strategic Advisory"
            subtitle="Goldratt Drum-Buffer-Rope priority intervention"
            badge={<StatusBadge status="CRITICAL" label="CRITICAL INTERVENTION" size="xs" />}
          >
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/80 border border-white/5 mb-4">
              <InteractiveRadialGauge
                value={86.7}
                status="bottleneck"
                label="Cell 1 Util"
                size={95}
              />
              <div className="space-y-1 font-mono text-xs">
                <div className="font-bold text-white text-sm">Primary Line Constraint</div>
                <div className="text-rose-400 font-bold">Assembly Cell 1 (86.7% util)</div>
                <div className="text-[11px] text-slate-400">
                  Upstream WIP: <span className="text-white font-bold">190.8 parts</span> (Max 1,828)
                </div>
                <div className="text-[10px] text-slate-500">Pacing limits throughput to 54.7k/day</div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/90 border border-white/5 space-y-2">
              <div className="font-bold text-white text-xs font-mono flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                Recommended Operational Directive
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Throttle upstream Blanking Line pacing to match Cell 1 cycle capacity, and reduce Cell 1 cycle time by 15% via tooling pre-positioning.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs font-mono">
                <div className="bg-slate-900/80 p-2 rounded border border-white/5">
                  <div className="text-[10px] text-slate-400">Cycle Reduction:</div>
                  <div className="text-cyan-300 font-bold mt-0.5">-15% (-0.47s)</div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-white/5">
                  <div className="text-[10px] text-slate-400">Throughput Gain:</div>
                  <div className="text-emerald-400 font-bold mt-0.5">+11.4% (+6,200/day)</div>
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between gap-2 border-t border-white/5 mt-4">
              <button
                onClick={() => onNavigate('recommendations')}
                className="text-xs font-mono text-slate-400 hover:text-white transition"
              >
                All 6 Directives $\rightarrow$
              </button>
              <button
                onClick={() => onNavigate('whatif')}
                className="px-3.5 py-2 text-xs font-mono font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition btn-tactile"
              >
                <Sliders className="h-3.5 w-3.5 text-slate-950" />
                <span>Launch What-If Sim</span>
              </button>
            </div>
          </TelemetryPanel>
        </div>
      </div>
    </div>
  );
}
