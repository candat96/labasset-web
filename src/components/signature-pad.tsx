import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

const WIDTH = 480
const HEIGHT = 180

export function SignaturePad({ onFile }: { onFile: (file: File | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const ink = useRef(false)
  const [hasInk, setHasInk] = useState(false)
  const setup = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(WIDTH * dpr)
    canvas.height = Math.round(HEIGHT * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.strokeStyle =
      getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim() ||
      '#0f172a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])
  useEffect(setup, [setup])
  const position = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    }
  }
  const finish = () => {
    drawing.current = false
    const canvas = canvasRef.current
    if (!canvas || !ink.current) return
    canvas.toBlob(
      (blob) => onFile(blob ? new File([blob], 'signature.png', { type: 'image/png' }) : null),
      'image/png',
    )
  }
  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="h-auto max-w-full touch-none rounded border bg-card"
        aria-label="Vùng ký"
        onPointerDown={(event) => {
          drawing.current = true
          const ctx = canvasRef.current?.getContext('2d')
          if (!ctx) return
          const point = position(event)
          ctx.beginPath()
          ctx.moveTo(point.x, point.y)
          event.currentTarget.setPointerCapture?.(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return
          const ctx = canvasRef.current?.getContext('2d')
          if (!ctx) return
          const point = position(event)
          ink.current = true
          if (!hasInk) setHasInk(true)
          ctx.lineTo(point.x, point.y)
          ctx.stroke()
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          const ctx = canvasRef.current?.getContext('2d')
          if (ctx) ctx.clearRect(0, 0, WIDTH, HEIGHT)
          setup()
          ink.current = false
          setHasInk(false)
          onFile(null)
        }}
      >
        Xoá chữ ký
      </Button>
    </div>
  )
}
