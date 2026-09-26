import { Link } from 'react-router'
import { useUiStore } from '@/stores/ui.store'

/** Logo + tên sản phẩm ở đầu thanh trên (Figma Medone). */
export function Brand() {
  const hospitalName = useUiStore((s) => s.hospitalName)
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="MedOne — trang chủ">
      <img src="/brand/logo-64.png" alt="" className="size-8 rounded-md" />
      <span className="hidden min-w-0 flex-col leading-tight sm:flex">
        <span className="text-[15px] font-semibold">MedOne</span>
        {hospitalName && (
          <span className="text-muted-foreground max-w-40 truncate text-[12px]">
            {hospitalName}
          </span>
        )}
      </span>
    </Link>
  )
}
