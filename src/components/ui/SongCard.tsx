import { keyLabel, collectionClass } from '../../lib/utils'

interface SongCardProps {
  collection: string
  number: number
  title: string
  author: string
  authorImage?: string | null
  songKey?: string
  minor?: boolean
  showKey?: boolean
  right?: React.ReactNode
  onClick?: () => void
}

export function SongCard({ collection, number, title, author, songKey, minor = false, showKey = true, right, onClick }: SongCardProps) {
  return (
    <div className="song-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <span className={`badge-col ${collectionClass(collection)}`}>{collection} {number}</span>
      <div className="meta">
        <div className="title" style={{ textWrap: 'pretty' } as React.CSSProperties}>{title}</div>
        {author && <div className="author">{author}</div>}
      </div>
      {showKey && songKey && (
        <span className="key t-mono">{keyLabel(songKey, minor)}</span>
      )}
      {right}
    </div>
  )
}
