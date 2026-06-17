export type ArtifactIconName =
  | 'apple'
  | 'book'
  | 'clock'
  | 'crt'
  | 'door'
  | 'eye'
  | 'file'
  | 'fish'
  | 'folder'
  | 'head'
  | 'key'
  | 'mirror'
  | 'modem'
  | 'radio'
  | 'star'
  | 'ticket'
  | 'valve'
  | 'zipper'

type ArtifactIconProps = {
  name: ArtifactIconName
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function ArtifactIcon({ name, size = 'md', label }: ArtifactIconProps) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={`artifact-icon artifact-${name} artifact-${size}`}
      role={label ? 'img' : undefined}
    >
      <span className="artifact-shape" />
    </span>
  )
}
