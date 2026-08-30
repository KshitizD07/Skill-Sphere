import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, Activity, Flag, Cpu,
  Search, Trash2, CheckCircle2,
  AlertTriangle, RefreshCw, UserX, UserCheck,
  TrendingUp, Database, Server, Clock, Lock,
  HeartHandshake, Sparkles, KeyRound, X, ArrowLeft
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import AdminAPI from './adminAPI';
import AntifragileAdmin from './AntifragileAdmin';
import FeedbackInboxView from './FeedbackInboxView';
import Navbar from '../../shared/components/Navbar';
import { useToast, ToastContainer } from '../../shared/components/Toast';

export default function AdminDashboard({ user: propUser, onLogout }) {
  const navigate = useNavigate();
  const toast = useToast();

  const currentUser = useMemo(() => {
    try {
      return propUser || JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return propUser || {};
    }
  }, [propUser]);

  const isOfficialSession = currentUser?.email === 'official@skillsphere.com' || currentUser?.isSystemAccount;

  const [activeTab, setActiveTab] = useState('overview'); // overview | feedback | users | reports | nexus | health
  const [loading, setLoading] = useState(true);

  // Overview states
  const [stats, setStats] = useState(null);

  // Users states
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);

  // Reports states
  const [reportsList, setReportsList] = useState([]);
  const [reportStatusFilter, setReportStatusFilter] = useState('PENDING');

  // Health states
  const [healthData, setHealthData] = useState(null);

  // SkillSphere Official Account Switcher state
  const [showOfficialModal, setShowOfficialModal] = useState(false);
  const [officialPassword, setOfficialPassword] = useState('');
  const [isSwitchingOfficial, setIsSwitchingOfficial] = useState(false);

  const handleSwitchToOfficial = async (e) => {
    e.preventDefault();
    if (!officialPassword.trim()) {
      return toast.error('Please enter the master authorization key.');
    }
    setIsSwitchingOfficial(true);
    try {
      const currentToken = localStorage.getItem('ss_token');
      const currentUserData = localStorage.getItem('user_data');
      const res = await AdminAPI.switchToOfficial(officialPassword.trim());
      if (res && res.token && res.user) {
        if (currentToken && currentUserData) {
          localStorage.setItem('ss_previous_admin_token', currentToken);
          localStorage.setItem('ss_previous_admin_user', currentUserData);
        }
        localStorage.setItem('ss_token', res.token);
        localStorage.setItem('user_data', JSON.stringify(res.user));
        toast.success('Successfully switched to SkillSphere Official System Account!');
        setShowOfficialModal(false);
        setOfficialPassword('');
        // Reload to apply official account across all features
        window.location.replace('/dashboard');
      } else {
        toast.error(res?.message || 'Failed to switch to official account.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Authorization failed.');
    } finally {
      setIsSwitchingOfficial(false);
    }
  };

  const handleSwitchBackToPersonal = () => {
    const prevToken = localStorage.getItem('ss_previous_admin_token');
    const prevUser = localStorage.getItem('ss_previous_admin_user');
    if (prevToken && prevUser) {
      localStorage.setItem('ss_token', prevToken);
      localStorage.setItem('user_data', prevUser);
      localStorage.removeItem('ss_previous_admin_token');
      localStorage.removeItem('ss_previous_admin_user');
      toast.success('Switched back to your personal account');
      window.location.replace('/dashboard');
    } else {
      toast.info('No cached personal session. Redirecting to login.');
      localStorage.removeItem('ss_token');
      localStorage.removeItem('user_data');
      window.location.replace('/auth');
    }
  };

  // Verify Admin Access Guard (Must have active escalated ADMIN role)
  useEffect(() => {
    if (currentUser?.email && currentUser?.role !== 'ADMIN') {
      toast.error('Access restricted to platform administrator');
      navigate('/dashboard');
    }
  }, [currentUser?.email, currentUser?.role, navigate, toast]);

  // Load Overview Data
  const loadStats = useCallback(async () => {
    try {
      const res = await AdminAPI.getStats();
      if (res && !res.error) setStats(res);
    } catch (err) {
      console.error('Failed to load admin stats', err);
    }
  }, []);

  // Load Users Data
  const loadUsers = useCallback(async () => {
    try {
      const res = await AdminAPI.getUsers({
        search: userSearch,
        role: roleFilter,
        status: statusFilter,
      });
      if (Array.isArray(res)) setUsersList(res);
      else if (res?.data) setUsersList(res.data);
    } catch (err) {
      console.error('Failed to load users list', err);
    }
  }, [userSearch, roleFilter, statusFilter]);

  // Load Reports Data
  const loadReports = useCallback(async () => {
    try {
      const res = await AdminAPI.getReports({ status: reportStatusFilter });
      if (Array.isArray(res)) setReportsList(res);
      else if (res?.data) setReportsList(res.data);
    } catch (err) {
      console.error('Failed to load reports', err);
    }
  }, [reportStatusFilter]);

  // Load System Health
  const loadHealth = useCallback(async () => {
    try {
      const res = await AdminAPI.getSystemHealth();
      if (res && !res.error) setHealthData(res);
    } catch (err) {
      console.error('Failed to load system health', err);
    }
  }, []);

  const refreshActiveTab = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'overview') await loadStats();
    else if (activeTab === 'users') await loadUsers();
    else if (activeTab === 'reports') await loadReports();
    else if (activeTab === 'health') await loadHealth();
    setLoading(false);
  }, [activeTab, loadStats, loadUsers, loadReports, loadHealth]);

  useEffect(() => {
    refreshActiveTab();
  }, [refreshActiveTab]);

  // User Actions
  const handleToggleSuspend = async (userId) => {
    setActionLoading(userId);
    try {
      const res = await AdminAPI.toggleSuspendUser(userId);
      toast.success(res?.isActive ? 'User account restored to Active' : 'User account suspended');
      loadUsers();
    } catch {
      toast.error('Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    setActionLoading(deleteTargetUser.id);
    try {
      await AdminAPI.deleteUser(deleteTargetUser.id);
      toast.success(`User ${deleteTargetUser.name} deleted successfully`);
      setDeleteTargetUser(null);
      loadUsers();
    } catch {
      toast.error('Failed to delete user account');
    } finally {
      setActionLoading(null);
    }
  };

  // Report Actions
  const handleResolveReport = async (reportId, action) => {
    setActionLoading(reportId);
    try {
      await AdminAPI.resolveReport(reportId, action);
      toast.success(`Report resolved: ${action}`);
      loadReports();
    } catch {
      toast.error('Failed to resolve report');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={onLogout} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-var/20">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="text-primary" size={24} />
              <h1 className="text-2xl font-syne font-extrabold text-text-primary tracking-tight">
                Admin Control Plane
              </h1>
              <span className="px-2.5 py-0.5 bg-primary/10 border border-primary/30 text-primary text-[10px] font-syne font-bold uppercase rounded-full">
                Root Access
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Platform governance, N.E.X.U.S. machine intelligence, user moderation, and health telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            {isOfficialSession ? (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[10px] font-syne font-bold uppercase rounded-xs flex items-center gap-1">
                  <Shield size={11} /> Official Session Active
                </span>
                <button
                  onClick={handleSwitchBackToPersonal}
                  className="px-3.5 py-2 bg-surface hover:bg-surface-mid border border-outline-var/40 text-text-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  title="Exit official account and return to your personal admin account"
                >
                  <ArrowLeft size={13} />
                  Switch to Personal Account
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowOfficialModal(true)}
                className="px-3.5 py-2 bg-primary text-on-primary hover:bg-secondary-bright font-syne font-bold text-xs uppercase tracking-wider rounded-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Sparkles size={13} />
                Switch to SkillSphere Official
              </button>
            )}

            <button
              onClick={refreshActiveTab}
              className="px-3.5 py-2 bg-surface hover:bg-surface-mid border border-outline-var/30 text-text-muted hover:text-text-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-primary' : ''} />
              Refresh Telemetry
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-outline-var/20 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: 'Platform Overview', icon: TrendingUp },
            { id: 'feedback', label: 'Feedback & Co-Builders', icon: HeartHandshake },
            { id: 'users', label: 'User Governance', icon: Users },
            { id: 'reports', label: 'Moderation Reports', icon: Flag },
            { id: 'nexus', label: 'N.E.X.U.S. AI Engine', icon: Cpu },
            { id: 'health', label: 'System Health', icon: Activity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xs font-syne text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-primary text-on-primary shadow-sm shadow-primary/20'
                  : 'bg-surface hover:bg-surface-mid text-text-muted hover:text-text-primary border border-outline-var/20'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.id === 'reports' && stats?.pendingReportsCount > 0 && (
                <span className="px-1.5 py-0.2 bg-error text-white text-[9px] rounded-full font-mono">
                  {stats.pendingReportsCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: FEEDBACK & CO-BUILDERS ── */}
        {activeTab === 'feedback' && <FeedbackInboxView toast={toast} />}

        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface border border-outline-var/20 rounded-md p-5 space-y-1 shadow-sm">
                <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline">Total Platform Users</span>
                <div className="text-2xl font-bold font-syne text-text-primary">{stats?.totalUsers ?? '—'}</div>
                <div className="text-[11px] text-accent flex items-center gap-1 font-mono">
                  +{stats?.newUsersToday ?? 0} today
                </div>
              </div>

              <div className="bg-surface border border-outline-var/20 rounded-md p-5 space-y-1 shadow-sm">
                <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline">Total Global Posts</span>
                <div className="text-2xl font-bold font-syne text-text-primary">{stats?.totalPosts ?? '—'}</div>
                <div className="text-[11px] text-accent flex items-center gap-1 font-mono">
                  +{stats?.newPostsToday ?? 0} today
                </div>
              </div>

              <div className="bg-surface border border-outline-var/20 rounded-md p-5 space-y-1 shadow-sm">
                <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline">Active Squad Missions</span>
                <div className="text-2xl font-bold font-syne text-text-primary">{stats?.activeSquads ?? '—'}</div>
                <div className="text-[11px] text-outline font-mono">{stats?.totalSquads ?? 0} total squads</div>
              </div>

              <div className="bg-surface border border-outline-var/20 rounded-md p-5 space-y-1 shadow-sm">
                <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline">Verified Skills</span>
                <div className="text-2xl font-bold font-syne text-primary">{stats?.totalVerifications ?? '—'}</div>
                <div className="text-[11px] text-outline font-mono">Avg Score: {stats?.avgSkillScore ?? 0}/10</div>
              </div>
            </div>

            {/* 7-Day Activity Chart */}
            <div className="bg-surface border border-outline-var/20 rounded-md p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-syne font-bold text-sm uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" /> 7-Day Platform Growth Pulse
                </h3>
              </div>

              <div className="h-64 w-full pt-4">
                {stats?.sparklines ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.sparklines}>
                      <defs>
                        <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="postGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#656d84" fontSize={10} tickLine={false} />
                      <YAxis stroke="#656d84" fontSize={10} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#13192b', borderColor: '#232b43', borderRadius: 4, fontSize: 11 }}
                      />
                      <Area type="monotone" dataKey="users" name="New Users" stroke="#f59e0b" fill="url(#userGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="posts" name="New Posts" stroke="#2dd4bf" fill="url(#postGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-text-muted">Loading chart data...</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: USERS GOVERNANCE ── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-surface border border-outline-var/20 rounded-md p-4 flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3 top-3 text-outline" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user by name, email, college, or github handle..."
                  className="w-full bg-surface-mid border border-outline-var/30 rounded-xs py-2 pl-9 pr-3 text-xs text-text-primary outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-surface-mid border border-outline-var/30 rounded-xs py-2 px-3 text-xs text-text-primary outline-none"
                >
                  <option value="ALL">All Roles</option>
                  <option value="STUDENT">Student</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="RECRUITER">Recruiter</option>
                  <option value="ADMIN">Admin</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-surface-mid border border-outline-var/30 rounded-xs py-2 px-3 text-xs text-text-primary outline-none"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-surface border border-outline-var/20 rounded-md overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-outline-var/20 bg-surface-mid text-[10px] font-syne font-bold uppercase tracking-wider text-outline">
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">GitHub</th>
                      <th className="p-3.5">Verified Skills</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-var/15">
                    {usersList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-text-muted">
                          No users found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-surface-mid/40 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-surface-mid border border-outline-var/30 overflow-hidden flex items-center justify-center font-bold text-[11px] text-primary">
                                {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.name?.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-text-primary flex items-center gap-1.5">
                                  {u.name}
                                  {u.role === 'ADMIN' && <Lock size={10} className="text-primary" />}
                                </div>
                                <div className="text-[10px] text-text-muted font-mono">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-syne font-bold uppercase border bg-surface-mid border-outline-var/30 text-text-muted">
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-outline">
                            {u.github ? `@${u.github.replace(/^https?:\/\/github\.com\//, '')}` : '—'}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-accent font-bold">
                            🛡️ {u.verifiedSkillCount || 0}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-syne font-bold uppercase border ${
                                u.isActive
                                  ? 'bg-accent/10 text-accent border-accent/20'
                                  : 'bg-error/10 text-error border-error/30'
                              }`}
                            >
                              {u.isActive ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            {u.role !== 'ADMIN' && (
                              <>
                                <button
                                  onClick={() => handleToggleSuspend(u.id)}
                                  disabled={actionLoading === u.id}
                                  className={`px-2.5 py-1 text-[10px] font-syne font-bold uppercase rounded-xs border transition-colors ${
                                    u.isActive
                                      ? 'border-error/30 text-error hover:bg-error/10'
                                      : 'border-accent/30 text-accent hover:bg-accent/10'
                                  }`}
                                >
                                  {u.isActive ? <span className="flex items-center gap-1"><UserX size={11} /> Suspend</span> : <span className="flex items-center gap-1"><UserCheck size={11} /> Unsuspend</span>}
                                </button>

                                <button
                                  onClick={() => setDeleteTargetUser(u)}
                                  className="p-1 text-text-muted hover:text-error transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: MODERATION REPORTS ── */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-outline-var/20 pb-3">
              {['PENDING', 'RESOLVED', 'DISMISSED', 'ALL'].map((st) => (
                <button
                  key={st}
                  onClick={() => setReportStatusFilter(st)}
                  className={`px-3 py-1 text-[10px] font-syne font-bold uppercase rounded-xs border transition-colors ${
                    reportStatusFilter === st
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface text-text-muted border-outline-var/30 hover:text-text-primary'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {reportsList.length === 0 ? (
              <div className="text-center py-16 bg-surface border border-outline-var/20 rounded-md p-8">
                <CheckCircle2 size={36} className="mx-auto text-accent mb-2" />
                <h3 className="font-syne font-bold text-sm text-text-primary uppercase">No Active Reports</h3>
                <p className="text-xs text-text-muted mt-1">Platform feed and communications are completely clean.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportsList.map((r) => (
                  <div key={r.id} className="bg-surface border border-outline-var/20 rounded-md p-5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-syne font-bold uppercase text-error flex items-center gap-1">
                        <AlertTriangle size={12} /> Reason: {r.reason}
                      </span>
                      <span className="text-[9px] font-mono text-outline">
                        {new Date(r.reportedAt).toLocaleString()}
                      </span>
                    </div>

                    {r.contentPreview && (
                      <div className="p-3 bg-surface-mid border border-outline-var/25 rounded-xs text-xs italic text-text-muted">
                        &ldquo;{r.contentPreview}&rdquo;
                      </div>
                    )}

                    <div className="text-[11px] text-text-muted flex items-center justify-between">
                      <span>Reporter: {r.reporter?.name || 'Anonymous'}</span>
                      <span className="font-bold uppercase text-[9px] px-2 py-0.5 bg-outline-var/20 rounded-full">
                        Status: {r.status}
                      </span>
                    </div>

                    {r.status === 'PENDING' && (
                      <div className="pt-2 border-t border-outline-var/15 flex items-center gap-2">
                        <button
                          onClick={() => handleResolveReport(r.id, 'DISMISS')}
                          disabled={actionLoading === r.id}
                          className="flex-1 py-1.5 bg-surface-mid hover:bg-surface border border-outline-var/30 text-text-muted text-[10px] font-syne font-bold uppercase rounded-xs transition-colors"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleResolveReport(r.id, 'REMOVE_CONTENT')}
                          disabled={actionLoading === r.id}
                          className="flex-1 py-1.5 bg-error/10 hover:bg-error/20 border border-error/30 text-error text-[10px] font-syne font-bold uppercase rounded-xs transition-colors"
                        >
                          Remove Post
                        </button>
                        <button
                          onClick={() => handleResolveReport(r.id, 'SUSPEND_USER')}
                          disabled={actionLoading === r.id}
                          className="flex-1 py-1.5 bg-error text-white hover:opacity-90 text-[10px] font-syne font-bold uppercase rounded-xs transition-opacity"
                        >
                          Suspend User
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: N.E.X.U.S. AI ENGINE ── */}
        {activeTab === 'nexus' && (
          <div className="space-y-6">
            <AntifragileAdmin />
          </div>
        )}

        {/* ── TAB 5: SYSTEM HEALTH ── */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface border border-outline-var/20 rounded-md p-5 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
                    <Database size={13} className="text-primary" /> PostgreSQL Database
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                </div>
                <div className="text-xl font-bold font-syne text-text-primary">
                  {healthData?.checks?.database ? 'Online / Connected' : 'Degraded'}
                </div>
                <div className="text-[10px] font-mono text-outline">
                  Latency: {healthData?.checks?.latencyMs ?? 0}ms
                </div>
              </div>

              <div className="bg-surface border border-outline-var/20 rounded-md p-5 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
                    <Server size={13} className="text-accent" /> In-Memory Cache
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                </div>
                <div className="text-xl font-bold font-syne text-text-primary">Operational</div>
                <div className="text-[10px] font-mono text-outline">Cluster Status: Ready</div>
              </div>

              <div className="bg-surface border border-outline-var/20 rounded-md p-5 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
                    <Clock size={13} className="text-primary" /> Process Uptime
                  </span>
                </div>
                <div className="text-xl font-bold font-syne text-text-primary">
                  {healthData?.uptime || '—'}
                </div>
                <div className="text-[10px] font-mono text-outline">
                  Heap: {healthData?.memory?.heapUsedMb ?? 0}MB / {healthData?.memory?.heapTotalMb ?? 0}MB
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete User Modal */}
      {deleteTargetUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-syne">
          <div className="bg-surface border border-outline-var/30 p-6 rounded-md max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-error uppercase tracking-wider flex items-center gap-2">
              <Trash2 size={16} /> Confirm Permanent Deletion
            </h3>
            <p className="text-xs text-text-muted font-outfit leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-text-primary">{deleteTargetUser.name}</strong>? This action cascades across all squads, posts, and verification scores and cannot be reversed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetUser(null)}
                className="px-4 py-2 bg-surface-mid border border-outline-var/30 text-text-muted text-xs font-bold uppercase rounded-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={actionLoading === deleteTargetUser.id}
                className="px-4 py-2 bg-error text-white text-xs font-bold uppercase rounded-xs hover:opacity-90"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SkillSphere Official Account Switcher Modal */}
      {showOfficialModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-outfit">
          <div className="bg-surface border border-outline-var/30 p-6 rounded-md max-w-md w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => {
                setShowOfficialModal(false);
                setOfficialPassword('');
              }}
              className="absolute top-4 right-4 text-outline hover:text-text-primary"
            >
              <X size={16} />
            </button>

            <div className="space-y-1">
              <span className="font-syne text-[10px] font-bold tracking-wider uppercase text-primary flex items-center gap-1.5">
                <Sparkles size={12} /> System Escalation
              </span>
              <h3 className="text-lg font-bold font-syne text-text-primary">
                Switch to SkillSphere Official
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Enter the master system authorization key to switch your active session to the verified <strong>SkillSphere</strong> platform account for official squad postings and network updates.
              </p>
            </div>

            <form onSubmit={handleSwitchToOfficial} className="space-y-4 pt-1">
              <div>
                <label className="block font-syne text-[10px] font-bold uppercase tracking-wider text-outline mb-1">
                  Master Password Key
                </label>
                <div className="relative">
                  <KeyRound size={14} className="absolute left-3 top-3 text-outline" />
                  <input
                    type="password"
                    value={officialPassword}
                    onChange={(e) => setOfficialPassword(e.target.value)}
                    placeholder="Enter official master password..."
                    className="w-full bg-surface-mid border border-outline-var/40 rounded-xs py-2 pl-9 pr-3 text-xs text-text-primary outline-none focus:border-primary/60"
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xs text-[11px] text-text-muted space-y-1">
                <p className="font-semibold text-primary">Security Notice:</p>
                <p>• Logging out from the navbar will immediately exit the official account and return you to standard authentication.</p>
                <p>• This account is exempted from personal GitHub linking checks.</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowOfficialModal(false);
                    setOfficialPassword('');
                  }}
                  className="flex-1 py-2.5 border border-outline-var/30 text-text-muted font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-surface-mid"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSwitchingOfficial}
                  className="flex-1 py-2.5 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-secondary-bright transition-all disabled:opacity-50"
                >
                  {isSwitchingOfficial ? 'Authorizing...' : 'Switch Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
