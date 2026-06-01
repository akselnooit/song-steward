/* Song Steward — Panel moderacji + Ustawienia (słowniki / filtry) */
(function () {
  const { useState } = React;
  const I = window.Icon;
  const SS = window.SS;

  /* ============================================================
     PANEL MODERACJI (4.4)
     ============================================================ */
  function Moderation({ onBack, onOpenSong }) {
    // local working copy: each entry -> { adds:[{name,state}], removes:[{name,state}] }
    // state: 'pending' | 'confirmed' | 'cancelled'
    const [groups, setGroups] = useState(() =>
      SS.moderation.map(g => ({
        song: g.song,
        adds: g.adds.map(name => ({ name, state: 'pending' })),
        removes: g.removes.map(name => ({ name, state: 'pending' })),
      }))
    );

    const setItem = (gi, kind, ii, state) =>
      setGroups(gs => gs.map((g, i) => i !== gi ? g : {
        ...g, [kind]: g[kind].map((it, j) => j === ii ? { ...it, state } : it),
      }));

    const confirmAll = () =>
      setGroups(gs => gs.map(g => ({
        ...g,
        adds: g.adds.map(a => a.state === 'pending' ? { ...a, state: 'confirmed' } : a),
        removes: g.removes.map(r => r.state === 'pending' ? { ...r, state: 'confirmed' } : r),
      })));

    const pendingCount = groups.reduce((n, g) =>
      n + g.adds.filter(a => a.state === 'pending').length + g.removes.filter(r => r.state === 'pending').length, 0);
    const addCount = groups.reduce((n, g) => n + g.adds.filter(a => a.state === 'pending').length, 0);
    const remCount = groups.reduce((n, g) => n + g.removes.filter(r => r.state === 'pending').length, 0);

    const visibleGroups = groups.filter(g =>
      g.adds.some(a => a.state !== 'cancelled') || g.removes.some(r => r.state !== 'cancelled'));

    const stateStyle = (state) => state === 'confirmed'
      ? { opacity: .5 }
      : state === 'cancelled' ? { opacity: .35, textDecoration: 'line-through' } : null;

    return (
      <div className="screen" style={{ paddingTop: 0 }}>
        <div style={{ paddingTop: 52, padding: '52px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button className="icon-btn" onClick={onBack}><I.arrowL size={19} /></button>
            <div style={{ flex: 1 }}>
              <h1 className="t-title" style={{ fontSize: 24, margin: 0 }}>Panel moderacji</h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span className="meta-chip"><span className="dot" style={{ width: 8, height: 8, borderRadius: 9, background: 'var(--src-user)' }} /> {addCount} do dodania</span>
            <span className="meta-chip"><span className="dot" style={{ width: 8, height: 8, borderRadius: 9, background: 'var(--danger)' }} /> {remCount} do usunięcia</span>
          </div>
        </div>

        <div className="screen-pad" style={{ paddingTop: 14 }}>
          {pendingCount > 0 && (
            <button className="btn btn-primary btn-block" style={{ marginBottom: 16 }} onClick={confirmAll}>
              <I.check size={18} /> Zatwierdź wszystko ({pendingCount})
            </button>
          )}

          {visibleGroups.length === 0 && (
            <div className="card" style={{ padding: 30, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}><I.check size={24} /></div>
              <div className="t-title" style={{ fontSize: 17, marginBottom: 4 }}>Wszystko zatwierdzone</div>
              <div className="count-line">Brak oczekujących zmian w tagach.</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleGroups.map((g) => {
              const gi = groups.indexOf(g);
              return (
                <div key={g.song.id} className="card" style={{ padding: 14 }}>
                  <div className="song-card" style={{ padding: '0 0 12px', cursor: 'pointer' }} onClick={() => onOpenSong(g.song, visibleGroups.map(x => x.song))}>
                    <span className="badge-col">{g.song.collection} {g.song.number}</span>
                    <div className="meta"><div className="title" style={{ fontSize: 15 }}>{g.song.title}</div></div>
                    <I.chevR size={16} style={{ color: 'var(--text-3)' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    {g.adds.map((a, ii) => (
                      <div key={'a' + a.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="t-label" style={{ width: 64, flexShrink: 0, color: 'var(--src-user)' }}>Dodanie</span>
                        <span className="tag src-user" style={{ ...stateStyle(a.state) }}><span className="dot" /> {a.name}</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          {a.state === 'pending' ? (
                            <React.Fragment>
                              <button className="mini-btn good" title="Zatwierdź" onClick={() => setItem(gi, 'adds', ii, 'confirmed')}><I.check size={16} /></button>
                              <button className="mini-btn bad" title="Anuluj" onClick={() => setItem(gi, 'adds', ii, 'cancelled')}><I.x size={16} /></button>
                            </React.Fragment>
                          ) : (
                            <button className="mini-btn" title="Cofnij" onClick={() => setItem(gi, 'adds', ii, 'pending')}><I.history size={15} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                    {g.removes.map((r, ii) => (
                      <div key={'r' + r.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="t-label" style={{ width: 64, flexShrink: 0, color: 'var(--danger)' }}>Usunięcie</span>
                        <span className="tag" style={{ textDecoration: 'line-through', background: 'var(--danger-soft)', color: 'var(--danger)', borderColor: 'var(--danger-bd)', ...(r.state !== 'pending' ? { opacity: r.state === 'confirmed' ? .5 : .35 } : null) }}>{r.name}</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          {r.state === 'pending' ? (
                            <React.Fragment>
                              <button className="mini-btn good" title="Zatwierdź usunięcie" onClick={() => setItem(gi, 'removes', ii, 'confirmed')}><I.check size={16} /></button>
                              <button className="mini-btn" title="Przywróć" onClick={() => setItem(gi, 'removes', ii, 'cancelled')}><I.history size={15} /></button>
                            </React.Fragment>
                          ) : (
                            <button className="mini-btn" title="Cofnij" onClick={() => setItem(gi, 'removes', ii, 'pending')}><I.history size={15} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     USTAWIENIA — Słowniki + Filtry (4.10)
     ============================================================ */
  const DICTS = [
    { key: 'locations',   label: 'Lokalizacje',        icon: 'pin',      sub: 'Miejsca nabożeństw' },
    { key: 'svcCats',     label: 'Kategorie nabożeństw',icon: 'layers',   sub: 'Typy wydarzeń' },
    { key: 'leaders',     label: 'Prowadzący',          icon: 'user',     sub: 'Powiązani z kontami' },
    { key: 'collections', label: 'Zbiory pieśni',       icon: 'music',    sub: 'Śpiewniki i skróty' },
    { key: 'tagCats',     label: 'Kategorie tagów',     icon: 'tag',      sub: 'Z flagą edytowalności' },
    { key: 'tags',        label: 'Tagi',                icon: 'bookmark', sub: 'Wszystkie etykiety' },
  ];

  function DictEditor({ dict, onClose }) {
    const [items, setItems] = useState(SS.dictionaries[dict.key].map((it, i) => ({ ...it, _id: i })));
    const [draft, setDraft] = useState('');
    const [editing, setEditing] = useState(null);

    const add = () => {
      const v = draft.trim(); if (!v) return;
      setItems(list => [...list, { name: v, _id: Date.now() }]);
      setDraft('');
    };
    const del = (id) => setItems(list => list.filter(it => it._id !== id));
    const rename = (id, v) => setItems(list => list.map(it => it._id === id ? { ...it, name: v } : it));

    return (
      <React.Fragment>
        <div className="scrim" onClick={onClose} />
        <div className="sheet">
          <div className="sheet-grab" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 6px' }}>
            <h2 className="t-title" style={{ fontSize: 20, margin: 0 }}>{dict.label}</h2>
            <span className="count-line">{items.length} pozycji</span>
          </div>
          <div className="sheet-body">
            {/* add row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div className="field-wrap" style={{ flex: 1 }}>
                <span className="field-ico"><I.plus size={18} /></span>
                <input className="field" placeholder={'Dodaj: ' + dict.label.toLowerCase()} value={draft}
                  onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
              </div>
              <button className="btn btn-primary" onClick={add} style={{ minWidth: 56 }}>Dodaj</button>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="list-rows">
                {items.map(it => (
                  <div key={it._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px' }}>
                    {dict.key === 'collections' && <span className="badge-col">{it.short}</span>}
                    {editing === it._id ? (
                      <input className="field" autoFocus defaultValue={it.name} style={{ padding: '8px 12px', flex: 1 }}
                        onBlur={e => { rename(it._id, e.target.value); setEditing(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') { rename(it._id, e.target.value); setEditing(null); } }} />
                    ) : (
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text)' }}>{it.name}</div>
                        {dict.key === 'leaders' && (
                          <div style={{ fontSize: 12, color: it.account ? 'var(--accent)' : 'var(--text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                            {it.account ? <React.Fragment><I.mail size={12} /> {it.account}</React.Fragment> : 'Gość — brak konta'}
                          </div>
                        )}
                        {dict.key === 'tags' && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{(SS.categories.find(c => c.id === it.cat) || {}).name}</div>}
                        {dict.key === 'collections' && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{it.count} pieśni</div>}
                      </div>
                    )}
                    {dict.key === 'tagCats' && (
                      <span className="tag" style={{ cursor: 'default', fontSize: 11, padding: '4px 9px' }}>
                        {it.editable === false ? <React.Fragment><I.lock size={11} /> tylko odczyt</React.Fragment> : 'edytowalna'}
                      </span>
                    )}
                    <button className="mini-btn" title="Zmień nazwę" onClick={() => setEditing(it._id)}><I.pencil size={14} /></button>
                    <button className="mini-btn bad" title="Usuń" onClick={() => del(it._id)}><I.x size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="hint" style={{ marginTop: 12, justifyContent: 'center' }}>Zmiany w podglądzie są lokalne (dane przykładowe)</div>
          </div>
        </div>
      </React.Fragment>
    );
  }

  function Settings({ onBack, moderationCount, onOpenModeration, initialTab, locFilter, setLocFilter, highlightLoc, statLeader, setStatLeader, statRange, setStatRange, statInc, setStatInc, statExc, setStatExc, theme, setTheme }) {
    const [tab, setTab] = useState(initialTab || 'dict');
    const [editor, setEditor] = useState(null);
    const { CatBlock } = window.UI;

    const toggleTag = (n, kind) => {
      if (kind === 'inc') { setStatExc(e => e.filter(x => x !== n)); setStatInc(s => s.includes(n) ? s.filter(x => x !== n) : [...s, n]); }
      else { setStatInc(s => s.filter(x => x !== n)); setStatExc(e => e.includes(n) ? e.filter(x => x !== n) : [...e, n]); }
    };

    return (
      <div className="screen" style={{ paddingTop: 0 }}>
        <div style={{ paddingTop: 52, padding: '52px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button className="icon-btn" onClick={onBack}><I.arrowL size={19} /></button>
            <h1 className="t-title" style={{ fontSize: 24, margin: 0 }}>Ustawienia</h1>
          </div>
          <div className="seg" style={{ width: '100%', marginBottom: 4 }}>
            <button className={tab === 'dict' ? 'on' : ''} style={{ flex: 1 }} onClick={() => setTab('dict')}>Zarządzanie</button>
            <button className={tab === 'filters' ? 'on' : ''} style={{ flex: 1 }} onClick={() => setTab('filters')}>Preferencje</button>
          </div>
        </div>

        <div className="screen-pad" style={{ paddingTop: 16 }}>
          {tab === 'dict' ? (
            <React.Fragment>
              {/* moderation entry */}
              <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={onOpenModeration}>
                <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'var(--src-user-soft)', color: 'var(--src-user)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><I.filter size={19} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Panel moderacji</div>
                  <div className="count-line">Oczekujące zmiany w tagach</div>
                </div>
                {moderationCount > 0 && <span style={{ background: 'var(--src-user)', color: 'var(--accent-contrast)', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--r-pill)' }}>{moderationCount}</span>}
                <I.chevR size={16} style={{ color: 'var(--text-3)' }} />
              </div>

              <div className="t-label" style={{ marginBottom: 10 }}>Słowniki danych</div>
              <div className="card" style={{ overflow: 'hidden' }}>
                <div className="list-rows">
                  {DICTS.map(d => {
                    const Ico = I[d.icon];
                    return (
                      <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', cursor: 'pointer' }} onClick={() => setEditor(d)}>
                        <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Ico size={17} /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14.5 }}>{d.label}</div>
                          <div className="count-line">{d.sub}</div>
                        </div>
                        <span className="count-line">{SS.dictionaries[d.key].length}</span>
                        <I.chevR size={16} style={{ color: 'var(--text-3)' }} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <button className="btn btn-ghost btn-block" style={{ marginTop: 18 }} onClick={onBack}>Wyloguj się</button>
            </React.Fragment>
          ) : (
            <React.Fragment>
              {/* appearance / theme */}
              <div className="t-label" style={{ marginBottom: 10 }}>Wygląd</div>
              <div className="card" style={{ padding: 14, marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    {theme === 'dark' ? <I.moon size={19} /> : <I.sun size={19} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>Motyw</div>
                    <div className="count-line">Wybierz jasny lub ciemny wygląd</div>
                  </div>
                </div>
                <div className="theme-pick">
                  {[
                    { v: 'light', label: 'Jasny', icon: 'sun' },
                    { v: 'dark', label: 'Ciemny', icon: 'moon' },
                  ].map(opt => {
                    const Ico = I[opt.icon];
                    return (
                      <button key={opt.v} className={'theme-opt' + (theme === opt.v ? ' on' : '')} onClick={() => setTheme(opt.v)}>
                        <Ico size={18} /> {opt.label}
                        {theme === opt.v && <I.check size={15} style={{ marginLeft: 'auto' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="t-label" style={{ marginBottom: 9 }}>Globalny filtr lokalizacji</div>
              <div className={'pill-row' + (highlightLoc ? ' loc-highlight' : '')} style={{ marginBottom: 6, padding: highlightLoc ? 6 : 0 }}>
                {['Wszystkie', ...SS.locations].map(l => (
                  <button key={l} className={'tag' + (locFilter === l ? ' include' : '')} onClick={() => setLocFilter(l)}>{l}</button>
                ))}
              </div>
              <div className="hint" style={{ marginBottom: 22 }}>Wpływa na pulpit, listę nabożeństw i statystyki.</div>

              <div className="t-label" style={{ marginBottom: 9 }}>Domyślne filtry statystyk</div>
              <div className="card" style={{ padding: 16, marginBottom: 22 }}>
                <div style={{ marginBottom: 14 }}>
                  <div className="count-line" style={{ marginBottom: 8 }}>Prowadzący</div>
                  <div className="pill-row">
                    {['Wszyscy', ...SS.leaders.map(l => l.name.split(' ')[0])].map(l => (
                      <button key={l} className={'tag' + (statLeader === l ? ' include' : '')} onClick={() => setStatLeader(l)}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="count-line" style={{ marginBottom: 8 }}>Zakres czasu</div>
                  <div className="pill-row">
                    {['3 mies.', '6 mies.', '12 mies.', 'Cały czas'].map(r => (
                      <button key={r} className={'tag' + (statRange === r ? ' include' : '')} onClick={() => setStatRange(r)}>{r}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sec-h" style={{ marginTop: 0, marginBottom: 4 }}>
                <div className="t-label">Tagi statystyk</div>
                {(statInc.length > 0 || statExc.length > 0) && (
                  <button className="link-btn" onClick={() => { setStatInc([]); setStatExc([]); }}>Wyczyść</button>
                )}
              </div>
              <div className="hint" style={{ marginBottom: 10 }}>Dotknij = dołącz · przytrzymaj = wyklucz</div>

              {(statInc.length > 0 || statExc.length > 0) && (
                <div className="pill-row" style={{ marginBottom: 14 }}>
                  {statInc.map(n => (
                    <button key={'i' + n} className="tag include" onClick={() => toggleTag(n, 'inc')}>{n} <I.x size={13} /></button>
                  ))}
                  {statExc.map(n => (
                    <button key={'e' + n} className="tag exclude" onClick={() => toggleTag(n, 'exc')}>{n} <I.x size={13} /></button>
                  ))}
                </div>
              )}

              <div className="card" style={{ padding: '2px 16px 8px', marginBottom: 22 }}>
                {SS.categories.map((cat, ci) => (
                  <CatBlock key={cat.id} name={cat.name} count={(SS.tags[cat.id] || []).length} defaultOpen={ci === 0}>
                    {(SS.tags[cat.id] || []).map(n => {
                      const inc = statInc.includes(n), exc = statExc.includes(n);
                      return (
                        <button key={n} className={'tag' + (inc ? ' include' : exc ? ' exclude' : '')}
                          onClick={() => toggleTag(n, 'inc')}
                          onContextMenu={(e) => { e.preventDefault(); toggleTag(n, 'exc'); }}>
                          {n}
                        </button>
                      );
                    })}
                  </CatBlock>
                ))}
              </div>

              <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="count-line">Wersja aplikacji</span>
                <span className="t-mono" style={{ fontSize: 13, color: 'var(--text-2)' }}>v2.0 · a4f9c1e</span>
              </div>
            </React.Fragment>
          )}
        </div>

        {editor && <DictEditor dict={editor} onClose={() => setEditor(null)} />}
      </div>
    );
  }

  window.Moderation = Moderation;
  window.Settings = Settings;
})();
