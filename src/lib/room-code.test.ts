import { suggestRoomCode, withCodeSuffix } from './room-code'

it('sinh mã phòng từ mã khoa + tên không dấu', () => {
  expect(suggestRoomCode('XN', 'Phòng Huyết học')).toBe('XN-PHONG-HUYET-HOC')
  expect(suggestRoomCode(null, 'Hội trường đa năng')).toBe('CHUNG-HOI-TRUONG-DA-NANG')
  expect(suggestRoomCode('HSCC', 'Buồng 1 (tầng 3)')).toBe('HSCC-BUONG-1-TANG-3')
})

it('cắt ≤ 32 ký tự và hậu tố khi trùng', () => {
  const long = suggestRoomCode('CDHA', 'Phòng chụp cộng hưởng từ số một của viện')
  expect(long.length).toBeLessThanOrEqual(32)
  expect(long).toMatch(/^[A-Z0-9_-]+$/)
  const suffixed = withCodeSuffix(long)
  expect(suffixed.length).toBeLessThanOrEqual(32)
  expect(suffixed).toMatch(/-[A-Z0-9]{3}$/)
})
