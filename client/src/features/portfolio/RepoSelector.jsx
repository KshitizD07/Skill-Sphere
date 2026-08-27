import { useState, useEffect } from 'react';
import { RefreshCw, Search, Check, AlertCircle, Github, GitFork, Star, Code } from 'lucide-react';
import PortfolioAPI from './portfolioAPI';
import { API_BASE_URL } from '../../config/constants';

export default function RepoSelector({ onSelectionChange }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [ownedSearch, setOwnedSearch] = useState('');
  const [contributedSearch, setContributedSearch] = useState('');

  const handleConnectGithub = () => {
    const token = localStorage.getItem('ss_token') || '';
    window.location.href = `${API_BASE_URL}/auth/github?action=link&token=${encodeURIComponent(token)}`;
  };

  const loadRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PortfolioAPI.getRepos();
      setRepos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load GitHub repos:', err);
      setError('Could not load repositories. Please link GitHub via OAuth.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepos();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccessMsg('');
    try {
      const data = await PortfolioAPI.syncRepos();
      if (data?.repos) {
        setRepos(data.repos);
        setSuccessMsg('GitHub repositories synced successfully.');
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to sync repositories from GitHub.');
    } finally {
      setSyncing(false);
    }
  };

  const selectedOwnedCount = repos.filter(r => r.repoType === 'OWNED' && r.isSelected).length;
  const selectedContributedCount = repos.filter(r => r.repoType === 'CONTRIBUTED' && r.isSelected).length;

  const toggleRepoSelection = (repoId, repoType) => {
    const targetRepo = repos.find(r => r.id === repoId);
    if (!targetRepo) return;

    if (!targetRepo.isSelected) {
      if (repoType === 'OWNED' && selectedOwnedCount >= 3) {
        setError('Maximum 3 owned repositories can be showcased.');
        return;
      }
      if (repoType === 'CONTRIBUTED' && selectedContributedCount >= 3) {
        setError('Maximum 3 contributed repositories can be showcased.');
        return;
      }
    }

    setError(null);
    setSuccessMsg('');

    const updated = repos.map(r => r.id === repoId ? { ...r, isSelected: !r.isSelected } : r);
    setRepos(updated);
  };

  const handleSaveSelection = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg('');
    try {
      const selectedIds = repos.filter(r => r.isSelected).map(r => r.id);
      await PortfolioAPI.updateSelection(selectedIds);
      setSuccessMsg('Showcase selection updated successfully!');
      if (onSelectionChange) onSelectionChange();
    } catch (err) {
      console.error('Save selection error:', err);
      setError(err.response?.data?.message || 'Failed to save repository selection.');
    } finally {
      setSaving(false);
    }
  };

  const ownedRepos = repos
    .filter(r => r.repoType === 'OWNED')
    .filter(r => (r.repoName || '').toLowerCase().includes(ownedSearch.toLowerCase()) || 
                 (r.description || '').toLowerCase().includes(ownedSearch.toLowerCase()));

  const contributedRepos = repos
    .filter(r => r.repoType === 'CONTRIBUTED')
    .filter(r => (r.repoName || '').toLowerCase().includes(contributedSearch.toLowerCase()) || 
                 (r.description || '').toLowerCase().includes(contributedSearch.toLowerCase()));

  return (
    <div className="space-y-6 bg-surface border border-outline-var/20 p-6 rounded-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-var/20 pb-4">
        <div>
          <h3 className="font-syne text-xs font-bold tracking-[0.12em] uppercase text-text-primary flex items-center gap-2">
            <Github size={16} className="text-secondary-bright" />
            GitHub Showcase Manager
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Curate up to 3 Owned and 3 Contributed repositories to highlight on your public profile.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-1.5 bg-surface-mid hover:bg-outline-var/20 border border-outline-var/40 text-text-primary text-xs font-syne font-bold uppercase tracking-wider flex items-center gap-1.5 rounded-xs transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Repos'}
          </button>
          <button
            onClick={handleSaveSelection}
            disabled={saving || syncing}
            className="px-4 py-1.5 bg-primary/10 border border-primary/30 hover:bg-primary hover:text-on-primary text-primary text-xs font-syne font-bold uppercase tracking-wider flex items-center gap-1.5 rounded-xs transition disabled:opacity-50"
          >
            <Check size={13} />
            {saving ? 'Saving...' : 'Save Showcase'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/30 text-error text-xs rounded-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleConnectGithub}
            className="px-2.5 py-1 bg-error/20 hover:bg-error/30 border border-error/40 text-error text-[10px] font-syne font-bold uppercase tracking-wider rounded-xs transition shrink-0 flex items-center gap-1"
          >
            <Github size={10} />
            Link OAuth
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-secondary-bright/10 border border-secondary-bright/30 text-secondary-bright text-xs rounded-xs flex items-center gap-2">
          <Check size={14} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-text-muted text-xs font-syne uppercase tracking-wider">
          Loading repositories...
        </div>
      ) : repos.length === 0 ? (
        <div className="py-8 text-center bg-surface-mid/40 border border-outline-var/20 rounded-xs p-4">
          <p className="text-text-muted text-xs mb-3">No repositories found. Authorize GitHub via OAuth to fetch your repositories.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleConnectGithub}
              className="px-4 py-2 bg-primary text-on-primary text-xs font-syne font-bold uppercase tracking-wider rounded-xs hover:bg-primary/90 transition inline-flex items-center gap-2"
            >
              <Github size={14} />
              Authorize GitHub Account
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-surface-mid border border-outline-var/30 text-text-primary text-xs font-syne font-bold uppercase tracking-wider rounded-xs hover:bg-surface transition inline-flex items-center gap-2"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Repos'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OWNED REPOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-syne text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                Owned Repositories
                <span className={`px-1.5 py-0.5 text-[9px] rounded-xs font-bold ${selectedOwnedCount === 3 ? 'bg-error/15 text-error' : 'bg-primary/10 text-primary'}`}>
                  {selectedOwnedCount}/3
                </span>
              </h4>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search owned..."
                value={ownedSearch}
                onChange={e => setOwnedSearch(e.target.value)}
                className="w-full bg-surface-mid border border-outline-var/30 text-xs text-text-primary pl-8 pr-3 py-2 rounded-xs focus:border-primary/50 outline-none"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {ownedRepos.length === 0 ? (
                <div className="text-[11px] text-text-muted italic py-3 text-center">No owned repos match query.</div>
              ) : (
                ownedRepos.map(repo => {
                  const isChecked = !!repo.isSelected;
                  const isDisabled = !isChecked && selectedOwnedCount >= 3;

                  return (
                    <div
                      key={repo.id}
                      onClick={() => !isDisabled && toggleRepoSelection(repo.id, 'OWNED')}
                      className={`p-3 border rounded-xs transition cursor-pointer flex items-start justify-between gap-3 ${
                        isChecked 
                          ? 'bg-primary/5 border-primary/40' 
                          : isDisabled 
                          ? 'opacity-50 bg-surface-mid/30 border-outline-var/15 cursor-not-allowed'
                          : 'bg-surface-mid/60 border-outline-var/25 hover:border-outline-var/50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={() => {}} // Handled by div onClick
                          className="mt-0.5 accent-primary cursor-pointer"
                        />
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-text-primary truncate">{repo.repoName}</h5>
                          {repo.description && (
                            <p className="text-[10px] text-text-muted line-clamp-1 mt-0.5">{repo.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-[9px] text-outline font-syne uppercase">
                            {repo.primaryLanguage && (
                              <span className="flex items-center gap-1">
                                <Code size={10} className="text-secondary-bright" />
                                {repo.primaryLanguage}
                              </span>
                            )}
                            <span className="flex items-center gap-0.5">
                              <Star size={9} className="text-secondary-bright" />
                              {repo.stars}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <GitFork size={9} />
                              {repo.forks}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CONTRIBUTED REPOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-syne text-[11px] font-bold uppercase tracking-wider text-secondary-bright flex items-center gap-1.5">
                Contributed Repositories
                <span className={`px-1.5 py-0.5 text-[9px] rounded-xs font-bold ${selectedContributedCount === 3 ? 'bg-error/15 text-error' : 'bg-secondary-bright/10 text-secondary-bright'}`}>
                  {selectedContributedCount}/3
                </span>
              </h4>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search contributed..."
                value={contributedSearch}
                onChange={e => setContributedSearch(e.target.value)}
                className="w-full bg-surface-mid border border-outline-var/30 text-xs text-text-primary pl-8 pr-3 py-2 rounded-xs focus:border-secondary-bright/50 outline-none"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {contributedRepos.length === 0 ? (
                <div className="text-[11px] text-text-muted italic py-3 text-center">No contributed repos match query.</div>
              ) : (
                contributedRepos.map(repo => {
                  const isChecked = !!repo.isSelected;
                  const isDisabled = !isChecked && selectedContributedCount >= 3;

                  return (
                    <div
                      key={repo.id}
                      onClick={() => !isDisabled && toggleRepoSelection(repo.id, 'CONTRIBUTED')}
                      className={`p-3 border rounded-xs transition cursor-pointer flex items-start justify-between gap-3 ${
                        isChecked 
                          ? 'bg-secondary-bright/5 border-secondary-bright/40' 
                          : isDisabled 
                          ? 'opacity-50 bg-surface-mid/30 border-outline-var/15 cursor-not-allowed'
                          : 'bg-surface-mid/60 border-outline-var/25 hover:border-outline-var/50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={() => {}} // Handled by div onClick
                          className="mt-0.5 accent-secondary-bright cursor-pointer"
                        />
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-text-primary truncate">{repo.fullName || repo.repoName}</h5>
                          {repo.description && (
                            <p className="text-[10px] text-text-muted line-clamp-1 mt-0.5">{repo.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-[9px] text-outline font-syne uppercase">
                            {repo.primaryLanguage && (
                              <span className="flex items-center gap-1">
                                <Code size={10} className="text-secondary-bright" />
                                {repo.primaryLanguage}
                              </span>
                            )}
                            <span className="flex items-center gap-0.5">
                              <Star size={9} className="text-secondary-bright" />
                              {repo.stars}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
