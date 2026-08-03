// Backup bazy Song Steward do pliku SQL (schemat + dane schematu `public`).
//
//   npm run backup
//
// Wymaga: Dockera (używamy obrazu postgres:17-alpine, żeby nie instalować
// pg_dump lokalnie) oraz linii SUPABASE_DB_URL_RO w .env.local — connection
// stringa roli TYLKO DO CZYTANIA `backup_ro` (patrz supabase/05_backup_role.sql).
//
// Connection string NIE trafia ani do argumentów procesu (byłby widoczny w
// `ps`/Menedżerze zadań), ani do logów: przekazujemy go zmienną środowiskową,
// a wszystkie komunikaty przed wypisaniem przepuszczamy przez scrub().

import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, stat, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENV_FILE = join(ROOT, '.env.local')
const OUT_DIR = join(ROOT, 'backups')
const PG_IMAGE = 'postgres:17-alpine'
const ENV_KEY = 'SUPABASE_DB_URL_RO'

// ── pomocnicze ───────────────────────────────────────────────────

// Hasło i cały URL nigdy nie mogą wyciec do konsoli — pg_dump wkleja
// connection string do treści niektórych błędów.
function makeScrubber(url) {
  const secrets = [url]
  const pw = url.match(/\/\/[^:]+:([^@]+)@/)?.[1]
  if (pw) secrets.push(decodeURIComponent(pw), pw)
  return (text) => {
    let out = String(text)
    for (const s of secrets) if (s) out = out.split(s).join('«ukryte»')
    return out
  }
}

function fail(msg) {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

function human(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function readDbUrl() {
  let raw
  try {
    raw = await readFile(ENV_FILE, 'utf8')
  } catch {
    fail(`Brak pliku .env.local — dodaj do niego linię ${ENV_KEY}=postgresql://...`)
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!m || m[1] !== ENV_KEY) continue
    const value = m[2].trim().replace(/^["']|["']$/g, '')
    if (value) return value
  }
  fail(
    `W .env.local nie ma wartości ${ENV_KEY}.\n` +
    `  Dodaj linię:  ${ENV_KEY}=postgresql://backup_ro.<ref>:<haslo>@aws-0-<region>.pooler.supabase.com:5432/postgres\n` +
    `  (Dashboard → Connect → Session pooler; nazwę użytkownika postgres.<ref> zamień na backup_ro.<ref>)`,
  )
}

function run(cmd, args, { env, stdoutTo, scrub } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      env: { ...process.env, ...env },
      stdio: ['ignore', stdoutTo ? 'pipe' : 'ignore', 'pipe'],
      shell: false,
    })
    let stderr = ''
    child.stderr.on('data', (d) => { stderr += d })
    if (stdoutTo) child.stdout.pipe(stdoutTo)
    child.on('error', (e) => resolve({ code: -1, stderr: e.message }))
    child.on('close', (code) => {
      // Strumień pliku domykamy dopiero, gdy proces skończył pisać.
      if (stdoutTo) stdoutTo.end()
      resolve({ code, stderr: scrub ? scrub(stderr) : stderr })
    })
  })
}

// Liczby wierszy czytamy z SAMEGO ZRZUTU, nie z bazy — to weryfikuje plik,
// który faktycznie zostanie na dysku, a nie stan serwera.
async function summarize(file) {
  const text = await readFile(file, 'utf8')
  const tables = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^COPY public\."?([A-Za-z0-9_]+)"?\s.*FROM stdin;$/)
    if (!m) continue
    let n = 0
    while (++i < lines.length && lines[i] !== '\\.') n++
    tables.push({ table: m[1], rows: n })
  }
  const functions = (text.match(/^CREATE FUNCTION public\./gm) ?? []).length
  return { tables, functions }
}

// ── główny przebieg ──────────────────────────────────────────────

const url = await readDbUrl()
const scrub = makeScrubber(url)

// `docker --version` odpowiada nawet przy wyłączonym demonie (to tylko CLI),
// dlatego pytamy o `docker info` — dopiero to dotyka silnika.
const docker = await run('docker', ['info', '--format', '{{.ServerVersion}}'])
if (docker.code !== 0) {
  fail(
    'Silnik Dockera nie odpowiada — uruchom Docker Desktop, poczekaj, aż ikonka\n' +
    '  wieloryba przestanie się animować, i odpal `npm run backup` ponownie.',
  )
}

await mkdir(OUT_DIR, { recursive: true })
const outFile = join(OUT_DIR, `backup-${stamp()}.sql`)

console.log(`→ pobieram obraz ${PG_IMAGE} (przy pierwszym uruchomieniu chwilę to potrwa)…`)
const pull = await run('docker', ['pull', '--quiet', PG_IMAGE])
if (pull.code !== 0) fail(`Nie udało się pobrać obrazu ${PG_IMAGE}:\n${pull.stderr}`)

console.log('→ zrzucam schemat i dane…')
const sink = createWriteStream(outFile)
const dump = await run(
  'docker',
  [
    'run', '--rm', '--interactive=false',
    '--env', 'PGURL',
    PG_IMAGE,
    'sh', '-c',
    // Connection string zostaje w zmiennej środowiskowej kontenera — nie ma go
    // w linii komend, więc nie widać go w liście procesów.
    // --enable-row-security: bez tego pg_dump ODMAWIA zrzutu tabeli objętej RLS
    // („query would be affected by row-level security policy"), bo nie chce po
    // cichu pominąć niewidocznych wierszy. U nas polityka `backup_ro_read` to
    // USING (true), więc widoczne jest wszystko — a kontrola „0 wierszy" niżej
    // złapie sytuację, w której ktoś kiedyś tę politykę zawęzi.
    'pg_dump "$PGURL" --schema=public --no-owner --no-privileges --enable-row-security',
  ],
  { env: { PGURL: url }, stdoutTo: sink, scrub },
)

if (dump.code !== 0) {
  await unlink(outFile).catch(() => {})
  fail(`pg_dump zakończył się błędem (kod ${dump.code}):\n${dump.stderr}`)
}

const { size } = await stat(outFile)
if (size < 1024) {
  await unlink(outFile).catch(() => {})
  fail('Zrzut jest podejrzanie mały — plik usunięty. Sprawdź uprawnienia roli backup_ro.')
}

const { tables, functions } = await summarize(outFile)
const total = tables.reduce((a, t) => a + t.rows, 0)

// Puste wszystkie tabele = niemal na pewno RLS bez polityki `backup_ro_read`.
// pg_dump nie zgłasza tu błędu, więc bez tej kontroli backup byłby cichą pustą
// wydmuszką — dokładnie wtedy, gdy najbardziej na nim zależy.
if (total === 0) {
  await unlink(outFile).catch(() => {})
  fail(
    'Zrzut nie zawiera ANI JEDNEGO wiersza — plik usunięty.\n' +
    '  Przyczyna jest niemal zawsze ta sama: RLS odcina rolę backup_ro.\n' +
    '  Uruchom ponownie supabase/05_backup_role.sql (sekcja 4 dodaje polityki SELECT).',
  )
}

console.log(`\n✓ ${outFile.replace(ROOT + '\\', '').replace(ROOT + '/', '')}  (${human(size)})\n`)
const pad = Math.max(...tables.map((t) => t.table.length), 6)
for (const t of tables.sort((a, b) => b.rows - a.rows)) {
  console.log(`  ${t.table.padEnd(pad)}  ${String(t.rows).padStart(6)}`)
}
console.log(`  ${'—'.repeat(pad)}  ${'—'.repeat(6)}`)
console.log(`  ${'razem'.padEnd(pad)}  ${String(total).padStart(6)}   +${functions} funkcji SQL\n`)
console.log('Przywrócenie (UWAGA: nadpisuje dane!):')
console.log(`  docker run --rm -i --env PGURL ${PG_IMAGE} psql "$PGURL" < <plik>\n`)
