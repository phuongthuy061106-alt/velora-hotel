// ============================================================================
// SUPABASE BRIDGE - ĐỒNG BỘ DỮ LIỆU 2 CHIỀU GIỮA VELORA WEB UI & POSTGRESQL
// ============================================================================

const SUPABASE_URL = 'https://rdlosoknzxsiuwbgwqfg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_v5QQqyTXbXzSG88CpB5s-g_wBPK0Yc3';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Thêm đoạn này vào đầu file supabase-bridge.js để Web KHÔNG tự khóa phòng vật lý trước khi Check-in
window.syncRoomReservationStates = function() {
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
// Bộ ánh xạ ID qua lại giữa UI (HP001, P001, DP001...) và Database (INT 1, 2, 3...)
const DB_MAPS = {
  catUiToDb: new Map(),
  catDbToUi: new Map(),
  roomUiToDb: new Map(),
  roomDbToUi: new Map(),
  custUiToDb: new Map(),
  custDbToUi: new Map(),
  srvUiToDb: new Map(),
  srvDbToUi: new Map(),
  bkUiToDb: new Map(),
  bkDbToUi: new Map(),
  stayUiToDb: new Map(),
  stayDbToUi: new Map()
};

// Chuyển đổi Enum DB <-> Tiếng Việt UI
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
  'SPA': 'Spa',
  'GIAT_UI': 'Giặt ủi',
  'DUA_DON': 'Đưa đón',
  'TOUR': 'Tour tham quan',
  'MINIBAR': 'Minibar',
  'PHU_THU': 'Phụ thu',
  'TIEN_PHAT': 'Phí phạt vi phạm',
  'KHAC': 'Khác'
};

const BED_TYPE_DB_TO_UI = {
  'DOI': '1 giường đôi',
  'DON': '1 giường đơn',
  '2_DON': '2 giường đơn',
  'DOI_HOAC_2_DON': '1 giường đôi hoặc 2 giường đơn',
  'KING': '1 giường king',
  'KING_HOAC_2_DON': '1 giường king hoặc 2 giường đơn',
  'KING_VA_DON': '1 giường king + 1 giường đơn'
};

// ============================================================================
// 1. TẢI DỮ LIỆU TỪ SUPABASE ĐỔ VÀO STATE CỦA WEB
// ============================================================================
async function pullAllFromSupabase() {
  try {
    const [
      { data: dbCats },
      { data: dbPrices },
      { data: dbRooms },
      { data: dbAmenityGroups },
      { data: dbAmenities },
      { data: dbCatAmenities },
      { data: dbServices },
      { data: dbCustomers },
      { data: dbBookings },
      { data: dbBookingItems },
      { data: dbStays },
      { data: dbExtras },
      { data: dbPayments },
      { data: dbHistory },
      { data: dbStaff }
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

    if (!dbCats || !dbRooms) return; // Nếu DB trống thì giữ nguyên dữ liệu mặc định

    // Reset maps
    Object.values(DB_MAPS).forEach(m => m.clear());

    // 1. Hạng phòng (loai_phong + bang_gia + chi_tiet_tien_ich)
    const mappedCategories = dbCats.map(c => {
      const uiId = 'HP' + String(c.ma_loai_phong).padStart(3, '0');
      DB_MAPS.catDbToUi.set(c.ma_loai_phong, uiId);
      DB_MAPS.catUiToDb.set(uiId, c.ma_loai_phong);

      const basePriceRow = (dbPrices || []).find(p => p.ma_loai_phong === c.ma_loai_phong && p.loai_gia === 'THUONG');
      const amIds = (dbCatAmenities || []).filter(ca => ca.ma_loai_phong === c.ma_loai_phong).map(ca => ca.ma_tien_ich);
      const amNames = (dbAmenities || []).filter(a => amIds.includes(a.ma_tien_ich)).map(a => a.ten_tien_ich);

      return {
        id: uiId,
        dbId: c.ma_loai_phong,
        name: c.ten_loai_phong,
        area: Number(c.dien_tich) || 25,
        beds: BED_TYPE_DB_TO_UI[c.loai_giuong] || c.loai_giuong,
        stdAdults: c.so_luong_nguoi_lon || 2,
        stdChildren: c.so_luong_tre_em || 1,
        maxAdults: c.so_luong_nguoi_lon || 2,
        maxExtraBed: c.giuong_phu_toi_da || 0,
        maxAdultsLimit: (c.so_luong_nguoi_lon || 2) + (c.giuong_phu_toi_da || 0),
        maxChildren: c.so_luong_tre_em || 1,
        capacity: `${c.so_luong_nguoi_lon} người lớn + ${c.so_luong_tre_em} trẻ dưới ${c.do_tuoi_tre_em} tuổi`,
        price: basePriceRow ? Number(basePriceRow.gia_phong) : 1400000,
        status: 'Đang kinh doanh',
        extraAdultFee: 200000,
        extraChildFee: 100000,
        description: c.mo_ta || '',
        images: [],
        amenitiesList: amNames,
        amenities: amNames.join(', ')
      };
    });

    // 2. Bảng giá (bang_gia)
    const mappedPricePlans = (dbPrices || []).map(p => ({
      id: 'BG' + String(p.ma_bang_gia).padStart(3, '0'),
      dbId: p.ma_bang_gia,
      categoryId: DB_MAPS.catDbToUi.get(p.ma_loai_phong) || 'HP001',
      startDate: p.ngay_bat_dau,
      endDate: p.ngay_ket_thuc || '',
      price: Number(p.gia_phong),
      note: `Loại giá: ${p.loai_gia}`,
      status: 'Đang áp dụng'
    }));

    // 3. Phòng vật lý (phong)
    const mappedRooms = dbRooms.map((r, idx) => {
      const uiId = 'P' + String(idx + 1).padStart(3, '0');
      DB_MAPS.roomDbToUi.set(r.ma_phong, uiId);
      DB_MAPS.roomUiToDb.set(uiId, r.ma_phong);
      const catUiId = DB_MAPS.catDbToUi.get(r.ma_loai_phong) || 'HP001';
      const catObj = mappedCategories.find(c => c.id === catUiId);

      return {
        id: uiId,
        dbId: r.ma_phong,
        soPhong: r.so_phong,
        name: `Phòng ${r.so_phong}`,
        floor: r.so_tang,
        categoryId: catUiId,
        bedConfig: catObj ? catObj.beds : '1 giường đôi',
        status: ROOM_STATUS_DB_TO_UI[r.trang_thai] || 'Trống',
        businessStatus: 'Đang kinh doanh',
        currentGuest: '',
        note: ''
      };
    });

    // 4. Nhóm tiện ích & Tiện ích
    const mappedAmenityGroups = (dbAmenityGroups || []).map(g => ({
      id: 'NTI' + String(g.ma_nhom).padStart(3, '0'),
      dbId: g.ma_nhom,
      name: g.ten_nhom
    }));
    const mappedAmenities = (dbAmenities || []).map(a => {
      const grp = mappedAmenityGroups.find(g => g.dbId === a.ma_nhom);
      return {
        id: 'TI' + String(a.ma_tien_ich).padStart(3, '0'),
        dbId: a.ma_tien_ich,
        groupId: grp ? grp.id : 'NTI001',
        groupName: grp ? grp.name : 'Tiện nghi cơ bản',
        name: a.ten_tien_ich,
        note: '',
        status: a.trang_thai === 'DANG_DUNG' ? 'Đang kinh doanh' : 'Ngừng kinh doanh'
      };
    });

    // 5. Dịch vụ (dich_vu)
    const mappedServices = (dbServices || []).map(s => {
      const uiId = 'DV' + String(s.ma_dich_vu).padStart(3, '0');
      DB_MAPS.srvDbToUi.set(s.ma_dich_vu, uiId);
      DB_MAPS.srvUiToDb.set(uiId, s.ma_dich_vu);
      return {
        id: uiId,
        dbId: s.ma_dich_vu,
        group: SERVICE_GROUP_DB_TO_UI[s.nhom_danh_muc] || s.nhom_danh_muc,
        name: s.ten_dich_vu,
        detail: s.ghi_chu || (s.thoi_luong_phut ? `${s.thoi_luong_phut} phút` : ''),
        price: Number(s.don_gia_niem_yet),
        unit: s.don_vi_tinh,
        status: s.trang_thai === 'DANG_DUNG' ? 'Đang kinh doanh' : 'Ngừng kinh doanh'
      };
    });

    // 6. Khách hàng (khach_hang)
    const mappedCustomers = (dbCustomers || []).map(kh => {
      const uiId = 'KH' + String(kh.ma_khach_hang).padStart(3, '0');
      DB_MAPS.custDbToUi.set(kh.ma_khach_hang, uiId);
      DB_MAPS.custUiToDb.set(uiId, kh.ma_khach_hang);
      return {
        id: uiId,
        dbId: kh.ma_khach_hang,
        name: kh.ten_khach_hang,
        phone: kh.so_dien_thoai,
        email: kh.email,
        idCard: kh.so_giay_to || '',
        note: kh.quoc_tich || '',
        status: 'Đang hoạt động'
      };
    });

    // 7. Lưu trú (luu_tru) & Phát sinh (phat_sinh)
    const mappedCheckins = (dbStays || []).map(lt => {
      const uiId = 'LT' + String(lt.ma_luu_tru).padStart(3, '0');
      DB_MAPS.stayDbToUi.set(lt.ma_luu_tru, uiId);
      DB_MAPS.stayUiToDb.set(uiId, lt.ma_luu_tru);

      const ctd = (dbBookingItems || []).find(i => i.ma_chi_tiet === lt.ma_chi_tiet);
      const ddp = ctd ? (dbBookings || []).find(b => b.ma_don === ctd.ma_don) : null;
      const kh = ddp ? mappedCustomers.find(k => k.dbId === ddp.ma_khach_hang) : null;
      const rmUiId = DB_MAPS.roomDbToUi.get(lt.ma_phong) || '';

      // Gán tên khách đang ở lên sơ đồ phòng
      if (!lt.thoi_gian_tra_phong && rmUiId && kh) {
        const rmObj = mappedRooms.find(r => r.id === rmUiId);
        if (rmObj) rmObj.currentGuest = kh.name;
      }

      const stayExtras = (dbExtras || []).filter(ps => ps.ma_luu_tru === lt.ma_luu_tru);
      const earlyFee = stayExtras.filter(ps => ps.loai_phat_sinh === 'PHU_THU_NHAN_SOM').reduce((s, x) => s + Number(x.thanh_tien), 0);
      const lateFee = stayExtras.filter(ps => ps.loai_phat_sinh === 'PHU_THU_TRA_MUON').reduce((s, x) => s + Number(x.thanh_tien), 0);

      return {
        id: uiId,
        dbId: lt.ma_luu_tru,
        detailId: lt.ma_chi_tiet,
        bookingId: ddp ? (ddp.ma_don_hien_thi || 'DD' + String(ddp.ma_don).padStart(6, '0')) : '',
        customerId: kh ? kh.id : '',
        guestName: kh ? kh.name : '',
        phone: kh ? kh.phone : '',
        idCard: kh ? kh.idCard : '',
        roomId: rmUiId,
        expectedCheckIn: ddp ? `${ddp.ngay_den} 14:00` : '',
        actualCheckIn: lt.thoi_gian_nhan_phong ? lt.thoi_gian_nhan_phong.slice(0, 16) : '',
        expectedCheckOut: ddp ? `${ddp.ngay_di} 12:00` : '',
        actualCheckOut: lt.thoi_gian_tra_phong ? lt.thoi_gian_tra_phong.slice(0, 16) : '',
        earlySurcharge: earlyFee,
        lateSurcharge: lateFee,
        staffName: 'Lễ tân',
        note: lt.ghi_chu || '',
        status: lt.thoi_gian_tra_phong ? 'Đã trả phòng' : 'Đang lưu trú'
      };
    });

    // 8. Đơn đặt phòng (don_dat_phong + chi_tiet_don)
    const mappedBookings = (dbBookings || []).map(ddp => {
      const uiId = ddp.ma_don_hien_thi || ('DD' + String(ddp.ma_don).padStart(6, '0'));
      DB_MAPS.bkDbToUi.set(ddp.ma_don, uiId);
      DB_MAPS.bkUiToDb.set(uiId, ddp.ma_don);

      const kh = mappedCustomers.find(k => k.dbId === ddp.ma_khach_hang);
      const ctds = (dbBookingItems || []).filter(i => i.ma_don === ddp.ma_don);
      const staysOfBk = mappedCheckins.filter(ci => ci.bookingId === uiId);
      const assignedRoomIds = staysOfBk.map(s => s.roomId).filter(Boolean);

      // Gom nhóm chi_tiet_don theo hạng phòng để khớp format items của UI
      const groupedItems = [];
      ctds.forEach(ct => {
        const catUi = DB_MAPS.catDbToUi.get(ct.ma_loai_phong) || 'HP001';
        const ex = groupedItems.find(g => g.categoryId === catUi && g.unitPrice === Number(ct.gia_moi_dem));
        if (ex) {
          ex.qty += 1;
        } else {
          groupedItems.push({ detailId: ct.ma_chi_tiet, categoryId: catUi, qty: 1, unitPrice: Number(ct.gia_moi_dem) });
        }
      });

      // Gom dịch vụ phát sinh của các lượt lưu trú thuộc đơn này
      const stayDbIds = (dbStays || []).filter(lt => ctds.some(c => c.ma_chi_tiet === lt.ma_chi_tiet)).map(lt => lt.ma_luu_tru);
      const srvExtras = (dbExtras || []).filter(ps => stayDbIds.includes(ps.ma_luu_tru) && ps.ma_dich_vu !== null);
      const mappedSrvItems = srvExtras.map(ps => {
        const dv = mappedServices.find(s => s.dbId === ps.ma_dich_vu);
        return {
          serviceId: dv ? dv.id : '',
          name: dv ? dv.name : ps.loai_phat_sinh,
          price: Number(ps.don_gia),
          qty: ps.so_luong
        };
      });

      const uiStatus = BOOKING_STATUS_DB_TO_UI[ddp.trang_thai] || 'Chưa xác nhận';
      const srvSum = mappedSrvItems.reduce((s, x) => s + x.price * x.qty, 0);

      return {
        id: uiId,
        dbId: ddp.ma_don,
        bookingTime: ddp.ngay_tao ? ddp.ngay_tao.replace('T', ' ').slice(0, 16) : '',
        customerId: kh ? kh.id : '',
        source: ddp.nguon_tao === 'AI_AGENT' ? 'AI Agent (Coze)' : ddp.nguon_tao,
        guestName: kh ? kh.name : '',
        phone: kh ? kh.phone : '',
        email: kh ? kh.email : '',
        idCard: kh ? kh.idCard : '',
        adults: ctds.reduce((s, c) => s + (c.so_nguoi_lon || 0), 0) || 2,
        childrenUnder6: ctds.reduce((s, c) => s + (c.so_tre_em_duoi_6 || 0), 0),
        children6to11: ctds.reduce((s, c) => s + (c.so_tre_em_6_11 || 0), 0),
        extraBed: ctds.reduce((s, c) => s + (c.so_giuong_phu || 0), 0),
        categoryId: groupedItems[0]?.categoryId || 'HP001',
        roomIds: assignedRoomIds,
        roomId: assignedRoomIds[0] || '',
        checkIn: ddp.ngay_den,
        checkOut: ddp.ngay_di,
        nights: ddp.so_dem || calcNightsDiff(ddp.ngay_den, ddp.ngay_di),
        items: groupedItems.length > 0 ? groupedItems : [{ categoryId: 'HP001', qty: 1, unitPrice: 1400000 }],
        serviceItems: mappedSrvItems,
        roomTotal: Number(ddp.tong_tien_phong),
        surchargeTotal: 0,
        totalAmount: Number(ddp.tong_tien_phong) + srvSum,
        depositAmount: Number(ddp.tien_coc) || Math.round(Number(ddp.tong_tien_phong) * 0.5),
        depositPaid: Number(ddp.tien_coc) > 0 || ['Đã xác nhận', 'Đang lưu trú', 'Hoàn thành'].includes(uiStatus),
        checkedOutPaid: uiStatus === 'Hoàn thành',
        cancelled: uiStatus === 'Đã hủy',
        cancelDate: ddp.ngay_huy ? ddp.ngay_huy.slice(0, 10) : '',
        cancelFee: Number(ddp.phi_huy) || 0,
        cancelReason: ddp.ly_do_huy || '',
        status: uiStatus,
        note: ddp.ghi_chu || ''
      };
    });

    // 9. Thanh toán (thanh_toan -> invoices)
    const mappedInvoices = (dbPayments || []).map(tt => {
      const bk = mappedBookings.find(b => b.dbId === tt.ma_don);
      return {
        id: 'HD' + String(tt.ma_thanh_toan).padStart(3, '0'),
        dbId: tt.ma_thanh_toan,
        bookingId: bk ? bk.id : '',
        customerId: bk ? bk.customerId : '',
        guestName: bk ? bk.guestName : 'Khách hàng',
        roomId: bk ? bk.roomId : '-',
        createdDate: tt.thoi_gian_lap ? tt.thoi_gian_lap.slice(0, 10) : '',
        createdTime: tt.thoi_gian_lap ? tt.thoi_gian_lap.replace('T', ' ').slice(0, 16) : '',
        categoryType: tt.phan_loai === 'COC' ? 'Thu tiền cọc' : (tt.phan_loai === 'THANH_TOAN' ? 'Thanh toán trả phòng' : 'Hoàn tiền / Phí hủy'),
        roomCharge: bk ? bk.roomTotal : Number(tt.tong_tien),
        surchargeAmount: 0,
        serviceItems: bk ? bk.serviceItems : [],
        serviceChargeTotal: 0,
        totalBeforeDeposit: Number(tt.tong_tien),
        depositPaid: bk ? bk.depositAmount : 0,
        finalPayable: Number(tt.tong_tien),
        paymentMethod: tt.phuong_thuc,
        status: tt.trang_thai === 'THANH_CONG' ? 'Đã thanh toán' : 'Chờ xử lý'
      };
    });

    // 10. Lịch sử thay đổi (lich_su_thay_doi)
    const mappedHistory = (dbHistory || []).map(ls => ({
      bookingId: DB_MAPS.bkDbToUi.get(ls.ma_don) || '',
      changeType: ls.loai_thay_doi,
      oldValue: ls.gia_tri_cu,
      newValue: ls.gia_tri_moi,
      changedAt: ls.ngay_thay_doi ? ls.ngay_thay_doi.replace('T', ' ').slice(0, 16) : ''
    }));

    // 11. Quản trị viên (quan_tri_vien)
    const mappedStaff = (dbStaff || []).map(qtv => ({
      id: 'NV-' + String(qtv.ma_quan_tri_vien).padStart(3, '0'),
      dbId: qtv.ma_quan_tri_vien,
      name: qtv.ho_ten,
      email: qtv.email,
      password: '123',
      role: qtv.vai_tro,
      status: qtv.trang_thai === 'HOAT_DONG' ? 'Đang làm việc' : 'Khóa'
    }));

    // Cập nhật toàn bộ vào biến state toàn cục của app.js
    state.roomCategories = mappedCategories;
    state.pricePlans = mappedPricePlans;
    state.rooms = mappedRooms;
    state.amenityGroups = mappedAmenityGroups;
    state.amenities = mappedAmenities;
    state.services = mappedServices;
    state.customers = mappedCustomers;
    state.bookings = mappedBookings;
    state.checkins = mappedCheckins;
    state.invoices = mappedInvoices;
    state.bookingHistory = mappedHistory;
    if (mappedStaff.length > 0) state.staff = mappedStaff;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateSidebarCounters(state);
    if (typeof renderCurrentView === 'function') renderCurrentView();
    console.log('✅ Đã đồng bộ dữ liệu thành công từ Supabase!');
  } catch (err) {
    console.error('❌ Lỗi khi tải dữ liệu từ Supabase:', err);
  }
}

// ============================================================================
// 2. GHI NGƯỢC THAO TÁC TỪ WEB LÊN SUPABASE (CHECK-IN, CHECK-OUT, TẠO/HỦY ĐƠN)
// ============================================================================
(function hookWebActionsToSupabase() {
  // Tự động tải dữ liệu mới nhất ngay khi mở trang
  window.addEventListener('DOMContentLoaded', () => {
    pullAllFromSupabase();
  });

  // Lắng nghe hàm saveState() của app.js để đẩy các thay đổi mới lên Supabase
  const originalSaveState = window.saveState;
  window.saveState = async function(newState) {
    if (typeof originalSaveState === 'function') {
      originalSaveState(newState);
    }
    const st = newState || state;

    // 1. Đồng bộ đơn đặt phòng mới tạo từ Web lên Supabase
    for (const bk of (st.bookings || [])) {
      if (!DB_MAPS.bkUiToDb.has(bk.id) && !bk._syncing) {
        bk._syncing = true;
        const catDbId = DB_MAPS.catUiToDb.get(bk.categoryId) || 1;
        const totalQty = (bk.items || []).reduce((s, it) => s + (Number(it.qty) || 1), 0) || 1;

        const { data } = await sb.rpc('api_tao_don_dat_phong', {
          p_ten_khach_hang: bk.guestName,
          p_so_dien_thoai: bk.phone,
          p_email: bk.email || `${bk.phone}@velorahotel.vn`,
          p_ngay_den: bk.checkIn,
          p_ngay_di: bk.checkOut,
          p_ma_loai_phong: catDbId,
          p_so_luong_phong: totalQty,
          p_so_nguoi_lon: bk.adults || 2,
          p_so_tre_duoi_6: bk.childrenUnder6 || 0,
          p_so_tre_6_11: bk.children6to11 || 0,
          p_ghi_chu: bk.note || 'Tạo từ Web quản trị'
        });

        if (data?.success) {
          // Nếu trên Web tick sẵn "Đã đặt cọc 50%", cập nhật trạng thái DA_COC trên DB
          if (bk.depositPaid) {
            await sb.from('don_dat_phong')
              .update({ trang_thai: 'DA_COC', tien_coc: bk.depositAmount })
              .eq('ma_don_hien_thi', data.ma_don);
          }
          await pullAllFromSupabase();
          return;
        }
      }

     // 2. Đồng bộ thao tác Hủy đơn từ Web lên Supabase
      if (bk.cancelled && DB_MAPS.bkUiToDb.has(bk.id) && !bk._cancelSynced) {
        bk._cancelSynced = true;
        await sb.rpc('api_huy_don', {
          p_ma_don_hien_thi: bk.id,
          p_so_dien_thoai: bk.phone,
          p_ly_do_huy: bk.cancelReason || 'Hủy trên Web quản trị'
        });
        await pullAllFromSupabase();
        return;
      }

    // 2b. Đồng bộ thao tác Xác nhận đơn (Đã đặt cọc 50%) từ Web lên Supabase
      if (
        !bk.cancelled &&
        (bk.depositPaid || bk.status === 'Đã xác nhận') &&
        DB_MAPS.bkUiToDb.has(bk.id) &&
        !bk._depositSynced
      ) {
        bk._depositSynced = true;
        const { data: resConfirm, error: errConfirm } = await sb.rpc('admin_xac_nhan_don', {
          p_ma_don_hien_thi: bk.id,
          p_tien_coc: Number(bk.depositAmount) || null,
          p_phuong_thuc: 'CHUYEN_KHOAN',
          p_ghi_chu: bk.note || null
        });

        if (errConfirm) {
          console.error('❌ Lỗi xác nhận đơn lên Supabase:', errConfirm);
          bk._depositSynced = false;
        } else {
          console.log('✅ Đã đồng bộ xác nhận đơn lên Supabase:', resConfirm);
          await pullAllFromSupabase();
          return;
        }
      }
    // 3. Đồng bộ lượt Check-in mới từ Web -> Gọi admin_check_in để sinh luu_tru
    for (const ci of (st.checkins || [])) {
      if (!DB_MAPS.stayUiToDb.has(ci.id) && !ci._syncing) {
        ci._syncing = true;
        const roomDbId = DB_MAPS.roomUiToDb.get(ci.roomId);
        const bkDbId = DB_MAPS.bkUiToDb.get(ci.bookingId);

        if (roomDbId && bkDbId) {
          // Tìm ma_chi_tiet chưa có luu_tru của đơn này
          const { data: ctdList } = await sb.from('chi_tiet_don').select('ma_chi_tiet').eq('ma_don', bkDbId);
          const { data: existingLts } = await sb.from('luu_tru').select('ma_chi_tiet');
          const usedCtd = new Set((existingLts || []).map(x => x.ma_chi_tiet));
          const freeCtd = (ctdList || []).find(x => !usedCtd.has(x.ma_chi_tiet));

          if (freeCtd) {
            await sb.rpc('admin_check_in', {
              p_ma_chi_tiet: freeCtd.ma_chi_tiet,
              p_ma_phong: roomDbId,
              p_da_xac_minh_giay_to: true,
              p_loai_giay_to: 'CCCD',
              p_so_giay_to: ci.idCard || '000000000000',
              p_ghi_chu: ci.note || ''
            });
            await pullAllFromSupabase();
            return;
          }
        }
      }

      // 4. Đồng bộ lượt Check-out từ Web -> Gọi admin_check_out
      if (ci.actualCheckOut && DB_MAPS.stayUiToDb.has(ci.id) && !ci._checkoutSynced) {
        ci._checkoutSynced = true;
        const stayDbId = DB_MAPS.stayUiToDb.get(ci.id);
        await sb.rpc('admin_check_out', {
          p_ma_luu_tru: stayDbId,
          p_phu_thu_tra_muon: Number(ci.lateSurcharge) || 0
        });
        await pullAllFromSupabase();
        return;
      }
      // ============================================================================
// 3. LẮNG NGHE REALTIME: TỰ ĐỘNG CẬP NHẬT WEB QUẢN TRỊ KHI WEB KHÁCH / COZE CÓ ĐƠN MỚI
// ============================================================================
sb.channel('velora-realtime-sync')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'don_dat_phong' }, () => {
    console.log('🔔 Có thay đổi mới ở bảng don_dat_phong -> Đang đồng bộ...');
    pullAllFromSupabase();
  })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'phong' }, () => {
    pullAllFromSupabase();
  })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'luu_tru' }, () => {
    pullAllFromSupabase();
  })
  .subscribe();
    }
  };
})();
