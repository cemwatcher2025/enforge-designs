import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiscovery } from '../components/useDiscovery'

const fragments = [
  'The first door is rarely the first exit.',
  'KIM was never listed.',
  'Some rooms are commands. Some commands are rooms.',
  'The desktop has been waiting since 1998.',
  'Do not trust a clean hallway.',
  'Knock only when the door is listening.',
  'A file deleted in one place may appear in another.',
  'The machine changes the water.',
  'The stars are not above you.',
  'If you reach the end, keep going.',
]

export function CorridorPage() {
  const navigate = useNavigate()
  const { state, discoverCommand, solveDoor, update } = useDiscovery()
  const [latch, setLatch] = useState(0)
  const [zip, setZip] = useState(0)
  const [roll, setRoll] = useState(0)
  const [knocks, setKnocks] = useState(0)
  const [code, setCode] = useState('')
  const [mirror, setMirror] = useState('')
  const [eyeArmed, setEyeArmed] = useState(false)

  function open(path: string, door: string) {
    solveDoor(door)
    navigate(path)
  }

  return (
    <main className={`corridor ${state.machineSettings.corridorLights ? 'lit' : ''}`}>
      <button className="subtle-return" type="button" onClick={() => navigate('/terminal')}>terminal</button>
      <section className="corridor-depth">
        {fragments.map((fragment, index) => (
          <p className="wall-fragment" style={{ top: `${index * 460 + 180}px` }} key={fragment}>
            {fragment}
          </p>
        ))}

        <article className="corridor-panel kim-clue">
          <span>RECOVERED TERMINAL FRAME</span>
          <strong>&gt; kim</strong>
          <button onClick={() => discoverCommand('kim')} type="button">remember command</button>
        </article>

        <section className="door sliding-door">
          <h2>Sliding Bar Door</h2>
          <p>The latch only believes in commitment.</p>
          <input type="range" min="0" max="100" value={latch} onChange={(event) => setLatch(Number(event.target.value))} />
          {latch > 94 && <button onClick={() => open('/library', 'sliding-bar')} type="button">shelf air escapes</button>}
        </section>

        <section className="door combo-door">
          <h2>Combination Lock</h2>
          <p>The third, first, fourth, and first knocks were never sounds.</p>
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="code" />
          {code === '3141' && <button onClick={() => open('/archive', 'combination')} type="button">open drawer-shaped door</button>}
        </section>

        <section className="door zipper-door">
          <h2>Zipper Door</h2>
          <p>Trace the seam until the room stops pretending to be flat.</p>
          <input type="range" min="0" max="100" value={zip} onChange={(event) => setZip(Number(event.target.value))} />
          {zip > 90 && <button onClick={() => open('/dream', 'zipper')} type="button">unzip the dream</button>}
        </section>

        <section className="door roll-door">
          <h2>Roll-Up Door</h2>
          <p>Lift in small increments. The room is heavy.</p>
          <button onClick={() => setRoll((current) => Math.min(4, current + 1))} type="button">pull upward</button>
          <div className="roll-meter" style={{ height: `${roll * 22}%` }} />
          {roll >= 4 && <button onClick={() => open('/machine', 'roll-up')} type="button">crawl under</button>}
        </section>

        <section className="door knock-door">
          <h2>Knock Door</h2>
          <p>Knock only when the door is listening.</p>
          <button onClick={() => setKnocks((current) => current + 1)} type="button">knock</button>
          <span>{knocks} / 3</span>
          {knocks === 3 && <button onClick={() => open('/waiting-room', 'knock')} type="button">enter the quiet room</button>}
        </section>

        <section className="door eye-door">
          <h2>Eye Door</h2>
          <p>Let it look back for three seconds.</p>
          <button
            className="eye-symbol"
            onMouseEnter={() => window.setTimeout(() => setEyeArmed(true), 3000)}
            type="button"
          >
            eye
          </button>
          {eyeArmed && <button onClick={() => open('/observatory', 'eye')} type="button">follow the gaze</button>}
        </section>

        <section className="door mirror-door">
          <h2>rooD rorriM</h2>
          <p>epyt eht drow uoy dluohs ton ees</p>
          <input value={mirror} onChange={(event) => setMirror(event.target.value.toLowerCase())} placeholder="word" />
          {mirror === 'mirror' && <button onClick={() => open('/mirror', 'mirror')} type="button">step through reflection</button>}
        </section>

        <section className="false-end">
          <h2>END OF CORRIDOR</h2>
        </section>

        <section className="after-end">
          <button type="button" onClick={() => update({ falseEndReached: true })}>
            False endings are still doors.
          </button>
          {state.falseEndReached && <button type="button" onClick={() => navigate('/gallery')}>the wall becomes a gallery</button>}
        </section>
      </section>
    </main>
  )
}
