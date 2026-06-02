import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Sparkles, KeyRound, Info } from 'lucide-react'
import { supabase } from '../lib/supabase'

function getEmailApp(email: string): { label: string; url: string } {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  if (domain === 'gmail.com' || domain === 'googlemail.com')
    return { label: 'Otwórz Gmaila', url: 'googlegmail://' }
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain))
    return { label: 'Otwórz Outlook', url: 'ms-outlook://' }
  if (['icloud.com', 'me.com', 'mac.com'].includes(domain))
    return { label: 'Otwórz pocztę', url: 'message://' }
  return { label: 'Otwórz skrzynkę mailową', url: 'mailto:' }
}

function WaveformIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h2l2-6 3 14 3-18 3 16 2-6h3" />
    </svg>
  )
}

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) navigate('/', { replace: true })
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  const handleSend = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
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
    if (!code.trim()) return
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
          ) : (() => {
            const emailApp = getEmailApp(email)
            return (
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
                <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.5, margin: '0 0 14px' }}>
                  Wysłaliśmy kod na <b style={{ color: 'var(--text)' }}>{email}</b>. Wpisz go poniżej, aby zalogować się w aplikacji.
                </p>
                <a href={emailApp.url} className="btn btn-ghost btn-block" style={{ textDecoration: 'none' }}>
                  <Mail size={16} strokeWidth={1.7} />
                  {emailApp.label}
                </a>
              </div>

              {/* OTP code input */}
              <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Kod z emaila</label>
              <div className="field-wrap" style={{ marginBottom: 14 }}>
                <span className="field-ico"><KeyRound size={18} strokeWidth={1.7} /></span>
                <input
                  className="field"
                  type="text"
                  inputMode="numeric"
                  placeholder="12345678"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
                  autoComplete="one-time-code"
                  style={{ letterSpacing: '0.2em', fontSize: 20 }}
                />
              </div>
              {codeError && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{codeError}</p>}
              <button
                className="btn btn-primary btn-block"
                onClick={handleVerifyCode}
                disabled={verifying || !code.trim()}
              >
                {verifying ? 'Weryfikacja…' : 'Zaloguj się'}
              </button>

              <div className="hint" style={{ marginTop: 14, lineHeight: 1.5 }}>
                <Info size={13} strokeWidth={1.7} style={{ flexShrink: 0, marginTop: 1 }} />
                Link z maila otwiera logowanie w przeglądarce, nie w tej aplikacji. Żeby zostać zalogowanym tutaj, wpisz kod powyżej.
              </div>

              <button
                className="link-btn"
                style={{ display: 'block', margin: '16px auto 0', fontSize: 13 }}
                onClick={() => { setSent(false); setCode(''); setCodeError(null) }}
              >
                Zmień adres email
              </button>
            </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
