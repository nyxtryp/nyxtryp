from pathlib import Path

p = Path("src/components/TracksPlayer.jsx")
s = p.read_text()
s = s.replace('<div className="nyxtryp-auto-test">ПРИВЕТ</div>', '')
s = s.replace('ПРИВЕТ', '')

start_marker = '''          {!isMobile && (\n            <div className="tracks-mc-vu">'''
start = s.find(start_marker)
if start < 0:
    raise SystemExit("L/R meter block start not found")
end_marker = '''          )}'''
end = s.find(end_marker, start)
if end < 0:
    raise SystemExit("L/R meter block end not found")
end += len(end_marker)

new_block = '''          {!isMobile && (\n            <div className="tracks-mc-vu">\n              {[['L', leftVU], ['R', rightVU]].map(([channel, value]) => {\n                const displayValue = Math.max(-40, Math.min(10, value))\n                const normalized = (displayValue + 40) / 50\n                const angle = -58 + normalized * 116\n\n                return (\n                  <div className="tracks-mc-meter" key={channel}>\n                    <div className="tracks-mc-window">\n                      <svg className="tracks-mc-gauge" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid meet" aria-label={`${channel} dB meter`}>\n                        <defs>\n                          <linearGradient id={`mc-blue-${channel}`} x1="0" y1="0" x2="0" y2="1">\n                            <stop offset="0" stopColor="#75dcff" />\n                            <stop offset="0.5" stopColor="#218fc9" />\n                            <stop offset="1" stopColor="#063e67" />\n                          </linearGradient>\n                          <radialGradient id={`mc-glow-${channel}`} cx="50%" cy="58%" r="65%">\n                            <stop offset="0" stopColor="#8be6ff" stopOpacity=".34" />\n                            <stop offset=".72" stopColor="#208ecb" stopOpacity=".12" />\n                            <stop offset="1" stopColor="#00121f" stopOpacity="0" />\n                          </radialGradient>\n                          <filter id={`mc-soft-${channel}`}>\n                            <feGaussianBlur stdDeviation="2.2" />\n                          </filter>\n                        </defs>\n\n                        <rect x="2" y="2" width="356" height="146" rx="4" fill="#02070b" stroke="rgba(205,225,238,.42)" strokeWidth="2" />\n                        <rect x="7" y="7" width="346" height="136" rx="2" fill={`url(#mc-blue-${channel})`} />\n                        <rect x="7" y="7" width="346" height="136" rx="2" fill={`url(#mc-glow-${channel})`} />\n                        <rect x="7" y="7" width="346" height="136" rx="2" fill="none" stroke="rgba(255,255,255,.16)" />\n\n                        <text x="180" y="23" textAnchor="middle" fill="rgba(4,29,46,.92)" fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif" letterSpacing="2">dB</text>\n\n                        <path d="M48 118 Q180 66 312 118" fill="none" stroke="rgba(2,28,46,.72)" strokeWidth="2" />\n                        <path d="M48 116 Q180 64 312 116" fill="none" stroke="rgba(220,247,255,.17)" strokeWidth="1" />\n\n                        {Array.from({ length: 11 }, (_, i) => {\n                          const db = -40 + i * 5\n                          const t = i / 10\n                          const x = 48 + 264 * t\n                          const y = 118 - 52 * (4 * t * (1 - t))\n                          const slope = 208 * (t - 0.5)\n                          const length = i % 2 === 0 ? 9 : 5\n                          const norm = Math.hypot(1, slope)\n                          const nx = -slope / norm\n                          const ny = -1 / norm\n                          return (\n                            <g key={db}>\n                              <line x1={x - nx * 1} y1={y - ny * 1} x2={x + nx * length} y2={y + ny * length} stroke="rgba(5,30,48,.88)" strokeWidth={i % 2 === 0 ? 1.5 : 1} />\n                              {i % 2 === 0 && (\n                                <text x={x + nx * 18} y={y + ny * 18 + 3} textAnchor="middle" fill="rgba(4,28,45,.92)" fontSize="8.5" fontFamily="Arial, sans-serif">{db > 0 ? `+${db}` : db}</text>\n                              )}\n                            </g>\n                          )\n                        })}\n\n                        <text x="180" y="137" textAnchor="middle" fill="rgba(3,25,41,.9)" fontSize="7.5" fontWeight="700" fontFamily="Arial, sans-serif" letterSpacing="1.8">POWER OUTPUT</text>\n                        <text x="22" y="22" fill="rgba(4,28,45,.92)" fontSize="8" fontWeight="700" fontFamily="Arial, sans-serif">{channel}</text>\n\n                        <line x1="180" y1="120" x2="180" y2="47" stroke="rgba(210,242,255,.28)" strokeWidth="4" strokeLinecap="round" filter={`url(#mc-soft-${channel})`} />\n                        <g transform={`rotate(${angle} 180 120)`}>\n                          <line x1="180" y1="120" x2="180" y2="45" stroke="#f5fbff" strokeWidth="2.2" strokeLinecap="round" />\n                          <line x1="180" y1="120" x2="180" y2="50" stroke="rgba(26,67,91,.88)" strokeWidth=".9" strokeLinecap="round" />\n                        </g>\n                        <circle cx="180" cy="120" r="5.5" fill="#dbeaf2" stroke="#17364a" strokeWidth="1.8" />\n                        <circle cx="180" cy="120" r="1.8" fill="#07131c" />\n                      </svg>\n                    </div>\n                  </div>\n                )\n              })}\n            </div>\n          )}'''

s = s[:start] + new_block + s[end:]

css_start_marker = '''        .tracks-mc-vu {'''
css_start = s.find(css_start_marker)
if css_start < 0:
    raise SystemExit("meter CSS start not found")
css_end_marker = '''        @media (max-width: 600px) {'''
css_end = s.find(css_end_marker, css_start)
if css_end < 0:
    raise SystemExit("meter CSS end not found")

new_css = '''        .tracks-mc-vu {\n          display: flex;\n          gap: 12px;\n          width: 100%;\n          justify-content: center;\n          align-items: stretch;\n          padding: 2px 0 4px;\n        }\n\n        .tracks-mc-meter {\n          flex: 1;\n          min-width: 0;\n        }\n\n        .tracks-mc-window {\n          position: relative;\n          overflow: hidden;\n          border-radius: 5px;\n          background: #02070b;\n          border: 1px solid rgba(195,218,232,.38);\n          box-shadow: inset 0 0 0 1px rgba(0,0,0,.92), 0 5px 16px rgba(0,0,0,.3);\n        }\n\n        .tracks-mc-gauge {\n          position: relative;\n          z-index: 1;\n          width: 100%;\n          height: 112px;\n          display: block;\n        }\n\n'''
s = s[:css_start] + new_css + s[css_end:]

p.write_text(s)
print("NYXTRYP: horizontal L/R McIntosh-style meters, dB -40 to +10, 10-step graduation")