import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { messageFor } from '@/api/errors'
import { getPreferences, savePreferences } from '../api'
import { NOTIFICATION_TYPES } from '../types'
export function Component() {
  const { t } = useTranslation('notifications')
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['notifications', 'preferences'], queryFn: getPreferences })
  const [changes, setChanges] = useState<
    Record<string, { type: string; push: boolean; inapp: boolean }>
  >({})
  const mutation = useMutation({
    mutationFn: savePreferences,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications', 'preferences'] })
      setChanges({})
      toast.success(t('preferencesSaved'))
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  const types = [
    ...new Set([...Object.keys(NOTIFICATION_TYPES), ...(list.data ?? []).map((p) => p.type)]),
  ]
  return (
    <>
      <PageHeader
        title={t('preferences')}
        description={t('preferencesHint', {
          defaultValue: 'Chọn loại thông báo nhận trong ứng dụng và đẩy tới thiết bị.',
        })}
      />
      {list.isPending ? (
        <p role="status">{t('loading')}</p>
      ) : list.error ? (
        <div role="alert">
          {messageFor(list.error)} <Button onClick={() => void list.refetch()}>{t('retry')}</Button>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate(Object.values(changes))
          }}
        >
          <div className="bg-card divide-y rounded-lg border">
            {types.map((type) => {
              const row = changes[type] ??
                list.data?.find((p) => p.type === type) ?? { type, push: true, inapp: true }
              return (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3" key={type}>
                  <span>{NOTIFICATION_TYPES[type] ?? type}</span>
                  <div className="flex gap-4">
                    {(['push', 'inapp'] as const).map((channel) => (
                      <div className="flex items-center gap-2" key={channel}>
                        <Switch
                          id={`${type}-${channel}`}
                          checked={row[channel]}
                          disabled={mutation.isPending}
                          onCheckedChange={(value) =>
                            setChanges((prev) => ({
                              ...prev,
                              [type]: { ...row, [channel]: value },
                            }))
                          }
                        />
                        <Label htmlFor={`${type}-${channel}`}>
                          {channel === 'push' ? t('push') : t('inapp')} —{' '}
                          {NOTIFICATION_TYPES[type] ?? type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <Button type="submit" disabled={!Object.keys(changes).length || mutation.isPending}>
            {t('savePreferences')}
          </Button>
        </form>
      )}
    </>
  )
}
