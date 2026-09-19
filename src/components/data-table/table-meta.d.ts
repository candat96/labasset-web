import '@tanstack/react-table'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** Nhãn hiển thị trong menu ẩn/hiện cột */
    label?: string
    align?: 'left' | 'right' | 'center'
    /** Lớp CSS cho ô (vd. w-0 cho cột hành động) */
    className?: string
  }
}
