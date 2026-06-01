/* Song Steward — line icon set. All 1.7px stroke, currentColor. */
(function () {
  const Ico = ({ d, size = 22, fill = false, sw = 1.7, children, vb = 24, style }) =>
  <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill={fill ? 'currentColor' : 'none'}
  stroke={fill ? 'none' : 'currentColor'} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {d ? <path d={d} /> : children}
    </svg>;


  const Icon = {
    home: (p) => <Ico {...p} d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
    music: (p) => <Ico {...p}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></Ico>,
    search: (p) => <Ico {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Ico>,
    tag: (p) => <Ico {...p}><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z" /><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" /></Ico>,
    calendar: (p) => <Ico {...p}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></Ico>,
    settings: (p) => <Ico {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Ico>,
    plus: (p) => <Ico {...p} d="M12 5v14M5 12h14" />,
    check: (p) => <Ico {...p} d="M4 12.5 9.5 18 20 6.5" sw={2.1} />,
    x: (p) => <Ico {...p} d="M6 6l12 12M18 6 6 18" />,
    chevR: (p) => <Ico {...p} d="m9 5 7 7-7 7" />,
    chevL: (p) => <Ico {...p} d="m15 5-7 7 7 7" />,
    chevD: (p) => <Ico {...p} d="m5 9 7 7 7-7" />,
    arrowL: (p) => <Ico {...p} d="M19 12H5M11 6l-6 6 6 6" />,
    arrowR: (p) => <Ico {...p} d="M5 12h14M13 6l6 6-6 6" />,
    bookmark: (p) => <Ico {...p} d="M6 4h12v17l-6-4-6 4z" />,
    drag: (p) => <Ico {...p}><circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none" /></Ico>,
    user: (p) => <Ico {...p}><circle cx="12" cy="8" r="4" /><path d="M5 21c0-4 3.5-6 7-6s7 2 7 6" /></Ico>,
    sun: (p) => <Ico {...p}><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></Ico>,
    moon: (p) => <Ico {...p} d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
    filter: (p) => <Ico {...p} d="M3 5h18l-7 8v6l-4 2v-8z" />,
    clock: (p) => <Ico {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></Ico>,
    pin: (p) => <Ico {...p}><path d="M12 21c5-5 7-8 7-11a7 7 0 1 0-14 0c0 3 2 6 7 11z" /><circle cx="12" cy="10" r="2.5" /></Ico>,
    mail: (p) => <Ico {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></Ico>,
    layers: (p) => <Ico {...p}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></Ico>,
    sparkle: (p) => <Ico {...p} d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
    chart: (p) => <Ico {...p}><path d="M4 20V4M4 20h16M9 16v-5M14 16V8M19 16v-3" /></Ico>,
    lock: (p) => <Ico {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Ico>,
    pencil: (p) => <Ico {...p} d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
    history: (p) => <Ico {...p}><path d="M3 12a9 9 0 1 1 3 6.7L3 16" /><path d="M3 21v-5h5" /><path d="M12 8v4l3 2" /></Ico>,
    waveform: (p) => <Ico {...p} d="M3 12h2l2-6 3 14 3-18 3 16 2-6h3" sw={1.6} />,
    arrowUpRight: (p) => <Ico {...p} d="M7 17 17 7M9 7h8v8" />
  };

  window.Icon = Icon;
})();