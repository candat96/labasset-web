import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TablePager, pageWindow } from './TablePager'

describe('pageWindow (§Chuẩn thành phần → Bảng dữ liệu)', () => {
  it('ít trang thì hiện hết, không có dấu …', () => {
    expect(pageWindow(1, 4)).toEqual([1, 2, 3, 4])
  })

  it('nhiều trang: luôn có trang đầu và trang cuối, hai bên trang hiện tại 2 trang', () => {
    expect(pageWindow(6, 20)).toEqual([1, 'gap', 4, 5, 6, 7, 8, 'gap', 20])
  })

  it('đầu và cuối dải không chèn … vô nghĩa', () => {
    expect(pageWindow(2, 10)).toEqual([1, 2, 3, 4, 'gap', 10])
    expect(pageWindow(10, 10)).toEqual([1, 'gap', 8, 9, 10])
  })

  it('một trang duy nhất', () => {
    expect(pageWindow(1, 1)).toEqual([1])
  })
})

describe('TablePager', () => {
  it('bấm số trang gọi onPageChange; trang hiện tại có aria-current', async () => {
    const onPageChange = vi.fn()
    render(<TablePager page={3} pages={10} onPageChange={onPageChange} />)
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('button', { name: '5' }))
    expect(onPageChange).toHaveBeenCalledWith(5)
  })

  it('nút đầu/cuối nhảy về 1 và trang cuối', async () => {
    const onPageChange = vi.fn()
    render(<TablePager page={5} pages={9} onPageChange={onPageChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Trang đầu' }))
    expect(onPageChange).toHaveBeenLastCalledWith(1)
    await userEvent.click(screen.getByRole('button', { name: 'Trang cuối' }))
    expect(onPageChange).toHaveBeenLastCalledWith(9)
  })

  it('ở trang đầu thì nút lùi bị chặn, ở trang cuối thì nút tiến bị chặn', () => {
    const { rerender } = render(<TablePager page={1} pages={5} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Trang đầu' })).toBeDisabled()
    rerender(<TablePager page={5} pages={5} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Trang cuối' })).toBeDisabled()
  })
})
