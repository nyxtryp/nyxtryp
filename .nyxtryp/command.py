from pathlib import Path

p = Path("src/components/TracksPlayer.jsx")
s = p.read_text()
marker = 'NYXTRYP TEST: ПРИВЕТ'
if marker not in s:
    needle = '<div className="tracks-playlist">'
    if needle not in s:
        raise SystemExit("player insertion point not found")
    s = s.replace(needle, '<div style={{color:"white",fontSize:"24px",fontWeight:"bold",padding:"8px 0"}}>ПРИВЕТ</div>\n\n          ' + needle, 1)
    p.write_text(s)
print("NYXTRYP TEST: ПРИВЕТ applied")
