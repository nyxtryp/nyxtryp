import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function Ocean() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x02050a)
    scene.fog = new THREE.FogExp2(0x02050a, 0.018)

    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    )

    camera.position.set(0, 8, 28)
    camera.rotation.x = -0.08

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    })

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace

    mount.appendChild(renderer.domElement)

    // LIGHT
    const ambientLight = new THREE.AmbientLight(0x7b8da8, 0.35)
    scene.add(ambientLight)

    const moonLight = new THREE.PointLight(0x8fb7ff, 25, 180)
    moonLight.position.set(-35, 35, -80)
    scene.add(moonLight)

    // OCEAN
    const oceanGeometry = new THREE.PlaneGeometry(
      500,
      500,
      180,
      180
    )

    const oceanMaterial = new THREE.MeshStandardMaterial({
      color: 0x06131b,
      roughness: 0.2,
      metalness: 0.35,
      wireframe: false,
    })

    const ocean = new THREE.Mesh(
      oceanGeometry,
      oceanMaterial
    )

    ocean.rotation.x = -Math.PI / 2
    ocean.position.y = -2
    scene.add(ocean)

    // MOON / PLANET
    const moonGeometry = new THREE.SphereGeometry(18, 64, 64)

    const moonMaterial = new THREE.MeshStandardMaterial({
      color: 0x8797ad,
      roughness: 0.9,
      metalness: 0.05,
    })

    const moon = new THREE.Mesh(
      moonGeometry,
      moonMaterial
    )

    moon.position.set(-35, 32, -90)
    scene.add(moon)

    // MOON ATMOSPHERE
    const atmosphereGeometry = new THREE.SphereGeometry(
      18.8,
      64,
      64
    )

    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x6fa8ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    })

    const atmosphere = new THREE.Mesh(
      atmosphereGeometry,
      atmosphereMaterial
    )

    atmosphere.position.copy(moon.position)
    scene.add(atmosphere)

    // STARS
    const starCount = 3000
    const starPositions = new Float32Array(starCount * 3)

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3

      starPositions[i3] =
        (Math.random() - 0.5) * 1200

      starPositions[i3 + 1] =
        Math.random() * 500 - 50

      starPositions[i3 + 2] =
        (Math.random() - 0.5) * 1200
    }

    const starGeometry = new THREE.BufferGeometry()

    starGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        starPositions,
        3
      )
    )

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.7,
      transparent: true,
      opacity: 0.8,
    })

    const stars = new THREE.Points(
      starGeometry,
      starMaterial
    )

    scene.add(stars)

    // ANIMATION
    const clock = new THREE.Clock()

    const animate = () => {
      const elapsed = clock.getElapsedTime()

      const positions =
        oceanGeometry.attributes.position.array

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i]
        const y = positions[i + 1]

        positions[i + 2] =
          Math.sin(x * 0.035 + elapsed * 0.8) * 0.45 +
          Math.sin(y * 0.025 + elapsed * 0.55) * 0.35 +
          Math.sin(
            (x + y) * 0.015 +
              elapsed * 0.35
          ) * 0.25
      }

      oceanGeometry.attributes.position.needsUpdate = true

      stars.rotation.y = elapsed * 0.002

      renderer.render(scene, camera)

      requestAnimationFrame(animate)
    }

    animate()

    // RESIZE
    const handleResize = () => {
      camera.aspect =
        window.innerWidth / window.innerHeight

      camera.updateProjectionMatrix()

      renderer.setSize(
        window.innerWidth,
        window.innerHeight
      )

      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
      )
    }

    window.addEventListener(
      'resize',
      handleResize
    )

    return () => {
      window.removeEventListener(
        'resize',
        handleResize
      )

      renderer.dispose()

      oceanGeometry.dispose()
      oceanMaterial.dispose()

      moonGeometry.dispose()
      moonMaterial.dispose()

      atmosphereGeometry.dispose()
      atmosphereMaterial.dispose()

      starGeometry.dispose()
      starMaterial.dispose()

      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={mountRef}
      className="ocean-scene"
    />
  )
}
