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
  const scale = [[-30,-7.24],[-20,1.04],[-10,9.53],[-7,18.90],[-5,28.35],[-3,38.11],[-1,46.89],[0,52.23],[3,63.81],[5,76.40],[10,81.69]]
  const toAngle = v => {
    const x = clamp(v, -30, 10)
    for (let i = 1; i < scale.length; i++) {
      const [v2,a2] = scale[i], [v1,a1] = scale[i-1]
      if (x <= v2) return a1 + (a2-a1) * ((x-v1)/(v2-v1))
    }
    return scale[scale.length-1][1]
  }
  const angle = toAngle(value)
  const suffix = channel.toLowerCase()
  return <svg className="nyx-meter-svg" viewBox="0 0 1080 600" role="img" aria-label={`${channel} VU meter`}>
    <defs>
      <filter id={`shadow-${suffix}`}><feDropShadow dx="3" dy="3" stdDeviation="8" floodOpacity=".5" /></filter>
      <radialGradient id={`meterBlue-${suffix}`} cx="50%" cy="55%" r="72%"><stop offset="0%" stopColor="#5edbff" /><stop offset="42%" stopColor="#159fe8" /><stop offset="78%" stopColor="#0875c4" /><stop offset="100%" stopColor="#043d73" /></radialGradient>
      <filter id={`blueGlow-${suffix}`} x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="9" result="blur" /><feFlood floodColor="#38cfff" floodOpacity=".72" result="glowColor" /><feComposite in="glowColor" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <rect x="0" y="0" width="1077" height="598" fill={`url(#meterBlue-${suffix})`} filter={`url(#blueGlow-${suffix})`} />
    <path d="m537.18074,590.23438 a150.76556 150.76556 0 0 0 -107.3086 45.05078 l214.73829,0 a150.76556 150.76556 0 0 0 -107.42969,-45.05078 z" fill="#000" />
    <g>
      <path d="m82,292 45.3061,0" fill="none" stroke="#000" strokeWidth="5" /><path d="m948.30743,285.82189 45.3061,0" fill="none" stroke="#000" strokeWidth="5" /><path d="m970.96048,263.16884 0,45.3061" fill="none" stroke="#000" strokeWidth="5" />
      <path d="m657,277.24518 c85.60879,8.87328 173.21481,25.29511 295.97922,75.9692" fill="none" stroke="#f00" strokeWidth="15" /><path d="m126.01626,357.7731 c161.49448,-60.14366 315.01211,-98.096 531.2366,-81.4418" fill="none" stroke="#000" strokeWidth="15" />
      <path d="m210.72277,271.30126 34.37058 47.77511" fill="none" stroke="#000" strokeWidth="8" /><path d="m285.65064,249.6478 27.49646 52.24328" fill="none" stroke="#000" strokeWidth="8" /><path d="m365.73409,233.49363 18.56011 52.93069" fill="none" stroke="#000" strokeWidth="8" /><path d="m451.66054,221.12022 8.93635 53.96181" fill="none" stroke="#000" strokeWidth="8" /><path d="m544.1174,217.33945 -0.68741 53.96181" fill="none" stroke="#000" strokeWidth="8" /><path d="m620.76379,220.0891 -8.59264 53.2744" fill="none" stroke="#000" strokeWidth="8" /><path d="m669.22631,226.96322 -14.43565 56.36775" fill="none" stroke="#f00" strokeWidth="8" /><path d="m777.83734,243.8048 -24.40311 48.80622" fill="none" stroke="#f00" strokeWidth="8" /><path d="m864.4512,318.73266 34.37058 -43.65063" fill="none" stroke="#f00" strokeWidth="8" />
      <g transform={`rotate(${angle} 537.57412 730.481)`}><path d="M184.04706,291.70923 537.57412,730.481" fill="none" stroke="#000" strokeWidth="6.7" strokeLinecap="butt" /></g>
      <text x="492.73926" y="393.86093" fontFamily="Roboto,Arial,sans-serif" fontSize="60" fontWeight="900">VU</text><text x="902.58594" y="255.49496" fontSize="40">5</text><text x="775.54688" y="218.96762" fontSize="40">3</text><text x="663.13672" y="202.96762" fontSize="40">0</text><text x="612.89453" y="196.49496" fontSize="40">1</text><text x="530.54688" y="194.96762" fontSize="40">3</text><text x="439.58594" y="202.49496" fontSize="40">5</text><text x="348.78125" y="210.49496" fontSize="40">7</text><text x="251.89453" y="221.96762" fontSize="40">10</text><text x="160.42969" y="243.96762" fontSize="40">20</text>
    </g>
  </svg>
}

export default function TracksPlayer({ onClose }) {
  const audioRef = useRef(null), canvasRef = useRef(null), ctxRef = useRef(null), splitRef = useRef(null), animRef = useRef(null)
  const meterRef = useRef({ left:-60, right:-60 })
  const spectrumRef = useRef(new Float32Array(64))
  const velocityRef = useRef(new Float32Array(64))
  const peakRef = useRef(new Float32Array(64))
  const [trackIndex,setTrackIndex] = useState(0), [playing,setPlaying] = useState(false), [volume,setVolume] = useState(.68), [muted,setMuted] = useState(false), [currentTime,setCurrentTime] = useState(0), [duration,setDuration] = useState(0), [leftVU,setLeftVU] = useState(-60), [rightVU,setRightVU] = useState(-60), [,setMediaVersion] = useState(0)
  const track = TRACKS[trackIndex]

  useEffect(() => {
    let cancelled = false
    fetch('/api/media', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('media api failed')))
      .then(data => {
        if (cancelled || !Array.isArray(data.tracks) || !data.tracks.length) return
        const dynamic = data.tracks.map(name => ({
          title: name.replace(/\.mp3$/i, ''),
          file: `/audio/tracks/${encodeURIComponent(name)}`
        }))
        TRACKS.splice(0, TRACKS.length, ...dynamic)
        setMediaVersion(v => v + 1)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const setupAudio = async () => {
    const audio = audioRef.current
    if (!audio) return null
    if (ctxRef.current) { if (ctxRef.current.state === "suspended") await ctxRef.current.resume(); return ctxRef.current }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    const ctx = new AC(), source = ctx.createMediaElementSource(audio), split = ctx.createChannelSplitter(2), left = ctx.createAnalyser(), right = ctx.createAnalyser(), spectrum = ctx.createAnalyser()
    left.fftSize = right.fftSize = 1024; spectrum.fftSize = 32768
    left.smoothingTimeConstant = right.smoothingTimeConstant = 0; spectrum.smoothingTimeConstant = 0
    source.connect(split); split.connect(left,0); split.connect(right,1); split.connect(spectrum,0); source.connect(ctx.destination)
    ctxRef.current = ctx; splitRef.current = {left,right,spectrum}; return ctx
  }

  useEffect(() => {
    const audio=audioRef.current; if(!audio)return
    const wasPlaying=playing; let cancelled=false
    audio.src=track.file; audio.volume=volume; audio.muted=muted; audio.load(); setCurrentTime(0); setDuration(0); meterRef.current={left:-60,right:-60}; setLeftVU(-60); setRightVU(-60)
    const startPlayback=async()=>{if(cancelled)return;try{const ctx=await setupAudio();if(ctx?.state==="suspended")await ctx.resume();await audio.play();if(!cancelled)setPlaying(true)}catch{if(!cancelled)setPlaying(false)}}
    if(wasPlaying){if(audio.readyState>=3)startPlayback();else audio.addEventListener("canplay",startPlayback,{once:true})}else{audio.pause();setPlaying(false)}
    return()=>{cancelled=true;audio.removeEventListener("canplay",startPlayback)}
  },[trackIndex])
  useEffect(()=>{const audio=audioRef.current;if(!audio)return;audio.volume=volume;audio.muted=muted},[volume,muted])
  useEffect(()=>{const audio=audioRef.current;if(!audio)return;const time=()=>setCurrentTime(audio.currentTime||0),meta=()=>Number.isFinite(audio.duration)&&setDuration(audio.duration);audio.addEventListener("timeupdate",time);audio.addEventListener("loadedmetadata",meta);audio.addEventListener("durationchange",meta);return()=>{audio.removeEventListener("timeupdate",time);audio.removeEventListener("loadedmetadata",meta);audio.removeEventListener("durationchange",meta)}},[trackIndex])

  // VU — отдельный animation loop. Формулы VU НЕ меняем.
  useEffect(()=>{
    let raf
    const drawVU=()=>{
      const split=splitRef.current, now=performance.now()
      if(split){
        const lt=new Uint8Array(split.left.fftSize),rt=new Uint8Array(split.right.fftSize)
        split.left.getByteTimeDomainData(lt);split.right.getByteTimeDomainData(rt)
        const rms=data=>{let sum=0;for(let i=0;i<data.length;i++){const sample=(data[i]-128)/128;sum+=sample*sample}return Math.sqrt(sum/data.length)}
        const signalL=rms(lt),signalR=rms(rt)
        const toDb=x=>x<=.000001?-60:clamp(20*Math.log10(x),-60,0),toVU=db=>clamp(db+12,-30,10)
        const targetL=toVU(toDb(signalL)),targetR=toVU(toDb(signalR))
        const updateMeter=(current,target,dt)=>{const tc=target>current?.045:.32;return current+(target-current)*(1-Math.exp(-dt/(tc*1000)))}
        const last=drawVU.lastTime||now,dt=clamp(now-last,1,80);drawVU.lastTime=now
        const ml=updateMeter(meterRef.current.left,targetL,dt),mr=updateMeter(meterRef.current.right,targetR,dt)