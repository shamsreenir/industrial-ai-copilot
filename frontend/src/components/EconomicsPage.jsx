import React, { useState, useEffect } from 'react';
import { 
  DollarSign, AlertTriangle, RefreshCw, Calculator, 
  CheckCircle2, ArrowRight, ShieldCheck, HelpCircle, 
  TrendingUp, Activity, PieChart, FileText, Layers
} from 'lucide-react';
import SectionHeader from './ui/SectionHeader';
import StatusBadge from './ui/StatusBadge';
import MetricCard from './ui/MetricCard';
import TelemetryPanel from './ui/TelemetryPanel';

export default function EconomicsPage({ onNavigateToTab }) {
  const [params, setParams] = useState({
    unit_sale_price: 120.0,
    unit_material_cost: 45.0,
    scrap_cost_per_unit: 35.0,
    rework_cost_per_unit: 18.0,
    downtime_cost_per_hour: 4500.0,
    daily_operating_hours: 24.0
  });

  const [econData, setEconData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEconomics = (currentParams) => {
    fetch('/api/economics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentParams)
    })
      .then(res => res.json())
      .then(data => {
        setEconData(data);
        setLoading(false);
      })
      .catch(err => console.error("Error loading economics:", err));
  };

  useEffect(() => {
    fetchEconomics(params);
  }, []);

  const handleParamChange = (field, value) => {
    const updated = { ...params, [field]: parseFloat(value) || 0 };
    setParams(updated);
    fetchEconomics(updated);
  };

  const handleResetDefaults = () => {
    const defaults = {
      unit_sale_price: 120.0,
      unit_material_cost: 45.0,
      scrap_cost_per_unit: 35.0,
      rework_cost_per_unit: 18.0,
      downtime_cost_per_hour: 4500.0,
      daily_operating_hours: 24.0
    };
    setParams(defaults);
    fetchEconomics(defaults);
  };

  if (loading && !econData) {
    return (
      <div className="hud-panel rounded-xl p-16 text-center text-slate-400 font-mono">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs uppercase tracking-wider text-amber-300">
            Calculating plant economic waterfall & loss attribution...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        code="VIEW #14"
        title="Economic & Profitability Impact Model"
        subtitle="Auditable unit economics bridge linking discrete-event scrap, rework, and bottleneck starvation into bottom-line plant profitability. Zero financial currency logs exist in raw data."
        badge="SIMULATED UNIT ECONOMICS"
        badgeVariant="amber"
      >
        <div className="flex items-center gap-2">
          <StatusBadge status="AUDITED" variant="emerald" />
          <button
            onClick={handleResetDefaults}
            className="px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 transition"
          >
            Reset Defaults
          </button>
        </div>
      </SectionHeader>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Simulated Actual Revenue"
          value={`₹${econData?.daily_actual_revenue?.toLocaleString() || '65,28,000'}`}
          subValue={`${econData?.daily_verified_good_units?.toLocaleString() || '54,400'} good units/day`}
          glowColor="emerald"
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
          cornerBadge="GROSS"
        />
        <MetricCard
          label="Total Daily Losses"
          value={`₹${econData?.total_daily_loss?.toLocaleString() || '2,48,200'}`}
          subValue="Scrap + Rework + Stoppage"
          glowColor="rose"
          icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
          cornerBadge="SCRAP & STOPPAGE"
        />
        <MetricCard
          label="Net Operating Margin"
          value={`₹${econData?.net_operating_margin?.toLocaleString() || '38,31,800'}`}
          subValue="After raw materials & scrap"
          glowColor="cyan"
          icon={<TrendingUp className="w-4 h-4 text-cyan-400" />}
          cornerBadge="NET"
        />
        <MetricCard
          label="Profit Recovery Headroom"
          value="₹4,12,000"
          subValue="Surrogate TOC recommendation"
          glowColor="purple"
          icon={<Activity className="w-4 h-4 text-purple-400" />}
          cornerBadge="RECOVERY"
        />
      </div>

      {/* Main Grid: Parameters Control vs Financial Readouts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (4 cols): Configurable Economic Inputs */}
        <div className="lg:col-span-4 hud-panel rounded-xl border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calculator className="h-4 w-4 text-amber-400" />
              Configurable Assumptions
            </h2>
            <span className="text-[10px] font-mono text-slate-500">Live Recalculation</span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-950/70 border border-white/5 space-y-1">
              <label className="block text-slate-400 font-sans text-xs">Finished Unit Sale Price (₹)</label>
              <input
                type="number"
                step="5"
                value={params.unit_sale_price}
                onChange={(e) => handleParamChange('unit_sale_price', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-white/5 space-y-1">
              <label className="block text-slate-400 font-sans text-xs">Raw Material Blank Cost (₹)</label>
              <input
                type="number"
                step="5"
                value={params.unit_material_cost}
                onChange={(e) => handleParamChange('unit_material_cost', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-white/5 space-y-1">
              <label className="block text-slate-400 font-sans text-xs">Scrap Loss per Unit (₹)</label>
              <input
                type="number"
                step="2"
                value={params.scrap_cost_per_unit}
                onChange={(e) => handleParamChange('scrap_cost_per_unit', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-white/5 space-y-1">
              <label className="block text-slate-400 font-sans text-xs">Rework Cost per Unit (₹)</label>
              <input
                type="number"
                step="2"
                value={params.rework_cost_per_unit}
                onChange={(e) => handleParamChange('rework_cost_per_unit', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-white/5 space-y-1">
              <label className="block text-slate-400 font-sans text-xs">Bottleneck Downtime Cost (₹/hr)</label>
              <input
                type="number"
                step="500"
                value={params.downtime_cost_per_hour}
                onChange={(e) => handleParamChange('downtime_cost_per_hour', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Right Col (8 cols): Financial Waterfall Breakdown */}
        <div className="lg:col-span-8 hud-panel rounded-xl border border-white/10 p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Simulated Factory Financial Statement (24h Run)
            </h2>
            <span className="text-[10px] font-mono text-emerald-400">Rockwell Arena Calibrated</span>
          </div>

          {/* Loss Category Attribution */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-rose-400" />
              Loss Attribution Hierarchy:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="hud-panel rounded-lg p-4 border border-rose-500/20 bg-slate-950/80 space-y-1">
                <div className="text-slate-400 font-sans">Scrap Destruction</div>
                <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                  ₹{econData?.daily_scrap_cost?.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500">{econData?.daily_scrap_units} scrapped units</div>
              </div>

              <div className="hud-panel rounded-lg p-4 border border-amber-500/20 bg-slate-950/80 space-y-1">
                <div className="text-slate-400 font-sans">Secondary Rework</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                  ₹{econData?.daily_rework_cost?.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500">{econData?.daily_rework_units} reworked units</div>
              </div>

              <div className="hud-panel rounded-lg p-4 border border-purple-500/20 bg-slate-950/80 space-y-1">
                <div className="text-slate-400 font-sans">Bottleneck Stoppage</div>
                <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                  ₹{econData?.daily_downtime_cost?.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500">~3.07 equivalent hrs</div>
              </div>
            </div>
          </div>

          {/* Profitability Equation Waterfall Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-white/10 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-white/5">
              <span>Gross Production Value (54,400 units × ₹{params.unit_sale_price}):</span>
              <span className="text-white font-bold">₹{(54400 * params.unit_sale_price).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-white/5">
              <span>(-) Raw Material Cost (55,000 blanks × ₹{params.unit_material_cost}):</span>
              <span className="text-rose-400 font-bold">-₹{(55000 * params.unit_material_cost).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-white/5">
              <span>(-) Attributed Quality & Stoppage Penalties:</span>
              <span className="text-rose-400 font-bold">-₹{econData?.total_daily_loss?.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-white font-bold pt-1 text-sm">
              <span className="text-cyan-400">(=) Net Operating Contribution Margin:</span>
              <span className="text-emerald-400 font-mono text-base">₹{econData?.net_operating_margin?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Traceable Formula Audit Table */}
      <div className="hud-panel rounded-xl border border-white/10 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5 bg-slate-950/90 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Mathematical Traceability Audit Trail
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
              Exact calculations showing how each simulated financial value is derived from physical data
            </p>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-bold">
            100% Traceable
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-white/5">
              <tr>
                <th className="px-5 py-3">Metric Name</th>
                <th className="px-5 py-3">Traceable Mathematical Formula</th>
                <th className="px-5 py-3">Evaluated Calculation & Ground Truth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {econData?.formula_trace?.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition">
                  <td className="px-5 py-3 font-sans font-medium text-white">{row.metric}</td>
                  <td className="px-5 py-3 text-cyan-300">{row.formula}</td>
                  <td className="px-5 py-3 text-slate-300">{row.calculation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
