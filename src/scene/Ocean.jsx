import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function Ocean() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current

    // =========================
    // BACKGROUND IMAGE
    // =========================

    const image = document.createElement('video')

    image.src = '/video/space.mp4'
    image.autoplay = true
    image.loop = true
    image.muted = true
    image.playsInline = true
    image.draggable = false

    Object.assign(image.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: 'center center',
      display: 'block',
      zIndex: '0',
    })

    mount.appendChild(image)

    // =========================
    // THREE.JS STAR FIELD
    // =========================

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    )

    camera.position.set(0, 0, 8)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
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

    Object.assign(renderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '1',
      pointerEvents: 'none',
    })

    mount.appendChild(renderer.domElement)

    // =========================
    // STARS
    // =========================

    const starCount = 3000

    const starPositions =
      new Float32Array(starCount * 3)

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3

      const radius =
        2 + Math.random() * 18

      const angle =
        Math.random() * Math.PI * 2

      starPositions[i3] =
        Math.cos(angle) * radius

      starPositions[i3 + 1] =
        Math.random() * 7

      starPositions[i3 + 2] =
        Math.random() * 2
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
        size: 0.018,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      })

    const stars =
      new THREE.Points(
        starGeometry,
        starMaterial
      )

    scene.add(stars)

    // =========================
    // ANIMATION
    // =========================

    const clock = new THREE.Clock()

    let animationId

    const animate = () => {
      const elapsed =
        clock.getElapsedTime()

      stars.rotation.y =
        elapsed * 0.0015

      renderer.render(
        scene,
        camera
      )

      animationId =
        requestAnimationFrame(
          animate
        )
    }

    animate()

    // =========================
    // RESIZE
    // =========================

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

    // =========================
    // CLEANUP
    // =========================

    return () => {
      window.removeEventListener(
        'resize',
        handleResize
      )

      cancelAnimationFrame(
        animationId
      )

      renderer.dispose()
      starGeometry.dispose()
      starMaterial.dispose()

      if (mount.contains(image)) {
        mount.removeChild(image)
      }

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
