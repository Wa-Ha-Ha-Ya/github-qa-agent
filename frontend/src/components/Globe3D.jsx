import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'

function Globe3D() {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // 场景
    const scene = new THREE.Scene()
    // 添加深空雾效果
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.002)

    // 相机
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 15

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0x000000, 0)
    canvasRef.current.appendChild(renderer.domElement)

    // 创建地球
    const earthGroup = new THREE.Group()
    scene.add(earthGroup)

    // 地球主体
    const earthGeometry = new THREE.SphereGeometry(4, 64, 64)
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a3a,
      emissive: 0x0a0a2a,
      emissiveIntensity: 0.2,
      shininess: 10,
    })
    const earth = new THREE.Mesh(earthGeometry, earthMaterial)
    earthGroup.add(earth)

    // 大气层光晕
    const atmosphereGeometry = new THREE.SphereGeometry(4.2, 64, 64)
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    })
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
    earthGroup.add(atmosphere)

    // 蓝色发光层
    const glowGeometry = new THREE.SphereGeometry(3.8, 64, 64)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    earthGroup.add(glow)

    // 添加网格线（科技感）
    const wireframeGeometry = new THREE.WireframeGeometry(new THREE.SphereGeometry(4.1, 32, 32))
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.08,
    })
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial)
    earthGroup.add(wireframe)

    // 添加一些随机发光点（代表城市）
    const citiesGeometry = new THREE.BufferGeometry()
    const cityPositions = []
    for (let i = 0; i < 200; i++) {
      const phi = Math.acos(-1 + (2 * i) / 200)
      const theta = Math.sqrt(200 * Math.PI) * phi

      const x = 4.2 * Math.cos(theta) * Math.sin(phi)
      const y = 4.2 * Math.sin(theta) * Math.sin(phi)
      const z = 4.2 * Math.cos(phi)

      cityPositions.push(x, y, z)
    }

    citiesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cityPositions, 3))
    const citiesMaterial = new THREE.PointsMaterial({
      color: 0x00ff9d,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
    })
    const cities = new THREE.Points(citiesGeometry, citiesMaterial)
    earthGroup.add(cities)

    // 额外的发光粒子
    const particlesGeometry = new THREE.BufferGeometry()
    const particlePositions = []
    for (let i = 0; i < 300; i++) {
      const r = 5 + Math.random() * 5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      particlePositions.push(x, y, z)
    }

    particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3))
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0x9d00ff,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
    })
    const particles = new THREE.Points(particlesGeometry, particlesMaterial)
    scene.add(particles)

    // 光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0x00d4ff, 1)
    directionalLight.position.set(10, 10, 10)
    scene.add(directionalLight)

    const backLight = new THREE.DirectionalLight(0x00ff9d, 0.5)
    backLight.position.set(-10, -5, -10)
    scene.add(backLight)

    // 动画
    let animationId
    let time = 0

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      time += 0.001

      // 地球自转
      earthGroup.rotation.y += 0.002

      // 呼吸效果
      const scale = 1 + Math.sin(time * 2) * 0.02
      earthGroup.scale.set(scale, scale, scale)

      // 粒子缓慢移动
      particles.rotation.y -= 0.0005

      renderer.render(scene, camera)
    }

    animate()

    // 响应式
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
      if (canvasRef.current && renderer.domElement) {
        canvasRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10"
      style={{
        pointerEvents: 'none',
      }}
    />
  )
}

export default Globe3D
