import Link from 'next/link'
import { Song } from '@/lib/types'

interface Action {
  label: string
  onClick: (song: Song) => void
  variant?: 'primary' | 'secondary'
}

interface Props {
  song: Song
  actions?: Action[]
}

export default function SongCard({ song, actions }: Props) {
  const collectionLabel = song.collection
    ? `${song.collection.short_name} ${song.number}`
    : `#${song.number}`

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start gap-3">
      {/* Numer i zbiór */}
      <div className="shrink-0 bg-blue-900 text-white rounded-lg px-2.5 py-1 text-sm font-bold min-w-[52px] text-center">
        {collectionLabel}
      </div>

      {/* Tytuł i autor */}
      <div className="flex-1 min-w-0">
        <Link href={`/songs/${song.id}`} className="font-semibold text-gray-900 hover:text-blue-900 line-clamp-1">
          {song.title}
        </Link>
        {song.author && (
          <Link
            href={`/songs?author_id=${song.author_id}&author_name=${encodeURIComponent(song.author)}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5 hover:text-blue-900 w-fit"
          >
            {song.author_image && (
              <img src={song.author_image} alt={song.author} className="w-4 h-4 rounded-full object-cover shrink-0" />
            )}
            {song.author}
          </Link>
        )}
        {song.tags && song.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {song.tags.map((tag) => (
              <span key={tag.id} className="inline-block bg-blue-50 text-blue-800 text-xs rounded-full px-2 py-0.5">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Przyciski akcji */}
      {actions && actions.length > 0 && (
        <div className="flex gap-1 shrink-0">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => action.onClick(song)}
              className={`rounded-lg px-3 py-2 text-sm font-medium min-h-[44px] ${
                action.variant === 'secondary'
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-blue-900 text-white hover:bg-blue-800 active:bg-blue-700'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
