'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGlobalLocation } from '@/lib/useGlobalLocation'
import type { Service } from '@/lib/types'

type ServiceListItem = Pick<Service, 'id' | 'date' | 'notes' | 'location' | 'category' | 'worship_leader'> & {
  service_songs?: { id: string; status: string }[]
}

export default function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>
}) {
  const router = useRouter()
  const { locationId } = useGlobalLocation()
  const [services, setServices] = useState<ServiceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [allParam, setAllParam] = useState<string | undefined>(undefined)

  useEffect(() => {
    searchParams.then(({ all }) => setAllParam(all))
  }, [searchParams])

  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then((data) => {
        setServices(data || [])
        setLoading(false)
      })
  }, [])

  const today = new Date().toISOString().slice(0, 10)

  // Redirect to today's service if there's exactly one today and no ?all param
  useEffect(() => {
    if (loading || allParam !== undefined) return
    const todayServices = services.filter((s) => s.date === today)
    if (todayServices.length === 1) {
      router.replace(`/services/${todayServices[0].id}`)
    }
  }, [loading, allParam, services, today, router])

  const filtered = useMemo(() => {
    if (!locationId) return services
    return services.filter((s) => {
      const loc = Array.isArray(s.location) ? (s.location as unknown[])[0] : s.location
      const locObj = loc as { id: string } | null | undefined
      return locObj?.id === locationId
    })
  }, [services, locationId])

  if (loading) {
    return <div className="px-4 pt-6 pb-4 max-w-lg mx-auto text-gray-400 text-sm">Ładowanie...</div>
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-blue-900">Nabożeństwa</h1>
        <Link
          href="/services/new"
          className="bg-blue-900 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-blue-800 active:scale-95 transition-all"
        >
          ＋ Nowe
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-4">Brak nabożeństw</p>
          <Link href="/services/new" className="text-blue-900 underline text-sm">
            Utwórz pierwsze nabożeństwo
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((service) => {
            const sungCount = service.service_songs?.filter(
              (ss: { status: string }) => ss.status === 'sung'
            ).length || 0
            const plannedCount = service.service_songs?.filter(
              (ss: { status: string }) => ss.status === 'planned'
            ).length || 0
            const isToday = service.date === today

            const loc = Array.isArray(service.location)
              ? (service.location as unknown as { name: string }[])[0]
              : service.location as unknown as { name: string } | null | undefined
            const cat = Array.isArray(service.category)
              ? (service.category as unknown as { name: string }[])[0]
              : service.category as unknown as { name: string } | null | undefined
            const leader = Array.isArray(service.worship_leader)
              ? (service.worship_leader as unknown as { name: string }[])[0]
              : service.worship_leader as unknown as { name: string } | null | undefined

            const serviceLabel = loc && cat
              ? `${loc.name} — ${cat.name}`
              : loc?.name ?? cat?.name ?? '—'

            return (
              <Link
                key={service.id}
                href={`/services/${service.id}`}
                className={`block bg-white rounded-xl shadow-sm border p-4 hover:shadow-md active:scale-[0.98] transition-all ${
                  isToday ? 'border-blue-300 hover:border-blue-400' : 'border-gray-100 hover:border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {new Date(service.date).toLocaleDateString('pl-PL', {
                          weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </p>
                      {isToday && (
                        <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Dziś</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {serviceLabel}
                      {leader?.name && (
                        <span className="ml-2 text-gray-400">· {leader.name}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {sungCount > 0 && (
                      <span className="text-sm text-green-600 font-semibold">{sungCount} zaśpiewane</span>
                    )}
                    {plannedCount > 0 && (
                      <p className="text-xs text-gray-400">{plannedCount} zaplanowane</p>
                    )}
                    {sungCount === 0 && plannedCount === 0 && (
                      <span className="text-xs text-gray-400">Brak pieśni</span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
