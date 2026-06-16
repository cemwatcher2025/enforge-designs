import { type ReactNode } from 'react'

type RetroWindowProps = {
  title: string
  children: ReactNode
  className?: string
}

export function RetroWindow({ title, children, className = '' }: RetroWindowProps) {
  return (
    <section className={`retro-window ${className}`}>
      <header>
        <span>{title}</span>
        <span className="window-buttons">_ x</span>
      </header>
      <div className="retro-window-body">{children}</div>
    </section>
  )
}
