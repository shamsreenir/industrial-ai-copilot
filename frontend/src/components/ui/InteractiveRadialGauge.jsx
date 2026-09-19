import React from 'react';

export default function InteractiveRadialGauge({
  value = 86.7,
  max = 100,
  size = 110,
  strokeWidth = 9,
  label = 'Utilization',
  status = 'bottleneck', // 'bottleneck', 'optimal', 'constrained'
  unit = '%'
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const strokeDashoffset = circumference - pct * circumference;

  let strokeColor = '#06B6D4'; // cyan
  let textColor = 'text-cyan-300';
  let glowColor = 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))';

  if (status === 'bottleneck' || value > 85) {
    strokeColor = '#F43F5E'; // rose
    textColor = 'text-rose-400';
    glowColor = 'drop-shadow(0 0 8px rgba(244, 63, 94, 0.7))';
  } else if (status === 'constrained' || value > 75) {
    strokeColor = '#F59E0B'; // amber
    textColor = 'text-amber-400';
    glowColor = 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))';
  } else if (status === 'optimal' || value < 60) {
    strokeColor = '#10B981'; // emerald
    textColor = 'text-emerald-400';
    glowColor = 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))';
  }

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.07)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Foreground Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: glowColor
          }}
        />
      </svg>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`text-base font-bold font-mono tracking-tight tabular-nums ${textColor}`}>
          {typeof value === 'number' ? value.toFixed(1) : value}{unit}
        </span>
        {label && (
          <span className="text-[9px] font-mono uppercase text-slate-500 tracking-wider">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
