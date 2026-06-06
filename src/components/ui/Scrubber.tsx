import { useRef, useState, useCallback } from 'react'

interface ScrubberProps {
  songs: Array<{ number: number }>
  scrollRef: React.RefObject<HTMLElement | null>
}

export function Scrubber({ songs, scrollRef }: ScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [bubble, setBubble] = useState<{ number: number; y: number } | null>(null)

  const handleScroll = useCallback((clientY: number) => {
    const track = trackRef.current
    const scroller = scrollRef.current
    if (!track || !scroller || songs.length === 0) return

    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))

    scroller.scrollTop = ratio * (scroller.scrollHeight - scroller.clientHeight)

    const idx = Math.min(Math.floor(ratio * songs.length), songs.length - 1)
    setBubble({ number: songs[idx].number, y: rect.top + ratio * rect.height })
  }, [songs, scrollRef])

  return (
    <>
      <div
        ref={trackRef}
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          height: 'min(55vh, 320px)',
          width: 44,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'stretch',
          zIndex: 40,
          cursor: 'ns-resize',
          touchAction: 'none',
        }}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          handleScroll(e.clientY)
        }}
        onPointerMove={e => {
          if (e.buttons === 0) return
          handleScroll(e.clientY)
        }}
        onPointerUp={() => setBubble(null)}
        onPointerCancel={() => setBubble(null)}
      >
        <div style={{
          width: 4,
          borderRadius: 2,
          background: 'var(--border)',
          position: 'relative',
          alignSelf: 'stretch',
        }}>
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 4,
            height: 32,
            borderRadius: 2,
            background: 'var(--text-3)',
          }} />
        </div>
      </div>

      {bubble && (
        <div style={{
          position: 'fixed',
          right: 52,
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
          zIndex: 41,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {bubble.number}
        </div>
      )}
    </>
  )
}
