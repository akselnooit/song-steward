import { useState } from 'react'
import { Mail, Lock, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

function WaveformIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h2l2-6 3 14 3-18 3 16 2-6h3" />
    </svg>
  )
}

export function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } })
    if (error) {
      setError('Nie udało się wysłać linku. Spróbuj ponownie.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="app">
      <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px' }}>

          {/* wordmark */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 'var(--r-lg)',
              background: 'var(--accent)', color: 'var(--accent-contrast)',
              display: 'grid', placeItems: 'center', marginBottom: 18,
              boxShadow: 'var(--shadow-card)',
            }}>
              <WaveformIcon size={34} />
            </div>
            <h1 className="t-title" style={{ fontSize: 29, margin: 0, whiteSpace: 'nowrap', lineHeight: 1.1 }}>
              Song Steward
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              Pieśni i nabożeństwa, zawsze pod ręką
            </p>
          </div>

          {!sent ? (
            <div className="fin">
              <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Adres e-mail</label>
              <div className="field-wrap" style={{ marginBottom: 14 }}>
                <span className="field-ico"><Mail size={18} strokeWidth={1.7} /></span>
                <input
                  className="field"
                  type="email"
                  placeholder="ty@zbor.pl"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  autoComplete="email"
                />
              </div>
              {error && (
                <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{error}</p>
              )}
              <button
                className="btn btn-primary btn-block"
                onClick={handleSend}
                disabled={loading || !email.trim()}
                style={{ opacity: loading ? 0.7 : undefined }}
              >
                <Sparkles size={18} strokeWidth={1.7} />
                {loading ? 'Wysyłanie…' : 'Wyślij link logujący'}
              </button>
              <div className="hint" style={{ marginTop: 18, justifyContent: 'center', textAlign: 'center', lineHeight: 1.5 }}>
                <Lock size={13} strokeWidth={1.7} />
                Dostęp tylko na zaproszenie. Konta zakłada administrator.
              </div>
            </div>
          ) : (
            <div className="fin card" style={{ padding: 22, textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'grid', placeItems: 'center', margin: '0 auto 14px',
              }}>
                <Mail size={24} strokeWidth={1.7} />
              </div>
              <div className="t-title" style={{ fontSize: 19, marginBottom: 6 }}>Sprawdź skrzynkę</div>
              <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                Wysłaliśmy link logujący na{' '}
                <b style={{ color: 'var(--text)' }}>{email}</b>. Kliknij go, aby wejść.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
