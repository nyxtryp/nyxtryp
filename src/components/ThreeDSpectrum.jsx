import { useEffect, useRef } from "react"
import * as THREE from "three"

export default function ThreeDSpectrum({ splitRef, playing }) {
  const mountRef = useRef(null)
  const stateRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(0, 5.2, 17)
    camera.lookAt(0, 1.2, 0)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x4b5f91, 1.2))
    const key = new THREE.DirectionalLight(0x8edbff, 2.8)
    key.position.set(-4, 8, 10)
    scene.add(key)
    const rim = new THREE.PointLight(0x7b38ff, 8, 25)
    rim.position.set(0, 3, -2)
    scene.add(rim)

    const bars = []
    const group = new THREE.Group()
    group.position.y = -2.35
    scene.add(group)
    const geometry = new THREE.BoxGeometry(0.235, 1, 0.72)
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x45bfff, emissive: 0x102d55, emissiveIntensity: 1.15, metalness: 0.55, roughness: 0.3 })
    const gap = 0.045
    const total = 64 * (0.235 + gap) - gap
    for (let i = 0; i < 64; i++) {
      const material = baseMaterial.clone()
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.x = -total / 2 + i * (0.235 + gap) + 0.1175
      mesh.position.z = 0
      mesh.scale.y = 0.05
      group.add(mesh)
      bars.push(mesh)
    }

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 10), new THREE.MeshStandardMaterial({ color: 0x02040a, metalness: 0.65, roughness: 0.4, transparent: true, opacity: 0.72 }))
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -2.9
    floor.position.z = 0
    scene.add(floor)

    const resize = () => {
      const w = mount.clientWidth || 600
      const h = mount.clientHeight || 180
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    const dataL = new Uint8Array(512)
    const dataR = new Uint8Array(512)
    const smooth = new Float32Array(64)
    const clock = new THREE.Clock()
    let raf = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      const split = splitRef?.current
      if (split) {
        split.left.getByteFrequencyData(dataL)
        split.right.getByteFrequencyData(dataR)
        for (let i = 0; i < 64; i++) {
          const center = Math.floor(Math.pow(i / 63, 1.72) * 500)
          const width = Math.max(2, Math.floor(2 + i * 0.75))
          let sum = 0
          let count = 0
          for (let j = Math.max(0, center - width); j <= Math.min(511, center + width); j++) {
            sum += (dataL[j] + dataR[j]) / 510
            count++
          }
          const raw = Math.pow(sum / Math.max(1, count), 0.82)
          smooth[i] += (raw - smooth[i]) * (raw > smooth[i] ? 0.28 : 0.095)
          const target = playing ? Math.max(0.055, smooth[i] * 5.5) : 0.055
          const height = Math.min(8.2, target)
          bars[i].scale.y += (height - bars[i].scale.y) * 0.22
          bars[i].position.y = bars[i].scale.y * 0.5
          const energy = Math.min(1, smooth[i] * 2.2)
          bars[i].material.emissiveIntensity = 0.7 + energy * 2.6
          bars[i].material.color.setHSL(0.55 + i / 64 * 0.08, 0.78, 0.48 + energy * 0.16)
          bars[i].rotation.y = Math.sin(t * 0.55 + i * 0.11) * 0.035
        }
      }
      group.rotation.y = Math.sin(t * 0.16) * 0.035
      group.rotation.x = -0.055 + Math.sin(t * 0.2) * 0.012
      renderer.render(scene, camera)
    }
    stateRef.current = { renderer, ro, raf }
    animate()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      geometry.dispose()
      baseMaterial.dispose()
      floor.geometry.dispose()
      floor.material.dispose()
      bars.forEach(b => b.material.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={mountRef} className="tracks-3d-visualizer" aria-label="3D audio spectrum" />
}
