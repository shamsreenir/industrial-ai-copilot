import React from 'react';

export default function SectionHeader({
  badge = 'INSPECTION TELEMETRY',
  code = 'VIEW 01',
  title,
  subtitle,
  children
}) {
  return (
    <div className="relative mb-8 pt-2">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          {/* Eyebrow Label with Framer glowing pill */}
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium tracking-wide bg-sky-500/10 border border-sky-500/30 text-sky-300 shadow-sm shadow-sky-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              {badge}
            </span>
            <span className="text-slate-600 text-xs font-mono">•</span>
            <span className="text-slate-500 text-xs font-mono">{code}</span>
          </div>

          {/* Cinematic Expressive Heading */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            {title}
          </h1>

          {/* Subtitle with high contrast typography */}
          {subtitle && (
            <p className="text-sm sm:text-base text-slate-400 font-sans leading-relaxed pt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Controls / Right Toolbar */}
        {children && (
          <div className="flex items-center gap-3 shrink-0 self-start md:self-end pb-1">
            {children}
          </div>
        )}
      </div>

      {/* Subtle bottom separator gradient */}
      <div className="h-[1px] w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent mt-6" />
    </div>
  );
}
