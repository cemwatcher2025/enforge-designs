import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomChrome } from '../components/RoomChrome'

const shelf = ['A', 'R', 'C', 'H', 'I', 'V', 'E']

export function LibraryPage() {
  const navigate = useNavigate()
  const [pulled, setPulled] = useState('')
  const [order, setOrder] = useState('')

  return (
    <RoomChrome room="library" className="library-page">
      <section className="shelves">
        {shelf.map((letter) => (
          <button key={letter} className="book" type="button" onClick={() => setOrder((value) => value + letter)}>
            {letter}
          </button>
        ))}
        {['The Stars Are Filed Under Water', 'Still Life With Deleted File', 'Index of Sideways Doors'].map((title) => (
          <button className="book wide" key={title} type="button" onClick={() => setPulled(title)}>
            {title}
          </button>
        ))}
      </section>
      <aside className="book-page">
        <h1>{pulled || 'Open volume'}</h1>
        <p>{pulled ? 'The excerpt is brief and bothered by dust. It mentions water, stars, and a machine valve.' : 'Arrange A R C H I V E, or pull a book whose title points elsewhere.'}</p>
        {order.endsWith('ARCHIVE') && <button onClick={() => navigate('/archive')} type="button">shelf opens to archive</button>}
        {pulled.includes('Stars') && <button onClick={() => navigate('/observatory')} type="button">file stars under water</button>}
      </aside>
    </RoomChrome>
  )
}
