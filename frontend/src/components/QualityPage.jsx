import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, AlertTriangle, CheckCircle2, HelpCircle, 
  Sliders, RefreshCw, Layers, ArrowRight, CameraOff, Info,
  DollarSign, Activity, Percent, Crosshair, Sparkles, Check
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend 
} from 'recharts';
import SectionHeader from './ui/SectionHeader';
import StatusBadge from './ui/StatusBadge';
import MetricCard from './ui/MetricCard';
import TelemetryPanel from './ui/TelemetryPanel';
import InteractiveRadialGauge from './ui/InteractiveRadialGauge';

export default function QualityPage({ onNavigateToTab }) {
  const [threshold, setThreshold] = useState(0.65);
  const [qualityData, setQualityData] = useState(null);
  const [inspectionResult, setInspectionResult] = useState(null);
  const [sampleIdx, setSampleIdx] = useState(1042);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState(false);

  // Fetch quality metrics & tradeoff curve
  const fetchQualityMetrics = (th) => {
    fetch(`/api/defects?threshold=${th}`)
      .then(res => res.json())
      .then(data => {
        setQualityData(data);
        setLoading(false);
      })
      .catch(err => console.error("Error loading quality metrics:", err));
  };

  // Run single-sample inspection
  const handleInspect = (idx) => {
    setInspecting(true);
    fetch('/api/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sample_index: idx,
        decision_threshold: threshold
      })
    })
      .then(res => res.json())
      .then(data => {
        setInspectionResult(data);
        setInspecting(false);
      })
      .catch(err => {
        console.error("Inspection error:", err);
        setInspecting(false);
      });
  };

  useEffect(() => {
    fetchQualityMetrics(threshold);
    handleInspect(sampleIdx);
  }, []);

  const handleThresholdChange = (newTh) => {
    setThreshold(newTh);
    fetchQualityMetrics(newTh);
    if (inspectionResult) {
      handleInspect(sampleIdx);
    }
  };

  const getDecisionBadge = (decision, condition) => {
    if (decision === 'ACCEPT') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> ACCEPT • {condition}
        </span>
      );
    } else if (decision === 'UNCERTAIN / RE-INSPECT') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> HOLD • {condition}
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-950 text-rose-400 border border-rose-800 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> REJECT • {condition}
        </span>
      );
    }
  };

  // Economic penalty estimates
  const far = qualityData?.false_accept_rate || 0.038;
  const frr = qualityData?.false_reject_rate || 0.052;
  const totalDailyParts = 54400;
  const missedDefects = Math.round(totalDailyParts * 0.009 * far * 10);
  const falseAlarms = Math.round(totalDailyParts * 0.991 * frr * 0.1);
  const costMissedDefect = missedDefects * 1250; // ₹1,250 warranty/recall penalty
  const costFalseAlarm = falseAlarms * 180; // ₹180 unnecessary re-inspection scrap

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        code="VIEW #09"
        title="Quality & Anomaly Decision Sandbox"
        subtitle="Dynamic threshold optimization balancing False Acceptance Rate (FAR) vs False Rejection Rate (FRR). Evaluates financial impact of escaping defects versus unnecessary re-inspection scrap."
        badge="STATISTICAL QUALITY CONTROL"
        badgeVariant="cyan"
      >
        <div className="flex items-center gap-2">
          <StatusBadge status="ACTIVE" variant="emerald" pulse />
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/10 text-xs font-mono text-cyan-300">
            Cutoff: <span className="font-bold text-white">{(threshold * 100).toFixed(0)}%</span>
          </div>
        </div>
      </SectionHeader>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Model Precision"
          value={`${qualityData?.precision ? (qualityData.precision * 100).toFixed(1) : '72.0'}%`}
          subValue="True Positive / Rejections"
          glowColor="cyan"
          icon={<CheckCircle2 className="w-4 h-4 text-cyan-400" />}
          cornerBadge="ACCURACY"
        />
        <MetricCard
          label="Model Recall"
          value={`${qualityData?.recall ? (qualityData.recall * 100).toFixed(1) : '81.0'}%`}
          subValue="Flaw Capture Rate"
          glowColor="emerald"
          icon={<Crosshair className="w-4 h-4 text-emerald-400" />}
          cornerBadge="SENSITIVITY"
        />
        <MetricCard
          label="False Accept Rate (FAR)"
          value={`${(far * 100).toFixed(1)}%`}
          subValue="Defects escaping to field"
          glowColor="rose"
          icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
          cornerBadge="RISK"
        />
        <MetricCard
          label="False Reject Rate (FRR)"
          value={`${(frr * 100).toFixed(1)}%`}
          subValue="Over-rejection scrap penalty"
          glowColor="amber"
          icon={<Percent className="w-4 h-4 text-amber-400" />}
          cornerBadge="SCRAP"
        />
      </div>

      {/* Main Grid: Sample Inspection + Threshold Optimizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (7 cols): Sample Inspector */}
        <div className="lg:col-span-7 hud-panel rounded-xl border border-white/10 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-cyan-400" />
                Process Observation Inspector
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Inspect a real production observation from Rockwell Arena Model 3
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <input
                type="number"
                min="0"
                max="59999"
                value={sampleIdx}
                onChange={(e) => setSampleIdx(parseInt(e.target.value) || 0)}
                className="w-24 px-2.5 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => handleInspect(sampleIdx)}
                disabled={inspecting}
                className="px-3 py-1.5 font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition flex items-center gap-1.5 shadow-sm"
              >
                {inspecting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Inspect'}
              </button>
              <button
                onClick={() => {
                  const rand = Math.floor(Math.random() * 50000);
                  setSampleIdx(rand);
                  handleInspect(rand);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 transition text-xs"
              >
                Random
              </button>
            </div>
          </div>

          {/* Inspection Decision Readout */}
          {inspectionResult && (
            <div className="space-y-4 font-mono">
              <div className="flex flex-wrap items-center justify-between p-4 bg-slate-950/80 rounded-xl border border-white/5 gap-4">
                <div>
                  <div className="text-[11px] text-slate-400">Sample ID: #{inspectionResult.sample_id}</div>
                  <div className="text-lg font-bold text-white mt-1">
                    {getDecisionBadge(inspectionResult.decision, inspectionResult.condition_classification)}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Anomaly Score</div>
                    <div className="text-xl font-bold text-cyan-400 tabular-nums">
                      {(inspectionResult.anomaly_score * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Model Conf</div>
                    <div className="text-xl font-bold text-emerald-400 tabular-nums">
                      {(inspectionResult.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Contributing Deviation Factors */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Process Factor Attributions & Deviations:
                </h4>
                {inspectionResult.contributing_factors?.length > 0 ? (
                  <div className="space-y-2">
                    {inspectionResult.contributing_factors.map((factor, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-lg border border-white/5 text-xs">
                        <div>
                          <span className="font-semibold text-white font-sans">{factor.display_name}</span>
                          <span className="text-slate-500 ml-2 text-[11px]">
                            (Actual: {factor.actual_value} vs Mean: {factor.normal_mean})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${factor.deviation_sigmas > 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                            {factor.deviation_sigmas > 0 ? `+${factor.deviation_sigmas}σ` : `${factor.deviation_sigmas}σ`}
                          </span>
                          <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded border ${
                            factor.impact === 'HIGH' ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}>
                            {factor.impact}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-xs text-slate-400 bg-slate-950/60 rounded-lg border border-white/5 font-sans">
                    No abnormal feature deviations observed. All process variables operate within ±1.2σ nominal limits.
                  </div>
                )}
              </div>

              {/* System Assessment */}
              <div className="p-3.5 bg-cyan-950/20 border border-cyan-800/40 rounded-xl text-xs text-cyan-200 font-sans">
                <strong className="font-mono text-cyan-400">System Assessment:</strong> {inspectionResult.explanation}
              </div>
            </div>
          )}
        </div>

        {/* Right Col (5 cols): Threshold Tuning & Confusion Matrix */}
        <div className="lg:col-span-5 hud-panel rounded-xl border border-white/10 p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-4 w-4 text-cyan-400" />
                Threshold Tuning Sandbox
              </h3>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                {(threshold * 100).toFixed(0)}% Cutoff
              </span>
            </div>

            {/* Slider */}
            <div className="space-y-1.5">
              <input
                type="range"
                min="0.40"
                max="0.85"
                step="0.01"
                value={threshold}
                onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-950 rounded cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0.40 (High Strictness)</span>
                <span>0.85 (High Yield)</span>
              </div>
            </div>
          </div>

          {/* 2x2 Confusion Matrix Display */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
              2x2 Confusion Matrix Telemetry
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950/80 p-3 rounded-lg border border-emerald-500/20 text-center">
                <div className="text-[10px] text-slate-400">True Positives (Defects Caught)</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">
                  {qualityData?.recall ? (qualityData.recall * 100).toFixed(1) : '81.0'}%
                </div>
                <div className="text-[9px] text-slate-500">Confirmed Flaws</div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-amber-500/20 text-center">
                <div className="text-[10px] text-slate-400">False Rejection Rate (FRR)</div>
                <div className="text-lg font-bold text-amber-400 mt-0.5">
                  {(frr * 100).toFixed(1)}%
                </div>
                <div className="text-[9px] text-slate-500">False Alarms (Scrap)</div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-rose-500/20 text-center">
                <div className="text-[10px] text-slate-400">False Acceptance Rate (FAR)</div>
                <div className="text-lg font-bold text-rose-400 mt-0.5">
                  {(far * 100).toFixed(1)}%
                </div>
                <div className="text-[9px] text-slate-500">Escaping Defects</div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-cyan-500/20 text-center">
                <div className="text-[10px] text-slate-400">Precision Rate</div>
                <div className="text-lg font-bold text-cyan-400 mt-0.5">
                  {qualityData?.precision ? (qualityData.precision * 100).toFixed(1) : '72.0'}%
                </div>
                <div className="text-[9px] text-slate-500">Rejection Accuracy</div>
              </div>
            </div>
          </div>

          {/* Economic Cost Balance */}
          <div className="bg-slate-950/90 p-3.5 rounded-lg border border-white/5 space-y-2 font-mono text-xs">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              Threshold Economic Trade-off
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Escaping Defect Cost (FAR):</span>
                <span className="text-rose-400 font-bold">₹{costMissedDefect.toLocaleString()}/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">False Alarm Scrap Cost (FRR):</span>
                <span className="text-amber-400 font-bold">₹{costFalseAlarm.toLocaleString()}/day</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-white/5 font-bold">
                <span className="text-slate-300">Total Quality Penalty:</span>
                <span className="text-cyan-300">₹{(costMissedDefect + costFalseAlarm).toLocaleString()}/day</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tradeoff Curve (Recharts) */}
      <div className="hud-panel rounded-xl border border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Empirical FAR vs FRR Sensitivity Tradeoff Curve
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
              Tradeoff evaluated across decision thresholds on 5,000 Model 3 production iterations
            </p>
          </div>
          <span className="text-[10px] font-mono text-cyan-400">
            Optimal Operating Point: ~0.65
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={qualityData?.tradeoff_curve || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="threshold" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', fontSize: '11px', borderRadius: '8px' }} 
              />
              <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
              <Line type="monotone" dataKey="false_accept_rate" name="False Accept Rate (FAR)" stroke="#f43f5e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="false_reject_rate" name="False Reject Rate (FRR)" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="f1_score" name="F1 Score" stroke="#06b6d4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
