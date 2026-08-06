import { useState } from 'react';
import { X, Github, Code, GitPullRequest } from 'lucide-react';
import OwnedProjectCard from './OwnedProjectCard';
import ContributedProjectCard from './ContributedProjectCard';

export default function ProjectShowcaseModal({ repos = [], onClose, userName }) {
  const ownedRepos = repos.filter(r => r.repoType === 'OWNED');
  const contributedRepos = repos.filter(r => r.repoType === 'CONTRIBUTED');

  const defaultTab = ownedRepos.length > 0 ? 'owned' : 'contributed';
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div 
        className="relative w-full max-w-2xl bg-surface border border-outline-var/30 rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-outline-var/20 flex items-center justify-between bg-surface-mid/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 border border-primary/20 rounded-xs">
              <Github size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="font-syne text-sm font-bold tracking-wide uppercase text-text-primary">
                GitHub Portfolio Showcase
              </h3>
              <p className="text-[10px] text-outline font-syne uppercase tracking-wider">
                {userName ? `${userName}'s Curated Projects` : 'Featured Repositories'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-surface-mid hover:bg-error/20 hover:text-error text-text-muted rounded-xs border border-outline-var/30 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-outline-var/20 bg-surface-mid/30">
          <button
            onClick={() => setActiveTab('owned')}
            className={`flex-1 py-3 px-4 font-syne text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'owned'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Code size={14} />
            Owned Projects ({ownedRepos.length})
          </button>

          <button
            onClick={() => setActiveTab('contributed')}
            className={`flex-1 py-3 px-4 font-syne text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'contributed'
                ? 'border-secondary-bright text-secondary-bright bg-secondary-bright/5'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <GitPullRequest size={14} />
            Contributed Projects ({contributedRepos.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          {activeTab === 'owned' && (
            ownedRepos.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-xs font-syne uppercase tracking-wider italic">
                No owned projects selected.
              </div>
            ) : (
              <div className="space-y-3">
                {ownedRepos.map(repo => (
                  <OwnedProjectCard key={repo.id} repo={repo} />
                ))}
              </div>
            )
          )}

          {activeTab === 'contributed' && (
            contributedRepos.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-xs font-syne uppercase tracking-wider italic">
                No contributed projects selected.
              </div>
            ) : (
              <div className="space-y-3">
                {contributedRepos.map(repo => (
                  <ContributedProjectCard key={repo.id} repo={repo} />
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-outline-var/20 bg-surface-mid/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-surface-mid border border-outline-var/40 hover:border-primary/40 text-text-primary text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
