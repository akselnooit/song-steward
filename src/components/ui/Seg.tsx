interface SegOption<T extends string> {
  v: T
  label: string
}

interface SegProps<T extends string> {
  options: SegOption<T>[]
  value: T
  onChange: (v: T) => void
}

export function Seg<T extends string>({ options, value, onChange }: SegProps<T>) {
  return (
    <div className="seg">
      {options.map(o => (
        <button
          key={o.v}
          className={value === o.v ? 'on' : ''}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
