import { ExternalLink, Star, Code, GitPullRequest } from 'lucide-react';

export default function ContributedProjectCard({ repo }) {
  return (
    <div className="p-4 bg-surface-mid border border-outline-var/30 hover:border-secondary-bright/40 rounded-xs transition-colors space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-text-primary text-sm tracking-tight">{repo.fullName || repo.repoName}</h4>
            <span className="px-2 py-0.5 bg-secondary-bright/10 border border-secondary-bright/20 text-secondary-bright text-[9px] font-syne uppercase font-bold tracking-wider rounded-xs flex items-center gap-1">
              <GitPullRequest size={10} /> Contributor
            </span>
          </div>
          {repo.description && (
            <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-2">{repo.description}</p>
          )}
        </div>
        <a
          href={repo.url}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 bg-surface border border-outline-var/40 hover:border-secondary-bright text-text-muted hover:text-secondary-bright transition rounded-xs shrink-0"
          title="View on GitHub"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Meta Bar */}
      <div className="flex items-center gap-4 text-[10px] text-outline font-syne uppercase tracking-wider pt-2 border-t border-outline-var/15">
        {repo.primaryLanguage && (
          <span className="flex items-center gap-1">
            <Code size={11} className="text-secondary-bright" />
            {repo.primaryLanguage}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Star size={11} className="text-secondary-bright" />
          {repo.stars} stars
        </span>
        {repo.mergedPrs != null && repo.mergedPrs > 0 && (
          <span className="flex items-center gap-1 font-bold text-secondary-bright">
            <GitPullRequest size={11} />
            {repo.mergedPrs} Merged PRs
          </span>
        )}
      </div>
    </div>
  );
}
