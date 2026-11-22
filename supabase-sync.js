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
    q('nhom_dich_vu'), q('dich_vu'), q('quan_tri_vien'), q('cau_hinh_khach_san')
  ]);
  const [lp, bg, ntiR, ti, ctti, ph, kh, ddp, lt, tt, ndv, dv, qtv, cfg] = res.map(velOk);

  const today = new Date().toISOString().slice(0, 10);
  const custById = new Map(kh.map((c) => [c.ma_khach_hang, c]));
  const tiName = new Map(ti.map((t) => [t.ma_tien_ich, t.ten_tien_ich]));
  const ntiName = new Map(ntiR.map((g) => [g.ma_nhom, g.ten_nhom]));
  const ndvName = new Map(ndv.map((g) => [g.ma_nhom_dv, g.ten_nhom]));

  const pricePlans = bg.sort(byNum('ma_bang_gia')).map((b) => ({
    id: idOf('BG', b.ma_bang_gia), categoryId: idOf('HP', b.ma_loai_phong),
    startDate: dateStr(b.ngay_bat_dau), endDate: dateStr(b.ngay_ket_thuc),
    price: Number(b.gia_phong), note: b.ghi_chu || '', status: b.trang_thai === 'AN' ? 'Đã ẩn' : 'Đang áp dụng'
  }));

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
      adults: first.so_nguoi_lon || 1, children6to11: first.so_tre_em_6_11 || 0,
      childrenUnder6: first.so_tre_em_duoi_6 || 0, extraBed: first.so_giuong_phu || 0,
      categoryId: first.ma_loai_phong ? idOf('HP', first.ma_loai_phong) : '',
      roomIds: stays.map((s) => s.roomId), roomId: (stays[0] || {}).roomId || '',
      lines: lines.map((l) => ({ id: l.ma_chi_tiet, categoryId: idOf('HP', l.ma_loai_phong) })),
      checkIn: dateStr(d.ngay_den), checkOut: dateStr(d.ngay_di), nights: d.so_dem, items,
      earlyLatePercent: 0, roomTotal: Number(d.tong_tien_phong), surchargeTotal: 0,
      totalAmount: Number(d.tong_tien_phong), depositAmount: Math.round(Number(d.tong_tien_phong) * 0.5),
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
    row: (p, c) => ({ ma_loai_phong: c.fk(p.categoryId), ngay_bat_dau: p.startDate, ngay_ket_thuc: p.endDate || null,
      gia_phong: Number(p.price) || 0, ghi_chu: p.note || null, trang_thai: p.status === 'Đã ẩn' ? 'AN' : 'DANG_AP_DUNG' }) },
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
  if (!velReady || velBusy || !velSnap) return;
  const st = state;
  const ctx = { fk: null, idMap: {}, state: st };
  ctx.fk = (id) => (ctx.idMap[id] !== undefined ? ctx.idMap[id] : numOf(id));

  // 1) Tính thay đổi
  const plan = VEL_COLLECTIONS.map((def) => {
    const snap = velSnap[def.key];
    const items = st[def.key] || [];
    const ids = new Set(items.map((i) => i.id));
    return {
      def,
      upserts: items.filter((it) => velSig(def, it, { ...ctx, fk: (x) => numOf(x) }) !== snap.get(it.id)),
      deletes: [...snap.keys()].filter((id) => !ids.has(id))
    };
  });
  const cfgChanged = Object.keys(VEL_CONFIG_KEYS).filter((k) => JSON.stringify(st[k] ?? null) !== velSnap.__config[k]);
  const nChanges = plan.reduce((s, p) => s + p.upserts.length + p.deletes.length, 0) + cfgChanged.length;
  if (nChanges === 0) return;

  // 2) Chặn xóa hàng loạt (ví dụ bấm "Khôi phục dữ liệu mặc định")
  const bigDelete = plan.find((p) => p.deletes.length >= 3);
  if (bigDelete && !confirm(`Thao tác này sẽ XÓA ${bigDelete.deletes.length} ${bigDelete.def.label} trên Supabase. Tiếp tục?`)) {
    await velRefresh();
    return;
  }

  velBusy = true;
  try {
    // 3) Thêm/sửa theo thứ tự cha -> con
    for (const { def, upserts } of plan) {
      for (const it of upserts) {
        const isNew = !velSnap[def.key].has(it.id);
        const row = def.row(it, ctx);
        let dbId;
        if (isNew) {
          const data = velOk(await velClient.from(def.table).insert(row).select(def.pk).single());
          dbId = data[def.pk];
          ctx.idMap[it.id] = dbId;
        } else {
          dbId = numOf(it.id);
          velOk(await velClient.from(def.table).update(row).eq(def.pk, dbId));
        }
        if (def.after) {
          let prevExtra = null;
          if (!isNew) { try { prevExtra = JSON.parse(velSnap[def.key].get(it.id)).extra; } catch (_) {} }
          await def.after(it, dbId, ctx, isNew ? 'insert' : 'update', prevExtra);
        }
      }
    }
    // 4) Xóa theo thứ tự con -> cha
    for (const { def, deletes } of [...plan].reverse()) {
      for (const id of deletes) {
        if (def.beforeDelete) await def.beforeDelete(id);
        velOk(await velClient.from(def.table).delete().eq(def.pk, numOf(id)));
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
    return;
  }
  velBusy = false;
  await velRefresh();
}

let velQueue = Promise.resolve();
// Gọi từ saveState() trong app.js
function velOnSave() {
  if (!velReady) return;
  velQueue = velQueue.then(velPushCatalog).catch((e) => console.error(e));
}

// ============================================================================
// PHẦN 3. TẢI LẠI TỪ DB
// ============================================================================
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
      velReady = true;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {} // chỉ để cache
      if (typeof updateSidebarCounters === 'function') updateSidebarCounters(state);
      if (typeof renderCurrentView === 'function') renderCurrentView();
    } while (velRefreshAgain);
  } finally { velRefreshing = false; }
}

// ============================================================================
// PHẦN 4. GIAO DỊCH QUA RPC
// ============================================================================
async function velRpc(name, args) {
  const { data, error } = await velClient.rpc(name, args);
  if (error) throw new Error(error.message);
  if (data && data.success === false) throw new Error(data.error || 'Thao tác thất bại');
  await velRefresh();
  return data;
}

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
    const me = (state.staff || []).find((s) => s.email && s.email.toLowerCase() === String(email).toLowerCase());
    currentAdminUser = me ? { id: me.id, name: me.name, role: me.role } : { id: 'NV-000', name: email, role: 'Nhân viên' };
    velSb.subscribe();
  },
  async logout() { await velClient.auth.signOut(); velReady = false; },

  createBooking: (f) => velRpc('api_tao_don_dat_phong', {
    p_ten_khach_hang: f.name, p_so_dien_thoai: f.phone, p_email: f.email || null,
    p_ngay_den: f.checkIn, p_ngay_di: f.checkOut, p_ma_loai_phong: numOf(f.categoryId),
    p_so_luong_phong: f.qty || 1, p_so_nguoi_lon: f.adults || 2,
    p_so_tre_duoi_6: f.childrenUnder6 || 0, p_so_tre_6_11: f.children6to11 || 0,
    p_ghi_chu: f.note || null, p_nguon_tao: f.source || 'TRUC_TIEP'
  }),
  confirmBooking: (bk, deposit, method = 'CHUYEN_KHOAN') => velRpc('admin_xac_nhan_don', {
    p_ma_don_hien_thi: bk.id, p_tien_coc: deposit ?? null, p_phuong_thuc: method, p_ghi_chu: null
  }),
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
  checkOutStay: (checkin, opts = {}) => velRpc('admin_check_out', {
    p_ma_luu_tru: checkin.luuTruId, p_thoi_gian_tra: opts.time || new Date().toISOString(),
    p_phu_thu_tra_muon: opts.lateFee || 0, p_phuong_thuc: opts.method || 'CHUYEN_KHOAN'
  }),
  cancelBooking: (bk, reason) => velRpc('api_huy_don', {
    p_ma_don_hien_thi: bk.id, p_so_dien_thoai: bk.phone, p_ly_do_huy: reason || null
  }),

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
