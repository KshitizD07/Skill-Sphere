import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../../api';
import { COLLEGES } from '../../data/colleges';
import {
  Shield, Lock, User, Mail, ArrowRight,
  GraduationCap, Cpu, Building2
} from 'lucide-react';

export default function AuthPage({ onLogin }) {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'STUDENT', college: ''
  });
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  // Read mode from navigation state (login vs register)
  useEffect(() => {
    setIsLogin(location.state?.mode !== 'register');
    setError('');
  }, [location]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/auth/login' : '/auth/register';

    try {
      const res = await API.post(endpoint, formData);

      // Normalise user shape across login + register responses
      const userData = res.data.user || {
        id: res.data.userId,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        college: formData.college,
      };

      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      localStorage.setItem('user_data', JSON.stringify(userData));

      onLogin(userData);

      // New users go to profile setup; returning users go to dashboard
      const destination = isLogin
        ? (location.state?.from?.pathname || '/dashboard')
        : '/my-profile';

      navigate(destination, { replace: true });

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Authentication failed. Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isAlumni = formData.role === 'ALUMNI' && !isLogin;
  const accentColor = isAlumni ? 'purple' : 'cyan';

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-['Rajdhani'] relative overflow-hidden">

      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="bg-gray-900/60 border border-cyan-500/30 p-8 w-full max-w-md relative backdrop-blur-md shadow-[0_0_50px_rgba(0,240,255,0.1)]">

        {/* Corner decorators */}
        <div className="absolute top-0 left-0 w-2 h-2 bg-cyan-500" />
        <div className="absolute top-0 right-0 w-2 h-2 bg-cyan-500" />
        <div className="absolute bottom-0 left-0 w-2 h-2 bg-cyan-500" />
        <div className="absolute bottom-0 right-0 w-2 h-2 bg-cyan-500" />

        <div className="text-center mb-8">
          <Shield className="mx-auto text-cyan-400 mb-2" size={40} />
          <h1 className="text-3xl font-black text-white font-['Orbitron'] tracking-widest">
            {isLogin ? 'SYSTEM_LOGIN' : 'NEW_USER'}
          </h1>
          <p className="text-cyan-500/50 font-mono text-xs mt-1">SECURE_CONNECTION_ESTABLISHED</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 text-red-400 font-mono text-xs">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5 relative z-10">

          {/* Role selector — register only */}
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div
                onClick={() => setFormData({ ...formData, role: 'STUDENT' })}
                className={`cursor-pointer p-3 border rounded-sm flex flex-col items-center justify-center transition-all ${
                  formData.role === 'STUDENT'
                    ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                    : 'bg-black border-gray-700 hover:border-gray-500'
                }`}
              >
                <Cpu size={20} className={formData.role === 'STUDENT' ? 'text-cyan-400' : 'text-gray-500'} />
                <span className={`font-['Orbitron'] text-xs mt-2 font-bold ${formData.role === 'STUDENT' ? 'text-white' : 'text-gray-500'}`}>
                  STUDENT
                </span>
              </div>
              <div
                onClick={() => setFormData({ ...formData, role: 'ALUMNI' })}
                className={`cursor-pointer p-3 border rounded-sm flex flex-col items-center justify-center transition-all ${
                  formData.role === 'ALUMNI'
                    ? 'bg-purple-500/20 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'bg-black border-gray-700 hover:border-gray-500'
                }`}
              >
                <GraduationCap size={20} className={formData.role === 'ALUMNI' ? 'text-purple-400' : 'text-gray-500'} />
                <span className={`font-['Orbitron'] text-xs mt-2 font-bold ${formData.role === 'ALUMNI' ? 'text-white' : 'text-gray-500'}`}>
                  ALUMNI
                </span>
              </div>
            </div>
          )}

          {/* Register-only fields */}
          {!isLogin && (
            <>
              <div className="relative group">
                <User className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="OPERATOR_NAME"
                  className="w-full bg-black border border-gray-700 text-cyan-400 pl-10 p-3 focus:border-cyan-400 outline-none font-mono"
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="relative group">
                <Building2 className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                <select
                  required
                  className="w-full bg-black border border-gray-700 text-cyan-400 pl-10 p-3 focus:border-cyan-500 outline-none font-mono text-sm appearance-none cursor-pointer"
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                  value={formData.college}
                >
                  <option value="">[ SELECT_INSTITUTION ]</option>
                  {COLLEGES && COLLEGES.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Email */}
          <div className="relative group">
            <Mail className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
            <input
              type="email"
              placeholder="EMAIL_ADDRESS"
              className="w-full bg-black border border-gray-700 text-cyan-400 pl-10 p-3 focus:border-cyan-400 outline-none font-mono"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          {/* Password */}
          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
            <input
              type="password"
              placeholder="ACCESS_CODE"
              className="w-full bg-black border border-gray-700 text-cyan-400 pl-10 p-3 focus:border-cyan-400 outline-none font-mono"
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-black font-['Orbitron'] py-3 text-lg transition-all flex justify-center items-center gap-2 ${
              isAlumni
                ? 'bg-purple-600 text-white hover:bg-purple-500 disabled:bg-purple-900'
                : 'bg-cyan-600 text-black hover:bg-cyan-400 disabled:bg-cyan-900'
            }`}
          >
            {loading ? 'AUTHENTICATING...' : isLogin ? 'JACK_IN' : 'INITIALIZE'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p
            className="text-gray-500 cursor-pointer hover:text-cyan-400 transition-colors font-mono text-xs tracking-wider"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? '[ ACCESS_DENIED? CREATE_ID ]' : '[ ALREADY_REGISTERED? LOGIN ]'}
          </p>
        </div>
      </div>
    </div>
  );
}