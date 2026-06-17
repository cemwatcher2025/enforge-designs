import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DraggableIcon } from '../components/DraggableIcon'
import { RetroWindow } from '../components/RetroWindow'
import { useDiscovery } from '../components/useDiscovery'
import { iconForDesktopItem } from '../utils/roomIcons'

export function DesktopPage() {
  const navigate = useNavigate()
  const { addDesktopSecret, discoverCommand } = useDiscovery()
  const [windowName, setWindowName] = useState('ReadMe.txt')
  const [exitVisible, setExitVisible] = useState(false)
  const [search, setSearch] = useState('')
  const [hiddenIcons, setHiddenIcons] = useState(false)

  const content: Record<string, string> = {
    'ReadMe.txt': 'I always save things backwards. rorrim is not an error. The hallway remembers KIM.',
    'My Computer': 'Drives: C:/ROOMS, A:/DREAM, Z:/FALSE_END',
    Notepad: 'notes: library | stars under water | deleted file returns',
    Paint: 'A crude door has been drawn sideways. One pixel says EXIT.',
    Documents: 'corridor.log: The hallway remembers KIM.',
    Games: 'There is only one game. It is already running.',
  }

  function openIcon(name: string) {
    setWindowName(name)
    if (name === 'Recycle Bin') addDesktopSecret('recycle-bin')
  }

  function searchDialup() {
    const term = search.toLowerCase()
    if (term.includes('library')) navigate('/library')
    else if (term.includes('kim')) navigate('/kim')
    else if (term.includes('stars')) navigate('/observatory')
    else if (term.includes('observer')) discoverCommand('observer')
  }

  return (
    <main className="desktop-page">
      <div className="desktop-grid">
        {['My Computer', 'Recycle Bin', 'Notepad', 'Paint', 'Dial-Up', 'Documents', 'Control Panel', 'Games', 'ReadMe.txt'].map((name) => (
          <DraggableIcon
            key={name}
            label={name}
            icon={iconForDesktopItem(name)}
            onOpen={() => openIcon(name)}
            draggable={name === 'Documents'}
            onDragStart={() => setExitVisible(true)}
          />
        ))}
        {(exitVisible || hiddenIcons) && <DraggableIcon label="Exit.exe" icon="door" onOpen={() => navigate('/elevator')} />}
      </div>

      <RetroWindow title={windowName}>
        {windowName === 'Recycle Bin' && (
          <div>
            <p>deleted_file.tmp is humming.</p>
            <button onClick={() => setExitVisible(true)} type="button">restore suspicious file</button>
          </div>
        )}
        {windowName === 'Dial-Up' && (
          <div className="dialup">
            <p>CONNECTING... 56K MODEM... AUTHENTICATING...</p>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="search internal web" />
            <button onClick={searchDialup} type="button">search</button>
          </div>
        )}
        {windowName === 'Control Panel' && (
          <div>
            <label><input type="checkbox" onChange={(event) => setHiddenIcons(event.target.checked)} /> reveal hidden icons</label>
            <label><input type="checkbox" onChange={() => document.body.classList.toggle('invert-world')} /> invert colors</label>
          </div>
        )}
        {!['Recycle Bin', 'Dial-Up', 'Control Panel'].includes(windowName) && <p>{content[windowName]}</p>}
      </RetroWindow>

      <footer className="taskbar">
        <button type="button" onClick={() => navigate('/terminal')}>BEGIN</button>
        <span>desktop has been waiting since 1998</span>
      </footer>
    </main>
  )
}
