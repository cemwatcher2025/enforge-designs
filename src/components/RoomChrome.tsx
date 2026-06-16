import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

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
        terminal
      </button>
      <div className="room-label">{room}</div>
      {children}
    </main>
  )
}
