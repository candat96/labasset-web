import { Link } from 'react-router'
import type { AiToolResult } from '../api'

export function ToolCard({ tool }: { tool: AiToolResult }) {
  const rows = (tool.rows ?? []).slice(0, 50)
  const columns = Object.keys(rows[0] ?? {})
  return (
    <details className="rounded-md border p-2 text-sm" open={tool.status === 'running'}>
      <summary className="cursor-pointer font-medium">
        {tool.status === 'running' ? 'Đang tra cứu' : 'Đã tra cứu'}: {tool.name}
        {tool.summary ? ` — ${tool.summary}` : ''}
      </summary>
      {rows.length > 0 && (
        <div className="mt-2 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} className="text-left">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={column}>{String(row[column] ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tool.link && (
        <Link className="text-primary mt-2 inline-block hover:underline" to={tool.link}>
          Mở trong màn hình
        </Link>
      )}
    </details>
  )
}
