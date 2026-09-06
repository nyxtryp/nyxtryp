import { createHmac, timingSafeEqual } from 'node:crypto'
import { handleUpload } from '@vercel/blob/client'

const COOKIE = 'nyxtryp_admin'
const SESSION_TTL = 86400

function safeName(name) {
  const value = String(name || '').trim()
  if (!value || value === '.' || value === '..') return null
  if (value.length > 180) return null
  if (value.includes('/') || value.includes('\\') || value.includes('..')) return null
  return value
}

function getCookie(req, name) {
  const cookieHeader = String(req?.headers?.cookie || '')
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  if (!match) return ''
  try { return decodeURIComponent(match[1]) } catch { return '' }
}

function signSession(timestamp, nonce) {
  const secret = process.env.GUESTBOOK_ADMIN_KEY
  return createHmac('sha256', secret).update(`${timestamp}.${nonce}`).digest('base64url')
}

function checkAdmin(req) {
  const secret = process.env.GUESTBOOK_ADMIN_KEY
  if (!secret) return false

  const value = getCookie(req, COOKIE)
  const parts = value.split('.')
  if (parts.length !== 3) return false

  const [timestamp, nonce, signature] = parts
  const issued = Number(timestamp)
  if (!Number.isSafeInteger(issued)) return false

  const now = Math.floor(Date.now() / 1000)
  if (issued > now + 60 || now - issued > SESSION_TTL) return false

  const expected = signSession(timestamp, nonce)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (!checkAdmin(req)) return res.status(403).json({ error: 'Forbidden.' })

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
