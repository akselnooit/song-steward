'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ServiceType, WorshipLeader } from '@/lib/types'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export default function NewServicePage() {
  const router = useRouter()
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [leaders, setLeaders] = useState<WorshipLeader[]>([])
  const [loading, setLoading] = useState(false)

  // Domyślnie dzisiaj
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [worshipLeaderId, setWorshipLeaderId] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/service-types').then((r) => r.json()),
      fetch('/api/worship-leaders').then((r) => r.json()),
    ]).then(([types, leads]) => {
      setServiceTypes(types)
      setLeaders(leads)
      // Ustaw domyślny typ jeśli jest tylko jeden
      if (types.length === 1) setServiceTypeId(types[0].id)
      if (leads.length === 1) setWorshipLeaderId(leads[0].id)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Sprawdź w bazie czy jest już nabożeństwo w ten dzień
    const checkRes = await fetch(`/api/services?date=${date}`)
    const existing = await checkRes.json()
    if (Array.isArray(existing) && existing.length > 0) {
      const ok = window.confirm(
        `Na dzień ${new Date(date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} jest już ${existing.length === 1 ? 'nabożeństwo' : 'kilka nabożeństw'}. Dodać kolejne?`
      )
      if (!ok) {
        setLoading(false)
        return
      }
    }

    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        service_type_id: serviceTypeId || null,
        worship_leader_id: worshipLeaderId || null,
        notes: notes || null,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      router.refresh() // odśwież cache listy nabożeństw
      router.push(`/services/${data.id}`)
    } else {
      setLoading(false)
      alert('Błąd podczas tworzenia nabożeństwa')
    }
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <Link href="/services" className="text-sm text-blue-900 mb-4 inline-block">← Wróć</Link>
      <h1 className="text-xl font-bold text-blue-900 mb-6">Nowe nabożeństwo</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Data */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
          />
        </div>

        {/* Typ nabożeństwa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Typ nabożeństwa</label>
          <select
            value={serviceTypeId}
            onChange={(e) => setServiceTypeId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
          >
            <option value="">— wybierz —</option>
            {serviceTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {serviceTypes.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">
              <Link href="/settings" className="text-blue-900 underline">Dodaj typy nabożeństw w ustawieniach</Link>
            </p>
          )}
        </div>

        {/* Lider muzyki */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lider muzyki</label>
          <select
            value={worshipLeaderId}
            onChange={(e) => setWorshipLeaderId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
          >
            <option value="">— wybierz —</option>
            {leaders.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          {leaders.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">
              <Link href="/settings" className="text-blue-900 underline">Dodaj liderów muzyki w ustawieniach</Link>
            </p>
          )}
        </div>

        {/* Notatki */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notatki (opcjonalne)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Temat kazania, uwagi..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-900 text-white py-3.5 rounded-xl font-semibold text-base hover:bg-blue-800 active:bg-blue-700 active:scale-[0.98] disabled:opacity-60 transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Tworzenie...
            </span>
          ) : 'Utwórz nabożeństwo'}
        </button>
      </form>
    </div>
  )
}
