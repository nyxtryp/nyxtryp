from pathlib import Path

# Temporary one-shot gallery repair. The original command file is restored
# before the workflow commits, so the existing automation file is unchanged.
path = Path('src/scene/planets/PlanetField.jsx')
text = path.read_text()

old_fetch = '''              if (photos.length) {
                index = Math.min(index, photos.length - 1)
                update()
              }
'''
new_fetch = '''              if (photos.length) {
                index = Math.min(index, photos.length - 1)
                syncThumbs()
                update()
              }
'''
if old_fetch not in text:
    raise SystemExit('fetch block not found')
text = text.replace(old_fetch, new_fetch, 1)

old_update = '''          const update = () => {
            image.src = photos[index]

            thumbList.forEach((t, i) => {
              t.style.opacity = i === index ? "1" : "0.45"
              t.style.borderColor =
                i === index
                  ? "rgba(255,255,255,0.95)"
                  : "rgba(255,255,255,0.25)"
            })

            if (thumbList[index]) {
              thumbList[index].scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center"
              })
            }
          }

          photos.forEach((src, i) => {
            const t = document.createElement("button")

            Object.assign(t.style, {
              flex: "0 0 72px",
              width: "72px",
              height: "62px",
              padding: "0",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "#080808",
              overflow: "hidden",
              cursor: "pointer",
              opacity: "0.45"
            })

            const ti = document.createElement("img")
            ti.src = src

            Object.assign(ti.style, {
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block"
            })

            t.appendChild(ti)

            t.onclick = () => {
              index = i
              update()
            }

            thumbs.appendChild(t)
            thumbList.push(t)
          })
'''
new_update = '''          const syncThumbs = () => {
            thumbs.innerHTML = ""
            thumbList.length = 0

            photos.forEach((src, i) => {
              const t = document.createElement("button")

              Object.assign(t.style, {
                flex: "0 0 72px",
                width: "72px",
                height: "62px",
                padding: "0",
                border: "1px solid rgba(255,255,255,0.25)",
                background: "#080808",
                overflow: "hidden",
                cursor: "pointer",
                opacity: "0.45"
              })

              const ti = document.createElement("img")
              ti.src = src

              Object.assign(ti.style, {
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block"
              })

              t.appendChild(ti)

              t.onclick = () => {
                index = i
                update()
              }

              thumbs.appendChild(t)
              thumbList.push(t)
            })
          }

          const update = () => {
            image.src = photos[index]

            thumbList.forEach((t, i) => {
              t.style.opacity = i === index ? "1" : "0.45"
              t.style.borderColor =
                i === index
                  ? "rgba(255,255,255,0.95)"
                  : "rgba(255,255,255,0.25)"
            })

            if (thumbList[index]) {
              thumbList[index].scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center"
              })
            }
          }

          syncThumbs()
'''
if old_update not in text:
    raise SystemExit('thumbnail block not found')
text = text.replace(old_update, new_update, 1)
path.write_text(text)
print('Gallery thumbnail sync patched')

# Restore the original automation command before the workflow commits.
Path('.nyxtryp/command.py').write_text('''from pathlib import Path

p = Path("src/components/TracksPlayer.jsx")
s = p.read_text()

# Remove temporary test text if it ever reappears.
s = s.replace('<div className="nyxtryp-auto-test">ПРИВЕТ</div>', '')
s = s.replace('ПРИВЕТ', '')

# Current layout: move the existing L/R VU windows above the existing bar spectrum.
canvas_marker = '          <canvas ref={canvasRef} className="tracks-visualizer" width={1200} height={240}/>'
vu_marker = '          <div className="nyx-vu"><div className="nyx-meter"><Meter channel="L" value={leftVU}/></div><div className="nyx-meter"><Meter channel="R" value={rightVU}/></div></div>'

if canvas_marker not in s:
    raise SystemExit("tracks-visualizer not found")
if vu_marker not in s:
    raise SystemExit("nyx-vu not found")

# Idempotent reorder: VU first, spectrum second.
old = canvas_marker + '\\n' + vu_marker
new = vu_marker + '\\n' + canvas_marker
if old in s:
    s = s.replace(old, new, 1)
else:
    # If already in the requested order, leave the file unchanged.
    if new not in s:
        raise SystemExit("VU/spectrum layout pattern not found")

p.write_text(s)
print("NYXTRYP: moved L/R VU above spectrum")
''')
