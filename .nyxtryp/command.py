from pathlib import Path
import re

p = Path("src/components/TracksPlayer.jsx")
s = p.read_text()

# Remove the temporary test label wherever it was inserted.
s = re.sub(r'<div[^>]*>\s*ПРИВЕТ\s*</div>\s*', '', s)

# Locate the actual VU wrapper and replace the complete balanced JSX div.
marker = '<div className="tracks-vu-wrap">'
start = s.find(marker)
if start < 0:
    raise SystemExit("tracks-vu-wrap not found")

pos = start
balance = 0
pattern = re.compile(r'<div(?:\s[^>]*)?>|</div>')
end = None
for m in pattern.finditer(s, start):
    token = m.group(0)
    if token.startswith('<div'):
        balance += 1
    else:
        balance -= 1
        if balance == 0:
            end = m.end()
            break

if end is None:
    raise SystemExit("could not find end of VU wrapper")

replacement = '''<div className="tracks-mc-vu">
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
            </div>'''

s = s[:start] + replacement + s[end:]

# Replace the old VU wrapper styling with the analog meter styling.
s = re.sub(
    r'\.tracks-vu-wrap\s*\{.*?\}\s*',
    '''.tracks-mc-vu { display: flex; gap: 10px; width: 100%; justify-content: center; align-items: center; }
        .tracks-mc-meter { flex: 1; min-width: 0; text-align: center; }
        .tracks-mc-label { font-size: 11px; letter-spacing: 2px; color: rgba(220,235,248,.72); margin-bottom: -2px; }
        .tracks-mc-gauge { width: 100%; height: 92px; display: block; overflow: visible; }
        ''',
    s,
    count=1,
    flags=re.S,
)

p.write_text(s)
print("NYXTRYP: restored analog L/R VU arrows and removed test text")