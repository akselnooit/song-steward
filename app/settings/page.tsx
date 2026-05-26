'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

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

  // Dane sekcji przez SWR — przy powrocie na stronę widoczne natychmiast z cache
  const { data: items = [], mutate: mutateItems } = useSWR<T[]>(`/api/${endpoint}`, fetcher, {
    revalidateOnFocus: false,
  })

  useEffect(() => {
    // Pobierz opcje dla pól select (rzadko się zmieniają, bez SWR)
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
                  // Jeśli to pole select, pokaż nazwę z opcji
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

const TABS = [
  { id: 'service-types', label: 'Typy nabożeństw' },
  { id: 'leaders', label: 'Liderzy' },
  { id: 'tags', label: 'Tagi' },
  { id: 'collections', label: 'Zbiory' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('service-types')

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
        {activeTab === 'service-types' && (
          <DictionarySection title="Typy nabożeństw" endpoint="service-types" />
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
      </div>
    </div>
  )
}
