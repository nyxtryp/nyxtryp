import { useEffect, useMemo, useRef, useState } from 'react'

const TYPES = [
  { id: 'tracks', label: 'TRACKS', accept: 'audio/mpeg,audio/mp3', icon: '♪', kind: 'AUDIO' },
  { id: 'radio', label: 'RADIO', accept: 'audio/mpeg,audio/mp3', icon: '◉', kind: 'AUDIO' },
  { id: 'mixes', label: 'MIXES', accept: 'audio/mpeg,audio/mp3', icon: '◒', kind: 'AUDIO' },
  { id: 'photos', label: 'PHOTOS', accept: 'image/*', icon: '▧', kind: 'IMAGE' }
]

const prettyName = name => name.replace(/\.[^.]+$/, '')
const extension = name => (name.match(/\.[^.]+$/) || [''])[0]

async function toBase64(file) {
  let objectUrl = null
  try {
    objectUrl = URL.createObjectURL(file)
    const response = await fetch(objectUrl)
    if (!response.ok) throw new Error(`Не удалось прочитать файл (${response.status})`)
    const buffer = await response.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunkSize = 0x8000
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)))
    }
    return btoa(binary)
  } catch (fetchError) {
    try {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
        reader.onerror = () => reject(reader.error || fetchError || new Error('File read failed'))
        reader.onabort = () => reject(new Error('Чтение файла отменено'))
        reader.readAsArrayBuffer(file)
      })
    } catch {
      throw fetchError
    }
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}

async function preparePhoto(file) {
  const MAX_BYTES = 2.8 * 1024 * 1024
  const MAX_DIMENSION = 2400
  if (file.size <= MAX_BYTES) return { file, name: file.name }

  let bitmap = null
  let objectUrl = null
  try {
    if ('createImageBitmap' in window) {
      bitmap = await createImageBitmap(file)
    } else {
      objectUrl = URL.createObjectURL(file)
      bitmap = await new Promise((resolve, reject) => {
        const img = new Image()
        const timer = setTimeout(() => reject(new Error('Изображение слишком долго готовится')), 8000)
        img.onload = () => { clearTimeout(timer); resolve(img) }
        img.onerror = () => { clearTimeout(timer); reject(new Error(`Не удалось прочитать изображение «${file.name}»`)) }
        img.src = objectUrl
      })
    }

    const sourceWidth = bitmap.width || bitmap.naturalWidth
    const sourceHeight = bitmap.height || bitmap.naturalHeight
    if (!sourceWidth || !sourceHeight) throw new Error(`Не удалось определить размер изображения «${file.name}»`)

    const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight))
    const width = Math.max(1, Math.round(sourceWidth * scale))
    const height = Math.max(1, Math.round(sourceHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Не удалось подготовить изображение')
    ctx.drawImage(bitmap, 0, 0, width, height)

    if (bitmap.close) bitmap.close()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = null

    const makeBlob = quality => new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось сжать изображение')), 'image/jpeg', quality)
    })

    let quality = 0.88
    let blob = await makeBlob(quality)
    while (blob.size > MAX_BYTES && quality > 0.55) {
      quality -= 0.07
      blob = await makeBlob(quality)
    }
    if (blob.size > MAX_BYTES) throw new Error(`«${file.name}» не удалось уменьшить до допустимого размера`)

    const base = prettyName(file.name).trim() || 'photo'
    return { file: new File([blob], `${base}.jpg`, { type: 'image/jpeg' }), name: `${base}.jpg` }
  } catch (error) {
    if (bitmap?.close) bitmap.close()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    throw error
  }
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
  const [progress, setProgress] = useState(null)
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
    setStatus('ВЫБЕРИТЕ ФАЙЛ…')
    setError('')
    setProgress(null)
    if (input.current) input.current.value = ''
    requestAnimationFrame(() => input.current?.click())
  }

  const upload = async e => {
    const inputElement = e.currentTarget
    const selected = Array.from(inputElement.files || [])
    if (!selected.length) {
      setStatus('ФАЙЛ НЕ ВЫБРАН')
      return
    }

    if (active !== 'photos') {
      const tooLarge = selected.find(f => f.size > 4 * 1024 * 1024)
      if (tooLarge) {
        setError(`«${tooLarge.name}» больше 4 МБ. Большие MP3 пока нельзя передать через текущий Vercel API.`)
        setStatus('ОШИБКА ПРОВЕРКИ')
        return
      }
    }

    setBusy(true)
    setError('')
    setProgress({ total: selected.length, current: 0, step: 'prepare', name: selected[0].name })
    setStatus('1/4 · ПОДГОТОВКА')
    try {
      for (let i = 0; i < selected.length; i += 1) {
        const original = selected[i]
        setProgress({ total: selected.length, current: i + 1, step: 'prepare', name: original.name })
        setStatus(`${i + 1}/${selected.length} · ПОДГОТОВКА`)
        const prepared = active === 'photos' ? await preparePhoto(original) : { file: original, name: original.name }
        const file = prepared.file
        const name = replaceName || prepared.name

        setProgress({ total: selected.length, current: i + 1, step: 'encode', name })
        setStatus(`${i + 1}/${selected.length} · ЧТЕНИЕ ФАЙЛА`)
        const content = await toBase64(file)

        setProgress({ total: selected.length, current: i + 1, step: 'send', name })
        setStatus(`${i + 1}/${selected.length} · ОТПРАВКА В GITHUB`)
        await api('POST', { type: active, name, content })

        setProgress({ total: selected.length, current: i + 1, step: 'done', name })
        setStatus(`${i + 1}/${selected.length} · СОХРАНЕНО`)
      }
      setReplaceName(null)
      setProgress({ total: selected.length, current: selected.length, step: 'done', name: selected[selected.length - 1].name })
      await load()
      setStatus(selected.length > 1 ? `ГОТОВО · СОХРАНЕНО ${selected.length}` : 'ГОТОВО · ФАЙЛ СОХРАНЁН')
    } catch (e) {
      setError(e.message || 'Ошибка сохранения')
      setStatus('ОШИБКА ЗАГРУЗКИ')
    } finally {
      setBusy(false)
      inputElement.value = ''
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