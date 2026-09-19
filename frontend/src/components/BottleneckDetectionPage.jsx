import React, { useState, useEffect } from 'react';
import { 
  GitBranch, AlertTriangle, CheckCircle2, ShieldAlert, 
  ArrowRight, Gauge, Layers, Info, Radio, Zap, Activity,
  ChevronRight, RefreshCw, BarChart2, CornerDownRight
} from 'lucide-react';
import SectionHeader from './ui/SectionHeader';
import StatusBadge from './ui/StatusBadge';
import MetricCard from './ui/MetricCard';
import TelemetryPanel from './ui/TelemetryPanel';
import InteractiveRadialGauge from './ui/InteractiveRadialGauge';

export default function BottleneckDetectionPage({ onNavigateToTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);

  useEffect(() => {
    fetch('/api/bottlenecks')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch bottleneck data');
        return res.json();
      })
      .then(d => {
        setData(d);
        if (d.stations && d.stations.length > 0) {
          setSelectedStation(d.stations[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="hud-panel rounded-xl p-16 text-center text-slate-400 font-mono">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs uppercase tracking-wider text-rose-300">
            Evaluating Theory of Constraints across manufacturing cells...
          </span>
          <span className="text-[10px] text-slate-500">Scanning buffer queue depths & starvation risks</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="hud-panel rounded-xl p-6 border-rose-500/50 bg-rose-950/20 text-rose-300 font-mono text-xs">
        <h3 className="font-bold flex items-center gap-2 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400" /> Error Loading Bottleneck Analysis
        </h3>
        <p className="mt-1">{error || 'Unknown error occurred'}</p>
      </div>
    );
  }

  const stationsList = data?.stations || [];
  const bottleneckStation = stationsList.find(s => s.status === 'BOTTLENECK') || stationsList[0] || {
    name: data?.primary_bottleneck || 'Assembly Cell 1',
    utilization: data?.bottleneck_utilization || 0.884,
    queue_length: data?.bottleneck_queue || 12.4,
    cycle_time_sec: 28.5
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        code="VIEW #07"
        title="Line Bottleneck & Buffer Dynamics"
        subtitle="Goldratt Drum-Buffer-Rope paradigm. Identifies the primary throughput constraint, evaluates starvation vs blocking buffers, and prioritizes cycle-time reduction interventions."
        badge="THEORY OF CONSTRAINTS"
        badgeVariant="rose"
      >
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/80 flex items-center gap-2 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            <span className="text-slate-300">Active Constraint:</span>
            <strong className="text-rose-300 font-bold">{data?.primary_bottleneck || 'Assembly Cell 1'}</strong>
          </div>
        </div>
      </SectionHeader>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Pacing Constraint"
          value={data?.primary_bottleneck || 'Assembly Cell 1'}
          subValue="Governs entire plant cadence"
          glowColor="rose"
          icon={<Radio className="w-4 h-4 text-rose-400" />}
          cornerBadge="DRUM"
        />
        <MetricCard
          label="Constraint Utilization"
          value={`${((bottleneckStation.utilization ?? 0.884) * 100).toFixed(1)}%`}
          subValue="Design threshold: 85%"
          glowColor="rose"
          icon={<Gauge className="w-4 h-4 text-rose-400" />}
          cornerBadge="CRITICAL"
        />
        <MetricCard
          label="Max Upstream Queue"
          value={`${bottleneckStation.queue_length ?? 12} parts`}
          subValue="Buffer capacity: 1,828 units"
          glowColor="amber"
          icon={<Layers className="w-4 h-4 text-amber-400" />}
          cornerBadge="BUFFER"
        />
        <MetricCard
          label="TOC Optimization Potential"
          value="+15.8%"
          subValue="~358 additional units/hr"
          glowColor="emerald"
          icon={<Zap className="w-4 h-4 text-emerald-400" />}
          cornerBadge="TARGET"
        />
      </div>

      {/* Goldratt Drum-Buffer-Rope Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* The Drum */}
        <div className="hud-panel rounded-xl p-5 border border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-slate-950 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-4 h-4" />
              1. THE DRUM (Constraint)
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
              86.7% UTIL
            </span>
          </div>
          <div className="font-bold text-white text-base font-mono">{data.primary_bottleneck}</div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Dictates overall factory pace (2,267.5 units/hr). Any stoppage or micro-delay here directly penalizes plant revenue.
          </p>
          <div className="pt-2 border-t border-rose-900/40 text-[10px] font-mono text-rose-300/80 flex items-center justify-between">
            <span>Cycle Time: {bottleneckStation.cycle_time_sec}s</span>
            <span>Queue: {bottleneckStation.queue_length} parts</span>
          </div>
        </div>

        {/* The Buffer */}
        <div className="hud-panel rounded-xl p-5 border border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-slate-950 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              2. THE BUFFER (Protection)
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
              190.8 WIP (MAX 1828)
            </span>
          </div>
          <div className="font-bold text-white text-base font-mono">Warehouse 1 Upstream Buffer</div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Absorbs variability from upstream Blanking & Stamping to ensure Assembly Cell 1 never experiences starvation.
          </p>
          <div className="pt-2 border-t border-amber-900/40 text-[10px] font-mono text-amber-300/80 flex items-center justify-between">
            <span>Buffer Time: ~45 min</span>
            <span>Safety Margin: Nominal</span>
          </div>
        </div>

        {/* The Rope */}
        <div className="hud-panel rounded-xl p-5 border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-950 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              3. THE ROPE (Release Sync)
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              COIL PACING
            </span>
          </div>
          <div className="font-bold text-white text-base font-mono">Blanking Coil Feeder Release</div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Synchronizes material release with the consumption rate of Cell 1, preventing runaway work-in-process bloat.
          </p>
          <div className="pt-2 border-t border-cyan-900/40 text-[10px] font-mono text-cyan-300/80 flex items-center justify-between">
            <span>Pacing Signal: Pull Kanban</span>
            <span>WIP Limit: 2,000 units</span>
          </div>
        </div>
      </div>

      {/* Synthesis Banner */}
      <div className="hud-panel rounded-xl border border-white/10 p-4 bg-slate-950/80 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Theory of Constraints Executive Synthesis
          </h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed font-sans">
            {data.theory_of_constraints_diagnosis}
          </p>
        </div>
      </div>

      {/* Station Capacity Matrix + Selected Station Drilldown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Station Hierarchy */}
        <div className="lg:col-span-7 hud-panel rounded-xl border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span>Station Capacity & Utilization Hierarchy</span>
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">Ranked by Constraint Severity</span>
          </div>

          <div className="space-y-3">
            {stationsList.map((st, idx) => {
              const isSelected = selectedStation?.name === st.name;
              const isBottleneck = st.status === 'BOTTLENECK';
              const isConstrained = st.status === 'CONSTRAINED';
              
              return (
                <div
                  key={st.name}
                  onClick={() => setSelectedStation(st)}
                  className={`hud-panel rounded-lg p-3.5 border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/70 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/60 border-white/5 hover:bg-slate-900/60 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold ${
                        isBottleneck ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        isConstrained ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-sm text-white flex items-center gap-2 font-mono">
                          {st.display_name}
                          <StatusBadge 
                            status={st.status} 
                            variant={isBottleneck ? 'rose' : isConstrained ? 'amber' : 'emerald'}
                            pulse={isBottleneck}
                          />
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          Cycle Time: {st.cycle_time_sec}s • Upstream Queue: {st.queue_length} parts
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className={`text-base font-bold ${isBottleneck ? 'text-rose-400' : 'text-slate-200'}`}>
                        {(st.utilization * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-500">Utilization</div>
                    </div>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div className="mt-3 w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isBottleneck ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' :
                        isConstrained ? 'bg-amber-400' :
                        'bg-cyan-500'
                      }`}
                      style={{ width: `${Math.min(st.utilization * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (5 cols): Selected Station Deep Dive */}
        <div className="lg:col-span-5 space-y-4">
          <div className="hud-panel rounded-xl border border-white/10 p-5 space-y-4">
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Buffer & Starvation Telemetry</span>
            </h2>

            {selectedStation ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-lg bg-slate-950/90 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Selected Workstation</div>
                    <div className="text-sm font-bold text-white mt-0.5 font-mono">{selectedStation.display_name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold">
                      Constraint #{selectedStation.constraint_rank || 1}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-around p-3 bg-slate-950 rounded-lg border border-white/5">
                  <div className="text-center">
                    <InteractiveRadialGauge
                      value={selectedStation.utilization * 100}
                      maxValue={100}
                      label="Utilization"
                      unit="%"
                      size={110}
                      color={selectedStation.status === 'BOTTLENECK' ? '#f43f5e' : selectedStation.status === 'CONSTRAINED' ? '#fbbf24' : '#06b6d4'}
                    />
                  </div>
                  <div className="text-center">
                    <InteractiveRadialGauge
                      value={selectedStation.queue_length}
                      maxValue={250}
                      label="Buffer Queue"
                      unit="units"
                      size={110}
                      color={selectedStation.queue_length > 100 ? '#f43f5e' : '#10b981'}
                    />
                  </div>
                </div>

                {/* Starvation vs Blocking Assessment */}
                <div className="p-3.5 rounded-lg bg-slate-950/80 border border-white/5 space-y-1.5">
                  <div className="text-xs font-mono font-semibold text-slate-300 flex items-center justify-between">
                    <span>Buffer Dynamic Assessment:</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-white/10 text-cyan-400">
                      {selectedStation.status === 'BOTTLENECK' ? 'BLOCKING UPSTREAM' : 'NORMAL BUFFER'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {selectedStation.status === 'BOTTLENECK' 
                      ? 'Upstream buffer continuously accumulates parts because cycle time exceeds feeder rate. Downstream processes face intermittent starvation.'
                      : selectedStation.status === 'CONSTRAINED'
                      ? 'High utilization buffer subject to transient surges during shift changeovers and SKU switches.'
                      : 'Station possesses ample surge capacity. Buffer queue remains within safe operational bounds.'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">Select a station to inspect buffer telemetry.</p>
            )}
          </div>

          {/* TOC Interventions */}
          <div className="hud-panel rounded-xl border border-white/10 p-5 space-y-3">
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Advisory TOC Interventions</span>
            </h2>
            <div className="space-y-2.5">
              {(data?.recommendations || []).map((rec, i) => (
                <div key={i} className="p-3 rounded-lg bg-slate-950/80 border border-white/5 text-xs space-y-1">
                  <div className="font-semibold text-white font-mono flex items-center justify-between">
                    <span>{rec.action}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Step {rec.toc_step}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] font-sans">{rec.details}</div>
                  <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono border-t border-white/5">
                    <span className="text-cyan-400 font-bold">Estimated Gain: {rec.estimated_throughput_gain}</span>
                    <span className="text-slate-500">Non-disruptive</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
