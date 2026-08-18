import { useEffect, useRef, useState } from "react"

const TRACKS = [
  "After Midnight","Awaken The Machine","Beyond Reality","Beyond The Signal","Crystal Memory","Digital Paradise","Echoes Of Tomorrow","Electric Dreams","Electric Soul","Final Horizon","Future Is Calling","Gravity Of Light","Hidden Dimension","Higher State","Infinite Desire","Infinite Motion","Into The Unknown","Lost In Frequency","Neon Awakening","Night Protocol","Parallel Hearts","Silent Velocity","Synthetic Emotion","The Last Transmission","Zero Gravity"
].map(title => ({ title: `${title} — Nyxtryp`, file: `/audio/tracks/${title} — Nyxtryp.mp3` }))

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const formatTime = value => {
  if (!Number.isFinite(value) || value < 0) return "0:00"
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`
}

function Meter({ channel, value }) {
  // Keep the original #3 scale geometry. The physical scale is -30..+10 VU.
  // The incoming value is already calibrated VU, independent from the volume slider.
  // Piecewise mapping follows the existing printed scale: compressed below 0,
  // expanded above 0. The SVG artwork itself is untouched.
  const scale = [
    [-30, -7.24],
    [-20, 1.04],
    [-10, 9.53],
    [-7, 18.90],
    [-5, 28.35],
    [-3, 38.11],
    [-1, 46.89],
    [0, 52.23],
    [3, 63.81],
    [5, 76.40],
    [10, 81.69]
  ]
  const toAngle = v => {
    const x = clamp(v, -30, 10)
    for (let i = 1; i < scale.length; i++) {
      const [v2, a2] = scale[i]
      const [v1, a1] = scale[i - 1]
      if (x <= v2) {
        const t = (x - v1) / (v2 - v1)
        return a1 + (a2 - a1) * t
      }
    }
    return scale[scale.length - 1][1]
  }
  const angle = toAngle(value)
  const suffix = channel.toLowerCase()
  return (
    <svg className="nyx-meter-svg" viewBox="0 0 1080 600" role="img" aria-label={`${channel} VU meter`}>
      <defs>
        <filter id={`shadow-${suffix}`}>
          <feDropShadow dx="3" dy="3" stdDeviation="8" floodOpacity=".5" />
        </filter>
        <radialGradient id={`meterBlue-${suffix}`} cx="50%" cy="55%" r="72%">
          <stop offset="0%" stopColor="#5edbff" />
          <stop offset="42%" stopColor="#159fe8" />
          <stop offset="78%" stopColor="#0875c4" />
          <stop offset="100%" stopColor="#043d73" />
        </radialGradient>
        <filter id={`blueGlow-${suffix}`} x="-20%" y="-30%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="9" result="blur" />
          <feFlood floodColor="#38cfff" floodOpacity=".72" result="glowColor" />
          <feComposite in="glowColor" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="0" y="0" width="1077" height="598" fill={`url(#meterBlue-${suffix})`} filter={`url(#blueGlow-${suffix})`} />
      <path d="m537.18074,590.23438 a150.76556 150.76556 0 0 0 -107.3086 45.05078 l214.73829,0 a150.76556 150.76556 0 0 0 -107.42969,-45.05078 z" fill="#000" />
      <g>
        <path d="m82,292 45.3061,0" fill="none" stroke="#000" strokeWidth="5" />
        <path d="m948.30743,285.82189 45.3061,0" fill="none" stroke="#000" strokeWidth="5" />
        <path d="m970.96048,263.16884 0,45.3061" fill="none" stroke="#000" strokeWidth="5" />
        <path d="m657,277.24518 c85.60879,8.87328 173.21481,25.29511 295.97922,75.9692" fill="none" stroke="#f00" strokeWidth="15" />
        <path d="m126.01626,357.7731 c161.49448,-60.14366 315.01211,-98.096 531.2366,-81.4418" fill="none" stroke="#000" strokeWidth="15" />
        <path d="m210.72277,271.30126 34.37058 47.77511" fill="none" stroke="#000" strokeWidth="8" />
        <path d="m285.65064,249.6478 27.49646 52.24328" fill="none" stroke="#000" strokeWidth="8" />
        <path d="m365.73409,233.49363 18.56011 52.93069" fill="none" stroke="#000" strokeWidth="8" />
        <path d="m451.66054,221.12022 8.93635 53.96181" fill="none" stroke="#000" strokeWidth="8" />
        <path d="m544.1174,217.33945 -0.68741 53.96181" fill="none" stroke="#000" strokeWidth="8" />
        <path d="m620.76379,220.0891 -8.59264 53.2744" fill="none" stroke="#000" strokeWidth="8" />
        <path d="m669.22631,226.96322 -14.43565 56.36775" fill="none" stroke="#f00" strokeWidth="8" />
        <path d="m777.83734,243.8048 -24.40311 48.80622" fill="none" stroke="#f00" strokeWidth="8" />
        <path d="m864.4512,318.73266 34.37058 -43.65063" fill="none" stroke="#f00" strokeWidth="8" />
        <g transform={`rotate(${angle} 537.57412 730.481)`}>
          <path d="M184.04706,291.70923 537.57412,730.481" fill="none" stroke="#000" strokeWidth="6.7" strokeLinecap="butt" />
        </g>
        <text x="492.73926" y="393.86093" fontFamily="Roboto,Arial,sans-serif" fontSize="60" fontWeight="900">VU</text>
        <text x="902.58594" y="255.49496" fontSize="40">5</text>
        <text x="775.54688" y="218.96762" fontSize="40">3</text>
        <text x="663.13672" y="202.96762" fontSize="40">0</text>
        <text x="612.89453" y="196.49496" fontSize="40">1</text>
        <text x="530.54688" y="194.96762" fontSize="40">3</text>
        <text x="439.58594" y="202.49496" fontSize="40">5</text>
        <text x="348.78125" y="210.49496" fontSize="40">7</text>
        <text x="251.89453" y="221.96762" fontSize="40">10</text>
        <text x="160.42969" y="243.96762" fontSize="40">20</text>
      </g>
    </svg>
  )
}

export default function TracksPlayer({ onClose }) {
  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const splitRef = useRef(null)
  const animRef = useRef(null)
  const meterRef = useRef({ left: -60, right: -60 })
  const [trackIndex, setTrackIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(.68)
  const [muted, setMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [leftVU, setLeftVU] = useState(-60)
  const [rightVU, setRightVU] = useState(-60)

  const track = TRACKS[trackIndex]

  const setupAudio = async () => {
    const audio = audioRef.current
    if (!audio) return null
    if (ctxRef.current) {
      if (ctxRef.current.state === "suspended") await ctxRef.current.resume()
      return ctxRef.current
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    const ctx = new AC()
    const source = ctx.createMediaElementSource(audio)
    const split = ctx.createChannelSplitter(2)
    const left = ctx.createAnalyser()
    const right = ctx.createAnalyser()
    left.fftSize = right.fftSize = 1024
    // FFT smoothing is only used by the spectrum. VU uses its own ballistics below.
    left.smoothingTimeConstant = right.smoothingTimeConstant = 0
    source.connect(split)
    split.connect(left, 0)
    split.connect(right, 1)
    source.connect(ctx.destination)
    ctxRef.current = ctx
    splitRef.current = { left, right }
    return ctx
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const wasPlaying = playing
    let cancelled = false

    audio.src = track.file
    audio.volume = volume
    audio.muted = muted
    audio.load()
    setCurrentTime(0)
    setDuration(0)
    meterRef.current = { left: -60, right: -60 }
    setLeftVU(-60)
    setRightVU(-60)

    const startPlayback = async () => {
      if (cancelled) return
      try {
        const ctx = await setupAudio()
        if (ctx?.state === "suspended") await ctx.resume()
        await audio.play()
        if (!cancelled) setPlaying(true)
      } catch {
        if (!cancelled) setPlaying(false)
      }
    }

    if (wasPlaying) {
      if (audio.readyState >= 3) startPlayback()
      else audio.addEventListener("canplay", startPlayback, { once: true })
    } else {
      audio.pause()
      setPlaying(false)
    }

    return () => {
      cancelled = true
      audio.removeEventListener("canplay", startPlayback)
    }
  }, [trackIndex])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = muted
  }, [volume, muted])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const time = () => setCurrentTime(audio.currentTime || 0)
    const meta = () => Number.isFinite(audio.duration) && setDuration(audio.duration)
    audio.addEventListener("timeupdate", time)
    audio.addEventListener("loadedmetadata", meta)
    audio.addEventListener("durationchange", meta)
    return () => {
      audio.removeEventListener("timeupdate", time)
      audio.removeEventListener("loadedmetadata", meta)
      audio.removeEventListener("durationchange", meta)
    }
  }, [trackIndex])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const c = canvas.getContext("2d")
      c.clearRect(0, 0, canvas.width, canvas.height)
      const split = splitRef.current
      const now = performance.now()
      if (split) {
        const ld = new Uint8Array(split.left.frequencyBinCount)
        const rd = new Uint8Array(split.right.frequencyBinCount)
        const lt = new Uint8Array(split.left.fftSize)
        const rt = new Uint8Array(split.right.fftSize)

        // Real VU measurement: time-domain RMS for each physical channel.
        split.left.getByteTimeDomainData(lt)
        split.right.getByteTimeDomainData(rt)
        const rms = data => {
          let sum = 0
          for (let i = 0; i < data.length; i++) {
            const sample = (data[i] - 128) / 128
            sum += sample * sample
          }
          return Math.sqrt(sum / data.length)
        }
        // 0 VU is calibrated to -12 dBFS RMS, which matches the working range of mastered tracks.
        const toDb = x => x <= 0.000001 ? -60 : clamp(20 * Math.log10(x), -60, 0)
        const toVU = db => clamp(db + 12, -30, 10)
        const targetL = toVU(toDb(rms(lt)))
        const targetR = toVU(toDb(rms(rt)))

        // VU-style ballistics: quick attack, slower release. No artificial motion.
        const updateMeter = (current, target, dt) => {
          const attack = 0.045
          const release = 0.32
          const tc = target > current ? attack : release
          return current + (target - current) * (1 - Math.exp(-dt / (tc * 1000)))
        }
        const last = draw.lastTime || now
        const dt = clamp(now - last, 1, 80)
        draw.lastTime = now
        const ml = updateMeter(meterRef.current.left, targetL, dt)
        const mr = updateMeter(meterRef.current.right, targetR, dt)
        meterRef.current = { left: ml, right: mr }
        setLeftVU(ml)
        setRightVU(mr)

        // Spectrum remains FFT-based and independent from the VU RMS measurement.
        split.left.getByteFrequencyData(ld)
        split.right.getByteFrequencyData(rd)
        const bars = 64
        const w = canvas.width / bars
        for (let i = 0; i < bars; i++) {
          const v = ((ld[Math.floor(i * ld.length / bars)] + rd[Math.floor(i * rd.length / bars)]) / 2) / 255
          const h = Math.max(2, canvas.height * Math.pow(v, 2) * (playing ? .95 : .08))
          c.fillStyle = "rgba(100,190,255,.75)"
          c.fillRect(i * w, canvas.height - h, w - 2, h)
        }
      } else {
        meterRef.current = { left: -60, right: -60 }
        setLeftVU(-60)
        setRightVU(-60)
      }
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [playing])

  const play = async () => {
    const audio = audioRef.current
    if (!audio) return
    try {
      const ctx = await setupAudio()
      if (ctx?.state === "suspended") await ctx.resume()
      await audio.play()
      setPlaying(true)
    } catch { setPlaying(false) }
  }

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
    } else play()
  }

  const changeTrack = direction => setTrackIndex(i => (i + direction + TRACKS.length) % TRACKS.length)
  const seek = e => { const v = Number(e.target.value); if (audioRef.current) audioRef.current.currentTime = v; setCurrentTime(v) }

  return (
    <>
      <style>{`
        @keyframes loriPulse {
          0%,100% { opacity:.45; transform:translateY(0); text-shadow:0 0 0 rgba(120,220,255,0); }
          50% { opacity:1; transform:translateY(-2px); text-shadow:0 0 8px rgba(120,220,255,.9),0 0 18px rgba(80,140,255,.7); }
        }
        .tracks-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.1);backdrop-filter:blur(2px)}
        .tracks-window{width:17cm;height:17cm;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);box-sizing:border-box;padding:18px;border-radius:24px;background:linear-gradient(145deg,rgba(9,15,27,.96),rgba(3,7,15,.98));border:1px solid rgba(125,190,255,.2);box-shadow:0 20px 70px rgba(0,0,0,.55),inset 0 0 40px rgba(70,150,255,.035);color:#eaf4ff;font-family:Inter,system-ui,sans-serif;position:relative;display:flex;flex-direction:column;gap:10px}
        .tracks-close{position:absolute;top:10px;right:14px;border:0;background:transparent;color:rgba(220,240,255,.62);font-size:22px;cursor:pointer;z-index:5}.tracks-title{text-align:center;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 28px}.tracks-brand{display:flex;align-items:center;justify-content:center;gap:6px;font-size:16px;font-weight:900;letter-spacing:1px;white-space:nowrap;padding:0 28px}.tracks-brand-pulse{animation:loriPulse 2.8s ease-in-out infinite}
        .tracks-visualizer{width:100%;height:3cm;min-height:90px;display:block;border-radius:10px;background:rgba(0,0,0,.22)}
        .nyx-vu{display:flex;gap:10px;width:100%;justify-content:center}.nyx-meter{flex:1;min-width:0;background:transparent;border-radius:4px;overflow:hidden;box-shadow:0 0 18px rgba(40,190,255,.28)}.nyx-meter-svg{display:block;width:100%;height:auto}.tracks-controls,.tracks-progress,.tracks-volume{display:flex;align-items:center;justify-content:center;gap:8px}.tracks-progress,.tracks-volume{font-size:9px;opacity:.75}.tracks-progress input,.tracks-volume input{flex:1}.tracks-button{border:1px solid rgba(150,210,255,.18);background:rgba(255,255,255,.045);color:#eaf4ff;border-radius:10px;min-width:36px;height:34px;cursor:pointer}.tracks-button.main{min-width:48px;font-size:16px}.tracks-playlist{flex:1;min-height:0;overflow-y:auto;border-top:1px solid rgba(150,210,255,.12);padding-top:7px}.tracks-item{width:100%;box-sizing:border-box;display:flex;align-items:center;gap:8px;border:0;background:transparent;color:rgba(235,245,255,.72);padding:6px 7px;border-radius:7px;cursor:pointer;text-align:left;font-size:10px}.tracks-item.active{background:rgba(100,190,255,.1);color:#fff}.tracks-number{width:20px;opacity:.45}.tracks-item-title{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}@media(max-width:600px){.tracks-window{width:min(420px,90vw);height:auto;max-height:88vh;padding:46px 20px 16px}.nyx-vu{display:none}.tracks-playlist{max-height:145px;flex:none}}
      `}</style>
      <div className="tracks-overlay" onPointerDown={e=>e.pointerType==="mouse"&&onClose()}>
        <div className="tracks-window" onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
          <audio ref={audioRef} onEnded={()=>changeTrack(1)} />
          <button className="tracks-close" onClick={onClose}>×</button>
          <div className="tracks-brand"><span>NYXTRYP</span><span className="tracks-brand-pulse">TRACK</span></div>
          <div className="nyx-vu"><div className="nyx-meter"><Meter channel="L" value={leftVU}/></div><div className="nyx-meter"><Meter channel="R" value={rightVU}/></div></div>
          <canvas ref={canvasRef} className="tracks-visualizer" width={1200} height={240}/>
          <div className="tracks-controls"><button className="tracks-button" onClick={()=>changeTrack(-1)}>‹</button><button className="tracks-button main" onClick={togglePlay}>{playing?"Ⅱ":"▶"}</button><button className="tracks-button" onClick={()=>changeTrack(1)}>›</button></div>
          <div className="tracks-progress"><span>{formatTime(currentTime)}</span><input type="range" min="0" max={duration||0} step=".1" value={Math.min(currentTime,duration||0)} onChange={seek}/><span>{formatTime(duration)}</span></div>
          <div className="tracks-volume"><button className="tracks-button" onClick={()=>setMuted(v=>!v)}>{muted?"🔇":"🔊"}</button><input type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div>
          <div className="tracks-playlist">{TRACKS.map((item,index)=><button key={item.file} className={`tracks-item${index===trackIndex?" active":""}`} onClick={()=>{setTrackIndex(index);setTimeout(play,100)}}><span className="tracks-number">{String(index+1).padStart(2,"0")}</span><span className="tracks-item-title">{item.title}</span></button>)}</div>
        </div>
      </div>
    </>
  )
}