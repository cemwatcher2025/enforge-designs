import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'

export function MirrorRoomPage() {
  const navigate = useNavigate()
  const [word, setWord] = useState('')

  function submit(value: string) {
    if (value === 'mik') navigate('/kim')
    if (value === 'rodirroc') navigate('/corridor')
    if (value === 'emoh' || value === 'home') navigate('/terminal')
  }

  return (
    <RoomChrome room="mirror room" className="mirror-page">
      <section className="mirror-panel">
        <h1>emoh</h1>
        <p>uoy sees tahw si tI .ees uoy tahw ton si rewsna ehT</p>
        <input value={word} onChange={(event) => { setWord(event.target.value); submit(event.target.value.toLowerCase()) }} placeholder="type reflection" />
        <button onClick={() => navigate('/dream')} type="button">click the reflection, not the object</button>
      </section>
    </RoomChrome>
  )
}
