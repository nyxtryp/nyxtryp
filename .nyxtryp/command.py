from pathlib import Path
import re

p = Path("src/components/TracksPlayer.jsx")
s = p.read_text()

# Remove temporary test text.
s = re.sub(r'<div[^>]*>ПРИВЕТ</div>\s*', '', s)

# Replace the current VU area using the actual class present in the current player.
needle = 'tracks-vu'
if needle not in s:
    raise SystemExit("current VU section not found")

# Find the first VU wrapper div and replace it through the next controls section.
start = s.find('<div className="tracks-vu')
if start < 0:
    raise SystemExit("VU wrapper not found")
end = s.find('<div className="tracks-controls"', start)
if end < 0:
    raise SystemExit("tracks-controls not found")

replacement = '''<div className="tracks-mc-vu">
            {[['L', leftVU], ['R', rightVU]].map(([channel, value]) => {
              const displayValue = Math.max(-40, Math.min(20, value))
              const angle = -68 + ((displayValue + 40) / 60) * 136
              return (
                <div className="tracks-mc-meter" key={channel}>
                  <div className="tracks-mc-label">{channel}</div>
                  <svg className="tracks-mc-gauge" viewBox="0 0 360 155" preserveAspectRatio="xMidYMid meet">
                    <path d="M55 127 A125 125 0 0 1 305 127" fill="none" stroke="rgba(190,210,225,.22)" strokeWidth="2" />
                    <path d="M55 127 A125 125 0 0 1 305 127" fill="none" stroke="rgba(255,55,55,.42)" strokeWidth="12" strokeDasharray="22 10" strokeDashoffset="-104" />
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

          '''
s = s[:start] + replacement + s[end:]
p.write_text(s)
print("NYXTRYP: restored analog L/R VU arrows")