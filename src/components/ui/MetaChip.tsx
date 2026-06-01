interface MetaChipProps {
  icon?: React.ReactNode
  children: React.ReactNode
}

export function MetaChip({ icon, children }: MetaChipProps) {
  return (
    <span className="meta-chip">
      {icon}
      {children}
    </span>
  )
}
