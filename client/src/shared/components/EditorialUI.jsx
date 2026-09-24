/**
 * Editorial Design System — Reusable Components
 * 
 * SkillSphere's refined layout primitives: ledger rows, dotted leaders,
 * section mastheads, monospace metadata, and slide-in panels.
 * Replaces card-heavy layouts with typography-driven hierarchy.
 */

import { motion } from 'framer-motion';

// ─── Section Masthead ─────────────────────────────────────────────────────────
// Full-width ruled section header with optional numbering.
export function SectionMasthead({ number, title, meta, className = '' }) {
  return (
    <div className={`border-t-2 border-secondary pt-3 pb-5 ${className}`}>
      <div className="flex justify-between items-baseline">
        <span className="font-mono text-[10px] tracking-evidence uppercase text-outline select-none">
          {number && `${number} · `}{title}
        </span>
        {meta && (
          <span className="font-mono text-[10px] tracking-evidence uppercase text-outline/60 select-none">
            {meta}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Ledger Row ───────────────────────────────────────────────────────────────
// Flat, full-width row with hairline border-b. Replaces cards.
export function LedgerRow({ children, onClick, className = '', highlight = false }) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center py-3 px-2 border-b border-outline-var/40
        transition-all duration-150 group
        hover:bg-gradient-to-r hover:from-primary/[0.03] hover:via-primary/[0.06] hover:to-primary/[0.03]
        ${highlight ? 'bg-primary/[0.04]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ─── Dotted Leader ────────────────────────────────────────────────────────────
// Connects a label to its value via a dotted line, like a financial statement.
export function DottedLeader({ label, value, score, valueClassName = '', className = '' }) {
  return (
    <div className={`flex items-center py-2.5 group ${className}`}>
      <span className="font-outfit text-sm text-text-primary font-medium whitespace-nowrap">
        {label}
      </span>
      <span className="flex-1 mx-3 border-b border-dotted border-outline-var/50 min-w-[2rem] 
                        group-hover:border-primary/40 transition-colors" />
      {value && (
        <span className={`font-mono text-xs tracking-evidence uppercase whitespace-nowrap ${valueClassName}`}>
          {value}
        </span>
      )}
      {score && (
        <span className="ml-3 font-mono text-xs text-outline tabular-nums whitespace-nowrap">
          {score}
        </span>
      )}
    </div>
  );
}

// ─── Status Seal ─────────────────────────────────────────────────────────────
// A bordered official-looking block for scores and verdicts.
export function StatusSeal({ verdict, score, detail, hash, className = '' }) {
  return (
    <div className={`
      border border-outline-var p-4 font-mono text-xs tracking-evidence uppercase
      select-none max-w-xs
      ${className}
    `}>
      {verdict && (
        <div className="text-sm font-semibold text-text-primary tracking-tight normal-case mb-1">
          {verdict}
        </div>
      )}
      {score && (
        <div className="text-text-primary mb-1">{score}</div>
      )}
      {detail && (
        <div className="text-outline/80 mb-1 normal-case">{detail}</div>
      )}
      {hash && (
        <div className="text-outline/50 mt-2 pt-2 border-t border-outline-var/30 text-[10px]">
          {hash}
        </div>
      )}
    </div>
  );
}

// ─── Kicker Tag ───────────────────────────────────────────────────────────────
// Monospace uppercase metadata label for context.
export function KickerTag({ children, className = '' }) {
  return (
    <span className={`
      font-mono text-[10px] tracking-evidence uppercase text-outline/70 select-none
      ${className}
    `}>
      {children}
    </span>
  );
}

// ─── Inline Metric ───────────────────────────────────────────────────────────
// Definition-list style metric with dotted leader. Replaces metric cards.
export function InlineMetric({ label, value, className = '' }) {
  return (
    <div className={`flex items-baseline py-1.5 ${className}`}>
      <span className="font-mono text-[10px] tracking-evidence uppercase text-outline/70 whitespace-nowrap">
        {label}
      </span>
      <span className="flex-1 mx-2 border-b border-dotted border-outline-var/30 min-w-[1rem]" />
      <span className="font-syne text-lg font-bold text-text-primary tabular-nums">
        {value}
      </span>
    </div>
  );
}

// ─── Slide Panel ─────────────────────────────────────────────────────────────
// Right-side slide-in panel replacing modal dialogs for detail views.
export function SlidePanel({ isOpen, onClose, title, children, className = '' }) {
  if (!isOpen) return null;
  
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-secondary/20 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className={`
          fixed top-0 right-0 h-full w-full max-w-lg bg-bg-base border-l border-outline-var/40
          z-50 overflow-y-auto shadow-2xl
          ${className}
        `}
      >
        <div className="border-b border-outline-var/40 px-6 py-4 flex items-center justify-between sticky top-0 bg-bg-base/95 backdrop-blur-sm z-10">
          <span className="font-mono text-[10px] tracking-evidence uppercase text-outline">
            {title}
          </span>
          <button
            onClick={onClose}
            className="font-mono text-xs text-outline hover:text-text-primary transition-colors"
          >
            Close ×
          </button>
        </div>
        <div className="px-6 py-6">
          {children}
        </div>
      </motion.div>
    </>
  );
}

// ─── Mono Timestamp ──────────────────────────────────────────────────────────
// Monospace timestamp for the evidence voice.
export function MonoTimestamp({ date, className = '' }) {
  const d = date instanceof Date ? date : new Date(date);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = d.toISOString().split('T')[0];
  return (
    <span className={`font-mono text-[11px] text-outline/60 tabular-nums ${className}`}>
      {time} · {dateStr}
    </span>
  );
}
