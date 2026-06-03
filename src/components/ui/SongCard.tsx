import { User } from 'lucide-react'
import { keyLabel } from '../../lib/utils'

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

export function SongCard({ collection, number, title, author, authorImage, songKey, minor = false, showKey = true, right, onClick }: SongCardProps) {
  return (
    <div className="song-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <span className="badge-col">{collection} {number}</span>
      <div className="meta">
        <div className="title" style={{ textWrap: 'pretty' } as React.CSSProperties}>{title}</div>
        <div className="author">
          <div className="avatar">
            {authorImage
              ? <img src={authorImage} alt={author} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <User size={13} />}
          </div>
          {author}
        </div>
      </div>
      {showKey && songKey && (
        <span className="key t-mono">{keyLabel(songKey, minor)}</span>
      )}
      {right}
    </div>
  )
}
