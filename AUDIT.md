# Audyt projektu Song Steward

> Data audytu: 2026-05-31 · Zakres: cele biznesowe, technologia, architektura, implementacja
> Audyt wyłącznie obserwacyjny — żadnych zmian w kodzie aplikacji.

Przejrzano: spec biznesowy, schemat bazy, 22 endpointy API, 11 komponentów, konteksty, hooki, wszystkie strony i konfigurację.

## Ogólna ocena

To bardzo dobry projekt jak na vibecoding. Widać konsekwencję, przemyślane decyzje (overlay zamiast nawigacji, obsługa dotyku, wake lock) i czysty, czytelny kod. Nie ma chaosu ani „spaghetti". Główne słabości są typowe dla iteracyjnego rozwoju: **dryf między dokumentacją a rzeczywistością**, **martwy kod po migracjach**, brak warstwy odporności (offline, błędy) oraz duplikacja, która narosła. Nic z tego nie jest krytyczne — to dług techniczny do spłaty, nie pożar.

---

## 1. Cele biznesowe

Cel jest jasny i dobrze zrealizowany: narzędzie dla lidera uwielbienia do zarządzania repertuarem i prowadzenia na żywo. Funkcje pokrywają cel. Uwagi:

- **Niespójność co do liczby użytkowników.** Spec §1 mówi „Aksel, Edwin, Ruben i kilka dodatkowych osób z Polski", a §11 i AGENTS.md mówią o dwóch zaufanych użytkownikach (Aksel, Edwin). To nie jest kosmetyka — cała argumentacja „brak logowania = OK" opiera się na małym, zaufanym gronie. Im więcej osób zna URL, tym słabszy ten argument (każdy z dostępem może bezpowrotnie skasować nabożeństwo lub pieśń — endpointy DELETE są publiczne). Warto świadomie zdecydować: albo zostaje 2–3 osoby i tak to zapisujemy wszędzie, albo to już „kilkanaście osób" i wtedy auth wędruje wyżej w priorytetach.
- **Mocny, sensowny backlog.** TODO.md jest realistyczny i dobrze przemyślany (częstotliwość śpiewania, podobne pieśni, akordy). To zdrowy sygnał — wiadomo, dokąd projekt zmierza.

---

## 2. Technologia (stack)

Stack jest trafny i minimalistyczny — dokładnie to, czego wymaga ten use-case. Next 16 + React 19 + Supabase + Tailwind v4, prawie zero zewnętrznych zależności (tylko `lucide-react` i `swr`). Zgodne z zasadą „minimalna liczba bibliotek".

- **Brak warstwy walidacji.** Jedyna realna luka stackowa: żaden endpoint nie waliduje wejścia. Przy tej skali nie potrzeba Zod globalnie, ale 2–3 kluczowe mutacje (POST `/services`, `/service-songs`) skorzystałyby na minimalnej walidacji — dziś błędne dane lecą prosto do Postgresa i wracają jako surowy błąd 500.
- **Brak testów.** Zero testów w projekcie. Przy 2 użytkownikach i szybkim deployu to akceptowalny wybór, ale kilka testów dla logiki filtrowania (`unsungSongs`, dopasowanie filtrów) zabezpieczyłoby najbardziej podatne na regresję miejsca.

---

## 3. Architektura

Architektura jest płaska i czytelna, zgodna z założeniami spec. Główne problemy to nie struktura, lecz **rozjazd dokumentacji z kodem** i **dwa równoległe systemy cache'owania**.

### 3.1 Dokumentacja kłamie w kilku miejscach (najważniejsze do naprawy)

- **`supabase/00_init.sql` jest nieaktualny, a deklaruje się jako kanoniczny.** Nagłówek mówi „już zawiera wszystkie kolumny z migracji", ale: nadal ma tabelę `service_types`, `services` z `service_type_id` (zamiast `location_id`/`category_id`), `tag_categories` bez `user_editable`, brak tabel `locations` i `service_categories`. **Odtworzenie bazy z tego pliku da niedziałającą aplikację.** To najgroźniejszy dług dokumentacyjny — przy awarii bazy ten plik jest siatką bezpieczeństwa, a jest zepsuty.
- **Spec §4 wciąż opisuje stronę `/songs/[id]`**, która nie istnieje (świadomie zastąpiona overlayem). To wprost zaprzecza zasadzie z AGENTS.md „nigdy nie nawiguj do `/songs/[id]`".
- **Liczby pieśni się nie zgadzają:** spec §8 mówi „łącznie 984", ale tabela poniżej sumuje się do 1033 (471+445+52+10+55).

### 3.2 Martwy kod po migracji `service_types` → `locations`/`categories`

- **`app/api/service-types/route.ts` i `[id]/route.ts` to martwy kod** — zero wywołań z aplikacji, odpytują skasowaną tabelę (zwrócą 500 jeśli ktoś je trafi). Do usunięcia.
- **`lib/types.ts:52-56,78-80`** — interfejs `ServiceType` i pola `service_type_id`/`service_type` w `Service`, oznaczone „kept for backward compat during migration". Migracja jest zakończona — do usunięcia.

### 3.3 Dwa konkurujące systemy cache'owania (med)

SWR (w `SongOverlay`) i ręczny localStorage TTL-cache (`lib/cache.ts`, w dashboardzie) działają niezależnie, **bez wspólnej inwalidacji**. Edycja tagu w overlayu nie unieważnia `songs_all` w cache — dashboard może pokazywać nieaktualne tagi do 10 minut. Docelowo warto ujednolicić na SWR.

### 3.4 Fragmentacja stanu trwałego (low-med)

Cztery różne mechanizmy persystencji z ręczną obsługą: cookie (`ss_location_id`), localStorage filtrów (`useFilters`), localStorage cache (`cache.ts`), sessionStorage nawigacji (`ServiceNavHeader`). Każdy to osobna okazja na bug SSR/parse. Jeden `usePersistentState(key, storage)` skonsolidowałby przynajmniej dwa pierwsze.

---

## 4. Implementacja

Kod jest tu najmocniejszy. Inżynieria dotyku, obsługa fixed-elementów w transformowanym panelu, wake lock — to rzeczy, które większość kodu robi źle, a tu są zrobione dobrze. Problemy są punktowe.

### 4.1 Backend (API)

- **Skrajna duplikacja CRUD-a.** Linia `if (error) return NextResponse.json(..., { status: 500 })` powtarza się ~35 razy; 8 par plików (collections, worship-leaders, tag-categories, tags…) to praktycznie ten sam szablon różniący się nazwą tabeli. Fabryka `makeCrudRoutes(table, { allowedFields })` zwinęłaby to dramatycznie. *(low — kosmetyka, ale duża)*
- **Mass-assignment.** PATCH/POST przekazują surowe `body` do `.update(body)`/`.insert(body)` (`songs/[id]:73`, `services/[id]:41`, `collections/route.ts:12`). Klient może ustawić dowolną kolumnę, w tym `id`, `created_at`, `source`. Przy wyłączonym RLS to najpoważniejsza luka hardeningu. **Rekomendacja: whitelist pól per endpoint.** *(med)*
- **Filter injection w wyszukiwaniu.** `songs/route.ts:22` wkleja `search` użytkownika prosto w string `.or()`. To nie klasyczne SQLi (PostgREST), ale przecinek/`)`/`*` w zapytaniu może rozbić wyrażenie filtra. Sanityzować `search` albo rozbić na osobne `.ilike()`. *(med)*
- **Wszystkie błędy to 500.** Naruszenie UNIQUE, zły UUID, NOT NULL — wszystko wraca jako 500 zamiast 400/409. Brak obsługi 404 na `[id]` (DELETE nieistniejącego zwraca `{success:true}`). `request.json()` nigdy nie jest w try/catch. *(med)*
- **Done well:** `await params` poprawnie w każdym dynamicznym route (najczęstszy błąd migracji Next 16 — tu go nie ma), brak N+1 (embedded selects + `Promise.all`), brak wycieku sekretów.

### 4.2 Frontend (komponenty / wydajność)

Krytyczna warstwa — aplikacja działa na słabych telefonach na żywo.

- **Główny wątek blokowany na mount (high).** `NeverSungSection.tsx:38` i `TopSungSection.tsx:57` używają `cacheGet('songs_all') ?? fetch(...)` — przy trafieniu w cache cała tablica ~1000 pieśni jest **synchronicznie parsowana z localStorage podczas renderu** blokującego mount. To mierzalny jank na słabym telefonie.
- **Niestrzeżone async-efekty (med).** Oba dashboardy mają efekty bez guardu anulowania — szybka zmiana filtra może dać `setState` ze starymi danymi (race, out-of-order). Dodać flagę `cancelled`/`AbortController`.
- **Context value bez memo (med).** `SongOverlayContext.tsx:84` tworzy nowy obiekt `value` co render — wszyscy konsumenci re-renderują się przy każdym `setState`. Owinąć w `useMemo`.
- **Niememoizowane derywacje (med).** W `SongOverlay` filtrowanie tagów per kategoria (`O(kategorie × tagi)`) liczy się przy każdym renderze; w `NeverSungSection` per-pieśń budowanie `tagIds` — warto prekomputować `Map<songId, Set<tagId>>`.
- **`fetcher.ts` bez sprawdzenia `r.ok`** — błąd 500/HTML rzuca niejasnym błędem parsowania JSON zamiast czytelnym.

### 4.3 Strony / rendering

- **Brak service workera = PWA tylko z nazwy (high).** Zero offline. Dla aplikacji „używanej na żywo w trakcie nabożeństwa" na telefonie (słabe wifi w sali) to najpoważniejsza luka względem deklarowanego celu. Minimalnie: Serwist/Workbox cache'ujący shell + ostatnio oglądane nabożeństwo.
- **Brak `error.tsx` / `loading.tsx` / `not-found.tsx` (high).** Kilka stron robi `.then(r=>r.json())` bez `.catch` (`services/page.tsx`, `desk/page.tsx`) — przy błędzie sieci zostaje **wieczny spinner „Ładowanie..."**. Brak granicy błędu = biały ekran przy wyjątku.
- **Najgorętsze strony są w pełni client-fetched (high).** `/services/[id]` i `/services` to `'use client'` z fetchem w `useEffect` — dodatkowy round-trip przed treścią. `app/page.tsx` (dashboard) jest wzorcowym async server component — warto pójść tą drogą na `/services`.
- **Manifest niekompletny (med):** brak maskable icon (Android zrobi letterbox), `scope`, `id`, `description`. `favicon.svg` waży 1.6 MB.
- **Strony za duże (med):** `settings/page.tsx` (480 linii — `DictionarySection` i pille to reużywalne komponenty), `services/[id]/page.tsx` (412 linii — logikę mutacji wyciągnąć do `useServiceSongs(id)`).
- **Done well:** poprawny split `metadata`/`viewport`, Suspense wokół `useSearchParams`, async params, obsługa safe-area/iOS, optymistyczne update'y, wybór overlay-over-routing.

### 4.4 Dostępność (a11y) — najsłabszy obszar

- **`FilterModal` (high):** brak `role="dialog"`, focus trap, zarządzania fokusem, Escape. Można wytabować poza otwarty modal.
- Long-press do wykluczenia tagu i drag-reorder **nie mają alternatywy klawiaturowej** ani aria. Przyciski na emoji (`✕`,`✅`,`🔖`) bez `aria-label`.

> Uwaga: dla appki 2–3 osób na telefonie a11y jest realnie niskim priorytetem — ale `role="dialog"` + focus trap w modalu to tania poprawka, którą warto zrobić.

---

## Co jest zrobione naprawdę dobrze

- **Inżynieria dotyku** — rozróżnianie scroll vs long-press progiem 8px, nie-pasywny `touchmove` z `preventDefault` tylko podczas drag, refy zamiast stale closures w długo żyjących listenerach.
- **`app/page.tsx`** — podręcznikowy async server component z równoległym `Promise.all`.
- **`SongOverlayContext`** — czysta maszyna stanu, memoizowane callbacki, koordynacja animacji zamknięcia.
- **Obsługa fixed-elementów** (toast/lightbox renderowane poza transformowanym panelem z komentarzem o containing-block) — subtelność, którą większość kodu psuje.
- **`useWakeLock`** — poprawne re-acquire na `visibilitychange`.
- **Brak N+1, brak `any`, brak wycieku sekretów, poprawny Next 16.**

---

## Priorytetyzowana lista działań

### Najpierw (tanie, wysokie ryzyko/wartość)
1. Usuń martwy kod: `app/api/service-types/**`, `ServiceType` + legacy pola w `types.ts`.
2. Napraw `supabase/00_init.sql` — żeby odtwarzał aktualny schemat (locations/categories, user_editable). To siatka bezpieczeństwa bazy.
3. Dodaj `error.tsx` + `loading.tsx` + `.catch` na fetchach → koniec wiecznych spinnerów i białych ekranów.
4. `role="dialog"` + focus trap w `FilterModal`; `r.ok` w `fetcher.ts`.
5. Zaktualizuj spec (liczba użytkowników, `/songs/[id]`, liczba pieśni).

### Potem (hardening + perf)
6. Whitelist pól w PATCH/POST (mass-assignment) + sanityzacja `search` + mapowanie błędów na 400/409/404.
7. Napraw synchroniczny parse `songs_all` na mount + dodaj guardy anulowania w efektach dashboardu + `useMemo` na context value.

### Strategicznie (większe)
8. Service worker / offline — domknięcie obietnicy PWA dla użycia na żywo.
9. Ujednolicenie cache na SWR (likwidacja dwóch konkurujących systemów).
10. `/services` jako server component; ekstrakcja `useServiceSongs` i komponentów z `settings`.
11. Świadoma decyzja o auth+RLS — zależnie od tego, ilu naprawdę jest użytkowników.
