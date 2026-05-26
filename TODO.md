# Song Steward — Przyszłe funkcje

## Pieśni

- **Tag "Krótka" — otagowanie pieśni** — Dodać tag "Krótka" do kategorii 🎤 Charakter, a następnie przejść przez kolekcje (szczególnie DP) i otagować krótkie pieśni. Cel: szybkie znalezienie czegoś krótkiego w trakcie świadectw lub na koniec nabożeństwa — wystarczy wyfiltrować "Krótka" + "Żywa melodia" w wyszukiwarce.
- **Tekst z akordami** — Widok pieśni powinien mieć tekst z akordami po prawej stronie z przewijaniem. Na razie nie mamy tekstów w bazie, więc odkładamy na później.
- **Podobne pieśni** — Na stronie danej pieśni wyświetlać listę podobnych pieśni na podstawie wspólnych tagów/znaczników. Cel: lider uwielbienia może łatwo znaleźć pieśni o podobnym charakterze lub tematyce bez potrzeby ręcznego przeszukiwania bazy.
- **Posłuchaj melodii** — Przycisk w SongOverlay otwierający nagranie pieśni. Do rozważenia: link do SongTreasures (mamy `author_id` — sprawdzić czy ST udostępnia stabilne URL-e do nagrań) lub ręcznie dodawany URL (`recording_url` w tabeli `songs`). Cel: lider może odświeżyć melodię przed lub w trakcie nabożeństwa bez opuszczania aplikacji.
- **Tempo i styl gry** — Dwa nowe pola na pieśni: `bpm INTEGER` (tempo metronomu) oraz `play_style TEXT` z dwiema wartościami: "swing" lub "straight". Wprowadzane ręcznie, wyświetlane w SongOverlay obok tonacji. Cel: lider widzi jednym rzutem oka charakter wykonania i może dbać o spójność zestawu.
- **Detekcja tempa na żywo** — Aplikacja nasłuchuje przez mikrofon i wykrywa aktualne BPM granej pieśni w czasie rzeczywistym. Porównuje je z docelowym BPM zapisanym dla pieśni i pokazuje czy gramy za szybko, za wolno czy w dobrym tempie. Wymaga Web Audio API + algorytmu detekcji rytmu (np. beat detection przez analizę energii częstotliwości).

## Wyszukiwanie

*(brak zaplanowanych funkcji)*

## Nabożeństwa

- **Częstotliwość pieśni przy planowaniu** — Podczas wybierania pieśni na nabożeństwo wyświetlać informację o tym, jak często dana pieśń była śpiewana w ostatnim czasie (np. ile razy w ciągu ostatnich 30/90 dni). Cel: lider uwielbienia widzi częstotliwość użycia każdej pieśni i może świadomie unikać powtarzania tych samych pieśni za często.
- **Kolory/ikonki częstotliwości śpiewania** — Rozwinięcie powyższego: wizualnie oznaczać częstotliwość śpiewania pieśni za pomocą kolorów lub ikonek (np. cztery poziomy: nieśpiewana, rzadko, średnio, bardzo często). Dzięki temu lider uwielbienia jednym rzutem oka ocenia, które pieśni są „świeże", a które były ostatnio nadużywane.

## Bezpieczeństwo

- **Logowanie + RLS** — Dodać Supabase Auth (logowanie dla Aksela, Edwina i innych liderów), a następnie włączyć Row-Level Security na tabelach. Na razie celowo pominięte (MVP, zaufani użytkownicy), ale Supabase wysyła ostrzeżenia o braku RLS. Dopóki URL projektu nie jest publiczny i baza nie zawiera danych wrażliwych — ryzyko jest akceptowalne.

## Inne

- **Nauka na pamięć** — Tryb quizu do uczenia się numerów i tytułów pieśni na pamięć (np. "Jaki numer to *Zbawienie z Pana*?" lub "Jak się nazywa DP 47?")
- **Lepsze statystyki** — Osobna strona ze szczegółowymi statystykami śpiewanych pieśni (kliknięcie w kafelek na dashboardzie otwiera stronę)
- **Konflikty edycji notatek** — Obsługa sytuacji gdy Aksel i Edwin jednocześnie edytują notatkę przy nabożeństwie
