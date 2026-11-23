// ============================================================================
// VELORA HOTEL - NỐI WEB VỚI SUPABASE (BẢN CUỐI, TỰ GẮN VÀO WEB)
// Tệp này tự "gắn" vào web đang chạy, KHÔNG cần sửa app.js hay transactions.js.
//
// ĐỌC  : Supabase -> web (danh mục, khách, nhân sự, đơn đặt, lưu trú, hóa đơn, cấu hình)
// GHI  : - Danh mục (hạng phòng, phòng, bảng giá, tiện ích, dịch vụ, khách, nhân sự, cấu hình):
//          web lưu như cũ, tệp này so sánh rồi tự đẩy phần thay đổi lên Supabase.
//        - Giao dịch (đặt phòng, xác nhận, nhận phòng, trả phòng, hủy): tự gọi các hàm trong DB.
// Sau mỗi lần ghi, web tải lại dữ liệu từ Supabase (Supabase là nguồn dữ liệu chính).
//
// BẠN CHỈ CẦN SỬA 2 DÒNG DƯỚI ĐÂY (lấy trong Supabase > Project Settings > API):
// ============================================================================

const VEL_SUPABASE_URL = 'https://rdlosoknzxsiuwbgwqfg.supabase.co';   // <-- dán "Project URL" vào đây
const VEL_SUPABASE_KEY = 'sb_publishable_v5QQqyTXbXzSG88CpB5s-g_wBPK0Yc3';        // <-- dán khóa "anon" / "publishable" (KHÔNG dùng service_role)

const velClient = window.supabase.createClient(VEL_SUPABASE_URL, VEL_SUPABASE_KEY);

// Số phiên bản: mở web, bấm F12, gõ VEL_VERSION để biết web đang chạy bản nào
const VEL_VERSION = '2026-11-23-api-tao-don-1-don';
console.info('Velora Supabase', VEL_VERSION);

// ---------- Tiện ích ----------
const pad = (n, w = 3) => String(n).padStart(w, '0');
const idOf = (prefix, n, w = 3) => prefix + pad(n, w);             // 12 -> 'P012'
const numOf = (s) => parseInt(String(s).replace(/\D/g, ''), 10);    // 'P012' -> 12
const dateStr = (d) => (d ? String(d).slice(0, 10) : '');
const byNum = (key) => (a, b) => a[key] - b[key];
function localDT(ts, sep = ' ') {
  if (!ts) return '';
  const d = new Date(ts);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}${sep}${p(d.getHours())}:${p(d.getMinutes())}`;
}
function velOk(res) { if (res.error) throw res.error; return res.data; }

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
const BIZ = { DANG_KINH_DOANH: 'Đang kinh doanh', NGUNG_KINH_DOANH: 'Ngừng kinh doanh' };
const BIZ_REV = { 'Đang kinh doanh': 'DANG_KINH_DOANH', 'Ngừng kinh doanh': 'NGUNG_KINH_DOANH' };
const USE = { DANG_DUNG: 'Đang kinh doanh', NGUNG: 'Ngừng kinh doanh' };
const USE_REV = { 'Đang kinh doanh': 'DANG_DUNG', 'Ngừng kinh doanh': 'NGUNG' };

// ============================================================================
// PHẦN 1. ĐỌC: dựng state từ DB
// ============================================================================
async function velFetchState(base) {
  const q = (t, sel = '*') => velClient.from(t).select(sel);
  const res = await Promise.all([
    q('loai_phong'), q('bang_gia'), q('nhom_tien_ich'), q('tien_ich'), q('chi_tiet_tien_ich'),
    q('phong'), q('khach_hang'), q('don_dat_phong', '*, chi_tiet_don(*)'),
    q('luu_tru', '*, chi_tiet_don(ma_don)'), q('thanh_toan'),
    q('nhom_dich_vu'), q('dich_vu'), q('quan_tri_vien'), q('cau_hinh_khach_san'), q('bang_gia_an')
  ]);
  const [lp, bg, ntiR, ti, ctti, ph, kh, ddp, lt, tt, ndv, dv, qtv, cfg, bga] = res.map(velOk);

  const today = new Date().toISOString().slice(0, 10);
  const custById = new Map(kh.map((c) => [c.ma_khach_hang, c]));
  const tiName = new Map(ti.map((t) => [t.ma_tien_ich, t.ten_tien_ich]));
  const ntiName = new Map(ntiR.map((g) => [g.ma_nhom, g.ten_nhom]));
  const ndvName = new Map(ndv.map((g) => [g.ma_nhom_dv, g.ten_nhom]));

  const planOf = (b, hidden) => ({
    id: idOf('BG', b.ma_bang_gia), categoryId: idOf('HP', b.ma_loai_phong),
    startDate: dateStr(b.ngay_bat_dau), endDate: dateStr(b.ngay_ket_thuc),
    price: Number(b.gia_phong), note: b.ghi_chu || '', status: hidden ? 'Đã ẩn' : 'Đang áp dụng', _loaiGia: b.loai_gia
  });
  const pricePlans = [...bg.map((b) => planOf(b, false)), ...bga.map((b) => planOf(b, true))]
    .sort((a, b) => numOf(a.id) - numOf(b.id));

  const roomCategories = lp.sort(byNum('ma_loai_phong')).map((x) => {
    const mine = bg.filter((b) => b.ma_loai_phong === x.ma_loai_phong);
    const cur = mine.find((b) => b.loai_gia === 'THUONG' && b.ngay_bat_dau <= today && (!b.ngay_ket_thuc || b.ngay_ket_thuc >= today)) || mine[0];
    const names = ctti.filter((c) => c.ma_loai_phong === x.ma_loai_phong).map((c) => tiName.get(c.ma_tien_ich)).filter(Boolean);
    const cat = {
      id: idOf('HP', x.ma_loai_phong), name: x.ten_loai_phong, area: Number(x.dien_tich),
      beds: x.loai_giuong || '', bedsEn: x.loai_giuong_en || '', capacity: x.suc_chua || '', capacityEn: x.suc_chua_en || '',
      stdAdults: x.so_luong_nguoi_lon, maxAdults: x.so_luong_nguoi_lon,
      stdChildren: x.so_luong_tre_em, maxChildren: x.so_luong_tre_em, maxExtraBed: x.giuong_phu_toi_da,
      price: Number(x.gia_niem_yet) || (cur ? Number(cur.gia_phong) : 0),
      vatPercent: Number(x.thue_vat_phan_tram), autoOvertime: x.tu_dong_phu_thu_gio,
      overtimeCalcType: String(x.kieu_phu_thu_gio || 'PERCENT').toLowerCase(),
      earlyCheckInRules: x.quy_tac_nhan_som, lateCheckOutRules: x.quy_tac_tra_muon,
      autoExtraGuest: x.tu_dong_phu_thu_khach, extraAdultFee: Number(x.phu_thu_nguoi_lon), extraChildFee: Number(x.phu_thu_tre_em),
      description: x.mo_ta || '', images: x.hinh_anh || [], amenitiesList: names, amenities: names.join(', '),
      amenitiesEn: x.tien_ich_en || '', status: BIZ[x.trang_thai] || 'Đang kinh doanh'
    };
    return typeof ensureCategoryDefaults === 'function' ? ensureCategoryDefaults(cat) : cat;
  });

  const rooms = ph.sort(byNum('ma_phong')).map((r) => ({
    id: idOf('P', r.ma_phong), name: 'Phòng ' + r.so_phong, floor: r.so_tang,
    categoryId: idOf('HP', r.ma_loai_phong), bedConfig: r.cau_hinh_giuong || '',
    status: ROOM_STATUS[r.trang_thai] || 'Trống', currentGuest: '', note: r.ghi_chu || '',
    businessStatus: BIZ[r.trang_thai_kinh_doanh] || 'Đang kinh doanh', images: r.hinh_anh || []
  }));

  const amenityGroups = ntiR.sort(byNum('ma_nhom')).map((g) => ({ id: idOf('NTI', g.ma_nhom), name: g.ten_nhom }));
  const amenities = ti.sort(byNum('ma_tien_ich')).map((a) => ({
    id: idOf('TI', a.ma_tien_ich), groupId: idOf('NTI', a.ma_nhom), groupName: ntiName.get(a.ma_nhom) || '',
    name: a.ten_tien_ich, note: a.ghi_chu || '', status: USE[a.trang_thai] || 'Đang kinh doanh'
  }));
  const serviceGroups = ndv.sort(byNum('ma_nhom_dv')).map((g) => ({
    id: idOf('NDV', g.ma_nhom_dv), name: g.ten_nhom, note: g.ghi_chu || '', status: USE[g.trang_thai] || 'Đang kinh doanh'
  }));
  const services = dv.sort(byNum('ma_dich_vu')).map((s) => ({
    id: idOf('DV', s.ma_dich_vu), groupId: s.ma_nhom_dv ? idOf('NDV', s.ma_nhom_dv) : '',
    group: ndvName.get(s.ma_nhom_dv) || '', name: s.ten_dich_vu, detail: s.ghi_chu || '',
    price: Number(s.don_gia_niem_yet), unit: s.don_vi_tinh, status: USE[s.trang_thai] || 'Đang kinh doanh'
  }));

  const customers = kh.slice().sort(byNum('ma_khach_hang')).map((c) => ({
    id: idOf('KH', c.ma_khach_hang), name: c.ten_khach_hang, phone: c.so_dien_thoai, email: c.email || '',
    idCard: c.so_giay_to || '', note: c.ghi_chu || '', status: c.trang_thai === 'NGUNG' ? 'Ngừng hoạt động' : 'Đang hoạt động'
  }));

  const staff = qtv.sort(byNum('ma_quan_tri_vien')).map((s) => ({
    id: 'NV-' + pad(s.ma_quan_tri_vien), name: s.ho_ten, role: s.chuc_vu || s.vai_tro, department: s.phong_ban || '',
    shift: s.ca_lam_viec || '', phone: s.so_dien_thoai || '', email: s.email,
    status: s.trang_thai === 'HOAT_DONG' ? 'Đang làm việc' : 'Đã nghỉ'
  }));

  const checkins = lt.map((s) => {
    const don = ddp.find((d) => d.ma_don === s.chi_tiet_don.ma_don);
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

  const bookings = ddp.map((d) => {
    const c = custById.get(d.ma_khach_hang) || {};
    const lines = d.chi_tiet_don || [];
    const first = lines[0] || {};
    const roomOnly = lines.reduce((sum, l) => sum + Number(l.gia_moi_dem) * Number(d.so_dem), 0);
    const items = [];
    lines.forEach((l) => {
      const cid = idOf('HP', l.ma_loai_phong);
      const it = items.find((i) => i.categoryId === cid && i.unitPrice === Number(l.gia_moi_dem));
      if (it) it.qty++; else items.push({ categoryId: cid, qty: 1, unitPrice: Number(l.gia_moi_dem) });
    });
    const stays = checkins.filter((s) => s.bookingId === d.ma_don_hien_thi && s.status === 'Đang lưu trú');
    return {
      id: d.ma_don_hien_thi, dbId: d.ma_don, bookingTime: localDT(d.ngay_tao),
      customerId: idOf('KH', d.ma_khach_hang), source: SOURCE[d.nguon_tao] || d.nguon_tao,
      guestName: c.ten_khach_hang || '', phone: c.so_dien_thoai || '', email: c.email || '', idCard: c.so_giay_to || '',
      adults: lines.reduce((sum, l) => sum + (l.so_nguoi_lon || 0), 0) || 1,
      children6to11: lines.reduce((sum, l) => sum + (l.so_tre_em_6_11 || 0), 0),
      childrenUnder6: lines.reduce((sum, l) => sum + (l.so_tre_em_duoi_6 || 0), 0),
      extraBed: lines.reduce((sum, l) => sum + (l.so_giuong_phu || 0), 0),
      categoryId: first.ma_loai_phong ? idOf('HP', first.ma_loai_phong) : '',
      roomIds: stays.map((s) => s.roomId), roomId: (stays[0] || {}).roomId || '',
      lines: lines.map((l) => ({ id: l.ma_chi_tiet, categoryId: idOf('HP', l.ma_loai_phong) })),
      checkIn: dateStr(d.ngay_den), checkOut: dateStr(d.ngay_di), nights: d.so_dem, items,
      earlyLatePercent: 0, roomTotal: roomOnly, surchargeTotal: Math.max(0, Number(d.tong_tien_phong) - roomOnly),
      totalAmount: Number(d.tong_tien_phong),
      depositAmount: Number(d.tien_coc) > 0 ? Number(d.tien_coc) : Math.round(roomOnly * 0.5),
      depositPaid: Number(d.tien_coc) > 0, status: BOOKING_STATUS[d.trang_thai] || 'Chưa xác nhận',
      checkedOutPaid: d.trang_thai === 'HOAN_TAT',
      cancelled: d.trang_thai === 'DA_HUY' || d.trang_thai === 'NO_SHOW',
      cancelDate: dateStr(d.ngay_huy), cancelFee: Number(d.phi_huy || 0), cancelReason: d.ly_do_huy || '',
      note: d.ghi_chu || ''
    };
  });

  const invoices = [];
  tt.filter((t) => t.phan_loai === 'THANH_TOAN' && t.trang_thai === 'THANH_CONG').forEach((t) => {
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
  bookings.filter((b) => b.cancelled && b.cancelFee > 0).forEach((b) => {
    invoices.push({
      id: 'HD-HUY-' + pad(b.dbId), bookingId: b.id, customerId: b.customerId, guestName: b.guestName,
      roomId: '-', roomNames: '-', categoryName: '', createdDate: b.cancelDate, createdTime: b.cancelDate,
      categoryType: 'Phí hủy phòng', roomCharge: 0, surchargeAmount: b.cancelFee,
      serviceItems: [{ name: 'Phí hủy đặt phòng', qty: 1, price: b.cancelFee }], serviceChargeTotal: b.cancelFee,
      totalBeforeDeposit: b.cancelFee, depositPaid: b.cancelFee, finalPayable: 0,
      paymentMethod: 'Khấu trừ tiền cọc', status: 'Đã thanh toán'
    });
  });

  const next = Object.assign({}, base, {
    roomCategories, rooms, pricePlans, amenityGroups, amenities, serviceGroups, services,
    customers, staff, bookings, checkins, invoices
  });
  const cf = Object.fromEntries(cfg.map((c) => [c.khoa, c.gia_tri]));
  if (cf.thong_tin_khach_san) next.hotelInfo = cf.thong_tin_khach_san;
  if (cf.phu_thu) next.surcharges = cf.phu_thu;
  if (cf.chinh_sach_huy) next.cancellationPolicies = cf.chinh_sach_huy;
  return next;
}

// ============================================================================
// PHẦN 2. GHI DANH MỤC: so sánh state với bản đã đồng bộ rồi đẩy thay đổi lên DB
// ============================================================================
const velCoreIds = (s) => String(s == null ? '' : s).trim();

const VEL_COLLECTIONS = [
  { key: 'amenityGroups', table: 'nhom_tien_ich', pk: 'ma_nhom', label: 'nhóm tiện ích',
    row: (g) => ({ ten_nhom: velCoreIds(g.name) }) },
  { key: 'amenities', table: 'tien_ich', pk: 'ma_tien_ich', label: 'tiện ích',
    row: (a, c) => ({ ma_nhom: c.fk(a.groupId), ten_tien_ich: velCoreIds(a.name), ghi_chu: a.note || null,
      trang_thai: USE_REV[a.status || 'Đang kinh doanh'] || 'DANG_DUNG' }) },
  { key: 'serviceGroups', table: 'nhom_dich_vu', pk: 'ma_nhom_dv', label: 'nhóm dịch vụ',
    row: (g) => ({ ten_nhom: velCoreIds(g.name), ghi_chu: g.note || null,
      trang_thai: USE_REV[g.status || 'Đang kinh doanh'] || 'DANG_DUNG' }) },
  { key: 'services', table: 'dich_vu', pk: 'ma_dich_vu', label: 'dịch vụ',
    row: (s, c) => ({ ten_dich_vu: velCoreIds(s.name), don_gia_niem_yet: Number(s.price) || 0,
      don_vi_tinh: velCoreIds(s.unit) || 'lần', ma_nhom_dv: s.groupId ? c.fk(s.groupId) : null,
      ghi_chu: s.detail || null, trang_thai: USE_REV[s.status || 'Đang kinh doanh'] || 'DANG_DUNG' }) },
  { key: 'roomCategories', table: 'loai_phong', pk: 'ma_loai_phong', label: 'hạng phòng',
    row: (x) => velCategoryRow(x),
    extra: (x) => ({ amen: (x.amenitiesList || []).slice().sort() }),
    after: async (x, dbId, c) => {
      const names = x.amenitiesList || [];
      const ids = (c.state.amenities || []).filter((a) => names.includes(a.name)).map((a) => c.fk(a.id));
      velOk(await velClient.from('chi_tiet_tien_ich').delete().eq('ma_loai_phong', dbId));
      if (ids.length) velOk(await velClient.from('chi_tiet_tien_ich').insert(ids.map((t) => ({ ma_loai_phong: dbId, ma_tien_ich: t }))));
    },
    beforeDelete: async (id) => velOk(await velClient.from('chi_tiet_tien_ich').delete().eq('ma_loai_phong', numOf(id))) },
  { key: 'pricePlans', table: 'bang_gia', pk: 'ma_bang_gia', label: 'bảng giá',
    // Bảng giá bị ẩn được cất ở bảng bang_gia_an để AI Agent không còn thấy giá đó
    tableOf: (p) => (p.status === 'Đã ẩn' ? 'bang_gia_an' : 'bang_gia'),
    tableOfExtra: (ex) => (ex && ex.hidden ? 'bang_gia_an' : 'bang_gia'),
    extra: (p) => ({ hidden: p.status === 'Đã ẩn' }),
    row: (p, c) => ({ ma_loai_phong: c.fk(p.categoryId), ngay_bat_dau: p.startDate, ngay_ket_thuc: p.endDate || null,
      gia_phong: Number(p.price) || 0, ghi_chu: p.note || null }) },
  { key: 'rooms', table: 'phong', pk: 'ma_phong', label: 'phòng',
    row: (r, c) => velRoomRow(r, c),
    extra: (r) => ({ bt: r.status === 'Bảo trì' }),
    after: async (r, dbId, c, op, prevExtra) => {
      // Chỉ chạm vào trạng thái vận hành khi bật/tắt "Bảo trì"
      const nowBt = r.status === 'Bảo trì';
      if (op === 'update' && prevExtra && prevExtra.bt && !nowBt) {
        velOk(await velClient.from('phong').update({ trang_thai: 'TRONG' }).eq('ma_phong', dbId));
      }
    } },
  { key: 'customers', table: 'khach_hang', pk: 'ma_khach_hang', label: 'khách hàng',
    row: (k) => velCustomerRow(k) },
  { key: 'staff', table: 'quan_tri_vien', pk: 'ma_quan_tri_vien', label: 'nhân sự',
    row: (s) => ({ ho_ten: velCoreIds(s.name), email: velCoreIds(s.email).toLowerCase(), chuc_vu: s.role || null,
      phong_ban: s.department || null, ca_lam_viec: s.shift || null, so_dien_thoai: s.phone || null,
      trang_thai: s.status === 'Đang làm việc' ? 'HOAT_DONG' : 'KHOA' }) }
];
const VEL_CONFIG_KEYS = { hotelInfo: 'thong_tin_khach_san', surcharges: 'phu_thu', cancellationPolicies: 'chinh_sach_huy' };

function velCategoryRow(c) {
  return {
    ten_loai_phong: velCoreIds(c.name), dien_tich: Number(c.area) || 0, loai_giuong: velCoreIds(c.beds),
    loai_giuong_en: c.bedsEn || null, suc_chua: c.capacity || null, suc_chua_en: c.capacityEn || null,
    so_luong_nguoi_lon: Number(c.stdAdults ?? c.maxAdults ?? 2), so_luong_tre_em: Number(c.stdChildren ?? c.maxChildren ?? 1),
    giuong_phu_toi_da: Number(c.maxExtraBed ?? 0), gia_niem_yet: Number(c.price) || 0,
    thue_vat_phan_tram: Number(c.vatPercent ?? 8), tu_dong_phu_thu_gio: c.autoOvertime !== false,
    kieu_phu_thu_gio: c.overtimeCalcType === 'fixed' ? 'FIXED' : 'PERCENT',
    quy_tac_nhan_som: c.earlyCheckInRules || [], quy_tac_tra_muon: c.lateCheckOutRules || [],
    tu_dong_phu_thu_khach: c.autoExtraGuest !== false, phu_thu_nguoi_lon: Number(c.extraAdultFee) || 0,
    phu_thu_tre_em: Number(c.extraChildFee) || 0, mo_ta: c.description || null, hinh_anh: c.images || [],
    tien_ich_en: c.amenitiesEn || null, trang_thai: BIZ_REV[c.status || 'Đang kinh doanh'] || 'DANG_KINH_DOANH'
  };
}
function velRoomRow(r, c) {
  const m = String(r.name || '').match(/\d{3}/);
  if (!m) throw new Error('Tên phòng phải chứa số phòng 3 chữ số, ví dụ "Phòng 201".');
  const row = {
    so_phong: m[0], so_tang: Number(r.floor), ma_loai_phong: c.fk(r.categoryId),
    cau_hinh_giuong: r.bedConfig || null, ghi_chu: r.note || null,
    trang_thai_kinh_doanh: BIZ_REV[r.businessStatus || 'Đang kinh doanh'] || 'DANG_KINH_DOANH',
    hinh_anh: r.images || []
  };
  if (r.status === 'Bảo trì') row.trang_thai = 'BAO_TRI';
  return row;
}
function velCustomerRow(k) {
  const doc = velCoreIds(k.idCard);
  let loai = null;
  if (doc) loai = /^\d{12}$/.test(doc) ? 'CCCD' : /^\d{9}$/.test(doc) ? 'CMND' : 'HO_CHIEU';
  return {
    ten_khach_hang: velCoreIds(k.name), so_dien_thoai: velCoreIds(k.phone), email: velCoreIds(k.email) || null,
    loai_giay_to: loai, so_giay_to: doc || null, ghi_chu: k.note || null,
    trang_thai: k.status === 'Đang hoạt động' ? 'HOAT_DONG' : 'NGUNG'
  };
}

// Chữ ký (signature) của một mục để biết có thay đổi hay không
function velSig(def, item, ctx) {
  try { return JSON.stringify({ row: def.row(item, ctx), extra: def.extra ? def.extra(item) : null }); }
  catch (e) { return 'ERR:' + e.message; }
}
let velSnap = null;     // { key: Map(id -> sig), __config: {...} }
let velReady = false;
let velBusy = false;

function velBuildSnap(st) {
  const ctx = { fk: (id) => numOf(id), idMap: {}, state: st };
  const snap = {};
  VEL_COLLECTIONS.forEach((def) => {
    snap[def.key] = new Map((st[def.key] || []).map((it) => [it.id, velSig(def, it, ctx)]));
  });
  snap.__config = {};
  Object.keys(VEL_CONFIG_KEYS).forEach((k) => { snap.__config[k] = JSON.stringify(st[k] ?? null); });
  return snap;
}

const VEL_ERRORS = [
  [/Invalid login credentials/i, 'Sai email hoặc mật khẩu.'],
  [/Email not confirmed/i, 'Tài khoản chưa được xác nhận. Hãy tạo lại tài khoản với tùy chọn Auto Confirm.'],
  [/Failed to fetch|NetworkError/i, 'Không kết nối được Supabase. Kiểm tra mạng và dòng Project URL ở đầu tệp.'],
  [/bang_gia_an/, 'Chưa có bảng bang_gia_an. Hãy chạy tệp velora-bo-sung-2.sql trong Supabase.'],
  [/ck_phong_so_phong/, 'Tên phòng phải có số phòng 3 chữ số và chữ số đầu trùng với tầng (ví dụ "Phòng 201" ở tầng 2).'],
  [/ck_phong_so_tang/, 'Tầng phải từ 1 đến 9.'],
  [/uq_phong_so_phong/, 'Số phòng này đã tồn tại.'],
  [/uq_lp_ten/, 'Tên hạng phòng đã tồn tại.'],
  [/ck_lp_nguoi_lon/, 'Số người lớn tiêu chuẩn phải từ 1 đến 4.'],
  [/ck_lp_tre_em/, 'Số trẻ em phải từ 0 đến 3.'],
  [/ck_lp_giuong_phu/, 'Giường phụ tối đa phải từ 0 đến 2.'],
  [/ck_lp_dien_tich/, 'Diện tích phải lớn hơn 0.'],
  [/uq_dv_ten/, 'Tên dịch vụ đã tồn tại.'],
  [/uq_ti_ten/, 'Tên tiện ích đã tồn tại.'],
  [/uq_nti_ten|ndv_ten_key/, 'Tên nhóm đã tồn tại.'],
  [/ux_khach_hang_giay_to/, 'Số giấy tờ này đã thuộc về một khách hàng khác.'],
  [/ck_kh_sdt/, 'Số điện thoại phải gồm 9 đến 15 chữ số (có thể có dấu + và khoảng trắng).'],
  [/ck_kh_cccd/, 'CCCD phải đủ 12 chữ số.'],
  [/ck_kh_email|ck_qtv_email/, 'Email không hợp lệ.'],
  [/uq_qtv_email/, 'Email nhân sự đã tồn tại.'],
  [/ck_bg_ngay/, 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.'],
  [/ck_bg_gia/, 'Giá phải lớn hơn 0.'],
  [/foreign key|violates foreign key/, 'Mục này đang được dùng ở nơi khác (phòng, đơn đặt, hóa đơn...) nên không thể thêm/xóa theo cách này.'],
  [/row-level security/, 'Chưa đăng nhập hoặc tài khoản không có quyền. Hãy đăng nhập lại.']
];
function velFriendly(e) {
  const msg = (e && e.message) || String(e);
  const hit = VEL_ERRORS.find(([re]) => re.test(msg));
  return hit ? hit[1] : msg;
}

async function velPushCatalog() {
  if (!velReady || velBusy || !velSnap) return false;
  const st = state;
  const ctx = { fk: null, idMap: {}, state: st };
  ctx.fk = (id) => (ctx.idMap[id] !== undefined ? ctx.idMap[id] : numOf(id));
  const plainFk = { ...ctx, fk: (x) => numOf(x) };

  // 1) Tính thay đổi
  const plan = VEL_COLLECTIONS.map((def) => {
    const snap = velSnap[def.key];
    const items = st[def.key] || [];
    const ids = new Set(items.map((i) => i.id));
    return {
      def,
      upserts: items.filter((it) => velSig(def, it, plainFk) !== snap.get(it.id)),
      deletes: [...snap.keys()].filter((id) => !ids.has(id))
    };
  });
  const cfgChanged = Object.keys(VEL_CONFIG_KEYS).filter((k) => JSON.stringify(st[k] ?? null) !== velSnap.__config[k]);
  const nChanges = plan.reduce((s, p) => s + p.upserts.length + p.deletes.length, 0) + cfgChanged.length;
  if (nChanges === 0) return false;

  // 2) Chặn xóa hàng loạt (ví dụ bấm "Khôi phục dữ liệu mặc định")
  const bigDelete = plan.find((p) => p.deletes.length >= 3);
  if (bigDelete && !confirm(`Thao tác này sẽ XÓA ${bigDelete.deletes.length} ${bigDelete.def.label} trên Supabase. Tiếp tục?`)) {
    await velRefresh();
    return true;
  }

  velBusy = true;
  try {
    // 3) Thêm/sửa theo thứ tự cha -> con
    for (const { def, upserts } of plan) {
      for (const it of upserts) {
        const isNew = !velSnap[def.key].has(it.id);
        const row = def.row(it, ctx);
        const tbl = def.tableOf ? def.tableOf(it) : def.table;
        let prevExtra = null;
        if (!isNew) { try { prevExtra = JSON.parse(velSnap[def.key].get(it.id)).extra; } catch (_) {} }
        let dbId;
        if (isNew) {
          const data = velOk(await velClient.from(tbl).insert(row).select(def.pk).single());
          dbId = data[def.pk];
          ctx.idMap[it.id] = dbId;
        } else if (def.tableOfExtra && def.tableOfExtra(prevExtra) !== tbl) {
          // Ẩn/hiện bảng giá: chuyển dòng giữa hai bảng, giữ nguyên mã
          dbId = numOf(it.id);
          velOk(await velClient.from(def.tableOfExtra(prevExtra)).delete().eq(def.pk, dbId));
          const moved = Object.assign({}, row, { [def.pk]: dbId });
          if (it._loaiGia) moved.loai_gia = it._loaiGia;
          velOk(await velClient.from(tbl).insert(moved));
        } else {
          dbId = numOf(it.id);
          velOk(await velClient.from(tbl).update(row).eq(def.pk, dbId));
        }
        if (def.after) await def.after(it, dbId, ctx, isNew ? 'insert' : 'update', prevExtra);
      }
    }
    // 4) Xóa theo thứ tự con -> cha
    for (const { def, deletes } of [...plan].reverse()) {
      for (const id of deletes) {
        if (def.beforeDelete) await def.beforeDelete(id);
        let tbl = def.table;
        if (def.tableOfExtra) {
          let ex = null;
          try { ex = JSON.parse(velSnap[def.key].get(id)).extra; } catch (_) {}
          tbl = def.tableOfExtra(ex);
        }
        velOk(await velClient.from(tbl).delete().eq(def.pk, numOf(id)));
      }
    }
    // 5) Cấu hình khách sạn
    for (const k of cfgChanged) {
      velOk(await velClient.from('cau_hinh_khach_san').upsert(
        { khoa: VEL_CONFIG_KEYS[k], gia_tri: st[k], cap_nhat: new Date().toISOString() }, { onConflict: 'khoa' }));
    }
  } catch (e) {
    console.error(e);
    velBusy = false;
    alert('Không lưu được lên Supabase: ' + velFriendly(e) + '\nDữ liệu sẽ được tải lại từ máy chủ.');
    await velRefresh();
    return true;
  }
  velBusy = false;
  await velRefresh();
  return true;
}

// ============================================================================
// PHẦN 2B. GHI GIAO DỊCH: nhận biết thao tác trên web rồi gọi hàm tương ứng trong DB
// ============================================================================
const isDbBooking = (id) => /^DD\d+$/i.test(String(id));
const VEL_SOURCE_RULES = [[/booking|ota|agoda|traveloka|expedia/i, 'OTA'], [/zalo/i, 'ZALO'], [/web/i, 'WEBSITE'],
  [/điện thoại|dien thoai|hotline|phone/i, 'DIEN_THOAI']];
const velSource = (s) => { const h = VEL_SOURCE_RULES.find(([re]) => re.test(String(s || ''))); return h ? h[1] : 'TRUC_TIEP'; };
const velPay = (m) => (/tiền mặt/i.test(m || '') ? 'TIEN_MAT' : /thẻ|pos/i.test(m || '') ? 'THE' : /ví/i.test(m || '') ? 'VI_DIEN_TU' : 'CHUYEN_KHOAN');
const velDocType = (d) => (/^\d{12}$/.test(d) ? 'CCCD' : /^\d{9}$/.test(d) ? 'CMND' : 'HO_CHIEU');
const velIso = (s) => { const t = new Date(s); return isNaN(t) ? new Date().toISOString() : t.toISOString(); };
function velBkSig(b) {
  return JSON.stringify([b.checkIn, b.checkOut, (b.items || []).map((i) => [i.categoryId, Number(i.qty) || 1]), velCoreIds(b.note)]);
}
function velBuildTxSnap(st) {
  return {
    bk: new Map((st.bookings || []).map((b) => [b.id, {
      cancelled: !!b.cancelled, depositPaid: !!b.depositPaid, deposit: Number(b.depositAmount) || 0,
      customerId: b.customerId, sig: velBkSig(b)
    }])),
    ci: new Map((st.checkins || []).map((c) => [c.id, c.actualCheckOut || ''])),
    inv: new Set((st.invoices || []).map((i) => i.id))
  };
}
async function velCall(name, args) {
  const { data, error } = await velClient.rpc(name, args);
  if (error) throw new Error(error.message);
  if (data && data.success === false) throw new Error(data.error || 'Thao tác thất bại');
  return data;
}

// Trả về { did, creates, edited, notice }. Hàm này KHÔNG tự tải lại dữ liệu (velPushAll sẽ làm).
async function velPushTransactions() {
  const st = state, snap = velTxSnap;
  if (!snap) return { did: false, creates: false, edited: false, notice: '' };
  const creates = [], updates = [], confirms = [], checkIns = [], checkOuts = [], cancels = [];
  let customerChanged = false;

  (st.bookings || []).forEach((b) => {
    if (!isDbBooking(b.id)) { creates.push(b); return; }
    const s = snap.bk.get(b.id);
    if (!s) return;
    if (!s.cancelled && b.cancelled) { cancels.push(b); return; }
    if (b.cancelled) return;
    if (velBkSig(b) !== s.sig) updates.push(b);
    if (b.customerId !== s.customerId) customerChanged = true;
    if (!s.depositPaid && b.depositPaid) confirms.push(b);
  });
  (st.checkins || []).forEach((c) => {
    if (!c.luuTruId) checkIns.push(c);
    else if (c.actualCheckOut && snap.ci.get(c.id) === '') checkOuts.push(c);
  });

  const notice = customerChanged ? 'Việc đổi khách hàng của đơn đặt phòng chưa được lưu lên Supabase nên đã được hoàn lại.' : '';
  if (!creates.length && !updates.length && !confirms.length && !checkIns.length && !checkOuts.length && !cancels.length) {
    return { did: customerChanged, creates: false, edited: false, notice };
  }

  // 1) Đơn mới tạo trên web: giữ nguyên là MỘT đơn trong DB (nhiều phòng, nhiều hạng nếu có)
  for (const b of creates) {
    const items = (b.items && b.items.length) ? b.items : [{ categoryId: b.categoryId, qty: 1 }];
    // MỘT đơn duy nhất cho cả đơn trên web, dù có nhiều phòng / nhiều hạng phòng.
    // Tổng số khách được DB tự chia xuống từng phòng để kiểm tra sức chứa.
    const totalAdults = (Number(b.adults) || 1) + (Number(b.extraAdultsQty) || 0);
    const r = await velCall('api_tao_don', {
      p_ten_khach_hang: velCoreIds(b.guestName), p_so_dien_thoai: velCoreIds(b.phone), p_email: velCoreIds(b.email) || null,
      p_ngay_den: b.checkIn, p_ngay_di: b.checkOut,
      p_chi_tiet: items.map((it) => ({ ma_loai_phong: numOf(it.categoryId), so_luong: Math.max(1, Number(it.qty) || 1) })),
      p_so_nguoi_lon: totalAdults, p_so_tre_duoi_6: Number(b.childrenUnder6) || 0, p_so_tre_6_11: Number(b.children6to11) || 0,
      p_ghi_chu: b.note || null, p_nguon_tao: velSource(b.source)
    });
    const codes = [r.ma_don];
    if (b.depositPaid) {
      for (const code of codes) {
        await velCall('admin_xac_nhan_don', {
          p_ma_don_hien_thi: code, p_tien_coc: codes.length === 1 && b.depositAmount ? Number(b.depositAmount) : null,
          p_phuong_thuc: 'CHUYEN_KHOAN', p_ghi_chu: null
        });
      }
    }
  }
  // 2) Sửa đơn có sẵn: đổi ngày, đổi/tăng hạng phòng, đổi số lượng phòng, ghi chú.
  //    Tiền cọc chỉ tăng khi web ghi nhận khách đã nộp thêm cọc (tăng hạng phòng); đổi ngày không phát sinh cọc.
  for (const b of updates) {
    const s = snap.bk.get(b.id);
    const items = (b.items && b.items.length) ? b.items : [{ categoryId: b.categoryId, qty: 1 }];
    const extraDeposit = (s.depositPaid && b.depositPaid) ? Math.max(0, (Number(b.depositAmount) || 0) - s.deposit) : 0;
    await velCall('admin_cap_nhat_don', {
      p_ma_don_hien_thi: b.id, p_ngay_den: b.checkIn, p_ngay_di: b.checkOut,
      p_chi_tiet: items.map((it) => ({ ma_loai_phong: numOf(it.categoryId), so_luong: Math.max(1, Number(it.qty) || 1) })),
      p_coc_bo_sung: extraDeposit, p_phuong_thuc: 'CHUYEN_KHOAN',
      p_nhan_vien: (typeof currentAdminUser !== 'undefined' && currentAdminUser && currentAdminUser.name) || null,
      p_ghi_chu: b.note || ''
    });
  }
  // 3) Xác nhận / đặt cọc đơn có sẵn
  for (const b of confirms) {
    await velCall('admin_xac_nhan_don', { p_ma_don_hien_thi: b.id, p_tien_coc: Number(b.depositAmount) || null, p_phuong_thuc: 'CHUYEN_KHOAN', p_ghi_chu: null });
  }
  // 4) Nhận phòng (web thêm mới vào đầu danh sách nên đảo lại cho đúng thứ tự)
  const usedLines = new Set((st.checkins || []).filter((c) => c.luuTruId).map((c) => c.lineId));
  for (const c of checkIns.slice().reverse()) {
    const bk = (st.bookings || []).find((b) => b.id === c.bookingId);
    if (!bk || !isDbBooking(bk.id)) throw new Error('Không tìm thấy đơn đặt phòng tương ứng để nhận phòng.');
    const lines = bk.lines || [];
    const line = lines.find((l) => l.categoryId === c.categoryId && !usedLines.has(l.id)) || lines.find((l) => !usedLines.has(l.id));
    if (!line) throw new Error('Đơn này không còn phòng nào chưa nhận.');
    usedLines.add(line.id);
    const doc = velCoreIds(c.idCard);
    await velCall('admin_check_in', {
      p_ma_chi_tiet: line.id, p_ma_phong: numOf(c.roomId), p_da_xac_minh_giay_to: true,
      p_loai_giay_to: doc ? velDocType(doc) : null, p_so_giay_to: doc || null,
      p_thoi_gian_nhan: velIso(c.actualCheckIn), p_phu_thu_nhan_som: Number(c.earlySurcharge) || 0,
      p_nhan_vien: c.staffName || 'Lễ tân', p_ghi_chu: c.note || null
    });
  }
  // 5) Trả phòng: ghi dịch vụ phát sinh của hóa đơn rồi trả từng phòng (phòng cuối cùng sẽ chốt đơn)
  const byBooking = new Map();
  checkOuts.forEach((c) => { if (!byBooking.has(c.bookingId)) byBooking.set(c.bookingId, []); byBooking.get(c.bookingId).push(c); });
  for (const [bkId, stays] of byBooking) {
    stays.sort((a, b) => a.luuTruId - b.luuTruId);
    const inv = (st.invoices || []).find((i) => i.bookingId === bkId && i.categoryType === 'Thanh toán trả phòng' && !snap.inv.has(i.id));
    const items = inv && (inv.serviceItems || []).length ? inv.serviceItems : [];
    for (const it of items) {
      const svc = (st.services || []).find((s) => s.name === it.name) || (st.services || []).find((s) => s.id === it.serviceId);
      velOk(await velClient.from('phat_sinh').insert({
        ma_luu_tru: stays[0].luuTruId, ma_dich_vu: svc ? numOf(svc.id) : null, loai_phat_sinh: svc ? 'DICH_VU' : 'KHAC',
        don_gia: Number(it.price) || 0, so_luong: Math.max(1, Number(it.qty) || 1), ghi_chu: svc ? null : String(it.name || '').slice(0, 300)
      }));
    }
    for (const c of stays) {
      await velCall('admin_check_out', {
        p_ma_luu_tru: c.luuTruId, p_thoi_gian_tra: velIso(c.actualCheckOut),
        p_phu_thu_tra_muon: Number(c.lateSurcharge) || 0, p_phuong_thuc: inv ? velPay(inv.paymentMethod) : 'CHUYEN_KHOAN'
      });
    }
  }
  // 6) Hủy đơn (DB tự tính phí hủy theo chính sách trong DB)
  for (const b of cancels) {
    await velCall('api_huy_don', { p_ma_don_hien_thi: b.id, p_so_dien_thoai: velCoreIds(b.phone), p_ly_do_huy: b.cancelReason || null });
  }
  return { did: true, creates: creates.length > 0, edited: updates.length > 0, notice };
}

// Hàng đợi: mỗi lần web lưu thì xử lý lần lượt, không chạy chồng nhau
async function velPushAll() {
  if (!velReady || velBusy || !velSnap) return;
  velBusy = true;
  let r;
  try {
    r = await velPushTransactions();
  } catch (e) {
    console.error(e);
    velBusy = false;
    alert('Không lưu được lên Supabase: ' + velFriendly(e) + '\nDữ liệu sẽ được tải lại từ máy chủ.');
    await velRefresh();
    return;
  }
  velBusy = false;
  if (!r.did) { await velPushCatalog(); return; }
  // Sửa đơn: đẩy thêm thay đổi danh mục đi kèm (nếu có). Đơn mới thì không, vì khách mới do DB tự tạo.
  let refreshed = false;
  if (r.edited && !r.creates) refreshed = await velPushCatalog();
  if (!refreshed) await velRefresh();
  if (r.notice) alert(r.notice);
}
let velQueue = Promise.resolve();
// Được gọi mỗi khi web lưu dữ liệu (xem phần gắn vào web ở cuối tệp)
function velOnSave() {
  if (!velReady) return;
  velQueue = velQueue.then(velPushAll).catch((e) => console.error(e));
}

// ============================================================================
// PHẦN 3. TẢI LẠI TỪ DB
// ============================================================================
let velTxSnap = null;
let velRefreshing = false, velRefreshAgain = false;
async function velRefresh() {
  if (velRefreshing) { velRefreshAgain = true; return; }
  velRefreshing = true;
  try {
    do {
      velRefreshAgain = false;
      const next = await velFetchState(state);
      state = next;
      if (typeof syncRoomReservationStates === 'function') syncRoomReservationStates();
      velSnap = velBuildSnap(state);
      velTxSnap = velBuildTxSnap(state);
      velReady = true;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {} // chỉ để cache
      if (typeof updateSidebarCounters === 'function') updateSidebarCounters(state);
      if (typeof renderCurrentView === 'function') renderCurrentView();
    } while (velRefreshAgain);
  } finally { velRefreshing = false; }
}

// ============================================================================
// PHẦN 4. ĐĂNG NHẬP, REALTIME
// ============================================================================
const velSb = {
  async login(email, password) {
    const { error } = await velClient.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await velSb.afterAuth(email);
  },
  // Gọi khi tải lại trang: nếu còn phiên đăng nhập thì vào thẳng ứng dụng
  async resume() {
    const { data } = await velClient.auth.getSession();
    if (!data || !data.session) return false;
    await velSb.afterAuth(data.session.user.email);
    return true;
  },
  async afterAuth(email) {
    await velRefresh();
    // Lần đầu (DB chưa có tiện ích và dịch vụ): tự nạp danh mục mặc định của web, không ghi đè hạng phòng
    if (!(state.amenities || []).length && !(state.services || []).length) {
      try { await velImportDefaults({ updateCategories: false }); } catch (e) { console.warn('Không nạp được dữ liệu mặc định:', e); }
    }
    const me = (state.staff || []).find((s) => s.email && s.email.toLowerCase() === String(email).toLowerCase());
    currentAdminUser = me ? { id: me.id, name: me.name, role: me.role } : { id: 'NV-000', name: email, role: 'Nhân viên' };
    velSb.subscribe();
  },
  async logout() { try { await velClient.auth.signOut(); } catch (_) {} velReady = false; },

  // Realtime: đơn do AI Agent / khách tạo hiện ra ngay. Hoãn nếu đang mở hộp thoại để không mất thao tác.
  subscribe() {
    if (velSb._ch) return;
    let t;
    const run = () => {
      const modal = document.getElementById('commonModal');
      if (velBusy || (modal && !modal.classList.contains('hidden'))) { t = setTimeout(run, 3000); return; }
      velRefresh().catch(console.warn);
    };
    const later = () => { clearTimeout(t); t = setTimeout(run, 800); };
    velSb._ch = velClient.channel('velora-sync');
    ['don_dat_phong', 'chi_tiet_don', 'luu_tru', 'thanh_toan', 'phong', 'khach_hang'].forEach((table) =>
      velSb._ch.on('postgres_changes', { event: '*', schema: 'public', table }, later));
    velSb._ch.subscribe();
  }
};

// ============================================================================
// PHẦN 5. NẠP DỮ LIỆU MẶC ĐỊNH CỦA WEB LÊN DB (chạy 1 lần, từ Console của trình duyệt)
//   await velImportDefaults()                         -> nạp tiện ích, dịch vụ, bảng giá, cấu hình
//                                                       và cập nhật chi tiết 4 hạng phòng theo web
//   await velImportDefaults({ updateCategories:false }) -> giữ nguyên thông tin hạng phòng đang có trong DB
// Không nạp khách hàng, nhân sự, đơn đặt mẫu. Chạy lại nhiều lần không tạo trùng.
// ============================================================================
async function velImportDefaults(opt = {}) {
  const updateCategories = opt.updateCategories !== false;
  const d = getDefaultData();
  const up = async (table, rows, onConflict) =>
    velOk(await velClient.from(table).upsert(rows, { onConflict, ignoreDuplicates: true }));
  const all = async (table) => velOk(await velClient.from(table).select('*'));

  // Hạng phòng web <-> DB theo tên (Superior, Deluxe, Family, Executive)
  const dbCats = await all('loai_phong');
  const catMap = {};
  d.roomCategories.forEach((c) => {
    const first = c.name.toLowerCase().split(' ')[0];
    const m = dbCats.find((x) => x.ten_loai_phong.toLowerCase().startsWith(first));
    if (m) catMap[c.id] = m.ma_loai_phong;
  });
  if (updateCategories) {
    for (const c of d.roomCategories) {
      if (!catMap[c.id]) continue;
      const cat = ensureCategoryDefaults(Object.assign({}, c));
      const row = velCategoryRow(cat);
      delete row.ten_loai_phong; // giữ nguyên tên hiện có trong DB
      velOk(await velClient.from('loai_phong').update(row).eq('ma_loai_phong', catMap[c.id]));
    }
  }

  // Tiện ích
  await up('nhom_tien_ich', d.amenityGroups.map((g) => ({ ten_nhom: g.name })), 'ten_nhom');
  const gMap = Object.fromEntries((await all('nhom_tien_ich')).map((g) => [g.ten_nhom, g.ma_nhom]));
  await up('tien_ich', d.amenities.map((a) => ({
    ma_nhom: gMap[a.groupName], ten_tien_ich: a.name, ghi_chu: a.note || null, trang_thai: 'DANG_DUNG'
  })), 'ten_tien_ich');
  const tMap = Object.fromEntries((await all('tien_ich')).map((t) => [t.ten_tien_ich, t.ma_tien_ich]));
  const links = [];
  d.roomCategories.forEach((c) => {
    if (!catMap[c.id]) return;
    ensureCategoryDefaults(c);
    (c.amenitiesList || []).forEach((n) => { if (tMap[n]) links.push({ ma_loai_phong: catMap[c.id], ma_tien_ich: tMap[n] }); });
  });
  if (links.length) await up('chi_tiet_tien_ich', links, 'ma_loai_phong,ma_tien_ich');

  // Dịch vụ
  await up('nhom_dich_vu', d.serviceGroups.map((g) => ({ ten_nhom: g.name, ghi_chu: g.note || null, trang_thai: 'DANG_DUNG' })), 'ten_nhom');
  const sgMap = Object.fromEntries((await all('nhom_dich_vu')).map((g) => [g.ten_nhom, g.ma_nhom_dv]));
  await up('dich_vu', d.services.map((s) => ({
    ten_dich_vu: s.name, don_gia_niem_yet: s.price, don_vi_tinh: s.unit, ma_nhom_dv: sgMap[s.group] || null,
    ghi_chu: s.detail || null, trang_thai: 'DANG_DUNG'
  })), 'ten_dich_vu');

  // Bảng giá: chỉ thêm kỳ giá chưa có (cùng hạng + ngày bắt đầu)
  const existing = await all('bang_gia');
  const newPlans = d.pricePlans.filter((p) => catMap[p.categoryId] &&
    !existing.some((e) => e.ma_loai_phong === catMap[p.categoryId] && dateStr(e.ngay_bat_dau) === p.startDate))
    .map((p) => ({
      ma_loai_phong: catMap[p.categoryId], loai_gia: /cao điểm|giáng sinh|tết|lễ/i.test(p.note) ? 'CAO_DIEM' : 'THUONG',
      ngay_bat_dau: p.startDate, ngay_ket_thuc: p.endDate || null, gia_phong: p.price, ghi_chu: p.note || null
    }));
  if (newPlans.length) velOk(await velClient.from('bang_gia').insert(newPlans));

  // Cấu hình chung
  velOk(await velClient.from('cau_hinh_khach_san').upsert([
    { khoa: 'thong_tin_khach_san', gia_tri: d.hotelInfo },
    { khoa: 'phu_thu', gia_tri: d.surcharges },
    { khoa: 'chinh_sach_huy', gia_tri: d.cancellationPolicies }
  ], { onConflict: 'khoa' }));

  await velRefresh();
  return 'Đã nạp xong dữ liệu mặc định.';
}

// ============================================================================
// PHẦN 6. MÀN HÌNH ĐĂNG NHẬP (thay cho đăng nhập admin/123 trong app.js)
// ============================================================================
function velInitAuth() {
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  const enterApp = () => {
    const disp = document.getElementById('currentUserDisplay');
    if (disp) disp.textContent = currentAdminUser.name;
    loginError.classList.add('hidden');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appLayout').classList.remove('hidden');
    switchView('dashboard');
  };

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      await velSb.login(usernameInput.value.trim(), passwordInput.value);
      enterApp();
    } catch (err) {
      loginError.textContent = 'Đăng nhập thất bại: ' + velFriendly(err);
      loginError.classList.remove('hidden');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await velSb.logout();
    document.getElementById('appLayout').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    passwordInput.value = '';
    loginError.classList.add('hidden');
  });

  // Nút "Khôi phục dữ liệu mặc định" sẽ xóa danh mục thật trên Supabase nên ẩn đi
  const resetBtn = document.getElementById('resetDemoDataBtn');
  if (resetBtn) resetBtn.style.display = 'none';

  // Tải lại trang mà vẫn còn phiên đăng nhập thì vào thẳng ứng dụng
  velSb.resume().then((ok) => { if (ok) enterApp(); }).catch(() => {});
}

// ============================================================================
// PHẦN 7. GẮN VÀO WEB: ghi đè 3 hàm của app.js / transactions.js khi chạy (không sửa các tệp đó)
// ============================================================================
(function velAttach() {
  const origSave = saveState;
  saveState = function (newState) { origSave(newState); velOnSave(); };

  // Tự hủy đơn "không đến" chạy trên máy người dùng sẽ bị Supabase ghi đè nên tắt khi đã kết nối
  const origAutoCancel = autoCancelNoShowBookings;
  autoCancelNoShowBookings = function () { return velReady ? false : origAutoCancel.apply(this, arguments); };

  initAuth = velInitAuth;
})();
