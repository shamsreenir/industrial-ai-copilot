import React, { useState, useEffect } from 'react';
import { 
  GitBranch, AlertTriangle, CheckCircle2, Clock, 
  Layers, ArrowDown, ArrowRight, Activity, Truck, Zap,
  Sliders, ChevronRight, X
} from 'lucide-react';
import SectionHeader from './ui/SectionHeader';
import StatusBadge from './ui/StatusBadge';
import TelemetryPanel from './ui/TelemetryPanel';
import InteractiveRadialGauge from './ui/InteractiveRadialGauge';

export default function ProductionFlowPage({ onNavigate }) {
  const [bottleneckData, setBottleneckData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);

  useEffect(() => {
    fetch('/api/bottlenecks')
      .then(res => res.json())
      .then(data => {
        setBottleneckData(data);
        if (data.nodes && data.nodes.length > 0) {
          // Default to Cell 1 (the bottleneck)
          const cell1 = data.nodes.find(n => n.is_bottleneck) || data.nodes[0];
          setSelectedStation(cell1);
        }
        setLoading(false);
      })
      .catch(err => console.error("Error fetching bottlenecks:", err));
  }, []);

  if (loading || !bottleneckData) {
    return (
      <div className="hud-panel rounded-xl p-16 text-center text-slate-400">
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-mono text-xs uppercase tracking-wider text-cyan-300">
            Rendering Discrete-Event Production Flow Topology...
          </span>
        </div>
      </div>
    );
  }

  const nodes = bottleneckData?.nodes || [];
  const primary_bottleneck = bottleneckData?.primary_bottleneck || 'Assembly Cell 1';
  const bottleneck_utilization = bottleneckData?.bottleneck_utilization || 0.884;
  const bottleneck_queue = bottleneckData?.bottleneck_queue || 12.4;
  const estimated_throughput_loss_percent = bottleneckData?.estimated_throughput_loss_percent || 15.8;
  const constraining_factors = bottleneckData?.constraining_factors || [];
  const buffer_imbalances = bottleneckData?.buffer_imbalances || [];

  return (
    <div className="space-y-6">
      <SectionHeader
        badge="TOPOLOGY VIEW"
        code="// VIEW 08"
        title="Interactive Production Flow & Material Dynamics"
        subtitle="End-to-end discrete-event line topology tracking material progression from raw coils to verified finished goods."
      >
        <button
          onClick={() => onNavigate('whatif')}
          className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 transition btn-tactile shadow-md shadow-cyan-500/20"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Simulate Flow Interventions</span>
        </button>
      </SectionHeader>

      {/* Critical Bottleneck Alert Ribbon */}
      <div className="hud-panel rounded-xl p-5 border-2 border-rose-500/60 bg-rose-950/20 relative overflow-hidden shadow-xl shadow-rose-950/40 glow-rose">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-300">
                CRITICAL PACING CONSTRAINT DETECTED
              </span>
            </div>
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              {primary_bottleneck} — Governing Facility Output
            </h2>
            <p className="text-xs text-rose-200/90 max-w-3xl leading-relaxed font-sans">
              Cell 1 operates at <strong>{(bottleneck_utilization * 100).toFixed(1)}% utilization</strong> with 
              upstream buffer WIP averaging <strong>{Number(bottleneck_queue || 0).toFixed(1)} parts</strong> (surging to 1,828 parts). 
              Induces an estimated <strong>-{estimated_throughput_loss_percent}% plant throughput drag</strong>.
            </p>
          </div>

          <button
            onClick={() => onNavigate('whatif')}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition shrink-0"
          >
            <span>Relieve Cell 1 (-15%)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Hero Animated Flow Topology */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Flow Conduits (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="hud-panel rounded-xl border border-white/10 p-5 bg-slate-950/80 relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5 font-mono text-xs">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white uppercase tracking-wider">
                  Discrete-Event Material Conduits
                </span>
              </div>
              <span className="text-slate-500 text-[10px]">Click any node to inspect telemetry</span>
            </div>

            {/* Sequential Flow Nodes */}
            <div className="space-y-3">
              {nodes.map((node, idx) => {
                const isSelected = selectedStation?.id === node.id;
                const isBottleneck = node.is_bottleneck;

                return (
                  <div key={node.id} className="relative">
                    {/* Inter-station animated conduit arrow */}
                    {idx > 0 && (
                      <div className="h-6 flex items-center justify-center relative">
                        <svg className="h-full w-24 overflow-visible">
                          <line
                            x1="48" y1="0" x2="48" y2="24"
                            stroke={isBottleneck ? '#F43F5E' : '#06B6D4'}
                            strokeWidth="2"
                            className={isBottleneck ? 'animate-flow-dash-fast' : 'animate-flow-dash'}
                          />
                        </svg>
                        <span className="absolute text-[9px] font-mono text-slate-500 bg-slate-950 px-1 border border-white/5 rounded">
                          Transit
                        </span>
                      </div>
                    )}

                    {/* Workstation Card */}
                    <div
                      onClick={() => setSelectedStation(node)}
                      className={`hud-panel rounded-xl p-4 border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900/90 border-cyan-500/70 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-500/30'
                          : isBottleneck
                          ? 'bg-rose-950/20 border-rose-500/60 hover:bg-rose-950/30 glow-rose'
                          : 'bg-slate-950/70 border-white/5 hover:bg-slate-900/60 hover:border-white/15'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold border ${
                            isBottleneck 
                              ? 'bg-rose-950 text-rose-300 border-rose-700' 
                              : 'bg-slate-900 text-cyan-400 border-white/10'
                          }`}>
                            0{node.stage}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white font-mono flex items-center gap-2">
                              <span>{node.label}</span>
                              {isBottleneck && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-200 border border-rose-700 animate-pulse">
                                  PRIMARY CONSTRAINT
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                              Cycle: {node.cycle_time_sec}s • Upstream Buffer: {node.upstream_buffer} units
                            </div>
                          </div>
                        </div>

                        {/* Station Utilization & Queue */}
                        <div className="flex items-center gap-4 text-right font-mono">
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase">Utilization</div>
                            <div className={`text-base font-bold tabular-nums ${
                              isBottleneck ? 'text-rose-400' : node.utilization > 0.75 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {(node.utilization * 100).toFixed(1)}%
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] text-slate-500 uppercase">Queue WIP</div>
                            <div className="text-base font-bold text-white tabular-nums">
                              {node.queue_length}
                            </div>
                          </div>

                          <div className="w-24 text-center">
                            <StatusBadge status={node.status} size="xs" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Station Telemetry Drawer (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <TelemetryPanel
            title="Workstation Detail Inspector"
            subtitle="Selected node dynamic buffer analysis"
            badge={<StatusBadge status={selectedStation?.status || 'OPTIMAL'} size="xs" />}
          >
            {selectedStation ? (
              <div className="space-y-4 font-mono text-xs">
                {/* Station Gauge & Identity */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/80 border border-white/5">
                  <InteractiveRadialGauge
                    value={selectedStation.utilization * 100}
                    status={selectedStation.is_bottleneck ? 'bottleneck' : selectedStation.status === 'CONSTRAINED' ? 'constrained' : 'optimal'}
                    label="Utilization"
                    size={90}
                  />
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Station Node</div>
                    <div className="text-sm font-bold text-white mt-0.5">{selectedStation.label}</div>
                    <div className="text-[11px] text-cyan-400 mt-1">Stage {selectedStation.stage} of 5</div>
                  </div>
                </div>

                {/* Telemetry Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-white/5">
                    <div className="text-[10px] text-slate-500">Nominal Cycle Time:</div>
                    <div className="text-sm font-bold text-white mt-0.5">{selectedStation.cycle_time_sec}s</div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-white/5">
                    <div className="text-[10px] text-slate-500">Upstream Buffer WIP:</div>
                    <div className="text-sm font-bold text-amber-400 mt-0.5">{selectedStation.upstream_buffer}</div>
                  </div>
                </div>

                {/* Behavioral Assessment */}
                <div className="p-3.5 rounded-lg bg-slate-950/80 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">
                    Flow Dynamics:
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {selectedStation.is_bottleneck
                      ? 'Upstream buffer continuously accumulates material due to cycle time pacing constraints. Downstream stations experience starvation during demand spikes.'
                      : selectedStation.status === 'CONSTRAINED'
                      ? 'Operating near upper operational limits. Buffers may swell during shift changes and batch switchovers.'
                      : 'Ample surge capacity headroom. Material transfers without downstream starvation risk.'}
                  </p>
                </div>

                {/* Action CTA */}
                <button
                  onClick={() => onNavigate('whatif')}
                  className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-2 transition btn-tactile shadow-md shadow-cyan-500/20"
                >
                  <Sliders className="w-4 h-4 text-slate-950" />
                  <span>Simulate {selectedStation.label} Intervention</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">Select a workstation to view telemetry.</p>
            )}
          </TelemetryPanel>

          {/* Buffer Imbalances Summary */}
          <TelemetryPanel
            title="WIP Buffer Severity Racks"
            subtitle="Warehouse queue buffers across manufacturing line"
          >
            <div className="space-y-2 font-mono text-xs">
              {buffer_imbalances?.map((buf, i) => (
                <div key={i} className="p-2.5 rounded bg-slate-950/80 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white text-[11px]">{buf.buffer}</div>
                    <div className="text-[10px] text-slate-500">Peak WIP: {buf.peak_wip} units</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-cyan-300">{buf.average_wip} avg</div>
                    <span className={`text-[9px] font-bold ${
                      buf.severity === 'CRITICAL' ? 'text-rose-400' : buf.severity === 'ELEVATED' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {buf.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TelemetryPanel>
        </div>
      </div>
    </div>
  );
}
