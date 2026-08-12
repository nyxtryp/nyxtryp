import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function Ocean() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020711)

    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    )

    camera.position.set(0, 9, 30)
    camera.lookAt(0, -2, -100)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    })

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
    )

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    )

    renderer.outputColorSpace =
      THREE.SRGBColorSpace

    mount.appendChild(renderer.domElement)

    // ─────────────────────────
    // LIGHT
    // ─────────────────────────

    const ambientLight =
      new THREE.AmbientLight(
        0x7890aa,
        1.2
      )

    scene.add(ambientLight)

    const moonLight =
      new THREE.DirectionalLight(
        0x7fa8ff,
        3
      )

    moonLight.position.set(
      -30,
      40,
      -60
    )

    scene.add(moonLight)

    // ─────────────────────────
    // OCEAN
    // ─────────────────────────

    const oceanGeometry =
      new THREE.PlaneGeometry(
        600,
        600,
        220,
        220
      )

    const oceanMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x073b52,
        roughness: 0.18,
        metalness: 0.55,
        side: THREE.DoubleSide,
      })

    const ocean =
      new THREE.Mesh(
        oceanGeometry,
        oceanMaterial
      )

    ocean.rotation.x =
      -Math.PI / 2

    ocean.position.y = -3

    scene.add(ocean)

    // ─────────────────────────
    // MOON
    // ─────────────────────────

    const moonGeometry =
      new THREE.SphereGeometry(
        22,
        64,
        64
      )

    const moonMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x9db6d8,
        roughness: 0.8,
        metalness: 0.05,
      })

    const moon =
      new THREE.Mesh(
        moonGeometry,
        moonMaterial
      )

    moon.position.set(
      -35,
      30,
      -110
    )

    scene.add(moon)

    // ─────────────────────────
    // MOON GLOW
    // ─────────────────────────

    const glowGeometry =
      new THREE.SphereGeometry(
        24,
        64,
        64
      )

    const glowMaterial =
      new THREE.MeshBasicMaterial({
        color: 0x5c91d9,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide,
      })

    const glow =
      new THREE.Mesh(
        glowGeometry,
        glowMaterial
      )

    glow.position.copy(
      moon.position
    )

    scene.add(glow)

    // ─────────────────────────
    // STARS
    // ─────────────────────────

    const starCount = 3500

    const starPositions =
      new Float32Array(
        starCount * 3
      )

    for (
      let i = 0;
      i < starCount;
      i++
    ) {
      const i3 = i * 3

      starPositions[i3] =
        (Math.random() - 0.5) *
        1200

      starPositions[i3 + 1] =
        Math.random() * 500

      starPositions[i3 + 2] =
        (Math.random() - 0.5) *
        1200
    }

    const starGeometry =
      new THREE.BufferGeometry()

    starGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        starPositions,
        3
      )
    )

    const starMaterial =
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.8,
        transparent: true,
        opacity: 0.9,
      })

    const stars =
      new THREE.Points(
        starGeometry,
        starMaterial
      )

    scene.add(stars)

    // ─────────────────────────
    // ANIMATION
    // ─────────────────────────

    const clock =
      new THREE.Clock()

    const animate = () => {
      const elapsed =
        clock.getElapsedTime()

      const positions =
        oceanGeometry.attributes
          .position.array

      for (
        let i = 0;
        i < positions.length;
        i += 3
      ) {
        const x = positions[i]
        const y = positions[i + 1]

        positions[i + 2] =
          Math.sin(
            x * 0.035 +
              elapsed * 0.8
          ) * 0.7 +
          Math.sin(
            y * 0.025 +
              elapsed * 0.55
          ) * 0.45 +
          Math.sin(
            (x + y) * 0.015 +
              elapsed * 0.35
          ) * 0.3
      }

      oceanGeometry.attributes
        .position.needsUpdate = true

      stars.rotation.y =
        elapsed * 0.002

      renderer.render(
        scene,
        camera
      )

      requestAnimationFrame(
        animate
      )
    }

    animate()

    // ─────────────────────────
    // RESIZE
    // ─────────────────────────

    const handleResize = () => {
      camera.aspect =
        window.innerWidth /
        window.innerHeight

      camera.updateProjectionMatrix()

      renderer.setSize(
        window.innerWidth,
        window.innerHeight
      )

      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio,
          2
        )
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

      glowGeometry.dispose()
      glowMaterial.dispose()

      starGeometry.dispose()
      starMaterial.dispose()

      if (
        mount.contains(
          renderer.domElement
        )
      ) {
        mount.removeChild(
          renderer.domElement
        )
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
