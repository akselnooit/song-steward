import { keyLabel, collectionClass, shortAuthor } from '../../lib/utils'

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
  const showCol3 = author || (showKey && songKey)
  return (
    <div className="song-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <span className={`badge-col ${collectionClass(collection)}`}>{collection} {number}</span>
      <div className="meta">
        <div className="title" style={{ textWrap: 'pretty' } as React.CSSProperties}>{title}</div>
      </div>
      {showCol3 && (
        <div className="song-side">
          {author && <span className="author" title={author}>{shortAuthor(author)}</span>}
          {showKey && songKey && (
            <span className="key t-mono">{keyLabel(songKey, minor)}</span>
          )}
        </div>
      )}
      {right}
    </div>
  )
}
