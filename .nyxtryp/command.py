from pathlib import Path

p = Path("src/scene/planets/PlanetField.jsx")
s = p.read_text()

old = '''          const syncThumbs = () => {\n\n          photos.forEach((src, i) => {'''
new = '''          const syncThumbs = () => {\n\n          thumbs.innerHTML = ""\n          thumbList.length = 0\n\n          photos.forEach((src, i) => {'''

if old not in s:
    raise SystemExit("syncThumbs target not found")

s = s.replace(old, new, 1)

# Restore the permanent automation script exactly after this temporary edit.
original_command = '''from pathlib import Path\n\np = Path("src/components/TracksPlayer.jsx")\ns = p.read_text()\n\n# Remove temporary test text if it ever reappears.\ns = s.replace('<div className="nyxtryp-auto-test">ПРИВЕТ</div>', '')\ns = s.replace('ПРИВЕТ', '')\n\n# Current layout: move the existing L/R VU windows above the existing bar spectrum.\ncanvas_marker = '          <canvas ref={canvasRef} className="tracks-visualizer" width={1200} height={240}/>'\nvu_marker = '          <div className="nyx-vu"><div className="nyx-meter"><Meter channel="L" value={leftVU}/></div><div className="nyx-meter"><Meter channel="R" value={rightVU}/></div></div>'\n\nif canvas_marker not in s:\n    raise SystemExit("tracks-visualizer not found")\nif vu_marker not in s:\n    raise SystemExit("nyx-vu not found")\n\n# Idempotent reorder: VU first, spectrum second.\nold = canvas_marker + '\\n' + vu_marker\nnew = vu_marker + '\\n' + canvas_marker\nif old in s:\n    s = s.replace(old, new, 1)\nelse:\n    # If already in the requested order, leave the file unchanged.\n    if new not in s:\n        raise SystemExit("VU/spectrum layout pattern not found")\n\np.write_text(s)\nprint("NYXTRYP: moved L/R VU above spectrum")\n'''

p.write_text(s)
Path(".nyxtryp/command.py").write_text(original_command)
print("NYXTRYP: exact photo thumbnail sync patch applied and automation restored")
