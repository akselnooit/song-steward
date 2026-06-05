import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, RotateCcw, ChevronRight } from 'lucide-react'
import { collectionClass } from '../lib/utils'
import { useSongOverlay } from '../contexts/SongOverlayContext'
import {
  usePendingTags,
  useConfirmTagAddition, useRejectTagAddition,
  useConfirmTagRemoval, useRestoreTag,
} from '../lib/queries'

export function Moderation() {
  const navigate = useNavigate()
  const { openSong } = useSongOverlay()

  const { data: pending = [] } = usePendingTags()
  const confirmAdd = useConfirmTagAddition()
  const rejectAdd = useRejectTagAddition()
  const confirmRemove = useConfirmTagRemoval()
  const restore = useRestoreTag()

  // Group by song_id
  const groups = pending.reduce<Record<string, typeof pending>>((acc, entry) => {
    ;(acc[entry.song_id] ??= []).push(entry)
    return acc
  }, {})
  const groupList = Object.values(groups)

  const additions = pending.filter(e => e.source === 'user' && !e.pending_removal)
  const removals = pending.filter(e => e.pending_removal)
  const totalPending = additions.length + removals.length

  const confirmAll = () => {
    additions.forEach(e => confirmAdd.mutate({ song_id: e.song_id, tag_id: e.tag_id }))
    removals.forEach(e => confirmRemove.mutate({ song_id: e.song_id, tag_id: e.tag_id }))
  }

  const songIds = groupList.map(g => g[0].song_id)

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <div style={{ padding: '52px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button className="icon-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={19} strokeWidth={1.7} />
          </button>
          <h1 className="t-title" style={{ fontSize: 24, margin: 0 }}>Panel moderacji</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span className="meta-chip">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--src-user)', flexShrink: 0 }} />
            {additions.length} do dodania
          </span>
          <span className="meta-chip">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }} />
            {removals.length} do usunięcia
          </span>
        </div>
      </div>

      <div className="screen-pad" style={{ paddingTop: 14 }}>
        {totalPending > 0 && (
          <button className="btn btn-primary btn-block" style={{ marginBottom: 16 }} onClick={confirmAll}>
            <Check size={18} strokeWidth={1.7} /> Zatwierdź wszystko ({totalPending})
          </button>
        )}

        {groupList.length === 0 ? (
          <div className="card" style={{ padding: 30, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
              <Check size={24} strokeWidth={1.7} />
            </div>
            <div className="t-title" style={{ fontSize: 17, marginBottom: 4 }}>Wszystko zatwierdzone</div>
            <div className="count-line">Brak oczekujących zmian w tagach.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groupList.map(entries => {
              const first = entries[0]
              const song = first.song
              const adds = entries.filter(e => e.source === 'user' && !e.pending_removal)
              const removes = entries.filter(e => e.pending_removal)

              return (
                <div key={first.song_id} className="card" style={{ padding: 14 }}>
                  {/* song header */}
                  <div className="song-card" style={{ padding: '0 0 12px', cursor: 'pointer' }}
                    onClick={() => openSong(song.id, songIds)}>
                    <span className={`badge-col ${collectionClass(song.collection.short_name)}`}>{song.collection.short_name} {song.number}</span>
                    <div className="meta">
                      <div className="title" style={{ fontSize: 15 }}>{song.title}</div>
                    </div>
                    <ChevronRight size={16} strokeWidth={1.7} style={{ color: 'var(--text-3)' }} />
                  </div>

                  {/* changes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    {adds.map(e => (
                      <div key={`add-${e.tag_id}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="t-label" style={{ width: 64, flexShrink: 0, color: 'var(--src-user)' }}>Dodanie</span>
                        <span className="tag src-user"><span className="dot" /> {e.tag.name}</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          <button className="mini-btn good" title="Zatwierdź"
                            onClick={() => confirmAdd.mutate({ song_id: e.song_id, tag_id: e.tag_id })}>
                            <Check size={16} strokeWidth={1.7} />
                          </button>
                          <button className="mini-btn" title="Anuluj"
                            onClick={() => rejectAdd.mutate({ song_id: e.song_id, tag_id: e.tag_id })}>
                            <X size={16} strokeWidth={1.7} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {removes.map(e => (
                      <div key={`rem-${e.tag_id}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="t-label" style={{ width: 64, flexShrink: 0, color: 'var(--danger)' }}>Usunięcie</span>
                        <span className="tag" style={{ textDecoration: 'line-through', background: 'var(--danger-soft)', color: 'var(--danger)', borderColor: 'var(--danger-bd)' }}>
                          {e.tag.name}
                        </span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          <button className="mini-btn good" title="Zatwierdź usunięcie"
                            onClick={() => confirmRemove.mutate({ song_id: e.song_id, tag_id: e.tag_id })}>
                            <Check size={16} strokeWidth={1.7} />
                          </button>
                          <button className="mini-btn" title="Przywróć"
                            onClick={() => restore.mutate({ song_id: e.song_id, tag_id: e.tag_id })}>
                            <RotateCcw size={15} strokeWidth={1.7} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
