import React from 'react';

export default function StatusBadge({ status = 'OPERATIONAL', size = 'sm', pulse = true, label = null }) {
  const norm = (status || '').toUpperCase();

  let colorConfig = {
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    glow: 'shadow-emerald-500/20'
  };

  if (norm.includes('DEFECT') || norm.includes('BOTTLENECK') || norm.includes('CRITICAL') || norm.includes('REJECT') || norm.includes('FAIL')) {
    colorConfig = {
      dot: 'bg-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      text: 'text-rose-300',
      glow: 'shadow-rose-500/20'
    };
  } else if (norm.includes('SCRUTINY') || norm.includes('CONSTRAINED') || norm.includes('WARN') || norm.includes('HOLD') || norm.includes('ELEVATED')) {
    colorConfig = {
      dot: 'bg-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-300',
      glow: 'shadow-amber-500/20'
    };
  } else if (norm.includes('NOVEL') || norm.includes('SURROGATE') || norm.includes('UNKNOWN')) {
    colorConfig = {
      dot: 'bg-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/30',
      text: 'text-indigo-300',
      glow: 'shadow-indigo-500/20'
    };
  } else if (norm.includes('MONITOR') || norm.includes('LIVE') || norm.includes('INSPECT') || norm.includes('READY')) {
    colorConfig = {
      dot: 'bg-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/30',
      text: 'text-sky-300',
      glow: 'shadow-sky-500/20'
    };
  }

  const isSmall = size === 'xs' || size === 'sm';

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-full border tracking-wide uppercase shadow-sm ${colorConfig.bg} ${colorConfig.border} ${colorConfig.text} ${colorConfig.glow} ${
      isSmall ? 'px-2.5 py-0.5 text-[10px]' : 'px-3.5 py-1 text-xs'
    }`}>
      <span className="relative flex h-2 w-2 shrink-0">
        {pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colorConfig.dot}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${colorConfig.dot}`} />
      </span>
      <span>{label || status}</span>
    </span>
  );
}
