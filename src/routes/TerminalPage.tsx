import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiscovery } from '../components/useDiscovery'

const errors = [
  'command not found',
  'that door is not visible from here',
  'listen closer',
  'the corridor remembers that word',
  'no response',
]

type Line = { kind: 'in' | 'out'; text: string }

export function TerminalPage() {
  const navigate = useNavigate()
  const { state, discoverCommand, reset } = useDiscovery()
  const [value, setValue] = useState('')
  const [lines, setLines] = useState<Line[]>([
    { kind: 'out', text: 'type "help" to get started' },
  ])

  const knownHelp = useMemo(() => {
    const base = ['about', 'explore', 'clear', 'whoami']
    if (state.discoveredCommands.includes('observer')) base.push('observer')
    if (state.discoveredCommands.includes('desktop')) base.push('desktop?')
    if (state.discoveredCommands.includes('elevator')) base.push('elevator')
    if (state.discoveredCommands.includes('wait')) base.push('wait')
    return base
  }, [state.discoveredCommands])

  function reply(text: string) {
    setLines((current) => [...current, { kind: 'out', text }])
  }

  function go(path: string, command: string) {
    discoverCommand(command)
    navigate(path)
  }

  function runCommand() {
    const command = value.trim().toLowerCase()
    setValue('')
    setLines((current) => [...current, { kind: 'in', text: `> ${command}` }])

    if (!command) return
    if (command === 'help') reply(knownHelp.join('\n'))
    else if (command === 'about') reply('A place for doors that forgot they were pages.')
    else if (command === 'whoami') reply(state.kimVisited ? 'observer, partially indexed' : 'not yet identified')
    else if (command === 'clear') setLines([])
    else if (command === 'explore' || command === 'corridor') go('/corridor', 'corridor')
    else if (command === 'kim') go('/kim', 'kim')
    else if (command === 'desktop') go('/desktop', 'desktop')
    else if (command === 'library') go('/library', 'library')
    else if (command === 'mirror') go('/mirror', 'mirror')
    else if (command === 'dream') go('/dream', 'dream')
    else if (command === 'elevator') go('/elevator', 'elevator')
    else if (command === 'observer') reply(`visited pages: ${state.visitedPages.length}\nfalse end: ${state.falseEndReached ? 'confirmed' : 'unconfirmed'}`)
    else if (command === 'wait') go('/waiting-room', 'wait')
    else if (command === 'reset') {
      reset()
      reply('memory emptied. the rooms will pretend not to know you.')
    } else reply(errors[Math.floor(Math.random() * errors.length)])
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    runCommand()
  }

  return (
    <main className="terminal-page">
      <div className="crt-overlay" />
      <section className="terminal-screen" aria-label="terminal">
        <div className="terminal-lines">
          {lines.map((line, index) => (
            <pre className={line.kind} key={`${line.text}-${index}`}>{line.text}</pre>
          ))}
        </div>
        <form onSubmit={onSubmit} className="terminal-form">
          <span>&gt;</span>
          <input
            autoFocus
            value={value}
            aria-label="terminal command"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                runCommand()
              }
            }}
          />
          <button className="sr-submit" type="submit">run</button>
          <i />
        </form>
      </section>
    </main>
  )
}
