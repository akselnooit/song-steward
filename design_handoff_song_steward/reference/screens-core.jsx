/* Song Steward — Login + Dashboard */
(function () {
  const { useState } = React;
  const I = window.Icon;
  const SS = window.SS;
  const { SongCard, MetaChip, SectionHead } = window.UI;

  /* ---------------- LOGIN ---------------- */
  function Login({ onEnter }) {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    return (
      <div className="screen" style={{ paddingTop: 56, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px' }}>
          {/* wordmark */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
            <div style={{ width: 64, height: 64, borderRadius: 'var(--r-lg)', background: 'var(--accent)', color: 'var(--accent-contrast)', display: 'grid', placeItems: 'center', marginBottom: 18, boxShadow: 'var(--shadow-card)' }}>
              <I.waveform size={34} />
            </div>
            <h1 className="t-title" style={{ fontSize: 29, margin: 0, whiteSpace: 'nowrap', lineHeight: 1.1 }}>Song Steward</h1>
            <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              Pieśni i nabożeństwa, zawsze pod ręką
            </p>
          </div>

          {!sent ? (
            <div className="fin">
              <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Adres e-mail</label>
              <div className="field-wrap" style={{ marginBottom: 14 }}>
                <span className="field-ico"><I.mail size={18} /></span>
                <input className="field" type="email" placeholder="ty@zbor.pl" value={email}
                  onChange={e => setEmail(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-block" onClick={() => setSent(true)}>
                <I.sparkle size={18} /> Wyślij link logujący
              </button>
              <div className="hint" style={{ marginTop: 18, justifyContent: 'center', textAlign: 'center', lineHeight: 1.5 }}>
                <I.lock size={13} /> Dostęp tylko na zaproszenie. Konta zakłada administrator.
              </div>
            </div>
          ) : (
            <div className="fin card" style={{ padding: 22, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <I.mail size={24} />
              </div>
              <div className="t-title" style={{ fontSize: 19, marginBottom: 6 }}>Sprawdź skrzynkę</div>
              <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                Wysłaliśmy link logujący na <b style={{ color: 'var(--text)' }}>{email || 'ty@zbor.pl'}</b>. Kliknij go, aby wejść.
              </p>
            </div>
          )}
        </div>

        <div style={{ padding: '0 26px calc(28px + env(safe-area-inset-bottom))' }}>
          <button className="btn btn-ghost btn-block" onClick={onEnter}>
            Wejdź do podglądu (demo) <I.arrowR size={17} />
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- DASHBOARD ---------------- */
  function TopRow({ rank, song, n, onOpen }) {
    return (
      <div className="song-card" style={{ cursor: 'pointer', padding: '11px 4px' }} onClick={onOpen}>
        <span className="rank">{rank}</span>
        <div className="meta">
          <div className="title" style={{ fontSize: 15 }}>{song.title}</div>
          <div className="author"><span className="badge-col" style={{ fontSize: 10 }}>{song.collection} {song.number}</span></div>
        </div>
        {n != null && <span className="count-x">{n}×</span>}
      </div>
    );
  }

  function TodayCard({ onOpenLive }) {
    const svc = SS.services[0];
    return (
      <div className="card" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--r-pill)', letterSpacing: '0.02em' }}>DZIŚ</span>
          <span className="count-line">sobota, 31 maja</span>
        </div>
        <div className="t-title" style={{ fontSize: 21, marginBottom: 4 }}>{svc.category} · {svc.location}</div>
        <div style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <I.user size={14} /> {svc.leader}
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button className="btn btn-primary btn-block" onClick={onOpenLive}>
            <I.waveform size={17} /> Otwórz na żywo
          </button>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 13, color: 'var(--text-3)', fontSize: 12.5 }}>
          <span><b style={{ color: 'var(--text-2)' }}>{svc.sung.length}</b> zaśpiewanych</span>
          <span><b style={{ color: 'var(--text-2)' }}>{svc.planned.length}</b> zaplanowanych</span>
        </div>
      </div>
    );
  }

  function Dashboard({ onOpenSong, onOpenLive, onNewService, onOpenSettings, onOpenModeration, moderationCount, locFilter, onOpenFilters, statLeader, statRange, statInc, statExc, onOpenStatFilters }) {
    const { LocationChip } = window.UI;
    const active = locFilter && locFilter !== 'Wszystkie';
    const locSuffix = active ? ' · ' + locFilter : '';

    // human-language description of the active stat filters
    const rangeText = statRange === 'Cały czas' ? 'całego okresu' : 'ostatnich ' + statRange.replace(' mies.', '') + ' miesięcy';
    const sentence = (() => {
      let s = 'Pokazuję statystyki dla ' + (active ? 'lokalizacji ' + locFilter : 'wszystkich lokalizacji')
        + ', z ' + rangeText;
      if (statLeader && statLeader !== 'Wszyscy') s += ', prowadzący: ' + statLeader;
      if (statInc && statInc.length) s += ', z tagami: ' + statInc.join(', ');
      if (statExc && statExc.length) s += ', bez: ' + statExc.join(', ');
      return s + '.';
    })();

    const modBanner = moderationCount > 0 ? (
      <div className="card" style={{ padding: '12px 14px', marginTop: 12, display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' }} onClick={onOpenModeration}>
        <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--src-user-soft)', color: 'var(--src-user)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><I.filter size={17} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Moderacja tagów</div>
          <div className="count-line">{moderationCount} oczekujących zmian</div>
        </div>
        <span style={{ background: 'var(--src-user)', color: 'var(--accent-contrast)', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--r-pill)' }}>{moderationCount}</span>
      </div>
    ) : null;

    return (
      <div className="screen">
        <div className="app-header">
          <div>
            <div className="sub" style={{ marginBottom: 2 }}>Dzień dobry</div>
            <h1>Aksel</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <LocationChip value={locFilter} onClick={onOpenFilters} />
            <div className="icon-btn" onClick={onOpenSettings}><I.settings size={20} /></div>
          </div>
        </div>
        <div className="screen-pad">
          <TodayCard onOpenLive={onOpenLive} />
          {modBanner}
          <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={onNewService}>
            <I.plus size={18} /> Nowe nabożeństwo
          </button>

          <SectionHead label={'Najczęściej śpiewane' + locSuffix} icon="chart" />
          <div className="card list-rows" style={{ padding: '4px 14px' }}>
            {SS.topSung.map((r, i) => (
              <TopRow key={r.song.id} rank={i + 1} song={r.song} n={r.n} onOpen={() => onOpenSong(r.song, SS.topSung.map(x => x.song))} />
            ))}
          </div>

          <SectionHead label={'Nigdy nieśpiewane' + locSuffix} icon="clock" />
          <div className="card list-rows" style={{ padding: '4px 14px' }}>
            {SS.neverSung.map((s) => (
              <TopRow key={s.id} song={s} onOpen={() => onOpenSong(s, SS.neverSung)} />
            ))}
          </div>

          {/* human-language filter summary → tap to edit in Ustawienia → Filtry */}
          <button className="filter-summary" onClick={onOpenStatFilters}>
            <I.filter size={15} />
            <span>{sentence}</span>
            <span className="filter-summary-cta">Zmień <I.chevR size={13} /></span>
          </button>
        </div>
      </div>
    );
  }

  window.Login = Login;
  window.Dashboard = Dashboard;
})();
