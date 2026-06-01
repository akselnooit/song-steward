/* Song Steward — Live service screen */
(function () {
  const { useState, useRef } = React;
  const I = window.Icon;
  const SS = window.SS;
  const { MetaChip } = window.UI;

  function ServiceSongRow({ song, n, onOpen, onPromote, onRemove }) {
    return (
      <div className="svc-song">
        <span className="drag-h"><I.drag size={18} /></span>
        {n != null && <span className="rank">{n}</span>}
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onOpen}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge-col" style={{ fontSize: 10 }}>{song.collection} {song.number}</span>
          </div>
          <div className="t-title" style={{ fontSize: 15, marginTop: 5, lineHeight: 1.15 }}>{song.title}</div>
        </div>
        {onPromote && <button className="mini-btn good" onClick={onPromote}><I.check size={16} /></button>}
        <button className="mini-btn bad" onClick={onRemove}><I.x size={16} /></button>
      </div>
    );
  }

  function LiveService({ onBack, onOpenSong, onOpenTagSearch }) {
    const svc = SS.services[0];
    const [planned, setPlanned] = useState(svc.planned);
    const [sung, setSung] = useState(svc.sung);
    const [notes, setNotes] = useState(svc.notes);
    const [editing, setEditing] = useState(false);
    const [toast, setToast] = useState(null);
    const [q, setQ] = useState('');
    const tRef = useRef(null);

    const flash = (msg) => { setToast(msg); clearTimeout(tRef.current); tRef.current = setTimeout(() => setToast(null), 1600); };

    const promote = (song) => {
      setPlanned(p => p.filter(s => s.id !== song.id));
      setSung(s => [...s, song]);
      flash('Oznaczono jako zaśpiewaną');
    };
    const removePlanned = (song) => { setPlanned(p => p.filter(s => s.id !== song.id)); };
    const removeSung = (song) => { setSung(s => s.filter(x => x.id !== song.id)); };
    const saveNotes = () => { setEditing(false); flash('Zapisano notatki'); };

    const matches = q.trim()
      ? SS.songs.filter(s => s.title.toLowerCase().includes(q.toLowerCase()) || String(s.number).includes(q)).slice(0, 4)
      : [];
    const addSong = (song, status) => {
      if (status === 'sung') setSung(s => [...s, song]); else setPlanned(p => [...p, song]);
      setQ(''); flash(status === 'sung' ? 'Dodano do zaśpiewanych' : 'Dodano do zaplanowanych');
    };
    const detailList = [...planned, ...sung];

    return (
      <div className="screen" style={{ paddingTop: 0 }}>
        {/* header */}
        <div style={{ paddingTop: 52, padding: '52px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button className="icon-btn" onClick={onBack}><I.arrowL size={19} /></button>
            <span style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--r-pill)', whiteSpace: 'nowrap', flexShrink: 0 }}>DZIŚ · NA ŻYWO</span>
          </div>
          <h1 className="t-title" style={{ fontSize: 27, margin: 0 }}>{svc.category}</h1>
          <div className="svc-meta">
            <MetaChip icon="calendar">31 maja 2026</MetaChip>
            <MetaChip icon="pin">{svc.location}</MetaChip>
            <MetaChip icon="user">{svc.leader}</MetaChip>
          </div>
        </div>

        <div className="screen-pad" style={{ paddingTop: 16 }}>
          {/* notes inline edit */}
          <div className="t-label" style={{ marginBottom: 7 }}>Notatki</div>
          {editing ? (
            <textarea className="notes-box" autoFocus value={notes} rows={3}
              onChange={e => setNotes(e.target.value)} onBlur={saveNotes}
              onKeyDown={e => { if (e.key === 'Escape') saveNotes(); }} />
          ) : (
            <div className="notes-box" style={{ cursor: 'text', minHeight: 46, color: notes ? 'var(--text-2)' : 'var(--text-3)', display: 'flex', alignItems: 'flex-start', gap: 8 }}
              onClick={() => setEditing(true)}>
              <I.pencil size={15} style={{ marginTop: 3, flexShrink: 0, opacity: .6 }} />
              {notes || 'Dotknij, aby dodać notatkę (np. temat kazania)…'}
            </div>
          )}

          {/* add song */}
          <div style={{ marginTop: 18 }}>
            <div className="field-wrap">
              <span className="field-ico"><I.search size={18} /></span>
              <input className="field" placeholder="Dodaj pieśń: tytuł lub numer" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            {matches.length > 0 && (
              <div className="card list-rows fin" style={{ marginTop: 8 }}>
                {matches.map(s => (
                  <div key={s.id} className="song-card" style={{ padding: '10px 12px' }}>
                    <span className="badge-col" style={{ fontSize: 10 }}>{s.collection} {s.number}</span>
                    <div className="meta"><div className="title" style={{ fontSize: 14 }}>{s.title}</div></div>
                    <button className="mini-btn" onClick={() => addSong(s, 'planned')}><I.bookmark size={15} /></button>
                    <button className="mini-btn good" onClick={() => addSong(s, 'sung')}><I.check size={15} /></button>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={onOpenTagSearch}>
              <I.tag size={17} /> Szukaj po tagach
            </button>
          </div>

          {/* planned */}
          <div className="sec-h" style={{ marginBottom: 10 }}>
            <div className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><I.bookmark size={14} /> Zaplanowane · {planned.length}</div>
          </div>
          {planned.length === 0
            ? <div className="hint" style={{ padding: '4px 2px 8px' }}>Brak zaplanowanych pieśni</div>
            : planned.map(s => (
              <ServiceSongRow key={s.id} song={s} onOpen={() => onOpenSong(s, detailList)} onPromote={() => promote(s)} onRemove={() => removePlanned(s)} />
            ))}

          {/* sung */}
          <div className="sec-h" style={{ marginBottom: 10 }}>
            <div className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><I.check size={14} /> Zaśpiewane · {sung.length}</div>
          </div>
          {sung.length === 0
            ? <div className="hint" style={{ padding: '4px 2px' }}>Jeszcze nic nie zaśpiewano</div>
            : sung.map((s, i) => (
              <ServiceSongRow key={s.id} song={s} n={i + 1} onOpen={() => onOpenSong(s, detailList)} onRemove={() => removeSung(s)} />
            ))}
        </div>

        {toast && <div className="saved-toast fin"><I.check size={15} /> {toast}</div>}
      </div>
    );
  }

  window.LiveService = LiveService;
})();
