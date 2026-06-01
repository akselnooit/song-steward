/* Song Steward — Song detail overlay (bottom sheet) */
(function () {
  const { useState, useEffect } = React;
  const I = window.Icon;
  const { TagPill, CatBlock } = window.UI;
  const SS = window.SS;

  // fabricate a little singing history per song
  function historyFor(song) {
    const base = [
      { date: '28.05.2026', loc: 'Wrocław', leader: 'Edwin' },
      { date: '21.05.2026', loc: 'Wrocław', leader: 'Aksel' },
      { date: '24.04.2026', loc: 'Ustroń',  leader: 'Ruben' },
      { date: '02.04.2026', loc: 'Brunstad',leader: 'Aksel' },
    ];
    const n = (song.number % 4);
    return base.slice(0, n === 0 ? 2 : n + 1);
  }

  function SongDetail({ song, list, onClose, onNavigate, serviceContext, nearestService, onAddToService }) {
    const idx = list ? list.findIndex(s => s.id === song.id) : -1;
    const [added, setAdded] = useState({});      // name -> true (pending add)
    const [removed, setRemoved] = useState({});  // name -> true (pending removal)
    const [shake, setShake] = useState(null);
    const [openCat, setOpenCat] = useState('char');
    const [svcToast, setSvcToast] = useState(null); // 'planned' | 'sung'

    useEffect(() => { setAdded({}); setRemoved({}); setSvcToast(null); }, [song.id]);

    const addToSvc = (status) => {
      setSvcToast(status);
      if (onAddToService) onAddToService(song, status);
    };

    const go = (dir) => {
      if (!list || idx < 0) return;
      const ni = idx + dir;
      if (ni >= 0 && ni < list.length) onNavigate(list[ni]);
    };

    // tags on this song, by category
    const onSong = {};
    song.tags.forEach(tg => { (onSong[tg.cat] = onSong[tg.cat] || []).push(tg); });

    const toggleActive = (cat, tg) => {
      const c = SS.categories.find(c => c.id === cat);
      if (!c.editable) { setShake(tg.name); setTimeout(() => setShake(null), 320); return; }
      setRemoved(r => ({ ...r, [tg.name]: !r[tg.name] }));
    };
    const toggleInactive = (cat, name) => {
      const c = SS.categories.find(c => c.id === cat);
      if (!c.editable) { setShake(name); setTimeout(() => setShake(null), 320); return; }
      setAdded(a => ({ ...a, [name]: !a[name] }));
    };

    const hist = historyFor(song);

    // catName lookup
    const catName = (id) => (SS.categories.find(c => c.id === id) || {}).name || '';

    // ALL currently-selected tags across every category (respecting pending add/remove)
    const selected = [];
    SS.categories.forEach(cat => {
      const active = onSong[cat.id] || [];
      active.forEach(tg => { if (!removed[tg.name]) selected.push({ cat: cat.id, name: tg.name, source: added[tg.name] ? 'user' : tg.source }); });
      (SS.tags[cat.id] || []).forEach(n => {
        if (added[n] && !active.some(a => a.name === n)) selected.push({ cat: cat.id, name: n, source: 'user' });
      });
    });

    const svc = nearestService || SS.services[0];
    const svcDateLabel = svc.today ? 'Dziś' : new Date(svc.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });

    return (
      <React.Fragment>
        <div className="scrim" onClick={onClose} />
        <div className="sheet" role="dialog">
          <div className="sheet-grab" />
          {list && idx > 0 && (
            <div className="sheet-nav" style={{ left: 14 }} onClick={() => go(-1)}><I.arrowL size={18} /></div>
          )}
          {list && idx < list.length - 1 && (
            <div className="sheet-nav" style={{ right: 14 }} onClick={() => go(1)}><I.arrowR size={18} /></div>
          )}
          <div className="sheet-body">
            {/* header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '14px 8px 4px' }}>
              <div className="photo-ph" style={{ width: 76, height: 76, borderRadius: '50%', border: '1px solid var(--border)', marginBottom: 12 }} />
              <span className="badge-col" style={{ marginBottom: 9 }}>{song.collection} {song.number}</span>
              <h2 className="t-title" style={{ fontSize: 23, margin: '0 0 10px', lineHeight: 1.15, textWrap: 'balance' }}>{song.title}</h2>
              <div style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 8 }}>{song.author}</div>
              <div className="t-mono" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>{SS.keyLabel(song)}</div>
            </div>

            {/* add to nearest (or current) service */}
            <div className="card" style={{ padding: 14, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
                <span className="t-label" style={{ flex: 1 }}>{serviceContext ? 'To nabożeństwo' : 'Najbliższe nabożeństwo'}</span>
                {svc.today && <span style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill)' }}>DZIŚ</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 13, fontSize: 13.5, color: 'var(--text-2)', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{svc.category}</span>
                <span style={{ color: 'var(--text-3)' }}>· {svcDateLabel} · {svc.location}</span>
              </div>
              {svcToast ? (
                <div className="fin" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>
                  <I.check size={18} /> {svcToast === 'sung' ? 'Dodano do zaśpiewanych' : 'Dodano do zaplanowanych'}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-ghost btn-block" onClick={() => addToSvc('planned')}><I.bookmark size={18} /> Zaplanuj</button>
                  <button className="btn btn-primary btn-block" onClick={() => addToSvc('sung')}><I.check size={18} /> Zaśpiewana</button>
                </div>
              )}
            </div>

            {/* ALL selected tags (summary across categories) */}
            {selected.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <I.tag size={14} /> Wybrane tagi · {selected.length}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selected.map(tg => (
                    <span key={tg.cat + tg.name} className="tag" style={{ cursor: 'default' }}>
                      <span className="dot" style={{ background: 'var(--src-' + tg.source + ')' }} />
                      {tg.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* tag categories (edit / add) */}
            <div style={{ marginTop: 20 }}>
              <div className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, whiteSpace: 'nowrap' }}>
                <I.pencil size={13} /> Edytuj tagi wg kategorii
              </div>
              {SS.categories.map(cat => {
                const activeRaw = onSong[cat.id] || [];
                const allTags = SS.tags[cat.id] || [];
                const activeNames = activeRaw.map(a => a.name);
                const inactive = allTags.filter(n => !activeNames.includes(n));
                const cnt = activeRaw.length + Object.keys(added).filter(n => allTags.includes(n)).length;
                return (
                  <CatBlock key={cat.id} name={cat.name} count={cnt} locked={!cat.editable}
                    defaultOpen={cat.id === 'char'}>
                    {activeRaw.map(tg => {
                      const src = added[tg.name] ? 'user' : tg.source;
                      return (
                        <span key={tg.name} className={shake === tg.name ? 'shake' : ''}>
                          <TagPill name={tg.name} source={src} locked={!cat.editable}
                            onClick={() => toggleActive(cat.id, tg)}
                            style={removed[tg.name] ? { textDecoration: 'line-through', opacity: .6 } : null} />
                        </span>
                      );
                    })}
                    {inactive.map(n => {
                      const isAdded = added[n];
                      return (
                        <span key={n} className={shake === n ? 'shake' : ''}>
                          <TagPill name={n} source={isAdded ? 'user' : null} locked={!cat.editable}
                            onClick={() => toggleInactive(cat.id, n)}
                            style={isAdded ? null : { opacity: .55, borderStyle: 'dashed' }} />
                        </span>
                      );
                    })}
                  </CatBlock>
                );
              })}
            </div>

            {/* singing history */}
            <div style={{ marginTop: 22 }}>
              <div className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <I.history size={14} /> Historia śpiewania
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                <div className="list-rows">
                  {hist.map((h, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                      <I.calendar size={16} style={{ color: 'var(--text-3)' }} />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{h.date}</span>
                      <span style={{ color: 'var(--text-3)', fontSize: 13 }}>· {h.loc} · {h.leader}</span>
                      <I.chevR size={15} style={{ marginLeft: 'auto', color: 'var(--text-3)' }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="hint" style={{ marginTop: 10, justifyContent: 'center' }}>
                Przesuń w bok, aby zmienić pieśń · w dół, aby zamknąć
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }

  window.SongDetail = SongDetail;
})();
