import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

export interface ServerTableParams {
  page: number
  limit: number
  q: string
  sort?: string
  order?: 'asc' | 'desc'
  filters: Record<string, string>
}

export interface ServerTableOptions {
  defaultLimit?: number
  /** Các khoá filter được đồng bộ lên URL. */
  filterKeys?: string[]
  debounceMs?: number
}

const RESERVED = new Set(['page', 'limit', 'q', 'sort', 'order'])

/**
 * Trạng thái bảng phía server (page/limit/q/sort/filter) lưu trên URL search params
 * để reload/chia sẻ link giữ nguyên trạng thái. Đổi q/limit/filter → về trang 1.
 */
export function useServerTable(opts: ServerTableOptions = {}) {
  const { defaultLimit = 20, filterKeys = [], debounceMs = 300 } = opts
  const [sp, setSp] = useSearchParams()

  const params = useMemo<ServerTableParams>(() => {
    const num = (k: string, d: number) => {
      const v = Number(sp.get(k))
      return Number.isInteger(v) && v > 0 ? v : d
    }
    const order = sp.get('order')
    const filters: Record<string, string> = {}
    for (const k of filterKeys) {
      const v = sp.get(k)
      if (v !== null && v !== '' && !RESERVED.has(k)) filters[k] = v
    }
    return {
      page: num('page', 1),
      limit: num('limit', defaultLimit),
      q: sp.get('q') ?? '',
      sort: sp.get('sort') ?? undefined,
      order: order === 'asc' || order === 'desc' ? order : undefined,
      filters,
    }
  }, [sp, defaultLimit, filterKeys])

  const update = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === '' || (k === 'page' && v === 1)) next.delete(k)
            else next.set(k, String(v))
          }
          return next
        },
        { replace: true },
      )
    },
    [setSp],
  )

  const setPage = useCallback((page: number) => update({ page }), [update])
  const setLimit = useCallback((limit: number) => update({ limit, page: 1 }), [update])
  const setSort = useCallback(
    (sort?: string, order?: 'asc' | 'desc') =>
      update({ sort, order: sort ? (order ?? 'asc') : undefined }),
    [update],
  )
  const setFilter = useCallback(
    (key: string, value: string | undefined) => update({ [key]: value, page: 1 }),
    [update],
  )
  const setFilters = useCallback(
    (patch: Record<string, string | undefined>) => update({ ...patch, page: 1 }),
    [update],
  )
  const reset = useCallback(() => setSp(new URLSearchParams(), { replace: true }), [setSp])

  // q gõ liên tục → debounce trước khi đẩy lên URL.
  const [pendingQ, setPendingQ] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setQ = useCallback((q: string) => setPendingQ(q), [])
  useEffect(() => {
    if (pendingQ === null) return
    timer.current = setTimeout(() => {
      update({ q: pendingQ, page: 1 })
      setPendingQ(null)
    }, debounceMs)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [pendingQ, debounceMs, update])

  const queryParams = useMemo(() => {
    const out: Record<string, string | number> = { page: params.page, limit: params.limit }
    if (params.q) out.q = params.q
    if (params.sort) {
      out.sort = params.sort
      out.order = params.order ?? 'asc'
    }
    Object.assign(out, params.filters)
    return out
  }, [params])

  return {
    params,
    /** Giá trị ô tìm kiếm đang gõ (chưa đẩy lên URL) hoặc giá trị hiện tại. */
    inputQ: pendingQ ?? params.q,
    queryParams,
    setPage,
    setLimit,
    setQ,
    setSort,
    setFilter,
    setFilters,
    reset,
  }
}
