/* Song Steward — sample data (invented, realistic Polish content)
   Uses the real reference IDs / names from the spec. */
window.SS = (function () {
  const collections = [
    { id: 'DP',  short: 'DP',  name: 'Drogi Pańskie',             count: 471 },
    { id: 'KM',  short: 'KM',  name: 'Kwiat Migdałowy',           count: 445 },
    { id: 'NDP', short: 'NDP', name: 'Drogi Pańskie – dodatek',   count: 6 },
    { id: 'NKM', short: 'NKM', name: 'Kwiat Migdałowy – dodatek', count: 10 },
    { id: 'SOS', short: 'SOS', name: 'Sing Our Songs',            count: 52 },
  ];

  // tag categories — emoji kept (data, per spec); "Tagi SSF" is read-only
  const categories = [
    { id: 'char',  name: '🎤 Charakter',  editable: true },
    { id: 'okazja',name: '🎯 Okazja',     editable: true },
    { id: 'mel',   name: '🎶 Melodia',    editable: true },
    { id: 'temat', name: '📖 Tematyka',   editable: true },
    { id: 'ssf',   name: 'Tagi SSF',      editable: false },
  ];

  const tags = {
    char:  ['radosna', 'refleksyjna', 'uwielbieniowa', 'dziękczynna', 'modlitewna', 'energiczna', 'spokojna'],
    okazja:['chrzest', 'komunia', 'Boże Narodzenie', 'Wielkanoc', 'konferencja', 'pogrzeb', 'ślub', 'wieczerza'],
    mel:   ['durowa', 'molowa', 'wolne tempo', 'średnie tempo', 'szybkie', 'kanon'],
    temat: ['łaska', 'krzyż', 'zbawienie', 'Duch Święty', 'wierność Boża', 'pielgrzymka', 'nadzieja', 'miłość Boża', 'pokój'],
    ssf:   ['SSF 2023', 'SSF wybór', 'młodzież'],
  };

  // helper to make a song
  let _id = 0;
  const S = (collection, number, title, author, key, minor, tagspec) => ({
    id: 'song-' + (++_id), collection, number, title, author, key, minor,
    tags: tagspec, // [{cat, name, source}]
  });
  const t = (cat, name, source = 'confirmed') => ({ cat, name, source });

  const songs = [
    S('DP', 1, 'Wielki jesteś, Boże', 'ks. T. Klonowski', 'G', false, [
      t('char','uwielbieniowa'), t('char','radosna'), t('temat','wierność Boża'),
      t('mel','durowa'), t('ssf','SSF wybór'), t('temat','nadzieja','user'),
    ]),
    S('DP', 14, 'Tobie chwała, Panie', 'Tradycyjna', 'D', false, [
      t('char','uwielbieniowa'), t('temat','łaska'), t('mel','średnie tempo'), t('okazja','konferencja'),
    ]),
    S('DP', 27, 'Pan jest pasterzem moim', 'J. S. Bach (oprac.)', 'e', true, [
      t('char','refleksyjna'), t('char','spokojna'), t('mel','molowa'), t('temat','wierność Boża'), t('temat','pokój'),
    ]),
    S('DP', 58, 'Niech zstąpi Duch Twój', 'M. Lutkiewicz', 'a', true, [
      t('char','modlitewna'), t('temat','Duch Święty'), t('mel','wolne tempo'), t('okazja','konferencja','user'),
    ]),
    S('DP', 93, 'Dziękuję Ci, Panie', 'Tradycyjna', 'C', false, [
      t('char','dziękczynna'), t('char','radosna'), t('mel','durowa'), t('temat','łaska'),
    ]),
    S('DP', 112, 'Bądź uwielbiony', 'A. Reimann', 'F', false, [
      t('char','uwielbieniowa'), t('mel','średnie tempo'), t('temat','miłość Boża'), t('ssf','SSF 2023'),
    ]),
    S('DP', 145, 'Wznoszę swe oczy ku górom', 'P. Nowak', 'D', false, [
      t('char','refleksyjna'), t('temat','pielgrzymka'), t('temat','nadzieja'), t('mel','wolne tempo'),
    ]),
    S('DP', 188, 'Twoja krew obmywa mnie', 'Tradycyjna', 'g', true, [
      t('char','refleksyjna'), t('temat','krzyż'), t('temat','zbawienie'), t('mel','molowa'), t('okazja','wieczerza'),
    ]),
    S('DP', 203, 'Pan blisko jest', 'E. Schmidt', 'A', false, [
      t('char','spokojna'), t('temat','pokój'), t('mel','wolne tempo'),
    ]),
    S('DP', 256, 'Chwalcie Pana, wszystkie narody', 'Tradycyjna', 'G', false, [
      t('char','radosna'), t('char','energiczna'), t('temat','łaska'), t('mel','szybkie'), t('ssf','młodzież'),
    ]),
    S('KM', 7, 'Jezu, najsłodsze imię', 'C. Wesley (oprac.)', 'Es', false, [
      t('char','uwielbieniowa'), t('temat','miłość Boża'), t('mel','średnie tempo'),
    ]),
    S('KM', 31, 'Cześć i chwała', 'F. Hoffmann', 'B', false, [
      t('char','uwielbieniowa'), t('char','radosna'), t('mel','durowa'), t('okazja','Wielkanoc'),
    ]),
    S('KM', 64, 'Otwórz me oczy, Panie', 'Tradycyjna', 'd', true, [
      t('char','modlitewna'), t('temat','Duch Święty'), t('mel','molowa'), t('mel','wolne tempo'),
    ]),
    S('KM', 102, 'Jak dobrze jest dziękować', 'M. Bach', 'C', false, [
      t('char','dziękczynna'), t('temat','łaska'), t('mel','średnie tempo'), t('okazja','wieczerza','user'),
    ]),
    S('KM', 130, 'Niebiosa głoszą chwałę', 'J. Haydn (oprac.)', 'D', false, [
      t('char','uwielbieniowa'), t('char','energiczna'), t('temat','wierność Boża'), t('mel','szybkie'),
    ]),
    S('KM', 177, 'Przyjdź, Duchu Święty', 'Tradycyjna', 'f', true, [
      t('char','modlitewna'), t('temat','Duch Święty'), t('mel','molowa'), t('okazja','konferencja'),
    ]),
    S('NDP', 3, 'W Tobie jest światło', 'wspólnota Taizé', 'a', true, [
      t('char','spokojna'), t('char','refleksyjna'), t('temat','nadzieja'), t('mel','kanon'), t('mel','molowa'),
    ]),
    S('NKM', 5, 'Boża miłość niczym rzeka', 'S. Adamiec', 'G', false, [
      t('char','radosna'), t('temat','miłość Boża'), t('mel','durowa'), t('ssf','młodzież'),
    ]),
    S('SOS', 12, 'Holy, You Are Holy', 'Sing Our Songs', 'E', false, [
      t('char','uwielbieniowa'), t('mel','średnie tempo'), t('temat','łaska'), t('ssf','SSF 2023'),
    ]),
    S('SOS', 24, 'Every Step With You', 'Sing Our Songs', 'C', false, [
      t('char','refleksyjna'), t('temat','pielgrzymka'), t('temat','wierność Boża'), t('mel','wolne tempo'),
    ]),
  ];

  const leaders = [
    { id: 'aksel', name: 'Aksel Nooitgedagt', me: true },
    { id: 'edwin', name: 'Edwin Nooitgedagt' },
    { id: 'ruben', name: 'Ruben Miedziak' },
    { id: 'torstein', name: 'Torstein Skutle' },
  ];
  const locations = ['Wrocław', 'Ustroń', 'Brunstad', 'Ukraina'];
  const svcCats = ['Ogólne', 'Środowe', 'Młodzieżowe', 'Braterskie', 'Magasinet', 'Próba orkiestry'];

  const find = (col, num) => songs.find(s => s.collection === col && s.number === num);

  const services = [
    {
      id: 'svc-today', date: '2026-05-31', today: true, location: 'Wrocław', category: 'Ogólne',
      leader: 'Aksel Nooitgedagt', notes: 'Temat kazania: „Wierność Boża w drodze". Chrzest po nabożeństwie.',
      planned: [find('DP',58), find('KM',177), find('NDP',3)],
      sung:    [find('DP',1), find('DP',93)],
    },
    {
      id: 'svc-2', date: '2026-05-28', location: 'Wrocław', category: 'Środowe',
      leader: 'Edwin Nooitgedagt', notes: '',
      planned: [], sung: [find('DP',203), find('KM',64), find('DP',188)],
    },
    {
      id: 'svc-3', date: '2026-05-24', location: 'Ustroń', category: 'Młodzieżowe',
      leader: 'Ruben Miedziak', notes: 'Wieczór uwielbienia',
      planned: [], sung: [find('DP',256), find('NKM',5), find('KM',130), find('SOS',12)],
    },
    {
      id: 'svc-4', date: '2026-05-21', location: 'Wrocław', category: 'Ogólne',
      leader: 'Aksel Nooitgedagt', notes: '',
      planned: [], sung: [find('DP',1), find('KM',31), find('DP',112)],
    },
  ];

  const topSung = [
    { song: find('DP',1), n: 12 },
    { song: find('DP',93), n: 9 },
    { song: find('KM',31), n: 7 },
    { song: find('DP',256), n: 6 },
    { song: find('DP',188), n: 5 },
  ];
  const neverSung = [find('DP',145), find('KM',7), find('NDP',3), find('SOS',24), find('DP',203)];

  // collection colors for the stat bar
  const colColors = ['var(--accent)', 'var(--src-confirmed)', 'var(--src-user)', 'var(--src-ai)', 'var(--text-3)'];

  const keyLabel = (s) => s.minor ? `${s.key.toLowerCase()}-moll` : `${s.key} dur`;
  const colMeta = (id) => collections.find(c => c.id === id);

  // ---- moderation: pending tag changes grouped by song ----
  const moderation = [
    { song: find('DP', 1),  adds: ['nadzieja'],            removes: [] },
    { song: find('DP', 58), adds: ['konferencja'],         removes: ['wolne tempo'] },
    { song: find('KM', 102),adds: ['wieczerza'],           removes: [] },
    { song: find('DP', 27), adds: [],                      removes: ['pokój'] },
    { song: find('KM', 64), adds: ['modlitewna'],          removes: ['wolne tempo'] },
    { song: find('DP', 256),adds: ['energiczna', 'szybkie'],removes: [] },
  ];

  // ---- dictionaries for settings (editable sample copies) ----
  const dictionaries = {
    locations:   locations.map(n => ({ name: n })),
    svcCats:     svcCats.map(n => ({ name: n })),
    leaders:     leaders.map(l => ({ name: l.name, account: l.me ? 'aksel@zbor.pl' : (l.id === 'edwin' ? 'edwin@zbor.pl' : null) })),
    collections: collections.map(c => ({ name: c.name, short: c.short, count: c.count })),
    tagCats:     categories.map(c => ({ name: c.name, editable: c.editable })),
    tags:        Object.entries(tags).flatMap(([cat, arr]) => arr.map(n => ({ name: n, cat }))),
  };

  return { collections, categories, tags, songs, leaders, locations, svcCats, services, topSung, neverSung, colColors, keyLabel, colMeta, find, moderation, dictionaries };
})();
