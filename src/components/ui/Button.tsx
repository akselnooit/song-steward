import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
  block?: boolean
  icon?: boolean
  mini?: boolean
}

export function Button({ variant = 'primary', block, icon, mini, className, children, ...props }: ButtonProps) {
  const cls = [
    icon ? 'icon-btn' : mini ? 'mini-btn' : 'btn',
    !icon && !mini && (variant === 'primary' ? 'btn-primary' : 'btn-ghost'),
    block && 'btn-block',
    className,
  ].filter(Boolean).join(' ')

  return <button className={cls} {...props}>{children}</button>
}
