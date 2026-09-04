const OWNER = 'nyxtryp'
const REPO = 'nyxtryp'
const API = `https://api.github.com/repos/${OWNER}/${REPO}`

const folders = {
  tracks: 'public/audio/tracks',
  radio: 'public/audio/radio',
  mixes: 'public/audio/mixes',
  photos: 'public/photos'
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

    const result = {}

    for (const [key, path] of Object.entries(folders)) {
      const response = await fetch(`${API}/contents/${path}?ref=main`, { headers })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(`GitHub ${response.status}: ${text}`)
      }

      const data = await response.json()
      result[key] = Array.isArray(data)
        ? data.filter(item => item.type === 'file').map(item => item.name)
        : []
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error('MEDIA API ERROR:', error)
    return res.status(500).json({ error: error?.message || 'Media API failed' })
  }
}
