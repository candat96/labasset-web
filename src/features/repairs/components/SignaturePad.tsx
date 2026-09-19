import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'

export function SignaturePad({ onFile }: { onFile: (file: File | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
  }, [])

  const pos = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const exportPng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return onFile(null)
      onFile(new File([blob], 'signature.png', { type: 'image/png' }))
    }, 'image/png')
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={480}
        height={180}
        className="w-full rounded border bg-white"
        aria-label="Vùng ký"
        onPointerDown={(event) => {
          drawing.current = true
          const ctx = canvasRef.current?.getContext('2d')
          if (!ctx) return
          const p = pos(event)
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return
          const ctx = canvasRef.current?.getContext('2d')
          if (!ctx) return
          const p = pos(event)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
        }}
        onPointerUp={() => {
          drawing.current = false
          exportPng()
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          const canvas = canvasRef.current
          const ctx = canvas?.getContext('2d')
          if (!canvas || !ctx) return
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          onFile(null)
        }}
      >
        Xoá chữ ký
      </Button>
    </div>
  )
}
