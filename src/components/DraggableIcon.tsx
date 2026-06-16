import { type ReactNode } from 'react'

type DraggableIconProps = {
  label: string
  icon: ReactNode
  onOpen: () => void
  draggable?: boolean
  onDragStart?: () => void
}

export function DraggableIcon({
  label,
  icon,
  onOpen,
  draggable = false,
  onDragStart,
}: DraggableIconProps) {
  return (
    <button
      className="desktop-icon"
      draggable={draggable}
      type="button"
      onClick={onOpen}
      onDoubleClick={onOpen}
      onDragStart={onDragStart}
    >
      <span>{icon}</span>
      <small>{label}</small>
    </button>
  )
}
