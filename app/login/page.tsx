'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 400));
    const ok = login(password);
    if (ok) {
      router.push('/');
    } else {
      setError('Incorrect password. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full opacity-[0.08] blur-[80px]"
          style={{ background: 'radial-gradient(circle, #8B1A1A 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[450px] opacity-[0.05] blur-[100px]"
          style={{ background: 'radial-gradient(ellipse, #C9A84C 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm px-6 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display text-5xl font-semibold italic text-transparent bg-clip-text bg-gradient-to-b from-white to-[#FAF7F2] tracking-wide"
            style={{ textShadow: '0 0 50px rgba(139,26,26,0.3)' }}>
            The Embassy
          </h1>
          <p className="text-[10px] tracking-[0.35em] text-[var(--gold)]/80 uppercase mt-3.5 font-semibold">
            Catering · MenuCraft
          </p>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[#C9A84C]/30 to-transparent mt-6" />
        </div>

        {/* Login Card */}
        <div className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-[24px] border border-white/5 rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <h2 className="text-white font-body font-semibold text-lg mb-1">Welcome back</h2>
          <p className="text-[var(--text-grey)] text-xs mb-6">Enter your access password to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-[var(--gold)]/80 text-[10px] font-semibold uppercase tracking-[0.15em] mb-2 block">
                Password
              </label>
              <input
                type="password"
                className="input-field py-2.5"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoFocus
              />
              {error && (
                <p className="text-red-400 text-xs mt-2 animate-fade-in font-medium">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 rounded-xl font-body font-semibold text-sm tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed btn-primary"
              style={{
                boxShadow: '0 4px 20px var(--crimson-glow)',
              }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-[10px] mt-8 tracking-wider uppercase font-medium">
          MenuCraft v2.0 · The Embassy Catering
        </p>
      </div>
    </div>
  );
}
