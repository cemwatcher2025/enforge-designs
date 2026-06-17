import { ArtifactIcon, type ArtifactIconName } from './ArtifactIcon'

type DraggableIconProps = {
  label: string
  icon: ArtifactIconName
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
      <ArtifactIcon name={icon} size="lg" />
      <small>{label}</small>
    </button>
  )
}
