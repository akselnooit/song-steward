/* Song Steward — shared UI primitives */
(function () {
  const { useState } = React;
  const I = window.Icon;

  function Avatar({ size = 22 }) {
    return (
      <div className="avatar" style={{ width: size, height: size }}>
        <I.user size={size * 0.62} />
      </div>
    );
  }

  function ColBadge({ song }) {
    return <span className="badge-col">{song.collection} {song.number}</span>;
  }

  function KeyChip({ song }) {
    return <span className="key t-mono">{window.SS.keyLabel(song)}</span>;
  }

  // a song row card used in lists
  function SongCard({ song, onOpen, right, showKey = true }) {
    return (
      <div className="song-card" onClick={onOpen} style={{ cursor: 'pointer' }}>
        <ColBadge song={song} />
        <div className="meta">
          <div className="title" style={{ textWrap: 'pretty' }}>{song.title}</div>
          <div className="author"><Avatar /> {song.author}</div>
        </div>
        {showKey && <KeyChip song={song} />}
        {right}
      </div>
    );
  }

  // tag pill with source coloring
  function TagPill({ name, source, state, locked, onClick, onContextMenu, ...rest }) {
    const cls = ['tag'];
    if (state === 'include') cls.push('include');
    else if (state === 'exclude') cls.push('exclude');
    else if (source) cls.push('src-' + source);
    if (locked) cls.push('locked');
    return (
      <button className={cls.join(' ')} onClick={onClick} onContextMenu={onContextMenu} {...rest}>
        {source && !state && <span className="dot" />}
        {locked && <I.lock size={12} />}
        {name}
      </button>
    );
  }

  function Seg({ options, value, onChange }) {
    return (
      <div className="seg">
        {options.map(o => (
          <button key={o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>{o.label}</button>
        ))}
      </div>
    );
  }

  function MetaChip({ icon, children }) {
    const Ico = icon ? I[icon] : null;
    return <span className="meta-chip">{Ico && <Ico size={14} />}{children}</span>;
  }

  function SectionHead({ label, icon, action }) {
    const Ico = icon ? I[icon] : null;
    return (
      <div className="sec-h">
        <div className="t-label">{Ico && <Ico size={14} />}{label}</div>
        {action}
      </div>
    );
  }

  // collapsible category block for tags
  function CatBlock({ name, count, defaultOpen, children, locked }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <div className="cat-block">
        <div className="cat-head" onClick={() => setOpen(o => !o)}>
          <span className="name">{name}{locked && <I.lock size={13} />}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {count != null && <span className="count-line">{count}</span>}
            <I.chevR size={16} className={'chev' + (open ? ' open' : '')} />
          </span>
        </div>
        {open && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>{children}</div>}
      </div>
    );
  }

  // global location filter indicator: icon when neutral, named chip when active.
  // No clear button — tap routes to Ustawienia → Filtry (single source of truth).
  function LocationChip({ value, onClick }) {
    const active = value && value !== 'Wszystkie';
    if (!active) {
      return <div className="icon-btn" onClick={onClick} title="Filtr lokalizacji"><I.pin size={19} /></div>;
    }
    return (
      <button className="loc-chip" onClick={onClick} title="Zmień w Ustawieniach → Filtry">
        <I.pin size={15} /> {value}
      </button>
    );
  }

  window.UI = { Avatar, ColBadge, KeyChip, SongCard, TagPill, Seg, MetaChip, SectionHead, CatBlock, LocationChip };
})();
