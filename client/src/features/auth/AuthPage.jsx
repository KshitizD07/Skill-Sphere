import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../../api';
import { COLLEGES } from '../../data/colleges';
import {
  Shield, Lock, User, Mail, ArrowRight,
  GraduationCap, Briefcase, Building2, Check, X, RefreshCw,
  Eye, EyeOff, KeyRound, Zap
} from 'lucide-react';

const PASSWORD_RULES = [
  { id: 'length',  label: 'At least 8 characters',         test: p => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter (A-Z)',     test: p => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'One lowercase letter (a-z)',     test: p => /[a-z]/.test(p) },
  { id: 'number',  label: 'One number (0-9)',               test: p => /\d/.test(p) },
  { id: 'special', label: 'One special character (!@#$…)',  test: p => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export default function AuthPage({ onLogin }) {
  const [formData, setFormData] = useState({ name:'', email:'', password:'', confirmPassword:'', role:'STUDENT', college:'' });
  const [isLogin, setIsLogin]   = useState(true);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const [step, setStep]         = useState('form');
  const [otp, setOtp]           = useState(['','','','','','']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  // Forgot password state
  const [forgotEmail, setForgotEmail]       = useState('');
  const [forgotOtp, setForgotOtp]           = useState(['','','','','','']);
  const [newPassword, setNewPassword]       = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showNewPw, setShowNewPw]           = useState(false);
  const [showNewPwConfirm, setShowNewPwConfirm] = useState(false);
  const forgotOtpRefs = useRef([]);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsLogin(location.state?.mode !== 'register');
    
    // Check for reason in URL
    const params = new URLSearchParams(location.search);
    if (params.get('reason') === 'github_required') {
      setError('Account deleted: Linking GitHub is mandatory to ensure quality profiles. Please register again and link your GitHub.');
    } else {
      setError('');
    }

    setStep('form');
    setOtp(['','','','','','']);
    setFormData({ name:'', email:'', password:'', confirmPassword:'', role:'STUDENT', guestPersona:'STUDENT', college:'' });
    setForgotEmail(''); setNewPassword(''); setNewPasswordConfirm('');
    setForgotOtp(['','','','','','']);
    setShowPassword(false); setShowConfirm(false);
  }, [location]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const passwordChecks = PASSWORD_RULES.map(r => ({ ...r, passed: r.test(formData.password) }));
  const passwordStrong = passwordChecks.every(r => r.passed);
  const strengthScore  = passwordChecks.filter(r => r.passed).length;
  const strengthColor  = strengthScore <= 2 ? 'bg-[#ffb4ab]' : strengthScore <= 3 ? 'bg-yellow-400' : strengthScore === 4 ? 'bg-[#adc6ff]' : 'bg-[#89f5e7]';
  const strengthLabel  = ['','Weak','Fair','Fair','Good','Strong'][strengthScore];

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isLogin && !passwordStrong) { setError('Password does not meet all requirements.'); return; }
    if (!isLogin && formData.password !== formData.confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    if (isLogin) {
      try {
        const res = await API.post('/auth/login', { email: formData.email, password: formData.password });
        const user = res.data.user;
        onLogin(user);
        
        // If github is missing, force them to profile page first
        if (!user.github) {
          navigate('/my-profile', { replace: true });
        } else {
          navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
        }
      } catch (err) { setError(err.response?.data?.message || 'Invalid email or password.'); }
      setLoading(false);
      return;
    }
    try {
      await API.post('/auth/send-otp', { email: formData.email });
      setStep('otp');
      setResendCooldown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) { setError(err.response?.data?.message || 'Failed to send verification code.'); }
    setLoading(false);
  };

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) { otpRefs.current[index - 1]?.focus(); }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) { setOtp(pasted.split('')); otpRefs.current[5]?.focus(); }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length < 6) { setError('Please enter all 6 digits.'); return; }
    setLoading(true); setError('');
    try {
      const res = await API.post('/auth/register', { ...formData, otp: otpValue });
      onLogin(res.data.user);
      navigate('/my-profile', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
      setOtp(['','','','','','']); otpRefs.current[0]?.focus();
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    try {
      await API.post('/auth/send-otp', { email: formData.email });
      setResendCooldown(60); setOtp(['','','','','','']); otpRefs.current[0]?.focus();
    } catch (err) { setError(err.response?.data?.message || 'Failed to resend code.'); }
  };

  // ── Forgot Password Handlers ──
  const handleForgotSubmitEmail = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: forgotEmail });
      setStep('forgot-otp'); setResendCooldown(60);
      setTimeout(() => forgotOtpRefs.current[0]?.focus(), 100);
    } catch (err) { setError(err.response?.data?.message || 'Failed to send code.'); }
    setLoading(false);
  };
  const handleForgotOtpChange = (i, v) => {
    const d = v.replace(/\D/g,'').slice(-1); const n = [...forgotOtp]; n[i]=d; setForgotOtp(n);
    if (d && i<5) forgotOtpRefs.current[i+1]?.focus();
  };
  const handleForgotOtpKeyDown = (i, e) => { if (e.key==='Backspace' && !forgotOtp[i] && i>0) forgotOtpRefs.current[i-1]?.focus(); };
  const handleForgotOtpPaste = (e) => { const p=e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6); if(p.length===6){setForgotOtp(p.split(''));forgotOtpRefs.current[5]?.focus();} };
  const handleForgotVerifyOtp = (e) => { e.preventDefault(); if(forgotOtp.join('').length<6){setError('Enter all 6 digits.');return;} setStep('forgot-newpw'); setError(''); };
  const handleResetPassword = async (e) => {
    e.preventDefault(); setError('');
    const pwChecks = PASSWORD_RULES.every(r => r.test(newPassword));
    if (!pwChecks) { setError('Password does not meet all requirements.'); return; }
    if (newPassword !== newPasswordConfirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await API.post('/auth/reset-password', { email: forgotEmail, otp: forgotOtp.join(''), newPassword });
      setStep('form'); setIsLogin(true); setError('');
      alert('Password reset successfully! Please sign in.');
    } catch (err) { setError(err.response?.data?.message || 'Reset failed.'); }
    setLoading(false);
  };
  const handleForgotResend = async () => {
    if (resendCooldown>0) return; setError('');
    try { await API.post('/auth/forgot-password',{email:forgotEmail}); setResendCooldown(60); setForgotOtp(['','','','','','']); forgotOtpRefs.current[0]?.focus(); }
    catch(err){ setError(err.response?.data?.message||'Failed to resend.'); }
  };

  const newPwChecks = PASSWORD_RULES.map(r => ({ ...r, passed: r.test(newPassword) }));

  const cardBase = "min-h-screen bg-[#0b1326] flex items-center justify-center p-4 font-['Manrope']";
  const panelBase = "bg-[#171f33] border border-[#434655]/30 rounded-md p-8 w-full max-w-md shadow-2xl shadow-[#0b1326]/80";
  const inputBase = "w-full bg-[#131b2e] border border-[#434655]/40 text-[#dae2fd] pl-10 p-3 rounded-xs focus:border-[#adc6ff]/60 outline-none font-['Manrope'] text-sm transition-colors placeholder-[#434655]";
  const labelBase = "font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#8d90a0] block mb-1.5";

  // ── Forgot: Enter Email ──
  if (step === 'forgot-email') return (
    <div className={cardBase}><div className={panelBase}>
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-[#adc6ff]/10 border border-[#adc6ff]/20 rounded-md flex items-center justify-center mx-auto mb-4"><KeyRound size={22} className="text-[#adc6ff]" /></div>
        <h1 className="text-xl font-extrabold text-[#dae2fd] tracking-tight mb-1">Reset Password</h1>
        <p className="text-[#8d90a0] text-sm">Enter your email to receive a verification code.</p>
      </div>
      {error && <div className="mb-4 p-3 bg-[#93000a]/15 border border-[#93000a]/40 text-[#ffb4ab] text-xs flex items-start gap-2 rounded-xs"><X size={13} className="shrink-0 mt-0.5" /> {error}</div>}
      <form onSubmit={handleForgotSubmitEmail} className="space-y-4" autoComplete="off">
        <div className="relative group">
          <Mail className="absolute left-3 top-3.5 text-[#656d84] group-focus-within:text-[#adc6ff] transition-colors" size={16} />
          <input type="email" placeholder="you@example.com" required value={forgotEmail} autoComplete="off"
            className={inputBase} onChange={e => setForgotEmail(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="w-full font-['Space_Grotesk'] font-bold py-3 text-sm bg-gradient-to-r from-[#adc6ff] to-[#0f69dc] text-[#002e6a] hover:opacity-90 transition-all flex justify-center items-center gap-2 rounded-xs disabled:opacity-50 uppercase tracking-[0.1em] active:scale-[0.98]">
          {loading ? 'Sending...' : 'Send Code'} {!loading && <ArrowRight size={16} />}
        </button>
      </form>
      <div className="mt-5 text-center">
        <p className="text-[#8d90a0] cursor-pointer hover:text-[#adc6ff] font-['Space_Grotesk'] text-xs transition-colors"
          onClick={() => { setStep('form'); setError(''); }}>← Back to Sign In</p>
      </div>
    </div></div>
  );

  // ── Forgot: Verify OTP ──
  if (step === 'forgot-otp') return (
    <div className={cardBase}><div className={panelBase}>
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-[#adc6ff]/10 border border-[#adc6ff]/20 rounded-md flex items-center justify-center mx-auto mb-4"><Mail size={22} className="text-[#adc6ff]" /></div>
        <h1 className="text-xl font-extrabold text-[#dae2fd] tracking-tight mb-1">Verify Identity</h1>
        <p className="text-[#8d90a0] text-sm mt-2">Code sent to <span className="text-[#adc6ff] font-medium">{forgotEmail}</span></p>
      </div>
      {error && <div className="mb-4 p-3 bg-[#93000a]/15 border border-[#93000a]/40 text-[#ffb4ab] text-xs flex items-start gap-2 rounded-xs"><X size={13} className="shrink-0 mt-0.5" /> {error}</div>}
      <form onSubmit={handleForgotVerifyOtp} className="space-y-6" autoComplete="off">
        <div className="flex gap-2.5 justify-center" onPaste={handleForgotOtpPaste}>
          {forgotOtp.map((d,i)=>(
            <input key={i} ref={el=>forgotOtpRefs.current[i]=el} type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={e=>handleForgotOtpChange(i,e.target.value)} onKeyDown={e=>handleForgotOtpKeyDown(i,e)} autoComplete="off"
              className="w-11 h-13 text-center text-xl font-extrabold text-[#adc6ff] bg-[#131b2e] border-2 border-[#434655]/40 rounded-xs focus:border-[#adc6ff] outline-none transition-colors" />
          ))}
        </div>
        <button type="submit" disabled={forgotOtp.join('').length<6} className="w-full font-['Space_Grotesk'] font-bold py-3 text-sm bg-gradient-to-r from-[#adc6ff] to-[#0f69dc] text-[#002e6a] hover:opacity-90 transition-all flex justify-center items-center gap-2 rounded-xs disabled:opacity-50 uppercase tracking-[0.1em] active:scale-[0.98]">
          Verify <ArrowRight size={16} />
        </button>
      </form>
      <div className="mt-5 flex items-center justify-between">
        <button onClick={()=>{setStep('forgot-email');setError('');}} className="text-[#8d90a0] hover:text-[#dae2fd] font-['Space_Grotesk'] text-xs transition-colors">← Back</button>
        <button onClick={handleForgotResend} disabled={resendCooldown>0} className="flex items-center gap-1 text-xs font-['Space_Grotesk'] transition-colors disabled:text-[#434655] text-[#8d90a0] hover:text-[#adc6ff]">
          <RefreshCw size={11} /> {resendCooldown>0?`Resend in ${resendCooldown}s`:'Resend code'}
        </button>
      </div>
    </div></div>
  );

  // ── Forgot: New Password ──
  if (step === 'forgot-newpw') return (
    <div className={cardBase}><div className={panelBase}>
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-[#89f5e7]/10 border border-[#89f5e7]/20 rounded-md flex items-center justify-center mx-auto mb-4"><Lock size={22} className="text-[#89f5e7]" /></div>
        <h1 className="text-xl font-extrabold text-[#dae2fd] tracking-tight mb-1">Set New Password</h1>
        <p className="text-[#8d90a0] text-sm">Choose a strong new password for your account.</p>
      </div>
      {error && <div className="mb-4 p-3 bg-[#93000a]/15 border border-[#93000a]/40 text-[#ffb4ab] text-xs flex items-start gap-2 rounded-xs"><X size={13} className="shrink-0 mt-0.5" /> {error}</div>}
      <form onSubmit={handleResetPassword} className="space-y-4" autoComplete="off">
        <div>
          <label className={labelBase}>New Password</label>
          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 text-[#656d84] group-focus-within:text-[#89f5e7] transition-colors" size={16} />
            <input type={showNewPw?'text':'password'} placeholder="New password" required value={newPassword}
              autoComplete="new-password" className={`${inputBase} pr-10`} onChange={e=>setNewPassword(e.target.value)} />
            <button type="button" tabIndex={-1} onClick={()=>setShowNewPw(v=>!v)} className="absolute right-3 top-3.5 text-[#656d84] hover:text-[#adc6ff] transition-colors">
              {showNewPw?<EyeOff size={16}/>:<Eye size={16}/>}
            </button>
          </div>
        </div>
        <div>
          <label className={labelBase}>Confirm New Password</label>
          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 text-[#656d84] group-focus-within:text-[#89f5e7] transition-colors" size={16} />
            <input type={showNewPwConfirm?'text':'password'} placeholder="Re-type new password" required value={newPasswordConfirm}
              autoComplete="new-password" className={`${inputBase} pr-10`} onChange={e=>setNewPasswordConfirm(e.target.value)} />
            <button type="button" tabIndex={-1} onClick={()=>setShowNewPwConfirm(v=>!v)} className="absolute right-3 top-3.5 text-[#656d84] hover:text-[#adc6ff] transition-colors">
              {showNewPwConfirm?<EyeOff size={16}/>:<Eye size={16}/>}
            </button>
          </div>
          {newPasswordConfirm && newPassword!==newPasswordConfirm && <p className="text-[#ffb4ab] text-[10px] mt-1 font-['Space_Grotesk'] tracking-wide">Passwords do not match</p>}
        </div>
        {newPassword && <div className="bg-[#131b2e] border border-[#434655]/30 p-3 space-y-1.5 rounded-xs">
          {newPwChecks.map(r=>(<div key={r.id} className="flex items-center gap-2 text-xs">{r.passed?<Check size={11} className="text-[#89f5e7] shrink-0"/>:<X size={11} className="text-[#434655] shrink-0"/>}<span className={r.passed?'text-[#89f5e7]':'text-[#656d84]'}>{r.label}</span></div>))}
        </div>}
        <button type="submit" disabled={loading} className="w-full font-['Space_Grotesk'] font-bold py-3 text-sm bg-gradient-to-r from-[#89f5e7] to-[#0f69dc] text-[#002e6a] hover:opacity-90 transition-all flex justify-center items-center gap-2 rounded-xs disabled:opacity-50 uppercase tracking-[0.1em] active:scale-[0.98]">
          {loading?'Resetting...':'Reset Password'} {!loading&&<ArrowRight size={16}/>}
        </button>
      </form>
    </div></div>
  );

  // ── OTP Screen ──
  if (step === 'otp') return (
    <div className={cardBase}>
      <div className={panelBase}>
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#adc6ff]/10 border border-[#adc6ff]/20 rounded-md flex items-center justify-center mx-auto mb-4">
            <Mail size={22} className="text-[#adc6ff]" />
          </div>
          <h1 className="text-xl font-extrabold text-[#dae2fd] tracking-tight mb-1">Verify your email</h1>
          <p className="text-[#8d90a0] text-sm mt-2">
            A 6-digit code was sent to <span className="text-[#adc6ff] font-medium">{formData.email}</span>
          </p>
          {formData.role === 'GUEST' && (
            <p className="text-[#fbbf24] text-[11px] mt-2 font-['Space_Grotesk'] font-bold tracking-tight bg-[#fbbf24]/5 border border-[#fbbf24]/20 py-1.5 px-3 inline-block rounded-xs">
              GUEST MODE: Use code 123456
            </p>
          )}
          <p className="text-[#656d84] text-xs mt-1">Check your inbox and spam folder.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#93000a]/15 border border-[#93000a]/40 text-[#ffb4ab] text-xs flex items-start gap-2 rounded-xs">
            <X size={13} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <form onSubmit={handleOtpSubmit} className="space-y-6" autoComplete="off">
          <div className="flex gap-2.5 justify-center" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input key={i} ref={el => otpRefs.current[i] = el}
                type="text" inputMode="numeric" maxLength={1} value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                autoComplete="off"
                className="w-11 h-13 text-center text-xl font-extrabold text-[#adc6ff] bg-[#131b2e] border-2 border-[#434655]/40 rounded-xs focus:border-[#adc6ff] outline-none transition-colors"
              />
            ))}
          </div>

          <button type="submit" disabled={loading || otp.join('').length < 6}
            className="w-full font-['Space_Grotesk'] font-bold py-3 text-sm bg-gradient-to-r from-[#adc6ff] to-[#0f69dc] text-[#002e6a] hover:opacity-90 transition-all flex justify-center items-center gap-2 rounded-xs disabled:opacity-50 uppercase tracking-[0.1em] active:scale-[0.98]">
            {loading ? 'Verifying...' : 'Confirm'} {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between">
          <button onClick={() => { setStep('form'); setError(''); }}
            className="text-[#8d90a0] hover:text-[#dae2fd] font-['Space_Grotesk'] text-xs transition-colors">
            ← Back
          </button>
          <button onClick={handleResend} disabled={resendCooldown > 0}
            className="flex items-center gap-1 text-xs font-['Space_Grotesk'] transition-colors disabled:text-[#434655] text-[#8d90a0] hover:text-[#adc6ff]">
            <RefreshCw size={11} />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main Form ──
  return (
    <div className={cardBase}>
      <div className={panelBase}>
        <div className="text-center mb-7">
          <div className="w-12 h-12 bg-[#adc6ff]/10 border border-[#adc6ff]/20 rounded-md flex items-center justify-center mx-auto mb-4">
            <Shield size={22} className="text-[#adc6ff]" />
          </div>
          <h1 className="text-xl font-extrabold text-[#dae2fd] tracking-tight mb-1">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h1>
          <p className="text-[#8d90a0] text-sm">
            {isLogin ? 'Welcome back to SkillSphere.' : 'Your professional profile starts here.'}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-[#93000a]/15 border border-[#93000a]/40 text-[#ffb4ab] text-xs flex items-start gap-2 rounded-xs">
            <X size={13} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4 relative z-10" autoComplete="off">
          {!isLogin && (
            <>
              {/* Role selector */}
              <div>
                <label className={labelBase}>Account Type</label>
                {formData.role === 'GUEST' && (
                  <div className="mb-3 p-3 bg-[#adc6ff]/5 border border-[#adc6ff]/20 rounded-xs">
                    <p className="text-[#adc6ff] text-[10px] font-['Space_Grotesk'] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Zap size={10} className="fill-[#adc6ff]" /> Portfolio Guest Mode
                    </p>
                    <p className="text-[#8d90a0] text-[11px] mt-1 leading-relaxed">
                      Use any email. In the next step, use verification code <strong className="text-[#dae2fd]">123456</strong>.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'STUDENT', label: 'Student', icon: Briefcase },
                    { value: 'ALUMNI',  label: 'Alumni',  icon: GraduationCap },
                    { value: 'GUEST',   label: 'Guest',   icon: Shield },
                  ].map(({ value, label, icon: Icon }) => (
                    <div key={value} onClick={() => setFormData({...formData, role: value})}
                      className={`cursor-pointer p-3 border rounded-xs flex flex-col items-center justify-center gap-2 transition-all ${
                        formData.role === value
                          ? 'bg-[#adc6ff]/10 border-[#adc6ff]/50'
                          : 'bg-[#131b2e] border-[#434655]/40 hover:border-[#434655]/70'
                      }`}>
                      <Icon size={18} className={formData.role === value ? 'text-[#adc6ff]' : 'text-[#656d84]'} />
                      <span className={`font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wide ${formData.role === value ? 'text-[#dae2fd]' : 'text-[#656d84]'}`}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {formData.role === 'GUEST' && (
                <div>
                  <label className={labelBase}>Simulate Identity As</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'STUDENT', label: 'Student' },
                      { value: 'ALUMNI',  label: 'Alumni' },
                    ].map(({ value, label }) => (
                      <div key={value} onClick={() => setFormData({...formData, guestPersona: value})}
                        className={`cursor-pointer py-2 px-3 border rounded-xs text-center transition-all ${
                          formData.guestPersona === value
                            ? 'bg-[#89f5e7]/10 border-[#89f5e7]/50 text-[#89f5e7]'
                            : 'bg-[#131b2e] border-[#434655]/40 text-[#656d84] hover:border-[#434655]/70'
                        }`}>
                        <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-widest">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className={labelBase}>Full Name</label>
                <div className="relative group">
                  <User className="absolute left-3 top-3.5 text-[#656d84] group-focus-within:text-[#adc6ff] transition-colors" size={16} />
                  <input type="text" placeholder="Your full name" required value={formData.name}
                    autoComplete="off" name="name" className={inputBase}
                    onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>

              <div>
                <label className={labelBase}>Institution</label>
                <div className="relative group">
                  <Building2 className="absolute left-3 top-3.5 text-[#656d84] group-focus-within:text-[#adc6ff] transition-colors" size={16} />
                  <select required value={formData.college} autoComplete="off" name="college"
                    onChange={e => setFormData({...formData, college: e.target.value})}
                    className={`${inputBase} appearance-none cursor-pointer`}>
                    <option value="">Select your institution...</option>
                    {COLLEGES && COLLEGES.map((c,i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className={labelBase}>Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-3.5 text-[#656d84] group-focus-within:text-[#adc6ff] transition-colors" size={16} />
              <input type="email" placeholder="you@example.com" required value={formData.email}
                autoComplete="off" name="email" className={inputBase}
                onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>

          <div>
            <label className={labelBase}>Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3.5 text-[#656d84] group-focus-within:text-[#adc6ff] transition-colors" size={16} />
              <input type={showPassword ? 'text' : 'password'} placeholder="Your password" required value={formData.password}
                autoComplete="new-password" name="ss-password" className={`${inputBase} pr-10`}
                onChange={e => setFormData({...formData, password: e.target.value})} />
              <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-3.5 text-[#656d84] hover:text-[#adc6ff] transition-colors">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className={labelBase}>Confirm Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-[#656d84] group-focus-within:text-[#adc6ff] transition-colors" size={16} />
                <input type={showConfirm ? 'text' : 'password'} placeholder="Re-type your password" required value={formData.confirmPassword}
                  autoComplete="new-password" name="ss-confirm" className={`${inputBase} pr-10`}
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-3.5 text-[#656d84] hover:text-[#adc6ff] transition-colors">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-[#ffb4ab] text-[10px] mt-1 font-['Space_Grotesk'] tracking-wide">Passwords do not match</p>
              )}
            </div>
          )}

          {!isLogin && formData.password && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1 bg-[#2d3449] rounded-full">
                  <div className={`h-1 rounded-full transition-all duration-300 ${strengthColor}`} style={{ width: `${(strengthScore/5)*100}%` }} />
                </div>
                <span className={`font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wide ${
                  strengthScore <= 2 ? 'text-[#ffb4ab]' : strengthScore <= 3 ? 'text-yellow-400' : strengthScore === 4 ? 'text-[#adc6ff]' : 'text-[#89f5e7]'
                }`}>{strengthLabel}</span>
              </div>
              <div className="bg-[#131b2e] border border-[#434655]/30 p-3 space-y-1.5 rounded-xs">
                {passwordChecks.map(rule => (
                  <div key={rule.id} className="flex items-center gap-2 text-xs">
                    {rule.passed
                      ? <Check size={11} className="text-[#89f5e7] shrink-0" />
                      : <X size={11} className="text-[#434655] shrink-0" />}
                    <span className={rule.passed ? 'text-[#89f5e7]' : 'text-[#656d84]'}>{rule.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || (!isLogin && !passwordStrong && formData.password.length > 0)}
            className="w-full font-['Space_Grotesk'] font-bold py-3 text-sm bg-gradient-to-r from-[#adc6ff] to-[#0f69dc] text-[#002e6a] hover:opacity-90 transition-all flex justify-center items-center gap-2 rounded-xs disabled:opacity-50 uppercase tracking-[0.1em] active:scale-[0.98] mt-2">
            {loading
              ? (isLogin ? 'Signing in...' : 'Sending code...')
              : (isLogin ? 'Sign In' : 'Send Verification Code')}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {isLogin && (
          <div className="mt-3 text-center">
            <p className="text-[#656d84] cursor-pointer hover:text-[#adc6ff] transition-colors font-['Space_Grotesk'] text-[10px] tracking-wide"
              onClick={() => { setStep('forgot-email'); setError(''); setForgotEmail(formData.email); }}>
              Forgot your password?
            </p>
          </div>
        )}

        <div className="mt-3 text-center">
          <p className="text-[#8d90a0] cursor-pointer hover:text-[#adc6ff] transition-colors font-['Space_Grotesk'] text-xs tracking-wide"
            onClick={() => { setIsLogin(!isLogin); setError(''); setShowPassword(false); setShowConfirm(false); }}>
            {isLogin ? "Don't have an account? Register" : 'Already registered? Sign In'}
          </p>
        </div>
      </div>
    </div>
  );
}