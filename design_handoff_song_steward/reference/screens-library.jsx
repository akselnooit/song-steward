/* Song Steward — Song library + Tag search (2 variants) */
(function () {
  const { useState, useRef, useMemo } = React;
  const I = window.Icon;
  const SS = window.SS;
  const { SongCard, TagPill, CatBlock } = window.UI;

  const COL_ORDER = { DP: 0, KM: 1, NDP: 2, NKM: 3, SOS: 4 };
  const sortSongs = (a, b) =>
    (COL_ORDER[a.collection] - COL_ORDER[b.collection]) || (a.number - b.number);

  function tagNames(song) { return song.tags.map(t => t.name); }
  function matches(song, inc, exc) {
    const names = tagNames(song);
    for (const i of inc) if (!names.includes(i)) return false;
    for (const e of exc) if (names.includes(e)) return false;
    return true;
  }

  // long-press + move-cancel hook (per spec: >8px => scroll, ~500ms => exclude)
  function useLongPress(onClick, onLong, ms = 500) {
    const t = useRef(null), start = useRef(null), fired = useRef(false);
    const clear = () => { if (t.current) clearTimeout(t.current); t.current = null; };
    return {
      onPointerDown: (e) => {
        fired.current = false; start.current = { x: e.clientX, y: e.clientY };
        t.current = setTimeout(() => { fired.current = true; onLong && onLong(); }, ms);
      },
      onPointerMove: (e) => {
        if (!start.current) return;
        const d = Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y);
        if (d > 8) clear();
      },
      onPointerUp: () => { clear(); if (!fired.current) onClick && onClick(); start.current = null; },
      onPointerLeave: clear,
      onContextMenu: (e) => { e.preventDefault(); onLong && onLong(); },
    };
  }

  /* ---------------- SONG LIBRARY ---------------- */
  function SongLibrary({ onOpenSong }) {
    const [q, setQ] = useState('');
    const [col, setCol] = useState('DP');
    const results = useMemo(() => {
      let r = SS.songs.filter(s => s.collection === col);
      if (q.trim()) {
        const n = q.toLowerCase();
        r = r.filter(s => s.title.toLowerCase().includes(n) || (s.author || '').toLowerCase().includes(n) || String(s.number).includes(n));
      }
      return r.slice().sort(sortSongs);
    }, [q, col]);

    return (
      <div className="screen">
        <div className="app-header"><h1>Pieśni</h1></div>
        <div style={{ padding: '0 18px 10px' }}>
          <div className="field-wrap" style={{ marginBottom: 12 }}>
            <span className="field-ico"><I.search size={18} /></span>
            <input className="field" placeholder="Szukaj: tytuł, autor lub numer" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="hrow">
            {SS.collections.map(c => (
              <button key={c.id} className={'tag' + (col === c.id ? ' include' : '')} onClick={() => setCol(c.id)}>
                {c.short}
              </button>
            ))}
          </div>
        </div>
        <div className="screen-pad">
          <div className="count-line" style={{ margin: '6px 2px 10px' }}>
            Znaleziono <b>{results.length}</b> {results.length === 1 ? 'pieśń' : 'pieśni'}
          </div>
          <div className="card list-rows">
            {results.map(s => <SongCard key={s.id} song={s} onOpen={() => onOpenSong(s, results)} />)}
            {results.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)' }}>Brak wyników</div>}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- TAG SEARCH ---------------- */
  function FilterTag({ name, source, inc, exc, onInc, onExc }) {
    const h = useLongPress(onInc, onExc);
    const state = inc ? 'include' : exc ? 'exclude' : null;
    return <TagPill name={name} source={state ? null : source} state={state} {...h} />;
  }

  function TagSearch({ serviceContext, onOpenSong }) {
    const [inc, setInc] = useState(['uwielbieniowa']);
    const [exc, setExc] = useState([]);
    const [sheet, setSheet] = useState(false);
    const toggleInc = (n) => { setExc(e => e.filter(x => x !== n)); setInc(s => s.includes(n) ? s.filter(x => x !== n) : [...s, n]); };
    const toggleExc = (n) => { setInc(s => s.filter(x => x !== n)); setExc(e => e.includes(n) ? e.filter(x => x !== n) : [...e, n]); };
    const clearOne = (n) => { setInc(s => s.filter(x => x !== n)); setExc(e => e.filter(x => x !== n)); };

    const results = useMemo(() => SS.songs.filter(s => matches(s, inc, exc)).sort(sortSongs), [inc, exc]);
    // only tags present in current results
    const present = useMemo(() => {
      const set = new Set();
      results.forEach(s => s.tags.forEach(t => set.add(t.name)));
      return set;
    }, [results]);

    const srcOf = (name) => { for (const s of SS.songs) { const t = s.tags.find(t => t.name === name); if (t) return t.source; } return 'confirmed'; };

    const activeFilters = [...inc.map(n => ({ n, kind: 'inc' })), ...exc.map(n => ({ n, kind: 'exc' }))];

    const resultsList = (
      <div className="card list-rows">
        {results.map(s => (
          <SongCard key={s.id} song={s} onOpen={() => onOpenSong(s, results)}
            right={serviceContext ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="mini-btn"><I.bookmark size={16} /></button>
                <button className="mini-btn good"><I.check size={16} /></button>
              </div>
            ) : null} />
        ))}
        {results.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)' }}>Brak pieśni dla tych filtrów</div>}
      </div>
    );

    const popular = ['uwielbieniowa', 'radosna', 'refleksyjna', 'Duch Święty', 'łaska', 'krzyż', 'molowa', 'chrzest', 'szybkie', 'spokojna'];
      return (
        <div className="screen" style={{ paddingTop: 0 }}>
          <div className="sticky-head" style={{ paddingTop: 56 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <h1 className="t-title" style={{ fontSize: 26, margin: 0 }}>Szukaj</h1>
              <span className="count-line">Znaleziono <b>{results.length}</b></span>
            </div>
            {activeFilters.length > 0 ? (
              <div className="pill-row">
                {activeFilters.map(f => (
                  <button key={f.n} className={'tag ' + (f.kind === 'inc' ? 'include' : 'exclude')} onClick={() => clearOne(f.n)}>
                    {f.n} <I.x size={13} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="hint">Dotknij tagu, aby filtrować · przytrzymaj, aby wykluczyć</div>
            )}
            {/* quick popular tags */}
            <div className="hrow" style={{ marginTop: 10 }}>
              {popular.filter(n => present.has(n) || inc.includes(n) || exc.includes(n)).map(n => (
                <FilterTag key={n} name={n} source={srcOf(n)} inc={inc.includes(n)} exc={exc.includes(n)}
                  onInc={() => toggleInc(n)} onExc={() => toggleExc(n)} />
              ))}
            </div>
          </div>
          <div className="screen-pad" style={{ paddingTop: 14 }}>{resultsList}</div>
          <button className="fab" onClick={() => setSheet(true)}><I.filter size={18} /> Wszystkie tagi</button>

          {sheet && (
            <React.Fragment>
              <div className="scrim" onClick={() => setSheet(false)} />
              <div className="sheet">
                <div className="sheet-grab" />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 4px' }}>
                  <h2 className="t-title" style={{ fontSize: 20, margin: 0 }}>Wszystkie tagi</h2>
                  <span className="count-line">{results.length} wyników</span>
                </div>
                <div className="sheet-body">
                  {SS.categories.map(cat => {
                    const list = (SS.tags[cat.id] || []).filter(n => present.has(n) || inc.includes(n) || exc.includes(n));
                    if (list.length === 0) return null;
                    return (
                      <CatBlock key={cat.id} name={cat.name} count={list.length} defaultOpen={cat.id === 'char'} locked={!cat.editable}>
                        {list.map(n => (
                          <FilterTag key={n} name={n} source={srcOf(n)} inc={inc.includes(n)} exc={exc.includes(n)}
                            onInc={() => toggleInc(n)} onExc={() => toggleExc(n)} />
                        ))}
                      </CatBlock>
                    );
                  })}
                </div>
              </div>
            </React.Fragment>
          )}
        </div>
      );
  }

  window.SongLibrary = SongLibrary;
  window.TagSearch = TagSearch;
})();
