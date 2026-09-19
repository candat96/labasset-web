import { z } from 'zod'

// Thông điệp lỗi zod tiếng Việt dùng chung cho mọi form.
z.config({
  customError: (iss) => {
    switch (iss.code) {
      case 'invalid_type':
        return iss.input === undefined || iss.input === null ? 'Bắt buộc' : 'Giá trị không hợp lệ'
      case 'too_small':
        if (iss.origin === 'string' && Number(iss.minimum) <= 1) return 'Bắt buộc'
        return `Tối thiểu ${String(iss.minimum)}`
      case 'too_big':
        return `Tối đa ${String(iss.maximum)}`
      case 'invalid_format':
        return 'Định dạng không hợp lệ'
      case 'invalid_value':
        return 'Giá trị không hợp lệ'
      default:
        return 'Giá trị không hợp lệ'
    }
  },
})
