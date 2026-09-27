import { Link } from 'react-router'
import { useUiStore } from '@/stores/ui.store'

/** Logo + tên sản phẩm ở đầu thanh trên (Figma Medone). */
export function Brand() {
  const hospitalName = useUiStore((s) => s.hospitalName)
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="MedOne — trang chủ">
      {/* `?v=2` giống favicon và trang đăng nhập: thiếu nó thì trình duyệt đã cache
          logo LabAsset cũ sẽ hiện mãi dù file trên server đã là MedOne. */}
      <img src="/brand/logo-64.png?v=2" alt="" className="size-8 rounded-md" />
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
