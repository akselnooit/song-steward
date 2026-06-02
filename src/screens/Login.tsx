import { useState } from 'react'
import { Mail, Lock, Sparkles, KeyRound } from 'lucide-react'
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
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    })
    if (error) {
      const notInvited = error.message.toLowerCase().includes('signup') || error.message.toLowerCase().includes('not allowed')
      setError(notInvited
        ? 'Ten adres nie jest na liście zaproszonych. Skontaktuj się z administratorem.'
        : 'Nie udało się wysłać linku. Spróbuj ponownie.'
      )
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  const handleVerifyCode = async () => {
    if (code.trim().length < 6) return
    setVerifying(true)
    setCodeError(null)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    if (error) {
      setCodeError('Nieprawidłowy kod. Sprawdź email i spróbuj ponownie.')
    }
    setVerifying(false)
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
              {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{error}</p>}
              <button
                className="btn btn-primary btn-block"
                onClick={handleSend}
                disabled={loading || !email.trim()}
              >
                <Sparkles size={18} strokeWidth={1.7} />
                {loading ? 'Wysyłanie…' : 'Wyślij kod logowania'}
              </button>
              <div className="hint" style={{ marginTop: 18, justifyContent: 'center', textAlign: 'center', lineHeight: 1.5 }}>
                <Lock size={13} strokeWidth={1.7} />
                Dostęp tylko na zaproszenie. Konta zakłada administrator.
              </div>
            </div>
          ) : (
            <div className="fin">
              {/* confirmation card */}
              <div className="card" style={{ padding: 18, textAlign: 'center', marginBottom: 20 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                  display: 'grid', placeItems: 'center', margin: '0 auto 12px',
                }}>
                  <Mail size={24} strokeWidth={1.7} />
                </div>
                <div className="t-title" style={{ fontSize: 17, marginBottom: 6 }}>Sprawdź skrzynkę</div>
                <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                  Wysłaliśmy kod na <b style={{ color: 'var(--text)' }}>{email}</b>.
                  Wpisz go poniżej lub kliknij link w emailu (używając Safari).
                </p>
              </div>

              {/* OTP code input */}
              <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Kod z emaila</label>
              <div className="field-wrap" style={{ marginBottom: 14 }}>
                <span className="field-ico"><KeyRound size={18} strokeWidth={1.7} /></span>
                <input
                  className="field"
                  type="number"
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  onChange={e => setCode(e.target.value.slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
                  autoComplete="one-time-code"
                  style={{ letterSpacing: '0.2em', fontSize: 20 }}
                />
              </div>
              {codeError && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{codeError}</p>}
              <button
                className="btn btn-primary btn-block"
                onClick={handleVerifyCode}
                disabled={verifying || code.trim().length < 6}
              >
                {verifying ? 'Weryfikacja…' : 'Zaloguj się'}
              </button>

              <button
                className="link-btn"
                style={{ display: 'block', margin: '16px auto 0', fontSize: 13 }}
                onClick={() => { setSent(false); setCode(''); setCodeError(null) }}
              >
                Zmień adres email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
