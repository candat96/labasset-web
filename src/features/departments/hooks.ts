import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import * as dApi from './api'
import type { DepartmentListParams, UpdateDepartmentDto } from './types'

export const departmentKeys = {
  all: ['departments'] as const,
  list: (p: DepartmentListParams) => ['departments', 'list', p] as const,
  detail: (id: string) => ['departments', 'detail', id] as const,
}

export function useDepartments(params: DepartmentListParams) {
  return useQuery({
    queryKey: departmentKeys.list(params),
    queryFn: () => dApi.listDepartments(params),
    placeholderData: (prev) => prev,
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: departmentKeys.all })
}

/** Lỗi KHÔNG toast ở hook: form tự gắn lỗi theo field rồi mới toast phần còn lại. */
export function useCreateDepartment() {
  const { t } = useTranslation('departments')
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: dApi.createDepartment,
    onSuccess: (created) => {
      toast.success(t('createdWithCode', { code: created.code }))
      void invalidate()
    },
  })
}

export function useUpdateDepartment() {
  const { t } = useTranslation('departments')
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDepartmentDto }) =>
      dApi.updateDepartment(id, body),
    onSuccess: () => {
      toast.success(t('updated'))
      void invalidate()
    },
  })
}

export function useDeleteDepartment() {
  const { t } = useTranslation('departments')
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: dApi.deleteDepartment,
    onSuccess: (r) => {
      toast.success(r.deactivated ? t('deactivated') : t('deleted'))
      void invalidate()
    },
  })
}

export function useImportDepartments() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: dApi.importDepartments,
    onSuccess: (r) => {
      if (r.errors.length === 0) void invalidate()
    },
  })
}
