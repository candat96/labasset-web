import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

const LOGICAL_WIDTH = 480
const LOGICAL_HEIGHT = 180

/**
 * Vùng ký bằng canvas: màu nét theo token design system, xử lý devicePixelRatio,
 * chặn cuộn trang trên cảm ứng và chỉ export khi đã có nét vẽ.
 */
export function SignaturePad({ onFile }: { onFile: (file: File | null) => void }) {
  const { t } = useTranslation('repairs')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const ink = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  const setup = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(LOGICAL_WIDTH * dpr)
    canvas.height = Math.round(LOGICAL_HEIGHT * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const fore = getComputedStyle(document.documentElement).getPropertyValue('--foreground')
    ctx.strokeStyle = fore.trim() || '#0f172a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    setup()
  }, [setup])

  const pos = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT,
    }
  }

  const exportPng = () => {
    const canvas = canvasRef.current
    if (!canvas || !ink.current) return
    canvas.toBlob((blob) => {
      if (!blob) return onFile(null)
      onFile(new File([blob], 'signature.png', { type: 'image/png' }))
    }, 'image/png')
  }

  const finishStroke = () => {
    drawing.current = false
    if (ink.current) exportPng()
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        style={{ width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT, maxWidth: '100%' }}
        className="bg-card touch-none rounded border"
        aria-label={t('signature.canvas')}
        onPointerDown={(event) => {
          drawing.current = true
          const ctx = canvasRef.current?.getContext('2d')
          if (!ctx) return
          const p = pos(event)
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          event.currentTarget.setPointerCapture?.(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return
          const ctx = canvasRef.current?.getContext('2d')
          if (!ctx) return
          const p = pos(event)
          ink.current = true
          if (!hasInk) setHasInk(true)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
        }}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          const canvas = canvasRef.current
          const ctx = canvas?.getContext('2d')
          if (canvas && ctx) {
            setup()
            ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
          }
          ink.current = false
          setHasInk(false)
          onFile(null)
        }}
      >
        {t('signature.clear')}
      </Button>
    </div>
  )
}
