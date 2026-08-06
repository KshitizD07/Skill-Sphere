import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Github, ExternalLink, BookOpen, Loader2, Code2, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Simple in-memory cache so repeated opens don't re-fetch
const readmeCache = {};

export default function ReadmeModal({ repo, onClose }) {
  const cacheKey = repo?.fullName || '';
  const cachedContent = cacheKey ? readmeCache[cacheKey] : null;

  const [content, setContent] = useState(cachedContent || null);
  const [loading, setLoading] = useState(!cachedContent);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!repo?.fullName) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, repo]);

  useEffect(() => {
    if (!repo?.fullName) return;
    const key = repo.fullName;

    if (readmeCache[key]) {
      return;
    }

    let active = true;

    const fetchReadme = async () => {
      try {
        const res = await fetch(`https://api.github.com/repos/${repo.fullName}/readme`, {
          headers: { Accept: 'application/vnd.github.v3.raw', 'User-Agent': 'SkillSphere' },
        });
        if (!res.ok) throw new Error('README not found');
        const text = await res.text();
        if (active) {
          readmeCache[key] = text;
          setContent(text);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchReadme();

    return () => {
      active = false;
    };
  }, [repo?.fullName]);

  if (!repo) return null;

  const techStack = Array.isArray(repo.techStack) ? repo.techStack : [];

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-surface border border-[#d97706]/20 rounded-md shadow-2xl flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-outline-var/20 flex items-start justify-between gap-4 bg-surface-mid/40 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 bg-[#d97706]/10 border border-[#d97706]/20 rounded-xs shrink-0">
              <BookOpen size={16} className="text-[#d97706]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-syne text-sm font-bold tracking-wide text-text-primary truncate">
                {repo.repoName}
              </h3>
              <p className="text-[10px] text-outline font-syne uppercase tracking-wider truncate">
                {repo.fullName}
              </p>
              {repo.description && (
                <p className="text-xs text-text-muted mt-1.5 leading-relaxed line-clamp-2">
                  {repo.description}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-surface-mid hover:bg-error/20 hover:text-error text-text-muted rounded-xs border border-outline-var/30 transition shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* README Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
              <Loader2 size={24} className="animate-spin text-[#d97706]" />
              <span className="text-xs font-syne uppercase tracking-wider">Loading README...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
              <BookOpen size={32} className="opacity-30" />
              <p className="text-sm font-syne">No README available for this repository.</p>
              <a
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#d97706] hover:underline font-syne"
              >
                <Github size={13} /> View on GitHub <ExternalLink size={11} />
              </a>
            </div>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-black font-syne text-text-primary mb-4 pb-2 border-b border-outline-var/20">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-bold font-syne text-text-primary mt-6 mb-3 pb-1 border-b border-outline-var/15">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-bold font-syne text-[#d97706] mt-4 mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm text-text-muted leading-relaxed mb-3">{children}</p>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#d97706] hover:text-[#b45309] underline underline-offset-2 transition-colors"
                    >
                      {children}
                    </a>
                  ),
                  code: ({ inline, children }) =>
                    inline ? (
                      <code className="px-1.5 py-0.5 bg-surface-mid border border-outline-var/30 text-secondary-bright text-xs rounded font-mono">
                        {children}
                      </code>
                    ) : (
                      <code className="text-xs font-mono text-text-muted">{children}</code>
                    ),
                  pre: ({ children }) => (
                    <pre className="bg-surface-mid border border-outline-var/20 rounded-xs p-4 overflow-x-auto text-xs font-mono text-text-muted mb-4">
                      {children}
                    </pre>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside text-sm text-text-muted space-y-1 mb-3 pl-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside text-sm text-text-muted space-y-1 mb-3 pl-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-[#d97706]/40 pl-4 my-3 text-text-muted italic">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="border-outline-var/20 my-4" />,
                  img: ({ src, alt }) => (
                    <img
                      src={src}
                      alt={alt}
                      className="max-w-full rounded-xs border border-outline-var/20 my-3"
                    />
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-xs border-collapse">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="text-left p-2 border border-outline-var/20 bg-surface-mid font-syne font-bold text-text-primary uppercase tracking-wider text-[10px]">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="p-2 border border-outline-var/20 text-text-muted">{children}</td>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-bold text-text-primary">{children}</strong>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer — Tech Stack + Actions */}
        <div className="p-4 border-t border-outline-var/20 bg-surface-mid/40 shrink-0 space-y-3">
          {techStack.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Code2 size={11} className="text-[#d97706]" />
                <span className="text-[10px] font-syne font-bold uppercase tracking-widest text-outline">
                  Tech Stack
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {techStack.map((tech, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-[#d97706]/10 border border-[#d97706]/25 text-[#d97706] text-[9px] font-syne font-bold uppercase tracking-wider rounded-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            {repo.primaryLanguage && (
              <span className="text-[10px] text-outline font-syne uppercase tracking-wider flex items-center gap-1">
                <Code2 size={10} className="text-secondary-bright" />
                {repo.primaryLanguage}
              </span>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {repo.homepage && (
                <a
                  href={repo.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d97706]/10 border border-[#d97706]/30 text-[#d97706] text-xs font-syne font-bold uppercase tracking-wider rounded-xs hover:bg-[#d97706] hover:text-white transition"
                >
                  <Globe size={12} /> Live Demo
                </a>
              )}
              <a
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-outline-var/40 hover:border-[#d97706]/40 text-text-muted hover:text-[#d97706] text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition"
              >
                <Github size={12} /> GitHub
              </a>
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-surface-mid border border-outline-var/40 hover:border-outline-var/70 text-text-primary text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
