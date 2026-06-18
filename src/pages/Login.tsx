import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';
import policeBadge from '../assets/policelogo.png';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else navigate('/dashboard', { replace: true });
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, var(--police-navy) 0%, var(--police-navy2) 55%, rgb(33, 67, 121) 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* subtle radial glow */}
      <div style={{
        position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '700px', height: '700px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,169,81,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* decorative top stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
        background: 'white',
      }} />

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(200,169,81,0.25)',
        borderRadius: '20px',
        padding: '48px 44px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 32px 80px rgba(0, 0, 0, 0.45)',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Badge + title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', gap: '14px' }}>
          {/* Police badge SVG */}
          <div style={{
            width: '80px', height: '80px',
            background: 'white',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(189, 189, 189, 0.4)',
          }}>
            <img src={policeBadge} alt="Police Badge" style={{ width: '40px', height: '50px' }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', color: 'var(--police-gold)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Sri Lanka Police
            </p>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px', lineHeight: 1.3, marginBottom: '4px' }}>
              Traffic Division
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>
              Monitoring Management System
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(200,169,81,0.2)', marginBottom: '28px' }} />

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Email Address
            </label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@police.lk"
              style={{
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: '#FFFFFF',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--police-gold)';
                e.target.style.boxShadow = '0 0 0 3px rgba(200,169,81,0.18)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Password
            </label>
            <input
              type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: '#FFFFFF',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--police-gold)';
                e.target.style.boxShadow = '0 0 0 3px rgba(200,169,81,0.18)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(255,59,48,0.15)',
              border: '1px solid rgba(255,59,48,0.4)',
              borderRadius: '10px',
              fontSize: '13px',
              color: '#FF8A84',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              marginTop: '4px',
              padding: '13px',
              background: loading
                ? 'rgba(134, 99, 0, 0.5)'
                : 'linear-gradient(135deg, var(--police-gold), var(--police-gold-l))',
              color: '#0D1B3E',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em',
              transition: 'opacity 0.15s ease, transform 0.1s ease',
              boxShadow: '0 4px 20px rgba(255, 255, 255, 0.3)',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {loading ? 'Authenticating…' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p style={{ marginTop: '28px', textAlign: 'center', fontSize: '11px', color: 'rgba(255, 255, 255, 0.25)' }}>
          Authorised personnel only &nbsp;|&nbsp; Sri Lanka Police
        </p>
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'white' }} />
    </div>
  );
}
