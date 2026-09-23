/**
 * Nội dung Hướng dẫn sử dụng LabAsset (tiếng Việt, gửi khách hàng).
 * Tách khỏi component để dễ cập nhật; mỗi section có id (mục lục), title, blocks.
 */
export type GuideBlock =
  | { type: 'p'; text: string }
  | { type: 'steps'; items: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'note'; text: string; tone?: 'info' | 'warning' | 'success' }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'flow'; steps: string[] }

export interface GuideSection {
  id: string
  title: string
  /** Vai trò liên quan (hiển thị chip). */
  roles?: string[]
  blocks: GuideBlock[]
  children?: GuideSection[]
}

export const GUIDE_META = {
  product: 'LabAsset',
  version: '1.0',
  updated: '21/09/2026',
  tagline: 'Hệ thống quản lý trang thiết bị & vật tư y tế',
}

export const GUIDE: GuideSection[] = [
  {
    id: 'gioi-thieu',
    title: '1. Giới thiệu',
    blocks: [
      {
        type: 'p',
        text: 'LabAsset là phần mềm quản lý toàn bộ vòng đời máy móc – thiết bị và vật tư, hoá chất đi kèm trong bệnh viện: từ hồ sơ máy, sửa chữa, bảo dưỡng – kiểm định, kho vật tư, phiếu yêu cầu của khoa, kiểm kê cho đến báo cáo và trợ lý AI. Hệ thống gồm ứng dụng web (dành cho mọi vai trò) và ứng dụng di động (dành cho nhân viên phòng Vật tư – Thiết bị y tế, có quét QR và làm việc offline).',
      },
      {
        type: 'table',
        head: ['Vai trò', 'Ai dùng', 'Làm được gì'],
        rows: [
          [
            'Quản trị viện',
            'Trưởng/phó phòng VT-TBYT, IT',
            'Toàn quyền: cấu hình, người dùng, danh mục, duyệt, phân công, đóng phiếu, báo cáo',
          ],
          [
            'Nhân viên VT-TBYT',
            'Kỹ sư, kỹ thuật viên',
            'Sửa chữa, bảo dưỡng, kiểm định, nhập/xuất kho, kiểm kê, duyệt & cấp phát phiếu yêu cầu',
          ],
          [
            'Trưởng khoa',
            'Trưởng/điều dưỡng trưởng khoa',
            'Xem máy của khoa, báo hỏng, tạo & duyệt phiếu yêu cầu cấp khoa, nghiệm thu sửa chữa',
          ],
          [
            'Nhân viên khoa',
            'Nhân viên khoa xét nghiệm, lâm sàng',
            'Xem máy của khoa, báo hỏng, tạo phiếu yêu cầu, nhận vật tư',
          ],
        ],
      },
      {
        type: 'note',
        tone: 'info',
        text: 'Mỗi người chỉ thấy dữ liệu theo quyền: khoa chỉ thấy máy và phiếu của khoa mình; phòng Vật tư thấy toàn viện.',
      },
    ],
  },
  {
    id: 'bat-dau',
    title: '2. Bắt đầu sử dụng',
    blocks: [
      {
        type: 'steps',
        items: [
          'Mở địa chỉ web do phòng Vật tư cung cấp. Trên điện thoại, cài ứng dụng LabAsset (Android/iOS).',
          'Nhập Mã bệnh viện, Tài khoản và Mật khẩu do quản trị viện cấp. Lần đầu đăng nhập hệ thống yêu cầu đổi mật khẩu.',
          'Quên mật khẩu: bấm "Quên mật khẩu?" → nhập email → nhận mã OTP → đặt mật khẩu mới.',
          'Sau khi đăng nhập, menu bên trái liệt kê các phân hệ bạn được quyền dùng. Ô "Tìm kiếm…" (phím tắt Ctrl/⌘ + K) tìm nhanh máy, vật tư, phiếu theo mã hoặc tên.',
          'Chuông thông báo ở góc phải: các việc cần bạn xử lý (phiếu chờ duyệt, máy hỏng, sắp hết hạn…). Vào Cá nhân → Tuỳ chọn thông báo để bật/tắt từng loại.',
        ],
      },
      {
        type: 'note',
        tone: 'warning',
        text: 'Không chia sẻ tài khoản. Mọi thao tác đều được ghi vào Nhật ký hệ thống kèm tên người thực hiện.',
      },
    ],
  },
  {
    id: 'tong-quan',
    title: '3. Trang Tổng quan & Việc của tôi',
    blocks: [
      {
        type: 'p',
        text: 'Tổng quan hiển thị các con số quan trọng của viện (số máy, máy hỏng, sửa chữa đang mở, quá hạn SLA, bảo dưỡng/kiểm định 30 ngày tới, vật tư dưới định mức, sắp hết hạn, phiếu chờ duyệt, giá trị tồn kho) — bấm vào thẻ để mở danh sách tương ứng.',
      },
      {
        type: 'p',
        text: '"Việc của tôi" gom mọi việc đang chờ chính bạn: phiếu được phân công, việc bảo dưỡng đến hạn, phiếu yêu cầu cần duyệt/nhận, thông báo chưa đọc.',
      },
    ],
  },
  {
    id: 'thiet-bi',
    title: '4. Thiết bị',
    blocks: [
      {
        type: 'p',
        text: 'Mỗi máy có một hồ sơ: thông tin chung, mua sắm & bảo hành, vận hành (Khoa/Phòng ban, Phòng, vị trí trong phòng, người phụ trách), thông số kỹ thuật, cấu hình (phụ kiện, phần mềm, linh kiện), vật tư đi kèm, tài liệu, và toàn bộ lịch sử sửa chữa – bảo dưỡng – điều chuyển.',
      },
    ],
    children: [
      {
        id: 'thiet-bi-them',
        title: '4.1 Thêm máy mới',
        roles: ['Quản trị viện', 'Nhân viên VT-TBYT'],
        blocks: [
          {
            type: 'note',
            tone: 'info',
            text: 'Khoa/Phòng ban là đơn vị tổ chức (khoa lâm sàng, cận lâm sàng, phòng chức năng như Hành chính, CNTT…); Phòng là vị trí vật lý (Phòng Huyết học, Buồng hồi sức 1, Phòng máy chủ…). Mỗi máy thuộc một Khoa/Phòng ban và đặt tại một Phòng; danh sách máy có cột và bộ lọc Phòng.',
          },
          {
            type: 'steps',
            items: [
              'Thiết bị → Hồ sơ thiết bị → "Thêm máy".',
              'Nhập Tên, Model, Serial, Hãng, Nhóm; mã máy để trống sẽ tự sinh (TB-YYYY-xxxxx).',
              'Chọn Khoa/Phòng ban (đơn vị quản lý máy) → chọn Phòng (vị trí vật lý; danh sách gồm phòng của đơn vị và phòng dùng chung như hội trường, kho chung) → nhập "Vị trí trong phòng" (Bàn 1, Giường H04…). Chưa có phòng phù hợp: bấm "+" cạnh ô Phòng để thêm nhanh (Quản trị viện, VT-TBYT).',
              'Nhập thông tin mua sắm: nhà cung cấp, nguyên giá, ngày nhận, ngày đưa vào sử dụng, bảo hành đến, nguồn vốn.',
              'Lưu. Sau đó vào hồ sơ để bổ sung thông số, phụ kiện, tài liệu (hướng dẫn sử dụng, chứng nhận).',
              'In tem QR (Thiết bị → Tem QR) và dán lên máy để quét bằng điện thoại.',
            ],
          },
        ],
      },
      {
        id: 'thiet-bi-trang-thai',
        title: '4.2 Trạng thái máy',
        blocks: [
          {
            type: 'table',
            head: ['Trạng thái', 'Ý nghĩa'],
            rows: [
              ['Hoạt động', 'Máy đang dùng bình thường'],
              ['Hỏng', 'Đang có phiếu sửa chữa và máy không dùng được'],
              ['Chờ linh kiện', 'Đang sửa, chờ vật tư/linh kiện'],
              ['Tạm ngưng', 'Ngưng sử dụng có thời hạn (bảo dưỡng lớn, chờ kiểm định…)'],
              ['Ngừng sử dụng', 'Thanh lý/không dùng nữa; máy vẫn lưu trong lịch sử'],
            ],
          },
          {
            type: 'p',
            text: 'Đổi trạng thái thủ công tại hồ sơ máy → "Đổi trạng thái" (ghi lý do). Khi tạo phiếu sửa chữa với "máy ngừng hoạt động", máy tự chuyển Hỏng và tự về Hoạt động khi phiếu hoàn thành.',
          },
        ],
      },
      {
        id: 'thiet-bi-dieu-chuyen',
        title: '4.3 Điều chuyển máy giữa các Khoa/Phòng ban',
        blocks: [
          {
            type: 'flow',
            steps: [
              'Tạo yêu cầu điều chuyển (Khoa đích, Phòng đích, vị trí, lý do)',
              'Quản trị viện duyệt',
              'Máy đổi Khoa/Phòng ban và Phòng, ghi vào lịch sử',
            ],
          },
          {
            type: 'p',
            text: 'Phòng đích chỉ chọn được sau khi chọn Khoa đích (gồm phòng của khoa đó và phòng dùng chung). Không chọn phòng đích → sau khi duyệt máy chưa gán phòng, cần vào Sửa hồ sơ để chọn.',
          },
          {
            type: 'p',
            text: 'Danh sách tại Thiết bị → Điều chuyển. Yêu cầu có thể huỷ trước khi duyệt.',
          },
        ],
      },
      {
        id: 'thiet-bi-qr',
        title: '4.4 Tem QR & so sánh máy',
        blocks: [
          {
            type: 'list',
            items: [
              'Tem QR: chọn nhiều máy → In tem (khổ A4 nhiều tem hoặc máy in nhãn). Quét tem bằng ứng dụng để mở hồ sơ, báo hỏng, xuất vật tư cho máy.',
              'Xoay QR: nếu tem bị lộ/mất, bấm "Xoay QR" để cấp mã mới, tem cũ hết hiệu lực.',
              'So sánh máy: chọn 2–4 máy cùng loại để so thông số, chi phí sửa chữa, số lần hỏng.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'sua-chua',
    title: '5. Sửa chữa',
    blocks: [
      {
        type: 'flow',
        steps: [
          'Khoa báo hỏng',
          'Tiếp nhận / Phân công',
          'Chẩn đoán',
          'Đang xử lý (chờ linh kiện / chờ hãng)',
          'Hoàn thành',
          'Khoa nghiệm thu',
          'Đóng phiếu',
        ],
      },
    ],
    children: [
      {
        id: 'sua-chua-bao-hong',
        title: '5.1 Báo hỏng (khoa)',
        roles: ['Mọi vai trò'],
        blocks: [
          {
            type: 'steps',
            items: [
              'Web: Sửa chữa → Phiếu sửa chữa → "Báo hỏng". App: quét QR trên máy → "Báo hỏng".',
              'Chọn máy, mô tả hiện tượng, mức độ (Thấp/Trung bình/Cao/Khẩn), đánh dấu "Máy ngừng hoạt động" nếu không dùng được, chụp ảnh.',
              'Hệ thống gợi ý lỗi thường gặp từ Thư viện lỗi theo model máy — chọn nếu đúng để phòng Vật tư xử lý nhanh hơn.',
              'Gửi. Phiếu có mã SC-… và hạn xử lý (SLA) tính theo mức độ; phòng Vật tư nhận thông báo ngay.',
            ],
          },
        ],
      },
      {
        id: 'sua-chua-xu-ly',
        title: '5.2 Xử lý phiếu (phòng Vật tư)',
        roles: ['Nhân viên VT-TBYT', 'Quản trị viện'],
        blocks: [
          {
            type: 'steps',
            items: [
              'Tiếp nhận phiếu (tự gán cho mình) hoặc Quản trị viện "Phân công" — hệ thống gợi ý người phụ trách máy và người ít việc nhất; kỹ sư có thể nhận/từ chối việc.',
              'Chẩn đoán: ghi kết luận, chọn lỗi/nhóm lỗi từ thư viện, chọn phương án (nội bộ, thuê ngoài, bảo hành, máy dự phòng).',
              'Chuyển "Đang xử lý". Ghi nhật ký từng bước (app ghi được offline). Thêm linh kiện dùng (lấy từ kho → tự tạo phiếu xuất), thuê ngoài (nhà cung cấp, hợp đồng), chi phí.',
              'Cần chờ vật tư → "Chờ linh kiện"; chờ hãng → "Chờ hãng". Hệ thống nhắc khi quá hạn SLA và cảnh báo nếu chi phí vượt % nguyên giá.',
              'Hoàn thành: tóm tắt kết quả, bảo hành sau sửa, ký; có thể "Đề xuất lỗi mới" vào thư viện. Nếu nhóm lỗi yêu cầu, hệ thống tự tạo phiếu kiểm định sau sửa.',
            ],
          },
        ],
      },
      {
        id: 'sua-chua-nghiem-thu',
        title: '5.3 Nghiệm thu & đóng phiếu',
        blocks: [
          {
            type: 'list',
            items: [
              'Khoa (trưởng khoa hoặc nhân viên) vào phiếu → "Nghiệm thu": đạt/không đạt, chấm 1–5 sao, ký. Không đạt → phiếu quay lại Đang xử lý.',
              'Quản trị viện "Đóng phiếu". In biên bản sửa chữa (PDF) tại nút "Biên bản".',
              'Thống kê sửa chữa: số phiếu, chi phí, thời gian xử lý trung bình (MTTR), khoảng cách giữa các lần hỏng (MTBF), thời gian máy ngừng — theo máy, khoa, nhân viên, tháng.',
            ],
          },
        ],
      },
      {
        id: 'thu-vien-loi',
        title: '5.4 Thư viện lỗi',
        blocks: [
          {
            type: 'p',
            text: 'Kho tri thức lỗi thường gặp theo model máy: mã lỗi, hiện tượng, nguyên nhân, các bước xử lý, linh kiện cần. Nhân viên Vật tư soạn → Quản trị viện ban hành. Người dùng bấm 👍/👎 để đánh giá; đề xuất từ phiếu sửa chữa nằm ở "Đề xuất chờ duyệt".',
          },
        ],
      },
    ],
  },
  {
    id: 'bao-duong',
    title: '6. Bảo dưỡng – Kiểm định',
    blocks: [],
    children: [
      {
        id: 'bao-duong-ke-hoach',
        title: '6.1 Kế hoạch & công việc bảo dưỡng',
        roles: ['Nhân viên VT-TBYT', 'Quản trị viện'],
        blocks: [
          {
            type: 'steps',
            items: [
              'Checklist mẫu: tạo mẫu theo loại máy (các mục kiểm tra: đạt/không đạt, đo số, ghi chú).',
              'Kế hoạch bảo dưỡng: chọn máy hoặc nhóm máy, chu kỳ (tháng/quý/năm), checklist, người phụ trách, nhà cung cấp nếu thuê ngoài → "Xem trước" lịch → "Sinh công việc".',
              'Công việc bảo dưỡng: đến ngày, nhân viên mở việc (web hoặc app quét QR), thực hiện checklist, chụp ảnh, ghi vật tư dùng, ký → Hoàn thành. Bỏ qua phải ghi lý do.',
              'Bảo dưỡng đột xuất: "Tạo đột xuất" từ danh sách hoặc từ hồ sơ máy.',
            ],
          },
          {
            type: 'note',
            tone: 'info',
            text: 'Lịch: xem theo tháng/tuần toàn bộ bảo dưỡng và kiểm định; kéo thả để dời ngày (ghi vào lịch sử).',
          },
        ],
      },
      {
        id: 'kiem-dinh',
        title: '6.2 Kiểm định – hiệu chuẩn',
        blocks: [
          {
            type: 'steps',
            items: [
              'Tạo phiếu kiểm định: máy, loại (kiểm định/hiệu chuẩn/kiểm tra an toàn), hạn, đơn vị kiểm định.',
              'Khi có kết quả: "Hoàn thành" → ngày thực hiện, kết quả đạt/không đạt, số chứng nhận, đính kèm chứng nhận, chi phí, hạn kế tiếp.',
              'Hệ thống nhắc trước hạn (số ngày cấu hình ở Cấu hình → Cảnh báo) và cảnh báo máy quá hạn kiểm định trên Tổng quan.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kho',
    title: '7. Kho vật tư & hoá chất',
    blocks: [
      {
        type: 'p',
        text: 'Quản lý vật tư tiêu hao, hoá chất, linh kiện theo kho, theo lô và hạn dùng. Tồn kho chỉ thay đổi qua phiếu đã ghi sổ (nhập, xuất, chuyển, điều chỉnh, kiểm kê).',
      },
    ],
    children: [
      {
        id: 'kho-danh-muc',
        title: '7.1 Danh mục vật tư & định mức',
        blocks: [
          {
            type: 'list',
            items: [
              'Mỗi vật tư có mã, tên, đơn vị, nhóm, theo dõi lô/hạn (bật/tắt), định mức tồn tối thiểu – tối đa, máy tương thích. Khi thêm mới, ô Mã có thể để trống — hệ thống tự sinh (VT-00001…).',
              'Nhập từ Excel: Danh mục vật tư → Nhập Excel (tải mẫu, điền, tải lên).',
              'Tồn kho: xem tồn theo kho, theo lô, thẻ kho (lịch sử nhập – xuất) của từng vật tư.',
            ],
          },
        ],
      },
      {
        id: 'kho-nhap',
        title: '7.2 Nhập kho',
        blocks: [
          {
            type: 'steps',
            items: [
              'Phiếu nhập → "Tạo phiếu nhập": loại (mua, khoa trả lại, điều chỉnh tăng), nhà cung cấp, kho, số hoá đơn.',
              'Thêm dòng: vật tư, số lượng, đơn giá, số lô, hạn dùng (bắt buộc với vật tư theo dõi lô).',
              'Lưu nháp → kiểm tra QC (đạt/không đạt) → "Ghi sổ" để cộng tồn. Phiếu đã ghi sổ không sửa; sai thì "Huỷ" (trong cửa sổ ngày cho phép) rồi lập lại.',
            ],
          },
        ],
      },
      {
        id: 'kho-xuat',
        title: '7.3 Xuất kho, chuyển kho, huỷ',
        blocks: [
          {
            type: 'list',
            items: [
              'Xuất kho: cấp cho khoa, cho phiếu sửa chữa/bảo dưỡng, xuất huỷ, điều chỉnh giảm. Hệ thống gợi ý lô hết hạn trước (FEFO); người nhận ký trên app. "Xuất nhanh" cho vài dòng.',
              'Chuyển kho: chuyển lô giữa các kho (ví dụ từ kho hoá chất xuống kho khoa).',
              'Huỷ vật tư hỏng/hết hạn: phiếu xuất huỷ có lý do, ảnh.',
            ],
          },
        ],
      },
      {
        id: 'kho-canh-bao',
        title: '7.4 Cảnh báo kho',
        blocks: [
          {
            type: 'p',
            text: 'Hệ thống tự tạo cảnh báo: dưới định mức, sắp hết hạn (số ngày cấu hình), đã hết hạn, lọ đã mở quá hạn, tồn lâu không dùng. Xử lý xong bấm "Giải quyết" kèm ghi chú.',
          },
        ],
      },
    ],
  },
  {
    id: 'phieu-yeu-cau',
    title: '8. Phiếu yêu cầu vật tư (khoa → phòng Vật tư)',
    blocks: [
      {
        type: 'flow',
        steps: [
          'Khoa tạo phiếu',
          'Trưởng khoa duyệt (nếu bật 2 cấp)',
          'Phòng Vật tư duyệt số lượng',
          'Cấp phát (tạo phiếu xuất)',
          'Khoa xác nhận đã nhận',
        ],
      },
      {
        type: 'steps',
        items: [
          'Phiếu yêu cầu → "Tạo phiếu": chọn vật tư, số lượng, ngày cần, lý do; đánh dấu Khẩn nếu cần. Vật tư vượt định mức khoa sẽ có cảnh báo.',
          'Gửi phiếu. Theo dõi trạng thái và bình luận trao đổi ngay trong phiếu.',
          'Phòng Vật tư: "Duyệt" (có thể sửa số lượng từng dòng, duyệt hàng loạt) hoặc "Từ chối" (ghi lý do) → "Cấp phát" → phiếu xuất tự tạo.',
          'Khoa: khi nhận hàng bấm "Đã nhận". Hệ thống nhắc nếu quá lâu chưa xác nhận.',
          'Phiếu định kỳ: lập một lần cho vật tư dùng thường xuyên, hệ thống tự tạo phiếu theo chu kỳ. Định mức: quản trị đặt hạn mức theo khoa/vật tư/tháng.',
        ],
      },
    ],
  },
  {
    id: 'kiem-ke',
    title: '9. Kiểm kê',
    blocks: [
      {
        type: 'steps',
        items: [
          'Kiểm kê → "Tạo đợt kiểm kê": loại (thiết bị hoặc vật tư), phạm vi (toàn viện, khoa, kho), người tham gia.',
          'Nhân viên dùng app: tải danh sách về máy, quét QR từng máy/lô — đếm được cả khi mất mạng, tự gửi khi có mạng lại. Máy/vật tư không có trong danh sách quét được sẽ vào mục "Phát hiện thêm".',
          'Theo dõi tiến độ trên web; "So sánh" chênh lệch sổ sách – thực tế.',
          'Rà soát, ghi nguyên nhân chênh lệch → "Đóng đợt": hệ thống tạo phiếu điều chỉnh tồn và biên bản kiểm kê (PDF).',
        ],
      },
    ],
  },
  {
    id: 'bao-cao',
    title: '10. Báo cáo & Dashboard',
    blocks: [
      {
        type: 'list',
        items: [
          '19 báo cáo sẵn: thiết bị theo Khoa/Phòng ban (có cột Phòng), thiết bị theo phòng, máy hỏng, chi phí sửa chữa, lịch bảo dưỡng/kiểm định, tồn kho, xuất – nhập – tồn, hạn dùng, định mức, phiếu yêu cầu theo khoa…',
          'Chọn báo cáo → đặt bộ lọc (khoảng ngày, Khoa/Phòng ban, kho) → Xem hoặc Xuất Excel/PDF. Báo cáo lớn chạy nền, xong có thông báo để tải.',
          'Báo cáo tuỳ chỉnh: tự chọn nguồn (thiết bị — có trường Phòng, sửa chữa, xuất nhập, phiếu yêu cầu, bảo dưỡng), cột, điều kiện lọc; lưu để dùng lại.',
        ],
      },
    ],
  },
  {
    id: 'tro-ly-ai',
    title: '11. Trợ lý AI',
    roles: ['Quản trị viện', 'Nhân viên VT-TBYT', 'Trưởng khoa'],
    blocks: [
      {
        type: 'p',
        text: 'Hỏi bằng tiếng Việt trên dữ liệu của viện: "Máy nào quá hạn kiểm định?", "Tháng này chi phí sửa chữa khoa Xét nghiệm bao nhiêu?", "Hoá chất Cobas còn bao nhiêu?", "Lỗi E-102 trên Sysmex xử lý thế nào?" (tra từ tài liệu và thư viện lỗi). Kết quả kèm nguồn; có thể chụp ảnh màn hình lỗi để hỏi.',
      },
      {
        type: 'note',
        tone: 'warning',
        text: 'Quản trị viện bật và cấu hình nhà cung cấp AI tại Cấu hình → AI (khoá API, mô hình, ngân sách token). Khi chưa bật, mục này ẩn.',
      },
      {
        type: 'p',
        text: 'Bản tin tuần: sáng thứ Hai hệ thống tổng hợp tình hình tuần trước (máy hỏng mới, sửa xong, quá hạn kiểm định, cảnh báo kho, phiếu chờ) gửi Quản trị viện và phòng Vật tư.',
      },
    ],
  },
  {
    id: 'ung-dung-di-dong',
    title: '12. Ứng dụng di động',
    roles: ['Nhân viên VT-TBYT'],
    blocks: [
      {
        type: 'list',
        items: [
          'Trang chủ: việc của tôi hôm nay, cảnh báo, lối tắt.',
          'Quét: quét QR máy hoặc mã vạch lô để mở hồ sơ, báo hỏng, xuất vật tư, đếm kiểm kê; chế độ quét liên tục cho chuyển kho/kiểm kê.',
          'Sửa chữa: nhận việc, ghi nhật ký (offline được), thêm linh kiện, ký, hoàn thành ngay tại máy.',
          'Bảo dưỡng: làm checklist tại chỗ, chụp ảnh, ký; nháp lưu offline.',
          'Kho: tra tồn, nhập/xuất/chuyển (cần mạng), người nhận ký trên màn hình.',
          'Kiểm kê offline: tải đợt về, đếm không cần mạng, tự đồng bộ.',
          'Cá nhân → Đồng bộ dữ liệu: xem thao tác đang chờ gửi khi mất mạng, bấm "Thử lại" nếu lỗi.',
        ],
      },
    ],
  },
  {
    id: 'quan-tri',
    title: '13. Quản trị viện',
    roles: ['Quản trị viện'],
    blocks: [
      {
        type: 'list',
        items: [
          'Người dùng: tạo tài khoản, gán vai trò và Khoa/Phòng ban, khoá/mở, đặt lại mật khẩu, xem phiên đăng nhập.',
          'Khoa/Phòng ban: mã, tên, loại, trưởng khoa, liên hệ; tab "Phòng" liệt kê các phòng của đơn vị kèm số máy, thêm phòng ngay tại đây. Khi thêm mới, ô Mã có thể để trống — hệ thống tự sinh (KH-001…).',
          'Phòng (mục riêng ngay dưới Khoa/Phòng ban): tên, Khoa/Phòng ban (chọn "Dùng chung" cho hội trường, kho chung…), toà nhà, tầng, loại phòng (xét nghiệm, buồng bệnh, phòng mổ, chẩn đoán hình ảnh, văn phòng, kho, khác); mã để trống sẽ tự sinh (PH-0001…). Bảng có cột Số máy (bấm để xem máy trong phòng); lọc theo Khoa/Phòng ban, loại, trạng thái; nhập/xuất Excel (cột departmentCode trống = dùng chung). Phòng đang có máy không xoá được — tắt "Đang hoạt động" để ẩn khỏi danh sách chọn.',
          'Danh mục khác: nhóm thiết bị, hãng, nhà cung cấp, đơn vị tính, nguồn vốn, kho, đơn vị kiểm định, loại chi phí… (có nhập Excel). Khi thêm mới, ô Mã không bắt buộc: để trống hệ thống tự sinh theo mẫu đánh số (NCC-0001, NSX-0001, NTB-001…), nhập thì chỉ dùng chữ in hoa, số, _, -. Mã sinh ra hiển thị ngay trong thông báo sau khi tạo; mã không đổi được khi sửa.',
          'Cấu hình: thông tin viện, quy trình (số cấp duyệt phiếu, SLA sửa chữa theo mức độ), kho (FEFO, cửa sổ huỷ phiếu), cảnh báo (số ngày báo trước), đánh số phiếu, AI, mẫu in.',
          'Nhật ký hệ thống: ai làm gì lúc nào, xem chi tiết trước/sau của mỗi thay đổi.',
        ],
      },
    ],
  },
  {
    id: 'du-tru',
    title: '15. Dự trù (kế hoạch mua sắm theo kỳ)',
    blocks: [
      {
        type: 'flow',
        steps: [
          'Quản trị viện mở kỳ dự trù',
          'Khoa lập phiếu & gửi',
          'Trưởng khoa duyệt phiếu khoa',
          'Vật tư – TBYT tổng hợp & chỉnh số duyệt',
          'Ban giám đốc chốt kỳ (Duyệt → Đóng)',
        ],
      },
      {
        type: 'steps',
        items: [
          'Menu Mua sắm → Dự trù. Kỳ năm chia 12 tháng (mặc định), kỳ quý 4 quý, kỳ đột xuất một tổng; hạn nộp do quản trị đặt (nhắc trước 3 ngày & khi quá hạn).',
          'Khoa: bấm phiếu của khoa → "Thêm dòng" hoặc "Nhập Excel" (tải mẫu đầy đủ trước). Với vật tư hệ thống tự theo dõi tồn kho sẽ hiện chip "Gợi ý" — bấm để lấy số lượng gợi ý phỏng theo tiêu hao 12 tháng, tồn kho và mức tồn tối thiểu; số lượng chia đều vào các tháng bằng nút "Chia đều". Gửi phiếu để trưởng khoa duyệt.',
          'Trưởng khoa: "Duyệt (trưởng khoa)" hoặc "Trả lại" (ghi lý do) — khoa sửa lại rồi gửi lại. Nếu khoa không có trưởng khoa, vật tư duyệt thay.',
          'Vật tư – TBYT: tab Tổng hợp gộp theo vật tư × khoa — sửa tổng số duyệt (hỏi "phân bổ tỷ lệ theo khoa?"), mỗi khoa trong phần mở rộng; quyết định từng dòng: Cần mua / Lấy từ kho / Không duyệt; "Xuất Excel", "Tờ trình PDF", "Tính lại" khi có dữ liệu mới.',
          'Quản trị viện "Duyệt" (khoá số) → "Đóng kỳ": dòng "Lấy từ kho" tự tạo phiếu yêu cầu cấp phát cho từng khoa; danh mục "Cần mua" giữ cho bước mua sắm (hợp đồng/PO).',
        ],
      },
      {
        type: 'note',
        tone: 'success',
        text: 'Gợi ý số lượng: (tiêu hao trung bình tháng × 12 + 1 tháng dự phòng) − tồn toàn viện, làm tròn lên theo đơn vị; khoa chưa có dữ liệu tiêu hao → dùng mức tồn tối thiểu. Thiết bị mua mới / dịch vụ không gợi ý, do khoa tự nhập thông số và đơn giá ước.',
      },
      {
        type: 'list',
        items: [
          'Quyết định: Cần mua — mua mới trong kỳ; Lấy từ kho — tự tạo phiếu yêu cầu cấp phát khi đóng kỳ; Không duyệt — bỏ kèm ghi chú lý do.',
          'Trạng thái kỳ: Nháp → Đang nhận (khoa lập phiếu) → Đang tổng hợp → Đã duyệt → Đã đóng (chỉ đọc); được Huỷ từ mọi trạng thái trước Duyệt.',
          'Cột "SL duyệt" từng dòng chỉ phòng Vật tư sửa trên phiếu đã gửi; phiếu khoa chỉ sửa được khi Nháp hoặc Bị trả lại.',
        ],
      },
    ],
  },
  {
    id: 'cau-hoi',
    title: '14. Câu hỏi thường gặp',
    blocks: [
      {
        type: 'table',
        head: ['Câu hỏi', 'Trả lời'],
        rows: [
          [
            'Tôi không thấy máy của khoa khác?',
            'Đúng thiết kế: vai trò khoa chỉ thấy máy/phiếu của khoa mình. Cần xem toàn viện → liên hệ quản trị cấp vai trò phù hợp.',
          ],
          [
            'Phiếu nhập đã ghi sổ nhưng nhập sai số lượng?',
            'Không sửa được phiếu đã ghi sổ. Huỷ phiếu (nếu còn trong cửa sổ ngày cho phép) rồi lập phiếu mới, hoặc lập phiếu điều chỉnh.',
          ],
          [
            'Quét QR không nhận?',
            'Kiểm tra tem có bị xoay (cấp mã mới) không; thử nhập mã máy vào ô tìm kiếm của màn quét. Tem in mờ → in lại từ Thiết bị → Tem QR.',
          ],
          [
            'App mất mạng có làm việc được không?',
            'Được với nhật ký sửa chữa, checklist bảo dưỡng, kiểm kê, ảnh đính kèm — dữ liệu xếp hàng và tự gửi khi có mạng. Nhập/xuất kho cần mạng.',
          ],
          [
            'Máy sửa xong sao vẫn báo Hỏng?',
            'Máy chỉ về Hoạt động khi không còn phiếu sửa chữa mở nào có "máy ngừng hoạt động". Kiểm tra các phiếu khác của máy.',
          ],
          [
            'Làm sao in biên bản?',
            'Trong phiếu sửa chữa/bảo dưỡng/nhập/xuất/kiểm kê có nút "Biên bản" (PDF) sau khi hoàn thành/ghi sổ.',
          ],
          [
            'Thêm mới danh mục nhưng không biết đặt Mã?',
            'Ô Mã không bắt buộc: để trống hệ thống tự sinh theo mẫu đánh số (NCC-0001 nhà cung cấp, NSX-0001 hãng, KH-001 khoa, PH-0001 phòng, VT-00001 vật tư, TB-2026-00001 máy…). Mã sinh ra hiện ngay trong thông báo "Đã tạo … — mã …". Muốn tự đặt thì chỉ dùng chữ in hoa, số, _, - (vd NCC-001); sau khi tạo không đổi được mã. Quản trị có thể đổi mẫu đánh số tại Cấu hình → Đánh số.',
          ],
        ],
      },
      {
        type: 'note',
        tone: 'success',
        text: 'Hỗ trợ: liên hệ phòng Vật tư – Thiết bị y tế hoặc đơn vị triển khai theo thông tin ở Cấu hình → Viện.',
      },
    ],
  },
]
