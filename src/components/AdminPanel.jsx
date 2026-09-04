import { useEffect, useMemo, useRef, useState } from 'react'

const TYPES = [
  { id: 'tracks', label: 'TRACKS', accept: 'audio/mpeg,audio/mp3' },
  { id: 'radio', label: 'RADIO', accept: 'audio/mpeg,audio/mp3' },
  { id: 'mixes', label: 'MIXES', accept: 'audio/mpeg,audio/mp3' },
  { id: 'photos', label: 'PHOTOS', accept: 'image/*' }
]

const prettyName = name => name.replace(/\.[^.]+$/, '')
const extension = name => (name.match(/\.[^.]+$/) || [''])[0]

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
    reader.onerror = () => reject(reader.error || new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

export default function AdminPanel() {
  const [key, setKey] = useState(() => sessionStorage.getItem('nyxtryp-admin-key') || '')
  const [ok, setOk] = useState(false)
  const [active, setActive] = useState('tracks')
  const [files, setFiles] = useState({ tracks: [], radio: [], mixes: [], photos: [] })
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [rename, setRename] = useState(null)
  const [replaceName, setReplaceName] = useState(null)
  const input = useRef(null)
  const type = useMemo(() => TYPES.find(x => x.id === active), [active])

  const load = async () => {
    try {
      const r = await fetch('/api/admin', { cache: 'no-store' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Не удалось загрузить список')
      setFiles(data)
      setOk(true)
      setError('')
    } catch (e) {
      setOk(false)
      setError(e.message || 'Ошибка подключения')
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('nyxtryp-admin-key')
    if (!saved) return
    ;(async () => {
      try {
        const r = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'auth', adminKey: saved })
        })
        if (!r.ok) throw new Error('Неверный admin key')
        await load()
      } catch {
        sessionStorage.removeItem('nyxtryp-admin-key')
        setKey('')
        setOk(false)
      }
    })()
  }, [])

  const api = async (method, body) => {
    const r = await fetch('/api/admin', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, adminKey: key })
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || `Ошибка ${r.status}`)
    return data
  }

  const login = async e => {
    e.preventDefault()
    if (!key.trim()) return
    setStatus('ПРОВЕРКА…')
    setError('')
    try {
      await api('POST', { action: 'auth' })
      sessionStorage.setItem('nyxtryp-admin-key', key.trim())
      await load()
      setStatus('')
    } catch (e) {
      setOk(false)
      setError(e.message || 'Неверный admin key')
      setStatus('')
    }
  }

  const logout = () => {
    sessionStorage.removeItem('nyxtryp-admin-key')
    setKey('')
    setOk(false)
  }

  const chooseFile = mode => {
    setReplaceName(mode || null)
    setStatus('')
    setError('')
    if (input.current) input.current.value = ''
    input.current?.click()
  }

  const upload = async e => {
    const selected = Array.from(e.target.files || [])
    e.target.value = ''
    if (!selected.length) return

    const tooLarge = selected.find(f => f.size > 4 * 1024 * 1024)
    if (tooLarge) {
      setError(`«${tooLarge.name}» больше 4 МБ. Для больших MP3 следующим шагом подключим отдельную загрузку.`)
      return
    }

    setBusy(true)
    setStatus('СОХРАНЕНИЕ…')
    setError('')
    try {
      for (const file of selected) {
        const name = replaceName || file.name
        const content = await toBase64(file)
        await api('POST', { type: active, name, content })
      }
      setReplaceName(null)
      await load()
      setStatus(selected.length > 1 ? `СОХРАНЕНО: ${selected.length}` : 'СОХРАНЕНО')
    } catch (e) {
      setError(e.message || 'Ошибка сохранения')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  const remove = async name => {
    if (!confirm(`Удалить «${name}»?`)) return
    setBusy(true); setError(''); setStatus('УДАЛЕНИЕ…')
    try {
      await api('DELETE', { type: active, name })
      await load(); setStatus('УДАЛЕНО')
    } catch (e) { setError(e.message || 'Ошибка удаления'); setStatus('') }
    finally { setBusy(false) }
  }

  const saveRename = async () => {
    if (!rename?.newName.trim()) return
    setBusy(true); setError(''); setStatus('ПЕРЕИМЕНОВАНИЕ…')
    try {
      await api('PATCH', { type: active, oldName: rename.oldName, newName: `${rename.newName.trim()}${extension(rename.oldName)}` })
      setRename(null); await load(); setStatus('ИМЯ ИЗМЕНЕНО')
    } catch (e) { setError(e.message || 'Ошибка переименования'); setStatus('') }
    finally { setBusy(false) }
  }

  if (!ok) return <div className="nyx-admin-shell"><style>{CSS}</style><form className="nyx-admin-login" onSubmit={login}><div className="kicker">NYXTRYP / PRIVATE</div><h1>MEDIA CONTROL</h1><div className="sub">ADMIN ACCESS</div><input autoFocus type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="Admin key"/><button disabled={busy}>{busy ? 'CHECKING…' : 'ENTER'}</button>{status && <p className="status">{status}</p>}{error && <p className="err">{error}</p>}</form></div>

  return <div className="nyx-admin-shell"><style>{CSS}</style><main className="nyx-admin-panel">
    <header><div><div className="kicker">NYXTRYP / PRIVATE</div><h1>MEDIA CONTROL</h1></div><button className="plain" onClick={logout}>EXIT</button></header>
    <nav className="tabs">{TYPES.map(t => <button key={t.id} className={active === t.id ? 'active' : ''} onClick={() => { setActive(t.id); setStatus(''); setError('') }}>{t.label}<span>{files[t.id]?.length || 0}</span></button>)}</nav>
    <div className="toolbar"><button className="add" disabled={busy} onClick={() => chooseFile(null)}>+ {active === 'photos' ? 'UPLOAD PHOTOS' : `ADD ${type.label.slice(0,-1)}`}</button><span>{files[active]?.length || 0} FILES</span></div>
    <input ref={input} hidden type="file" accept={type.accept} multiple={active === 'photos'} onChange={upload}/>
    <section className="list">{(files[active] || []).map((name, i) => <div className="row" key={name}><b>{String(i + 1).padStart(2,'0')}</b><div title={name}>{prettyName(name)}</div><button disabled={busy} onClick={() => setRename({ oldName: name, newName: prettyName(name) })}>RENAME</button>{active !== 'photos' && <button disabled={busy} onClick={() => chooseFile(name)}>REPLACE</button>}<button className="danger" disabled={busy} onClick={() => remove(name)}>DELETE</button></div>)}{!files[active]?.length && <div className="empty">NO FILES</div>}</section>
    {(status || error) && <div className={error ? 'status error' : 'status'}>{error || status}</div>}
    {rename && <div className="dialog"><div className="card"><div className="kicker">RENAME</div><h2>{rename.oldName}</h2><input autoFocus value={rename.newName} onChange={e => setRename({ ...rename, newName: e.target.value })}/><div className="actions"><button className="plain" onClick={() => setRename(null)}>CANCEL</button><button className="add" disabled={busy} onClick={saveRename}>SAVE</button></div></div></div>}
  </main></div>
}

const CSS = `
.nyx-admin-shell{min-height:100vh;padding:24px;box-sizing:border-box;background:radial-gradient(circle at 50% 0%,rgba(55,125,190,.12),transparent 38%),#02050a;color:#e9f5ff;font-family:Inter,system-ui,sans-serif}.nyx-admin-panel{width:min(1000px,100%);min-height:calc(100vh - 48px);margin:auto;padding:24px;box-sizing:border-box;border:1px solid rgba(125,190,255,.18);border-radius:22px;background:linear-gradient(145deg,rgba(8,15,27,.96),rgba(2,6,12,.98));box-shadow:0 24px 80px rgba(0,0,0,.55)}header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:1px solid rgba(150,210,255,.1)}.kicker{font-size:9px;letter-spacing:3px;opacity:.45}.nyx-admin-panel h1,.nyx-admin-login h1{margin:7px 0 0;font-size:22px;letter-spacing:4px;font-weight:500}.plain,.tabs button,.row button,.actions button{border:1px solid rgba(150,210,255,.14);background:rgba(255,255,255,.035);color:#dff2ff;border-radius:7px;cursor:pointer;font-size:8px;letter-spacing:1px;padding:7px 9px}.tabs{display:flex;gap:7px;flex-wrap:wrap;margin:18px 0 12px}.tabs button{opacity:.58}.tabs button.active{opacity:1;background:rgba(90,185,255,.1);border-color:rgba(100,200,255,.32)}.tabs span{margin-left:7px;opacity:.5}.toolbar{display:flex;align-items:center;margin-bottom:12px}.toolbar>span{margin-left:auto;font-size:9px;letter-spacing:1.5px;opacity:.4}.add{border:1px solid rgba(110,210,255,.3);background:rgba(70,170,235,.1);color:#e8f8ff;border-radius:8px;padding:9px 13px;font-size:9px;letter-spacing:1.3px;cursor:pointer}.list{border:1px solid rgba(150,210,255,.09);border-radius:12px;overflow:hidden}.row{display:grid;grid-template-columns:30px minmax(0,1fr) auto auto auto;gap:7px;align-items:center;padding:8px 9px;border-bottom:1px solid rgba(150,210,255,.07)}.row:last-child{border:0}.row>b{font-size:9px;opacity:.3}.row>div{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.row button{font-size:7px;padding:6px 7px;opacity:.7}.row button:hover{opacity:1}.row .danger{color:#ffb7b7;border-color:rgba(255,100,100,.15)}.empty{text-align:center;padding:50px;font-size:10px;letter-spacing:3px;opacity:.3}.status{margin-top:12px;padding:9px 11px;border-radius:8px;background:rgba(70,170,235,.07);font-size:10px;color:#9edfff}.error,.err{color:#ffb5b5}.nyx-admin-login{width:min(380px,100%);margin:18vh auto 0;padding:28px;box-sizing:border-box;border:1px solid rgba(125,190,255,.18);border-radius:20px;background:rgba(5,11,20,.96);box-shadow:0 24px 80px rgba(0,0,0,.6)}.sub{margin:7px 0 22px;font-size:9px;letter-spacing:2px;opacity:.4}.nyx-admin-login input,.card input{width:100%;box-sizing:border-box;padding:11px 12px;margin-bottom:10px;border:1px solid rgba(150,210,255,.16);border-radius:8px;background:rgba(0,0,0,.3);color:#fff;outline:none}.nyx-admin-login>button{width:100%;padding:11px;border:1px solid rgba(110,210,255,.28);border-radius:8px;background:rgba(70,170,235,.1);color:#e8f8ff;letter-spacing:2px;font-size:9px}.err{font-size:10px}.dialog{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.58);backdrop-filter:blur(7px)}.card{width:min(470px,calc(100vw - 32px));padding:22px;box-sizing:border-box;border:1px solid rgba(125,190,255,.2);border-radius:16px;background:#050b14;box-shadow:0 25px 80px rgba(0,0,0,.7)}.card h2{font-size:12px;font-weight:400;margin:9px 0 16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.actions{display:flex;justify-content:flex-end;gap:8px}@media(max-width:650px){.nyx-admin-shell{padding:10px}.nyx-admin-panel{min-height:calc(100vh - 20px);padding:14px;border-radius:16px}.row{grid-template-columns:25px minmax(0,1fr) auto}.row button:nth-last-child(2){display:none}.row button{font-size:7px;padding:6px}.row>div{font-size:10px}}
`