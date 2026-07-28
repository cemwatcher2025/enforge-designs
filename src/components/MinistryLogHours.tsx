import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { logMinistryHours, type MinistryEntryType } from '../utils/ministryApi'

type MinistryLogHoursProps = {
  prefill?: { hours: string; type: string }
  onLogged: () => void
}

const today = new Date().toISOString().slice(0, 10)

export function MinistryLogHours({ onLogged, prefill }: MinistryLogHoursProps) {
  const [date, setDate] = useState(today)
  const [hours, setHours] = useState('1.0')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('Ready to log time.')
  const [submitting, setSubmitting] = useState(false)
  const [type, setType] = useState<MinistryEntryType>('field-service')

  useEffect(() => {
    if (!prefill) return
    const timeout = window.setTimeout(() => {
      setHours(prefill.hours)
      const lowered = prefill.type.toLowerCase()
      if (lowered.includes('study')) setType('bible-study')
      else if (lowered.includes('return')) setType('return-visit')
      else setType('field-service')
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [prefill])

  async function submitHours(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedHours = Number(hours)
    if (!date || !Number.isFinite(parsedHours) || parsedHours <= 0) {
      setStatus('Enter a valid date and hours amount.')
      return
    }

    setSubmitting(true)
    setStatus('Logging hours...')
    try {
      await logMinistryHours({ date, hours: parsedHours, notes: notes.trim(), type })
      setStatus('Hours logged successfully.')
      setNotes('')
      onLogged()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Hours log failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="ministry-log-form" onSubmit={submitHours}>
      <div className="ministry-section-title">
        <h3>Log hours</h3>
        <span>{submitting ? 'Saving' : 'POST'}</span>
      </div>
      <div className="ministry-form-grid">
        <label>
          Date
          <input onChange={(event) => setDate(event.target.value)} type="date" value={date} />
        </label>
        <label>
          Hours
          <input min="0.1" onChange={(event) => setHours(event.target.value)} step="0.1" type="number" value={hours} />
        </label>
        <label>
          Type
          <select onChange={(event) => setType(event.target.value as MinistryEntryType)} value={type}>
            <option value="field-service">Field service</option>
            <option value="return-visit">Return visit</option>
            <option value="bible-study">Bible study</option>
          </select>
        </label>
      </div>
      <label>
        Notes
        <textarea onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes" value={notes} />
      </label>
      <button disabled={submitting} type="submit">{submitting ? 'Logging...' : 'Log hours'}</button>
      <p className="reply-status">{status}</p>
    </form>
  )
}
