import { endOfDay, startOfDay } from 'date-fns'

/** `from`/`to` kiểu yyyy-MM-dd → ISO theo giờ local (đầu/cuối ngày). */
export function dayRangeToIso(from?: string, to?: string) {
  return {
    from: from ? startOfDay(new Date(`${from}T00:00:00`)).toISOString() : undefined,
    to: to ? endOfDay(new Date(`${to}T00:00:00`)).toISOString() : undefined,
  }
}
