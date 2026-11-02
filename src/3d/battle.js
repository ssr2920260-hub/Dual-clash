import * as THREE from 'three'

export function createBattleScene() {
  const host = document.getElementById('arena3d')
  if (!host) return { start(){}, finish(){}, reset(){} }

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x080d19)
  scene.fog = new THREE.Fog(0x080d19, 9, 20)

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0, 4.3, 10.5)
  camera.lookAt(0, 1.5, 0)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  })

  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.appendChild(renderer.domElement)

  scene.add(new THREE.HemisphereLight(0x9fcaff, 0x182033, 2))

  const blueLight = new THREE.PointLight(0x168aff, 65, 9)
  blueLight.position.set(-3, 3, 2)
  scene.add(blueLight)

  const redLight = new THREE.PointLight(0xff263f, 65, 9)
  redLight.position.set(3, 3, 2)
  scene.add(redLight)

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(4.4, 4.4, 0.25, 64),
    new THREE.MeshStandardMaterial({
      color: 0x15243d,
      metalness: 0.75,
      roughness: 0.4
    })
  )
  floor.position.y = -0.15
  floor.receiveShadow = true
  scene.add(floor)

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.5, 0.035, 8, 90),
    new THREE.MeshBasicMaterial({ color: 0x315a91 })
  )
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.01
  scene.add(ring)

  function material(color, metalness = 0.55) {
    return new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness: 0.3
    })
  }

  function box(parent, size, mat, pos) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      mat
    )
    mesh.position.set(...pos)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  function sphere(parent, size, mat, pos) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 20, 16),
      mat
    )
    mesh.position.set(...pos)
    mesh.castShadow = true
    parent.add(mesh)
    return mesh
  }

  function limb(parent, a, b, radius, mat) {
    const start = new THREE.Vector3(...a)
    const end = new THREE.Vector3(...b)
    const direction = new THREE.Vector3().subVectors(end, start)
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.78, radius, direction.length(), 12),
      mat
    )
    mesh.position.copy(start).add(end).multiplyScalar(0.5)
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    )
    mesh.castShadow = true
    parent.add(mesh)
    return mesh
  }

  function makeWarrior(color, glow, x, facing) {
    const root = new THREE.Group()
    root.position.set(x, 0, 0)
    root.rotation.y = facing
    scene.add(root)

    const armor = material(color, 0.8)
    const dark = material(0x101827, 0.7)
    const metal = material(0xb9d5e9, 0.9)
    const energy = new THREE.MeshStandardMaterial({
      color: glow,
      emissive: glow,
      emissiveIntensity: 2
    })

    const body = new THREE.Group()
    body.position.y = 1.65
    root.add(body)

    // Armour torso
    box(body, [0.76, 0.95, 0.42], armor, [0, 0, 0])
    box(body, [0.52, 0.16, 0.46], dark, [0, -0.52, 0])
    box(body, [0.56, 0.12, 0.45], energy, [0, 0.05, 0.23])

    // Chest armour plates
    for (const side of [-1, 1]) {
      const plate = box(body, [0.34, 0.38, 0.12], armor, [side * 0.2, 0.18, 0.25])
      plate.rotation.z = side * -0.12
    }

    // Neck and helmet
    limb(body, [0, 0.48, 0], [0, 0.67, 0], 0.13, dark)
    sphere(body, 0.32, armor, [0, 0.88, 0])
    box(body, [0.48, 0.13, 0.12], dark, [0, 0.84, 0.27])
    box(body, [0.32, 0.045, 0.04], energy, [0, 0.84, 0.34])

    // Helmet crest
    const crest = box(body, [0.08, 0.35, 0.12], energy, [0, 1.18, 0])
    crest.rotation.z = -0.2

    // Arms with pivots
    const arms = []
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group()
      shoulder.position.set(side * 0.48, 0.32, 0)
      body.add(shoulder)

      sphere(shoulder, 0.2, armor, [0, 0, 0])
      limb(shoulder, [0, 0, 0], [side * 0.12, -0.42, 0.04], 0.14, armor)
      sphere(shoulder, 0.14, dark, [side * 0.12, -0.43, 0.04])
      limb(shoulder, [side * 0.12, -0.43, 0.04], [side * 0.18, -0.78, 0.08], 0.11, armor)
      sphere(shoulder, 0.13, dark, [side * 0.18, -0.8, 0.08])
      arms.push(shoulder)
    }

    // Legs
    const legs = []
    for (const side of [-1, 1]) {
      const hip = new THREE.Group()
      hip.position.set(side * 0.23, -0.55, 0)
      body.add(hip)

      limb(hip, [0, 0, 0], [0, -0.53, 0], 0.17, armor)
      sphere(hip, 0.16, dark, [0, -0.54, 0])
      limb(hip, [0, -0.53, 0], [0, -1.02, 0.03], 0.13, dark)
      box(hip, [0.28, 0.14, 0.4], armor, [0, -1.08, 0.1])
      legs.push(hip)
    }

    // Sword: blade, guard and handle
    const swordPivot = new THREE.Group()
    swordPivot.position.set(0.18, -0.8, 0.08)
    arms[1].add(swordPivot)

    limb(swordPivot, [0, 0, 0], [0, -0.3, 0], 0.065, dark)
    box(swordPivot, [0.12, 0.09, 0.12], energy, [0, -0.32, 0])
    limb(swordPivot, [0, -0.32, 0], [0, -1.22, 0], 0.075, metal)
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.075, 0.25, 4),
      energy
    )
    blade.position.set(0, -1.32, 0)
    swordPivot.add(blade)

    return { root, body, arms, legs, swordPivot, x, phase: Math.random() * 6 }
  }

  const blue = makeWarrior(0x087bff, 0x36dfff, -1.55, 0.32)
  const red = makeWarrior(0xc51b35, 0xff5268, 1.55, Math.PI - 0.32)

  // Sparks at sword contact
  const sparks = []
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffdf82 })
  for (let i = 0; i < 18; i++) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 6, 6),
      sparkMat
    )
    spark.visible = false
    scene.add(spark)
    sparks.push(spark)
  }


  let mode = 'fight'
  let startTime = performance.now()
  let fallTime = 0
  let loser = null
  let winner = null
  let lastClash = 0
  let lastBurst = -10

  function burst(x, y, z, count = 18) {
    for (let i = 0; i < sparks.length; i++) {
      if (i >= count) break

      const spark = sparks[i]
      spark.visible = true
      spark.position.set(
        x + (Math.random() - 0.5) * 0.5,
        y + (Math.random() - 0.5) * 0.5,
        z + (Math.random() - 0.5) * 0.5
      )

      spark.userData.vx = (Math.random() - 0.5) * 5
      spark.userData.vy = Math.random() * 5
      spark.userData.vz = (Math.random() - 0.5) * 3
      spark.userData.life = 0.55 + Math.random() * 0.35
    }
  }

  function reset() {
    mode = 'fight'
    startTime = performance.now()
    fallTime = 0
    loser = null
    winner = null
    lastClash = -10
    lastBurst = -10

    blue.root.position.set(-1.55, 0, 0)
    red.root.position.set(1.55, 0, 0)

    for (const fighter of [blue, red]) {
      fighter.root.rotation.z = 0
      fighter.body.position.y = 1.65
      fighter.body.rotation.set(0, 0, 0)

      fighter.arms.forEach(a => a.rotation.set(0, 0, 0))
      fighter.legs.forEach(l => l.rotation.set(0, 0, 0))
      fighter.swordPivot.rotation.set(0, 0, 0)
      fighter.swordPivot.visible = true
    }

    sparks.forEach(s => s.visible = false)
    blueLight.intensity = 65
    redLight.intensity = 65
  }

  function start() {
    reset()
  }

  function finish(result) {
    if (mode !== 'fight') return

    mode = 'finish'
    fallTime = performance.now()

    winner = result === 'Pulse' ? blue :
             result === 'Blade' ? red : null

    loser = result === 'Pulse' ? red :
            result === 'Blade' ? blue : null

    burst(0, 1.7, 0, 18)
  }

  function resize() {
    const w = host.clientWidth
    const h = host.clientHeight
    if (!w || !h) return

    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
  }

  new ResizeObserver(resize).observe(host)
  resize()

  const clock = new THREE.Clock()

  function smooth(a, b, x) {
    const v = Math.max(0, Math.min(1, (x - a) / (b - a)))
    return v * v * (3 - 2 * v)
  }

  function animate() {
    requestAnimationFrame(animate)

    const t = clock.getElapsedTime()
    const dt = Math.min(clock.getDelta(), 0.05)

    // Animate flying impact sparks
    for (const spark of sparks) {
      if (!spark.visible) continue

      const v = spark.userData
      v.life -= dt

      if (v.life <= 0) {
        spark.visible = false
        continue
      }

      spark.position.x += v.vx * dt
      spark.position.y += v.vy * dt
      spark.position.z += v.vz * dt
      v.vy -= 8 * dt
      spark.scale.setScalar(Math.max(0.1, v.life))
    }

    if (mode === 'fight') {
      // Exactly 35 seconds from round start
      const elapsed = Math.min(35, (performance.now() - startTime) / 1000)

      let approach = 0
      let intensity = 1

      if (elapsed < 7) {
        // PHASE 1: Circle, sidestep and overhead slash
        const wave = elapsed * 2.5

        for (const fighter of [blue, red]) {
          const side = fighter === blue ? 1 : -1
          const offset = fighter.phase

          fighter.root.position.x =
            fighter.x + side * Math.sin(wave + offset) * 0.24

          fighter.body.position.y =
            1.65 + Math.abs(Math.sin(t * 5 + offset)) * 0.09

          fighter.body.rotation.z =
            Math.sin(wave + offset) * 0.1

          fighter.arms[0].rotation.z =
            Math.sin(t * 3 + offset) * 0.3

          fighter.arms[1].rotation.z =
            -0.5 + Math.sin(t * 2.5 + offset) * 0.3

          fighter.swordPivot.rotation.x =
            Math.sin(t * 3 + offset) * 0.3

          fighter.swordPivot.rotation.z =
            Math.sin(t * 2 + offset) * 0.35

          fighter.legs[0].rotation.x =
            Math.sin(wave + offset) * 0.3

          fighter.legs[1].rotation.x =
            -Math.sin(wave + offset) * 0.3
        }

        // Blade overhead attack, Pulse dodges
        const attack = elapsed % 3

        if (attack > 1.2 && attack < 1.8) {
          red.arms[1].rotation.z = -1.65
          red.swordPivot.rotation.z = -1.5
          blue.root.position.x = -1.05
          blue.body.rotation.z = 0.32
          blue.body.position.y = 1.4
          blue.legs[0].rotation.z = 0.45
        }

        if (attack > 1.7 && attack < 2) {
          burst(-0.5, 1.2, 0, 12)
        }

      } else if (elapsed < 17) {
        // PHASE 2: Punch combinations, spin kicks and uppercuts
        const local = elapsed - 7
        const combo = local % 2.5

        for (const fighter of [blue, red]) {
          const side = fighter === blue ? 1 : -1
          const wave = local * 4 + fighter.phase

          fighter.root.position.x =
            fighter.x + side * (0.2 + Math.sin(wave) * 0.12)

          fighter.body.position.y =
            1.65 + Math.abs(Math.sin(wave * 1.4)) * 0.1

          fighter.body.rotation.z = Math.sin(wave) * 0.12

          fighter.arms[0].rotation.z =
            combo < 0.65 ? -1.45 :
            combo < 1.2 ? 1.15 :
            Math.sin(wave) * 0.35

          fighter.arms[1].rotation.z =
            combo > 0.65 && combo < 1.35 ? 1.5 :
            -0.45 + Math.sin(wave) * 0.3

          fighter.legs[0].rotation.x =
            combo > 1.35 && combo < 2 ? -1.0 :
            Math.sin(wave) * 0.25

          fighter.legs[1].rotation.x =
            combo > 1.35 && combo < 2 ? 0.8 :
            -Math.sin(wave) * 0.25

          fighter.swordPivot.rotation.z =
            Math.sin(wave * 1.3) * 0.55
        }

        if (combo > 0.55 && combo < 0.85 && t - lastClash > 0.65) {
          lastClash = t
          burst(0, 1.8, 0.3, 18)
        }

      } else if (elapsed < 30) {
        // PHASE 3: Heavy attacks and sword clashes
        const local = elapsed - 17
        const wave = local * 2.8

        approach = smooth(17, 23, elapsed) * 0.55

        for (const fighter of [blue, red]) {
          const side = fighter === blue ? 1 : -1

          fighter.root.position.x =
            fighter.x + side * approach

          fighter.body.position.y =
            1.65 + Math.abs(Math.sin(wave)) * 0.13

          fighter.body.rotation.z =
            Math.sin(wave) * 0.18

          fighter.arms[0].rotation.z =
            Math.sin(wave * 1.5 + fighter.phase) * 0.9

          fighter.arms[1].rotation.z =
            -0.9 + Math.sin(wave + fighter.phase) * 1.1

          fighter.swordPivot.rotation.z =
            Math.sin(wave * 1.2 + fighter.phase) * 1.1

          fighter.swordPivot.rotation.x =
            Math.sin(wave * 1.6) * 0.7

          fighter.legs[0].rotation.x =
            Math.sin(wave) * 0.35

          fighter.legs[1].rotation.x =
            -Math.sin(wave) * 0.35
        }

        // Repeated energy sword impacts
        const clashWindow = local % 2.3

        if (clashWindow < 0.22 && t - lastClash > 0.7) {
          lastClash = t
          burst(0, 1.9, 0.4, 18)
          blueLight.intensity = 110
          redLight.intensity = 110
        }

      } else {
        // PHASE 4: Final attack anticipation
        const local = elapsed - 30
        intensity = 1 + local * 0.25

        for (const fighter of [blue, red]) {
          const side = fighter === blue ? 1 : -1

          fighter.root.position.x =
            fighter.x + side * (0.55 + smooth(0, 4, local) * 0.25)

          fighter.body.position.y =
            1.65 + Math.sin(t * 9) * 0.035

          fighter.body.rotation.z =
            side * 0.12

          fighter.arms[0].rotation.z =
            -0.65 - smooth(0, 4, local) * 0.4

          fighter.arms[1].rotation.z =
            1.0 + Math.sin(t * 7) * 0.2

          fighter.swordPivot.rotation.z =
            side * 0.9 + Math.sin(t * 8) * 0.2

          fighter.legs[0].rotation.x = -0.3
          fighter.legs[1].rotation.x = 0.3
        }

        // Final explosion at countdown zero
        if (elapsed >= 34.7 && lastBurst < 0) {
          lastBurst = elapsed
          burst(0, 1.8, 0.4, 18)
          blueLight.intensity = 140
          redLight.intensity = 140
        }
      }

      if (elapsed < 30) {
        blueLight.intensity = 65
        redLight.intensity = 65
      }

    } else if (mode === 'finish') {
      const elapsed = (performance.now() - fallTime) / 1000

      if (loser) {
        const side = loser === blue ? 1 : -1

        // 0.00 - 0.20: Cinematic hit freeze
        if (elapsed < 0.2) {
          loser.body.rotation.z = side * 0.3
          loser.body.position.y = 1.65
        }

        // 0.20 - 0.85: Heavy recoil
        else if (elapsed < 0.85) {
          const p = smooth(0.2, 0.85, elapsed)

          loser.root.position.x +=
            0

          loser.root.rotation.z = side * p * 0.65
          loser.body.rotation.x = -p * 0.65
          loser.body.position.y = 1.65 - p * 0.2

          loser.arms[0].rotation.z = -side * p * 1.3
          loser.arms[1].rotation.z = side * p * 1.5
        }

        // 0.85 - 1.65: Knee-drop
        else if (elapsed < 1.65) {
          const p = smooth(0.85, 1.65, elapsed)

          loser.root.rotation.z = side * (0.65 + p * 0.35)
          loser.root.position.y = -p * 0.48

          loser.body.rotation.x = -0.65
          loser.body.position.y = 1.4 - p * 0.2

          loser.legs[0].rotation.z = -0.9
          loser.legs[1].rotation.z = 0.9

          loser.arms[0].rotation.z = -1.4
          loser.arms[1].rotation.z = 1.5
        }

        // 1.65 - 2.35: Fall and sword release
        else if (elapsed < 2.35) {
          const p = smooth(1.65, 2.35, elapsed)

          loser.root.rotation.z = side * (1 + p * 0.5)
          loser.root.position.y = -0.48 - p * 0.2

          loser.body.rotation.x = -0.8
          loser.legs.forEach((l, i) => {
            l.rotation.z = (i ? 1 : -1) * 1.1
          })

          loser.swordPivot.rotation.z = 1.4 + p * 0.8
          loser.swordPivot.position.y = -0.8 - p * 0.5
        }

        // 2.35 onwards: Neon shutdown
        else {
          loser.root.rotation.z = side * 1.5
          loser.root.position.y = -0.68
          loser.body.rotation.x = -0.8
          loser.swordPivot.visible = false

          loser.arms[0].rotation.z = -1.4
          loser.arms[1].rotation.z = 1.5
        }
      }

      if (winner) {
        // Winner victory pose
        const p = smooth(0.1, 1.0, elapsed)

        winner.body.position.y =
          1.65 + Math.sin(elapsed * 4) * 0.035

        winner.body.rotation.z = 0

        winner.arms[0].rotation.z = -1.25 * p
        winner.arms[1].rotation.z = 0.85 * p

        winner.swordPivot.rotation.z = -0.9 * p
        winner.legs[0].rotation.x = -0.12 * p
        winner.legs[1].rotation.x = 0.12 * p
      } else {
        // Tie: both robots recoil and kneel
        for (const fighter of [blue, red]) {
          fighter.body.rotation.x = -0.35
          fighter.body.position.y = 1.45
          fighter.arms[0].rotation.z = -0.8
          fighter.arms[1].rotation.z = 0.8
          fighter.legs[0].rotation.z = -0.45
          fighter.legs[1].rotation.z = 0.45
        }
      }

      // Dramatic fading arena lights
      const fade = Math.max(0.25, 1 - Math.max(0, elapsed - 1.5) * 0.3)
      blueLight.intensity = 65 * fade
      redLight.intensity = 65 * fade
    }

    renderer.render(scene, camera)
  }

  animate()
  return { start, finish, reset }

}
