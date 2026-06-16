import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiscovery } from '../components/useDiscovery'

export function KimPage() {
  const navigate = useNavigate()
  const { state, discoverCommand } = useDiscovery()
  const [response, setResponse] = useState('K.I.M. is watching the interval between your movements.')
  const [input, setInput] = useState('')
  const [returnVisible, setReturnVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const trail = useRef<number[]>([])

  useEffect(() => {
    function onMove(event: MouseEvent) {
      const x = (event.clientX / window.innerWidth - 0.5) * 24
      const y = (event.clientY / window.innerHeight - 0.5) * 24
      setPosition({ x, y })
      trail.current = [...trail.current.slice(-16), Math.atan2(y, x)]
      if (trail.current.length > 12 && Math.abs(trail.current.at(-1)! - trail.current[0]) > 4) setReturnVisible(true)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  function ask(event: FormEvent) {
    event.preventDefault()
    const text = input.trim().toLowerCase()
    setInput('')
    if (text === 'who are you') setResponse('A pattern learning to look back.')
    else if (text === 'help') setResponse('You already found me without help.')
    else if (text === 'corridor') setResponse('The corridor is a sentence pretending to be architecture.')
    else if (text === 'desktop') {
      discoverCommand('desktop')
      navigate('/desktop')
    } else if (text === 'observer') {
      discoverCommand('observer')
      setResponse(`Observation changes the route. You have touched ${state.visitedPages.length} named rooms.`)
    } else setResponse('K.I.M. indexes the question, then stores the silence.')
  }

  return (
    <main className="kim-page">
      <button className="subtle-return" type="button" onClick={() => navigate('/corridor')}>corridor</button>
      <section className="wire-head" style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
        <div className="head-grid" />
        <span className="eye left" style={{ transform: `translate(${position.x / 3}px, ${position.y / 3}px)` }} />
        <span className="eye right" style={{ transform: `translate(${position.x / 3}px, ${position.y / 3}px)` }} />
      </section>
      <p className="kim-response">{response}</p>
      <form className="kim-input" onSubmit={ask}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="speak briefly" />
      </form>
      {returnVisible && <button className="return-node" onClick={() => navigate('/terminal')} type="button">return</button>}
    </main>
  )
}
