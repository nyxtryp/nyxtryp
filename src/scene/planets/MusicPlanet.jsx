import { useEffect, useRef } from "react"
import * as THREE from "three"

export default function MusicPlanet() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(35, el.clientWidth / el.clientHeight, 0.1, 100)
    camera.position.z = 4.5

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    const light = new THREE.DirectionalLight(0xffffff, 3)
    light.position.set(-3, 2, 5)
    scene.add(light)
    scene.add(new THREE.AmbientLight(0xffffff, 0.15))

    const texture = new THREE.TextureLoader().load("/textures/textura.jpg")
    texture.colorSpace = THREE.SRGBColorSpace

    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 96),
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8
      })
    )

    scene.add(planet)

    const animate = () => {
      planet.rotation.y += 0.0007
      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    resize()
    window.addEventListener("resize", resize)
    animate()

    return () => {
      window.removeEventListener("resize", resize)
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={ref} className="music-planet" />
}
