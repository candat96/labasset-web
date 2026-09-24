import type { components } from '@/api/schema'

// TODO(api): OpenAPI chưa khai response schema cho GET/PATCH/DELETE /v1/departments.
export type DepartmentType =
  'exam' | 'internal' | 'surgery' | 'imaging' | 'lab' | 'finance' | 'other'
export const DEPARTMENT_TYPES: DepartmentType[] = [
  'exam',
  'internal',
  'surgery',
  'imaging',
  'lab',
  'finance',
  'other',
]

export interface Department {
  id: string
  code: string
  name: string
  type: DepartmentType
  headUserId: string | null
  phone: string | null
  location: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface ImportError {
  row: number
  field?: string
  message: string
}
export interface ImportResult {
  created: number
  updated: number
  errors: ImportError[]
}

export type CreateDepartmentDto = components['schemas']['CreateDepartmentDto']
export type UpdateDepartmentDto = components['schemas']['UpdateDepartmentDto']

export interface DepartmentListParams {
  page?: number
  limit?: number
  q?: string
  isActive?: boolean
}
