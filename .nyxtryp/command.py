from pathlib import Path
import json
import re

ROOT = Path('.')

# package.json: add Vercel Blob SDK without changing the rest of the package manifest.
p = ROOT / 'package.json'
data = json.loads(p.read_text())
data.setdefault('dependencies', {})['@vercel/blob'] = 'latest'
p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

# Direct browser-to-Blob upload token endpoint. The admin key never reaches the Blob store itself.
(ROOT / 'api/upload.js').write_text(r'''import { handleUpload } from '@vercel/blob/client'

function safeName(name) {
  const value = String(name || '').trim()
  if (!value || value === '.' || value === '..') return null
  if (value.includes('/') || value.includes('\\') || value.includes('..')) return null
  return value
}

function checkAdmin(adminKey) {
  const expected = process.env.GUESTBOOK_ADMIN_KEY
  return Boolean(expected && String(adminKey || '') === expected)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})

    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload = {}
        try { payload = JSON.parse(clientPayload || '{}') } catch { throw new Error('Invalid upload payload.') }

        const type = String(payload.type || '')
        const name = safeName(payload.name)
        if (!['tracks', 'radio', 'mixes'].includes(type) || !name) throw new Error('Invalid audio upload target.')
        if (!checkAdmin(payload.adminKey)) throw new Error('Forbidden.')

        const expectedPath = `${type}/${name}`
        if (pathname !== expectedPath) throw new Error('Invalid upload pathname.')

        return {
          addRandomSuffix: false,
          allowOverwrite: true
        }
      },
      onUploadCompleted: async () => {}
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error('Blob upload API error:', error)
    return res.status(400).json({ error: error?.message || 'Upload failed.' })
  }
}
''')

# Admin API: audio lives in Blob; photos remain exactly on GitHub.
(ROOT / 'api/admin.js').write_text(r'''import { list, del, copy } from '@vercel/blob'

const OWNER = 'nyxtryp'
const REPO = 'nyxtryp'
const API = `https://api.github.com/repos/${OWNER}/${REPO}`

const folders = {
  tracks: 'public/audio/tracks',
  radio: 'public/audio/radio',
  mixes: 'public/audio/mixes',
  photos: 'public/photos'
}

const audioTypes = new Set(['tracks', 'radio', 'mixes'])

function json(res, status, data) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').send(JSON.stringify(data))
}

async function github(path, options = {}) {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN is not configured')
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  })
  const text = await response.text()
  let data
  try { data = JSON.parse(text) } catch { data = { message: text } }
  if (!response.ok) { const error = new Error(data.message || 'GitHub request failed'); error.status = response.status; throw error }
  return data
}

function checkAdmin(body) {
  const adminKey = process.env.GUESTBOOK_ADMIN_KEY
  return Boolean(adminKey && String(body?.adminKey || '') === adminKey)
}

function safeName(name) {
  const value = String(name || '').trim()
  if (!value || value === '.' || value === '..') return null
  if (value.includes('/') || value.includes('\\') || value.includes('..')) return null
  return value
}

async function listFiles(folder) {
  const data = await github(`/contents/${folder}?ref=main`)
  if (!Array.isArray(data)) return []
  return data.filter(item => item.type === 'file').map(item => item.name).sort((a, b) => a.localeCompare(b))
}

async function listAudio(type) {
  const result = await list({ prefix: `${type}/`, limit: 1000 })
  return (result.blobs || [])
    .filter(blob => blob.pathname.startsWith(`${type}/`))
    .map(blob => ({ name: blob.pathname.slice(type.length + 1), url: blob.url }))
    .filter(item => safeName(item.name))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function findBlob(type, name) {
  const target = `${type}/${name}`
  const result = await list({ prefix: `${type}/`, limit: 1000 })
  return (result.blobs || []).find(blob => blob.pathname === target) || null
}

async function githubRename(type, oldName, newName) {
  const folder = folders[type]
  const oldPath = `${folder}/${oldName}`
  const newPath = `${folder}/${newName}`
  const oldEncoded = encodeURIComponent(oldPath).replace(/%2F/g, '/')
  const newEncoded = encodeURIComponent(newPath).replace(/%2F/g, '/')
  const file = await github(`/contents/${oldEncoded}?ref=main`)
  await github(`/contents/${newEncoded}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `admin: rename ${type}/${oldName} to ${newName}`, content: file.content.replace(/\n/g, ''), branch: 'main' })
  })
  await github(`/contents/${oldEncoded}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `admin: remove old name ${type}/${oldName}`, sha: file.sha, branch: 'main' })
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    if (req.method === 'GET') {
      const result = { tracks: [], radio: [], mixes: [], photos: [] }
      for (const type of audioTypes) {
        const [githubFiles, blobFiles] = await Promise.all([
          listFiles(folders[type]),
          listAudio(type)
        ])
        const blobNames = new Set(blobFiles.map(item => item.name))
        result[type] = [...new Set([...githubFiles, ...blobFiles.map(item => item.name)])]
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        result[type] = result[type].filter(name => !blobNames.has(name) || blobFiles.some(item => item.name === name))
      }
      result.photos = await listFiles(folders.photos)
      return json(res, 200, result)
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    if (!checkAdmin(body)) return json(res, 403, { error: 'Forbidden.' })
    if (req.method === 'POST' && body.action === 'auth') return json(res, 200, { ok: true })

    if (req.method === 'POST') {
      if (audioTypes.has(String(body.type || ''))) {
        return json(res, 400, { error: 'Audio files are uploaded directly to storage.' })
      }
      const type = String(body.type || '')
      const name = safeName(body.name)
      const content = String(body.content || '')
      if (!folders[type] || !name || !content) return json(res, 400, { error: 'Type, name and content are required.' })
      if (!/^[A-Za-z0-9+/=\s]+$/.test(content)) return json(res, 400, { error: 'Invalid base64 content.' })
      const folder = folders[type]
      const filePath = `${folder}/${name}`
      const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, '/')
      let sha
      try {
        const existing = await github(`/contents/${encodedPath}?ref=main`)
        sha = existing.sha
      } catch (error) {
        if (error.status !== 404) throw error
      }
      const payload = { message: `admin: ${sha ? 'replace' : 'add'} ${type}/${name}`, content: content.replace(/\s/g, ''), branch: 'main' }
      if (sha) payload.sha = sha
      await github(`/contents/${encodedPath}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      return json(res, 200, { ok: true, action: sha ? 'replaced' : 'added', type, name })
    }

    if (req.method === 'PATCH') {
      const type = String(body.type || '')
      const oldName = safeName(body.oldName)
      const newName = safeName(body.newName)
      if (!folders[type] || !oldName || !newName) return json(res, 400, { error: 'Type, oldName and newName are required.' })
      if (oldName === newName) return json(res, 400, { error: 'New name must be different.' })

      if (audioTypes.has(type)) {
        const blob = await findBlob(type, oldName)
        if (blob) {
          await copy(blob.url, `${type}/${newName}`, { access: 'public', allowOverwrite: true })
          await del(blob.url)
          return json(res, 200, { ok: true, action: 'renamed', type, oldName, newName })
        }
      }

      await githubRename(type, oldName, newName)
      return json(res, 200, { ok: true, action: 'renamed', type, oldName, newName })
    }

    if (req.method === 'DELETE') {
      const type = String(body.type || '')
      const name = safeName(body.name)
      if (!folders[type] || !name) return json(res, 400, { error: 'Invalid file.' })

      if (audioTypes.has(type)) {
        const blob = await findBlob(type, name)
        if (blob) {
          await del(blob.url)
          return json(res, 200, { ok: true })
        }
      }

      const filePath = `${folders[type]}/${name}`
      const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, '/')
      const file = await github(`/contents/${encodedPath}?ref=main`)
      await github(`/contents/${encodedPath}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `admin: delete ${type}/${name}`, sha: file.sha, branch: 'main' }) })
      return json(res, 200, { ok: true })
    }

    return json(res, 501, { error: 'Admin operation is not implemented yet.' })
  } catch (error) {
    console.error('Admin API error:', error)
    return json(res, error.status || 500, { error: error.message || 'Admin service error.' })
  }
}
''')

# Media API: keep GitHub-backed photos and legacy audio, but expose Blob URLs for uploaded audio.
(ROOT / 'api/media.js').write_text(r'''import { list } from '@vercel/blob'

const OWNER = 'nyxtryp'
const REPO = 'nyxtryp'
const API = `https://api.github.com/repos/${OWNER}/${REPO}`

const folders = {
  tracks: 'public/audio/tracks',
  radio: 'public/audio/radio',
  mixes: 'public/audio/mixes',
  photos: 'public/photos'
}

const audioTypes = ['tracks', 'radio', 'mixes']

async function githubFiles(path, headers) {
  const response = await fetch(`${API}/contents/${path}?ref=main`, { headers })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GitHub ${response.status}: ${text}`)
  }
  const data = await response.json()
  return Array.isArray(data) ? data.filter(item => item.type === 'file').map(item => item.name) : []
}

async function blobFiles(type) {
  const result = await list({ prefix: `${type}/`, limit: 1000 })
  return (result.blobs || []).map(blob => ({
    name: blob.pathname.slice(type.length + 1),
    url: blob.url
  }))
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error('GITHUB_TOKEN is not configured')
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }

    const result = { tracks: [], radio: [], mixes: [], photos: [], trackUrls: {}, radioUrls: {}, mixUrls: {} }

    for (const type of audioTypes) {
      const [legacy, blobs] = await Promise.all([githubFiles(folders[type], headers), blobFiles(type)])
      const urls = result[`${type === 'tracks' ? 'track' : type === 'radio' ? 'radio' : 'mix' }Urls`]
      for (const blob of blobs) urls[blob.name] = blob.url
      result[type] = [...new Set([...legacy, ...blobs.map(blob => blob.name)])]
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    }

    result.photos = await githubFiles(folders.photos, headers)
    return res.status(200).json(result)
  } catch (error) {
    console.error('MEDIA API ERROR:', error)
    return res.status(500).json({ error: error?.message || 'Media API failed' })
  }
}
''')

# AdminPanel: audio uploads go directly from the browser to Blob; photos keep the existing GitHub path and UI.
p = ROOT / 'src/components/AdminPanel.jsx'
s = p.read_text()
s = s.replace("import { useEffect, useMemo, useRef, useState } from 'react'", "import { useEffect, useMemo, useRef, useState } from 'react'\nimport { upload as uploadBlob } from '@vercel/blob/client'")
s = s.replace("accept: 'audio/mpeg,audio/mp3'", "accept: 'audio/*'", 3)
start = s.index('async function toBase64(file) {')
end = s.index('\nasync function preparePhoto(file) {', start)
s = s[:start] + s[end + 1:]
old = '''    if (active !== 'photos') {
      const tooLarge = selected.find(f => f.size > 4 * 1024 * 1024)
      if (tooLarge) {
        setError(`«${tooLarge.name}» больше 4 МБ. Большие MP3 пока нельзя передать через текущий Vercel API.`)
        setStatus('ОШИБКА ПРОВЕРКИ')
        return
      }
    }

'''
s = s.replace(old, '')
s = s.replace("    setProgress({ total: selected.length, current: 0, step: 'prepare', name: selected[0].name })\n    setStatus('1/4 · ПОДГОТОВКА')", "    setProgress({ total: selected.length, current: 0, step: 'prepare', name: selected[0].name })\n    setStatus('1/4 · ПОДГОТОВКА')")
old_block = '''        const prepared = active === 'photos' ? await preparePhoto(original) : { file: original, name: original.name }
        const file = prepared.file
        const name = replaceName || prepared.name

        setProgress({ total: selected.length, current: i + 1, step: 'encode', name })
        setStatus(`${i + 1}/${selected.length} · ЧТЕНИЕ ФАЙЛА`)
        const content = await toBase64(file)

        setProgress({ total: selected.length, current: i + 1, step: 'send', name })
        setStatus(`${i + 1}/${selected.length} · ОТПРАВКА В GITHUB`)
        await api('POST', { type: active, name, content })
'''
new_block = '''        if (active !== 'photos') {
          const name = replaceName || original.name
          setProgress({ total: selected.length, current: i + 1, step: 'send', name })
          setStatus(`${i + 1}/${selected.length} · ОТПРАВКА В STORAGE`)
          await uploadBlob(`${active}/${name}`, original, {
            access: 'public',
            handleUploadUrl: '/api/upload',
            multipart: true,
            clientPayload: JSON.stringify({ adminKey: key, type: active, name }),
            onUploadProgress: ({ percentage }) => {
              setProgress({ total: selected.length, current: i + 1, step: 'send', name, percentage: Math.round(percentage) })
              setStatus(`${i + 1}/${selected.length} · ЗАГРУЗКА ${Math.round(percentage)}%`)
            }
          })
          setProgress({ total: selected.length, current: i + 1, step: 'done', name })
          setStatus(`${i + 1}/${selected.length} · СОХРАНЕНО`)
          continue
        }

        const prepared = await preparePhoto(original)
        const file = prepared.file
        const name = replaceName || prepared.name

        setProgress({ total: selected.length, current: i + 1, step: 'encode', name })
        setStatus(`${i + 1}/${selected.length} · ЧТЕНИЕ ФАЙЛА`)
        const content = await (async fileToEncode => {
          const buffer = await fileToEncode.arrayBuffer()
          const bytes = new Uint8Array(buffer)
          let binary = ''
          const chunkSize = 0x8000
          for (let offset = 0; offset < bytes.length; offset += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)))
          }
          return btoa(binary)
        })(file)

        setProgress({ total: selected.length, current: i + 1, step: 'send', name })
        setStatus(`${i + 1}/${selected.length} · ОТПРАВКА В GITHUB`)
        await api('POST', { type: active, name, content })
'''
if old_block not in s:
    raise SystemExit('AdminPanel upload block not found')
s = s.replace(old_block, new_block, 1)
p.write_text(s)

# Players: Blob URLs are preferred; legacy GitHub/static audio remains the fallback.
for filename, collection, urlkey, fallback in [
    ('src/components/TracksPlayer.jsx', 'tracks', 'trackUrls', '/audio/tracks/'),
    ('src/components/RadioPlayer.jsx', 'radio', 'radioUrls', '/audio/radio/'),
    ('src/components/MixesPlayer.jsx', 'mixes', 'mixUrls', '/audio/mixes/')
]:
    p = ROOT / filename
    s = p.read_text()
    pattern = rf"file: `/audio/{collection}/\$\{{encodeURIComponent\(name\)\}}`"
    replacement = rf"file: data.{urlkey}?.[name] || `{fallback}${{encodeURIComponent(name)}}`"
    s, n = re.subn(pattern, replacement, s, count=1)
    if n != 1:
        raise SystemExit(f'{filename}: dynamic media mapping not found')
    p.write_text(s)

# Restore the command script itself so this workflow remains a one-shot edit and the project helper is untouched.
restore = '''from pathlib import Path

p = Path("src/components/TracksPlayer.jsx")
s = p.read_text()

# Remove temporary test text if it ever reappears.
s = s.replace('<div className="nyxtryp-auto-test">ПРИВЕТ</div>', '')
s = s.replace('ПРИВЕТ', '')

# Current layout: move the existing L/R VU windows above the existing bar spectrum.
canvas_marker = '          <canvas ref={canvasRef} className="tracks-visualizer" width={1200} height={240}/>'
vu_marker = '          <div className="nyx-vu"><div className="nyx-meter"><Meter channel="L" value={leftVU}/></div><div className="nyx-meter"><Meter channel="R" value={rightVU}/></div></div>'

if canvas_marker not in s:
    raise SystemExit("tracks-visualizer not found")
if vu_marker not in s:
    raise SystemExit("nyx-vu not found")

# Idempotent reorder: VU first, spectrum second.
old = canvas_marker + '\\n' + vu_marker
new = vu_marker + '\\n' + canvas_marker
if old in s:
    s = s.replace(old, new, 1)
else:
    # If already in the requested order, leave the file unchanged.
    if new not in s:
        raise SystemExit("VU/spectrum layout pattern not found")

p.write_text(s)
print("NYXTRYP: moved L/R VU above spectrum")
'''
p = ROOT / '.nyxtryp/command.py'
p.write_text(restore)
print('NYXTRYP: audio uploads moved to direct Vercel Blob storage')
