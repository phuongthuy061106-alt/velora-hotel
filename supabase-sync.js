// ============================================================================
// VELORA HOTEL - ĐỒNG BỘ VỚI SUPABASE (GIAI ĐOẠN 1)
// - Đọc: Supabase -> state (loại phòng, phòng, bảng giá, khách, đơn đặt, lưu trú, hóa đơn)
// - Ghi: đặt phòng / xác nhận / nhận phòng / trả phòng / hủy đều gọi hàm RPC trong DB,
//        xong thì tải lại dữ liệu (DB là nguồn sự thật, web chỉ hiển thị).
// - Chưa đồng bộ ngược: thêm/sửa loại phòng, phòng, bảng giá, dịch vụ, nhân sự từ web.
// CHƯA CHẠY THỬ: cần kiểm tra với dữ liệu thật trên project Supabase của bạn.
// ============================================================================

// Sửa dòng 10 trong supabase-sync.js (bỏ '/rest/v1/')
const VEL_SUPABASE_URL = 'https://rdlosoknzxsiuwbgwqfg.supabase.co';
const VEL_SUPABASE_KEY = 'sb_publishable_v5QQqyTXbXzSG88CpB5s-g_wBPK0Yc3';

const velClient = window.supabase.createClient(VEL_SUPABASE_URL, VEL_SUPABASE_KEY);

// ---------- Tiện ích mã & thời gian ----------
const pad = (n, w = 3) => String(n).padStart(w, '0');
const idOf = (prefix, n, w = 3) => prefix + pad(n, w);          // 12 -> 'P012'
const numOf = (s) => parseInt(String(s).replace(/\D/g, ''), 10); // 'P012' -> 12
const dateStr = (d) => (d ? String(d).slice(0, 10) : '');
function localDT(ts, sep = ' ') {
  if (!ts) return '';
  const d = new Date(ts);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}${sep}${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---------- Bảng chuyển đổi trạng thái ----------
const BOOKING_STATUS = {
  CHO_XAC_NHAN: 'Chưa xác nhận', CHO_COC: 'Đã xác nhận', DA_COC: 'Đã xác nhận',
  DANG_O: 'Đang lưu trú', HOAN_TAT: 'Hoàn thành', DA_HUY: 'Đã hủy', NO_SHOW: 'Đã hủy'
};
const SOURCE = {
  TRUC_TIEP: 'Trực tiếp tại quầy', DIEN_THOAI: 'Điện thoại', WEBSITE: 'Website',
  ZALO: 'Zalo', OTA: 'OTA (Booking.com...)', AI_AGENT: 'AI Agent'
};
const ROOM_STATUS = { TRONG: 'Trống', DANG_SU_DUNG: 'Đang ở', DANG_DON: 'Đang dọn', BAO_TRI: 'Bảo trì' };
const PAY_METHOD = { TIEN_MAT: 'Tiền mặt', CHUYEN_KHOAN: 'Chuyển khoản ngân hàng', THE: 'Thẻ', VI_DIEN_TU: 'Ví điện tử' };

// ---------- ĐỌC: dựng state từ DB ----------
async function velFetchState(base) {
  const q = (t, sel = '*') => velClient.from(t).select(sel);
  const [lp, bg, ti, ctti, ph, kh, ddp, lt, tt] = await Promise.all([
    q('loai_phong'), q('bang_gia'), q('tien_ich'), q('chi_tiet_tien_ich'), q('phong'),
    q('khach_hang'), q('don_dat_phong', '*, chi_tiet_don(*)'), q('luu_tru', '*, chi_tiet_don(ma_don)'),
    q('thanh_toan')
  ]);
  for (const r of [lp, bg, ti, ctti, ph, kh, ddp, lt, tt]) if (r.error) throw r.error;

  const today = new Date().toISOString().slice(0, 10);
  const tiName = new Map(ti.data.map((t) => [t.ma_tien_ich, t.ten_tien_ich]));
  const custById = new Map(kh.data.map((c) => [c.ma_khach_hang, c]));

  // Bảng giá
  const pricePlans = bg.data.map((b) => ({
    id: idOf('BG', b.ma_bang_gia), categoryId: idOf('HP', b.ma_loai_phong),
    startDate: dateStr(b.ngay_bat_dau), endDate: dateStr(b.ngay_ket_thuc),
    price: Number(b.gia_phong), note: 'Loại giá: ' + b.loai_gia, status: 'Đang áp dụng'
  }));

  // Loại phòng
  const roomCategories = lp.data.map((x) => {
    const mine = bg.data.filter((b) => b.ma_loai_phong === x.ma_loai_phong);
    const base = mine.find((b) => b.loai_gia === 'THUONG' && b.ngay_bat_dau <= today && (!b.ngay_ket_thuc || b.ngay_ket_thuc >= today)) || mine[0];
    const names = ctti.data.filter((c) => c.ma_loai_phong === x.ma_loai_phong).map((c) => tiName.get(c.ma_tien_ich)).filter(Boolean);
    const cat = {
      id: idOf('HP', x.ma_loai_phong), name: x.ten_loai_phong, area: Number(x.dien_tich),
      beds: x.loai_giuong, maxAdults: x.so_luong_nguoi_lon, price: base ? Number(base.gia_phong) : 0,
      status: 'Đang kinh doanh', description: x.mo_ta || '', images: [],
      amenitiesList: names, amenities: names.join(', ')
    };
    return typeof ensureCategoryDefaults === 'function' ? (ensureCategoryDefaults(cat), cat) : cat;
  });

  // Phòng
  const rooms = ph.data.map((r) => ({
    id: idOf('P', r.ma_phong), name: 'Phòng ' + r.so_phong, floor: r.so_tang,
    categoryId: idOf('HP', r.ma_loai_phong), bedConfig: '', status: ROOM_STATUS[r.trang_thai] || 'Trống',
    currentGuest: '', note: '', businessStatus: 'Đang kinh doanh', dbId: r.ma_phong
  }));

  // Khách hàng
  const customers = kh.data.map((c) => ({
    id: idOf('KH', c.ma_khach_hang), name: c.ten_khach_hang, phone: c.so_dien_thoai, email: c.email || '',
    idCard: c.so_giay_to || '', note: '', status: 'Đang hoạt động'
  }));

  // Lưu trú -> checkins
  const checkins = lt.data.map((s) => {
    const don = ddp.data.find((d) => d.ma_don === s.chi_tiet_don.ma_don);
    const c = don && custById.get(don.ma_khach_hang);
    return {
      id: idOf('LT', s.ma_luu_tru), luuTruId: s.ma_luu_tru, lineId: s.ma_chi_tiet,
      bookingId: don ? don.ma_don_hien_thi : '', customerId: c ? idOf('KH', c.ma_khach_hang) : '',
      guestName: c ? c.ten_khach_hang : '', phone: c ? c.so_dien_thoai : '', idCard: c ? c.so_giay_to || '' : '',
      roomId: idOf('P', s.ma_phong),
      expectedCheckIn: don ? `${dateStr(don.ngay_den)} 14:00` : '', actualCheckIn: localDT(s.thoi_gian_nhan_phong, 'T'),
      expectedCheckOut: don ? `${dateStr(don.ngay_di)} 12:00` : '', actualCheckOut: localDT(s.thoi_gian_tra_phong, 'T'),
      earlySurcharge: Number(s.phu_thu_nhan_som || 0), lateSurcharge: Number(s.phu_thu_tra_muon || 0),
      staffName: s.nhan_vien_xu_ly || '', note: s.ghi_chu || '',
      status: s.thoi_gian_tra_phong ? 'Đã trả phòng' : 'Đang lưu trú'
    };
  });

  // Đơn đặt phòng -> bookings
  const bookings = ddp.data.map((d) => {
    const c = custById.get(d.ma_khach_hang) || {};
    const lines = d.chi_tiet_don || [];
    const first = lines[0] || {};
    const items = [];
    lines.forEach((l) => {
      const cid = idOf('HP', l.ma_loai_phong);
      const it = items.find((i) => i.categoryId === cid && i.unitPrice === Number(l.gia_moi_dem));
      if (it) it.qty++; else items.push({ categoryId: cid, qty: 1, unitPrice: Number(l.gia_moi_dem) });
    });
    const stays = checkins.filter((s) => s.bookingId === d.ma_don_hien_thi);
    const status = BOOKING_STATUS[d.trang_thai] || 'Chưa xác nhận';
    return {
      id: d.ma_don_hien_thi, dbId: d.ma_don, bookingTime: localDT(d.ngay_tao),
      customerId: idOf('KH', d.ma_khach_hang), source: SOURCE[d.nguon_tao] || d.nguon_tao,
      guestName: c.ten_khach_hang || '', phone: c.so_dien_thoai || '', email: c.email || '', idCard: c.so_giay_to || '',
      adults: first.so_nguoi_lon || 1, children6to11: first.so_tre_em_6_11 || 0,
      childrenUnder6: first.so_tre_em_duoi_6 || 0, extraBed: first.so_giuong_phu || 0,
      categoryId: first.ma_loai_phong ? idOf('HP', first.ma_loai_phong) : '',
      roomIds: stays.filter((s) => s.status === 'Đang lưu trú').map((s) => s.roomId),
      roomId: (stays.find((s) => s.status === 'Đang lưu trú') || {}).roomId || '',
      lines: lines.map((l) => ({ id: l.ma_chi_tiet, categoryId: idOf('HP', l.ma_loai_phong) })),
      checkIn: dateStr(d.ngay_den), checkOut: dateStr(d.ngay_di), nights: d.so_dem, items,
      earlyLatePercent: 0, roomTotal: Number(d.tong_tien_phong), surchargeTotal: 0,
      totalAmount: Number(d.tong_tien_phong), depositAmount: Math.round(Number(d.tong_tien_phong) * 0.5),
      depositPaid: Number(d.tien_coc) > 0, status,
      checkedOutPaid: d.trang_thai === 'HOAN_TAT',
      cancelled: d.trang_thai === 'DA_HUY' || d.trang_thai === 'NO_SHOW',
      cancelDate: dateStr(d.ngay_huy), cancelFee: Number(d.phi_huy || 0), cancelReason: d.ly_do_huy || '',
      note: d.ghi_chu || ''
    };
  });

  // Thanh toán -> invoices (khoản thanh toán trả phòng + phí hủy)
  const invoices = [];
  tt.data.filter((t) => t.phan_loai === 'THANH_TOAN' && t.trang_thai === 'THANH_CONG').forEach((t) => {
    const bk = bookings.find((b) => b.dbId === t.ma_don) || {};
    invoices.push({
      id: idOf('HD', t.ma_thanh_toan), bookingId: bk.id || '', customerId: bk.customerId || '',
      guestName: bk.guestName || '', roomId: '', categoryName: '', createdDate: localDT(t.thoi_gian_lap).slice(0, 10),
      createdTime: localDT(t.thoi_gian_lap), categoryType: 'Thanh toán trả phòng',
      roomCharge: bk.roomTotal || 0, surchargeAmount: 0, serviceItems: [], serviceChargeTotal: 0,
      totalBeforeDeposit: Number(t.tong_tien), depositPaid: 0, finalPayable: Number(t.tong_tien),
      paymentMethod: PAY_METHOD[t.phuong_thuc] || t.phuong_thuc, status: 'Đã thanh toán'
    });
  });
  bookings.filter((b) => b.cancelled && b.cancelFee > 0).forEach((b, i) => {
    invoices.push({
      id: 'HD-HUY-' + pad(b.dbId), bookingId: b.id, customerId: b.customerId, guestName: b.guestName,
      roomId: '-', roomNames: '-', categoryName: '', createdDate: b.cancelDate, createdTime: b.cancelDate,
      categoryType: 'Phí hủy phòng', roomCharge: 0, surchargeAmount: b.cancelFee,
      serviceItems: [{ name: 'Phí hủy đặt phòng', qty: 1, price: b.cancelFee }], serviceChargeTotal: b.cancelFee,
      totalBeforeDeposit: b.cancelFee, depositPaid: b.cancelFee, finalPayable: 0,
      paymentMethod: 'Khấu trừ tiền cọc', status: 'Đã thanh toán'
    });
  });

  // Giữ lại những phần chưa đồng bộ (hotelInfo, phụ thu, chính sách hủy, dịch vụ, nhân sự...)
  return Object.assign({}, base, {
    roomCategories, rooms, pricePlans, customers, bookings, checkins, invoices
  });
}

// Tải lại từ DB, cập nhật state toàn cục, vẽ lại màn hình đang mở
async function velRefresh() {
  const next = await velFetchState(state);
  state = next;
  if (typeof syncRoomReservationStates === 'function') syncRoomReservationStates();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {} // cache
  if (typeof updateSidebarCounters === 'function') updateSidebarCounters(state);
  if (typeof renderCurrentView === 'function') renderCurrentView();
}

// ---------- GHI: gọi RPC, kiểm tra success, rồi tải lại ----------
async function velRpc(name, args) {
  const { data, error } = await velClient.rpc(name, args);
  if (error) throw new Error(error.message);
  if (data && data.success === false) throw new Error(data.error || 'Thao tác thất bại');
  await velRefresh();
  return data;
}

const velSb = {
  // Đăng nhập bằng Supabase Auth (email + mật khẩu), thay cho admin/123 ghi cứng
  async login(email, password) {
    const { data, error } = await velClient.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await velRefresh();
    velSb.subscribe();
    return data.user;
  },
async logout() {
    await velClient.auth.signOut();
  }, // <-- Bắt buộc phải có dấu phẩy ở đây
  async restoreSession() {
    const { data: { session } } = await velClient.auth.getSession();
    if (!session || !session.user) return null;
    await velRefresh();
    velSb.subscribe();
    return session.user;
  },
                

  // Đặt phòng mới (1 hạng phòng / lần gọi)
  createBooking: (f) => velRpc('api_tao_don_dat_phong', {
    p_ten_khach_hang: f.name, p_so_dien_thoai: f.phone, p_email: f.email || null,
    p_ngay_den: f.checkIn, p_ngay_di: f.checkOut, p_ma_loai_phong: numOf(f.categoryId),
    p_so_luong_phong: f.qty || 1, p_so_nguoi_lon: f.adults || 2,
    p_so_tre_duoi_6: f.childrenUnder6 || 0, p_so_tre_6_11: f.children6to11 || 0,
    p_ghi_chu: f.note || null, p_nguon_tao: f.source || 'TRUC_TIEP'
  }),

  // Xác nhận đơn + ghi nhận tiền cọc
  confirmBooking: (bk, deposit, method = 'CHUYEN_KHOAN') => velRpc('admin_xac_nhan_don', {
    p_ma_don_hien_thi: bk.id, p_tien_coc: deposit ?? null, p_phuong_thuc: method, p_ghi_chu: null
  }),

  // Nhận phòng cho 1 phòng: chọn dòng chi tiết cùng hạng chưa có lượt lưu trú đang mở
  checkInRoom(bk, roomId, opts = {}) {
    const room = state.rooms.find((r) => r.id === roomId);
    const used = new Set(state.checkins.filter((c) => c.bookingId === bk.id && c.status === 'Đang lưu trú').map((c) => c.lineId));
    const line = (bk.lines || []).find((l) => l.categoryId === (room && room.categoryId) && !used.has(l.id));
    if (!line) return Promise.reject(new Error('Không tìm thấy dòng đặt phòng phù hợp với hạng phòng này.'));
    return velRpc('admin_check_in', {
      p_ma_chi_tiet: line.id, p_ma_phong: numOf(roomId),
      p_da_xac_minh_giay_to: opts.verified !== false,
      p_loai_giay_to: opts.docType || null, p_so_giay_to: opts.docNo || null,
      p_thoi_gian_nhan: opts.time || new Date().toISOString(),
      p_phu_thu_nhan_som: opts.earlyFee || 0,
      p_nhan_vien: (typeof currentAdminUser !== 'undefined' && currentAdminUser.name) || 'Lễ tân',
      p_ghi_chu: opts.note || null
    });
  },

  // Trả phòng cho 1 lượt lưu trú (checkin.luuTruId)
  checkOutStay: (checkin, opts = {}) => velRpc('admin_check_out', {
    p_ma_luu_tru: checkin.luuTruId, p_thoi_gian_tra: opts.time || new Date().toISOString(),
    p_phu_thu_tra_muon: opts.lateFee || 0, p_phuong_thuc: opts.method || 'CHUYEN_KHOAN'
  }),

  // Hủy đơn (DB tự tính phí hủy bằng fn_tinh_phi_huy)
  cancelBooking: (bk, reason) => velRpc('api_huy_don', {
    p_ma_don_hien_thi: bk.id, p_so_dien_thoai: bk.phone, p_ly_do_huy: reason || null
  }),

  // Realtime: đơn do AI Agent / khách tạo sẽ hiện ra ngay trên web
  subscribe() {
    if (velSb._ch) return;
    let t;
    const later = () => { clearTimeout(t); t = setTimeout(() => velRefresh().catch(console.warn), 600); };
    velSb._ch = velClient.channel('velora-sync');
    ['don_dat_phong', 'chi_tiet_don', 'luu_tru', 'thanh_toan', 'phong', 'khach_hang'].forEach((table) =>
      velSb._ch.on('postgres_changes', { event: '*', schema: 'public', table }, later));
    velSb._ch.subscribe();
  }
};
