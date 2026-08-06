import { ExternalLink, Star, GitFork, Calendar, Code, ShieldCheck } from 'lucide-react';

export default function OwnedProjectCard({ repo }) {
  const formattedDate = repo.repoUpdatedAt 
    ? new Date(repo.repoUpdatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="p-4 bg-surface-mid border border-outline-var/30 hover:border-primary/40 rounded-xs transition-colors space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-text-primary text-sm tracking-tight">{repo.repoName}</h4>
            <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] font-syne uppercase font-bold tracking-wider rounded-xs flex items-center gap-1">
              <ShieldCheck size={10} /> Verified Repo
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
          className="p-1.5 bg-surface border border-outline-var/40 hover:border-primary text-text-muted hover:text-primary transition rounded-xs shrink-0"
          title="View on GitHub"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Tech Stack Badges */}
      {repo.techStack && repo.techStack.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {repo.techStack.map((tech, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-surface border border-outline-var/40 text-secondary-bright text-[9px] font-syne font-bold uppercase tracking-wider rounded-xs"
            >
              {tech}
            </span>
          ))}
        </div>
      )}

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
        <span className="flex items-center gap-1">
          <GitFork size={11} />
          {repo.forks} forks
        </span>
        {formattedDate && (
          <span className="flex items-center gap-1 ml-auto">
            <Calendar size={11} />
            Updated {formattedDate}
          </span>
        )}
      </div>
    </div>
  );
}
