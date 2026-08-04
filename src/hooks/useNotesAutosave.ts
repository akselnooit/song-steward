import { useCallback, useEffect, useRef, useState } from 'react'
import { useUpdateServiceNotes } from '../lib/queries'
import { clearDraft, pruneDrafts, readDraft, writeDraft } from '../lib/notesDraft'
import { supabase } from '../lib/supabase'

/**
 * Notatka nabożeństwa: stan pola, autozapis i odzyskiwanie po nieudanym wysłaniu.
 *
 * Wcześniej zapis leciał wyłącznie na `onBlur`, a ostatnia wysłana treść
 * pamiętana była w oderwaniu od tego, czy baza ją PRZYJĘŁA — po jednym błędzie
 * (brak zasięgu na scenie) ta sama treść nigdy nie leciała ponownie. Tutaj
 * jedynym źródłem prawdy jest `savedRef`, przesuwany dopiero po potwierdzeniu
 * zapisu, więc każda nieudana próba sama wraca do kolejki.
 */
export type NotesSaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'error'

const DEBOUNCE_MS = 2500     // cisza na klawiaturze → zapis
const MAX_WAIT_MS = 10_000   // twardy limit przy nieprzerwanym pisaniu
const SAVED_MS = 1500        // jak długo świeci „zapisano"
const WATCHDOG_MS = 20_000   // po tyle „zapisywanie" uznajemy za nieudane

export function useNotesAutosave(
  serviceId: string | null,
  remote: string | undefined,
  editing: boolean,
) {
  const updateNotes = useUpdateServiceNotes()

  const [value, setValue] = useState('')
  const [state, setState] = useState<NotesSaveState>('clean')

  // Refy aktualizowane RĘCZNIE razem ze stanem: kilka efektów zależnych od tych
  // samych danych wykonuje się w jednym przebiegu, więc nie mogą czekać na
  // kolejny render, żeby zobaczyć nawzajem swoje ustalenia.
  const valueRef = useRef(value)
  const stateRef = useRef(state)
  const applyValue = (v: string) => { valueRef.current = v; setValue(v) }
  const applyState = (s: NotesSaveState) => { stateRef.current = s; setState(s) }

  const editingRef = useRef(editing)
  editingRef.current = editing

  // Świadomie NIE ustawiany w trakcie renderu: sprzątanie efektu przy zmianie
  // nabożeństwa musi widzieć jeszcze STARE id, żeby dowieźć tekst tam, gdzie
  // został napisany.
  const serviceIdRef = useRef(serviceId)
  const savedRef = useRef('')            // ostatnia treść POTWIERDZONA przez bazę
  const initedFor = useRef<string | null>(null)
  const inFlight = useRef(false)
  const resumed = useRef(false)          // karta wróciła z tła → sprawdź token

  const debounceT = useRef<number | null>(null)
  const maxWaitT = useRef<number | null>(null)
  const savedIconT = useRef<number | null>(null)
  const watchdogT = useRef<number | null>(null)

  const clearSaveTimers = () => {
    if (debounceT.current) { clearTimeout(debounceT.current); debounceT.current = null }
    if (maxWaitT.current) { clearTimeout(maxWaitT.current); maxWaitT.current = null }
  }

  const flushRef = useRef(() => {})

  const scheduleSave = useCallback(() => {
    if (debounceT.current) clearTimeout(debounceT.current)
    debounceT.current = window.setTimeout(() => {
      debounceT.current = null
      flushRef.current()
    }, DEBOUNCE_MS)
    if (!maxWaitT.current) {
      maxWaitT.current = window.setTimeout(() => {
        maxWaitT.current = null
        flushRef.current()
      }, MAX_WAIT_MS)
    }
  }, [])

  const flashSaved = useCallback(() => {
    applyState('saved')
    if (savedIconT.current) clearTimeout(savedIconT.current)
    savedIconT.current = window.setTimeout(() => {
      savedIconT.current = null
      if (stateRef.current === 'saved') applyState('clean')
    }, SAVED_MS)
  }, [])

  const stopWatchdog = () => {
    if (watchdogT.current) { clearTimeout(watchdogT.current); watchdogT.current = null }
  }

  const send = useCallback((id: string, text: string) => {
    inFlight.current = true
    applyState('saving')
    // Kręcące się kółko bez końca jest gorsze od czerwieni: nie wiadomo, czy
    // czekać, czy działać. Gdy wysyłka nie zamelduje się w tym czasie, mówimy
    // wprost, że nie wyszło — spóźniony sukces i tak poprawi stan niżej.
    stopWatchdog()
    watchdogT.current = window.setTimeout(() => {
      watchdogT.current = null
      if (stateRef.current === 'saving') { inFlight.current = false; applyState('error') }
    }, WATCHDOG_MS)
    updateNotes.mutate({ id, notes: text }, {
      onSuccess: () => {
        stopWatchdog()
        inFlight.current = false
        clearDraft(id)
        if (id !== serviceIdRef.current) return   // zdążyliśmy przejść dalej
        savedRef.current = text
        // W trakcie wysyłania mogło dojść więcej znaków — wtedy zostajemy brudni
        // i wysyłamy resztę, zamiast pokazywać fałszywe „zapisano".
        if (valueRef.current === text) flashSaved()
        else { applyState('dirty'); scheduleSave() }
      },
      onError: () => {
        stopWatchdog()
        inFlight.current = false
        // Szkic zostaje — to jedyna kopia tekstu, jeśli aplikacja zginie w tle.
        if (id === serviceIdRef.current) applyState('error')
      },
    })
  }, [updateNotes, flashSaved, scheduleSave])

  const save = useCallback((id: string, text: string) => {
    clearSaveTimers()
    if (inFlight.current) return          // wynik tej próby sam zaplanuje resztę
    if (text === savedRef.current) return
    if (resumed.current) {
      // Po powrocie z tła token JWT bywa świeżo wygasły, a odświeżanie w tle
      // jest wstrzymane razem z timerami karty. `getSession` domyka to, zanim
      // wyślemy zapis, który inaczej wróciłby jako 401 i błysnął czerwienią.
      resumed.current = false
      applyState('saving')
      supabase.auth.getSession().catch(() => {}).then(() => send(id, text))
      return
    }
    send(id, text)
  }, [send])

  flushRef.current = () => {
    const id = serviceIdRef.current
    if (id) save(id, valueRef.current)
  }

  const retry = useCallback(() => {
    if (stateRef.current === 'error' || stateRef.current === 'dirty') flushRef.current()
  }, [])

  const change = useCallback((next: string) => {
    applyValue(next)
    const id = serviceIdRef.current
    if (next === savedRef.current) {
      clearSaveTimers()
      if (id) clearDraft(id)
      applyState('clean')
      return
    }
    if (id) writeDraft(id, next)
    applyState('dirty')
    scheduleSave()
  }, [scheduleSave])

  // Wejście na nabożeństwo: treść z bazy, a jeśli został szkic z poprzedniej,
  // nieudanej sesji — pokazujemy szkic i próbujemy dowieźć go do bazy.
  useEffect(() => {
    if (!serviceId || remote === undefined) return
    if (initedFor.current === serviceId) return
    initedFor.current = serviceId
    savedRef.current = remote
    const draft = readDraft(serviceId)
    if (draft !== null && draft !== remote) {
      applyValue(draft)
      applyState('dirty')
      scheduleSave()
    } else {
      if (draft !== null) clearDraft(serviceId)   // szkic już zbieżny z bazą
      applyValue(remote)
      applyState('clean')
    }
  }, [serviceId, remote, scheduleSave])

  // Odświeżenie w tle (np. po dodaniu pieśni) nie może skasować ani tekstu
  // w trakcie pisania, ani zmian, których jeszcze nie udało się zapisać.
  useEffect(() => {
    if (remote === undefined || initedFor.current !== serviceId) return
    if (editingRef.current) return
    if (stateRef.current !== 'clean' && stateRef.current !== 'saved') return
    savedRef.current = remote
    applyValue(remote)
  }, [remote, serviceId])

  // Zmiana nabożeństwa i zejście z ekranu: dowieźć to, czego debounce nie zdążył
  // wysłać. Mutacja żyje w cache TanStack Query, więc dobiega końca również po
  // odmontowaniu komponentu.
  useEffect(() => {
    serviceIdRef.current = serviceId
    return () => { flushRef.current() }
  }, [serviceId])

  // `onBlur` nie zdąży się wykonać, gdy ekran znika bez odklikania pola —
  // systemowy gest „wstecz", przejście aplikacji w tło, zamknięcie karty.
  // Powrót na wierzch i odzyskanie sieci są za to naturalnym momentem na
  // ponowienie tego, co nie przeszło.
  useEffect(() => {
    pruneDrafts()
    const onHide = () => flushRef.current()
    const onVisibility = () => {
      if (document.hidden) { flushRef.current(); resumed.current = true }
      else retry()
    }
    window.addEventListener('pagehide', onHide)
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('online', retry)
      document.removeEventListener('visibilitychange', onVisibility)
      clearSaveTimers()
      stopWatchdog()
      if (savedIconT.current) clearTimeout(savedIconT.current)
      flushRef.current()
    }
  }, [retry])

  return { value, change, state, flush: () => flushRef.current(), retry }
}
