import { useState, useEffect, useCallback } from 'react';
import { 
  HeartHandshake, Star, Trash2, RefreshCw, 
  Sparkles, Mail, Building2, Filter,
  CheckCircle2
} from 'lucide-react';
import FeedbackAPI from '../feedback/feedbackAPI';

export default function FeedbackInboxView({ toast }) {
  const [feedbackList, setFeedbackList] = useState([]);
  const [stats, setStats] = useState({ totalSubmissions: 0, contributorLeads: 0, averageRating: 5.0 });
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [contributorOnly, setContributorOnly] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const res = await FeedbackAPI.getFeedbackInbox({
        category: categoryFilter,
        contributorOnly: contributorOnly ? 'true' : 'false',
      });
      if (res?.success) {
        setFeedbackList(res.data || []);
        if (res.stats) setStats(res.stats);
      } else if (res?.error) {
        toast.error(res.message || 'Access restricted to administrator');
      }
    } catch (err) {
      console.error('Failed to load feedback inbox', err);
      toast.error('Failed to load feedback entries');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, contributorOnly, toast]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this feedback entry?')) return;
    try {
      setDeletingId(id);
      await FeedbackAPI.deleteFeedback(id);
      toast.success('Feedback deleted successfully');
      setFeedbackList((prev) => prev.filter((item) => item.id !== id));
      setStats((prev) => ({ ...prev, totalSubmissions: Math.max(0, prev.totalSubmissions - 1) }));
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete feedback');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-outline-var/30 p-5 rounded-lg shadow-warm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-syne font-bold uppercase tracking-wider text-text-muted">Total Submissions</span>
            <div className="w-8 h-8 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-[#6D28D9] flex items-center justify-center">
              <HeartHandshake size={16} />
            </div>
          </div>
          <p className="text-3xl font-syne font-extrabold text-text-primary mt-2">{stats.totalSubmissions}</p>
          <span className="text-[11px] text-text-muted mt-1 block">Live student and peer reviews</span>
        </div>

        <div className="bg-surface border border-outline-var/30 p-5 rounded-lg shadow-warm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-syne font-bold uppercase tracking-wider text-text-muted">Avg Platform Rating</span>
            <div className="w-8 h-8 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] flex items-center justify-center">
              <Star size={16} className="fill-[#D97706]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-syne font-extrabold text-text-primary">{stats.averageRating}</p>
            <span className="text-xs font-syne text-[#D97706] font-bold">/ 5.0 ⭐</span>
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">Overall user satisfaction score</span>
        </div>

        <div className="bg-surface border border-accent/40 p-5 rounded-lg shadow-warm bg-accent/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-syne font-bold uppercase tracking-wider text-accent font-extrabold">🚀 Contributor Leads</span>
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 text-accent flex items-center justify-center">
              <Sparkles size={16} />
            </div>
          </div>
          <p className="text-3xl font-syne font-extrabold text-accent mt-2">{stats.contributorLeads}</p>
          <span className="text-[11px] text-text-muted mt-1 block">Engineers volunteered to help build</span>
        </div>
      </div>

      {/* ── Filters & Controls ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-surface border border-outline-var/30 rounded-lg">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-syne font-bold uppercase text-text-muted flex items-center gap-1.5 mr-1">
            <Filter size={13} /> Filter:
          </span>
          {['ALL', 'UI / UX Experience', 'Speed & Performance', 'Bug Report', 'Feature Suggestion', 'General Feedback'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xs text-[11px] font-syne font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-mid hover:bg-surface border border-outline-var/30 text-text-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-syne font-bold text-text-primary">
            <input
              type="checkbox"
              checked={contributorOnly}
              onChange={(e) => setContributorOnly(e.target.checked)}
              className="accent-[#6B7F5E] w-4 h-4 rounded cursor-pointer"
            />
            <span>🚀 Contributors Only</span>
          </label>

          <button
            type="button"
            onClick={loadFeedback}
            className="p-2 rounded-xs bg-surface-mid hover:bg-surface border border-outline-var/30 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Refresh Feedback"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : ''} />
          </button>
        </div>
      </div>

      {/* ── Feedback Items List ── */}
      {loading ? (
        <div className="p-12 text-center bg-surface border border-outline-var/30 rounded-lg">
          <RefreshCw size={24} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-xs font-syne uppercase tracking-wider text-text-muted">Loading feedback entries...</p>
        </div>
      ) : feedbackList.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-outline-var/30 rounded-lg">
          <CheckCircle2 size={32} className="text-accent mx-auto mb-3" />
          <h3 className="font-syne font-extrabold text-base text-text-primary">No Feedback Found</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            {contributorOnly
              ? 'No submissions matching the contributor filter yet.'
              : 'All user submissions will appear here in real-time.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbackList.map((item) => (
            <div
              key={item.id}
              className={`bg-surface border rounded-xl p-5 sm:p-6 shadow-warm space-y-4 transition-all ${
                item.wantsToContribute
                  ? 'border-accent/60 bg-gradient-to-br from-surface to-accent/5'
                  : 'border-outline-var/30'
              }`}
            >
              {/* Card Header: User details + Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-var/20">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-mid border border-outline-var/40 flex items-center justify-center font-syne font-bold text-sm text-primary shrink-0">
                    {(item.userName || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-syne font-extrabold text-sm text-text-primary">{item.userName || 'Anonymous'}</h4>
                      <span className="text-[10px] font-syne uppercase px-2 py-0.5 rounded-full bg-surface-mid border border-outline-var/30 text-text-muted">
                        {item.userRole || 'STUDENT'}
                      </span>
                      {item.wantsToContribute && (
                        <span className="text-[10px] font-syne font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#E8EDE4] text-[#364B29] border border-[#C7D5BF] flex items-center gap-1">
                          <Sparkles size={10} /> Volunteer Contributor
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5 flex-wrap">
                      <a href={`mailto:${item.userEmail}`} className="hover:text-primary transition-colors flex items-center gap-1">
                        <Mail size={11} /> {item.userEmail}
                      </a>
                      {item.userCollege && (
                        <span className="flex items-center gap-1">
                          <Building2 size={11} /> {item.userCollege}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Category Pill */}
                  <span className="text-[11px] font-syne font-bold uppercase px-2.5 py-1 rounded-xs bg-[#F5F3FF] border border-[#DDD6FE] text-[#6D28D9]">
                    {item.category}
                  </span>

                  {/* Rating */}
                  <div className="flex items-center gap-0.5 bg-surface-mid px-2.5 py-1 rounded-xs border border-outline-var/30">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={13}
                        className={s <= item.rating ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-outline-var'}
                      />
                    ))}
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="p-1.5 rounded-xs text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                    title="Delete Feedback Entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Contributor Spotlight Box */}
              {item.wantsToContribute && (
                <div className="p-3.5 rounded-lg bg-[#F0F5EC] border border-[#6B7F5E]/30 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <strong className="text-xs font-syne uppercase text-[#364B29] flex items-center gap-1.5">
                      🚀 Developer Co-Creation Interest
                    </strong>
                    {item.contributorContact && (
                      <span className="text-xs text-text-primary font-medium">
                        Contact / Discord: <strong className="text-[#364B29]">{item.contributorContact}</strong>
                      </span>
                    )}
                  </div>
                  {item.contributorAreas && item.contributorAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.contributorAreas.map((area) => (
                        <span
                          key={area}
                          className="px-2 py-0.5 bg-white border border-[#C7D5BF] rounded-xs text-[10px] font-syne font-bold text-[#364B29]"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Feedback Content */}
              <div className="bg-surface-mid/60 border border-outline-var/20 rounded-md p-4 text-sm text-text-primary leading-relaxed whitespace-pre-wrap font-outfit">
                {item.feedback}
              </div>

              {/* Extra Insight Badges */}
              {(item.mostValuable || item.improvement) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {item.mostValuable && (
                    <div className="p-3 bg-surface-mid border border-outline-var/30 rounded-md text-xs space-y-1">
                      <span className="font-syne font-bold uppercase text-[10px] text-text-muted block">✨ Most Valuable:</span>
                      <p className="text-text-primary">{item.mostValuable}</p>
                    </div>
                  )}
                  {item.improvement && (
                    <div className="p-3 bg-surface-mid border border-outline-var/30 rounded-md text-xs space-y-1">
                      <span className="font-syne font-bold uppercase text-[10px] text-text-muted block">🛠️ Next Feature / Improvement:</span>
                      <p className="text-text-primary">{item.improvement}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Card Footer */}
              <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                <span>Submitted on {new Date(item.createdAt).toLocaleString()}</span>
                <span>{item.deviceInfo?.split(')')[0] || 'Web'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
