import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArtifactIcon } from './ArtifactIcon'
import { iconForRoom } from '../utils/roomIcons'

type RoomChromeProps = {
  room: string
  children: ReactNode
  className?: string
}

export function RoomChrome({ room, children, className = '' }: RoomChromeProps) {
  const navigate = useNavigate()

  return (
    <main className={`room ${className}`}>
      <button className="subtle-return" type="button" onClick={() => navigate('/terminal')}>
        <ArtifactIcon name="crt" size="sm" />
        terminal
      </button>
      <div className="room-label">
        <ArtifactIcon name={iconForRoom(room)} size="sm" />
        {room}
      </div>
      {children}
    </main>
  )
}
