import { useRef, useState, useCallback, useEffect } from 'react'

interface ScrubberProps {
  songs: Array<{ number: number }>
  scrollRef: React.RefObject<HTMLElement | null>
  topOffset: number
}

const THUMB_H = 44

export function Scrubber({ songs, scrollRef, topOffset }: ScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [bubble, setBubble] = useState<{ number: number; y: number } | null>(null)
  const [ratio, setRatio] = useState(0) // 0..1 scroll position for the thumb
  const [dragging, setDragging] = useState(false)

  // Keep the thumb in sync with normal (finger) scrolling.
  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const onScroll = () => {
      const max = scroller.scrollHeight - scroller.clientHeight
      setRatio(max > 0 ? scroller.scrollTop / max : 0)
    }
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [scrollRef, songs.length])

  const scrubTo = useCallback((clientY: number) => {
    const track = trackRef.current
    const scroller = scrollRef.current
    if (!track || !scroller || songs.length === 0) return
    const rect = track.getBoundingClientRect()
    const r = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    scroller.scrollTop = r * (scroller.scrollHeight - scroller.clientHeight)
    const idx = Math.min(Math.floor(r * songs.length), songs.length - 1)
    setBubble({ number: songs[idx].number, y: rect.top + r * rect.height })
  }, [songs, scrollRef])

  return (
    <>
      <div
        ref={trackRef}
        style={{
          position: 'fixed',
          right: 0,
          top: topOffset,
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
          width: 18,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 4,
          touchAction: 'none',
          cursor: 'ns-resize',
        }}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setDragging(true)
          scrubTo(e.clientY)
        }}
        onPointerMove={e => {
          if (e.buttons === 0) return
          scrubTo(e.clientY)
        }}
        onPointerUp={() => { setDragging(false); setBubble(null) }}
        onPointerCancel={() => { setDragging(false); setBubble(null) }}
      >
        {/* full-height faint track + thumb */}
        <div style={{
          position: 'relative',
          width: dragging ? 5 : 3,
          height: '100%',
          borderRadius: 3,
          background: 'var(--border)',
          transition: 'width 0.12s',
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: THUMB_H,
            top: `calc(${ratio} * (100% - ${THUMB_H}px))`,
            borderRadius: 3,
            background: dragging ? 'var(--accent)' : 'var(--text-3)',
          }} />
        </div>
      </div>

      {bubble && (
        <div style={{
          position: 'fixed',
          right: 30,
          top: bubble.y,
          transform: 'translateY(-50%)',
          background: 'var(--text)',
          color: 'var(--bg)',
          borderRadius: 'var(--r-md)',
          padding: '6px 14px',
          fontSize: 17,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          boxShadow: 'var(--shadow-pop)',
          zIndex: 8,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {bubble.number}
        </div>
      )}
    </>
  )
}
