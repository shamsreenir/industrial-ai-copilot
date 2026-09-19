import React from 'react';

export default function MetricCard({
  title,
  label,
  value,
  unit,
  sublabel,
  subvalue,
  subValue,
  icon: Icon,
  variant = 'default',
  glowColor = null,
  cornerBadge = null,
  trend = null,
  onClick = null
}) {
  const displayTitle = title || label || 'METRIC';
  const displaySubvalue = subvalue || subValue || trend || '';
  const displaySublabel = sublabel || '';
  const effectiveVariant = (glowColor || variant || 'default').toLowerCase();

  let accentColor = 'text-sky-400';
  let badgeColor = 'bg-sky-500/10 text-sky-300 border-sky-500/20';
  let dotColor = 'bg-sky-400';

  if (effectiveVariant === 'bottleneck' || effectiveVariant === 'rose' || effectiveVariant === 'red') {
    accentColor = 'text-rose-400';
    badgeColor = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
    dotColor = 'bg-rose-400';
  } else if (effectiveVariant === 'success' || effectiveVariant === 'emerald' || effectiveVariant === 'green') {
    accentColor = 'text-emerald-400';
    badgeColor = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    dotColor = 'bg-emerald-400';
  } else if (effectiveVariant === 'warning' || effectiveVariant === 'amber' || effectiveVariant === 'yellow') {
    accentColor = 'text-amber-400';
    badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    dotColor = 'bg-amber-400';
  } else if (effectiveVariant === 'purple' || effectiveVariant === 'indigo') {
    accentColor = 'text-indigo-400';
    badgeColor = 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
    dotColor = 'bg-indigo-400';
  }

  const renderIcon = () => {
    if (!Icon) return null;
    if (React.isValidElement(Icon)) return Icon;
    if (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null)) {
      const Comp = Icon;
      return <Comp className="h-4 w-4" />;
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={`framer-surface rounded-2xl p-4.5 relative overflow-hidden transition-all duration-300 group ${
        onClick ? 'cursor-pointer hover:-translate-y-1' : ''
      }`}
    >
      {/* Specular Top Edge Glow */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:via-white/40 transition-all duration-300" />

      {/* Header with technical label */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium truncate">
            {displayTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {cornerBadge && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${badgeColor}`}>
              {cornerBadge}
            </span>
          )}
          {Icon && (
            <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-400 group-hover:text-white group-hover:border-white/10 transition-colors">
              {renderIcon()}
            </div>
          )}
        </div>
      </div>

      {/* Main Metric Value: Large expressive typography */}
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono tabular-nums">
          {value !== undefined && value !== null ? value : '--'}
        </span>
        {unit && <span className="text-xs font-mono text-slate-400">{unit}</span>}
      </div>

      {/* Sublabel / Context note */}
      {(displaySublabel || displaySubvalue) && (
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06] text-xs font-mono">
          <span className="text-slate-500 truncate text-[11px] font-sans">{displaySublabel}</span>
          <span className={`font-semibold text-[11px] ${accentColor}`}>
            {displaySubvalue}
          </span>
        </div>
      )}
    </div>
  );
}
