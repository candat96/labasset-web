import { Link } from 'react-router'
import { ChevronRight, Search } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AiToolResult } from '../api'

export function ToolCard({ tool }: { tool: AiToolResult }) {
  const rows = (tool.rows ?? []).slice(0, 50)
  const columns = Object.keys(rows[0] ?? {})
  return (
    <details
      className="bg-card border-divider group/tool mt-2 rounded-lg border text-[13px]"
      open={tool.status === 'running'}
    >
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="text-subtle size-3.5 transition-transform group-open/tool:rotate-90"
          aria-hidden
        />
        <Search className="text-primary size-3.5" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {tool.status === 'running' ? 'Đang tra cứu' : 'Đã tra cứu'}: {tool.name}
          {tool.summary ? ` — ${tool.summary}` : ''}
        </span>
      </summary>
      {rows.length > 0 && (
        <div className="border-divider max-h-64 overflow-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column} className="text-[12.5px]">
                      {String(row[column] ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {tool.link && (
        <Link className="text-primary block px-3 py-2 text-[12.5px] hover:underline" to={tool.link}>
          Mở trong màn hình
        </Link>
      )}
    </details>
  )
}
