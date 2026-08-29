import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Activity, Database, BarChart3, Settings2 } from 'lucide-react';
import API from '../../api';
import { useToast, ToastContainer } from '../../shared/components/Toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

export default function AntifragileAdmin() {
  const navigate = useNavigate();
  const toast = useToast();
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
  
  const ADMIN_EMAILS = [
    'kshitizd171@gmail.com',
    'kshitizd777@gmail.com',
  ];
  
  const isAuthorized =
    currentUser.role === 'ADMIN' ||
    (currentUser.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase().trim()));

  const [activeTab, setActiveTab] = useState('strategies');
  const [strategies, setStrategies] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stratRes, decRes] = await Promise.all([
        API.get('/antifragile/strategies'),
        API.get('/antifragile/decisions/recent?limit=50')
      ]);
      setStrategies(stratRes.data || []);
      setDecisions(decRes.data || []);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized, fetchData]);

  const handleStateChange = async (id, currentState) => {
    const action = currentState === 'SHADOW' ? 'promote' : 'demote';
    try {
      await API.post(`/antifragile/strategies/${id}/${action}`, { reason: 'Admin panel toggle' });
      toast.success(`Strategy ${action}d successfully`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  const handleInfluenceChange = async (id, level) => {
    try {
      await API.post(`/antifragile/strategies/${id}/influence`, { level, reason: 'Admin panel adjustment' });
      toast.success('Influence updated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center font-outfit">
        <div className="text-center bg-surface border border-error-container/30 rounded-md p-10 max-w-sm w-full">
          <Shield className="mx-auto mb-4 text-error" size={36} />
          <h2 className="text-lg font-bold text-error mb-2 tracking-tight">Access Restricted</h2>
          <p className="text-outline text-sm mb-6">You do not have permission to view this page.</p>
          <button onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 border border-outline-var/40 rounded-xs text-text-muted hover:border-primary/40 hover:text-primary transition-all font-syne font-bold text-[10px] uppercase tracking-[0.1em]">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Analytics Chart Data prep
  const consensusRateData = [
    { name: 'Consensus', value: decisions.filter(d => d.wasConsensus).length },
    { name: 'Exploration', value: decisions.filter(d => d.wasRandom).length }
  ];

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit p-4 md:p-8">
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')}
            className="p-2 border border-outline-var/30 rounded-xs hover:border-primary/40 text-outline hover:text-primary transition-all">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-xs border border-accent/20">
              <Activity className="text-accent" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-text-primary tracking-tight">N.E.X.U.S. Engine Control</h1>
              <p className="font-syne text-[9px] font-bold tracking-[0.12em] uppercase text-outline">Antifragile Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-outline-var/20 pb-px">
          {[
            { id: 'strategies', label: 'Strategies', icon: Settings2 },
            { id: 'decisions', label: 'Decision Log', icon: Database },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-syne font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center"><div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="py-4">
            
            {activeTab === 'strategies' && (
              <div className="bg-surface border border-outline-var/20 rounded-md overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-mid border-b border-outline-var/20 font-syne text-[10px] uppercase tracking-wider text-outline">
                    <tr>
                      <th className="px-4 py-3">Strategy</th>
                      <th className="px-4 py-3">State</th>
                      <th className="px-4 py-3">Influence</th>
                      <th className="px-4 py-3">Performance</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-var/10">
                    {strategies.map(s => (
                      <tr key={s.id} className="hover:bg-surface-mid/50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-text-primary">{s.displayName}</div>
                          <div className="text-[10px] text-text-muted font-mono mt-0.5">{s.name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-xs text-[10px] font-syne font-bold uppercase tracking-wider ${
                            s.state === 'ACTIVE' ? 'bg-primary/10 text-primary border border-primary/20' : 
                            s.state === 'SHADOW' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                            'bg-error/10 text-error border border-error/20'
                          }`}>
                            {s.state}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select 
                            value={s.influenceLevel}
                            onChange={(e) => handleInfluenceChange(s.id, e.target.value)}
                            disabled={s.state !== 'ACTIVE'}
                            className="bg-bg-base border border-outline-var/30 rounded px-2 py-1 text-xs outline-none focus:border-secondary-bright disabled:opacity-50"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted">
                          Wins: {s.consensusWins + s.soloWins} / {s.totalDecisions}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(s.state === 'ACTIVE' || s.state === 'SHADOW') && (
                            <button
                              onClick={() => handleStateChange(s.id, s.state)}
                              className="px-3 py-1 bg-surface-mid hover:bg-outline-var/20 border border-outline-var/30 rounded-xs font-syne text-[10px] font-bold uppercase transition-colors"
                            >
                              {s.state === 'ACTIVE' ? 'Demote to Shadow' : 'Promote to Active'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'decisions' && (
              <div className="space-y-3">
                {decisions.map(d => (
                  <details key={d.id} className="bg-surface border border-outline-var/20 rounded-md group">
                    <summary className="px-4 py-3 cursor-pointer list-none flex items-center justify-between hover:bg-surface-mid/50">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${d.wasConsensus ? 'bg-primary' : 'bg-amber-500'}`} />
                        <span className="font-bold text-sm text-text-primary">{d.squad?.title || 'Unknown Squad'}</span>
                        <span className="text-xs text-text-muted">→ {d.selectedUser?.name || 'Unknown Candidate'}</span>
                      </div>
                      <div className="text-xs text-outline">{new Date(d.timestamp).toLocaleString()}</div>
                    </summary>
                    <div className="px-4 py-3 border-t border-outline-var/10 bg-bg-base text-xs font-mono text-text-muted overflow-x-auto">
                      <pre>{JSON.stringify({
                        wasConsensus: d.wasConsensus,
                        consensusCount: d.consensusCount,
                        strategyVotes: d.strategyVotes
                      }, null, 2)}</pre>
                    </div>
                  </details>
                ))}
                {decisions.length === 0 && <div className="p-8 text-center text-text-muted">No recent decisions found.</div>}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface border border-outline-var/20 rounded-md p-4">
                  <h3 className="text-sm font-syne font-bold uppercase tracking-wider mb-4">Match Methodology</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={consensusRateData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2c303f" />
                        <XAxis dataKey="name" stroke="#656d84" fontSize={12} />
                        <YAxis stroke="#656d84" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#13151c', borderColor: '#2c303f' }} />
                        <Bar dataKey="value" fill="#04d9ff" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-surface border border-outline-var/20 rounded-md p-4">
                  <h3 className="text-sm font-syne font-bold uppercase tracking-wider mb-4">Acceptance Rate over Time</h3>
                  <div className="flex items-center justify-center h-64 text-outline text-sm">
                    (Time-series data aggregation required)
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}