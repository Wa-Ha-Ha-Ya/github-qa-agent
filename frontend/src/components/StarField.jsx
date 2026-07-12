import React, { useEffect, useRef } from 'react'

function StarField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animationId
    let stars = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initStars()
    }

    const initStars = () => {
      stars = []
      const starCount = Math.floor((canvas.width * canvas.height) / 4000)
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5,
          alpha: Math.random(),
          speed: Math.random() * 0.5 + 0.1,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          twinkleDir: Math.random() > 0.5 ? 1 : -1,
          color: Math.random() > 0.8 ? '#00d4ff' : Math.random() > 0.5 ? '#00ff9d' : '#ffffff'
        })
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      stars.forEach(star => {
        // 闪烁效果
        star.alpha += star.twinkleSpeed * star.twinkleDir
        if (star.alpha >= 1 || star.alpha <= 0.2) {
          star.twinkleDir *= -1
        }

        // 缓慢移动
        star.x -= star.speed * 0.3
        if (star.x < 0) {
          star.x = canvas.width
          star.y = Math.random() * canvas.height
        }

        // 绘制星星
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = star.color
        ctx.globalAlpha = star.alpha
        ctx.fill()

        // 光晕效果
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.radius * 3
        )
        gradient.addColorStop(0, star.color)
        gradient.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.globalAlpha = star.alpha * 0.3
        ctx.fill()
      })

      ctx.globalAlpha = 1
      animationId = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="stars"
      style={{
        pointerEvents: 'none',
      }}
    />
  )
}

export default StarField
