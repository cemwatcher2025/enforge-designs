import type { CommsConfig, ServiceState } from '../config'

type EmailPreview = {
  id: string
  sender: string
  subject: string
  snippet: string
  time: string
  href: string
}

type CalendarPreview = {
  title: string
  time: string
  attendees: string
}

type CommsHubProps = {
  config: CommsConfig
  onStageReply: () => void
  replyDraft: string
  replyStatus: string
  setReplyDraft: (value: string) => void
}

const unreadEmails: EmailPreview[] = []
const nextEvent: CalendarPreview | null = null

function dotState(connected: boolean): ServiceState {
  return connected ? 'online' : 'offline'
}

export function CommsHub({ config, onStageReply, replyDraft, replyStatus, setReplyDraft }: CommsHubProps) {
  const unreadCount = config.gmailConnected ? unreadEmails.length : null
  const todayEventCount = config.calendarConnected && nextEvent ? 1 : 0

  return (
    <article className="panel panel-large">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Panel 02</p>
          <h2>Communications Hub</h2>
        </div>
        <span className="panel-badge">{unreadCount === null ? 'Connect' : `${unreadCount} unread`}</span>
      </div>

      <div className="comms-status-grid" aria-label="Communications service status">
        <div className="mini-status" data-state={dotState(config.gmailConnected)}>
          <span className="status-dot" />
          <div>
            <strong>Gmail</strong>
            <span>{config.gmailConnected ? 'Connected via link-out' : 'Not connected'}</span>
          </div>
        </div>
        <div className="mini-status" data-state={dotState(config.calendarConnected)}>
          <span className="status-dot" />
          <div>
            <strong>Calendar</strong>
            <span>{config.calendarConnected ? 'Connected via link-out' : 'Not connected'}</span>
          </div>
        </div>
      </div>

      <div className="comms-actions">
        <a href={config.gmailInboxUrl} rel="noreferrer" target="_blank">Open Inbox</a>
        <a href={config.gmailComposeUrl} rel="noreferrer" target="_blank">Compose</a>
        <a href={config.calendarUrl} rel="noreferrer" target="_blank">Open Calendar</a>
      </div>

      <section className="comms-block" aria-labelledby="unread-email-heading">
        <div className="section-heading">
          <h3 id="unread-email-heading">Unread email</h3>
          <span>{unreadCount === null ? '-' : unreadCount}</span>
        </div>
        {config.gmailConnected && unreadEmails.length > 0 ? (
          <div className="message-stack">
            {unreadEmails.map((email) => (
              <a className="message-row message-link" href={email.href} key={email.id} rel="noreferrer" target="_blank">
                <span>{email.sender}</span>
                <div>
                  <strong>{email.subject}</strong>
                  <p>{email.snippet}</p>
                </div>
                <em>{email.time}</em>
              </a>
            ))}
          </div>
        ) : (
          <p className="panel-note">
            Gmail deep links are ready. Live unread sender, subject, snippet, and time require a Google OAuth connector or backend mail service.
          </p>
        )}
      </section>

      <section className="comms-block" aria-labelledby="calendar-heading">
        <div className="section-heading">
          <h3 id="calendar-heading">Calendar</h3>
          <span>{todayEventCount} today</span>
        </div>
        {config.calendarConnected && nextEvent ? (
          <div className="calendar-next">
            <span>{nextEvent.time}</span>
            <strong>{nextEvent.title}</strong>
            <p>{nextEvent.attendees}</p>
          </div>
        ) : (
          <p className="panel-note">
            Calendar link-out is ready. The next event and attendee list need a Google Calendar API connector before live schedule data can appear here.
          </p>
        )}
      </section>

      <form className="quick-reply">
        <label htmlFor="quick-reply">Quick reply draft</label>
        <textarea
          id="quick-reply"
          onChange={(event) => setReplyDraft(event.target.value)}
          placeholder="Draft a response or action note. Use Compose when ready to send."
          value={replyDraft}
        />
        <button onClick={onStageReply} type="button">Stage reply</button>
        <p className="reply-status">{replyStatus}</p>
      </form>
    </article>
  )
}
