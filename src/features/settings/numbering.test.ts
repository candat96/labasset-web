import { isValidNumberingTemplate } from './numbering'

// Cùng bộ ca với labasset-api/src/settings/settings.schema.ts + settings.service.spec.ts.
it('accepts {SEQ} và {SEQ:1..32} với token hợp lệ', () => {
  for (const value of [
    'PYC-{YYYY}{MM}-{SEQ:4}',
    'TB-{YYYY}-{SEQ}',
    'KK-{YYYY}-{SEQ:3}',
    'XK-{TYPE}-{SEQ:32}',
    '{DD}{MM}{YYYY}-{SEQ:1}',
  ]) {
    expect(isValidNumberingTemplate(value)).toBe(true)
  }
})

it('rejects mẫu thiếu SEQ, SEQ ngoài 1..32, token lạ', () => {
  for (const value of [
    'PYC-{YYYY}',
    '{SEQ:0}',
    '{SEQ:33}',
    '{SEQ:9999999}',
    'PYC-{BOGUS}-{SEQ:4}',
    'PYC-{SEQ:4',
    'PYC-{SEQ}}',
    'PYC-{seq:4}',
  ]) {
    expect(isValidNumberingTemplate(value)).toBe(false)
  }
})
