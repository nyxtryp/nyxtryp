import { useEffect, useRef, useState } from "react"

const TRACKS = [
  {
    "title": "After Midnight — Nyxtryp",
    "file": "/audio/tracks/After Midnight — Nyxtryp.mp3"
  },
  {
    "title": "Awaken The Machine — Nyxtryp",
    "file": "/audio/tracks/Awaken The Machine — Nyxtryp.mp3"
  },
  {
    "title": "Beyond Reality — Nyxtryp",
    "file": "/audio/tracks/Beyond Reality — Nyxtryp.mp3"
  },
  {
    "title": "Beyond The Signal — Nyxtryp",
    "file": "/audio/tracks/Beyond The Signal — Nyxtryp.mp3"
  },
  {
    "title": "Crystal Memory — Nyxtryp",
    "file": "/audio/tracks/Crystal Memory — Nyxtryp.mp3"
  },
  {
    "title": "Digital Paradise — Nyxtryp",
    "file": "/audio/tracks/Digital Paradise — Nyxtryp.mp3"
  },
  {
    "title": "Echoes Of Tomorrow — Nyxtryp",
    "file": "/audio/tracks/Echoes Of Tomorrow — Nyxtryp.mp3"
  },
  {
    "title": "Electric Dreams — Nyxtryp",
    "file": "/audio/tracks/Electric Dreams — Nyxtryp.mp3"
  },
  {
    "title": "Electric Soul — Nyxtryp",
    "file": "/audio/tracks/Electric Soul — Nyxtryp.mp3"
  },
  {
    "title": "Final Horizon — Nyxtryp",
    "file": "/audio/tracks/Final Horizon — Nyxtryp.mp3"
  },
  {
    "title": "Future Is Calling — Nyxtryp",
    "file": "/audio/tracks/Future Is Calling — Nyxtryp.mp3"
  },
  {
    "title": "Gravity Of Light — Nyxtryp",
    "file": "/audio/tracks/Gravity Of Light — Nyxtryp.mp3"
  },
  {
    "title": "Hidden Dimension — Nyxtryp",
    "file": "/audio/tracks/Hidden Dimension — Nyxtryp.mp3"
  },
  {
    "title": "Higher State — Nyxtryp",
    "file": "/audio/tracks/Higher State — Nyxtryp.mp3"
  },
  {
    "title": "Infinite Desire — Nyxtryp",
    "file": "/audio/tracks/Infinite Desire — Nyxtryp.mp3"
  },
  {
    "title": "Infinite Motion — Nyxtryp",
    "file": "/audio/tracks/Infinite Motion — Nyxtryp.mp3"
  },
  {
    "title": "Into The Unknown — Nyxtryp",
    "file": "/audio/tracks/Into The Unknown — Nyxtryp.mp3"
  },
  {
    "title": "Lost In Frequency — Nyxtryp",
    "file": "/audio/tracks/Lost In Frequency — Nyxtryp.mp3"
  },
  {
    "title": "Neon Awakening — Nyxtryp",
    "file": "/audio/tracks/Neon Awakening — Nyxtryp.mp3"
  },
  {
    "title": "Night Protocol — Nyxtryp",
    "file": "/audio/tracks/Night Protocol — Nyxtryp.mp3"
  },
  {
    "title": "Parallel Hearts — Nyxtryp",
    "file": "/audio/tracks/Parallel Hearts — Nyxtryp.mp3"
  },
  {
    "title": "Silent Velocity — Nyxtryp",
    "file": "/audio/tracks/Silent Velocity — Nyxtryp.mp3"
  },
  {
    "title": "Synthetic Emotion — Nyxtryp",
    "file": "/audio/tracks/Synthetic Emotion — Nyxtryp.mp3"
  },
  {
    "title": "The Last Transmission — Nyxtryp",
    "file": "/audio/tracks/The Last Transmission — Nyxtryp.mp3"
  },
  {
    "title": "Zero Gravity — Nyxtryp",
    "file": "/audio/tracks/Zero Gravity — Nyxtryp.mp3"
  }
]

function formatTime(value) {
  if (!Number.isFinite(value) || value < 0) {
    return "0:00"
  }

  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)

  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export default function TracksPlayer({ onClose }) {
  const audioRef = useRef(null)
  const mobileQueryRef = useRef(null)
  const canvasRef = useRef(null)

  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const animationRef = useRef(null)

  const [trackIndex, setTrackIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.68)
  const [muted, setMuted] = useState(false)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const [leftVU, setLeftVU] = useState(-60)
  const [rightVU, setRightVU] = useState(-60)

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 600px)").matches
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const query = window.matchMedia("(max-width: 600px)")
    mobileQueryRef.current = query

    const update = event => {
      setIsMobile(event.matches)
    }

    query.addEventListener("change", update)

    return () => {
      query.removeEventListener("change", update)
    }
  }, [])

  const track = TRACKS[trackIndex]

  const setupAnalyser = () => {
    const audio = audioRef.current

    if (!audio) {
      return null
    }

    if (audioContextRef.current) {
      return audioContextRef.current
    }

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext

    if (!AudioContext) {
      return null
    }

    const context = new AudioContext()
    const analyser = context.createAnalyser()

    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.78

    const source =
      context.createMediaElementSource(audio)

    source.connect(analyser)
    analyser.connect(context.destination)

    audioContextRef.current = context
    analyserRef.current = analyser
    sourceRef.current = source

    return context
  }

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    audio.volume = volume
    audio.muted = muted
  }, [volume, muted])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    const updateTime = () => {
      setCurrentTime(audio.currentTime || 0)
    }

    const updateDuration = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    }

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("loadedmetadata", updateDuration)
    audio.addEventListener("durationchange", updateDuration)

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("loadedmetadata", updateDuration)
      audio.removeEventListener("durationchange", updateDuration)
    }
  }, [trackIndex])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    audio.src = track.file
    audio.load()

    setCurrentTime(0)
    setDuration(0)
    setPlaying(false)
  }, [trackIndex])

  useEffect(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current

    if (!canvas || !analyser) {
      return
    }

    const ctx = canvas.getContext("2d")
    const data = new Uint8Array(analyser.frequencyBinCount)

    const draw = () => {
      const width = canvas.width
      const height = canvas.height

      ctx.clearRect(0, 0, width, height)

      analyser.getByteFrequencyData(data)

      const bars = 64
      const gap = 2
      const barWidth =
        (width - gap * (bars - 1)) / bars

      for (let i = 0; i < bars; i++) {
        const start =
          Math.floor(
            (i / bars) * data.length
          )

        const end =
          Math.max(
            start + 1,
            Math.floor(
              ((i + 1) / bars) * data.length
            )
          )

        let sum = 0

        for (let j = start; j < end; j++) {
          sum += data[j]
        }

        let value =
          sum / Math.max(1, end - start) / 255

        value = Math.pow(
          Math.min(value, 0.9),
          2.2
        )

        const barHeight =
          Math.max(
            2,
            height * value * (playing ? 0.95 : 0.08)
          )

        const x = i * (barWidth + gap)
        const y = height - barHeight

        const gradient =
          ctx.createLinearGradient(
            0,
            y,
            0,
            height
          )

        gradient.addColorStop(
          0,
          "rgba(130,220,255,0.95)"
        )

        gradient.addColorStop(
          1,
          "rgba(80,130,255,0.15)"
        )

        ctx.fillStyle = gradient

        ctx.fillRect(
          x,
          y,
          barWidth,
          barHeight
        )
      }

      animationRef.current =
        requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [playing])

  useEffect(() => {
    const interval = setInterval(() => {
      const analyser = analyserRef.current

      if (!analyser || !playing) {
        setLeftVU(-60)
        setRightVU(-60)
        return
      }

      const data =
        new Uint8Array(
          analyser.frequencyBinCount
        )

      analyser.getByteFrequencyData(data)

      let sum = 0

      for (let i = 0; i < Math.min(80, data.length); i++) {
        sum += data[i]
      }

      const level =
        sum /
        Math.max(1, Math.min(80, data.length))

      const db =
        level <= 0
          ? -60
          : Math.max(
              -60,
              Math.min(
                0,
                20 * Math.log10(level / 255)
              )
            )

      setLeftVU(db)
      setRightVU(db - Math.random() * 1.5)
    }, 80)

    return () => clearInterval(interval)
  }, [playing])

  const playTrack = async index => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    if (index !== trackIndex) {
      setTrackIndex(index)

      setTimeout(async () => {
        try {
          const context = setupAnalyser()

          if (
            context &&
            context.state === "suspended"
          ) {
            await context.resume()
          }

          await audio.play()
          setPlaying(true)
        } catch {
          setPlaying(false)
        }
      }, 80)

      return
    }

    try {
      const context = setupAnalyser()

      if (
        context &&
        context.state === "suspended"
      ) {
        await context.resume()
      }

      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  const togglePlay = async () => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    await playTrack(trackIndex)
  }

  const changeTrack = direction => {
    setTrackIndex(current => {
      if (direction < 0) {
        return (
          (current - 1 + TRACKS.length) %
          TRACKS.length
        )
      }

      return (
        (current + 1) %
        TRACKS.length
      )
    })
  }

  const seek = event => {
    const audio = audioRef.current

    if (!audio || !duration) {
      return
    }

    const value = Number(event.target.value)

    audio.currentTime = value
    setCurrentTime(value)
  }

  const vuWidth = value => {
    return `${Math.max(
      0,
      Math.min(100, ((value + 60) / 60) * 100)
    )}%`
  }

  return (
    <>
      <style>{`
        .tracks-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,.10);
          backdrop-filter: blur(2px);
        }

        .tracks-window {
          width: 17cm;
          height: 17cm;
          max-width: calc(100vw - 24px);
          max-height: calc(100vh - 24px);
          box-sizing: border-box;
          padding: 18px;
          border-radius: 24px;
          background:
            linear-gradient(
              145deg,
              rgba(9,15,27,.96),
              rgba(3,7,15,.98)
            );
          border: 1px solid rgba(125,190,255,.20);
          box-shadow:
            0 20px 70px rgba(0,0,0,.55),
            inset 0 0 40px rgba(70,150,255,.035);
          color: #eaf4ff;
          font-family: Inter, system-ui, sans-serif;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tracks-close {
          position: absolute;
          top: 10px;
          right: 14px;
          border: none;
          background: transparent;
          color: rgba(220,240,255,.62);
          font-size: 22px;
          cursor: pointer;
          z-index: 5;
        }

        .tracks-title {
          text-align: center;
          font-size: 16px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 0 28px;
        }

        .tracks-visualizer {
          width: 100%;
          height: 3cm;
          min-height: 90px;
          display: block;
          border-radius: 10px;
          background: rgba(0,0,0,.22);
        }

        .tracks-vu-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tracks-vu-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tracks-vu-label {
          width: 18px;
          font-size: 10px;
          opacity: .6;
        }

        .tracks-vu {
          position: relative;
          flex: 1;
          height: 18px;
          background: rgba(255,255,255,.06);
          border-radius: 4px;
          overflow: hidden;
        }

        .tracks-vu-fill {
          height: 100%;
          width: 0;
          background:
            linear-gradient(
              90deg,
              rgba(80,160,255,.65),
              rgba(120,230,255,.9)
            );
          transition: width .08s linear;
        }

        .tracks-vu-db {
          width: 38px;
          text-align: right;
          font-size: 9px;
          opacity: .6;
        }

        .tracks-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .tracks-button {
          border: 1px solid rgba(150,210,255,.18);
          background: rgba(255,255,255,.045);
          color: #eaf4ff;
          border-radius: 10px;
          min-width: 36px;
          height: 34px;
          cursor: pointer;
        }

        .tracks-button.main {
          min-width: 48px;
          font-size: 16px;
        }

        .tracks-progress {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 9px;
          opacity: .7;
        }

        .tracks-progress input {
          flex: 1;
        }

        .tracks-volume {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
        }

        .tracks-volume input {
          flex: 1;
        }

        .tracks-playlist {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          border-top: 1px solid rgba(150,210,255,.12);
          padding-top: 7px;
          scrollbar-width: thin;
        }

        .tracks-item {
          width: 100%;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
          background: transparent;
          color: rgba(235,245,255,.72);
          padding: 6px 7px;
          border-radius: 7px;
          cursor: pointer;
          text-align: left;
          font-size: 10px;
        }

        .tracks-item:hover {
          background: rgba(255,255,255,.05);
        }

        .tracks-item.active {
          background: rgba(100,190,255,.10);
          color: #fff;
        }

        .tracks-number {
          width: 20px;
          opacity: .45;
        }

        .tracks-item-title {
          flex: 1;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        @media (max-width: 600px) {
          .tracks-window {
            width: min(420px, 90vw);
            height: auto;
            max-height: 88vh;
            padding: 46px 20px 16px;
            border-radius: 24px;
          }

          .tracks-visualizer {
            height: 95px;
            min-height: 95px;
          }

          .tracks-vu {
            height: 14px;
          }

          .tracks-playlist {
            max-height: 145px;
            flex: none;
          }

          .tracks-item {
            padding: 7px 6px;
            font-size: 10px;
          }
        }

        @media (min-width: 601px) and (orientation: portrait) {
          .tracks-window {
            width: min(17cm, calc(100vw - 24px));
            height: min(14cm, calc(100vh - 24px));
          }
        }


        .tracks-mc-vu {
          display: flex;
          gap: 10px;
          width: 100%;
          justify-content: center;
          align-items: center;
        }

        .tracks-mc-meter {
          flex: 1;
          min-width: 0;
          text-align: center;
        }

        .tracks-mc-label {
          font-size: 11px;
          letter-spacing: 2px;
          color: rgba(220,235,248,.72);
          margin-bottom: -2px;
        }

        .tracks-mc-gauge {
          width: 100%;
          height: 92px;
          display: block;
          overflow: visible;
        }
      `}</style>

      <div
        className="tracks-overlay"
        onPointerDown={event => {
          if (event.pointerType === "mouse") {
            onClose()
          }
        }}
      >
        <div
          className="tracks-window"
          onPointerDown={event =>
            event.stopPropagation()
          }
          onClick={event =>
            event.stopPropagation()
          }
        >
          <audio
            ref={audioRef}
            onEnded={() => {
              setTrackIndex(
                current =>
                  (current + 1) % TRACKS.length
              )
            }}
          />

          <button
            className="tracks-close"
            onClick={onClose}
            aria-label="Close tracks"
          >
            ×
          </button>

          <div className="tracks-title">
            {track.title}
          </div>

          <canvas
            ref={canvasRef}
            className="tracks-visualizer"
            width={1200}
            height={240}
          />

          {!isMobile && (
            <div className="tracks-mc-vu">
              {[['L', leftVU], ['R', rightVU]].map(([channel, value]) => {
                const displayValue = Math.max(-40, Math.min(20, value))
                const angle = -68 + ((displayValue + 40) / 60) * 136

                return (
                  <div className="tracks-mc-meter" key={channel}>
                    <div className="tracks-mc-label">{channel}</div>
                    <svg className="tracks-mc-gauge" viewBox="0 0 360 155" preserveAspectRatio="xMidYMid meet">
                      <path d="M55 127 A125 125 0 0 1 305 127" fill="none" stroke="rgba(190,210,225,.22)" strokeWidth="2" />
                      <path d="M55 127 A125 125 0 0 1 305 127" fill="none" stroke="rgba(255,55,55,.5)" strokeWidth="10" strokeDasharray="24 9" strokeDashoffset="-100" />
                      {[-40,-30,-20,-10,0,10,20].map(db => {
                        const a = (-68 + ((db + 40) / 60) * 136) * Math.PI / 180
                        const x1 = 180 + Math.sin(a) * 105
                        const y1 = 127 - Math.cos(a) * 105
                        const x2 = 180 + Math.sin(a) * 116
                        const y2 = 127 - Math.cos(a) * 116
                        const tx = 180 + Math.sin(a) * 88
                        const ty = 132 - Math.cos(a) * 88
                        return <g key={db}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(225,238,248,.7)" strokeWidth="1.5" /><text x={tx} y={ty} textAnchor="middle" fill="rgba(225,238,248,.72)" fontSize="10">{db}</text></g>
                      })}
                      <g transform={`rotate(${angle} 180 127)`}>
                        <line x1="180" y1="127" x2="180" y2="55" stroke="rgba(245,250,255,.95)" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="180" cy="127" r="5" fill="rgba(230,240,250,.95)" />
                      </g>
                      <text x="180" y="150" textAnchor="middle" fill="rgba(220,235,248,.62)" fontSize="9">POWER OUTPUT</text>
                    </svg>
                  </div>
                )
              })}
            </div>
          )}

          <div className="tracks-controls">
            <button
              className="tracks-button"
              onClick={() => changeTrack(-1)}
            >
              ‹
            </button>

            <button
              className="tracks-button main"
              onClick={togglePlay}
            >
              {playing ? "Ⅱ" : "▶"}
            </button>

            <button
              className="tracks-button"
              onClick={() => changeTrack(1)}
            >
              ›
            </button>
          </div>

          <div className="tracks-progress">
            <span>
              {formatTime(currentTime)}
            </span>

            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(
                currentTime,
                duration || 0
              )}
              onChange={seek}
            />

            <span>
              {formatTime(duration)}
            </span>
          </div>

          <div className="tracks-volume">
            <button
              className="tracks-button"
              onClick={() =>
                setMuted(value => !value)
              }
            >
              {muted ? "🔇" : "🔊"}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={event =>
                setVolume(
                  Number(event.target.value)
                )
              }
            />
          </div>

          <div style={{color:"white",fontSize:"24px",fontWeight:"bold",padding:"8px 0"}}></div>

          <div className="tracks-playlist">
            {TRACKS.map((item, index) => (
              <button
                key={item.file}
                className={
                  "tracks-item" +
                  (index === trackIndex
                    ? " active"
                    : "")
                }
                onClick={() =>
                  playTrack(index)
                }
              >
                <span className="tracks-number">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="tracks-item-title">
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
