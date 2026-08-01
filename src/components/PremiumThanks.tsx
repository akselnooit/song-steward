import { useEffect, useRef, useState } from 'react'
import { Heart, Mail, Copy, Check, Play, RotateCcw, Trophy, Volume2, Gamepad2 } from 'lucide-react'
import { vibrate } from '../lib/vibrate'
import { Sheet } from './ui'

const MAIL = 'akselon@gmail.com'
const MAILTO = `mailto:${MAIL}`
  + `?subject=${encodeURIComponent('Song Steward Premium — proszę o kontakt')}`
  + `&body=${encodeURIComponent('Cześć! Interesuje mnie Song Steward Premium — proszę o kontakt.')}`

// ── Echo melodii — mini-gra „powtórz to, co usłyszysz" ───────────
// Cztery pola w pentatonice (C-D-E-G): każda kombinacja brzmi zgodnie,
// więc nawet pomyłka nie brzmi fałszywie. Ton generujemy Web Audio —
// zero plików, zero zależności.

const PADS = [
  { col: 'dp',  freq: 523.25 },  // C5
  { col: 'km',  freq: 587.33 },  // D5
  { col: 'ndp', freq: 659.25 },  // E5
  { col: 'sos', freq: 783.99 },  // G5
]

const BEST_KEY = 'ss-echo-best'

let audio: AudioContext | null = null

function tone(freq: number, dur = 0.5, gain = 0.16) {
  try {
    const Ctor = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    if (!audio) audio = new Ctor()
    if (audio.state === 'suspended') void audio.resume()
    const t0 = audio.currentTime
    const env = audio.createGain()
    env.gain.setValueAtTime(0, t0)
    env.gain.linearRampToValueAtTime(gain, t0 + 0.015)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    env.connect(audio.destination)
    // miękki, „organowy" ton: podstawa + dwie ciche harmoniczne
    const parts: [number, number][] = [[1, 1], [2, 0.2], [3, 0.07]]
    parts.forEach(([mult, amp], i) => {
      const osc = audio!.createOscillator()
      osc.type = i === 0 ? 'sine' : 'triangle'
      osc.frequency.value = freq * mult
      const hg = audio!.createGain()
      hg.gain.value = amp
      osc.connect(hg).connect(env)
      osc.start(t0)
      osc.stop(t0 + dur)
    })
  } catch {
    // brak Web Audio — gra nadal działa wizualnie
  }
}

type Phase = 'idle' | 'show' | 'play' | 'win' | 'over'

const randPad = () => Math.floor(Math.random() * PADS.length)

// polska odmiana: 1 nuta, 2–4 nuty, 5+ nut (z wyjątkiem 12–14)
function nuty(n: number) {
  const last = n % 10, teen = n % 100
  if (n === 1) return 'nuta'
  if (last >= 2 && last <= 4 && (teen < 12 || teen > 14)) return 'nuty'
  return 'nut'
}

// biernik („miała ile?"): 1 nutę, reszta jak w mianowniku (2–4 nuty, 5+ nut)
const nutyBiernik = (n: number) => (n === 1 ? 'nutę' : nuty(n))

function EchoGame() {
  const [seq, setSeq] = useState<number[]>([])
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [lit, setLit] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [burst, setBurst] = useState(0)
  const [record, setRecord] = useState(false)
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0)
  const tapTimer = useRef<number | undefined>(undefined)

  // Odtworzenie melodii: zapalamy kolejne pola, potem oddajemy ruch graczowi.
  useEffect(() => {
    if (phase !== 'show') return
    const beat = Math.max(340, 560 - seq.length * 18)
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    seq.forEach((pad, i) => {
      at(320 + i * beat, () => { setLit(pad); tone(PADS[pad].freq, beat / 1000 + 0.1) })
      at(320 + i * beat + beat * 0.62, () => setLit(null))
    })
    at(360 + seq.length * beat, () => { setStep(0); setPhase('play') })
    return () => timers.forEach(clearTimeout)
  }, [phase, seq])

  // Runda zaliczona: krótki arpeggio-nagroda, potem melodia rośnie o nutę.
  useEffect(() => {
    if (phase !== 'win') return
    const timers: number[] = []
    ;[523.25, 659.25, 783.99].forEach((f, i) => {
      timers.push(window.setTimeout(() => tone(f, 0.5, 0.13), i * 95))
    })
    timers.push(window.setTimeout(() => {
      setSeq(s => [...s, randPad()])
      setPhase('show')
    }, 780))
    return () => timers.forEach(clearTimeout)
  }, [phase])

  // suspend() zamiast close(): zwalnia sprzęt audio, ale zachowuje singleton
  // (tone() sam robi resume() z gestu użytkownika, gdy gra zostanie otwarta ponownie).
  useEffect(() => () => { window.clearTimeout(tapTimer.current); void audio?.suspend() }, [])

  const flash = (i: number) => {
    setLit(i)
    window.clearTimeout(tapTimer.current)
    tapTimer.current = window.setTimeout(() => setLit(null), 190)
  }

  const tap = (i: number) => {
    if (phase === 'show' || phase === 'win') return
    tone(PADS[i].freq, 0.42)
    flash(i)
    if (phase !== 'play') return   // w bezczynności pola są po prostu instrumentem
    vibrate(12)

    if (i !== seq[step]) {
      tone(174.61, 0.85, 0.12)     // niskie F3 — melodia „gaśnie", to nie kara
      vibrate(70)
      if (score > best) {
        setBest(score)
        localStorage.setItem(BEST_KEY, String(score))
        setRecord(true)
      }
      setPhase('over')
      return
    }
    if (step + 1 < seq.length) {
      setStep(step + 1)
      return
    }
    setScore(seq.length)
    setBurst(b => b + 1)
    vibrate(30)
    setPhase('win')
  }

  const start = () => {
    tone(523.25, 0.32, 0.10)       // pierwszy ton odblokowuje audio w geście użytkownika
    setRecord(false)
    setScore(0)
    setStep(0)
    setSeq([randPad()])
    setPhase('show')
  }

  const status = phase === 'show' ? 'Słuchaj…'
    : phase === 'play' ? `Powtórz — nuta ${step + 1} z ${seq.length}`
    : phase === 'win' ? 'Pięknie!'
    : phase === 'over' ? `Melodia miała ${seq.length} ${nutyBiernik(seq.length)}.`
    : 'Dotknij pól, żeby posłuchać.'

  return (
    <div className="card echo-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Echo melodii</div>
          <div className="hint" style={{ marginTop: 3 }}>
            <Volume2 size={12} strokeWidth={1.9} /> Zagraj to, co usłyszysz
          </div>
        </div>
        <span className="echo-best">
          <Trophy size={13} strokeWidth={1.9} /> {best}
        </span>
      </div>

      <div className={`echo-stage${phase === 'over' ? ' echo-shake' : ''}`}>
        <div className="echo-grid">
          {PADS.map((p, i) => (
            <button
              key={p.col}
              className={`echo-pad${lit === i ? ' lit' : ''}`}
              style={{
                '--pc': `var(--col-${p.col})`,
                '--ps': `var(--col-${p.col}-soft)`,
                '--pb': `var(--col-${p.col}-bd)`,
              } as React.CSSProperties}
              onPointerDown={() => tap(i)}
              // Enter/Space daje click bez wskaźnika (detail === 0) — inaczej gra
              // byłaby nieosiągalna z klawiatury, a pointerdown liczyłby się dwa razy.
              onClick={e => { if (e.detail === 0) tap(i) }}
              disabled={phase === 'show' || phase === 'win'}
              aria-label={`Pole ${i + 1}`}
            >
              <span className="echo-dot" />
            </button>
          ))}
        </div>
        {burst > 0 && (
          <span className="echo-burst" key={burst} aria-hidden>
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} style={{ '--a': `${i * 36}deg` } as React.CSSProperties} />
            ))}
          </span>
        )}
      </div>

      <div className="echo-foot">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="echo-score">
            Wynik <b key={score} className={score > 0 ? 'echo-bump' : undefined}>{score}</b>
          </div>
          <div className="hint" role="status" aria-live="polite" style={{ marginTop: 2 }}>
            {status}
            {phase === 'over' && record && score > 0 && ` Nowy rekord — ${score} ${nuty(score)}!`}
          </div>
        </div>
        {phase === 'idle' && (
          <button className="btn btn-primary" onClick={start} style={{ minHeight: 48, padding: '0 18px' }}>
            <Play size={16} strokeWidth={2} /> Zagraj
          </button>
        )}
        {phase === 'over' && (
          <button className="btn btn-ghost" onClick={start} style={{ minHeight: 48, padding: '0 18px' }}>
            <RotateCcw size={16} strokeWidth={2} /> Jeszcze raz
          </button>
        )}
      </div>

      {phase === 'over' && record && score > 0 && (
        <div className="echo-record" aria-hidden>
          <Trophy size={14} strokeWidth={2} /> Nowy rekord — {score} {nuty(score)}!
        </div>
      )}
    </div>
  )
}

// ── Gra jako osobny arkusz, otwierany dopiero na życzenie ────────

function EchoGameSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
          <Gamepad2 size={18} strokeWidth={1.7} />
        </span>
        <h2 className="t-title" style={{ fontSize: 20, margin: 0 }}>Echo melodii</h2>
      </div>
      <EchoGame />
    </Sheet>
  )
}

// ── Ekran podziękowania po kliknięciu „Wykup Premium" ────────────

export function PremiumThanks() {
  const [copied, setCopied] = useState(false)
  const [gameOpen, setGameOpen] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(t)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MAIL)
      setCopied(true)
      vibrate(20)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'grid', placeItems: 'center', textAlign: 'center', marginBottom: 18 }}>
        <span className="thanks-badge">
          <Heart size={24} strokeWidth={2} />
        </span>
        <h2 className="t-title" style={{ fontSize: 22, margin: '14px 0 0' }}>Dziękujemy!</h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5, margin: '8px 0 0', maxWidth: 320 }}>
          Premium jeszcze nie istnieje — na razie badamy, czy jest zainteresowanie.
          Twoje kliknięcie właśnie nam powiedziało, że ktoś docenia to, co tu budujemy.
          To dla nas naprawdę dużo.
        </p>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 20, background: 'var(--accent-soft)', border: '1px solid var(--accent-bd)' }}>
        <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5, marginBottom: 12 }}>
          Chcesz być na początku kolejki? Napisz na <b>{MAIL}</b> i poproś o kontakt —
          odezwiemy się, gdy Premium będzie gotowe.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="btn btn-primary" href={MAILTO} style={{ flex: 1, minHeight: 48, textDecoration: 'none' }}>
            <Mail size={16} strokeWidth={2} /> Napisz do nas
          </a>
          <button className="btn btn-ghost" onClick={copy} style={{ minHeight: 48, padding: '0 16px' }}>
            {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
            {copied ? 'Skopiowano' : 'Kopiuj'}
          </button>
        </div>
      </div>

      <button className="btn btn-ghost btn-block" onClick={() => { vibrate(15); setGameOpen(true) }}>
        <Gamepad2 size={17} strokeWidth={1.9} /> A w ramach podziękowania — mała gra
      </button>

      <EchoGameSheet open={gameOpen} onClose={() => setGameOpen(false)} />
    </div>
  )
}
