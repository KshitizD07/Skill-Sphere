import { useState, useEffect, useCallback } from 'react';
import { Github, FolderGit2, ExternalLink } from 'lucide-react';
import PortfolioAPI from './portfolioAPI';
import ProjectShowcaseModal from './ProjectShowcaseModal';

export default function GitHubProjectsSummary({ userId, userName }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadShowcase = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await PortfolioAPI.getShowcase(userId);
      setRepos(res.data || []);
    } catch (err) {
      console.error('Failed to load showcase repos:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadShowcase();
  }, [loadShowcase]);

  const ownedCount = repos.filter(r => r.repoType === 'OWNED').length;
  const contributedCount = repos.filter(r => r.repoType === 'CONTRIBUTED').length;

  if (loading) {
    return (
      <div className="bg-surface border border-outline-var/20 p-5 rounded-md animate-pulse">
        <div className="h-4 bg-surface-mid rounded w-1/3 mb-3"></div>
        <div className="h-3 bg-surface-mid rounded w-1/2"></div>
      </div>
    );
  }

  if (repos.length === 0) {
    return null; // Hide section if user has not selected any repos to showcase
  }

  return (
    <>
      <div className="bg-surface border border-outline-var/20 p-5 rounded-md hover:border-primary/20 transition-colors space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github size={16} className="text-secondary-bright" />
            <h3 className="font-syne text-xs font-bold tracking-[0.12em] uppercase text-text-primary">
              GitHub Projects
            </h3>
          </div>
          <span className="text-[10px] font-syne uppercase tracking-wider text-outline bg-surface-mid px-2 py-0.5 rounded-xs">
            {repos.length} Showcase
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-surface-mid/50 border border-outline-var/20 rounded-xs flex items-center justify-between">
            <span className="text-text-muted font-syne text-[10px] uppercase font-bold tracking-wider">Owned</span>
            <span className="font-bold text-primary font-syne">{ownedCount}</span>
          </div>
          <div className="p-2.5 bg-surface-mid/50 border border-outline-var/20 rounded-xs flex items-center justify-between">
            <span className="text-text-muted font-syne text-[10px] uppercase font-bold tracking-wider">Contributed</span>
            <span className="font-bold text-secondary-bright font-syne">{contributedCount}</span>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-2 bg-surface-mid hover:bg-primary/10 border border-outline-var/30 hover:border-primary/40 text-text-primary hover:text-primary text-xs font-syne font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-xs transition-colors"
        >
          <FolderGit2 size={14} />
          View Projects
          <ExternalLink size={12} className="opacity-70" />
        </button>
      </div>

      {modalOpen && (
        <ProjectShowcaseModal
          repos={repos}
          userName={userName}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
