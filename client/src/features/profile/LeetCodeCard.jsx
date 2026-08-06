import { ExternalLink } from 'lucide-react';

/**
 * LeetCodeCard — Displays a user's LeetCode profile stats on their profile page.
 *
 * Props:
 *   leetcode  — object with { leetcodeUsername, leetcodeDSAScore, leetcodeDSALevel,
 *                leetcodeEasy, leetcodeMedium, leetcodeHard, leetcodeTotalPoints,
 *                leetcodeLanguages, leetcodeSyncedAt }
 *              OR null/undefined if not connected.
 *   isOwner   — boolean, true if viewing own profile.
 *   onConnect — callback for "Connect LeetCode" CTA (only shown on own profile).
 */
export default function LeetCodeCard({ leetcode, isOwner, onConnect }) {
  if (!leetcode?.leetcodeUsername) {
    if (!isOwner) return null;
    return (
      <div className="bg-surface border border-outline-var/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <LeetCodeIcon />
          <span className="text-xs font-syne tracking-wide text-outline uppercase">LeetCode</span>
        </div>
        <p className="text-xs text-text-muted mb-3">Connect your LeetCode profile to showcase your problem-solving stats.</p>
        <button
          type="button"
          onClick={onConnect}
          className="w-full py-2 bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] text-xs font-syne tracking-wide font-bold hover:bg-[#f59e0b] hover:text-white transition"
        >
          Connect LeetCode
        </button>
      </div>
    );
  }

  const {
    leetcodeUsername, leetcodeDSAScore, leetcodeDSALevel,
    leetcodeEasy, leetcodeMedium, leetcodeHard,
    leetcodeTotalPoints, leetcodeLanguages, leetcodeSyncedAt,
  } = leetcode;

  const languages = Array.isArray(leetcodeLanguages) ? leetcodeLanguages.slice(0, 5) : [];
  const profileUrl = `https://leetcode.com/u/${leetcodeUsername}/`;

  const levelColor = leetcodeDSALevel === 'Advanced'
    ? 'text-secondary-bright border-secondary-bright/30 bg-secondary-bright/10'
    : leetcodeDSALevel === 'Intermediate'
      ? 'text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/10'
      : 'text-outline border-outline-var/30 bg-surface-mid';

  return (
    <div className="bg-surface border border-[#f59e0b]/20 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LeetCodeIcon />
          <span className="text-xs font-syne tracking-wide text-primary font-bold uppercase">LeetCode</span>
        </div>
        <a
          href={profileUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[10px] font-syne tracking-wide text-outline hover:text-primary transition"
        >
          {leetcodeUsername} <ExternalLink size={10} />
        </a>
      </div>

      {/* DSA Stats — Easy / Medium / Hard */}
      <div className="grid grid-cols-3 gap-2">
        <StatBlock label="Easy" count={leetcodeEasy ?? 0} color="text-secondary-bright" bgColor="bg-secondary-bright/10 border-secondary-bright/20" />
        <StatBlock label="Medium" count={leetcodeMedium ?? 0} color="text-[#f59e0b]" bgColor="bg-[#f59e0b]/10 border-[#f59e0b]/20" />
        <StatBlock label="Hard" count={leetcodeHard ?? 0} color="text-error" bgColor="bg-error/10 border-error/20" />
      </div>

      {/* DSA Score + Level */}
      <div className="flex items-center justify-between bg-surface-mid border border-outline-var/20 px-3 py-2">
        <div>
          <div className="text-[10px] font-syne tracking-wide text-outline uppercase">DSA Score</div>
          <div className="text-lg font-black text-text-primary font-syne">
            {leetcodeDSAScore ?? 0}<span className="text-xs text-outline">/10</span>
          </div>
        </div>
        <div className={`px-2 py-1 border text-[10px] font-syne tracking-widest font-bold uppercase ${levelColor}`}>
          {leetcodeDSALevel || 'N/A'}
        </div>
      </div>

      {/* Total Points */}
      {leetcodeTotalPoints != null && (
        <div className="text-center text-[10px] font-syne tracking-wide text-outline">
          {leetcodeTotalPoints.toLocaleString()} total points
        </div>
      )}

      {/* Top Languages */}
      {languages.length > 0 && (
        <div>
          <div className="text-[10px] font-syne tracking-wide text-outline uppercase mb-2">Languages</div>
          <div className="flex flex-wrap gap-1.5">
            {languages.map((lang) => (
              <span
                key={lang.name}
                className="px-2 py-0.5 bg-surface-mid border border-outline-var/30 text-text-muted text-[10px] font-syne tracking-wide"
                title={`${lang.problemsSolved} problems solved — Score: ${lang.score}/10`}
              >
                {lang.name} · {lang.problemsSolved}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Synced timestamp */}
      {leetcodeSyncedAt && (
        <div className="text-[9px] font-syne tracking-wide text-outline/60 text-right">
          Synced {formatTimeAgo(leetcodeSyncedAt)}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBlock({ label, count, color, bgColor }) {
  return (
    <div className={`text-center border px-2 py-2 ${bgColor}`}>
      <div className={`text-lg font-black font-syne ${color}`}>{count}</div>
      <div className="text-[9px] font-syne tracking-widest text-outline uppercase">{label}</div>
    </div>
  );
}

function LeetCodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l.257.257c.54.54 1.413.54 1.953 0a1.38 1.38 0 0 0 0-1.955l-.257-.257A4.978 4.978 0 0 0 13.483 0z" fill="#f59e0b"/>
      <path d="M15.145 16.318H8.49c-.762 0-1.38.616-1.38 1.378s.618 1.378 1.38 1.378h6.655c.762 0 1.38-.616 1.38-1.378s-.618-1.378-1.38-1.378z" fill="#f59e0b"/>
      <path d="M22.36 10.636l-3.77-3.77a1.38 1.38 0 0 0-1.952 0 1.38 1.38 0 0 0 0 1.953l3.77 3.77a1.38 1.38 0 0 0 1.952-1.953z" fill="#FFA116"/>
    </svg>
  );
}

function formatTimeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
