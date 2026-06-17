import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiscovery } from '../components/useDiscovery'

type Point = {
  x: number
  y: number
}

export function KimPage() {
  const navigate = useNavigate()
  const { state, discoverCommand } = useDiscovery()
  const [response, setResponse] = useState('K.I.M. is watching the interval between your movements.')
  const [input, setInput] = useState('')
  const [returnVisible, setReturnVisible] = useState(false)
  const [visual, setVisual] = useState({ headX: 0, headY: 0, gazeX: 0, gazeY: 0, eyeLight: 0.74 })
  const trail = useRef<number[]>([])
  const cursor = useRef<Point>({ x: 0, y: 0 })
  const head = useRef<Point>({ x: 0, y: 0 })
  const gaze = useRef<Point>({ x: 0, y: 0 })
  const forcedLook = useRef<{ target: Point; until: number } | null>(null)
  const lastMove = useRef(0)
  const fastUntil = useRef(0)
  const idleOutwardUntil = useRef(0)

  useEffect(() => {
    lastMove.current = Date.now()
    function onMove(event: MouseEvent) {
      const x = (event.clientX / window.innerWidth - 0.5) * 24
      const y = (event.clientY / window.innerHeight - 0.5) * 24
      cursor.current = { x, y }
      lastMove.current = Date.now()
      trail.current = [...trail.current.slice(-16), Math.atan2(y, x)]
      if (trail.current.length > 12 && Math.abs(trail.current.at(-1)! - trail.current[0]) > 4) setReturnVisible(true)
    }
    function onEnter(event: MouseEvent) {
      const x = (event.clientX / window.innerWidth - 0.5) * 24
      const y = (event.clientY / window.innerHeight - 0.5) * 24
      cursor.current = { x, y }
      gaze.current = { x, y }
      fastUntil.current = Date.now() + 900
      forcedLook.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseenter', onEnter)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseenter', onEnter)
    }
  }, [])

  useEffect(() => {
    let frame = 0
    let cancelled = false
    let nextGlance = Date.now() + 20000 + Math.random() * 20000

    function animate() {
      const now = Date.now()
      const idleFor = now - lastMove.current
      const t = now / 1000

      if (now > nextGlance) {
        const behavior = Math.random()
        if (behavior < 0.45) {
          forcedLook.current = { target: { x: 0, y: 0 }, until: now + 1000 + Math.random() * 1000 }
        } else if (behavior < 0.78) {
          forcedLook.current = {
            target: { x: cursor.current.x * 0.82, y: cursor.current.y - 7 - Math.random() * 4 },
            until: now + 800 + Math.random() * 800,
          }
        } else {
          idleOutwardUntil.current = now + 1100 + Math.random() * 900
        }
        nextGlance = now + 20000 + Math.random() * 20000
      }

      let target = cursor.current
      if (idleFor > 15000) {
        target = {
          x: Math.sin(t * 0.34) * 8 + Math.sin(t * 0.11) * 4,
          y: Math.cos(t * 0.27) * 5 - 1,
        }
      }
      if (idleFor > 30000 && Math.sin(t * 0.17) > 0.93) {
        idleOutwardUntil.current = now + 1400
      }
      if (idleOutwardUntil.current > now) {
        target = { x: 0, y: 0 }
      }
      if (forcedLook.current) {
        if (forcedLook.current.until > now) target = forcedLook.current.target
        else forcedLook.current = null
      }

      const gazeEase = fastUntil.current > now ? 0.42 : idleFor > 15000 ? 0.035 : 0.11
      const headEase = fastUntil.current > now ? 0.2 : 0.048
      gaze.current = {
        x: gaze.current.x + (target.x - gaze.current.x) * gazeEase,
        y: gaze.current.y + (target.y - gaze.current.y) * gazeEase,
      }
      head.current = {
        x: head.current.x + (target.x * 0.62 - head.current.x) * headEase,
        y: head.current.y + (target.y * 0.46 - head.current.y) * headEase,
      }

      frame += 1
      if (frame % 2 === 0) {
        setVisual({
          headX: head.current.x,
          headY: head.current.y,
          gazeX: gaze.current.x,
          gazeY: gaze.current.y,
          eyeLight: 0.68 + Math.sin(t * 0.9) * 0.08 + Math.sin(t * 0.23) * 0.04,
        })
      }
      if (!cancelled) requestAnimationFrame(animate)
    }

    const animation = requestAnimationFrame(animate)
    return () => {
      cancelled = true
      cancelAnimationFrame(animation)
    }
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
      <div className="kim-field" aria-hidden="true">
        <span className="kim-particle particle-1" />
        <span className="kim-particle particle-2" />
        <span className="kim-particle particle-3" />
        <span className="kim-network network-1" />
        <span className="kim-network network-2" />
      </div>
      <section
        className="wire-head"
        style={{ transform: `translate(${visual.headX}px, ${visual.headY}px)` }}
        aria-label="K.I.M. observing"
      >
        <div className="head-aura" />
        <div className="head-silhouette">
          <img className="head-image" src="/kim/kim-head.png" alt="" />
          <span className="head-meridian meridian-left" />
          <span className="head-meridian meridian-center" />
          <span className="head-meridian meridian-right" />
          <span className="head-meridian meridian-far-left" />
          <span className="head-meridian meridian-far-right" />
          <span className="head-latitude latitude-brow" />
          <span className="head-latitude latitude-eye" />
          <span className="head-latitude latitude-low" />
          <span className="head-scan scan-1" />
          <span className="head-scan scan-2" />
          <span
            className="eye left"
            style={{
              opacity: visual.eyeLight,
              transform: `translate(${visual.gazeX / 3.8}px, ${visual.gazeY / 4.6}px)`,
            }}
          />
          <span
            className="eye right"
            style={{
              opacity: visual.eyeLight,
              transform: `translate(${visual.gazeX / 3.8}px, ${visual.gazeY / 4.6}px)`,
            }}
          />
        </div>
      </section>
      <p className="kim-response">{response}</p>
      <form className="kim-input" onSubmit={ask}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="speak briefly" />
      </form>
      {returnVisible && <button className="return-node" onClick={() => navigate('/terminal')} type="button">return</button>}
    </main>
  )
}
