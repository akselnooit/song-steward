import { Lock } from 'lucide-react'

type TagSource = 'confirmed' | 'user' | 'ai'
type TagState = 'include' | 'exclude' | null

interface TagPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  name: string
  source?: TagSource
  state?: TagState
  locked?: boolean
}

export function TagPill({ name, source, state, locked, className, ...props }: TagPillProps) {
  const cls = ['tag']
  if (state === 'include') cls.push('include')
  else if (state === 'exclude') cls.push('exclude')
  else if (source) cls.push('src-' + source)
  if (locked) cls.push('locked')
  if (className) cls.push(className)

  return (
    <button className={cls.join(' ')} {...props}>
      {source && !state && <span className="dot" />}
      {locked && <Lock size={12} />}
      {name}
    </button>
  )
}
