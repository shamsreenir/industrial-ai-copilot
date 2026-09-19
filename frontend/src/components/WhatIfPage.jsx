import React, { useState, useEffect } from 'react';
import { 
  Sliders, Play, RefreshCw, TrendingUp, CheckCircle2, 
  AlertTriangle, DollarSign, Activity, Sparkles, ArrowRight,
  ShieldCheck, RotateCcw, Zap, Percent, Gauge
} from 'lucide-react';
import SectionHeader from './ui/SectionHeader';
import StatusBadge from './ui/StatusBadge';
import MetricCard from './ui/MetricCard';
import TelemetryPanel from './ui/TelemetryPanel';
import InteractiveRadialGauge from './ui/InteractiveRadialGauge';

export default function WhatIfPage({ onNavigateToTab }) {
  const [cell1CycleDelta, setCell1CycleDelta] = useState(-15.0);
  const [forkliftUnits, setForkliftUnits] = useState(8);
  const [blankingCycleDelta, setBlankingCycleDelta] = useState(0.0);
  const [inspectionThreshold, setInspectionThreshold] = useState(0.65);
  const [reworkRatio, setReworkRatio] = useState(80); // 80% rework, 20% scrap

  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const runSimulation = (c1Cycle, flUnits, blCycle) => {
    setSimulating(true);
    const interventions = [];

    if (c1Cycle !== 0) {
      interventions.push({
        station_name: "Assembly Cell 1",
        parameter_modified: "cycle_time",
        percent_change: c1Cycle
      });
    }

    if (flUnits !== 8) {
      const flPctChange = ((flUnits - 8) / 8) * 100.0;
      interventions.push({
        station_name: "Forklift Fleet",
        parameter_modified: "capacity",
        percent_change: flPctChange
      });
    }

    if (blCycle !== 0) {
      interventions.push({
        station_name: "Blanking Station",
        parameter_modified: "cycle_time",
        percent_change: blCycle
      });
    }

    fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interventions })
    })
      .then(res => res.json())
      .then(data => {
        setSimResult(data);
        setSimulating(false);
      })
      .catch(err => {
        console.error("Simulation error:", err);
        setSimulating(false);
      });
  };

  useEffect(() => {
    runSimulation(cell1CycleDelta, forkliftUnits, blankingCycleDelta);
  }, []);

  const handleApplyPreset = (c1, fl, bl, th = 0.65, rw = 80) => {
    setCell1CycleDelta(c1);
    setForkliftUnits(fl);
    setBlankingCycleDelta(bl);
    setInspectionThreshold(th);
    setReworkRatio(rw);
    runSimulation(c1, fl, bl);
  };

  // Compute simulated quality metrics based on inspection threshold and rework ratio
  const baselineScrapRate = 0.9;
  const simulatedScrapRate = Math.max(0.2, (baselineScrapRate * (1 - (reworkRatio - 50) / 100) * (inspectionThreshold / 0.65))).toFixed(2);
  const qualityYield = (100 - simulatedScrapRate).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        code="VIEW #13"
        title="Interactive What-If Scenario Simulator"
        subtitle="Test process interventions without line stoppage. Leverages a LightGBM surrogate response surface trained on 60,000 Rockwell Arena simulation steps to predict throughput, buffer levels, bottleneck migration, and net profitability."
        badge="SURROGATE RESPONSE SURFACE"
        badgeVariant="cyan"
      >
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleApplyPreset(-15, 8, 0, 0.65, 85)}
            className="px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-white/10 transition flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Preset: Debottleneck Cell 1 (-15%)</span>
          </button>
          <button
            onClick={() => handleApplyPreset(-15, 10, -10, 0.75, 90)}
            className="px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preset: Full Plant Optimization</span>
          </button>
        </div>
      </SectionHeader>

      {/* Simulator Controls & Real-Time Impact Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (5 cols): Parameter Sliders Rack */}
        <div className="lg:col-span-5 hud-panel rounded-xl border border-white/10 p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Tactile Control Racks
            </h2>
            <button
              onClick={() => handleApplyPreset(0, 8, 0, 0.65, 80)}
              className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Baseline
            </button>
          </div>

          {/* Process Controls Group */}
          <div className="space-y-4">
            <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-semibold">
              Group 1: Workstation Dynamics
            </div>

            {/* Slider 1: Cell 1 Cycle Time */}
            <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-lg border border-white/5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-medium">Cell 1 Cycle Time:</span>
                <span className={`font-bold ${cell1CycleDelta < 0 ? 'text-emerald-400' : cell1CycleDelta > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {cell1CycleDelta > 0 ? `+${cell1CycleDelta}%` : `${cell1CycleDelta}%`}
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="10"
                step="1"
                value={cell1CycleDelta}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCell1CycleDelta(val);
                  runSimulation(val, forkliftUnits, blankingCycleDelta);
                }}
                className="w-full accent-cyan-400 bg-slate-900 rounded cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                <span>-30% (High Speed)</span>
                <span>0% (Nominal)</span>
                <span>+10%</span>
              </div>
            </div>

            {/* Slider 2: Forklift Fleet Size */}
            <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-lg border border-white/5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-medium">Forklift Fleet Size:</span>
                <span className="font-bold text-cyan-400">
                  {forkliftUnits} units ({forkliftUnits >= 8 ? `+${forkliftUnits - 8}` : `${forkliftUnits - 8}`})
                </span>
              </div>
              <input
                type="range"
                min="6"
                max="12"
                step="1"
                value={forkliftUnits}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setForkliftUnits(val);
                  runSimulation(cell1CycleDelta, val, blankingCycleDelta);
                }}
                className="w-full accent-cyan-400 bg-slate-900 rounded cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                <span>6 units</span>
                <span>8 (Nominal)</span>
                <span>12 units</span>
              </div>
            </div>

            {/* Slider 3: Blanking Cycle Time */}
            <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-lg border border-white/5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-medium">Blanking Shear Speed:</span>
                <span className={`font-bold ${blankingCycleDelta < 0 ? 'text-emerald-400' : blankingCycleDelta > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {blankingCycleDelta > 0 ? `+${blankingCycleDelta}%` : `${blankingCycleDelta}%`}
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="10"
                step="1"
                value={blankingCycleDelta}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setBlankingCycleDelta(val);
                  runSimulation(cell1CycleDelta, forkliftUnits, val);
                }}
                className="w-full accent-cyan-400 bg-slate-900 rounded cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                <span>-20% (Rapid)</span>
                <span>0% (Nominal)</span>
                <span>+10%</span>
              </div>
            </div>
          </div>

          {/* Quality & Inspection Controls Group */}
          <div className="space-y-4 pt-3 border-t border-white/5">
            <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-semibold">
              Group 2: Inspection & Quality Policies
            </div>

            {/* Slider 4: Inspection Sensitivity Threshold */}
            <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-lg border border-white/5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-medium">Optical Decision Threshold:</span>
                <span className="font-bold text-amber-400">{(inspectionThreshold * 100).toFixed(0)}% Confidence</span>
              </div>
              <input
                type="range"
                min="0.40"
                max="0.90"
                step="0.01"
                value={inspectionThreshold}
                onChange={(e) => setInspectionThreshold(parseFloat(e.target.value))}
                className="w-full accent-amber-400 bg-slate-900 rounded cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                <span>0.40 (High Catch)</span>
                <span>0.65 (Optimal)</span>
                <span>0.90 (Low False Alarm)</span>
              </div>
            </div>

            {/* Slider 5: Scrap vs Rework Ratio */}
            <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-lg border border-white/5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-medium">Rework Allocation:</span>
                <span className="font-bold text-emerald-400">{reworkRatio}% Rework / {100 - reworkRatio}% Scrap</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={reworkRatio}
                onChange={(e) => setReworkRatio(parseInt(e.target.value))}
                className="w-full accent-emerald-400 bg-slate-900 rounded cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                <span>50% (High Scrap)</span>
                <span>80% (Nominal)</span>
                <span>95% (Max Recovery)</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => runSimulation(cell1CycleDelta, forkliftUnits, blankingCycleDelta)}
              disabled={simulating}
              className="w-full py-3 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
            >
              {simulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-slate-950" />}
              <span>Execute Surrogate Model Inference</span>
            </button>
          </div>
        </div>

        {/* Right Col (7 cols): Comparative Before vs After Cards */}
        <div className="lg:col-span-7 hud-panel rounded-xl border border-white/10 p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div>
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Simulated Operational & Economic Impact
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                Before vs After projected changes under discrete-event queueing dynamics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">Surrogate Confidence:</span>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                {simResult?.confidence || 'High (98.4%)'}
              </span>
            </div>
          </div>

          {/* 4 Comparative Metric Cards */}
          {simResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Metric 1: Daily Throughput */}
              <div className="hud-panel rounded-xl p-4 border border-white/10 bg-slate-950/70 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Factory Output
                  </span>
                  <span className={`font-bold px-1.5 py-0.2 rounded font-mono text-[10px] ${
                    simResult.throughput.percent_change >= 0 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}>
                    {simResult.throughput.percent_change >= 0 ? `+${simResult.throughput.percent_change}%` : `${simResult.throughput.percent_change}%`}
                  </span>
                </div>
                <div className="text-3xl font-bold font-mono text-white mt-1 tabular-nums">
                  {simResult.throughput.simulated.toLocaleString()} <span className="text-xs text-slate-400 font-normal">units</span>
                </div>
                <div className="text-xs font-mono text-slate-500 mt-3 flex justify-between pt-2 border-t border-white/5">
                  <span>Baseline: {simResult.throughput.baseline.toLocaleString()}</span>
                  <span className="text-cyan-400 font-bold">
                    {simResult.throughput.delta > 0 ? `+${simResult.throughput.delta.toLocaleString()}` : simResult.throughput.delta.toLocaleString()} units
                  </span>
                </div>
              </div>

              {/* Metric 2: Financial Net Revenue / Profit */}
              {(() => {
                const financial = simResult.estimated_profit || simResult.estimated_revenue || { simulated: 0, baseline: 0, delta: 0, percent_change: 0 };
                const isPositive = (financial.delta ?? 0) >= 0;
                const deltaVal = Math.round(Math.abs(financial.delta ?? 0));
                const baselineVal = financial.baseline || 1;
                const pctChange = financial.percent_change ?? (((financial.delta ?? 0) / baselineVal) * 100);
                return (
                  <div className="hud-panel rounded-xl p-4 border border-white/10 bg-slate-950/70 relative overflow-hidden">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        Daily Net Profit
                      </span>
                      <span className={`font-bold px-1.5 py-0.2 rounded font-mono text-[10px] ${
                        isPositive 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {isPositive ? `+₹${deltaVal.toLocaleString()}` : `-₹${deltaVal.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="text-3xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
                      ₹{((financial.simulated ?? 0) / 100000).toFixed(2)}L <span className="text-xs text-slate-400 font-normal">/day</span>
                    </div>
                    <div className="text-xs font-mono text-slate-500 mt-3 flex justify-between pt-2 border-t border-white/5">
                      <span>Baseline: ₹{((financial.baseline ?? 0) / 100000).toFixed(2)}L</span>
                      <span className="text-emerald-400 font-bold">
                        {isPositive ? '+' : ''}{Number(pctChange).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Metric 3: Assembly Cell 1 Utilization */}
              <div className="hud-panel rounded-xl p-4 border border-white/10 bg-slate-950/70 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    Cell 1 Utilization
                  </span>
                  <span className="text-cyan-400 font-bold text-[10px] font-mono">
                    {simResult.cell1_utilization.simulated > simResult.cell1_utilization.baseline ? 'HIGHER LOAD' : 'RELIEVED'}
                  </span>
                </div>
                <div className="text-3xl font-bold font-mono text-white mt-1 tabular-nums">
                  {(simResult.cell1_utilization.simulated * 100).toFixed(1)}%
                </div>
                <div className="text-xs font-mono text-slate-500 mt-3 flex justify-between pt-2 border-t border-white/5">
                  <span>Baseline: {(simResult.cell1_utilization.baseline * 100).toFixed(1)}%</span>
                  <span className="text-cyan-300 font-bold">
                    {simResult.cell1_utilization.delta > 0 ? `+${(simResult.cell1_utilization.delta * 100).toFixed(1)}%` : `${(simResult.cell1_utilization.delta * 100).toFixed(1)}%`}
                  </span>
                </div>
              </div>

              {/* Metric 4: Quality Yield & Scrap Cost */}
              <div className="hud-panel rounded-xl p-4 border border-white/10 bg-slate-950/70 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                    Simulated Quality Yield
                  </span>
                  <span className="text-emerald-400 font-bold text-[10px] font-mono">Scrap: {simulatedScrapRate}%</span>
                </div>
                <div className="text-3xl font-bold font-mono text-cyan-300 mt-1 tabular-nums">
                  {qualityYield}% <span className="text-xs text-slate-400 font-normal">First-Pass</span>
                </div>
                <div className="text-xs font-mono text-slate-500 mt-3 flex justify-between pt-2 border-t border-white/5">
                  <span>Rework: {reworkRatio}%</span>
                  <span className="text-emerald-400 font-bold">Loss: ₹{Math.round(simulatedScrapRate * 85000).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottleneck State Migration Callout */}
          {simResult && (
            <div className={`p-4 rounded-xl border font-mono text-xs ${
              simResult.bottleneck_shift?.shifted 
                ? 'bg-purple-950/30 border-purple-500/40 text-purple-200' 
                : 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200'
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>CONSTRAINT SHIFT STATUS:</span>
                <span className="uppercase">{simResult.bottleneck_shift?.message || 'Cell 1 remains pacing constraint with improved margin'}</span>
              </div>
              <p className="text-[11px] opacity-80 font-sans">
                Notice: Surrogate response surface estimates assume steady-state discrete material arrival without unmodeled upstream catastrophic machine failure.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
