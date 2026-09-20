/**
 * Giống `labasset-api/src/settings/settings.schema.ts` (`numberingTemplate`):
 * mẫu phải chứa `{SEQ}` hoặc `{SEQ:1..32}` và chỉ dùng token đã hỗ trợ.
 */
const SEQ_TOKEN = /\{SEQ(?::(?:[1-9]|[12][0-9]|3[0-2]))?\}/
const KNOWN_TOKEN = /\{(?:YYYY|YY|MM|DD|TYPE|SEQ(?::(?:[1-9]|[12][0-9]|3[0-2]))?)\}/g

export function isValidNumberingTemplate(value: string) {
  if (!SEQ_TOKEN.test(value)) return false
  return !/[{}]/.test(value.replace(KNOWN_TOKEN, ''))
}
