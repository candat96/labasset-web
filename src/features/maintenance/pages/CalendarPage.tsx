import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import viLocale from '@fullcalendar/core/locales/vi'
import type { DatesSetArg, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { Checkbox } from '@/components/ui/checkbox'
import { ErrorState } from '@/components/page/ErrorState'
import { messageFor } from '@/api/errors'
import { listCalendar, moveCalendar } from '../api'
import type { CalendarItem } from '../types'
import { useTranslation } from 'react-i18next'
import './calendar.css'

const hrefFor = (item: Pick<CalendarItem, 'type' | 'id'>) =>
  item.type === 'maintenance'
    ? `/maintenance/tasks/${item.id}`
    : item.type === 'calibration'
      ? `/calibrations/${item.id}`
      : `/repairs/${item.id}`

const EVENT_CLASS: Record<string, string[]> = {
  maintenance: ['fc-event-type-maintenance'],
  calibration: ['fc-event-type-calibration'],
  repair: ['fc-event-type-repair'],
}

/** Giờ cụ thể của phiếu dạng `HH:mm`; trả null khi công việc chỉ có ngày (nửa đêm). */
export function eventTimeLabel(start: string): string | null {
  const date = new Date(start)
  if (Number.isNaN(date.getTime())) return null
  const hours = date.getHours()
  const minutes = date.getMinutes()
  if (hours === 0 && minutes === 0) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function Component() {
  const { t } = useTranslation('maintenance')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [range, setRange] = useState(() => {
    const now = new Date()
    return {
      from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
      to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
    }
  })
  const [types, setTypes] = useState(['maintenance', 'calibration', 'repair'])
  const [mine, setMine] = useState(false)
  const list = useQuery({
    queryKey: ['calendar', range, types, mine],
    queryFn: () =>
      listCalendar({
        ...range,
        types: types.join(','),
        assigneeId: mine ? 'me' : undefined,
      }),
  })
  const toggle = (type: string, on: boolean) =>
    setTypes((curr) => (on ? [...new Set([...curr, type])] : curr.filter((item) => item !== type)))
  const events: EventInput[] = (list.data?.items ?? []).map((item) => {
    const time = eventTimeLabel(item.start)
    return {
      id: `${item.type}:${item.id}`,
      title: time ? `${time} · ${item.title}` : item.title,
      start: item.start,
      editable: item.movable,
      classNames: EVENT_CLASS[item.type] ?? [],
      extendedProps: { item },
    }
  })
  const onDatesSet = (info: DatesSetArg) => {
    const from = info.start.toISOString()
    const to = info.end.toISOString()
    // Giữ nguyên tham chiếu khi khoảng ngày không đổi để tránh vòng lặp render.
    setRange((curr) => (curr.from === from && curr.to === to ? curr : { from, to }))
  }
  const onEventClick = (info: EventClickArg) => {
    const item = info.event.extendedProps.item as CalendarItem
    navigate(hrefFor(item))
  }
  const onEventDrop = async (info: EventDropArg) => {
    const item = info.event.extendedProps.item as CalendarItem
    if (!item.movable || !info.event.start) return info.revert()
    try {
      await moveCalendar(item.type, item.id, info.event.start.toISOString())
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['calendar'] }),
        qc.invalidateQueries({ queryKey: ['maintenance', 'tasks'] }),
        qc.invalidateQueries({ queryKey: ['calibrations'] }),
      ])
    } catch (error) {
      info.revert()
      toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader title={t('schedule')} description={t('calendarHint')} />
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        {(['maintenance', 'calibration', 'repair'] as const).map((type) => (
          <label key={type} className="flex items-center gap-2">
            <Checkbox
              checked={types.includes(type)}
              onCheckedChange={(value) => toggle(type, value === true)}
            />
            {type === 'maintenance'
              ? t('typeMaintenance')
              : type === 'calibration'
                ? t('typeCalibration')
                : t('typeRepair')}
          </label>
        ))}
        <label className="flex items-center gap-2">
          <Checkbox checked={mine} onCheckedChange={(value) => setMine(value === true)} />
          {t('mine')}
        </label>
      </div>
      {list.error && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
      <div className="calendar-shell rounded-md border bg-card p-3">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          }}
          locales={[viLocale]}
          locale="vi"
          buttonText={{
            today: t('calendarToday'),
            month: t('calendarMonth'),
            week: t('calendarWeek'),
          }}
          dayMaxEvents={3}
          moreLinkText={(n) => t('calendarMore', { n })}
          eventDisplay="block"
          displayEventTime={false}
          height="auto"
          events={events}
          editable
          datesSet={onDatesSet}
          eventClick={onEventClick}
          eventDrop={(info) => void onEventDrop(info)}
          eventDidMount={(info) => {
            const item = info.event.extendedProps.item as CalendarItem
            info.el.title = `${item.title} · ${item.status} · ${item.assigneeName ?? ''}`
          }}
        />
      </div>
    </>
  )
}
