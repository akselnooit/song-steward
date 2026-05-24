import Link from 'next/link'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export const revalidate = 0

async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select(`
      id, date, notes,
      service_type:service_types(name),
      worship_leader:worship_leaders(name),
      service_songs(id, status)
    `)
    .order('date', { ascending: false })

  if (error) return []
  return data || []
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>
}) {
  const { all } = await searchParams
  const services = await getServices()

  const today = new Date().toISOString().slice(0, 10)
  const todayServices = services.filter((s) => s.date === today)
  if (!all && todayServices.length === 1) redirect(`/services/${todayServices[0].id}`)

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

      {services.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-4">Brak nabożeństw</p>
          <Link href="/services/new" className="text-blue-900 underline text-sm">
            Utwórz pierwsze nabożeństwo
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => {
            const sungCount = service.service_songs?.filter(
              (ss: { status: string }) => ss.status === 'sung'
            ).length || 0
            const plannedCount = service.service_songs?.filter(
              (ss: { status: string }) => ss.status === 'planned'
            ).length || 0
            const isToday = service.date === today

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
                      {(service.service_type as unknown as { name: string } | null)?.name || '—'}
                      {(service.worship_leader as unknown as { name: string } | null)?.name && (
                        <span className="ml-2 text-gray-400">
                          · {(service.worship_leader as unknown as { name: string }).name}
                        </span>
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
