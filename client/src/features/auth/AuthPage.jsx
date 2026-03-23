import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../../api';
import { COLLEGES } from '../../data/colleges';
import {
  Shield, Lock, User, Mail, ArrowRight,
  GraduationCap, Cpu, Building2, Check, X, RefreshCw
} from 'lucide-react';

const PASSWORD_RULES = [
  { id: 'length',  label: 'At least 8 characters',         test: p => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter (A-Z)',     test: p => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'One lowercase letter (a-z)',     test: p => /[a-z]/.test(p) },
  { id: 'number',  label: 'One number (0-9)',               test: p => /\d/.test(p) },
  { id: 'special', label: 'One special character (!@#$…)',  test: p => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export default function AuthPage({ onLogin }) {
  const [formData, setFormData] = useState({ name:'', email:'', password:'', role:'STUDENT', college:'' });
  const [isLogin, setIsLogin]   = useState(true);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // OTP step state
  const [step, setStep]         = useState('form'); // 'form' | 'otp'
  const [otp, setOtp]           = useState(['','','','','','']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsLogin(location.state?.mode !== 'register');
    setError('');
    setStep('form');
    setOtp(['','','','','','']);
    setFormData({ name:'', email:'', password:'', role:'STUDENT', college:'' });
  }, [location]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const passwordChecks = PASSWORD_RULES.map(r => ({ ...r, passed: r.test(formData.password) }));
  const passwordStrong = passwordChecks.every(r => r.passed);
  const strengthScore  = passwordChecks.filter(r => r.passed).length;
  const strengthColor  = strengthScore <= 2 ? 'bg-red-500' : strengthScore <= 3 ? 'bg-yellow-500' : strengthScore === 4 ? 'bg-blue-500' : 'bg-green-500';
  const strengthLabel  = ['','WEAK','FAIR','FAIR','GOOD','STRONG'][strengthScore];

  // ── Step 1: submit form ────────────────────────────────────────────────────
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin && !passwordStrong) {
      setError('Password does not meet all requirements.');
      return;
    }

    setLoading(true);

    if (isLogin) {
      // Login — no OTP needed
      try {
        const res = await API.post('/auth/login', { email: formData.email, password: formData.password });
        const userData = res.data.user;
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user_data', JSON.stringify(userData));
        onLogin(userData);
        navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid email or password');
      }
      setLoading(false);
      return;
    }

    // Register — send OTP first
    try {
      await API.post('/auth/send-otp', { email: formData.email });
      setStep('otp');
      setResendCooldown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code');
    }
    setLoading(false);
  };

  // ── OTP input handling ─────────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  // ── Step 2: verify OTP + create account ───────────────────────────────────
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length < 6) { setError('Enter all 6 digits'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await API.post('/auth/register', { ...formData, otp: otpValue });
      const userData = res.data.user;
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      onLogin(userData);
      navigate('/my-profile', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
      setOtp(['','','','','','']);
      otpRefs.current[0]?.focus();
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    try {
      await API.post('/auth/send-otp', { email: formData.email });
      setResendCooldown(60);
      setOtp(['','','','','','']);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    }
  };

  const isAlumni = formData.role === 'ALUMNI' && !isLogin;

  // ── OTP entry screen ───────────────────────────────────────────────────────
  if (step === 'otp') return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-['Rajdhani'] relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="bg-gray-900/60 border border-cyan-500/30 p-8 w-full max-w-md relative backdrop-blur-md">
        <div className="absolute top-0 left-0 w-2 h-2 bg-cyan-500" />
        <div className="absolute top-0 right-0 w-2 h-2 bg-cyan-500" />
        <div className="absolute bottom-0 left-0 w-2 h-2 bg-cyan-500" />
        <div className="absolute bottom-0 right-0 w-2 h-2 bg-cyan-500" />

        <div className="text-center mb-8">
          <Mail className="mx-auto text-cyan-400 mb-2" size={40} />
          <h1 className="text-2xl font-black text-white font-['Orbitron'] tracking-widest">VERIFY_IDENTITY</h1>
          <p className="text-gray-400 font-mono text-xs mt-2">
            Code sent to <span className="text-cyan-400">{formData.email}</span>
          </p>
          <p className="text-gray-600 font-mono text-xs mt-1">Check your inbox (and spam folder)</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 text-red-400 font-mono text-xs flex items-start gap-2">
            <X size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <form onSubmit={handleOtpSubmit} className="space-y-6">
          {/* 6-digit OTP boxes */}
          <div className="flex gap-3 justify-center" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => otpRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                className="w-12 h-14 text-center text-2xl font-black text-cyan-400 bg-black border-2 border-gray-700 focus:border-cyan-400 outline-none font-['Orbitron'] transition-colors"
              />
            ))}
          </div>

          <button type="submit" disabled={loading || otp.join('').length < 6}
            className="w-full font-black font-['Orbitron'] py-3 text-lg bg-cyan-600 text-black hover:bg-cyan-400 transition flex justify-center items-center gap-2 disabled:opacity-50">
            {loading ? 'VERIFYING...' : 'CONFIRM_IDENTITY'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={() => { setStep('form'); setError(''); }}
            className="text-gray-600 hover:text-gray-400 font-mono text-xs transition">
            ← BACK
          </button>
          <button onClick={handleResend} disabled={resendCooldown > 0}
            className="flex items-center gap-1 text-xs font-mono transition disabled:text-gray-700 text-gray-500 hover:text-cyan-400">
            <RefreshCw size={12} />
            {resendCooldown > 0 ? `RESEND_IN_${resendCooldown}s` : 'RESEND_CODE'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Registration / Login form ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-['Rajdhani'] relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="bg-gray-900/60 border border-cyan-500/30 p-8 w-full max-w-md relative backdrop-blur-md shadow-[0_0_50px_rgba(0,240,255,0.1)]">
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

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 text-red-400 font-mono text-xs flex items-start gap-2">
            <X size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-5 relative z-10">

          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {['STUDENT','ALUMNI'].map(r => (
                  <div key={r} onClick={() => setFormData({...formData, role: r})}
                    className={`cursor-pointer p-3 border rounded-sm flex flex-col items-center justify-center transition-all ${
                      formData.role === r
                        ? r === 'STUDENT' ? 'bg-cyan-500/20 border-cyan-400' : 'bg-purple-500/20 border-purple-400'
                        : 'bg-black border-gray-700 hover:border-gray-500'
                    }`}>
                    {r === 'STUDENT'
                      ? <Cpu size={20} className={formData.role === r ? 'text-cyan-400' : 'text-gray-500'} />
                      : <GraduationCap size={20} className={formData.role === r ? 'text-purple-400' : 'text-gray-500'} />}
                    <span className={`font-['Orbitron'] text-xs mt-2 font-bold ${formData.role === r ? 'text-white' : 'text-gray-500'}`}>{r}</span>
                  </div>
                ))}
              </div>

              <div className="relative group">
                <User className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                <input type="text" placeholder="OPERATOR_NAME" required
                  className="w-full bg-black border border-gray-700 text-cyan-400 pl-10 p-3 focus:border-cyan-400 outline-none font-mono"
                  onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="relative group">
                <Building2 className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                <select required value={formData.college} onChange={e => setFormData({...formData, college: e.target.value})}
                  className="w-full bg-black border border-gray-700 text-cyan-400 pl-10 p-3 focus:border-cyan-500 outline-none font-mono text-sm appearance-none cursor-pointer">
                  <option value="">[ SELECT_INSTITUTION ]</option>
                  {COLLEGES && COLLEGES.map((c,i) => <option key={i} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          )}

          <div className="relative group">
            <Mail className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
            <input type="email" placeholder="EMAIL_ADDRESS" required
              className="w-full bg-black border border-gray-700 text-cyan-400 pl-10 p-3 focus:border-cyan-400 outline-none font-mono"
              onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
            <input type="password" placeholder="ACCESS_CODE" required
              className="w-full bg-black border border-gray-700 text-cyan-400 pl-10 p-3 focus:border-cyan-400 outline-none font-mono"
              onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          {!isLogin && formData.password && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1 bg-gray-800 rounded">
                  <div className={`h-1 rounded transition-all duration-300 ${strengthColor}`} style={{ width: `${(strengthScore/5)*100}%` }} />
                </div>
                <span className={`text-[10px] font-mono font-bold ${strengthScore <= 2 ? 'text-red-500' : strengthScore <= 3 ? 'text-yellow-500' : strengthScore === 4 ? 'text-blue-400' : 'text-green-400'}`}>
                  {strengthLabel}
                </span>
              </div>
              <div className="bg-black/50 border border-gray-800 p-3 space-y-1">
                {passwordChecks.map(rule => (
                  <div key={rule.id} className="flex items-center gap-2 text-xs font-mono">
                    {rule.passed ? <Check size={12} className="text-green-400 shrink-0" /> : <X size={12} className="text-gray-600 shrink-0" />}
                    <span className={rule.passed ? 'text-green-400' : 'text-gray-500'}>{rule.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || (!isLogin && !passwordStrong && formData.password.length > 0)}
            className={`w-full font-black font-['Orbitron'] py-3 text-lg transition-all flex justify-center items-center gap-2 ${
              isAlumni
                ? 'bg-purple-600 text-white hover:bg-purple-500 disabled:bg-purple-900 disabled:opacity-50'
                : 'bg-cyan-600 text-black hover:bg-cyan-400 disabled:bg-cyan-900 disabled:opacity-50'
            }`}>
            {loading ? (isLogin ? 'AUTHENTICATING...' : 'SENDING_CODE...') : (isLogin ? 'JACK_IN' : 'SEND_VERIFY_CODE')}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 cursor-pointer hover:text-cyan-400 transition-colors font-mono text-xs tracking-wider"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? '[ ACCESS_DENIED? CREATE_ID ]' : '[ ALREADY_REGISTERED? LOGIN ]'}
          </p>
        </div>
      </div>
    </div>
  );
}