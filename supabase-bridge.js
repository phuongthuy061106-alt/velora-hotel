// ============================================================================
// SUPABASE BRIDGE v2 - ĐỒNG BỘ 2 CHIỀU CHUẨN XÁC CHO VELORA HOTEL
// ============================================================================

const SUPABASE_URL = 'https://rdlosoknzxsiuwbgwqfg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_v5QQqyTXbXzSG88CpB5s-g_wBPK0Yc3';

let sb = null;
try {
  if (window.supabase && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('DÁN_ANON')) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error('❌ Lỗi khởi tạo Supabase:', e);
}

// Không tự động giữ phòng vật lý trên Web khi mới chỉ xác nhận cọc (chỉ giữ khi Check-in)
window.syncRoomReservationStates = function () {
  if (!Array.isArray(state.rooms)) return;
  const openStayByRoom = new Map();
  (state.checkins || []).forEach(ci => {
    if (!ci.actualCheckOut && ci.status !== 'Đã trả phòng' && ci.roomId) {
      openStayByRoom.set(ci.roomId, ci);
    }
  });
  state.rooms.forEach(r => {
    if (openStayByRoom.has(r.id)) {
      r.status = 'Đang ở';
      r.currentGuest = openStayByRoom.get(r.id).guestName || '';
    } else if (r.status === 'Đang ở' || r.status === 'Đã đặt') {
      r.status = 'Trống';
      r.currentGuest = '';
    }
  });
};

const DB_MAPS = {
  catUiToDb: new Map(), catDbToUi: new Map(),
  roomUiToDb: new Map(), roomDbToUi: new Map(),
  custUiToDb: new Map(), custDbToUi: new Map(),
  srvUiToDb: new Map(), srvDbToUi: new Map(),
  bkUiToDb: new Map(), bkDbToUi: new Map(),
  stayUiToDb: new Map(), stayDbToUi: new Map()
};

const ROOM_STATUS_DB_TO_UI = {
  'TRONG': 'Trống',
  'DANG_SU_DUNG': 'Đang ở',
  'DANG_DON': 'Đang dọn',
  'BAO_TRI': 'Bảo trì'
};

const BOOKING_STATUS_DB_TO_UI = {
  'CHO_XAC_NHAN': 'Chưa xác nhận',
  'CHO_COC': 'Chưa xác nhận',
  'DA_COC': 'Đã xác nhận',
  'DANG_O': 'Đang lưu trú',
  'HOAN_TAT': 'Hoàn thành',
  'DA_HUY': 'Đã hủy',
  'NO_SHOW': 'Đã hủy'
};

const SERVICE_GROUP_DB_TO_UI = {
  'SPA': 'Spa', 'GIAT_UI': 'Giặt ủi', 'DUA_DON': 'Đưa đón',
  'TOUR': 'Tour tham quan', 'MINIBAR': 'Minibar',
  'PHU_THU': 'Phụ thu', 'TIEN_PHAT': 'Phí phạt vi phạm', 'KHAC': 'Khác'
};

const BED_TYPE_DB_TO_UI = {
  'DOI': '1 giường đôi', 'DON': '1 giường đơn', '2_DON': '2 giường đơn',
  'DOI_HOAC_2_DON': '1 giường đôi hoặc 2 giường đơn',
  'KING': '1 giường king', 'KING_HOAC_2_DON': '1 giường king hoặc 2 giường đơn',
  'KING_VA_DON': '1 giường king + 1 giường đơn'
};

// ============================================================================
// 1. TẢI DỮ LIỆU TỪ SUPABASE VỀ WEB
// ============================================================================
async function pullAllFromSupabase() {
  if (!sb) return;
  try {
    const [
      { data: dbCats }, { data: dbPrices }, { data: dbRooms },
      { data: dbAmenityGroups }, { data: dbAmenities }, { data: dbCatAmenities },
      { data: dbServices }, { data: dbCustomers }, { data: dbBookings },
      { data: dbBookingItems }, { data: dbStays }, { data: dbExtras },
      { data: dbPayments }, { data: dbHistory }, { data: dbStaff }
    ] = await Promise.all([
      sb.from('loai_phong').select('*').order('ma_loai_phong'),
      sb.from('bang_gia').select('*').order('ma_bang_gia'),
      sb.from('phong').select('*').order('so_phong'),
      sb.from('nhom_tien_ich').select('*').order('thu_tu_hien_thi'),
      sb.from('tien_ich').select('*').order('ma_tien_ich'),
      sb.from('chi_tiet_tien_ich').select('*'),
      sb.from('dich_vu').select('*').order('ma_dich_vu'),
      sb.from('khach_hang').select('*').order('ma_khach_hang'),
      sb.from('don_dat_phong').select('*').order('ma_don', { ascending: false }),
      sb.from('chi_tiet_don').select('*').order('ma_chi_tiet'),
      sb.from('luu_tru').select('*').order('ma_luu_tru', { ascending: false }),
      sb.from('phat_sinh').select('*').order('ma_phat_sinh'),
      sb.from('thanh_toan').select('*').order('ma_thanh_toan', { ascending: false }),
      sb.from('lich_su_thay_doi').select('*').order('ma_lich_su', { ascending: false }),
      sb.from('quan_tri_vien').select('*').order('ma_quan_tri_vien')
    ]);

    if (!dbCats || !dbRooms) return;
    Object.values(DB_MAPS).forEach(m => m.clear());

    const mappedCategories = dbCats.map(c => {
      const uiId = 'HP' + String(c.ma_loai_phong).padStart(3, '0');
      DB_MAPS.catDbToUi.set(c.ma_loai_phong, uiId);
      DB_MAPS.catUiToDb.set(uiId, c.ma_loai_phong);
      const basePriceRow = (dbPrices || []).find(p => p.ma_loai_phong === c.ma_loai_phong && p.loai_gia === 'THUONG');
      const amIds = (dbCatAmenities || []).filter(ca => ca.ma_loai_phong === c.ma_loai_phong).map(ca => ca.ma_tien_ich);
      const amNames = (dbAmenities ||
