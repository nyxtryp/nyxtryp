export function installDiagnostics() {
  const events = []
  const push = (type, detail = {}) => {
    const entry = { time: new Date().toISOString(), type, detail }
    events.push(entry)
    if (events.length > 100) events.shift()
    window.__NYXTRYP_DIAGNOSTICS__ = events
    console.warn('[NYXTRYP_DIAG]', entry)
  }
  window.addEventListener('error', (event) => push('window-error', { message: event.message }))
  window.addEventListener('unhandledrejection', (event) => push('unhandled-rejection', { reason: String(event.reason) }))
  return push
}
