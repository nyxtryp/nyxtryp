from pathlib import Path

p = Path("src/components/TracksPlayer.jsx")
s = p.read_text()

# Remove only the temporary test label.
s = s.replace('<div className="nyxtryp-auto-test">ПРИВЕТ</div>', '')
s = s.replace('ПРИВЕТ', '')

old = '''          {!isMobile && (
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
          )}'''

new = '''          {!isMobile && (
            <div className="tracks-mc-vu">
              {[['L', leftVU], ['R', rightVU]].map(([channel, value]) => {
                const displayValue = Math.max(-40, Math.min(0, value))
                const normalized = (displayValue + 40) / 40
                const angle = -66 + normalized * 132

                return (
                  <div className="tracks-mc-meter" key={channel}>
                    <div className="tracks-mc-window">
                      <div className="tracks-mc-window-glow" />
                      <div className="tracks-mc-window-top">
                        <span>{channel}</span>
                        <span>POWER OUTPUT</span>
                      </div>
                      <svg className="tracks-mc-gauge" viewBox="0 0 360 170" preserveAspectRatio="xMidYMid meet" aria-label={`${channel} power meter`}>
                        <defs>
                          <linearGradient id={`mc-blue-${channel}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#64d9ff" />
                            <stop offset="0.55" stopColor="#188fd3" />
                            <stop offset="1" stopColor="#07538b" />
                          </linearGradient>
                          <filter id={`mc-soft-${channel}`}>
                            <feGaussianBlur stdDeviation="3" />
                          </filter>
                        </defs>
                        <rect x="3" y="3" width="354" height="164" rx="5" fill="#07111a" stroke="rgba(190,220,240,.34)" strokeWidth="2" />
                        <rect x="8" y="8" width="344" height="154" rx="3" fill={`url(#mc-blue-${channel})`} opacity=".92" />
                        <rect x="8" y="8" width="344" height="154" rx="3" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
                        <path d="M48 138 A132 132 0 0 1 312 138" fill="none" stroke="rgba(0,20,35,.42)" strokeWidth="2" />
                        {[0,1,2,3,4,5,6,7,8,9,10].map(i => {
                          const a = (-66 + i * 13.2) * Math.PI / 180
                          const outer = 112
                          const inner = i % 2 === 0 ? 96 : 103
                          const x1 = 180 + Math.sin(a) * inner
                          const y1 = 138 - Math.cos(a) * inner
                          const x2 = 180 + Math.sin(a) * outer
                          const y2 = 138 - Math.cos(a) * outer
                          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(8,30,48,.78)" strokeWidth={i % 2 === 0 ? 2 : 1} />
                        })}
                        {['0.2','2','20','200'].map((label, i) => {
                          const a = (-62 + i * 41.3) * Math.PI / 180
                          const x = 180 + Math.sin(a) * 78
                          const y = 138 - Math.cos(a) * 78
                          return <text key={label} x={x} y={y} textAnchor="middle" fill="rgba(4,24,40,.9)" fontSize="11" fontFamily="Arial, sans-serif">{label}</text>
                        })}
                        <text x="180" y="37" textAnchor="middle" fill="rgba(2,25,43,.9)" fontSize="10" fontFamily="Arial, sans-serif" letterSpacing="1.5">WATTS</text>
                        <text x="180" y="151" textAnchor="middle" fill="rgba(2,25,43,.9)" fontSize="9" fontFamily="Arial, sans-serif" letterSpacing="1.2">McINTOSH STYLE</text>
                        <path d="M62 138 A118 118 0 0 1 298 138" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
                        <line x1="180" y1="138" x2="180" y2="56" stroke="rgba(255,255,255,.98)" strokeWidth="3" strokeLinecap="round" filter={`url(#mc-soft-${channel})`} />
                        <g transform={`rotate(${angle} 180 138)`}>
                          <line x1="180" y1="138" x2="180" y2="56" stroke="#f7fbff" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1="180" y1="138" x2="180" y2="61" stroke="rgba(25,65,92,.9)" strokeWidth="1" strokeLinecap="round" />
                        </g>
                        <circle cx="180" cy="138" r="6" fill="#d9e9f3" stroke="#17364b" strokeWidth="2" />
                        <circle cx="180" cy="138" r="2" fill="#08141e" />
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          )}'''

if old not in s:
    raise SystemExit("expected current meter block not found; file was not changed")

s = s.replace(old, new, 1)

old_css = '''

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
'''

new_css = '''

        .tracks-mc-vu {
          display: flex;
          gap: 12px;
          width: 100%;
          justify-content: center;
          align-items: stretch;
          padding: 2px 0 4px;
        }

        .tracks-mc-meter {
          flex: 1;
          min-width: 0;
        }

        .tracks-mc-window {
          position: relative;
          overflow: hidden;
          border-radius: 7px;
          padding: 0;
          background: #03070b;
          border: 1px solid rgba(190,215,230,.34);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,.9), 0 4px 14px rgba(0,0,0,.28);
        }

        .tracks-mc-window-glow {
          position: absolute;
          inset: 10px;
          pointer-events: none;
          background: radial-gradient(circle at 50% 45%, rgba(110,220,255,.16), transparent 65%);
          filter: blur(10px);
          z-index: 0;
        }

        .tracks-mc-window-top {
          position: absolute;
          left: 14px;
          right: 14px;
          top: 9px;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          color: rgba(3,25,42,.86);
          font: 700 8px/1 Arial, sans-serif;
          letter-spacing: 1.4px;
          pointer-events: none;
        }

        .tracks-mc-gauge {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 116px;
          display: block;
        }

        @media (max-width: 900px) and (min-width: 601px) {
          .tracks-mc-gauge {
            height: 105px;
          }
        }
'''

if old_css not in s:
    raise SystemExit("expected current meter CSS not found; file was not changed")

s = s.replace(old_css, new_css, 1)

p.write_text(s)
print("NYXTRYP: recreated two blue L/R analog meter windows and removed test text")
