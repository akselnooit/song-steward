'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

type PendingSong = {
  id: string
  number: number
  title: string
  collection: { short_name: string } | null
  pending_additions: { id: string; name: string }[]
  pending_removals: { id: string; name: string }[]
}

type PendingData = {
  totalAdditions: number
  totalRemovals: number
  songs: PendingSong[]
}

export default function PendingTagsSection() {
  const [data, setData] = useState<PendingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pending-tags')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-20 animate-pulse mb-4" />
  }

  if (!data || (data.totalAdditions === 0 && data.totalRemovals === 0)) {
    return null
  }

  const total = data.totalAdditions + data.totalRemovals

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle size={16} className="text-amber-500 shrink-0" />
        <h2 className="font-semibold text-gray-700">
          Tagi do zatwierdzenia
          <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{total}</span>
        </h2>
      </div>

      <div className="flex gap-4 text-xs text-gray-500 mb-3">
        {data.totalAdditions > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            {data.totalAdditions} dodanych
          </span>
        )}
        {data.totalRemovals > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            {data.totalRemovals} do usunięcia
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {data.songs.slice(0, 5).map((song) => {
          const label = song.collection
            ? `${song.collection.short_name} ${song.number}`
            : `#${song.number}`
          return (
            <li key={song.id}>
              <Link href={`/songs/${song.id}`} className="flex items-start gap-2 hover:text-blue-900 group">
                <span className="bg-blue-900 text-white rounded-md px-1.5 py-0.5 text-xs font-bold shrink-0 mt-0.5">{label}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 group-hover:text-blue-900 line-clamp-1">{song.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                    {[
                      song.pending_additions.length > 0 && `+${song.pending_additions.map((t) => t.name).join(', ')}`,
                      song.pending_removals.length > 0 && `−${song.pending_removals.map((t) => t.name).join(', ')}`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      {data.songs.length > 5 && (
        <p className="text-xs text-gray-400 mt-2 text-center">i jeszcze {data.songs.length - 5} pieśni…</p>
      )}
    </div>
  )
}
