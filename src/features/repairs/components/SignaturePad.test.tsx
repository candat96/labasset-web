import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, vi } from 'vitest'
import '@/lib/i18n'
import { SignaturePad } from '@/components/signature-pad'

function fakeContext() {
  return {
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
  }
}

let ctx: ReturnType<typeof fakeContext>

beforeEach(() => {
  ctx = fakeContext()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
    callback(new Blob(['sig'], { type: 'image/png' }))
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 480,
    bottom: 180,
    width: 480,
    height: 180,
    toJSON: () => ({}),
  } as DOMRect)
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('does not export an empty signature', async () => {
  const onFile = vi.fn()
  render(<SignaturePad onFile={onFile} />)
  const canvas = screen.getByLabelText('Vùng ký')
  fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 })
  fireEvent.pointerUp(canvas, { clientX: 10, clientY: 10 })
  expect(onFile).not.toHaveBeenCalled()
})

it('exports a PNG after drawing and clears on demand', async () => {
  const onFile = vi.fn()
  render(<SignaturePad onFile={onFile} />)
  const canvas = screen.getByLabelText('Vùng ký')
  expect(canvas).toHaveClass('touch-none')
  fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 })
  fireEvent.pointerMove(canvas, { clientX: 40, clientY: 30 })
  fireEvent.pointerUp(canvas, { clientX: 40, clientY: 30 })
  expect(onFile).toHaveBeenCalledTimes(1)
  const file = onFile.mock.calls[0]?.[0] as File
  expect(file.name).toBe('signature.png')
  expect(file.type).toBe('image/png')
  await userEvent.click(screen.getByRole('button', { name: 'Xoá chữ ký' }))
  expect(onFile).toHaveBeenLastCalledWith(null)
  expect(ctx.clearRect).toHaveBeenCalled()
  // Xoá xong vẽ lại mà chưa có nét mới thì không export.
  onFile.mockClear()
  fireEvent.pointerDown(canvas, { clientX: 12, clientY: 12 })
  fireEvent.pointerUp(canvas, { clientX: 12, clientY: 12 })
  expect(onFile).not.toHaveBeenCalled()
})
