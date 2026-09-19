import React from 'react';

export default function TelemetryPanel({
  title,
  subtitle,
  badge = null,
  actions = null,
  children,
  className = '',
  corner = false
}) {
  return (
    <div className={`framer-surface rounded-2xl p-5 relative overflow-hidden ${className}`}>
      {/* Top Header */}
      {(title || badge || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                {title}
              </h3>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Panel Body */}
      {children}
    </div>
  );
}
