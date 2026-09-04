import { useEffect, useMemo, useRef, useState } from 'react'

const TYPES = [
  { id: 'tracks', label: 'TRACKS', accept: 'audio/mpeg,audio/mp3', icon: '♪', kind: 'AUDIO' },
  { id: 'radio', label: 'RADIO', accept: 'audio/mpeg,audio/mp3', icon: '◉', kind: 'AUDIO' },
  { id: 'mixes', label: 'MIXES', accept: 'audio/mpeg,audio/mp3', icon: '◒', kind: 'AUDIO' },
  { id: 'photos', label: 'PHOTOS', accept: 'image/*', icon: '▧', kind: 'IMAGE' }
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

function preparePhoto(file) {
  const MAX_BYTES = 2.8 * 1024 * 1024
  const MAX_DIMENSION = 2400
  if (file.size <= MAX_BYTES) return Promise.resolve({ file, name: file.name })

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height))
      const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale))
      const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Не удалось подготовить изображение'))
      ctx.drawImage(img, 0, 0, width, height)

      const makeBlob = quality => new Promise((res, rej) => {
        canvas.toBlob(blob => blob ? res(blob) : rej(new Error('Не удалось сжать изображение')), 'image/jpeg', quality)
      })

      ;(async () => {
        try {
          let quality = 0.88
          let blob = await makeBlob(quality)
          while (blob.size > MAX_BYTES && quality > 0.55) {
            quality -= 0.07
            blob = await makeBlob(quality)
          }
          if (blob.size > MAX_BYTES) return reject(new Error(`«${file.name}» не удалось уменьшить до допустимого размера`))
          const base = prettyName(file.name).trim() || 'photo'
          resolve({ file: new File([blob], `${base}.jpg`, { type: 'image/jpeg' }), name: `${base}.jpg` })
        } catch (error) {
          reject(error)
        }
      })()
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Не удалось прочитать изображение «${file.name}»`))
    }
    img.src = url
  })
}

function fileMeta(name, type) {
  const ext = (extension(name).replace('.', '') || (type === 'photos' ? 'image' : 'audio')).toUpperCase()
  return ext
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
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('name')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [previewUrls, setPreviewUrls] = useState({})
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

    if (active !== 'photos') {
      const tooLarge = selected.find(f => f.size > 4 * 1024 * 1024)
      if (tooLarge) {
        setError(`«${tooLarge.name}» больше 4 МБ. Большие MP3 пока нельзя передать через текущий Vercel API.`)
        return
      }
    }

    setBusy(true)
    setStatus(selected.length > 1 ? `СОХРАНЕНИЕ 0/${selected.length}…` : 'ПОДГОТОВКА…')
    setError('')
    try {
      for (let i = 0; i < selected.length; i += 1) {
        const original = selected[i]
        const prepared = active === 'photos' ? await preparePhoto(original) : { file: original, name: original.name }
        const file = prepared.file
        const name = replaceName || prepared.name
        const content = await toBase64(file)
        setStatus(selected.length > 1 ? `СОХРАНЕНИЕ ${i + 1}/${selected.length}…` : 'СОХРАНЕНИЕ…')
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
    setConfirmDelete(null)
    setBusy(true)
    setError('')
    setStatus('УДАЛЕНИЕ…')
    try {
      await api('DELETE', { type: active, name })
      await load()
      setStatus('УДАЛЕНО')
    } catch (e) {
      setError(e.message || 'Ошибка удаления')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  const saveRename = async () => {
    if (!rename?.newName.trim()) return
    setBusy(true)
    setError('')
    setStatus('ПЕРЕИМЕНОВАНИЕ…')
    try {
      await api('PATCH', {
        type: active,
        oldName: rename.oldName,
        newName: `${rename.newName.trim()}${extension(rename.oldName)}`
      })
      setRename(null)
      await load()
      setStatus('ИМЯ ИЗМЕНЕНО')
    } catch (e) {
      setError(e.message || 'Ошибка переименования')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  const visibleFiles = useMemo(() => {
    const source = files[active] || []
    const filtered = query.trim()
      ? source.filter(name => name.toLowerCase().includes(query.trim().toLowerCase()))
      : source
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      if (sort === 'type') return fileMeta(a, active).localeCompare(fileMeta(b, active)) || a.localeCompare(b)
      return 0
    })
  }, [files, active, query, sort])

  useEffect(() => {
    if (active !== 'photos') return undefined
    const next = {}
    ;(files.photos || []).forEach(name => {
      next[name] = `/photos/${encodeURIComponent(name)}`
    })
    setPreviewUrls(next)
    return undefined
  }, [active, files.photos])

  if (!ok) return <div className="nyx-admin-shell"><style>{CSS}</style><form className="nyx-admin-login" onSubmit={login}><div className="brand-mark">NYX</div><div className="kicker">NYXTRYP / PRIVATE</div><h1>MEDIA CONTROL</h1><div className="sub">ADMIN ACCESS</div><input autoFocus type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="Admin key"/><button disabled={busy}>{busy ? 'CHECKING…' : 'ENTER'}</button>{status && <p className="status">{status}</p>}{error && <p className="err">{error}</p>}</form></div>

  const activeCount = files[active]?.length || 0

  return <div className="nyx-admin-shell"><style>{CSS}</style><main className="nyx-admin-panel">
    <header className="topbar">
      <div className="brand-block"><div className="brand-mark">NYX</div><div><div className="kicker">NYXTRYP / PRIVATE</div><h1>MEDIA CONTROL</h1><p>CONTENT MANAGEMENT</p></div></div>
      <button className="plain exit" disabled={busy} onClick={logout}>EXIT <span>↗</span></button>
    </header>

    <section className="overview">
      <div><div className="section-label">MEDIA LIBRARY</div><div className="headline">YOUR UNIVERSE, <span>ORGANIZED.</span></div></div>
      <div className="total"><strong>{Object.values(files).reduce((sum, list) => sum + (list?.length || 0), 0)}</strong><span>TOTAL FILES</span></div>
    </section>

    <nav className="tabs">{TYPES.map(t => <button key={t.id} className={active === t.id ? 'active' : ''} onClick={() => { setActive(t.id); setStatus(''); setError(''); setQuery(''); setSort('name') }}><i>{t.icon}</i><span>{t.label}</span><b>{files[t.id]?.length || 0}</b></button>)}</nav>

    <section className="toolbar">
      <button className="add" disabled={busy} onClick={() => chooseFile(null)}><span>＋</span>{active === 'photos' ? 'UPLOAD PHOTOS' : `ADD ${type.label.slice(0, -1)}`}</button>
      <div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={`SEARCH ${type.label.toLowerCase()}…`}/>{query && <button onClick={() => setQuery('')}>×</button>}</div>
      <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort files"><option value="name">NAME</option><option value="type">TYPE</option></select>
    </section>

    <input ref={input} hidden type="file" accept={type.accept} multiple={active === 'photos'} onChange={upload}/>

    <section className={`media-grid ${active === 'photos' ? 'photos-grid' : ''}`}>
      {visibleFiles.map((name, i) => <article className="media-card" key={name}>
        {active === 'photos' ? <button className="photo-thumb" onClick={() => setPhotoPreview(name)} title="Preview"><img src={previewUrls[name]} alt="" loading="lazy"/><span>VIEW</span></button> : <div className={`file-icon ${active}`}><span>{type.icon}</span><small>{fileMeta(name, active)}</small></div>}
        <div className="card-main"><div className="index">{String(i + 1).padStart(2, '0')}</div><div className="name" title={name}>{prettyName(name)}</div><div className="meta">{type.kind} · {fileMeta(name, active)}</div></div>
        <div className="card-menu">
          <button disabled={busy} onClick={() => setRename({ oldName: name, newName: prettyName(name) })}>RENAME</button>
          {active !== 'photos' && <button disabled={busy} onClick={() => chooseFile(name)}>REPLACE</button>}
          <button className="delete" disabled={busy} onClick={() => setConfirmDelete(name)}>DELETE</button>
        </div>
      </article>)}
      {!visibleFiles.length && <div className="empty"><div>◌</div><strong>{query ? 'NO MATCHES' : 'NO FILES'}</strong><span>{query ? 'Try another search.' : 'This section is empty.'}</span></div>}
    </section>

    <footer className="footer"><span>{query ? `${visibleFiles.length} OF ${activeCount}` : activeCount} {activeCount === 1 ? 'FILE' : 'FILES'}</span><span>GITHUB STORAGE · VERCEL DELIVERY</span></footer>
    {(status || error) && <div className={error ? 'status error' : 'status'}>{error || status}</div>}

    {rename && <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setRename(null) }}><div className="dialog"><div className="dialog-head"><div><div className="kicker">EDIT FILE</div><h2>RENAME</h2></div><button className="close" disabled={busy} onClick={() => setRename(null)}>×</button></div><div className="current-name">{rename.oldName}</div><label>NEW NAME<input autoFocus value={rename.newName} onChange={e => setRename({ ...rename, newName: e.target.value })}/></label><div className="actions"><button className="plain" disabled={busy} onClick={() => setRename(null)}>CANCEL</button><button className="add" disabled={busy} onClick={saveRename}>SAVE NAME</button></div></div></div>}

    {confirmDelete && <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setConfirmDelete(null) }}><div className="dialog compact"><div className="danger-symbol">!</div><div className="kicker">PERMANENT ACTION</div><h2>DELETE FILE?</h2><p>Are you sure you want to delete</p><strong title={confirmDelete}>{confirmDelete}</strong><div className="actions"><button className="plain" disabled={busy} onClick={() => setConfirmDelete(null)}>CANCEL</button><button className="delete-confirm" disabled={busy} onClick={() => remove(confirmDelete)}>DELETE</button></div></div></div>}

    {photoPreview && <div className="overlay photo-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setPhotoPreview(null) }}><div className="photo-dialog"><button className="close photo-close" onClick={() => setPhotoPreview(null)}>×</button><img src={previewUrls[photoPreview]} alt={photoPreview}/><div>{photoPreview}</div></div></div>}
  </main></div>
}

const CSS = `
*{box-sizing:border-box}.nyx-admin-shell{min-height:100vh;padding:22px;background:radial-gradient(circle at 50% -10%,rgba(67,150,220,.16),transparent 42%),radial-gradient(circle at 0% 100%,rgba(38,88,130,.08),transparent 34%),#02050a;color:#eaf6ff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.nyx-admin-panel{width:min(1180px,100%);min-height:calc(100vh - 44px);margin:auto;padding:26px;border:1px solid rgba(130,200,255,.14);border-radius:26px;background:linear-gradient(145deg,rgba(7,15,27,.98),rgba(2,6,12,.99));box-shadow:0 30px 100px rgba(0,0,0,.6)}.topbar{display:flex;justify-content:space-between;align-items:flex-start;padding:2px 2px 24px;border-bottom:1px solid rgba(150,210,255,.09)}.brand-block{display:flex;gap:13px;align-items:flex-start}.brand-mark{width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(110,210,255,.25);border-radius:9px;color:#aee5ff;font-size:9px;letter-spacing:1px;font-weight:700;background:rgba(70,170,235,.07);box-shadow:inset 0 0 18px rgba(70,170,235,.05)}.kicker,.section-label{font-size:8px;letter-spacing:3px;opacity:.42}.topbar h1{margin:5px 0 0;font-size:21px;letter-spacing:4px;font-weight:500}.topbar p{margin:5px 0 0;font-size:8px;letter-spacing:2px;opacity:.28}.plain,.tabs button,.card-menu button,.close{border:1px solid rgba(150,210,255,.13);background:rgba(255,255,255,.025);color:#dff3ff;border-radius:8px;cursor:pointer}.plain{padding:8px 11px;font-size:8px;letter-spacing:1.5px}.exit span{opacity:.4}.overview{display:flex;justify-content:space-between;align-items:end;padding:28px 2px 21px}.headline{margin-top:7px;font-size:26px;letter-spacing:1.8px;font-weight:300}.headline span{color:#78cbf8}.total{text-align:right}.total strong{display:block;font-size:26px;font-weight:300;letter-spacing:1px}.total span{font-size:7px;letter-spacing:2px;opacity:.35}.tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:15px}.tabs button{display:flex;align-items:center;gap:10px;padding:12px 13px;text-align:left;opacity:.48}.tabs button:hover{opacity:.78}.tabs button.active{opacity:1;border-color:rgba(100,205,255,.3);background:linear-gradient(135deg,rgba(70,170,235,.12),rgba(70,170,235,.035));box-shadow:inset 0 0 25px rgba(70,170,235,.025)}.tabs i{font-style:normal;font-size:16px;color:#8edbff}.tabs span{font-size:9px;letter-spacing:1.6px}.tabs b{margin-left:auto;font-size:9px;font-weight:400;opacity:.48}.toolbar{display:flex;gap:9px;align-items:center;margin-bottom:13px}.add{border:1px solid rgba(110,210,255,.3);background:linear-gradient(135deg,rgba(70,180,240,.14),rgba(70,180,240,.06));color:#eaf9ff;border-radius:9px;padding:10px 14px;font-size:8px;letter-spacing:1.4px;cursor:pointer;white-space:nowrap}.add span{font-size:14px;vertical-align:-1px;margin-right:5px;opacity:.8}.search{height:35px;display:flex;align-items:center;gap:7px;flex:1;max-width:430px;margin-left:auto;border:1px solid rgba(150,210,255,.11);border-radius:9px;background:rgba(0,0,0,.18);padding:0 10px}.search>span{font-size:17px;opacity:.35}.search input{width:100%;border:0;outline:0;background:transparent;color:#eaf6ff;font-size:9px;letter-spacing:1px}.search input::placeholder{color:#b8d3e5;opacity:.25}.search button{border:0;background:transparent;color:#bfeaff;font-size:16px;cursor:pointer;opacity:.5}.toolbar select{height:35px;padding:0 10px;border:1px solid rgba(150,210,255,.11);border-radius:9px;background:#07101a;color:#bfe7fa;font-size:8px;letter-spacing:1px;outline:0}.media-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;max-height:calc(100vh - 355px);min-height:180px;overflow-y:auto;overflow-x:hidden;padding:2px 7px 2px 1px;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:rgba(125,205,255,.38) rgba(255,255,255,.04)}.media-grid::-webkit-scrollbar{width:8px}.media-grid::-webkit-scrollbar-track{background:rgba(255,255,255,.035);border-radius:8px}.media-grid::-webkit-scrollbar-thumb{background:rgba(125,205,255,.38);border-radius:8px;border:2px solid transparent;background-clip:padding-box}.media-grid::-webkit-scrollbar-thumb:hover{background:rgba(145,220,255,.62);background-clip:padding-box}.media-card{min-width:0;display:flex;align-items:center;gap:12px;padding:10px;border:1px solid rgba(150,210,255,.09);border-radius:12px;background:linear-gradient(135deg,rgba(255,255,255,.026),rgba(255,255,255,.008));transition:.18s ease}.media-card:hover{border-color:rgba(120,205,255,.2);background:linear-gradient(135deg,rgba(80,170,230,.065),rgba(255,255,255,.012));transform:translateY(-1px)}.file-icon{width:48px;height:48px;flex:0 0 48px;display:grid;place-items:center;border:1px solid rgba(120,205,255,.13);border-radius:10px;background:rgba(50,140,195,.05);position:relative}.file-icon span{font-size:21px;color:#81d2fb;opacity:.75}.file-icon small{position:absolute;bottom:4px;font-size:6px;letter-spacing:1px;opacity:.3}.card-main{min-width:0;flex:1}.index{font-size:7px;letter-spacing:1px;opacity:.25;margin-bottom:4px}.name{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e6f4fc}.meta{margin-top:5px;font-size:7px;letter-spacing:1.1px;opacity:.27}.card-menu{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.card-menu button{padding:6px 7px;font-size:6px;letter-spacing:.9px;opacity:.58}.card-menu button:hover{opacity:1}.card-menu .delete{color:#ffb9b9;border-color:rgba(255,100,100,.12)}.photo-thumb{position:relative;width:76px;height:60px;flex:0 0 76px;border:0;border-radius:9px;overflow:hidden;padding:0;background:#050b12;cursor:pointer}.photo-thumb img{width:100%;height:100%;object-fit:cover;display:block;opacity:.78;transition:.2s}.photo-thumb span{position:absolute;inset:auto 0 0;padding:5px;font-size:6px;letter-spacing:1.5px;background:linear-gradient(transparent,rgba(0,0,0,.8));opacity:0;transition:.2s}.photo-thumb:hover img{opacity:.55;transform:scale(1.04)}.photo-thumb:hover span{opacity:1}.photos-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.photos-grid .media-card{align-items:stretch}.photos-grid .card-main{padding-top:3px}.empty{grid-column:1/-1;min-height:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px dashed rgba(150,210,255,.09);border-radius:13px;color:#dff3ff}.empty div{font-size:28px;opacity:.16;margin-bottom:8px}.empty strong{font-size:9px;letter-spacing:3px;font-weight:400;opacity:.4}.empty span{margin-top:7px;font-size:8px;opacity:.22}.footer{display:flex;justify-content:space-between;padding:13px 2px 0;font-size:7px;letter-spacing:1.5px;opacity:.27}.status{margin-top:12px;padding:10px 12px;border-radius:8px;background:rgba(70,170,235,.07);font-size:9px;color:#9edfff}.error,.err{color:#ffb5b5}.nyx-admin-login{width:min(390px,100%);margin:16vh auto 0;padding:31px;border:1px solid rgba(125,190,255,.18);border-radius:21px;background:rgba(5,11,20,.97);box-shadow:0 30px 100px rgba(0,0,0,.65)}.nyx-admin-login .brand-mark{margin-bottom:17px}.nyx-admin-login h1{margin:7px 0 0;font-size:22px;letter-spacing:4px;font-weight:500}.sub{margin:7px 0 22px;font-size:8px;letter-spacing:2px;opacity:.35}.nyx-admin-login input,.dialog input{width:100%;padding:11px 12px;margin-bottom:10px;border:1px solid rgba(150,210,255,.14);border-radius:9px;background:rgba(0,0,0,.3);color:#fff;outline:none;font-size:12px}.nyx-admin-login>button{width:100%;padding:11px;border:1px solid rgba(110,210,255,.28);border-radius:9px;background:rgba(70,170,235,.1);color:#e8f8ff;letter-spacing:2px;font-size:9px;cursor:pointer}.overlay{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.66);backdrop-filter:blur(9px)}.dialog{width:min(470px,100%);padding:22px;border:1px solid rgba(125,190,255,.2);border-radius:17px;background:#050b14;box-shadow:0 30px 100px rgba(0,0,0,.8)}.dialog.compact{width:min(410px,100%);text-align:center}.dialog-head{display:flex;justify-content:space-between;align-items:flex-start}.dialog h2{margin:5px 0 16px;font-size:18px;font-weight:400;letter-spacing:2px}.close{width:30px;height:30px;font-size:18px;line-height:1}.current-name{margin-bottom:16px;padding:9px 10px;border-radius:7px;background:rgba(255,255,255,.025);font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.5}.dialog label{display:block;font-size:7px;letter-spacing:1.5px;opacity:.45}.dialog input{margin:7px 0 0}.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.danger-symbol{width:34px;height:34px;margin:0 auto 13px;display:grid;place-items:center;border:1px solid rgba(255,100,100,.25);border-radius:50%;color:#ffadad}.dialog.compact h2{margin-bottom:7px}.dialog.compact p{font-size:9px;opacity:.4;margin:0 0 5px}.dialog.compact>strong{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:400;color:#eaf6ff}.delete-confirm{border:1px solid rgba(255,100,100,.25);background:rgba(255,70,70,.08);color:#ffb6b6;border-radius:8px;padding:8px 12px;font-size:8px;letter-spacing:1.2px;cursor:pointer}.photo-overlay{padding:24px}.photo-dialog{position:relative;max-width:min(1000px,95vw);max-height:92vh;padding:8px;border:1px solid rgba(150,210,255,.14);border-radius:15px;background:#03070d;box-shadow:0 30px 100px rgba(0,0,0,.8);text-align:center}.photo-dialog img{display:block;max-width:100%;max-height:78vh;object-fit:contain;border-radius:9px}.photo-dialog>div{padding:9px 4px 3px;font-size:8px;letter-spacing:1px;opacity:.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.photo-close{position:absolute;right:-10px;top:-10px;z-index:2;background:#07111b}
@media(max-width:900px){.media-grid{grid-template-columns:1fr}.photos-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.tabs{grid-template-columns:repeat(2,1fr)}}
@media(max-width:620px){.nyx-admin-shell{padding:9px}.nyx-admin-panel{min-height:calc(100vh - 18px);padding:14px;border-radius:17px}.topbar{padding-bottom:18px}.topbar h1{font-size:17px;letter-spacing:3px}.overview{padding:21px 2px 17px}.headline{font-size:18px;line-height:1.25}.total strong{font-size:21px}.tabs{gap:6px}.tabs button{padding:10px}.toolbar{flex-wrap:wrap}.add{order:1}.search{order:3;flex-basis:100%;max-width:none;margin-left:0}.toolbar select{order:2;margin-left:auto}.photos-grid{grid-template-columns:1fr}.media-grid{max-height:calc(100vh - 335px);min-height:160px;padding-right:6px}.media-card{padding:9px;gap:9px}.file-icon{width:42px;height:42px;flex-basis:42px}.card-menu{gap:4px}.card-menu button{padding:6px 5px;font-size:5.5px}.photo-thumb{width:62px;height:52px;flex-basis:62px}.footer{gap:10px;flex-direction:column}.footer span:last-child{text-align:right}.nyx-admin-login{margin-top:12vh;padding:24px}}
`