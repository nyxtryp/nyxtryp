from pathlib import Path

p = Path("src/components/AdminPanel.jsx")
s = p.read_text()

old = '''    setBusy(true)\n    setError('')\n    setProgress({ total: selected.length, current: 0, step: 'prepare', name: selected[0].name })\n    setStatus('1/4 · ЧТЕНИЕ ФАЙЛА')\n\n    let captured\n    try {\n      captured = await Promise.all(selected.map(async original => {\n        try {\n          const buffer = await original.arrayBuffer()\n          return {\n            original,\n            file: new File([buffer], original.name, { type: original.type || 'application/octet-stream', lastModified: original.lastModified || Date.now() })\n          }\n        } catch (error) {\n          throw new Error(`Не удалось получить доступ к файлу «${original.name}»: ${error?.message || 'ошибка чтения'}`)\n        }\n      }))\n    } catch (e) {\n      setError(e.message || 'Ошибка чтения файла')\n      setStatus('ОШИБКА ЗАГРУЗКИ')\n      setBusy(false)\n      inputElement.value = ''\n      return\n    }\n\n    setStatus('1/4 · ПОДГОТОВКА')\n    try {\n      for (let i = 0; i < captured.length; i += 1) {\n        const original = captured[i].file\n'''

new = '''    setBusy(true)\n    setError('')\n    setProgress({ total: selected.length, current: 0, step: 'prepare', name: selected[0].name })\n    setStatus('1/4 · ПОДГОТОВКА')\n\n    try {\n      for (let i = 0; i < selected.length; i += 1) {\n        const original = selected[i]\n'''

if old not in s:
    raise SystemExit('duplicate file buffering block not found')
s = s.replace(old, new, 1)

old2 = '''    } catch (e) {\n      setError(e.message || 'Ошибка сохранения')\n      setStatus('ОШИБКА ЗАГРУЗКИ')\n    } finally {\n      setBusy(false)\n      inputElement.value = ''\n    }\n'''
new2 = '''    } catch (e) {\n      setError(e.message || 'Ошибка сохранения')\n      setStatus('ОШИБКА ЗАГРУЗКИ')\n    } finally {\n      setBusy(false)\n      inputElement.value = ''\n    }\n'''
if old2 not in s:
    raise SystemExit('upload catch/finally block not found')

p.write_text(s)
print('NYXTRYP: removed duplicate audio file buffering from admin upload')

# Restore permanent automation command exactly after applying the targeted patch.
Path('.nyxtryp/command.py').write_text('''from pathlib import Path\n\np = Path("src/components/TracksPlayer.jsx")\ns = p.read_text()\n\n# Remove temporary test text if it ever reappears.\ns = s.replace('<div className="nyxtryp-auto-test">ПРИВЕТ</div>', '')\ns = s.replace('ПРИВЕТ', '')\n\n# Current layout: move the existing L/R VU windows above the existing bar spectrum.\ncanvas_marker = '          <canvas ref={canvasRef} className="tracks-visualizer" width={1200} height={240}/>'\nvu_marker = '          <div className="nyx-vu"><div className="nyx-meter"><Meter channel="L" value={leftVU}/></div><div className="nyx-meter"><Meter channel="R" value={rightVU}/></div></div>'\n\nif canvas_marker not in s:\n    raise SystemExit("tracks-visualizer not found")\nif vu_marker not in s:\n    raise SystemExit("nyx-vu not found")\n\n# Idempotent reorder: VU first, spectrum second.\nold = canvas_marker + '\\n' + vu_marker\nnew = vu_marker + '\\n' + canvas_marker\nif old in s:\n    s = s.replace(old, new, 1)\nelse:\n    # If already in the requested order, leave the file unchanged.\n    if new not in s:\n        raise SystemExit("VU/spectrum layout pattern not found")\n\np.write_text(s)\nprint("NYXTRYP: moved L/R VU above spectrum")\n''')
