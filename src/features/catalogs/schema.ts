import { z } from 'zod'
import i18n from '@/lib/i18n'
import type { CatalogConfig, CatalogValue } from './types'

export function catalogSchema(config: CatalogConfig) {
  const shape: Record<string, z.ZodType<CatalogValue | undefined>> = {
    code: z
      .string()
      .trim()
      .regex(/^[A-Z0-9_-]{1,32}$/, i18n.t('catalogs:errors.code')),
    name: z.string().trim().min(1).max(255),
    description: z.string().optional(),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0),
  }
  for (const field of config.fields) {
    if (field.type === 'number')
      shape[field.name] = z
        .union([
          z.literal(''),
          z.coerce
            .number()
            .int()
            .min(field.min ?? 0)
            .max(field.max ?? Number.MAX_SAFE_INTEGER),
        ])
        .optional()
    else if (field.type === 'boolean') shape[field.name] = z.boolean().optional()
    else if (field.type === 'email')
      shape[field.name] = z
        .union([z.literal(''), z.email(i18n.t('catalogs:errors.email'))])
        .optional()
    else if (field.type === 'url')
      shape[field.name] = z.union([z.literal(''), z.url(i18n.t('catalogs:errors.url'))]).optional()
    else if (field.type === 'severity')
      shape[field.name] = z.enum(['low', 'medium', 'high', 'critical']).optional()
    else if (field.type === 'enum')
      shape[field.name] = z.enum([...(field.options ?? [])] as [string, ...string[]]).optional()
    else shape[field.name] = z.string().optional()
  }
  return z.object(shape)
}
