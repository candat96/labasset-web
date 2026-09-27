import i18n from '@/lib/i18n'

/**
 * Bản dịch tính năng chữ ký số (namespace `signing`) + nhãn menu.
 *
 * `src/routes/menu.ts` import file này để khoá menu `menu:items.signingProfile` /
 * `menu:items.signingConfig` có bản dịch (bị `menu.test.ts` bắt buộc).
 */
i18n.addResourceBundle(
  'vi',
  'menu',
  { items: { signingProfile: 'Chữ ký số', signingConfig: 'Ký số' } },
  /* deep */ true,
  /* overwrite */ true,
)

i18n.addResourceBundle(
  'vi',
  'signing',
  {
    // Trang hồ sơ chữ ký số của tôi
    profileTitle: 'Chữ ký số của tôi',
    profileHint:
      'Kết nối tài khoản ký số và chọn chứng thư để ký chứng từ. Mật khẩu và PIN không bao giờ được hiển thị lại.',
    notConfigured: 'Bệnh viện chưa cấu hình nhà cung cấp ký số',
    notConfiguredHint:
      'Quản trị viện cần cấu hình nhà cung cấp ký số trước khi bạn dùng được chức năng này.',
    goToConfig: 'Cấu hình nhà cung cấp ký số',
    currentProfile: 'Hồ sơ hiện tại',
    noProfile: 'Tài khoản chưa cài đặt chữ ký số.',
    certInUse: 'Chứng thư đang dùng',
    certSerial: 'Số serial',
    certValidity: 'Hiệu lực',
    expiringSoon: 'Chứng thư sắp hết hạn',
    expired: 'Chứng thư đã hết hạn',
    sessionExpiresAt: 'Phiên nhà cung cấp hết hạn',
    sessionNone: 'Chưa có phiên đăng nhập nhà cung cấp',
    clearSession: 'Đăng xuất phiên nhà cung cấp',
    cleared: 'Đã đăng xuất phiên nhà cung cấp',
    setup: 'Thiết lập tài khoản ký',
    username: 'Tên đăng nhập (username)',
    usernameHint: 'Ví dụ: ICA.0108357319',
    password: 'Mật khẩu',
    passwordKeep: 'Để trống để giữ mật khẩu đã lưu',
    passwordSet: 'Đã lưu mật khẩu',
    passwordNotSet: 'Chưa lưu mật khẩu',
    pin: 'Mã PIN',
    pinSet: 'Đã lưu PIN',
    pinNotSet: 'Chưa lưu PIN',
    rememberPin: 'Nhớ mã PIN trên máy chủ',
    rememberPinOn: 'PIN được lưu trên máy chủ, mỗi lần ký không phải nhập lại.',
    rememberPinOff: 'Mỗi lần ký sẽ phải nhập PIN.',
    lookup: 'Tra chứng thư',
    lookupTitle: 'Chọn chứng thư',
    lookupEmpty: 'Không tìm thấy chứng thư nào cho tài khoản này.',
    lookupHint: 'Nhập tên đăng nhập rồi bấm Tra chứng thư để tải danh sách chứng thư.',
    lookupIntro: 'Bấm Tra chứng thư để tải danh sách chứng thư.',
    chooseCert: 'Chọn chứng thư để dùng',
    certExpiredOption: 'đã hết hạn',
    save: 'Lưu cài đặt',
    saved: 'Đã lưu cài đặt chữ ký số',
    needUsername: 'Nhập tên đăng nhập trước khi tra chứng thư',
    needCert: 'Chọn một chứng thư trước khi lưu',
    needPassword: 'Nhập mật khẩu tài khoản ký số',
    needPin: 'Nhập mã PIN hoặc tắt "Nhớ mã PIN"',
    show: 'Hiện',
    hide: 'Ẩn',
    currentBadge: 'Đang dùng',
    loadError: 'Không tải được hồ sơ chữ ký số',
    clearSessionError: 'Không đăng xuất được phiên nhà cung cấp',

    // Trang cấu hình nhà cung cấp (quản trị)
    configTitle: 'Cấu hình nhà cung cấp ký số',
    configHint: 'Cấu hình dùng chung cho cả bệnh viện. Chỉ quản trị viện xem và sửa được màn này.',
    provider: 'Nhà cung cấp',
    baseUrl: 'Địa chỉ API nhà cung cấp',
    baseUrlHint: 'Ví dụ: https://rmsapi.intrustdss.vn/Api/rms',
    configUsername: 'Tên đăng nhập',
    configPassword: 'Mật khẩu',
    configPasswordKeep: 'Để trống để giữ nguyên mật khẩu đã lưu.',
    enabled: 'Bật ký số cho bệnh viện',
    enabledHint: 'Tắt để tạm dừng toàn bộ chức năng ký số của bệnh viện.',
    saveConfig: 'Lưu cấu hình',
    savedConfig: 'Đã lưu cấu hình ký số',
    needBaseUrl: 'Nhập địa chỉ API nhà cung cấp',
    needConfigUsername: 'Nhập tên đăng nhập',
    configLoadError: 'Không tải được cấu hình ký số',

    // Hộp thoại ký
    signAction: 'Ký số',
    dialogTitle: 'Ký số chứng từ',
    dialogDesc: 'Chọn ô ký rồi xác nhận bằng chữ ký số của bạn.',
    slotLabel: 'Ô ký',
    passwordLabel: 'Mật khẩu tài khoản ký số',
    pinLabel: 'Mã PIN',
    passwordRequired: 'Tài khoản chưa lưu mật khẩu — nhập mật khẩu để ký lần này.',
    pinRequired: 'Tài khoản chưa lưu PIN — nhập PIN để ký lần này.',
    submit: 'Ký',
    signing: 'Đang ký…',
    success: 'Đã ký chứng từ',
    profileMissing: 'Tài khoản chưa cài đặt chữ ký số.',
    profileMissingAction: 'Cài đặt chữ ký số',
    notConfiguredDialog: 'Bệnh viện chưa cấu hình nhà cung cấp ký số.',
    errorTitle: 'Ký số thất bại',
    pinHelp: 'Bật "Nhớ mã PIN" trong cài đặt chữ ký số để không phải nhập lại mỗi lần ký.',

    // Khối bản đã ký
    signedTitle: 'Bản đã ký',
    signedEmpty: 'Chưa có bản ký nào',
    signedEmptyDesc: 'Các bản đã ký số sẽ hiện ở đây để tải về.',
    download: 'Tải về',
    signedAt: 'Ký lúc',
    signedLoadError: 'Không tải được bản đã ký',
  },
  /* deep */ true,
  /* overwrite */ true,
)
