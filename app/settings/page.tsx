'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { useGlobalLocation } from '@/lib/useGlobalLocation'
import { useTopSungFilters, useNeverSungFilters, type TimeRange } from '@/lib/useFilters'
import type { Location, ServiceCategory, WorshipLeader, Tag, TagCategory } from '@/lib/types'

// Generyczny komponent do zarządzania słownikiem
function DictionarySection<T extends { id: string; name: string }>({
  title,
  endpoint,
  extraFields,
}: {
  title: string
  endpoint: string
  extraFields?: {
    key: string
    label: string
    type?: string
    optionsEndpoint?: string
  }[]
}) {
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [adding, setAdding] = useState(false)
  const [options, setOptions] = useState<Record<string, { id: string; name: string }[]>>({})

  const { data: items = [], mutate: mutateItems } = useSWR<T[]>(`/api/${endpoint}`, fetcher, {
    revalidateOnFocus: false,
  })

  useEffect(() => {
    extraFields?.forEach(async (field) => {
      if (field.optionsEndpoint) {
        const res = await fetch(`/api/${field.optionsEndpoint}`)
        const data = await res.json()
        setOptions((prev) => ({ ...prev, [field.key]: data }))
      }
    })
  }, [extraFields])

  const resetForm = () => {
    setFormData({})
    setEditId(null)
    setAdding(false)
  }

  const handleSave = async () => {
    if (!formData.name?.trim()) return
    if (editId) {
      await fetch(`/api/${endpoint}/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
    } else {
      await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
    }
    resetForm()
    mutateItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Na pewno usunąć?')) return
    await fetch(`/api/${endpoint}/${id}`, { method: 'DELETE' })
    mutateItems()
  }

  const startEdit = (item: T & Record<string, string>) => {
    setEditId(item.id)
    const data: Record<string, string> = { name: item.name }
    extraFields?.forEach((f) => { if (item[f.key]) data[f.key] = item[f.key] })
    setFormData(data)
    setAdding(false)
  }

  const isEditing = editId !== null || adding

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        {!isEditing && (
          <button
            onClick={() => { setAdding(true); setFormData({}) }}
            className="text-sm bg-blue-900 text-white rounded-lg px-3 py-1.5 hover:bg-blue-800 active:scale-95 transition-all"
          >
            ＋ Dodaj
          </button>
        )}
      </div>

      {/* Formularz dodawania/edycji */}
      {isEditing && (
        <div className="mb-3 p-3 bg-gray-50 rounded-xl space-y-2">
          <input
            type="text"
            placeholder="Nazwa"
            value={formData.name || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
            autoFocus
          />
          {extraFields?.map((field) => (
            field.optionsEndpoint ? (
              <select
                key={field.key}
                value={formData[field.key] || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
              >
                <option value="">— {field.label} —</option>
                {(options[field.key] || []).map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            ) : (
              <input
                key={field.key}
                type={field.type || 'text'}
                placeholder={field.label}
                value={formData[field.key] || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            )
          ))}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 active:scale-95 transition-all"
            >
              Zapisz
            </button>
            <button
              onClick={resetForm}
              className="flex-1 bg-gray-100 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-200 active:scale-95 transition-all"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">Brak wpisów</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {items.map((item: T & Record<string, string>) => (
            <li key={item.id} className="flex items-center justify-between py-2.5 gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-900 font-medium">{item.name}</span>
                {extraFields?.map((f) => {
                  if (!item[f.key]) return null
                  if (f.optionsEndpoint) {
                    const opt = (options[f.key] || []).find((o) => o.id === item[f.key])
                    return opt ? (
                      <span key={f.key} className="text-xs text-gray-400 ml-2">({opt.name})</span>
                    ) : null
                  }
                  return (
                    <span key={f.key} className="text-xs text-gray-400 ml-2">· {item[f.key]}</span>
                  )
                })}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => startEdit(item)}
                  className="text-xs text-gray-400 hover:text-blue-900 px-2 py-1.5 min-h-[36px] hover:scale-110 transition-all"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-xs text-gray-400 hover:text-red-500 hover:scale-110 px-2 py-1.5 min-h-[36px] transition-all"
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Pill button helper
function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
        active
          ? 'bg-blue-900 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

// Multi-select pill group
function MultiSelectPills<T extends { id: string; name: string }>({
  title,
  items,
  selectedIds,
  onToggle,
}: {
  title: string
  items: T[]
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <PillButton
            key={item.id}
            active={selectedIds.includes(item.id)}
            onClick={() => onToggle(item.id)}
          >
            {item.name}
          </PillButton>
        ))}
      </div>
    </div>
  )
}

function toggle(arr: string[], id: string): string[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
}

// Filtry tab
function FiltersTab() {
  const { locationId, setLocationId } = useGlobalLocation()
  const { filters: topFilters, setFilters: setTopFilters } = useTopSungFilters()
  const { filters: neverFilters, setFilters: setNeverFilters } = useNeverSungFilters()

  const { data: locations = [] } = useSWR<Location[]>('/api/locations', fetcher, { revalidateOnFocus: false })
  const { data: categories = [] } = useSWR<ServiceCategory[]>('/api/service-categories', fetcher, { revalidateOnFocus: false })
  const { data: leaders = [] } = useSWR<WorshipLeader[]>('/api/worship-leaders', fetcher, { revalidateOnFocus: false })
  const { data: allTags = [] } = useSWR<(Tag & { category?: TagCategory })[]>('/api/tags', fetcher, { revalidateOnFocus: false })

  const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: 'all', label: 'Od początku' },
    { value: '1m', label: 'Ostatni miesiąc' },
    { value: '3m', label: 'Ostatnie 3 mies.' },
    { value: '6m', label: 'Ostatnie 6 mies.' },
    { value: '12m', label: 'Ostatnie 12 mies.' },
  ]

  return (
    <div className="space-y-4">
      {/* Filtr globalny */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 mb-1">Filtr globalny</h2>
        <p className="text-xs text-gray-500 mb-3">
          Wybrana lokalizacja ogranicza widoki w całej aplikacji — dashboard, listę nabożeństw i historię śpiewania. Wybierz &apos;Wszystkie&apos;, żeby widzieć dane z każdej lokalizacji.
        </p>
        <div className="flex flex-wrap gap-2">
          <PillButton active={locationId === null} onClick={() => setLocationId(null)}>
            Wszystkie
          </PillButton>
          {locations.map((loc) => (
            <PillButton
              key={loc.id}
              active={locationId === loc.id}
              onClick={() => setLocationId(loc.id)}
            >
              {loc.name}
            </PillButton>
          ))}
        </div>
      </div>

      {/* Najczęściej śpiewane — filtry domyślne */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Najczęściej śpiewane — filtry domyślne</h2>

        <MultiSelectPills
          title="Lider"
          items={leaders}
          selectedIds={topFilters.leaderIds}
          onToggle={(id) => setTopFilters({ ...topFilters, leaderIds: toggle(topFilters.leaderIds, id) })}
        />

        <MultiSelectPills
          title="Kategoria"
          items={categories}
          selectedIds={topFilters.categoryIds}
          onToggle={(id) => setTopFilters({ ...topFilters, categoryIds: toggle(topFilters.categoryIds, id) })}
        />

        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tagi</p>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <PillButton
                key={tag.id}
                active={topFilters.tagIds.includes(tag.id)}
                onClick={() => setTopFilters({ ...topFilters, tagIds: toggle(topFilters.tagIds, tag.id) })}
              >
                {tag.name}
              </PillButton>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Zakres czasowy</p>
          <div className="flex flex-wrap gap-2">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <PillButton
                key={opt.value}
                active={topFilters.timeRange === opt.value}
                onClick={() => setTopFilters({ ...topFilters, timeRange: opt.value })}
              >
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>
      </div>

      {/* Nigdy nieśpiewane — filtry domyślne */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 mb-1">Nigdy nieśpiewane — filtry domyślne</h2>
        <p className="text-xs text-gray-500 mb-3">
          Brak wyboru = wszystkie. Wielu liderów lub kategorii = wystarczy jeden. Wiele tagów = muszą być wszystkie.
        </p>

        <MultiSelectPills
          title="Lider"
          items={leaders}
          selectedIds={neverFilters.leaderIds}
          onToggle={(id) => setNeverFilters({ ...neverFilters, leaderIds: toggle(neverFilters.leaderIds, id) })}
        />

        <MultiSelectPills
          title="Kategoria"
          items={categories}
          selectedIds={neverFilters.categoryIds}
          onToggle={(id) => setNeverFilters({ ...neverFilters, categoryIds: toggle(neverFilters.categoryIds, id) })}
        />

        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tagi (AND — muszą być wszystkie)</p>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <PillButton
                key={tag.id}
                active={neverFilters.includedTagIds.includes(tag.id)}
                onClick={() => setNeverFilters({ ...neverFilters, includedTagIds: toggle(neverFilters.includedTagIds, tag.id) })}
              >
                {tag.name}
              </PillButton>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tagi wykluczone (AND — żadnego z tych)</p>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <PillButton
                key={tag.id}
                active={neverFilters.excludedTagIds.includes(tag.id)}
                onClick={() => setNeverFilters({ ...neverFilters, excludedTagIds: toggle(neverFilters.excludedTagIds, tag.id) })}
              >
                {tag.name}
              </PillButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'nabozenstwa', label: 'Nabożeństwa' },
  { id: 'leaders', label: 'Liderzy' },
  { id: 'tags', label: 'Tagi' },
  { id: 'collections', label: 'Zbiory' },
  { id: 'filtry', label: 'Filtry' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('nabozenstwa')

  return (
    <div className="max-w-lg mx-auto">
      {/* Nagłówek */}
      <div className="px-4 pt-6 pb-3 flex items-baseline gap-3">
        <h1 className="text-xl font-bold text-blue-900">Ustawienia</h1>
        <span className="text-xs text-gray-400">
          v{process.env.NEXT_PUBLIC_COMMIT_SHA?.slice(0, 7) ?? 'dev'}
        </span>
      </div>

      {/* Zakładki */}
      <div className="overflow-x-auto border-b border-gray-200 px-4">
        <div className="flex gap-0 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-900 text-blue-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Zawartość zakładki */}
      <div className="px-4 pt-4 pb-4">
        {activeTab === 'nabozenstwa' && (
          <>
            <DictionarySection title="Lokalizacje" endpoint="locations" />
            <DictionarySection title="Kategorie nabożeństw" endpoint="service-categories" />
          </>
        )}
        {activeTab === 'leaders' && (
          <DictionarySection title="Liderzy muzyki" endpoint="worship-leaders" />
        )}
        {activeTab === 'tags' && (
          <>
            <DictionarySection title="Kategorie tagów" endpoint="tag-categories" />
            <DictionarySection
              title="Tagi"
              endpoint="tags"
              extraFields={[
                { key: 'category_id', label: 'Kategoria', optionsEndpoint: 'tag-categories' },
                { key: 'description', label: 'Opis (opcjonalnie)' },
              ]}
            />
          </>
        )}
        {activeTab === 'collections' && (
          <DictionarySection
            title="Zbiory pieśni"
            endpoint="collections"
            extraFields={[{ key: 'short_name', label: 'Skrót (np. SE)' }]}
          />
        )}
        {activeTab === 'filtry' && <FiltersTab />}
      </div>
    </div>
  )
}
