import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useDiscovery } from './components/useDiscovery'
import { TerminalPage } from './routes/TerminalPage'
import { CorridorPage } from './routes/CorridorPage'
import { KimPage } from './routes/KimPage'
import { DesktopPage } from './routes/DesktopPage'
import { LibraryPage } from './routes/LibraryPage'
import { ObservatoryPage } from './routes/ObservatoryPage'
import { ElevatorPage } from './routes/ElevatorPage'
import { ArchivePage } from './routes/ArchivePage'
import { AquariumPage } from './routes/AquariumPage'
import { RadioPage } from './routes/RadioPage'
import { TrainStationPage } from './routes/TrainStationPage'
import { GalleryPage } from './routes/GalleryPage'
import { MachineRoomPage } from './routes/MachineRoomPage'
import { MirrorRoomPage } from './routes/MirrorRoomPage'
import { WaitingRoomPage } from './routes/WaitingRoomPage'
import { DreamPage } from './routes/DreamPage'

const pathToRoom: Record<string, string> = {
  '/terminal': 'terminal',
  '/corridor': 'corridor',
  '/kim': 'kim',
  '/desktop': 'desktop',
  '/library': 'library',
  '/observatory': 'observatory',
  '/elevator': 'elevator',
  '/archive': 'archive',
  '/aquarium': 'aquarium',
  '/radio': 'radio',
  '/train-station': 'train-station',
  '/gallery': 'gallery',
  '/machine': 'machine',
  '/mirror': 'mirror',
  '/waiting-room': 'waiting-room',
  '/dream': 'dream',
}

function VisitTracker() {
  const location = useLocation()
  const { visitPage, update } = useDiscovery()

  useEffect(() => {
    const room = pathToRoom[location.pathname]
    if (room) {
      visitPage(room)
      if (room === 'kim') update({ kimVisited: true })
    }
  }, [location.pathname, update, visitPage])

  return null
}

export default function App() {
  return (
    <>
      <VisitTracker />
      <Routes>
        <Route path="/" element={<Navigate to="/terminal" replace />} />
        <Route path="/terminal" element={<TerminalPage />} />
        <Route path="/corridor" element={<CorridorPage />} />
        <Route path="/kim" element={<KimPage />} />
        <Route path="/desktop" element={<DesktopPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/observatory" element={<ObservatoryPage />} />
        <Route path="/elevator" element={<ElevatorPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/aquarium" element={<AquariumPage />} />
        <Route path="/radio" element={<RadioPage />} />
        <Route path="/train-station" element={<TrainStationPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/machine" element={<MachineRoomPage />} />
        <Route path="/mirror" element={<MirrorRoomPage />} />
        <Route path="/waiting-room" element={<WaitingRoomPage />} />
        <Route path="/dream" element={<DreamPage />} />
        <Route path="*" element={<Navigate to="/terminal" replace />} />
      </Routes>
    </>
  )
}
