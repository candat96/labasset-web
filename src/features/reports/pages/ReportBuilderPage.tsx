import { useState } from 'react'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

const SOURCES = [
  { id: 'equipment', label: 'Thiết bị', fields: ['code', 'name', 'status', 'departmentId'] },
  { id: 'repairs', label: 'Sửa chữa', fields: ['code', 'status', 'totalCost', 'openedAt'] },
  { id: 'supplies', label: 'Vật tư', fields: ['code', 'name', 'minQty'] },
  { id: 'stocktakes', label: 'Kiểm kê', fields: ['code', 'status', 'diffQty'] },
]

export function Component() {
  const [name, setName] = useState('')
  const [source, setSource] = useState(SOURCES[0]?.id ?? 'equipment')
  const [columns, setColumns] = useState<string[]>(['code', 'name'])
  const [filters, setFilters] = useState<{ field: string; op: string; value: string }[]>([])
  const fields = SOURCES.find((row) => row.id === source)?.fields ?? []
  return (
    <>
      <PageHeader title="Báo cáo tuỳ chỉnh" />
      <p className="text-muted-foreground mb-4 text-sm">
        API D1 chưa có (`GET /v1/reports/sources`). Builder chọn nguồn, cột, lọc, nhóm — chạy khi
        backend sẵn sàng.
      </p>
      <div className="max-w-xl space-y-4">
        <div className="space-y-1">
          <Label htmlFor="report-name">Tên</Label>
          <Input id="report-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="report-source">Nguồn</Label>
          <select
            id="report-source"
            className="border-input h-9 w-full rounded-md border px-3 text-sm"
            value={source}
            onChange={(event) => {
              setSource(event.target.value)
              setColumns([])
            }}
          >
            {SOURCES.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Cột (≤ 20)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((field) => (
              <label key={field} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={columns.includes(field)}
                  onCheckedChange={(on) =>
                    setColumns((current) =>
                      on === true
                        ? [...current, field].slice(0, 20)
                        : current.filter((item) => item !== field),
                    )
                  }
                />
                {field}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setFilters((current) =>
                current.length >= 10
                  ? current
                  : [...current, { field: fields[0] ?? 'code', op: 'eq', value: '' }],
              )
            }
          >
            Thêm lọc
          </Button>
          <ul className="mt-2 space-y-2">
            {filters.map((filter, index) => (
              <li key={index} className="flex gap-2">
                <Input
                  aria-label={`Lọc trường ${index + 1}`}
                  value={filter.field}
                  onChange={(event) =>
                    setFilters((current) =>
                      current.map((row, i) =>
                        i === index ? { ...row, field: event.target.value } : row,
                      ),
                    )
                  }
                />
                <Input
                  aria-label={`Lọc giá trị ${index + 1}`}
                  value={filter.value}
                  onChange={(event) =>
                    setFilters((current) =>
                      current.map((row, i) =>
                        i === index ? { ...row, value: event.target.value } : row,
                      ),
                    )
                  }
                />
              </li>
            ))}
          </ul>
        </div>
        <Button type="button" disabled>
          Xem trước
        </Button>
      </div>
    </>
  )
}
