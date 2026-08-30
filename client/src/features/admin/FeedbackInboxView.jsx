import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  HeartHandshake, Star, Trash2, RefreshCw, 
  Sparkles, Mail, Building2, Filter,
  CheckCircle2, ExternalLink, MessageSquare, Send, Check
} from 'lucide-react';
import FeedbackAPI from '../feedback/feedbackAPI';

export default function FeedbackInboxView({ toast }) {
  const [feedbackList, setFeedbackList] = useState([]);
  const [stats, setStats] = useState({ totalSubmissions: 0, contributorLeads: 0, averageRating: 5.0 });
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [contributorOnly, setContributorOnly] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [respondingId, setRespondingId] = useState(null);
  const [responseInputs, setResponseInputs] = useState({});
  const [savingResponseId, setSavingResponseId] = useState(null);

  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  });

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
        toastRef.current?.error(res.message || 'Access restricted to administrator');
      }
    } catch (err) {
      console.error('Failed to load feedback inbox', err);
      toastRef.current?.error('Failed to load feedback entries');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, contributorOnly]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const handleSaveResponse = async (id) => {
    const current = responseInputs[id] || {};
    const status = current.status || feedbackList.find((f) => f.id === id)?.status || 'SHIPPED';
    const adminResponse = current.adminResponse !== undefined
      ? current.adminResponse
      : feedbackList.find((f) => f.id === id)?.adminResponse || '';

    try {
      setSavingResponseId(id);
      const res = await FeedbackAPI.respondToFeedback(id, { status, adminResponse });
      if (res?.success) {
        toastRef.current?.success('Response saved and user notified!');
        setFeedbackList((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...res.data } : item))
        );
        setRespondingId(null);
      } else {
        toastRef.current?.error(res?.message || 'Failed to save response');
      }
    } catch (err) {
      toastRef.current?.error(err?.response?.data?.message || err.message || 'Failed to update feedback');
    } finally {
      setSavingResponseId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this feedback entry?')) return;
    try {
      setDeletingId(id);
      await FeedbackAPI.deleteFeedback(id);
      toastRef.current?.success('Feedback deleted successfully');
      setFeedbackList((prev) => prev.filter((item) => item.id !== id));
      setStats((prev) => ({ ...prev, totalSubmissions: Math.max(0, prev.totalSubmissions - 1) }));
    } catch (err) {
      console.error(err);
      toastRef.current?.error('Failed to delete feedback');
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
      <div className="space-y-3 p-4 bg-surface border border-outline-var/30 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-syne font-bold uppercase text-text-muted flex items-center gap-1.5 mr-1">
              <Filter size={13} /> Category:
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

        {/* Status Filter Sub-Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-outline-var/20">
          <span className="text-xs font-syne font-bold uppercase text-text-muted mr-1">Status:</span>
          {[
            { id: 'ALL', label: 'All Statuses' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'UNDER_REVIEW', label: 'Under Review' },
            { id: 'PLANNED', label: 'Planned' },
            { id: 'SHIPPED', label: 'Shipped 🎉' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-2.5 py-1 rounded-xs text-[10px] font-syne font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-text-primary text-bg-base font-extrabold'
                  : 'bg-surface-mid hover:bg-surface border border-outline-var/30 text-text-muted'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Feedback Items List ── */}
      {loading ? (
        <div className="p-12 text-center bg-surface border border-outline-var/30 rounded-lg">
          <RefreshCw size={24} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-xs font-syne uppercase tracking-wider text-text-muted">Loading user telemetry...</p>
        </div>
      ) : feedbackList.filter((f) => statusFilter === 'ALL' || (f.status || 'PENDING') === statusFilter).length === 0 ? (
        <div className="p-12 text-center bg-surface border border-outline-var/30 rounded-lg">
          <CheckCircle2 size={32} className="text-[#6B7F5E] mx-auto mb-3" />
          <p className="text-sm font-syne font-bold text-text-primary">No feedback matching your filters</p>
          <p className="text-xs text-text-muted mt-1">Adjust filters or await new community submissions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbackList
            .filter((f) => statusFilter === 'ALL' || (f.status || 'PENDING') === statusFilter)
            .map((item) => {
              const currentStatus = item.status || 'PENDING';
              const isResponding = respondingId === item.id;
              const draft = responseInputs[item.id] || { status: currentStatus, adminResponse: item.adminResponse || '' };

              const statusColorMap = {
                PENDING: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
                UNDER_REVIEW: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
                PLANNED: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
                SHIPPED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
                DISMISSED: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
              };

              return (
                <div
                  key={item.id}
                  className="bg-surface border border-outline-var/30 rounded-lg p-5 space-y-4 shadow-warm hover:border-primary/40 transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {item.userId ? (
                        <Link
                          to={`/profile/${item.userId}`}
                          title={`View ${item.userName || 'User'}'s Profile`}
                          className="w-10 h-10 rounded-full bg-surface-mid border border-outline-var/40 overflow-hidden flex items-center justify-center font-syne font-bold text-sm text-primary shrink-0 hover:border-primary transition-all shadow-xs hover:scale-105"
                        >
                          {item.userAvatar ? (
                            <img
                              src={item.userAvatar}
                              alt={item.userName || 'Avatar'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{(item.userName || 'U')[0].toUpperCase()}</span>
                          )}
                        </Link>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-surface-mid border border-outline-var/40 overflow-hidden flex items-center justify-center font-syne font-bold text-sm text-primary shrink-0">
                          {item.userAvatar ? (
                            <img
                              src={item.userAvatar}
                              alt={item.userName || 'Avatar'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{(item.userName || 'U')[0].toUpperCase()}</span>
                          )}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.userId ? (
                            <Link
                              to={`/profile/${item.userId}`}
                              className="group font-syne font-extrabold text-sm text-text-primary hover:text-primary transition-colors inline-flex items-center gap-1.5"
                              title="Open user profile"
                            >
                              <span>{item.userName || 'Anonymous'}</span>
                              <ExternalLink size={11} className="text-outline group-hover:text-primary transition-colors" />
                            </Link>
                          ) : (
                            <h4 className="font-syne font-extrabold text-sm text-text-primary">{item.userName || 'Anonymous'}</h4>
                          )}
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

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status Pill */}
                      <span className={`text-[10px] font-syne font-bold uppercase px-2.5 py-0.5 rounded-full border ${statusColorMap[currentStatus] || statusColorMap.PENDING}`}>
                        {currentStatus.replace('_', ' ')}
                      </span>

                      {/* Category Pill */}
                      <span className="text-[10px] font-syne font-bold uppercase px-2.5 py-0.5 rounded-xs bg-[#F5F3FF] border border-[#DDD6FE] text-[#6D28D9]">
                        {item.category}
                      </span>

                      {/* Rating */}
                      <div className="flex items-center gap-0.5 bg-surface-mid px-2 py-0.5 rounded-xs border border-outline-var/30">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
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

                  {/* Existing Team Response (if present) */}
                  {item.adminResponse && !isResponding && (
                    <div className="p-3.5 bg-primary/5 border border-primary/25 rounded-md space-y-1 text-xs">
                      <div className="flex items-center justify-between text-primary font-syne font-bold uppercase text-[10px]">
                        <span className="flex items-center gap-1.5">
                          <Check size={12} /> Team Response ({item.respondedBy || 'SkillSphere Core'})
                        </span>
                        {item.respondedAt && (
                          <span className="text-outline font-mono text-[9px]">
                            {new Date(item.respondedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-text-primary font-outfit leading-relaxed pt-1 whitespace-pre-wrap">
                        {item.adminResponse}
                      </p>
                    </div>
                  )}

                  {/* Inline Response / Action Drawer */}
                  {isResponding ? (
                    <div className="p-4 bg-surface-mid border border-primary/40 rounded-md space-y-3 font-outfit">
                      <div className="flex items-center justify-between">
                        <span className="font-syne text-xs font-bold uppercase text-primary flex items-center gap-1.5">
                          <MessageSquare size={13} /> Respond & Resolve Feedback
                        </span>
                        <button
                          type="button"
                          onClick={() => setRespondingId(null)}
                          className="text-xs text-text-muted hover:text-text-primary font-syne"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-syne font-bold uppercase tracking-wider text-outline">
                          Update Status:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['PENDING', 'UNDER_REVIEW', 'PLANNED', 'SHIPPED', 'DISMISSED'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() =>
                                setResponseInputs((prev) => ({
                                  ...prev,
                                  [item.id]: { ...draft, status: st },
                                }))
                              }
                              className={`px-2.5 py-1 rounded-xs text-[10px] font-syne font-bold uppercase tracking-wider transition-all border ${
                                draft.status === st
                                  ? 'bg-primary text-on-primary border-primary shadow-xs'
                                  : 'bg-surface border-outline-var/30 text-text-muted hover:text-text-primary'
                              }`}
                            >
                              {st.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-syne font-bold uppercase tracking-wider text-outline">
                          Response Note (Visible to User):
                        </label>
                        <textarea
                          rows={3}
                          value={draft.adminResponse}
                          onChange={(e) =>
                            setResponseInputs((prev) => ({
                              ...prev,
                              [item.id]: { ...draft, adminResponse: e.target.value },
                            }))
                          }
                          placeholder="e.g. Thanks for the suggestion! We have added Data Analyst roles to the seed catalog and improved verifier heuristics."
                          className="w-full bg-surface border border-outline-var/40 rounded-xs p-2.5 text-xs text-text-primary outline-none focus:border-primary/60 resize-none leading-relaxed"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setRespondingId(null)}
                          className="px-3 py-1.5 bg-surface border border-outline-var/30 text-text-muted text-xs font-syne font-bold uppercase rounded-xs"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveResponse(item.id)}
                          disabled={savingResponseId === item.id}
                          className="px-4 py-1.5 bg-primary text-on-primary text-xs font-syne font-bold uppercase rounded-xs hover:bg-secondary-bright transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {savingResponseId === item.id ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Send size={12} />
                          )}
                          Save Response & Notify
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-outline-var/20">
                      <span>Submitted on {new Date(item.createdAt).toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRespondingId(item.id);
                          setResponseInputs((prev) => ({
                            ...prev,
                            [item.id]: {
                              status: currentStatus,
                              adminResponse: item.adminResponse || '',
                            },
                          }));
                        }}
                        className="px-2.5 py-1 bg-surface-mid hover:bg-surface border border-outline-var/30 text-text-primary text-[10px] font-syne font-bold uppercase rounded-xs flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare size={11} />
                        {item.adminResponse ? 'Edit Team Response' : 'Reply & Resolve'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
