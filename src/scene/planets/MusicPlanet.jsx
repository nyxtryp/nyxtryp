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

    const light = new THREE.DirectionalLight(0xffffff, 1.8)
    light.position.set(-3, 2, 5)
    scene.add(light)
    scene.add(new THREE.AmbientLight(0xffffff, 0.65))

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

    // ============================================================
    // EARTH ATMOSPHERE — ray/atmosphere intersection
    // ============================================================

    const atmosphereMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,

      uniforms: {
        sunDirection: {
          value: new THREE.Vector3(-3, 2, 5).normalize()
        },
        innerRadius: { value: 1.0 },
        outerRadius: { value: 1.28 }
      },

      vertexShader: `
        varying vec3 vWorldPosition;

        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;

          gl_Position =
            projectionMatrix *
            viewMatrix *
            wp;
        }
      `,

      fragmentShader: `
        uniform vec3 sunDirection;
        uniform float innerRadius;
        uniform float outerRadius;

        varying vec3 vWorldPosition;

        bool raySphere(
          vec3 origin,
          vec3 direction,
          float radius,
          out float nearHit,
          out float farHit
        ) {
          float b = dot(origin, direction);
          float c = dot(origin, origin) - radius * radius;
          float h = b * b - c;

          if (h < 0.0) return false;

          h = sqrt(h);
          nearHit = -b - h;
          farHit = -b + h;

          return farHit > 0.0;
        }

        void main() {

          vec3 ray =
            normalize(vWorldPosition - cameraPosition);

          float atmosphereNear;
          float atmosphereFar;

          if (!raySphere(
            cameraPosition,
            ray,
            outerRadius,
            atmosphereNear,
            atmosphereFar
          )) {
            discard;
          }

          atmosphereNear =
            max(atmosphereNear, 0.0);

          // Find where the viewing ray reaches Earth.
          float planetNear;
          float planetFar;

          bool hitsPlanet =
            raySphere(
              cameraPosition,
              ray,
              innerRadius,
              planetNear,
              planetFar
            );

          float endDistance =
            atmosphereFar;

          if (hitsPlanet &&
              planetNear > atmosphereNear) {
            endDistance = planetNear;
          }

          float segment =
            max(
              endDistance - atmosphereNear,
              0.0
            );

          // Several integration samples through the atmosphere.
          const int STEPS = 8;

          float stepSize =
            segment / float(STEPS);

          vec3 scattering =
            vec3(0.0);

          float opticalDepth = 0.0;

          for (int i = 0; i < STEPS; i++) {

            float t =
              atmosphereNear +
              (float(i) + 0.5) * stepSize;

            vec3 samplePosition =
              cameraPosition +
              ray * t;

            float height =
              length(samplePosition) - innerRadius;

            float normalizedHeight =
              clamp(
                height /
                (outerRadius - innerRadius),
                0.0,
                1.0
              );

            // Exponential density falloff.
            float density =
              exp(
                -normalizedHeight * 5.5
              );

            opticalDepth +=
              density * stepSize;

            vec3 toSun =
              normalize(sunDirection);

            float sunAngle =
              max(
                dot(
                  normalize(samplePosition),
                  toSun
                ),
                0.0
              );

            // Rayleigh scattering.
            float rayleigh =
              1.0 +
              sunAngle * sunAngle;

            vec3 rayleighColor =
              vec3(
                0.16,
                0.46,
                1.0
              );

            // Mie-like forward scattering.
            float viewSun =
              max(
                dot(ray, toSun),
                0.0
              );

            float mie =
              pow(viewSun, 10.0);

            vec3 mieColor =
              vec3(
                0.55,
                0.75,
                1.0
              );

            scattering +=
              density *
              (
                rayleighColor * rayleigh +
                mieColor * mie * 0.35
              ) *
              stepSize;
          }

          // Convert integrated scattering to soft opacity.
          float alpha =
            1.0 -
            exp(
              -opticalDepth * 1.35
            );

          // Keep the atmosphere subtle but visible.
          alpha *= 0.72;

          vec3 color =
            scattering /
            max(
              opticalDepth,
              0.0001
            );

          color =
            clamp(
              color,
              vec3(0.0),
              vec3(1.0)
            );

          gl_FragColor =
            vec4(color, alpha);
        }
      `
    })

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(
        1.075,
        128,
        128
      ),
      atmosphereMaterial
    )

    scene.add(atmosphere)


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
