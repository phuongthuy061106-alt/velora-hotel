// ============================================================================
// VELORA HOTEL SA PA - HỆ THỐNG QUẢN LÝ KHÁCH SẠN 4 SAO
// Dữ liệu chuẩn hóa từ Thẻ Tổng (Google Docs) - Tài khoản: admin / Mật khẩu: 123
// ============================================================================

const STORAGE_KEY = 'velora_hotel_db_v3_pos';
try { localStorage.removeItem('velora_hotel_management_v1'); localStorage.removeItem('velora_hotel_db_v2'); } catch(_) {}

// Định dạng tiền tệ VNĐ
function formatVND(amount) {
  return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
}

// Tạo danh sách 80 phòng (Tầng 2 đến Tầng 9, mỗi tầng 10 phòng)
function generateInitialRooms() {
  // Phân bổ 80 phòng đúng theo 4 hạng:
  // Superior (28 phòng), Deluxe Mountain View (24 phòng), Family Room (16 phòng), Executive Suite (12 phòng)
  const rooms = [];
  const occupiedMap = {
    'P071': { status: 'Đang ở', guest: 'David Chen' },
    'P001': { status: 'Đang ở', guest: 'Lê Hoàng Nam' },
    'P011': { status: 'Đang dọn', guest: '' }
  };

  let seq = 0;
  for (let floor = 2; floor <= 9; floor++) {
    for (let num = 1; num <= 10; num++) {
      seq++;
      const roomCode = 'P' + String(seq).padStart(3, '0');
      const legacyKey = `P${floor}${String(num).padStart(2, '0')}`;
      const roomName = `Phòng ${floor}${String(num).padStart(2, '0')}`;
      let categoryId = 'HP001';
      let bedConfig = '1 giường đôi';

      // Phân bổ theo tầng và vị trí phòng:
      // 28 Superior: tầng 2..5 (phòng 01..07) -> 4*7 = 28
      // 24 Deluxe Mountain View: tầng 2..5 (phòng 08..10 = 12) + tầng 6..9 (phòng 01..03 = 12) -> 24
      // 16 Family Room: tầng 6..9 (phòng 04..07) -> 4*4 = 16
      // 12 Executive Suite: tầng 6..9 (phòng 08..10) -> 4*3 = 12
      if (floor <= 5) {
        if (num <= 7) {
          categoryId = 'HP001';
          bedConfig = num % 2 === 0 ? '2 giường đơn' : '1 giường đôi';
        } else {
          categoryId = 'HP002';
          bedConfig = num % 2 === 0 ? '2 giường đơn' : '1 giường king';
        }
      } else {
        if (num <= 3) {
          categoryId = 'HP002';
          bedConfig = num % 2 === 0 ? '2 giường đơn' : '1 giường king';
        } else if (num <= 7) {
          categoryId = 'HP003';
          bedConfig = '1 giường king + 1 giường đơn';
        } else {
          categoryId = 'HP004';
          bedConfig = '1 giường king';
        }
      }

      const preset = occupiedMap[roomCode] || occupiedMap[legacyKey];
      rooms.push({
        id: roomCode,
        name: roomName,
        floor: floor,
        categoryId: categoryId,
        bedConfig: bedConfig,
        status: preset ? preset.status : 'Trống',
        currentGuest: preset ? preset.guest : '',
        note: categoryId === 'HP001' ? 'Hướng phố' : 'View núi & thung lũng'
      });
    }
  }
  return rooms;
}

// Dữ liệu mặc định chuẩn từ Thẻ Tổng (Velora Hotel)
function getDefaultData() {
  return {
    hotelInfo: {
      name: 'Velora Hotel',
      stars: '4 sao, 80 phòng, 9 tầng',
      location: 'Trung tâm Sa Pa, tỉnh Lào Cai, cách nhà thờ đá khoảng 1,5 km (đi bộ 15 phút)',
      address: 'Số 29, Đường Thác Bạc, TDP Sa Pa 5, Phường Sa Pa, Tỉnh Lào Cai, Việt Nam',
      phone: '0214 356 5555',
      hotline: '0868 588 824',
      email: 'novara.hotel@gmail.com',
      style: 'Hiện đại pha nét núi rừng Tây Bắc, tông xanh pistachio và gỗ, ấm cúng, cửa sổ lớn nhìn ra núi',
      targetGuests: 'Gia đình du lịch, khách trẻ tự đi, khách công tác, khách quốc tế',
      highlights: 'View núi và thung lũng, hồ bơi nước ấm trong nhà (06:00-21:00), phòng gym (06:00-22:00), spa tắm lá thuốc (10:00-22:00), gần các điểm tham quan Sa Pa',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      depositPercent: 50
    },
    roomCategories: [
      {
        id: 'HP001',
        name: 'Superior',
        area: 25,
        beds: '1 giường đôi hoặc 2 giường đơn',
        bedsEn: '1 double or 2 single beds',
        capacity: '2 người lớn + 1 trẻ dưới 6 tuổi',
        capacityEn: '2 adults + 1 child under 6',
        maxAdults: 2,
        price: 1400000,
        status: 'Đang kinh doanh',
        overtimeSurcharge: 'Nhận sớm trước 06:00: 100% tiền phòng; sau 06:00: 50% (không gồm ăn sáng). Trả muộn trước 18:00: 50%; sau 18:00: 100%.',
        extraGuestSurcharge: 'Trẻ dưới 6 tuổi: Miễn phí; Trẻ 6-11 tuổi: 100.000đ/trẻ/đêm; Trẻ ≥12 tuổi / Giường phụ: 200.000đ/khách/đêm.',
        description: 'Phòng diện tích 25 m², 1 giường đôi hoặc 2 giường đơn, hướng phố. Giá đã bao gồm VAT, phí dịch vụ và buffet sáng.',
        images: [],
        amenities: 'Hướng phố, điều hòa 2 chiều, TV, wifi, minibar, két sắt, vòi sen',
        amenitiesList: ['Hướng phố', 'Điều hòa 2 chiều', 'TV', 'Wifi', 'Minibar', 'Két sắt', 'Vòi sen'],
        amenitiesEn: 'Street view, air-conditioning, TV, wifi, minibar, safe, shower'
      },
      {
        id: 'HP002',
        name: 'Deluxe Mountain View',
        area: 30,
        beds: '1 giường king hoặc 2 giường đơn',
        bedsEn: '1 king or 2 single beds',
        capacity: '2 người lớn + 1 trẻ dưới 12 tuổi',
        capacityEn: '2 adults + 1 child under 12',
        maxAdults: 2,
        price: 1850000,
        status: 'Đang kinh doanh',
        overtimeSurcharge: 'Nhận sớm trước 06:00: 100% tiền phòng; sau 06:00: 50% (không gồm ăn sáng). Trả muộn trước 18:00: 50%; sau 18:00: 100%.',
        extraGuestSurcharge: 'Trẻ dưới 6 tuổi: Miễn phí; Trẻ 6-11 tuổi: 100.000đ/trẻ/đêm; Trẻ ≥12 tuổi / Giường phụ: 200.000đ/khách/đêm.',
        description: 'Phòng diện tích 30 m², 1 giường king hoặc 2 giường đơn, cửa sổ lớn nhìn núi. Giá đã bao gồm VAT, phí dịch vụ và buffet sáng.',
        images: [],
        amenities: 'Cửa sổ lớn nhìn núi, bàn làm việc, máy pha cà phê, điều hòa 2 chiều, minibar, két sắt',
        amenitiesList: ['Cửa sổ lớn nhìn núi', 'Bàn làm việc', 'Máy pha cà phê', 'Điều hòa 2 chiều', 'Minibar', 'Két sắt'],
        amenitiesEn: 'Large mountain-view window, work desk, coffee machine'
      },
      {
        id: 'HP003',
        name: 'Family Room',
        area: 42,
        beds: '1 giường king + 1 giường đơn',
        bedsEn: '1 king + 1 single bed',
        capacity: '2 người lớn + 2 trẻ dưới 12 tuổi',
        capacityEn: '2 adults + 2 children under 12',
        maxAdults: 2,
        price: 2650000,
        status: 'Đang kinh doanh',
        overtimeSurcharge: 'Nhận sớm trước 06:00: 100% tiền phòng; sau 06:00: 50% (không gồm ăn sáng). Trả muộn trước 18:00: 50%; sau 18:00: 100%.',
        extraGuestSurcharge: 'Trẻ dưới 6 tuổi: Miễn phí; Trẻ 6-11 tuổi: 100.000đ/trẻ/đêm; Trẻ ≥12 tuổi / Giường phụ: 200.000đ/khách/đêm.',
        description: 'Phòng gia đình diện tích 42 m², 1 giường king + 1 giường đơn, có phòng khách nhỏ. Giá đã bao gồm VAT, phí dịch vụ và buffet sáng.',
        images: [],
        amenities: 'Phòng khách nhỏ, bồn tắm, đồ dùng trẻ em, tủ lạnh lớn, cửa sổ nhìn núi',
        amenitiesList: ['Phòng khách nhỏ', 'Bồn tắm', 'Đồ dùng trẻ em', 'Tủ lạnh lớn', 'Cửa sổ nhìn núi'],
        amenitiesEn: 'Small living area, bathtub, kids’ amenities, large fridge'
      },
      {
        id: 'HP004',
        name: 'Executive Suite',
        area: 55,
        beds: '1 giường king',
        bedsEn: '1 king bed',
        capacity: '2 người lớn + 1 trẻ dưới 12 tuổi',
        capacityEn: '2 adults + 1 child under 12',
        maxAdults: 2,
        price: 3800000,
        status: 'Đang kinh doanh',
        overtimeSurcharge: 'Nhận sớm trước 06:00: 100% tiền phòng; sau 06:00: 50% (không gồm ăn sáng). Trả muộn trước 18:00: 50%; sau 18:00: 100%.',
        extraGuestSurcharge: 'Trẻ dưới 6 tuổi: Miễn phí; Trẻ 6-11 tuổi: 100.000đ/trẻ/đêm; Trẻ ≥12 tuổi / Giường phụ: 200.000đ/khách/đêm.',
        description: 'Phòng Suite cao cấp 55 m², 1 giường king, phòng khách riêng, ban công view núi, ưu tiên nhận/trả phòng.',
        images: [],
        amenities: 'Phòng khách riêng, bồn tắm nằm, ban công view núi, ưu tiên nhận/trả phòng',
        amenitiesList: ['Phòng khách riêng', 'Bồn tắm nằm', 'Ban công view núi', 'Ưu tiên nhận/trả phòng'],
        amenitiesEn: 'Separate living room, soaking tub, mountain-view balcony, priority check-in/out'
      }
    ],
    rooms: generateInitialRooms(),
    amenityGroups: [
      { id: 'NTI001', name: 'Tiện nghi cơ bản' },
      { id: 'NTI002', name: 'Công nghệ & Giải trí' },
      { id: 'NTI003', name: 'Phòng tắm' },
      { id: 'NTI004', name: 'Không gian & View' },
      { id: 'NTI005', name: 'Tiện ích gia đình & VIP' }
    ],
    amenities: [
      { id: 'TI001', groupId: 'NTI001', groupName: 'Tiện nghi cơ bản', name: 'Điều hòa 2 chiều', note: '', status: 'Đang kinh doanh' },
      { id: 'TI002', groupId: 'NTI002', groupName: 'Công nghệ & Giải trí', name: 'TV', note: '', status: 'Đang kinh doanh' },
      { id: 'TI003', groupId: 'NTI002', groupName: 'Công nghệ & Giải trí', name: 'Wifi', note: '', status: 'Đang kinh doanh' },
      { id: 'TI004', groupId: 'NTI001', groupName: 'Tiện nghi cơ bản', name: 'Minibar', note: '', status: 'Đang kinh doanh' },
      { id: 'TI005', groupId: 'NTI001', groupName: 'Tiện nghi cơ bản', name: 'Két sắt', note: '', status: 'Đang kinh doanh' },
      { id: 'TI006', groupId: 'NTI003', groupName: 'Phòng tắm', name: 'Vòi sen', note: '', status: 'Đang kinh doanh' },
      { id: 'TI007', groupId: 'NTI004', groupName: 'Không gian & View', name: 'Hướng phố', note: '', status: 'Đang kinh doanh' },
      { id: 'TI008', groupId: 'NTI004', groupName: 'Không gian & View', name: 'Cửa sổ lớn nhìn núi', note: '', status: 'Đang kinh doanh' },
      { id: 'TI009', groupId: 'NTI001', groupName: 'Tiện nghi cơ bản', name: 'Bàn làm việc', note: '', status: 'Đang kinh doanh' },
      { id: 'TI010', groupId: 'NTI001', groupName: 'Tiện nghi cơ bản', name: 'Máy pha cà phê', note: '', status: 'Đang kinh doanh' },
      { id: 'TI011', groupId: 'NTI004', groupName: 'Không gian & View', name: 'Phòng khách nhỏ', note: '', status: 'Đang kinh doanh' },
      { id: 'TI012', groupId: 'NTI003', groupName: 'Phòng tắm', name: 'Bồn tắm', note: '', status: 'Đang kinh doanh' },
      { id: 'TI013', groupId: 'NTI005', groupName: 'Tiện ích gia đình & VIP', name: 'Đồ dùng trẻ em', note: '', status: 'Đang kinh doanh' },
      { id: 'TI014', groupId: 'NTI001', groupName: 'Tiện nghi cơ bản', name: 'Tủ lạnh lớn', note: '', status: 'Đang kinh doanh' },
      { id: 'TI015', groupId: 'NTI004', groupName: 'Không gian & View', name: 'Phòng khách riêng', note: '', status: 'Đang kinh doanh' },
      { id: 'TI016', groupId: 'NTI003', groupName: 'Phòng tắm', name: 'Bồn tắm nằm', note: '', status: 'Đang kinh doanh' },
      { id: 'TI017', groupId: 'NTI004', groupName: 'Không gian & View', name: 'Ban công view núi', note: '', status: 'Đang kinh doanh' },
      { id: 'TI018', groupId: 'NTI005', groupName: 'Tiện ích gia đình & VIP', name: 'Ưu tiên nhận/trả phòng', note: '', status: 'Đang kinh doanh' }
    ],
    pricePlans: [
      { id: 'BG001', categoryId: 'HP001', startDate: '2026-01-01', endDate: '2026-12-31', price: 1400000, note: 'Giá niêm yết chuẩn 2026' },
      { id: 'BG002', categoryId: 'HP002', startDate: '2026-01-01', endDate: '2026-12-31', price: 1850000, note: 'Giá niêm yết chuẩn 2026' },
      { id: 'BG003', categoryId: 'HP003', startDate: '2026-01-01', endDate: '2026-12-31', price: 2650000, note: 'Giá niêm yết chuẩn 2026' },
      { id: 'BG004', categoryId: 'HP004', startDate: '2026-01-01', endDate: '2026-12-31', price: 3800000, note: 'Giá niêm yết chuẩn 2026' },
      { id: 'BG005', categoryId: 'HP002', startDate: '2026-12-24', endDate: '2027-01-03', price: 2200000, note: 'Giá mùa cao điểm Giáng Sinh & Năm mới' }
    ],
    bookingHistory: [],
    pendingHistoryLogs: [],
    surcharges: [
      { id: 'SUR-01', item: 'Trẻ dưới 6 tuổi (Child under 6)', rateText: 'Miễn phí (Free)', amount: 0, unit: 'trẻ/đêm' },
      { id: 'SUR-02', item: 'Trẻ 6-11 tuổi (Child aged 6-11)', rateText: '100.000đ/trẻ/phòng/đêm', amount: 100000, unit: 'trẻ/phòng/đêm' },
      { id: 'SUR-03', item: 'Trẻ từ 12 tuổi trở lên (Child aged 12+)', rateText: 'Tính như người lớn (Charged as an adult)', amount: 200000, unit: 'khách/đêm' },
      { id: 'SUR-04', item: 'Giường phụ (Người lớn hoặc trẻ từ 12 tuổi)', rateText: '200.000đ/khách/đêm (per guest, per night)', amount: 200000, unit: 'khách/đêm' },
      { id: 'SUR-05', item: 'Nhận phòng sớm trước 06:00 (Early check-in before 06:00)', rateText: '100% tiền phòng (100% of room rate)', amount: 100, unit: '% tiền phòng' },
      { id: 'SUR-06', item: 'Nhận phòng sớm sau 06:00 (Early check-in after 06:00)', rateText: '50% tiền phòng, không gồm ăn sáng', amount: 50, unit: '% tiền phòng' },
      { id: 'SUR-07', item: 'Trả phòng muộn trước 18:00 (Late check-out before 18:00)', rateText: '50% tiền phòng (50% of room rate)', amount: 50, unit: '% tiền phòng' },
      { id: 'SUR-08', item: 'Trả phòng muộn sau 18:00 (Late check-out after 18:00)', rateText: '100% tiền phòng (100% of room rate)', amount: 100, unit: '% tiền phòng' },
      { id: 'SUR-09', item: 'Lễ, Tết, mùa cao điểm (mùa hoa đào, mùa lúa chín)', rateText: 'Báo giá riêng (Quoted separately)', amount: 0, unit: 'báo giá riêng' }
    ],
    serviceGroups: [
      { id: 'NDV001', name: 'Spa', note: 'Mở cửa 10:00 - 22:00, nên đặt trước', status: 'Đang kinh doanh' },
      { id: 'NDV002', name: 'Giặt ủi', note: 'Nhận trước 9:00 trả trong ngày; sau 9:00 trả hôm sau', status: 'Đang kinh doanh' },
      { id: 'NDV003', name: 'Đưa đón', note: 'Xe riêng, đặt trước ít nhất 12 giờ', status: 'Đang kinh doanh' },
      { id: 'NDV004', name: 'Tour tham quan', note: 'Tour khám phá Sa Pa & Fansipan', status: 'Đang kinh doanh' },
      { id: 'NDV005', name: 'Phí phạt vi phạm', note: 'Áp dụng theo quy định chung khách sạn', status: 'Đang kinh doanh' }
    ],
    services: [
      { id: 'DV001', groupId: 'NDV001', group: 'Spa', name: 'Massage body / Body massage', detail: '60 phút / min', price: 600000, unit: 'lượt', status: 'Đang kinh doanh' },
      { id: 'DV002', groupId: 'NDV001', group: 'Spa', name: 'Massage chân / Foot massage', detail: '45 phút / min', price: 380000, unit: 'lượt', status: 'Đang kinh doanh' },
      { id: 'DV003', groupId: 'NDV001', group: 'Spa', name: 'Tắm lá thuốc người Dao đỏ / Red Dao herbal bath', detail: '45 phút / min', price: 250000, unit: 'người', status: 'Đang kinh doanh' },
      { id: 'DV004', groupId: 'NDV001', group: 'Spa', name: 'Gói đôi / Couple package', detail: '90 phút / min', price: 1700000, unit: 'gói', status: 'Đang kinh doanh' },
      { id: 'DV005', groupId: 'NDV002', group: 'Giặt ủi', name: 'Áo sơ mi / Shirt', detail: 'Giặt ủi tiêu chuẩn', price: 40000, unit: 'món', status: 'Đang kinh doanh' },
      { id: 'DV006', groupId: 'NDV002', group: 'Giặt ủi', name: 'Quần dài / Trousers', detail: 'Giặt ủi tiêu chuẩn', price: 50000, unit: 'món', status: 'Đang kinh doanh' },
      { id: 'DV007', groupId: 'NDV002', group: 'Giặt ủi', name: 'Váy, đầm / Skirt, dress', detail: 'Giặt ủi tiêu chuẩn', price: 90000, unit: 'món', status: 'Đang kinh doanh' },
      { id: 'DV008', groupId: 'NDV002', group: 'Giặt ủi', name: 'Các món khác / Other items', detail: '30.000đ - 120.000đ/món', price: 60000, unit: 'món', status: 'Đang kinh doanh' },
      { id: 'DV009', groupId: 'NDV003', group: 'Đưa đón', name: 'Từ ga Lào Cai - Xe 4 chỗ (4-seater)', detail: 'Xe riêng 1 chiều', price: 550000, unit: 'chiều', status: 'Đang kinh doanh' },
      { id: 'DV010', groupId: 'NDV003', group: 'Đưa đón', name: 'Từ ga Lào Cai - Xe 7 chỗ (7-seater)', detail: 'Xe riêng 1 chiều', price: 750000, unit: 'chiều', status: 'Đang kinh doanh' },
      { id: 'DV011', groupId: 'NDV004', group: 'Tour tham quan', name: 'Nửa ngày bản Cát Cát và thác Tiên Sa', detail: 'Half-day Cat Cat Village & Tien Sa Waterfall', price: 550000, unit: 'người', status: 'Đang kinh doanh' },
      { id: 'DV012', groupId: 'NDV004', group: 'Tour tham quan', name: '1 ngày Fansipan (Full-day Fansipan)', detail: 'Vé cáp treo tính riêng', price: 700000, unit: 'người', status: 'Đang kinh doanh' },
      { id: 'DV013', groupId: 'NDV004', group: 'Tour tham quan', name: '1 ngày bản Tả Van, Lao Chải, Mường Hoa', detail: 'Full-day Ta Van, Lao Chai & Muong Hoa', price: 850000, unit: 'người', status: 'Đang kinh doanh' },
      { id: 'DV014', groupId: 'NDV005', group: 'Phí phạt vi phạm', name: 'Phạt hút thuốc trong phòng / khu vực cấm', detail: 'Theo điều 4 Quy định chung', price: 500000, unit: 'lần', status: 'Đang kinh doanh' }
    ],
    customers: [
      { id: 'KH001', name: 'Nguyễn Minh Tuấn', phone: '0912345678', email: 'minhtuan.nguyen@gmail.com', idCard: '001092014582', note: 'Khách gia đình', status: 'Đang hoạt động' },
      { id: 'KH002', name: 'Michael Anderson', phone: '0987654321', email: 'm.anderson@ukmail.com', idCard: 'P88492011', note: 'Khách quốc tế', status: 'Đang hoạt động' },
      { id: 'KH003', name: 'Đặng Quốc Khánh', phone: '0903456789', email: 'quockhanh.dang@gmail.com', idCard: '034088009214', note: 'Gia đình 4 người', status: 'Đang hoạt động' },
      { id: 'KH004', name: 'David Chen', phone: '0938112233', email: 'david.chen@sgcorp.com', idCard: 'E99201842', note: 'Khách công tác VIP', status: 'Đang hoạt động' },
      { id: 'KH005', name: 'Lê Hoàng Nam', phone: '0977889900', email: 'hoangnam.le@gmail.com', idCard: '001095023110', note: 'Khách trẻ tự đi', status: 'Đang hoạt động' },
      { id: 'KH006', name: 'Trương Mỹ Linh', phone: '0945667788', email: 'mylinh.truong@yahoo.com', idCard: '079194008321', note: 'Đặt gói Spa đôi', status: 'Đang hoạt động' },
      { id: 'KH007', name: 'Phan Thanh Sơn', phone: '0961234888', email: 'thanhson.phan@gmail.com', idCard: '015091004512', note: 'Khách thân thiết', status: 'Đang hoạt động' }
    ],
    cancellationPolicies: [
      { id: 'CAN-01', timeframe: 'Từ 10 ngày trở lên (≥ 10 ngày trước ngày nhận phòng)', feePercent: 0, description: 'Miễn phí hủy phòng (Hoàn 100% tiền cọc trong 7 ngày làm việc)' },
      { id: 'CAN-02', timeframe: 'Từ 4 – 9 ngày trước ngày nhận phòng', feePercent: 50, description: 'Thu 50% tiền cọc đã đặt (Hoàn lại 50% tiền cọc)' },
      { id: 'CAN-03', timeframe: 'Từ 1 – 3 ngày trước ngày nhận phòng (hoặc No-show)', feePercent: 100, description: 'Thu 100% tiền cọc đã đặt (Không hoàn cọc)' }
    ],
    bookings: [
      {
        id: 'DP001',
        bookingTime: '2026-11-18 09:15',
        customerId: 'KH001',
        source: 'Trực tiếp tại quầy',
        guestName: 'Nguyễn Minh Tuấn',
        phone: '0912345678',
        email: 'minhtuan.nguyen@gmail.com',
        idCard: '001092014582',
        adults: 2,
        children6to11: 0,
        childrenUnder6: 1,
        extraBed: 0,
        categoryId: 'HP001',
        roomId: '',
        checkIn: '2026-11-22',
        checkOut: '2026-11-24',
        nights: 2,
        items: [{ categoryId: 'HP001', qty: 1, unitPrice: 1400000 }],
        earlyLatePercent: 0,
        roomTotal: 2800000,
        surchargeTotal: 0,
        totalAmount: 2800000,
        depositAmount: 1400000,
        depositPaid: false,
        status: 'Chưa xác nhận',
        note: 'Khách đặt qua quầy, chờ chuyển khoản cọc'
      },
      {
        id: 'DP002',
        bookingTime: '2026-11-17 14:20',
        customerId: 'KH002',
        source: 'Booking.com',
        guestName: 'Michael Anderson',
        phone: '0987654321',
        email: 'm.anderson@ukmail.com',
        idCard: 'P88492011',
        adults: 2,
        children6to11: 0,
        childrenUnder6: 0,
        extraBed: 0,
        categoryId: 'HP002',
        roomId: '',
        checkIn: '2026-11-21',
        checkOut: '2026-11-23',
        nights: 2,
        items: [{ categoryId: 'HP002', qty: 1, unitPrice: 1850000 }],
        earlyLatePercent: 0,
        roomTotal: 3700000,
        surchargeTotal: 0,
        totalAmount: 3700000,
        depositAmount: 1850000,
        depositPaid: true,
        status: 'Đã xác nhận',
        note: 'Đã nhận cọc 50%, chờ khách Check-in'
      },
      {
        id: 'DP003',
        bookingTime: '2026-11-18 10:00',
        customerId: 'KH003',
        source: 'Website',
        guestName: 'Đặng Quốc Khánh',
        phone: '0903456789',
        email: 'quockhanh.dang@gmail.com',
        idCard: '034088009214',
        adults: 4,
        children6to11: 1,
        childrenUnder6: 0,
        extraBed: 0,
        categoryId: 'HP003',
        roomId: '',
        checkIn: '2026-11-21',
        checkOut: '2026-11-23',
        nights: 2,
        items: [{ categoryId: 'HP003', qty: 2, unitPrice: 2650000 }],
        earlyLatePercent: 0,
        roomTotal: 10600000,
        surchargeTotal: 200000,
        totalAmount: 10800000,
        depositAmount: 5300000,
        depositPaid: true,
        status: 'Đã xác nhận',
        note: 'Đoàn gia đình đặt 2 phòng Family Room'
      },
      {
        id: 'DP004',
        bookingTime: '2026-11-17 13:30',
        customerId: 'KH004',
        source: 'Trực tiếp tại quầy',
        guestName: 'David Chen',
        phone: '0938112233',
        email: 'david.chen@sgcorp.com',
        idCard: 'E99201842',
        adults: 2,
        children6to11: 0,
        childrenUnder6: 0,
        extraBed: 0,
        categoryId: 'HP004',
        roomId: 'P071',
        checkIn: '2026-11-17',
        checkOut: '2026-11-20',
        nights: 3,
        items: [{ categoryId: 'HP004', qty: 1, unitPrice: 3800000 }],
        serviceItems: [{ serviceId: 'DV002', name: 'Gói đôi Spa / Couple package (90 phút)', price: 1700000, qty: 1 }],
        earlyLatePercent: 0,
        roomTotal: 11400000,
        surchargeTotal: 0,
        totalAmount: 13100000,
        depositAmount: 5700000,
        depositPaid: true,
        status: 'Đang lưu trú',
        note: 'Khách VIP đang lưu trú phòng Executive Suite'
      },
      {
        id: 'DP005',
        bookingTime: '2026-11-18 08:00',
        customerId: 'KH005',
        source: 'Hotline / Zalo',
        guestName: 'Lê Hoàng Nam',
        phone: '0977889900',
        email: 'hoangnam.le@gmail.com',
        idCard: '001095023110',
        adults: 2,
        children6to11: 0,
        childrenUnder6: 0,
        extraBed: 0,
        categoryId: 'HP001',
        roomId: 'P001',
        checkIn: '2026-11-18',
        checkOut: '2026-11-19',
        nights: 1,
        items: [{ categoryId: 'HP001', qty: 1, unitPrice: 1400000 }],
        earlyLatePercent: 50,
        roomTotal: 1400000,
        surchargeTotal: 700000,
        totalAmount: 2100000,
        depositAmount: 700000,
        depositPaid: true,
        status: 'Đang lưu trú',
        note: 'Nhận phòng sớm 10:30 (phụ thu +50%)'
      },
      {
        id: 'DP006',
        bookingTime: '2026-11-13 16:10',
        customerId: 'KH006',
        source: 'Agoda',
        guestName: 'Trương Mỹ Linh',
        phone: '0945667788',
        email: 'mylinh.truong@yahoo.com',
        idCard: '079194008321',
        adults: 2,
        children6to11: 0,
        childrenUnder6: 0,
        extraBed: 0,
        categoryId: 'HP002',
        roomId: 'P011',
        checkIn: '2026-11-14',
        checkOut: '2026-11-16',
        nights: 2,
        items: [{ categoryId: 'HP002', qty: 1, unitPrice: 1850000 }],
        serviceItems: [{ serviceId: 'DV009', name: 'Từ ga Lào Cai - Xe 4 chỗ (4-seater)', price: 550000, qty: 1 }],
        earlyLatePercent: 0,
        roomTotal: 3700000,
        surchargeTotal: 0,
        totalAmount: 4250000,
        depositAmount: 1850000,
        depositPaid: true,
        checkedOutPaid: true,
        status: 'Hoàn thành',
        note: 'Đã trả phòng và hoàn tất thanh toán'
      }
    ],
    invoices: [
      {
        id: 'HD001',
        bookingId: 'DP006',
        customerId: 'KH006',
        guestName: 'Trương Mỹ Linh',
        roomId: 'P011',
        categoryName: 'Deluxe Mountain View',
        createdDate: '2026-11-16',
        createdTime: '2026-11-16 11:50',
        categoryType: 'Thanh toán trả phòng',
        roomCharge: 3700000,
        surchargeAmount: 0,
        serviceItems: [
          { serviceId: 'DV009', name: 'Từ ga Lào Cai - Xe 4 chỗ (4-seater)', qty: 1, price: 550000 }
        ],
        serviceChargeTotal: 550000,
        totalBeforeDeposit: 4250000,
        depositPaid: 1850000,
        finalPayable: 2400000,
        paymentMethod: 'Chuyển khoản ngân hàng',
        status: 'Đã thanh toán'
      }
    ],
    checkins: [
      {
        id: 'LT001',
        bookingId: 'DP004',
        customerId: 'KH004',
        guestName: 'David Chen',
        phone: '0938112233',
        idCard: 'E99201842',
        roomId: 'P071',
        expectedCheckIn: '2026-11-17 14:00',
        actualCheckIn: '2026-11-17T14:10',
        expectedCheckOut: '2026-11-20 12:00',
        actualCheckOut: '',
        earlySurcharge: 0,
        lateSurcharge: 0,
        staffName: 'Nguyễn Thị Lệ Quyên',
        note: 'Phòng tầng cao view núi',
        status: 'Đang lưu trú'
      },
      {
        id: 'LT002',
        bookingId: 'DP005',
        customerId: 'KH005',
        guestName: 'Lê Hoàng Nam',
        phone: '0977889900',
        idCard: '001095023110',
        roomId: 'P001',
        expectedCheckIn: '2026-11-18 14:00',
        actualCheckIn: '2026-11-18T10:30',
        expectedCheckOut: '2026-11-19 12:00',
        actualCheckOut: '',
        earlySurcharge: 700000,
        lateSurcharge: 0,
        staffName: 'Trần Hoàng Hải',
        note: 'Khách check-in sớm lúc 10:30',
        status: 'Đang lưu trú'
      },
      {
        id: 'LT003',
        bookingId: 'DP006',
        customerId: 'KH006',
        guestName: 'Trương Mỹ Linh',
        phone: '0945667788',
        idCard: '079194008321',
        roomId: 'P011',
        expectedCheckIn: '2026-11-14 14:00',
        actualCheckIn: '2026-11-14T14:00',
        expectedCheckOut: '2026-11-16 12:00',
        actualCheckOut: '2026-11-16T11:45',
        earlySurcharge: 0,
        lateSurcharge: 0,
        staffName: 'Nguyễn Thị Lệ Quyên',
        note: 'Đã trả phòng & thanh toán',
        status: 'Đã trả phòng'
      }
    ],
    staff: [
      { id: 'NV-001', name: 'Nguyễn Thị Lệ Quyên', role: 'Quản lý khách sạn (General Manager)', department: 'Ban Quản Lý', shift: 'Hành chính (08:00 - 17:00)', phone: '0868 588 824', email: 'novara.hotel@gmail.com', status: 'Đang làm việc' },
      { id: 'NV-002', name: 'Trần Hoàng Hải', role: 'Trưởng bộ phận Lễ tân (Front Office)', department: 'Lễ tân 24/7', shift: 'Ca sáng (06:00 - 14:00)', phone: '0914 225 678', email: 'hai.tran@velorahotel.vn', status: 'Đang làm việc' },
      { id: 'NV-003', name: 'Phạm Ngọc Nhi', role: 'Chuyên viên Lễ tân & Đặt phòng', department: 'Lễ tân 24/7', shift: 'Ca chiều (14:00 - 22:00)', phone: '0988 312 456', email: 'nhi.pham@velorahotel.vn', status: 'Đang làm việc' },
      { id: 'NV-004', name: 'Lý A Tùng', role: 'Lễ tân trực đêm & Hỗ trợ Tour', department: 'Lễ tân 24/7', shift: 'Ca đêm (22:00 - 06:00)', phone: '0973 551 890', email: 'tung.ly@velorahotel.vn', status: 'Đang làm việc' },
      { id: 'NV-005', name: 'Giàng Thị Mỷ', role: 'Kỹ thuật viên Spa & Tắm lá thuốc Dao đỏ', department: 'Spa & Hồ bơi', shift: 'Ca Spa (10:00 - 22:00)', phone: '0965 443 219', email: 'my.giang@velorahotel.vn', status: 'Đang làm việc' },
      { id: 'NV-006', name: 'Hoàng Văn Bách', role: 'Tổ trưởng Buồng phòng & Giặt ủi', department: 'Buồng phòng', shift: 'Ca sáng (07:00 - 15:00)', phone: '0932 887 112', email: 'bach.hoang@velorahotel.vn', status: 'Đang làm việc' },
      { id: 'NV-007', name: 'Vũ Đức Thịnh', role: 'Tài xế đưa đón tuyến Ga Lào Cai – Sa Pa', department: 'Vận chuyển & An ninh', shift: 'Linh hoạt theo lịch tàu', phone: '0904 776 543', email: 'thinh.vu@velorahotel.vn', status: 'Đang làm việc' },
      { id: 'NV-008', name: 'Lê Thanh Tâm', role: 'Bếp trưởng Buffet sáng (06:30 - 10:30)', department: 'Nhà hàng & Bếp', shift: 'Ca sáng (05:30 - 13:30)', phone: '0946 998 123', email: 'tam.le@velorahotel.vn', status: 'Đang làm việc' }
    ]
  };
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let state = loadState();
let currentView = 'dashboard';
let roomViewMode = 'grid'; // 'grid' | 'table'
let pricingSubTab = 'surcharges'; // 'surcharges' | 'services' | 'policies'

const ICON_EDIT = `<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
const ICON_STOP = `<svg viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;
const ICON_PLAY = `<svg viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_CHECK = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;

function generateNextInvoiceId() {
  let maxNum = 0;
  (state.invoices || []).forEach(inv => {
    const m = String(inv.id).match(/^HD(\d+)$/i);
    if (m) {
      const n = Number(m[1]);
      if (n > maxNum) maxNum = n;
    }
  });
  return 'HD' + String(maxNum + 1).padStart(3, '0');
}

function generateNextCheckinId() {
  let maxNum = 0;
  (state.checkins || []).forEach(ci => {
    const m = String(ci.id).match(/^(?:LT|NP)(\d+)$/i);
    if (m) {
      const n = Number(m[1]);
      if (n > maxNum) maxNum = n;
    }
  });
  return 'LT' + String(maxNum + 1).padStart(3, '0');
}

function generateNextCategoryId() {
  let maxNum = 0;
  state.roomCategories.forEach(c => {
    const m = String(c.id).match(/^HP(\d+)$/i);
    if (m) {
      const n = Number(m[1]);
      if (n > maxNum) maxNum = n;
    }
  });
  return 'HP' + String(maxNum + 1).padStart(3, '0');
}

function generateNextRoomId() {
  let maxNum = 0;
  state.rooms.forEach(r => {
    const m = String(r.id).match(/^P(\d+)$/i);
    if (m) {
      const n = Number(m[1]);
      if (n > maxNum) maxNum = n;
    }
  });
  return 'P' + String(maxNum + 1).padStart(3, '0');
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const idMap = { 'CAT-SUP': 'HP001', 'CAT-DLX': 'HP002', 'CAT-FAM': 'HP003', 'CAT-EXE': 'HP004' };
      const roomIdMap = {};
      let migrated = false;
      (parsed.roomCategories || []).forEach(c => {
        if (idMap[c.id]) { c.id = idMap[c.id]; migrated = true; }
      });
      // Chuyển mã phòng cũ dạng P201..P910 sang P001..P080
      const hasLegacyRoomCodes = (parsed.rooms || []).some(r => /^P[2-9]\d{2}$/.test(r.id)) &&
                                 !(parsed.rooms || []).some(r => r.id === 'P001');
      (parsed.rooms || []).forEach((r, idx) => {
        if (idMap[r.categoryId]) { r.categoryId = idMap[r.categoryId]; migrated = true; }
        if (!r.name) { r.name = 'Phòng ' + String(r.id).replace(/^P/i, ''); migrated = true; }
        if (hasLegacyRoomCodes) {
          const newRoomId = 'P' + String(idx + 1).padStart(3, '0');
          roomIdMap[r.id] = newRoomId;
          r.id = newRoomId;
          migrated = true;
        }
      });
      (parsed.bookings || []).forEach((b, idx) => {
        if (idMap[b.categoryId]) { b.categoryId = idMap[b.categoryId]; migrated = true; }
        if (roomIdMap[b.roomId]) { b.roomId = roomIdMap[b.roomId]; migrated = true; }
        if (/^BK-\d{4}-(\d+)$/.test(b.id)) {
          const oldId = b.id;
          b.id = 'DP' + oldId.split('-').pop().padStart(3, '0');
          (parsed.invoices || []).forEach(inv => {
            if (inv.bookingId === oldId) inv.bookingId = b.id;
          });
          migrated = true;
        }
        if (b.childrenTotal === undefined) {
          b.childrenTotal = (Number(b.children6to11) || 0) + (Number(b.childrenUnder6) || 0);
          migrated = true;
        }
        if (!b.customerId) { b.customerId = 'KH' + String(idx + 1).padStart(3, '0'); migrated = true; }
        if (!b.bookingTime) { b.bookingTime = (b.checkIn || '2026-11-15') + ' 09:00'; migrated = true; }
        const stMap = {
          'Chờ đặt cọc': 'Chưa xác nhận',
          'Chờ xác nhận': 'Chưa xác nhận',
          'Đã xác nhận (Đã cọc 50%)': 'Đã xác nhận',
          'Đang xử lý': 'Đã xác nhận',
          'Đã trả phòng': 'Hoàn thành'
        };
        if (stMap[b.status]) { b.status = stMap[b.status]; migrated = true; }
        if (b.depositPaid === undefined) {
          b.depositPaid = (b.status === 'Đã xác nhận' || b.status === 'Đang lưu trú' || b.status === 'Hoàn thành');
          migrated = true;
        }
        if (b.checkedOutPaid === undefined) {
          b.checkedOutPaid = (b.status === 'Hoàn thành');
          migrated = true;
        }
        if (!Array.isArray(b.items)) {
          const cat = (parsed.roomCategories || []).find(c => c.id === b.categoryId);
          b.items = [{ categoryId: b.categoryId || 'HP001', qty: 1, unitPrice: cat ? cat.price : 1400000 }];
          migrated = true;
        }
      });
      if (!Array.isArray(parsed.serviceGroups)) {
        parsed.serviceGroups = [
          { id: 'NDV001', name: 'Spa', note: 'Mở cửa 10:00 - 22:00, nên đặt trước', status: 'Đang kinh doanh' },
          { id: 'NDV002', name: 'Giặt ủi', note: 'Nhận trước 9:00 trả trong ngày; sau 9:00 trả hôm sau', status: 'Đang kinh doanh' },
          { id: 'NDV003', name: 'Đưa đón', note: 'Xe riêng, đặt trước ít nhất 12 giờ', status: 'Đang kinh doanh' },
          { id: 'NDV004', name: 'Tour tham quan', note: 'Tour khám phá Sa Pa & Fansipan', status: 'Đang kinh doanh' },
          { id: 'NDV005', name: 'Phí phạt vi phạm', note: 'Áp dụng theo quy định chung khách sạn', status: 'Đang kinh doanh' }
        ];
        migrated = true;
      }
      (parsed.services || []).forEach((s, idx) => {
        if (/^SRV-/.test(s.id)) { s.id = 'DV' + String(idx + 1).padStart(3, '0'); migrated = true; }
        if (!s.status) { s.status = 'Đang kinh doanh'; migrated = true; }
        if (!s.groupId) {
          const gText = (s.group || '').toLowerCase();
          if (gText.includes('spa')) s.groupId = 'NDV001';
          else if (gText.includes('giặt')) s.groupId = 'NDV002';
          else if (gText.includes('đưa đón')) s.groupId = 'NDV003';
          else if (gText.includes('tour')) s.groupId = 'NDV004';
          else s.groupId = 'NDV005';
          const grp = parsed.serviceGroups.find(g => g.id === s.groupId);
          if (grp) s.group = grp.name;
          migrated = true;
        }
      });
      if (!Array.isArray(parsed.customers)) {
        const custMap = new Map();
        (parsed.bookings || []).forEach((b, idx) => {
          const cid = b.customerId || ('KH' + String(idx + 1).padStart(3, '0'));
          if (!custMap.has(cid)) {
            custMap.set(cid, {
              id: cid,
              name: b.guestName || '',
              phone: b.phone || '',
              email: b.email || '',
              idCard: b.idCard || '',
              note: '',
              status: 'Đang hoạt động'
            });
          }
        });
        parsed.customers = Array.from(custMap.values());
        migrated = true;
      }
      (parsed.invoices || []).forEach((inv, idx) => {
        if (roomIdMap[inv.roomId]) { inv.roomId = roomIdMap[inv.roomId]; migrated = true; }
        if (/^INV-\d{4}-(\d+)$/.test(inv.id)) {
          inv.id = 'HD' + inv.id.split('-').pop().padStart(3, '0');
          migrated = true;
        }
        if (!inv.customerId) {
          const matchedBk = (parsed.bookings || []).find(b => b.id === inv.bookingId);
          inv.customerId = matchedBk ? (matchedBk.customerId || '') : ('KH' + String(idx + 1).padStart(3, '0'));
          migrated = true;
        }
        if (!inv.createdTime) {
          inv.createdTime = (inv.createdDate || '2026-11-17') + ' 12:00';
          migrated = true;
        }
      });
      if (!Array.isArray(parsed.checkins)) {
        parsed.checkins = [
          {
            id: 'LT001',
            bookingId: 'DP002',
            customerId: 'KH002',
            guestName: 'Michael Anderson',
            phone: '0987654321',
            idCard: 'P88492011',
            roomId: 'P011',
            expectedCheckIn: '2026-11-15 14:00',
            actualCheckIn: '2026-11-15T14:20',
            expectedCheckOut: '2026-11-18 12:00',
            earlySurcharge: 0,
            note: 'Khách nhận đúng giờ quy định',
            status: 'Đang lưu trú'
          },
          {
            id: 'LT002',
            bookingId: 'DP003',
            customerId: 'KH003',
            guestName: 'Đặng Quốc Khánh',
            phone: '0903456789',
            idCard: '034088009214',
            roomId: 'P051',
            expectedCheckIn: '2026-11-16 14:00',
            actualCheckIn: '2026-11-16T11:30',
            expectedCheckOut: '2026-11-19 12:00',
            earlySurcharge: 0,
            note: 'Khách đến nhận sớm lúc 11:30',
            status: 'Đang lưu trú'
          },
          {
            id: 'LT003',
            bookingId: 'DP007',
            customerId: 'KH007',
            guestName: 'Phan Thanh Sơn',
            phone: '0961234888',
            idCard: '015091004512',
            roomId: 'P019',
            expectedCheckIn: '2026-11-12 14:00',
            actualCheckIn: '2026-11-12T15:00',
            expectedCheckOut: '2026-11-15 12:00',
            earlySurcharge: 0,
            note: 'Đã trả phòng và thanh toán',
            status: 'Đã trả phòng'
          }
        ];
        migrated = true;
      }
      if (!Array.isArray(parsed.amenities)) {
        parsed.amenities = [
          { id: 'TI001', name: 'Điều hòa 2 chiều', note: '', status: 'Đang kinh doanh' },
          { id: 'TI002', name: 'TV', note: '', status: 'Đang kinh doanh' },
          { id: 'TI003', name: 'Wifi', note: '', status: 'Đang kinh doanh' },
          { id: 'TI004', name: 'Minibar', note: '', status: 'Đang kinh doanh' },
          { id: 'TI005', name: 'Két sắt', note: '', status: 'Đang kinh doanh' },
          { id: 'TI006', name: 'Vòi sen', note: '', status: 'Đang kinh doanh' },
          { id: 'TI007', name: 'Hướng phố', note: '', status: 'Đang kinh doanh' },
          { id: 'TI008', name: 'Cửa sổ lớn nhìn núi', note: '', status: 'Đang kinh doanh' },
          { id: 'TI009', name: 'Bàn làm việc', note: '', status: 'Đang kinh doanh' },
          { id: 'TI010', name: 'Máy pha cà phê', note: '', status: 'Đang kinh doanh' },
          { id: 'TI011', name: 'Phòng khách nhỏ', note: '', status: 'Đang kinh doanh' },
          { id: 'TI012', name: 'Bồn tắm', note: '', status: 'Đang kinh doanh' },
          { id: 'TI013', name: 'Đồ dùng trẻ em', note: '', status: 'Đang kinh doanh' },
          { id: 'TI014', name: 'Tủ lạnh lớn', note: '', status: 'Đang kinh doanh' },
          { id: 'TI015', name: 'Phòng khách riêng', note: '', status: 'Đang kinh doanh' },
          { id: 'TI016', name: 'Bồn tắm nằm', note: '', status: 'Đang kinh doanh' },
          { id: 'TI017', name: 'Ban công view núi', note: '', status: 'Đang kinh doanh' },
          { id: 'TI018', name: 'Ưu tiên nhận/trả phòng', note: '', status: 'Đang kinh doanh' }
        ];
        migrated = true;
      }
      if (!Array.isArray(parsed.amenityGroups)) {
        parsed.amenityGroups = [
          { id: 'NTI001', name: 'Tiện nghi cơ bản' },
          { id: 'NTI002', name: 'Công nghệ & Giải trí' },
          { id: 'NTI003', name: 'Phòng tắm' },
          { id: 'NTI004', name: 'Không gian & View' },
          { id: 'NTI005', name: 'Tiện ích gia đình & VIP' }
        ];
        migrated = true;
      }
      if (!Array.isArray(parsed.pricePlans)) {
        parsed.pricePlans = [
          { id: 'BG001', categoryId: 'HP001', startDate: '2026-01-01', endDate: '2026-12-31', price: 1400000, note: 'Giá niêm yết chuẩn 2026' },
          { id: 'BG002', categoryId: 'HP002', startDate: '2026-01-01', endDate: '2026-12-31', price: 1850000, note: 'Giá niêm yết chuẩn 2026' },
          { id: 'BG003', categoryId: 'HP003', startDate: '2026-01-01', endDate: '2026-12-31', price: 2650000, note: 'Giá niêm yết chuẩn 2026' },
          { id: 'BG004', categoryId: 'HP004', startDate: '2026-01-01', endDate: '2026-12-31', price: 3800000, note: 'Giá niêm yết chuẩn 2026' }
        ];
        migrated = true;
      }
      if (!Array.isArray(parsed.bookingHistory)) {
        parsed.bookingHistory = [];
      }
      if (!Array.isArray(parsed.pendingHistoryLogs)) {
        parsed.pendingHistoryLogs = [];
      }
      if (migrated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Không đọc được localStorage, dùng dữ liệu mặc định:', e);
  }
  const initial = getDefaultData();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch (e) {
    console.warn('Không lưu được localStorage:', e);
  }
  return initial;
}

let currentAdminUser = { id: 'NV-001', name: 'admin', role: 'Quản trị viên' };

function saveState(newState) {
  const target = newState || (typeof state !== 'undefined' ? state : null);
  if (!target) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(target));
  } catch (e) {
    console.warn('Không lưu được localStorage:', e);
  }
  updateSidebarCounters(target);
  // Điểm mở rộng: gọi API backend ngoài tại đây nếu tích hợp đồng bộ dữ liệu
}

function getCategoryEffectivePrice(catId, dateStr = null) {
  const cat = getCategoryById(catId);
  const basePrice = cat ? (Number(cat.price) || 1400000) : 1400000;
  if (!dateStr || !Array.isArray(state.pricePlans)) return basePrice;
  const matched = state.pricePlans.filter(p =>
    (p.status || 'Đang áp dụng') === 'Đang áp dụng' &&
    p.categoryId === catId &&
    p.startDate &&
    dateStr >= p.startDate &&
    (!p.endDate || dateStr <= p.endDate)
  );
  if (matched.length === 0) return basePrice;
  // Ưu tiên bảng giá có khoảng thời gian hẹp nhất (mùa cao điểm / khuyến mãi)
  matched.sort((a, b) => (a.endDate ? 0 : 1) - (b.endDate ? 0 : 1) || (b.startDate > a.startDate ? 1 : -1));
  return Number(matched[0].price) || basePrice;
}

function recordBookingHistory(bookingId, changeType, oldValue = '', newValue = '') {
  if (!bookingId) return;
  const now = new Date();
  const changedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const entry = { bookingId, changeType, oldValue: String(oldValue), newValue: String(newValue), changedAt };
  if (!Array.isArray(state.bookingHistory)) state.bookingHistory = [];
  if (!Array.isArray(state.pendingHistoryLogs)) state.pendingHistoryLogs = [];
  state.bookingHistory.unshift(entry);
  state.pendingHistoryLogs.push(entry);
}

function updateSidebarCounters(targetState) {
  const st = targetState || (typeof state !== 'undefined' ? state : null);
  if (!st) return;
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setTxt('navCountCategories', (st.roomCategories || []).length);
  setTxt('navCountPricePlans', (st.pricePlans || []).length);
  setTxt('navCountRooms', (st.rooms || []).length);
  setTxt('navCountAmenityGroups', (st.amenityGroups || []).length);
  setTxt('navCountAmenities', (st.amenities || []).length);
  setTxt('navCountServices', (st.services || []).length);
  setTxt('navCountBookings', (st.bookings || []).length);
  setTxt('navCountInvoices', (st.invoices || []).length);
  setTxt('navCountCustomers', (st.customers || []).length);
  setTxt('navCountAdmins', (st.staff || []).length);
}

function getCategoryById(catId) {
  return state.roomCategories.find(c => c.id === catId) || state.roomCategories[0];
}

// ============================================================================
// 1. XỬ LÝ ĐĂNG NHẬP (TÀI KHOẢN: admin / MẬT KHẨU: 123)
// ============================================================================
function initAuth() {
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    loginError.classList.add('hidden');

    // 1. Nếu nhập dạng email -> Xác thực qua Supabase Auth
    if (user.includes('@') && typeof supabaseClient !== 'undefined') {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: user,
        password: pass
      });

      if (!error && data.user) {
        currentAdminUser = {
          id: data.user.id,
          name: data.user.email,
          role: 'Quản trị viên'
        };
        const disp = document.getElementById('currentUserDisplay');
        if (disp) disp.textContent = currentAdminUser.name;

        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appLayout').classList.remove('hidden');
        switchView('dashboard');
        return;
      } else {
        console.error('Lỗi Supabase Auth:', error?.message);
        loginError.classList.remove('hidden');
        return;
      }
    }

    // 2. Dự phòng đăng nhập cục bộ (admin / 123 hoặc nhân viên trong state.staff)
    const matchedAdmin = (state.staff || []).find(s =>
      s.email && s.email.toLowerCase() === user.toLowerCase() && (s.password || '123') === pass
    );

    if ((user === 'admin' && pass === '123') || matchedAdmin) {
      currentAdminUser = matchedAdmin
        ? { id: matchedAdmin.id, name: matchedAdmin.name, role: matchedAdmin.role }
        : { id: 'NV-001', name: 'admin', role: 'Quản trị viên' };
      const disp = document.getElementById('currentUserDisplay');
      if (disp) disp.textContent = currentAdminUser.name;

      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('appLayout').classList.remove('hidden');
      switchView('dashboard');
    } else {
      loginError.classList.remove('hidden');
    }
  });

  logoutBtn.addEventListener('click', async () => {
    if (typeof supabaseClient !== 'undefined') {
      await supabaseClient.auth.signOut();
    }
    document.getElementById('appLayout').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    passwordInput.value = '';
    loginError.classList.add('hidden');
  });

  document.getElementById('resetDemoDataBtn').addEventListener('click', () => {
    if (confirm('Khôi phục toàn bộ dữ liệu về mặc định chuẩn của Velora Hotel Sa Pa?')) {
      state = getDefaultData();
      saveState(state);
      renderCurrentView();
    }
  });
}

// ============================================================================
// 2. ĐIỀU HƯỚNG SIDEBAR & SUBMENU
// ============================================================================
const VIEW_META = {
  'dashboard': { parent: 'Hệ thống', title: 'Tổng quan khách sạn' },
  'room-categories': { parent: 'Phòng', title: 'Quản lý Loại phòng' },
  'price-plans': { parent: 'Danh mục', title: 'Quản lý Bảng giá' },
  'rooms': { parent: 'Phòng', title: 'Quản lý Phòng' },
  'amenity-groups': { parent: 'Phòng', title: 'Quản lý Nhóm tiện ích' },
  'room-amenities': { parent: 'Phòng', title: 'Quản lý Tiện ích' },
  'services': { parent: 'Danh mục', title: 'Quản lý Dịch vụ' },
  'bookings': { parent: 'Giao dịch', title: 'Quản lý Đặt phòng' },
  'invoices': { parent: 'Giao dịch', title: 'Quản lý Thanh toán' },
  'customers': { parent: 'Danh mục', title: 'Quản lý Khách hàng' },
  'staff': { parent: 'Hệ thống', title: 'Quản lý Quản trị viên' },
  'reports': { parent: 'Báo cáo', title: 'Báo cáo Doanh thu tổng' },
  'report-revenue-total': { parent: 'Báo cáo', title: 'Báo cáo Doanh thu tổng' },
  'report-revenue-service': { parent: 'Báo cáo', title: 'Báo cáo Doanh thu dịch vụ' },
  'report-room-usage': { parent: 'Báo cáo', title: 'Báo cáo Tần suất sử dụng phòng' }
};

function initNavigation() {
  // Toggle nhóm menu có mục nhỏ (Phòng, Giao dịch)
  document.querySelectorAll('.nav-group-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const groupId = btn.getAttribute('data-group');
      const groupEl = document.getElementById(groupId);
      if (groupEl) groupEl.classList.toggle('open');
    });
  });

  // Click vào từng mục điều hướng
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      switchView(targetView);
    });
  });
}

function switchView(viewName) {
  if (viewName === 'reports') {
    switchView('report-revenue-total');
    return;
  }
  if (viewName.startsWith('report-')) {
    activeReportTab = viewName.slice('report-'.length);
    const repGroup = document.getElementById('navGroupReports');
    if (repGroup) repGroup.classList.add('open');
  }
  currentView = viewName;

  // Cập nhật active trên sidebar
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });

  // Cập nhật breadcrumb
  const meta = VIEW_META[viewName] || { parent: 'Hệ thống', title: 'Tổng quan' };
  document.getElementById('breadcrumbParent').textContent = meta.parent;
  document.getElementById('breadcrumbCurrent').textContent = meta.title;

  // Ẩn/hiện section
  const targetSectionId = viewName.startsWith('report-') ? 'view-reports' : `view-${viewName}`;
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('hidden', sec.id !== targetSectionId);
  });

  renderCurrentView();
}

function renderCurrentView() {
  updateSidebarCounters();
  switch (currentView) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'room-categories':
      renderRoomCategories();
      break;
    case 'price-plans':
      renderPricePlans();
      break;
    case 'rooms':
      renderRooms();
      break;
    case 'amenity-groups':
    case 'room-amenities':
      switchView('room-categories');
      return;
    case 'services':
      renderServices();
      break;
    case 'bookings':
      renderBookings();
      break;
    case 'invoices':
      renderInvoices();
      break;
    case 'customers':
      renderCustomers();
      break;
    case 'staff':
      renderStaff();
      break;
    case 'reports':
    case 'report-revenue-total':
    case 'report-revenue-service':
    case 'report-room-usage':
      renderReports();
      break;
  }
}

// ============================================================================
// 3. RENDER VIEW 1: TỔNG QUAN (DASHBOARD)
// ============================================================================
function renderDashboard() {
  const container = document.getElementById('view-dashboard');
  if (!container) return;
  if (typeof syncRoomReservationStates === 'function') syncRoomReservationStates();

  const activeRooms = (state.rooms || []).filter(r => (r.businessStatus || 'Đang kinh doanh') === 'Đang kinh doanh');
  const totalRooms = activeRooms.length || state.rooms.length;
  const occupiedCount = activeRooms.filter(r => r.status === 'Đang ở' || (typeof getOpenStayForRoom === 'function' && getOpenStayForRoom(r.id))).length;
  const reservedCount = activeRooms.filter(r => r.status === 'Đã đặt' && !(typeof getOpenStayForRoom === 'function' && getOpenStayForRoom(r.id))).length;
  const inUseCount = occupiedCount + reservedCount;
  const availableCount = Math.max(0, totalRooms - inUseCount);
  const occupancyRate = totalRooms > 0 ? Math.round((inUseCount / totalRooms) * 100) : 0;

  const allBookings = Array.isArray(state.bookings) ? state.bookings : [];
  const getSt = bk => (typeof getBookingComputedStatus === 'function' ? getBookingComputedStatus(bk) : (bk.status || 'Chưa xác nhận'));

  const knownSources = ['Trực tiếp tại quầy', 'Website', 'Booking.com', 'Hotline / Zalo', 'Agoda', 'Traveloka'];
  const sourceStats = {};
  knownSources.forEach(s => { sourceStats[s] = { count: 0, revenue: 0 }; });

  let nonCancelledCount = 0;
  let cancelledCount = 0;
  let totalBookingRevenue = 0;
  let totalCollectedDeposit = 0;
  let depositedOrdersCount = 0;

  allBookings.forEach(bk => {
    const st = getSt(bk);
    const src = bk.source || 'Trực tiếp tại quầy';
    if (!sourceStats[src]) sourceStats[src] = { count: 0, revenue: 0 };
    sourceStats[src].count++;
    if (st !== 'Đã hủy') {
      nonCancelledCount++;
      const val = Number(bk.totalAmount) || Number(bk.roomTotal) || 0;
      totalBookingRevenue += val;
      sourceStats[src].revenue += val;
    } else {
      cancelledCount++;
    }
    if (bk.depositPaid) {
      depositedOrdersCount++;
      totalCollectedDeposit += Number(bk.depositAmount) || 0;
    }
  });

  const totalInvoiceRevenue = (state.invoices || []).reduce((sum, inv) => sum + (Number(inv.totalBeforeDeposit) || 0), 0);
  const cancelRate = allBookings.length > 0 ? Math.round((cancelledCount / allBookings.length) * 100) : 0;

  // Dữ liệu biểu đồ cột theo nguồn đặt phòng
  const sourceEntries = Object.entries(sourceStats)
    .filter(([src, info]) => knownSources.includes(src) || info.count > 0)
    .sort((a, b) => b[1].count - a[1].count);
  const maxSourceCount = Math.max(...sourceEntries.map(([, info]) => info.count), 1);
  const sourceBarPalette = [
    { fill: '#459c72', text: '#164d32' },
    { fill: '#c48d57', text: '#6a3e16' },
    { fill: '#4f9fb1', text: '#164f5b' },
    { fill: '#d2a24c', text: '#6e4d0e' },
    { fill: '#c8718b', text: '#6e2339' },
    { fill: '#71a85c', text: '#2f5721' }
  ];

  // Dữ liệu tỷ lệ lấp đầy theo hạng phòng + biểu đồ tròn tổng thể
  const catColors = ['#3b8b64', '#b9834e', '#4c8fc2', '#8f72cf', '#56a6b0', '#c77a8f'];
  const categoryStats = (state.roomCategories || []).map((cat, idx) => {
    const roomsOfCat = activeRooms.filter(r => r.categoryId === cat.id);
    const catInUse = roomsOfCat.filter(r =>
      r.status === 'Đang ở' ||
      r.status === 'Đã đặt' ||
      (typeof getOpenStayForRoom === 'function' && getOpenStayForRoom(r.id))
    ).length;
    const occPct = roomsOfCat.length > 0 ? Math.round((catInUse / roomsOfCat.length) * 100) : 0;
    return {
      name: cat.name,
      inUse: catInUse,
      total: roomsOfCat.length,
      occPct,
      color: catColors[idx % catColors.length]
    };
  });

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const totalCategoryFilled = categoryStats.reduce((s, c) => s + c.inUse, 0);
  let cumulativeDash = 0;
  const categoryArcs = categoryStats.map(c => {
    const sharePct = totalCategoryFilled > 0 ? Math.round((c.inUse / totalCategoryFilled) * 100) : 0;
    const dashLen = totalCategoryFilled > 0 ? (c.inUse / totalCategoryFilled) * circumference : 0;
    const offset = -cumulativeDash;
    cumulativeDash += dashLen;
    return { ...c, sharePct, dashLen, offset };
  });

  container.innerHTML = `
    <!-- 4 thẻ KPI chính: Số đơn, Doanh thu, Tỷ lệ lấp đầy, Tiền cọc -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-mint">
        <div class="kpi-label">Tổng số đơn đặt phòng</div>
        <div class="kpi-value">${allBookings.length} đơn</div>
        <div class="kpi-sub">Hiệu lực: <strong>${nonCancelledCount}</strong> &bull; Hủy: <strong>${cancelledCount}</strong> (${cancelRate}%)</div>
      </div>

      <div class="kpi-card kpi-sky">
        <div class="kpi-label">Tổng doanh thu đặt phòng</div>
        <div class="kpi-value">${formatVND(totalBookingRevenue)}</div>
        <div class="kpi-sub">Đã xuất HĐ: <strong>${formatVND(totalInvoiceRevenue)}</strong> (${(state.invoices || []).length} HĐ)</div>
      </div>

      <div class="kpi-card kpi-lavender">
        <div class="kpi-label">Tỷ lệ lấp đầy phòng</div>
        <div class="kpi-value">${occupancyRate}%</div>
        <div class="kpi-sub">Công suất bình quân toàn khách sạn</div>
      </div>

      <div class="kpi-card kpi-peach">
        <div class="kpi-label">Tiền cọc đã thu (50%)</div>
        <div class="kpi-value">${formatVND(totalCollectedDeposit)}</div>
        <div class="kpi-sub">${depositedOrdersCount} đơn đã đặt cọc</div>
      </div>
    </div>

    <!-- Biểu đồ cột Số đơn theo nguồn & Biểu đồ tròn Tỷ lệ lấp đầy -->
    <div class="grid-2">
      <div class="card dash-card-mint" style="margin-bottom:0; display:flex; flex-direction:column;">
        <div class="card-header">
          <div>
            <div class="card-title">Thống kê Số đơn theo nguồn</div>
            <div class="card-subtitle">Tổng ${allBookings.length} đơn phân bổ theo kênh đặt phòng</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="switchView('bookings')">Quản lý đơn →</button>
        </div>
        <div class="card-body" style="flex:1; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="dash-col-chart">
            ${sourceEntries.map(([src, info], idx) => {
              const pal = sourceBarPalette[idx % sourceBarPalette.length];
              const barPct = info.count > 0 ? Math.max(10, Math.round((info.count / maxSourceCount) * 100)) : 2;
              const barBg = info.count > 0 ? pal.fill : '#e5e7eb';
              return `
                <div class="dash-col-item" title="${src}: ${info.count} đơn • Doanh thu hiệu lực: ${formatVND(info.revenue)}">
                  <div class="dash-col-val" style="color:${info.count > 0 ? pal.text : 'var(--text-light)'};">${info.count} đơn</div>
                  <div class="dash-col-bar" style="height:${barPct}%; background:${barBg};"></div>
                  <div class="dash-col-label">${src}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="card dash-card-lavender" style="margin-bottom:0; display:flex; flex-direction:column;">
        <div class="card-header">
          <div>
            <div class="card-title">Tần suất sử dụng phòng</div>
            <div class="card-subtitle">Phân bổ tỷ lệ lấp đầy theo từng loại phòng</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="switchView('rooms')">Xem phòng →</button>
        </div>
        <div class="card-body" style="flex:1; display:flex; align-items:center;">
          <div class="dash-donut-wrap" style="width:100%;">
            <svg class="dash-donut-svg" viewBox="0 0 176 176">
              <circle cx="88" cy="88" r="${radius}" fill="none" stroke="#e9edf5" stroke-width="22"></circle>
              ${categoryArcs.map(a => a.dashLen > 0 ? `
                <circle cx="88" cy="88" r="${radius}" fill="none" stroke="${a.color}" stroke-width="22"
                  stroke-dasharray="${a.dashLen} ${circumference}"
                  stroke-dashoffset="${a.offset}"
                  transform="rotate(-90 88 88)">
                  <title>${a.name}: ${a.occPct}%</title>
                </circle>
              ` : '').join('')}
              <text x="88" y="83" text-anchor="middle" font-size="27" font-weight="700" fill="#4d2f8e">${occupancyRate}%</text>
              <text x="88" y="104" text-anchor="middle" font-size="11.5" fill="#64748b">Tần suất</text>
            </svg>
            <div class="dash-legend-list">
              ${categoryArcs.map(a => `
                <div class="dash-legend-row">
                  <span><span class="dash-legend-dot" style="background:${a.color};"></span>${a.name}</span>
                  <strong>${a.occPct}%</strong>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// 4. RENDER VIEW 2.1: PHÒNG -> HẠNG PHÒNG
// ============================================================================
let selectedCategoryId = null;

function ensureCategoryDefaults(cat) {
  if (!cat.status) cat.status = 'Đang kinh doanh';
  if (cat.vatPercent === undefined) cat.vatPercent = 8;
  if (cat.autoOvertime === undefined) cat.autoOvertime = true;
  if (!cat.overtimeCalcType) cat.overtimeCalcType = 'percent'; // 'percent' | 'fixed'
  if (!Array.isArray(cat.earlyCheckInRules)) {
    cat.earlyCheckInRules = [
      { hours: 1, fee: 50 },
      { hours: 6, fee: 100 }
    ];
  }
  if (!Array.isArray(cat.lateCheckOutRules)) {
    cat.lateCheckOutRules = [
      { hours: 1, fee: 50 },
      { hours: 6, fee: 100 }
    ];
  }
  if (cat.stdAdults === undefined) cat.stdAdults = 2;
  if (cat.stdChildren === undefined) cat.stdChildren = cat.id === 'HP003' ? 2 : 1;
  if (cat.maxAdults === undefined) cat.maxAdults = Number(cat.stdAdults) || 2;
  if (cat.maxExtraBed === undefined) {
    cat.maxExtraBed = cat.maxAdultsLimit !== undefined
      ? Math.max(0, Number(cat.maxAdultsLimit) - (Number(cat.stdAdults) || 2))
      : 1;
  }
  cat.maxAdultsLimit = (Number(cat.stdAdults) || 2) + (cat.autoExtraGuest !== false ? Math.max(0, Number(cat.maxExtraBed) || 0) : 0);
  if (cat.maxChildren === undefined) cat.maxChildren = cat.id === 'HP003' ? 2 : 1;

  if (cat.autoExtraGuest === undefined) cat.autoExtraGuest = true;
  if (cat.extraAdultFee === undefined) cat.extraAdultFee = 200000;
  if (cat.extraChildFee === undefined) cat.extraChildFee = 100000;

  if (!cat.overtimeSurcharge) {
    cat.overtimeSurcharge = formatOvertimeSummary(cat);
  }
  if (!cat.extraGuestSurcharge) {
    cat.extraGuestSurcharge = `Người lớn: ${formatVND(cat.extraAdultFee)}/người/ngày; Trẻ em (6-11 tuổi): ${formatVND(cat.extraChildFee)}/người/ngày (Trẻ <6 tuổi miễn phí).`;
  }
  if (!cat.description) {
    cat.description = `Phòng ${cat.area || 25} m², ${cat.beds || ''}. Giá đã bao gồm VAT, phí dịch vụ và buffet sáng.`;
  }
  if (!Array.isArray(cat.images)) cat.images = [];
  if (!Array.isArray(cat.amenitiesList)) {
    cat.amenitiesList = (cat.amenities || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  return cat;
}

function formatOvertimeSummary(cat) {
  if (!cat.autoOvertime) return 'Không tự động tính phụ thu';
  const unit = cat.overtimeCalcType === 'fixed' ? 'đ' : '%';
  const early = (cat.earlyCheckInRules || []).map(r => `từ ${r.hours} giờ (${r.fee}${unit})`).join(', ');
  const late = (cat.lateCheckOutRules || []).map(r => `từ ${r.hours} giờ (${r.fee}${unit})`).join(', ');
  return `Nhận sớm ${early || 'theo quy định'}; Trả muộn ${late || 'theo quy định'}`;
}

let categoryStatusTab = 'Đang kinh doanh';

function setCategoryStatusTab(tab) {
  categoryStatusTab = tab;
  renderRoomCategories();
}

function toggleCategoryStatus(catId) {
  const cat = state.roomCategories.find(c => c.id === catId);
  if (!cat) return;
  const current = cat.status || 'Đang kinh doanh';
  cat.status = current === 'Đang kinh doanh' ? 'Ngừng kinh doanh' : 'Đang kinh doanh';
  saveState();
  renderRoomCategories();
}

function renderRoomCategories() {
  const container = document.getElementById('view-room-categories');
  const allCats = state.roomCategories.map(c => ensureCategoryDefaults(c));
  const activeCount = allCats.filter(c => c.status === 'Đang kinh doanh').length;
  const stoppedCount = allCats.filter(c => c.status === 'Ngừng kinh doanh').length;
  const filteredCats = allCats.filter(c => c.status === categoryStatusTab);

  container.innerHTML = `
    <div class="toolbar">
      <div class="sub-tabs" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">
        <button type="button" class="sub-tab-btn ${categoryStatusTab === 'Đang kinh doanh' ? 'active' : ''}" onclick="setCategoryStatusTab('Đang kinh doanh')">
          Đang kinh doanh (${activeCount})
        </button>
        <button type="button" class="sub-tab-btn ${categoryStatusTab === 'Ngừng kinh doanh' ? 'active' : ''}" onclick="setCategoryStatusTab('Ngừng kinh doanh')">
          Ngừng kinh doanh (${stoppedCount})
        </button>
      </div>
      <button class="btn btn-primary" onclick="openCategoryModal()">+ Thêm Hạng phòng</button>
    </div>

    <div class="card">
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên loại phòng</th>
                <th>Diện tích</th>
                <th>Loại giường</th>
                <th>Sức chứa (Tối đa)</th>
                <th>Giá cơ sở</th>
                <th style="width: 96px; text-align: center;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${filteredCats.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">
                    Không có loại phòng nào ở mục ${categoryStatusTab}.
                  </td>
                </tr>
              ` : filteredCats.map(cat => {
                const c = ensureCategoryDefaults(cat);
                const isActive = c.status === 'Đang kinh doanh';

                return `
                  <tr>
                    <td><strong>${c.id}</strong></td>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.area || 25} m²</td>
                    <td>${c.beds || '-'}</td>
                    <td>${c.stdAdults} NL / ${c.stdChildren} TE</td>
                    <td><strong>${formatVND(c.price)}</strong> / đêm</td>
                    <td style="text-align: center;">
                      <div style="display: inline-flex; gap: 6px; align-items: center;">
                        <button class="btn btn-outline btn-icon" title="Chỉnh sửa" onclick="openCategoryModal('${c.id}')">${ICON_EDIT}</button>
                        <button class="btn ${isActive ? 'btn-danger' : 'btn-wood'} btn-icon" title="${isActive ? 'Ngừng kinh doanh' : 'Mở kinh doanh lại'}" onclick="toggleCategoryStatus('${c.id}')">${isActive ? ICON_STOP : ICON_PLAY}</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function openCategoryModal(catId = null) {
  const existing = catId ? ensureCategoryDefaults(state.roomCategories.find(c => c.id === catId)) : null;

  let draftImages = existing ? [...existing.images] : [];
  let draftAmenities = existing ? [...existing.amenitiesList] : ['Điều hòa 2 chiều', 'TV', 'Wifi', 'Minibar', 'Két sắt'];
  let draftEarlyRules = existing ? existing.earlyCheckInRules.map(r => ({ ...r })) : [{ hours: 1, fee: 50 }, { hours: 6, fee: 100 }];
  let draftLateRules = existing ? existing.lateCheckOutRules.map(r => ({ ...r })) : [{ hours: 1, fee: 50 }, { hours: 6, fee: 100 }];
  let draftAmenityQtyMap = existing && existing.amenityQtyMap ? { ...existing.amenityQtyMap } : {};
  let draftPricePlans = existing
    ? (state.pricePlans || []).filter(p => p.categoryId === existing.id && (p.status || 'Đang áp dụng') === 'Đang áp dụng').map(p => ({ ...p }))
    : [];
  let activeEditTab = 'info';
  let roomFilterInModal = '';
  let roomBizTabInModal = 'Đang kinh doanh';

  let formErrorMsg = '';
  let invalidFields = [];

  const tempValues = {
    name: existing ? existing.name : '',
    id: existing ? existing.id : generateNextCategoryId(),
    area: existing ? (existing.area || 25) : 25,
    beds: existing ? (existing.beds || '1 giường đôi') : '1 giường đôi',
    childAgeNote: existing ? (existing.childAgeNote || 'Dưới 6 tuổi miễn phí; 6-11 tuổi 100.000đ/đêm') : 'Dưới 6 tuổi miễn phí; 6-11 tuổi 100.000đ/đêm',
    price: existing ? existing.price : '',
    autoOvertime: existing ? existing.autoOvertime : true,
    overtimeCalcType: 'percent',
    applyOvertimeOthers: false,
    stdAdults: existing ? existing.stdAdults : 2,
    stdChildren: existing ? existing.stdChildren : 1,
    maxExtraBed: existing ? (existing.maxExtraBed !== undefined ? Number(existing.maxExtraBed) : Math.max(0, (existing.maxAdultsLimit || 3) - (existing.stdAdults || 2))) : 1,
    maxAdultsLimit: existing ? (existing.maxAdultsLimit || ((existing.stdAdults || 2) + 1)) : 3,
    autoExtraGuest: existing ? existing.autoExtraGuest : true,
    extraAdultFee: existing ? existing.extraAdultFee : 200000,
    extraChildFee: existing ? existing.extraChildFee : 100000,
    applyExtraGuestOthers: false,
    description: existing ? existing.description : ''
  };

  function saveFormFieldsToTemp() {
    const getVal = id => document.getElementById(id);
    if (getVal('catNameInput')) tempValues.name = getVal('catNameInput').value;
    if (getVal('catAreaInput')) tempValues.area = getVal('catAreaInput').value;
    if (getVal('catBedsInput')) tempValues.beds = getVal('catBedsInput').value;
    if (getVal('catChildAgeInput')) tempValues.childAgeNote = getVal('catChildAgeInput').value;
    if (getVal('catPriceInput')) tempValues.price = getVal('catPriceInput').value;
    if (getVal('catAutoOtToggle')) tempValues.autoOvertime = getVal('catAutoOtToggle').checked;
    if (getVal('catApplyOtOthers')) tempValues.applyOvertimeOthers = getVal('catApplyOtOthers').checked;

    if (getVal('catStdAdults')) tempValues.stdAdults = getVal('catStdAdults').value;
    if (getVal('catStdChildren')) tempValues.stdChildren = getVal('catStdChildren').value;
    if (getVal('catMaxExtraBed')) tempValues.maxExtraBed = getVal('catMaxExtraBed').value;
    tempValues.maxAdultsLimit = (Number(tempValues.stdAdults) || 2) + (tempValues.autoExtraGuest ? Math.max(0, Number(tempValues.maxExtraBed) || 0) : 0);

    if (getVal('catAutoEgToggle')) tempValues.autoExtraGuest = getVal('catAutoEgToggle').checked;
    if (getVal('catExtraAdultFee')) tempValues.extraAdultFee = getVal('catExtraAdultFee').value;
    if (getVal('catExtraChildFee')) tempValues.extraChildFee = getVal('catExtraChildFee').value;
    if (getVal('catApplyEgOthers')) tempValues.applyExtraGuestOthers = getVal('catApplyEgOthers').checked;
    if (getVal('catDescInput')) tempValues.description = getVal('catDescInput').value;

    document.querySelectorAll('[data-am-qty]').forEach(el => {
      const amName = el.getAttribute('data-am-qty');
      if (amName) draftAmenityQtyMap[amName] = Math.max(1, Number(el.value) || 1);
    });
    document.querySelectorAll('[data-bp-start]').forEach(el => {
      const i = Number(el.getAttribute('data-bp-start'));
      if (draftPricePlans[i]) draftPricePlans[i].startDate = el.value;
    });
    document.querySelectorAll('[data-bp-end]').forEach(el => {
      const i = Number(el.getAttribute('data-bp-end'));
      if (draftPricePlans[i]) draftPricePlans[i].endDate = el.value;
    });
    document.querySelectorAll('[data-bp-price]').forEach(el => {
      const i = Number(el.getAttribute('data-bp-price'));
      if (draftPricePlans[i]) draftPricePlans[i].price = Math.max(0, Number(el.value) || 0);
    });
    document.querySelectorAll('[data-bp-note]').forEach(el => {
      const i = Number(el.getAttribute('data-bp-note'));
      if (draftPricePlans[i]) draftPricePlans[i].note = el.value;
    });

    document.querySelectorAll('[data-early-hours]').forEach(el => {
      const i = Number(el.getAttribute('data-early-hours'));
      if (draftEarlyRules[i]) draftEarlyRules[i].hours = Number(el.value) || 0;
    });
    document.querySelectorAll('[data-early-fee]').forEach(el => {
      const i = Number(el.getAttribute('data-early-fee'));
      if (draftEarlyRules[i]) draftEarlyRules[i].fee = Number(el.value) || 0;
    });
    document.querySelectorAll('[data-late-hours]').forEach(el => {
      const i = Number(el.getAttribute('data-late-hours'));
      if (draftLateRules[i]) draftLateRules[i].hours = Number(el.value) || 0;
    });
    document.querySelectorAll('[data-late-fee]').forEach(el => {
      const i = Number(el.getAttribute('data-late-fee'));
      if (draftLateRules[i]) draftLateRules[i].fee = Number(el.value) || 0;
    });
  }

  const renderModalContent = () => {
    const unitLabel = '%';
    const allCatRooms = existing ? state.rooms.filter(r => r.categoryId === existing.id) : [];
    const activeCatRoomsCount = allCatRooms.filter(r => (r.businessStatus || 'Đang kinh doanh') === 'Đang kinh doanh').length;
    const stoppedCatRoomsCount = allCatRooms.filter(r => (r.businessStatus || 'Đang kinh doanh') === 'Ngừng kinh doanh').length;
    const roomList = allCatRooms.filter(r =>
      (r.businessStatus || 'Đang kinh doanh') === roomBizTabInModal &&
      (!roomFilterInModal || r.id.toLowerCase().includes(roomFilterInModal.toLowerCase()))
    );

    const hasErr = fieldId => invalidFields.includes(fieldId) ? 'input-invalid' : '';

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
      ${formErrorMsg ? `<div id="catFormError" class="form-error-banner">${formErrorMsg}</div>` : ''}

      <div class="sub-tabs" style="margin-bottom: 4px;">
        <button type="button" class="sub-tab-btn ${activeEditTab === 'info' ? 'active' : ''}" data-cat-tab="info">Thông tin</button>
        <button type="button" class="sub-tab-btn ${activeEditTab === 'pricing' ? 'active' : ''}" data-cat-tab="pricing">Bảng giá</button>
        <button type="button" class="sub-tab-btn ${activeEditTab === 'media' ? 'active' : ''}" data-cat-tab="media">Hình ảnh, mô tả</button>
        <button type="button" class="sub-tab-btn ${activeEditTab === 'amenities' ? 'active' : ''}" data-cat-tab="amenities">Tiện ích</button>
        ${existing ? `<button type="button" class="sub-tab-btn ${activeEditTab === 'rooms' ? 'active' : ''}" data-cat-tab="rooms">Danh sách phòng</button>` : ''}
      </div>

      <!-- TAB 1: THÔNG TIN -->
      <div id="catTabInfo" class="${activeEditTab === 'info' ? '' : 'hidden'}" style="display:flex; flex-direction:column; gap:14px;">
        <div class="form-grid-2">
          <div class="form-group">
            <label>Tên hạng phòng <span class="req-star">*</span></label>
            <input type="text" id="catNameInput" class="form-control ${hasErr('catNameInput')}" value="${tempValues.name}" placeholder="VD: Superior" />
          </div>
          <div class="form-group">
            <label>Mã hạng phòng <span class="req-star">*</span></label>
            <input type="text" id="catIdInput" class="form-control" value="${tempValues.id}" disabled style="background:#f3f4f6; color:var(--text-muted); cursor:not-allowed;" />
          </div>
        </div>

        <div class="form-grid-3">
          <div class="form-group">
            <label>Diện tích (m²)</label>
            <input type="number" id="catAreaInput" class="form-control" min="5" value="${tempValues.area}" />
          </div>
          <div class="form-group">
            <label>Loại giường</label>
            <input type="text" id="catBedsInput" class="form-control" value="${tempValues.beds}" placeholder="1 giường đôi hoặc 2 giường đơn" />
          </div>
          <div class="form-group">
            <label>Độ tuổi trẻ em</label>
            <input type="text" id="catChildAgeInput" class="form-control" value="${tempValues.childAgeNote}" placeholder="Dưới 12 tuổi..." />
          </div>
        </div>

        <!-- Giá cơ sở -->
        <div class="kv-section">
          <div class="kv-section-header">
            <div>
              <div class="kv-section-title">Giá cơ sở</div>
              <div class="kv-section-sub">Giá cơ sở là mức giá mặc định, được áp dụng chung khi không có mức giá linh hoạt nào phù hợp và còn hiệu lực.</div>
            </div>
          </div>
          <div class="form-group">
            <label>Giá cơ sở / đêm (VNĐ) <span class="req-star">*</span></label>
            <input type="number" id="catPriceInput" class="form-control ${hasErr('catPriceInput')}" value="${tempValues.price}" step="50000" min="1000" placeholder="Nhập giá phòng cơ sở (VNĐ)" />
          </div>
        </div>

        <!-- Phụ thu thêm giờ -->
        <div class="kv-section">
          <div class="kv-section-header">
            <div>
              <div class="kv-section-title">Phụ thu thêm giờ</div>
              <div class="kv-section-sub">Tự động tính phụ thu khi khách nhận sớm hoặc trả muộn so với giờ quy định</div>
            </div>
            <label class="kv-switch">
              <input type="checkbox" id="catAutoOtToggle" ${tempValues.autoOvertime ? 'checked' : ''} />
              <span class="kv-slider"></span>
            </label>
          </div>

          <div id="catOtDetails" class="${tempValues.autoOvertime ? '' : 'hidden'}" style="display:flex; flex-direction:column; gap:12px;">
            <div class="form-group">
              <label>Cách tính phụ thu</label>
              <input type="text" id="catOtCalcType" class="form-control" value="Tính phụ thu theo % giá phòng" disabled style="background:#f3f4f6; color:var(--text-main); font-weight:500; cursor:not-allowed;" />
            </div>

            <div class="kv-sub-box">
              <div style="font-size:13px; font-weight:700;">1. Nhận sớm từ</div>
              ${draftEarlyRules.map((r, idx) => `
                <div class="kv-rule-row">
                  <input type="number" class="kv-inline-input" data-early-hours="${idx}" value="${r.hours}" min="1" />
                  <span>giờ</span>
                  <span style="margin-left:8px;">Phụ thu</span>
                  <input type="number" class="kv-inline-input" data-early-fee="${idx}" value="${r.fee}" min="0" />
                  <span>${unitLabel}</span>
                  <button type="button" class="btn btn-danger btn-sm" data-del-early="${idx}" style="margin-left:auto;">Xóa</button>
                </div>
              `).join('')}
              <button type="button" id="addEarlyRuleBtn" class="kv-link-btn">+ Thêm điều kiện</button>
            </div>

            <div class="kv-sub-box">
              <div style="font-size:13px; font-weight:700;">2. Trả muộn từ</div>
              ${draftLateRules.map((r, idx) => `
                <div class="kv-rule-row">
                  <input type="number" class="kv-inline-input" data-late-hours="${idx}" value="${r.hours}" min="1" />
                  <span>giờ</span>
                  <span style="margin-left:8px;">Phụ thu</span>
                  <input type="number" class="kv-inline-input" data-late-fee="${idx}" value="${r.fee}" min="0" />
                  <span>${unitLabel}</span>
                  <button type="button" class="btn btn-danger btn-sm" data-del-late="${idx}" style="margin-left:auto;">Xóa</button>
                </div>
              `).join('')}
              <button type="button" id="addLateRuleBtn" class="kv-link-btn">+ Thêm điều kiện</button>
            </div>

            <label class="kv-checkbox-row">
              <input type="checkbox" id="catApplyOtOthers" ${tempValues.applyOvertimeOthers ? 'checked' : ''} />
              <span>Áp dụng mức phụ thu cho các hạng phòng khác</span>
            </label>
          </div>
        </div>

        <!-- Sức chứa -->
        <div class="kv-section">
          <div class="kv-section-header">
            <div>
              <div class="kv-section-title">Sức chứa</div>
              <div class="kv-section-sub">Sức chứa tiêu chuẩn cũng là số lượng khách tối đa được xếp trong một phòng</div>
            </div>
          </div>

          <div class="kv-sub-box" style="gap:10px;">
            <div class="kv-rule-row">
              <strong style="width:140px;">Tiêu chuẩn (Tối đa) <span class="req-star">*</span></strong>
              <input type="number" id="catStdAdults" class="kv-inline-input ${hasErr('catStdAdults')}" value="${tempValues.stdAdults}" min="1" />
              <span>người lớn &nbsp;và&nbsp;</span>
              <input type="number" id="catStdChildren" class="kv-inline-input ${hasErr('catStdChildren')}" value="${tempValues.stdChildren}" min="0" />
              <span>trẻ em</span>
            </div>
          </div>
        </div>

        <!-- Phụ thu -->
        <div class="kv-section">
          <div class="kv-section-header">
            <div>
              <div class="kv-section-title">Phụ thu</div>
              <div class="kv-section-sub">Tự động tính phụ thu giường phụ hoặc trẻ em khi thuê ngày đêm.</div>
            </div>
            <label class="kv-switch">
              <input type="checkbox" id="catAutoEgToggle" ${tempValues.autoExtraGuest ? 'checked' : ''} />
              <span class="kv-slider"></span>
            </label>
          </div>

          <div id="catEgDetails" class="${tempValues.autoExtraGuest ? '' : 'hidden'}" style="display:flex; flex-direction:column; gap:10px;">
            <div class="kv-sub-box">
              <div class="kv-rule-row">
                <strong style="width:130px;">1. Giường phụ</strong>
                <input type="number" id="catExtraAdultFee" class="kv-inline-input wide" value="${tempValues.extraAdultFee}" step="50000" min="0" />
                <span>VNĐ / giường / ngày</span>
              </div>
            </div>
            <div class="kv-sub-box">
              <div class="kv-rule-row">
                <strong style="width:130px;">2. Trẻ em</strong>
                <input type="number" id="catExtraChildFee" class="kv-inline-input wide" value="${tempValues.extraChildFee}" step="50000" min="0" />
                <span>VNĐ / người / ngày</span>
              </div>
            </div>
            <div class="kv-sub-box">
              <div class="kv-rule-row">
                <strong style="width:130px;">3. Giường phụ tối đa</strong>
                <input type="number" id="catMaxExtraBed" class="kv-inline-input wide" value="${tempValues.maxExtraBed}" step="1" min="0" />
                <span>giường / phòng</span>
              </div>
            </div>

            <label class="kv-checkbox-row">
              <input type="checkbox" id="catApplyEgOthers" ${tempValues.applyExtraGuestOthers ? 'checked' : ''} />
              <span>Áp dụng mức phụ thu cho các hạng phòng khác</span>
            </label>
          </div>
        </div>
      </div>

      <!-- TAB 1.5: BẢNG GIÁ (BangGia) -->
      <div id="catTabPricing" class="${activeEditTab === 'pricing' ? '' : 'hidden'}" style="display:flex; flex-direction:column; gap:12px;">
        <div class="kv-section">
          <div class="kv-section-header">
            <div>
              <div class="kv-section-title">Bảng giá theo ngày / mùa</div>
              <div class="kv-section-sub">Quản lý khoảng thời gian áp dụng giá phòng (bảng BangGia). Nếu đặt phòng rơi vào khoảng thời gian này sẽ ưu tiên lấy giá tại đây.</div>
            </div>
            <button type="button" id="catAddPricePlanBtn" class="btn btn-outline btn-sm">+ Thêm mức giá</button>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Ngày bắt đầu</th>
                  <th>Ngày kết thúc</th>
                  <th>Giá phòng (VNĐ)</th>
                  <th>Ghi chú</th>
                  <th style="width:60px;"></th>
                </tr>
              </thead>
              <tbody>
                ${draftPricePlans.length === 0 ? `
                  <tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Chưa có bảng giá linh hoạt. Đang dùng giá cơ sở mặc định.</td></tr>
                ` : draftPricePlans.map((bp, idx) => `
                  <tr>
                    <td><input type="date" class="form-control" data-bp-start="${idx}" value="${bp.startDate || ''}" style="padding:5px 8px;font-size:12.5px;" /></td>
                    <td><input type="date" class="form-control" data-bp-end="${idx}" value="${bp.endDate || ''}" style="padding:5px 8px;font-size:12.5px;" /></td>
                    <td><input type="number" class="form-control" data-bp-price="${idx}" value="${bp.price || 0}" step="50000" min="0" style="padding:5px 8px;font-size:12.5px;" /></td>
                    <td><input type="text" class="form-control" data-bp-note="${idx}" value="${bp.note || ''}" placeholder="Ghi chú mùa..." style="padding:5px 8px;font-size:12.5px;" /></td>
                    <td><button type="button" class="btn btn-danger btn-sm" data-bp-del="${idx}">Xóa</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 2: HÌNH ÀNH, MÔ TẢ -->
      <div id="catTabMedia" class="${activeEditTab === 'media' ? '' : 'hidden'}" style="display:flex; flex-direction:column; gap:14px;">
        <div class="form-group">
          <label>Hình ảnh hạng phòng</label>
          <div class="image-preview-list" id="catImagePreviewList">
            ${draftImages.length === 0 ? '<span style="font-size:12.5px;color:var(--text-muted);">Chưa có hình ảnh nào.</span>' : ''}
            ${draftImages.map((imgSrc, idx) => `
              <div class="image-preview-item">
                <img src="${imgSrc}" alt="Hình ảnh hạng phòng" />
                <button type="button" class="image-remove-btn" data-remove-img="${idx}" title="Xóa ảnh">&times;</button>
              </div>
            `).join('')}
          </div>
          <div style="display:flex; gap:8px; margin-top:6px; flex-wrap:wrap; align-items:center;">
            <label class="btn btn-outline btn-sm" style="cursor:pointer;">
              + Thêm hình ảnh từ máy
              <input type="file" id="catImageFileInput" accept="image/*" multiple style="display:none;" />
            </label>
            <input type="text" id="catImageUrlInput" class="form-control" style="flex:1; min-width:180px; padding:6px 10px; font-size:13px;" placeholder="Hoặc dán URL hình ảnh rồi nhấn Thêm" />
            <button type="button" id="catAddImageUrlBtn" class="btn btn-outline btn-sm">Thêm URL</button>
          </div>
        </div>

        <div class="form-group">
          <label>Mô tả</label>
          <textarea id="catDescInput" class="form-control" rows="4" placeholder="Mô tả chi tiết về hạng phòng...">${tempValues.description}</textarea>
        </div>
      </div>

      <!-- TAB 3: TIỆN ÍCH -->
      <div id="catTabAmenities" class="${activeEditTab === 'amenities' ? '' : 'hidden'}" style="display:flex; flex-direction:column; gap:14px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
          <div>
            <div style="font-size:15px; font-weight:700; color:#111827;">Danh sách tiện ích</div>
            <div style="font-size:12.5px; color:var(--text-muted); margin-top:2px;">Các tiện ích dưới đây sẽ hiển thị trên trang Đặt phòng Online</div>
          </div>
          <button type="button" id="catOpenPickAmenitiesBtn" class="btn btn-outline btn-sm" style="white-space:nowrap;">+ Thêm/Sửa tiện ích</button>
        </div>
        ${(() => {
          const allCatalog = (state.amenities || []).filter(a => (a.status || 'Đang kinh doanh') === 'Đang kinh doanh');
          const groupLookup = new Map((state.amenityGroups || []).map(g => [g.id, g.name]));
          const byGroup = new Map();
          draftAmenities.forEach(amName => {
            const matched = allCatalog.find(a => String(a.name || '').toLowerCase() === String(amName || '').toLowerCase());
            const grpName = matched ? (groupLookup.get(matched.groupId) || matched.groupName || 'Tiện nghi cơ bản') : 'Tiện ích khác';
            if (!byGroup.has(grpName)) byGroup.set(grpName, []);
            byGroup.get(grpName).push(matched ? matched.name : amName);
          });
          if (byGroup.size === 0) {
            return `<div class="amenity-group-card" style="padding:22px; text-align:center; color:var(--text-muted);">Chưa có tiện ích nào. Bấm <strong>+ Thêm/Sửa tiện ích</strong> để chọn tiện ích cho hạng phòng.</div>`;
          }
          return Array.from(byGroup.entries()).map(([grpName, items]) => `
            <div class="amenity-group-card">
              <div class="amenity-group-header">${grpName}</div>
              <div class="amenity-check-grid">
                ${items.map(name => `
                  <div class="amenity-check-item">
                    <span class="amenity-check-icon">&#10003;</span>
                    <span>${name}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('');
        })()}
      </div>

      <!-- TAB 4: DANH SÁCH PHÒNG -->
      ${existing ? `
        <div id="catTabRooms" class="${activeEditTab === 'rooms' ? '' : 'hidden'}" style="display:flex; flex-direction:column; gap:12px;">
          <div class="sub-tabs" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">
            <button type="button" class="sub-tab-btn ${roomBizTabInModal === 'Đang kinh doanh' ? 'active' : ''}" data-room-biz-tab="Đang kinh doanh">
              Đang kinh doanh (${activeCatRoomsCount})
            </button>
            <button type="button" class="sub-tab-btn ${roomBizTabInModal === 'Ngừng kinh doanh' ? 'active' : ''}" data-room-biz-tab="Ngừng kinh doanh">
              Ngừng kinh doanh (${stoppedCatRoomsCount})
            </button>
          </div>
          <div>
            <input type="text" id="catRoomSearchInput" class="form-control" style="max-width: 280px;" placeholder="Tìm phòng trong hạng phòng..." value="${roomFilterInModal}" />
          </div>
          <div class="table-responsive" style="max-height: 290px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:60px;">STT</th>
                  <th>Tên phòng</th>
                  <th>Khu vực</th>
                  <th>Trạng thái</th>
                  <th style="width:72px; text-align:center;"></th>
                </tr>
              </thead>
              <tbody>
                ${roomList.length === 0 ? `
                  <tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Không có phòng nào ở mục ${roomBizTabInModal}.</td></tr>
                ` : roomList.map((rm, index) => {
                  const bizStatus = rm.businessStatus || 'Đang kinh doanh';
                  const isBizActive = bizStatus === 'Đang kinh doanh';
                  return `
                    <tr>
                      <td>${index + 1}</td>
                      <td><strong>${rm.name || rm.id}</strong></td>
                      <td>Tầng ${rm.floor}</td>
                      <td>
                        <span class="badge ${isBizActive ? 'badge-available' : 'badge-maintenance'}">${bizStatus}</span>
                      </td>
                      <td style="text-align:center;">
                        <button type="button" class="btn ${isBizActive ? 'btn-danger' : 'btn-wood'} btn-icon" title="${isBizActive ? 'Ngừng kinh doanh' : 'Mở kinh doanh lại'}" data-toggle-cat-room="${rm.id}">
                          ${isBizActive ? ICON_STOP : ICON_PLAY}
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;

    // Tab switching
    modalBody.querySelectorAll('[data-cat-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        saveFormFieldsToTemp();
        activeEditTab = btn.getAttribute('data-cat-tab');
        renderModalContent();
      });
    });

    modalBody.querySelectorAll('[data-room-biz-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        roomBizTabInModal = btn.getAttribute('data-room-biz-tab');
        renderModalContent();
      });
    });

    const addBpBtn = document.getElementById('catAddPricePlanBtn');
    if (addBpBtn) {
      addBpBtn.addEventListener('click', () => {
        saveFormFieldsToTemp();
        const nextNum = (state.pricePlans || []).length + draftPricePlans.length + 1;
        draftPricePlans.push({
          id: 'BG' + String(nextNum).padStart(3, '0'),
          categoryId: tempValues.id,
          startDate: '2026-11-01',
          endDate: '2026-12-31',
          price: Number(tempValues.price) || 1400000,
          note: ''
        });
        renderModalContent();
      });
    }
    modalBody.querySelectorAll('[data-bp-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        saveFormFieldsToTemp();
        draftPricePlans.splice(Number(btn.getAttribute('data-bp-del')), 1);
        renderModalContent();
      });
    });

    // Toggle switches & calc type
    const otToggle = document.getElementById('catAutoOtToggle');
    if (otToggle) {
      otToggle.addEventListener('change', () => {
        saveFormFieldsToTemp();
        renderModalContent();
      });
    }
    const otCalcSelect = document.getElementById('catOtCalcType');
    if (otCalcSelect) {
      otCalcSelect.addEventListener('change', () => {
        saveFormFieldsToTemp();
        renderModalContent();
      });
    }
    const egToggle = document.getElementById('catAutoEgToggle');
    if (egToggle) {
      egToggle.addEventListener('change', () => {
        saveFormFieldsToTemp();
        renderModalContent();
      });
    }

    // Early / Late rules add & delete
    const addEarlyBtn = document.getElementById('addEarlyRuleBtn');
    if (addEarlyBtn) {
      addEarlyBtn.addEventListener('click', () => {
        saveFormFieldsToTemp();
        draftEarlyRules.push({ hours: 1, fee: 50 });
        renderModalContent();
      });
    }
    const addLateBtn = document.getElementById('addLateRuleBtn');
    if (addLateBtn) {
      addLateBtn.addEventListener('click', () => {
        saveFormFieldsToTemp();
        draftLateRules.push({ hours: 1, fee: 50 });
        renderModalContent();
      });
    }
    modalBody.querySelectorAll('[data-del-early]').forEach(btn => {
      btn.addEventListener('click', () => {
        saveFormFieldsToTemp();
        draftEarlyRules.splice(Number(btn.getAttribute('data-del-early')), 1);
        renderModalContent();
      });
    });
    modalBody.querySelectorAll('[data-del-late]').forEach(btn => {
      btn.addEventListener('click', () => {
        saveFormFieldsToTemp();
        draftLateRules.splice(Number(btn.getAttribute('data-del-late')), 1);
        renderModalContent();
      });
    });

    // Image upload / URL / delete
    const fileInput = document.getElementById('catImageFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', e => {
        Array.from(e.target.files || []).forEach(file => {
          const reader = new FileReader();
          reader.onload = ev => {
            draftImages.push(ev.target.result);
            saveFormFieldsToTemp();
            renderModalContent();
          };
          reader.readAsDataURL(file);
        });
      });
    }
    const addUrlBtn = document.getElementById('catAddImageUrlBtn');
    if (addUrlBtn) {
      addUrlBtn.addEventListener('click', () => {
        const url = document.getElementById('catImageUrlInput').value.trim();
        if (!url) return;
        draftImages.push(url);
        saveFormFieldsToTemp();
        renderModalContent();
      });
    }
    modalBody.querySelectorAll('[data-remove-img]').forEach(btn => {
      btn.addEventListener('click', () => {
        draftImages.splice(Number(btn.getAttribute('data-remove-img')), 1);
        saveFormFieldsToTemp();
        renderModalContent();
      });
    });

    // Amenities nested picker (+ Thêm/Sửa tiện ích)
    const openPickAmenitiesBtn = document.getElementById('catOpenPickAmenitiesBtn');
    if (openPickAmenitiesBtn) {
      openPickAmenitiesBtn.addEventListener('click', () => {
        saveFormFieldsToTemp();
        const existingOverlay = document.getElementById('amenityPickerSubModal');
        if (existingOverlay) existingOverlay.remove();

        const selectedLower = new Set(draftAmenities.map(x => String(x || '').toLowerCase()));
        let searchQuery = '';
        const normStr = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

        const overlay = document.createElement('div');
        overlay.id = 'amenityPickerSubModal';
        overlay.className = 'sub-modal-backdrop';

        const buildGroupsListHTML = () => {
          const q = normStr(searchQuery);
          const allAm = (state.amenities || []).filter(a => (a.status || 'Đang kinh doanh') === 'Đang kinh doanh');
          const groupsMap = new Map();
          (state.amenityGroups || []).forEach(g => groupsMap.set(g.name, []));

          allAm.forEach(a => {
            const gObj = (state.amenityGroups || []).find(g => g.id === a.groupId);
            const gName = (gObj ? gObj.name : a.groupName) || 'Tiện ích khác';
            if (!groupsMap.has(gName)) groupsMap.set(gName, []);
            groupsMap.get(gName).push(a.name);
          });

          // Include any custom amenities currently on this category that aren't in catalog
          draftAmenities.forEach(dName => {
            const existsInCat = allAm.some(a => String(a.name || '').toLowerCase() === String(dName || '').toLowerCase());
            if (!existsInCat) {
              if (!groupsMap.has('Tiện ích khác')) groupsMap.set('Tiện ích khác', []);
              groupsMap.get('Tiện ích khác').push(dName);
            }
          });

          const blocks = [];
          groupsMap.forEach((items, grpName) => {
            const matchedItems = q ? items.filter(name => normStr(`${grpName} ${name}`).includes(q)) : items;
            if (matchedItems.length === 0) return;
            blocks.push(`
              <div class="amenity-picker-group">
                <div class="amenity-picker-group-title">${grpName}</div>
                ${matchedItems.map(name => `
                  <label class="amenity-picker-row">
                    <input type="checkbox" data-am-pick-name="${name.replace(/"/g, '&quot;')}" ${selectedLower.has(name.toLowerCase()) ? 'checked' : ''} />
                    <span>${name}</span>
                  </label>
                `).join('')}
              </div>
            `);
          });

          if (blocks.length === 0) {
            return `<div style="padding:18px; text-align:center; color:var(--text-muted); font-size:13px;">Không tìm thấy tiện ích phù hợp.</div>`;
          }
          return blocks.join('');
        };

        const groupOptionsHTML = (state.amenityGroups || []).map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        overlay.innerHTML = `
          <div class="sub-modal-box">
            <div class="sub-modal-header">
              <h3>Chọn tiện ích cho hạng phòng</h3>
              <button type="button" id="amPickerCloseX" class="modal-close">&times;</button>
            </div>
            <div class="sub-modal-body">
              <input type="text" id="amPickerSearch" class="form-control" placeholder="Tìm tiện ích..." value="" />
              <div id="amPickerGroupsWrap" style="display:flex; flex-direction:column; gap:10px;">
                ${buildGroupsListHTML()}
              </div>
              <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; padding-top:8px; border-top:1px dashed #e5e7eb;">
                <input type="text" id="amPickerNewName" class="form-control" placeholder="Thêm tiện ích mới..." style="flex:1; min-width:160px;" />
                <select id="amPickerNewGroup" class="form-control" style="width:170px;">${groupOptionsHTML}</select>
                <button type="button" id="amPickerAddNewBtn" class="btn btn-outline btn-sm">+ Thêm mới</button>
              </div>
            </div>
            <div class="sub-modal-footer">
              <button type="button" id="amPickerCancelBtn" class="btn btn-outline">Hủy bỏ</button>
              <button type="button" id="amPickerSaveBtn" class="btn btn-primary">Lưu</button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);

        const bindPickerChecks = () => {
          overlay.querySelectorAll('[data-am-pick-name]').forEach(cb => {
            cb.addEventListener('change', () => {
              const nm = cb.getAttribute('data-am-pick-name');
              if (cb.checked) selectedLower.add(nm.toLowerCase());
              else selectedLower.delete(nm.toLowerCase());
            });
          });
        };
        bindPickerChecks();

        const refreshGroups = () => {
          const wrap = document.getElementById('amPickerGroupsWrap');
          if (wrap) {
            wrap.innerHTML = buildGroupsListHTML();
            bindPickerChecks();
          }
        };

        document.getElementById('amPickerSearch')?.addEventListener('input', e => {
          searchQuery = e.target.value;
          refreshGroups();
        });

        document.getElementById('amPickerAddNewBtn')?.addEventListener('click', () => {
          const newInput = document.getElementById('amPickerNewName');
          const grpSelect = document.getElementById('amPickerNewGroup');
          const nm = (newInput?.value || '').trim();
          if (!nm) return;
          const grpId = grpSelect?.value || ((state.amenityGroups || [])[0]?.id || 'NTI001');
          const grpObj = (state.amenityGroups || []).find(g => g.id === grpId);
          if (!Array.isArray(state.amenities)) state.amenities = [];
          if (!state.amenities.some(a => String(a.name || '').toLowerCase() === nm.toLowerCase())) {
            state.amenities.push({ id: generateNextAmenityId(), groupId: grpId, groupName: grpObj ? grpObj.name : 'Tiện nghi cơ bản', name: nm, note: '', status: 'Đang kinh doanh' });
            saveState();
          }
          selectedLower.add(nm.toLowerCase());
          if (newInput) newInput.value = '';
          refreshGroups();
        });

        const closePicker = () => overlay.remove();
        document.getElementById('amPickerCloseX')?.addEventListener('click', closePicker);
        document.getElementById('amPickerCancelBtn')?.addEventListener('click', closePicker);
        document.getElementById('amPickerSaveBtn')?.addEventListener('click', () => {
          const allCatalog = (state.amenities || []).filter(a => (a.status || 'Đang kinh doanh') === 'Đang kinh doanh');
          const nextList = [];
          allCatalog.forEach(a => {
            if (selectedLower.has(String(a.name || '').toLowerCase()) && !nextList.some(x => x.toLowerCase() === a.name.toLowerCase())) {
              nextList.push(a.name);
            }
          });
          draftAmenities.forEach(oldName => {
            if (selectedLower.has(String(oldName || '').toLowerCase()) && !nextList.some(x => x.toLowerCase() === oldName.toLowerCase())) {
              nextList.push(oldName);
            }
          });
          draftAmenities = nextList;
          nextList.forEach(n => { if (!draftAmenityQtyMap[n]) draftAmenityQtyMap[n] = 1; });
          closePicker();
          renderModalContent();
        });
      });
    }

    // Room list search / add / delete in tab 4
    const rmSearch = document.getElementById('catRoomSearchInput');
    if (rmSearch) {
      rmSearch.addEventListener('input', e => {
        roomFilterInModal = e.target.value;
        renderModalContent();
        const el = document.getElementById('catRoomSearchInput');
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    }
    modalBody.querySelectorAll('[data-toggle-cat-room]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rmId = btn.getAttribute('data-toggle-cat-room');
        const rm = state.rooms.find(r => r.id === rmId);
        if (!rm) return;
        const currentBiz = rm.businessStatus || 'Đang kinh doanh';
        rm.businessStatus = currentBiz === 'Đang kinh doanh' ? 'Ngừng kinh doanh' : 'Đang kinh doanh';
        saveState();
        renderModalContent();
      });
    });
  };

  const isCurrentlyActive = existing ? existing.status === 'Đang kinh doanh' : true;

  openModal(
    existing ? `Sửa hạng phòng` : 'Thêm hạng phòng',
    '',
    [
      ...(existing ? [{
        html: isCurrentlyActive ? ICON_STOP : ICON_PLAY,
        title: isCurrentlyActive ? 'Ngừng kinh doanh' : 'Mở kinh doanh lại',
        className: isCurrentlyActive ? 'btn btn-danger btn-icon' : 'btn btn-wood btn-icon',
        onClick: () => {
          existing.status = isCurrentlyActive ? 'Ngừng kinh doanh' : 'Đang kinh doanh';
          saveState();
          closeModal();
          renderRoomCategories();
        }
      }] : []),
      { label: 'Bỏ qua', className: 'btn btn-outline', onClick: closeModal },
      {
        label: 'Lưu',
        className: 'btn btn-primary',
        onClick: () => {
          saveFormFieldsToTemp();
          const id = tempValues.id.trim().toUpperCase();
          const name = String(tempValues.name || '').trim();
          const priceRaw = String(tempValues.price).trim();
          const stdAdultsRaw = String(tempValues.stdAdults).trim();
          const stdChildrenRaw = String(tempValues.stdChildren).trim();

          const priceNum = Number(priceRaw);
          const stdAdultsNum = Number(stdAdultsRaw);
          const stdChildrenNum = Number(stdChildrenRaw);
          const maxExtraBedNum = tempValues.autoExtraGuest ? Math.max(0, Number(tempValues.maxExtraBed) || 0) : 0;
          const maxAdultsLimitNum = (stdAdultsNum || 1) + maxExtraBedNum;

          const errors = [];
          invalidFields = [];

          if (!name) {
            errors.push('Tên hạng phòng');
            invalidFields.push('catNameInput');
          }
          if (priceRaw === '' || isNaN(priceNum) || priceNum <= 0) {
            errors.push('Giá cơ sở (> 0)');
            invalidFields.push('catPriceInput');
          }
          if (stdAdultsRaw === '' || isNaN(stdAdultsNum) || stdAdultsNum < 1) {
            errors.push('Sức chứa tiêu chuẩn (người lớn >= 1)');
            invalidFields.push('catStdAdults');
          }
          if (stdChildrenRaw === '' || isNaN(stdChildrenNum) || stdChildrenNum < 0) {
            errors.push('Sức chứa tiêu chuẩn (trẻ em)');
            invalidFields.push('catStdChildren');
          }

          if (errors.length > 0) {
            formErrorMsg = `Vui lòng điền đầy đủ và hợp lệ các thông tin bắt buộc (*): ${errors.join(', ')}.`;
            activeEditTab = 'info';
            renderModalContent();
            return;
          }

          formErrorMsg = '';
          invalidFields = [];

          const extraAdultNum = Number(tempValues.extraAdultFee) || 0;
          const extraChildNum = Number(tempValues.extraChildFee) || 0;

          const capacityStr = `${stdAdultsNum} người lớn + ${stdChildrenNum} trẻ em`;
          const extraGuestStr = tempValues.autoExtraGuest
            ? `Người lớn: ${formatVND(extraAdultNum)}/người/ngày; Trẻ em: ${formatVND(extraChildNum)}/người/ngày`
            : 'Không tự động tính phụ thu';

          const payload = {
            name,
            area: Number(tempValues.area) || 25,
            beds: String(tempValues.beds || '1 giường đôi').trim(),
            childAgeNote: String(tempValues.childAgeNote || '').trim(),
            price: priceNum,
            autoOvertime: tempValues.autoOvertime,
            overtimeCalcType: 'percent',
            earlyCheckInRules: draftEarlyRules,
            lateCheckOutRules: draftLateRules,
            stdAdults: stdAdultsNum,
            stdChildren: stdChildrenNum,
            maxAdults: stdAdultsNum,
            maxExtraBed: maxExtraBedNum,
            maxAdultsLimit: maxAdultsLimitNum,
            maxChildren: stdChildrenNum,
            capacity: capacityStr,
            autoExtraGuest: tempValues.autoExtraGuest,
            extraAdultFee: extraAdultNum,
            extraChildFee: extraChildNum,
            extraGuestSurcharge: extraGuestStr,
            description: tempValues.description.trim(),
            images: draftImages,
            amenitiesList: draftAmenities,
            amenityQtyMap: draftAmenityQtyMap,
            amenities: draftAmenities.join(', ')
          };
          payload.overtimeSurcharge = formatOvertimeSummary(payload);

          if (!Array.isArray(state.pricePlans)) state.pricePlans = [];
          state.pricePlans = state.pricePlans.filter(p => p.categoryId !== id || (p.status || 'Đang áp dụng') === 'Đã ẩn');
          draftPricePlans.forEach((bp, idx) => {
            state.pricePlans.push({
              id: bp.id || ('BG' + String(Date.now()).slice(-4) + idx),
              categoryId: id,
              startDate: bp.startDate || '2026-01-01',
              endDate: bp.endDate || '',
              price: Number(bp.price) || priceNum,
              note: bp.note || '',
              status: bp.status || 'Đang áp dụng'
            });
          });

          if (existing) {
            Object.assign(existing, payload);
          } else {
            state.roomCategories.push({
              id,
              bedsEn: '',
              capacityEn: '',
              status: 'Đang kinh doanh',
              amenitiesEn: '',
              ...payload
            });
          }

          if (tempValues.applyOvertimeOthers) {
            state.roomCategories.forEach(c => {
              if (c.id !== id) {
                c.autoOvertime = tempValues.autoOvertime;
                c.overtimeCalcType = 'percent';
                c.earlyCheckInRules = draftEarlyRules.map(r => ({ ...r }));
                c.lateCheckOutRules = draftLateRules.map(r => ({ ...r }));
                c.overtimeSurcharge = formatOvertimeSummary(c);
              }
            });
          }

          if (tempValues.applyExtraGuestOthers) {
            state.roomCategories.forEach(c => {
              if (c.id !== id) {
                c.autoExtraGuest = tempValues.autoExtraGuest;
                c.extraAdultFee = extraAdultNum;
                c.extraChildFee = extraChildNum;
                c.extraGuestSurcharge = extraGuestStr;
              }
            });
          }

          saveState();
          closeModal();
          renderRoomCategories();
        }
      }
    ]
  );

  renderModalContent();
}

function deleteCategory(catId) {
  if (confirm(`Bạn có chắc muốn xóa hạng phòng ${catId}?`)) {
    state.roomCategories = state.roomCategories.filter(c => c.id !== catId);
    saveState();
    renderRoomCategories();
  }
}

// ============================================================================
// 5. RENDER VIEW 2.2: PHÒNG -> PHÒNG (80 PHÒNG / 9 TẦNG)
// ============================================================================
let roomFilters = { floor: 'ALL', category: 'ALL', status: 'ALL', search: '', dateFrom: '', dateTo: '' };
let roomBizStatusTab = 'Đang kinh doanh';

function setRoomBizStatusTab(tab) {
  roomBizStatusTab = tab;
  renderRooms();
}

function toggleRoomBusinessStatus(roomId) {
  const rm = state.rooms.find(r => r.id === roomId);
  if (!rm) return;
  const current = rm.businessStatus || 'Đang kinh doanh';
  rm.businessStatus = current === 'Đang kinh doanh' ? 'Ngừng kinh doanh' : 'Đang kinh doanh';
  saveState();
  renderRooms();
}

function getOpenStayForRoom(roomId) {
  return (state.checkins || []).find(c => c.roomId === roomId && !c.actualCheckOut && c.status !== 'Đã trả phòng') || null;
}

function getRoomOperationalMeta(r) {
  const rawFrom = String(roomFilters.dateFrom || '').trim();
  const rawTo = String(roomFilters.dateTo || '').trim();

  if (rawFrom || rawTo) {
    let rangeStart = rawFrom || rawTo;
    let rangeEnd = rawTo || rawFrom;
    if (rangeEnd < rangeStart) {
      const tmp = rangeStart;
      rangeStart = rangeEnd;
      rangeEnd = tmp;
    }

    const extractIsoDate = v => {
      const m = String(v || '').match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : '';
    };
    const nextIsoDay = iso => {
      if (!iso) return '';
      const d = new Date(iso + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const overlapsWindow = (stayStart, stayEnd) => {
      if (!stayStart) return false;
      const effEnd = (stayEnd && stayEnd >= stayStart) ? stayEnd : nextIsoDay(stayStart);
      if (rangeStart === rangeEnd) {
        return stayStart <= rangeStart && (effEnd > rangeStart || (stayStart === effEnd && stayStart === rangeStart));
      }
      return stayStart < rangeEnd && effEnd > rangeStart;
    };

    const matchedStay = (state.checkins || []).find(ci => {
      if (ci.roomId !== r.id) return false;
      const stStart = extractIsoDate(ci.actualCheckIn || ci.expectedCheckIn);
      const parentBk = Array.isArray(state.bookings) ? state.bookings.find(b => b.id === ci.bookingId) : null;
      let stEnd = extractIsoDate(ci.actualCheckOut || ci.expectedCheckOut || parentBk?.checkOut);
      if (!ci.actualCheckOut && ci.status !== 'Đã trả phòng' && (!stEnd || stEnd <= todayStr)) {
        stEnd = nextIsoDay(todayStr);
      }
      return overlapsWindow(stStart, stEnd);
    }) || null;

    const matchedBk = (!matchedStay && Array.isArray(state.bookings) && typeof getBookingComputedStatus === 'function')
      ? state.bookings.find(bk => {
          const bSt = getBookingComputedStatus(bk);
          if (bSt !== 'Đã xác nhận' && bSt !== 'Đang lưu trú') return false;
          const hasRoom = (Array.isArray(bk.roomIds) && bk.roomIds.includes(r.id)) || bk.roomId === r.id;
          if (!hasRoom) return false;
          return overlapsWindow(extractIsoDate(bk.checkIn), extractIsoDate(bk.checkOut));
        }) || null
      : null;

    const isInUse = !!(matchedStay || matchedBk);
    const parentMatchedBk = matchedStay && Array.isArray(state.bookings)
      ? state.bookings.find(b => b.id === matchedStay.bookingId)
      : matchedBk;
    return {
      isInUse,
      label: isInUse ? 'Đang sử dụng' : 'Trống',
      reservedBk: parentMatchedBk,
      matchedStay
    };
  }

  const hasOpenStay = typeof getOpenStayForRoom === 'function' ? !!getOpenStayForRoom(r.id) : false;
  const reservedBk = Array.isArray(state.bookings) && typeof getBookingComputedStatus === 'function'
    ? state.bookings.find(bk => getBookingComputedStatus(bk) === 'Đã xác nhận' && ((Array.isArray(bk.roomIds) && bk.roomIds.includes(r.id)) || bk.roomId === r.id))
    : null;
  const isInUse = hasOpenStay || r.status === 'Đang ở' || r.status === 'Đang sử dụng' || r.status === 'Đã đặt' || !!reservedBk;
  return {
    isInUse,
    label: isInUse ? 'Đang sử dụng' : 'Trống',
    reservedBk
  };
}

function renderRooms() {
  const container = document.getElementById('view-rooms');

  const activeCount = state.rooms.filter(r => (r.businessStatus || 'Đang kinh doanh') === 'Đang kinh doanh').length;
  const stoppedCount = state.rooms.filter(r => (r.businessStatus || 'Đang kinh doanh') === 'Ngừng kinh doanh').length;

  const filteredRooms = state.rooms.filter(r => {
    const biz = r.businessStatus || 'Đang kinh doanh';
    if (biz !== roomBizStatusTab) return false;
    if (roomFilters.floor !== 'ALL' && String(r.floor) !== String(roomFilters.floor)) return false;
    if (roomFilters.category !== 'ALL' && r.categoryId !== roomFilters.category) return false;
    if (roomFilters.status !== 'ALL' && getRoomOperationalMeta(r).label !== roomFilters.status) return false;
    if (roomFilters.search) {
      const q = roomFilters.search.toLowerCase();
      const cat = getCategoryById(r.categoryId);
      const matchCode = r.id.toLowerCase().includes(q);
      const matchName = (r.name || '').toLowerCase().includes(q);
      const matchNote = (r.note || '').toLowerCase().includes(q);
      const matchCat = (cat ? cat.name : '').toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchNote && !matchCat) return false;
    }
    return true;
  });

  container.innerHTML = `
    <div class="toolbar">
      <div class="sub-tabs" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">
        <button type="button" class="sub-tab-btn ${roomBizStatusTab === 'Đang kinh doanh' ? 'active' : ''}" onclick="setRoomBizStatusTab('Đang kinh doanh')">
          Đang kinh doanh (${activeCount})
        </button>
        <button type="button" class="sub-tab-btn ${roomBizStatusTab === 'Ngừng kinh doanh' ? 'active' : ''}" onclick="setRoomBizStatusTab('Ngừng kinh doanh')">
          Ngừng kinh doanh (${stoppedCount})
        </button>
      </div>
      <button class="btn btn-primary" onclick="openRoomModal()">+ Thêm phòng</button>
    </div>

    <div class="toolbar">
      <div class="toolbar-filters">
        <input
          type="text"
          id="roomSearchInput"
          class="form-control"
          placeholder="Tìm mã phòng, tên phòng, hạng phòng..."
          value="${roomFilters.search}"
        />
        <select id="roomFloorFilter" class="form-control">
          <option value="ALL">Khu vực</option>
          ${[2,3,4,5,6,7,8,9].map(fl => `<option value="${fl}" ${String(roomFilters.floor) === String(fl) ? 'selected' : ''}>Tầng ${fl}</option>`).join('')}
        </select>
        <select id="roomCategoryFilter" class="form-control">
          <option value="ALL">Tất cả hạng phòng</option>
          ${state.roomCategories.map(c => `<option value="${c.id}" ${roomFilters.category === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
        <select id="roomStatusFilter" class="form-control">
          <option value="ALL">Tất cả trạng thái</option>
          <option value="Trống" ${roomFilters.status === 'Trống' ? 'selected' : ''}>Trống</option>
          <option value="Đang sử dụng" ${roomFilters.status === 'Đang sử dụng' ? 'selected' : ''}>Đang sử dụng</option>
        </select>
        <input type="date" id="roomFromDateFilter" class="form-control" style="min-width:145px; width:auto;" value="${roomFilters.dateFrom}" title="Từ ngày" />
        <span style="color:var(--text-muted); font-size:12.5px;">→</span>
        <input type="date" id="roomToDateFilter" class="form-control" style="min-width:145px; width:auto;" value="${roomFilters.dateTo}" title="Đến ngày" />
        ${(roomFilters.dateFrom || roomFilters.dateTo) ? `<button type="button" id="roomClearDateBtn" class="btn btn-outline btn-sm">Xóa lọc ngày</button>` : ''}
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã phòng</th>
                <th>Tên phòng</th>
                <th>Hạng phòng</th>
                <th>Khu vực</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th style="width: 96px; text-align: center;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRooms.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">
                    Không có phòng nào ở mục ${roomBizStatusTab}.
                  </td>
                </tr>
              ` : filteredRooms.map(r => {
                const cat = getCategoryById(r.categoryId);
                const biz = r.businessStatus || 'Đang kinh doanh';
                const isActive = biz === 'Đang kinh doanh';
                const statusMeta = getRoomOperationalMeta(r);
                const isInUse = statusMeta.isInUse;
                const roomStatusLabel = statusMeta.label;
                const reservedBk = statusMeta.reservedBk;
                const roomStatusTitle = reservedBk
                  ? `Đã phân giữ phòng cho đơn ${reservedBk.id} (${reservedBk.guestName || ''})`
                  : (r.status === 'Đang ở' && r.currentGuest ? `Đang lưu trú: ${r.currentGuest}` : '');
                return `
                  <tr>
                    <td><strong>${r.id}</strong></td>
                    <td><strong>${r.name || r.id}</strong></td>
                    <td><strong>${cat ? cat.name : r.categoryId}</strong></td>
                    <td>Tầng ${r.floor}</td>
                    <td><strong>${cat ? formatVND(cat.price) : '-'}</strong> / đêm</td>
                    <td>
                      <span class="badge ${isInUse ? 'badge-occupied' : 'badge-available'}"${roomStatusTitle ? ` title="${roomStatusTitle.replace(/"/g, '&quot;')}"` : ''}>${roomStatusLabel}</span>
                    </td>
                    <td style="text-align: center;">
                      <div style="display: inline-flex; gap: 6px; align-items: center;">
                        <button class="btn btn-outline btn-icon" title="Chỉnh sửa" onclick="openRoomModal('${r.id}')">${ICON_EDIT}</button>
                        <button class="btn ${isActive ? 'btn-danger' : 'btn-wood'} btn-icon" title="${isActive ? 'Ngừng kinh doanh' : 'Mở kinh doanh lại'}" onclick="toggleRoomBusinessStatus('${r.id}')">${isActive ? ICON_STOP : ICON_PLAY}</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('roomSearchInput').addEventListener('input', e => {
    roomFilters.search = e.target.value;
    renderRooms();
    const input = document.getElementById('roomSearchInput');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
  document.getElementById('roomFloorFilter').addEventListener('change', e => {
    roomFilters.floor = e.target.value;
    renderRooms();
  });
  document.getElementById('roomCategoryFilter').addEventListener('change', e => {
    roomFilters.category = e.target.value;
    renderRooms();
  });
  document.getElementById('roomStatusFilter').addEventListener('change', e => {
    roomFilters.status = e.target.value;
    renderRooms();
  });
  document.getElementById('roomFromDateFilter')?.addEventListener('change', e => {
    roomFilters.dateFrom = e.target.value;
    renderRooms();
  });
  document.getElementById('roomToDateFilter')?.addEventListener('change', e => {
    roomFilters.dateTo = e.target.value;
    renderRooms();
  });
  document.getElementById('roomClearDateBtn')?.addEventListener('click', () => {
    roomFilters.dateFrom = '';
    roomFilters.dateTo = '';
    renderRooms();
  });
}

function renderRoomStatusBadge(status) {
  const map = {
    'Trống': 'badge-available',
    'Đang ở': 'badge-occupied',
    'Đã đặt': 'badge-reserved',
    'Đang dọn': 'badge-cleaning',
    'Bảo trì': 'badge-maintenance'
  };
  return `<span class="badge ${map[status] || 'badge-pistachio'}">${status}</span>`;
}

function openRoomModal(roomId = null) {
  const existing = roomId ? state.rooms.find(r => r.id === roomId) : null;
  const isCurrentlyActive = existing ? (existing.businessStatus || 'Đang kinh doanh') === 'Đang kinh doanh' : true;

  let roomErrorMsg = '';
  let draftRoomImages = existing && Array.isArray(existing.images) ? [...existing.images] : [];
  const tempRoom = {
    id: existing ? existing.id : generateNextRoomId(),
    name: existing ? (existing.name || existing.id) : '',
    floor: existing ? existing.floor : 2,
    categoryId: existing ? existing.categoryId : state.roomCategories[0].id,
    note: existing ? (existing.note || '') : ''
  };

  function saveRoomFieldsToTemp() {
    const nameEl = document.getElementById('rmNameInput');
    const flEl = document.getElementById('rmFloorInput');
    const catEl = document.getElementById('rmCatInput');
    const noteEl = document.getElementById('rmNoteInput');
    if (nameEl) tempRoom.name = nameEl.value;
    if (flEl) tempRoom.floor = Number(flEl.value) || 2;
    if (catEl) tempRoom.categoryId = catEl.value;
    if (noteEl) tempRoom.note = noteEl.value;
  }

  const renderRoomModalBody = () => {
    const body = document.getElementById('modalBody');
    body.innerHTML = `
      ${roomErrorMsg ? `<div class="form-error-banner">${roomErrorMsg}</div>` : ''}
      <div class="form-grid-2">
        <div class="form-group">
          <label>Mã phòng <span class="req-star">*</span></label>
          <input type="text" id="rmIdInput" class="form-control" value="${tempRoom.id}" disabled style="background:#f3f4f6;color:var(--text-muted);cursor:not-allowed;" />
        </div>
        <div class="form-group">
          <label>Tên phòng <span class="req-star">*</span></label>
          <input type="text" id="rmNameInput" class="form-control" value="${tempRoom.name}" placeholder="VD: Phòng 211" />
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label>Khu vực <span class="req-star">*</span></label>
          <select id="rmFloorInput" class="form-control">
            ${[2,3,4,5,6,7,8,9].map(fl => `<option value="${fl}" ${tempRoom.floor === fl ? 'selected' : ''}>Tầng ${fl}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Hạng phòng <span class="req-star">*</span></label>
          <select id="rmCatInput" class="form-control">
            ${state.roomCategories.map(c => `<option value="${c.id}" ${tempRoom.categoryId === c.id ? 'selected' : ''}>${c.name} (${formatVND(c.price)} / đêm)</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Hình ảnh</label>
        <div class="image-preview-list">
          ${draftRoomImages.length === 0 ? '<span style="font-size:12.5px;color:var(--text-muted);">Chưa có hình ảnh nào.</span>' : ''}
          ${draftRoomImages.map((imgSrc, idx) => `
            <div class="image-preview-item">
              <img src="${imgSrc}" alt="Hình ảnh phòng" />
              <button type="button" class="image-remove-btn" data-rm-remove-img="${idx}" title="Xóa ảnh">&times;</button>
            </div>
          `).join('')}
        </div>
        <div style="display:flex; gap:8px; margin-top:6px; flex-wrap:wrap; align-items:center;">
          <label class="btn btn-outline btn-sm" style="cursor:pointer;">
            + Thêm hình ảnh từ máy
            <input type="file" id="rmImageFileInput" accept="image/*" multiple style="display:none;" />
          </label>
          <input type="text" id="rmImageUrlInput" class="form-control" style="flex:1; min-width:180px; padding:6px 10px; font-size:13px;" placeholder="Hoặc dán URL hình ảnh rồi nhấn Thêm" />
          <button type="button" id="rmAddImageUrlBtn" class="btn btn-outline btn-sm">Thêm URL</button>
        </div>
      </div>
    `;

    const rmFileInput = document.getElementById('rmImageFileInput');
    if (rmFileInput) {
      rmFileInput.addEventListener('change', e => {
        saveRoomFieldsToTemp();
        Array.from(e.target.files || []).forEach(file => {
          const reader = new FileReader();
          reader.onload = ev => {
            draftRoomImages.push(ev.target.result);
            renderRoomModalBody();
          };
          reader.readAsDataURL(file);
        });
      });
    }

    const rmAddUrlBtn = document.getElementById('rmAddImageUrlBtn');
    if (rmAddUrlBtn) {
      rmAddUrlBtn.addEventListener('click', () => {
        saveRoomFieldsToTemp();
        const url = document.getElementById('rmImageUrlInput').value.trim();
        if (!url) return;
        draftRoomImages.push(url);
        renderRoomModalBody();
      });
    }

    body.querySelectorAll('[data-rm-remove-img]').forEach(btn => {
      btn.addEventListener('click', () => {
        saveRoomFieldsToTemp();
        draftRoomImages.splice(Number(btn.getAttribute('data-rm-remove-img')), 1);
        renderRoomModalBody();
      });
    });
  };

  openModal(
    existing ? `Sửa phòng ${existing.id}` : 'Thêm phòng mới',
    '',
    [
      ...(existing ? [{
        html: isCurrentlyActive ? ICON_STOP : ICON_PLAY,
        title: isCurrentlyActive ? 'Ngừng kinh doanh' : 'Mở kinh doanh lại',
        className: isCurrentlyActive ? 'btn btn-danger btn-icon' : 'btn btn-wood btn-icon',
        onClick: () => {
          existing.businessStatus = isCurrentlyActive ? 'Ngừng kinh doanh' : 'Đang kinh doanh';
          saveState();
          closeModal();
          renderRooms();
        }
      }] : []),
      { label: 'Bỏ qua', className: 'btn btn-outline', onClick: closeModal },
      {
        label: 'Lưu',
        className: 'btn btn-primary',
        onClick: () => {
          saveRoomFieldsToTemp();
          const id = tempRoom.id;
          const name = String(tempRoom.name || '').trim();
          const floor = tempRoom.floor;
          const categoryId = tempRoom.categoryId;
          const note = String(tempRoom.note || '').trim();

          if (!name) {
            roomErrorMsg = 'Vui lòng nhập tên phòng (*).';
            renderRoomModalBody();
            return;
          }

          if (!existing && state.rooms.some(r => r.id === id)) {
            roomErrorMsg = `Mã phòng ${id} đã tồn tại. Vui lòng nhập mã phòng khác.`;
            renderRoomModalBody();
            return;
          }

          const cat = getCategoryById(categoryId);
          if (existing) {
            Object.assign(existing, { name, floor, categoryId, note, images: draftRoomImages });
          } else {
            state.rooms.push({
              id,
              name,
              floor,
              categoryId,
              bedConfig: cat ? cat.beds : '1 giường đôi',
              status: 'Trống',
              businessStatus: 'Đang kinh doanh',
              currentGuest: '',
              note,
              images: draftRoomImages
            });
          }

          saveState();
          closeModal();
          renderRooms();
        }
      }
    ]
  );

  renderRoomModalBody();
}

// ============================================================================
// 5B. RENDER VIEW 2.3: PHÒNG -> TIỆN ÍCH
// ============================================================================
let amenityBizTab = 'Đang kinh doanh';
let amenitySearchQuery = '';

function setAmenityBizTab(tab) {
  amenityBizTab = tab;
  renderRoomAmenities();
}

function toggleAmenityStatus(amId) {
  const am = (state.amenities || []).find(a => a.id === amId);
  if (!am) return;
  const current = am.status || 'Đang kinh doanh';
  am.status = current === 'Đang kinh doanh' ? 'Ngừng kinh doanh' : 'Đang kinh doanh';
  saveState();
  renderRoomAmenities();
}

function generateNextAmenityId() {
  let maxNum = 0;
  (state.amenities || []).forEach(a => {
    const m = String(a.id).match(/^TI(\d+)$/i);
    if (m) maxNum = Math.max(maxNum, Number(m[1]));
  });
  return 'TI' + String(maxNum + 1).padStart(3, '0');
}

function renderRoomAmenities() {
  const container = document.getElementById('view-room-amenities');
  if (!Array.isArray(state.amenities)) state.amenities = [];

  const activeCount = state.amenities.filter(a => (a.status || 'Đang kinh doanh') === 'Đang kinh doanh').length;
  const stoppedCount = state.amenities.filter(a => (a.status || 'Đang kinh doanh') === 'Ngừng kinh doanh').length;

  const filtered = state.amenities.filter(a => {
    const st = a.status || 'Đang kinh doanh';
    if (st !== amenityBizTab) return false;
    if (amenitySearchQuery.trim() !== '') {
      const q = amenitySearchQuery.trim().toLowerCase();
      if (!a.id.toLowerCase().includes(q) && !a.name.toLowerCase().includes(q) && !(a.note || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  container.innerHTML = `
    <div class="toolbar">
      <div class="sub-tabs" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">
        <button type="button" class="sub-tab-btn ${amenityBizTab === 'Đang kinh doanh' ? 'active' : ''}" onclick="setAmenityBizTab('Đang kinh doanh')">
          Đang kinh doanh (${activeCount})
        </button>
        <button type="button" class="sub-tab-btn ${amenityBizTab === 'Ngừng kinh doanh' ? 'active' : ''}" onclick="setAmenityBizTab('Ngừng kinh doanh')">
          Ngừng kinh doanh (${stoppedCount})
        </button>
      </div>
      <button class="btn btn-primary" onclick="openAmenityModal()">+ Thêm tiện ích</button>
    </div>

    <div class="toolbar">
      <div class="toolbar-filters">
        <input type="text" id="amenitySearchInput" class="form-control" placeholder="Tìm mã tiện ích, tên tiện ích..." value="${amenitySearchQuery}" />
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã tiện ích</th>
                <th>Tên tiện ích</th>
                <th>Nhóm tiện ích</th>
                <th>Ghi chú</th>
                <th>Trạng thái</th>
                <th style="width: 96px; text-align: center;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Không có tiện ích nào ở mục ${amenityBizTab}.</td></tr>
              ` : filtered.map(a => {
                const st = a.status || 'Đang kinh doanh';
                const isActive = st === 'Đang kinh doanh';
                const grp = (state.amenityGroups || []).find(g => g.id === a.groupId);
                return `
                  <tr>
                    <td><strong>${a.id}</strong></td>
                    <td><strong>${a.name}</strong></td>
                    <td><span class="badge badge-pistachio">${grp ? grp.name : (a.groupName || 'Tiện nghi cơ bản')}</span></td>
                    <td>${a.note || '-'}</td>
                    <td><span class="badge ${isActive ? 'badge-available' : 'badge-maintenance'}">${st}</span></td>
                    <td style="text-align:center;">
                      <div style="display:inline-flex; gap:6px; align-items:center;">
                        <button class="btn btn-outline btn-icon" title="Chỉnh sửa" onclick="openAmenityModal('${a.id}')">${ICON_EDIT}</button>
                        <button class="btn ${isActive ? 'btn-danger' : 'btn-wood'} btn-icon" title="${isActive ? 'Ngừng kinh doanh' : 'Mở kinh doanh lại'}" onclick="toggleAmenityStatus('${a.id}')">${isActive ? ICON_STOP : ICON_PLAY}</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('amenitySearchInput').addEventListener('input', e => {
    amenitySearchQuery = e.target.value;
    renderRoomAmenities();
    const el = document.getElementById('amenitySearchInput');
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  });
}

function openAmenityModal(amId = null) {
  if (!Array.isArray(state.amenities)) state.amenities = [];
  if (!Array.isArray(state.amenityGroups) || state.amenityGroups.length === 0) {
    state.amenityGroups = [{ id: 'NTI001', name: 'Tiện nghi cơ bản' }];
  }
  const existing = amId ? state.amenities.find(a => a.id === amId) : null;
  const isCurrentlyActive = existing ? (existing.status || 'Đang kinh doanh') === 'Đang kinh doanh' : true;
  let amErr = '';
  const tempAm = {
    id: existing ? existing.id : generateNextAmenityId(),
    groupId: existing ? (existing.groupId || 'NTI001') : state.amenityGroups[0].id,
    name: existing ? existing.name : '',
    note: existing ? (existing.note || '') : ''
  };

  const renderBody = () => {
    document.getElementById('modalBody').innerHTML = `
      ${amErr ? `<div class="form-error-banner">${amErr}</div>` : ''}
      <div class="form-grid-2">
        <div class="form-group">
          <label>Mã tiện ích <span class="req-star">*</span></label>
          <input type="text" class="form-control" value="${tempAm.id}" disabled style="background:#f3f4f6;color:var(--text-muted);cursor:not-allowed;" />
        </div>
        <div class="form-group">
          <label>Nhóm tiện ích <span class="req-star">*</span></label>
          <select id="amGroupSelect" class="form-control">
            ${state.amenityGroups.map(g => `<option value="${g.id}" ${g.id === tempAm.groupId ? 'selected' : ''}>${g.id} - ${g.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Tên tiện ích <span class="req-star">*</span></label>
        <input type="text" id="amNameInput" class="form-control" value="${tempAm.name}" placeholder="VD: Bồn tắm nằm, Ban công..." />
      </div>
      <div class="form-group">
        <label>Ghi chú</label>
        <textarea id="amNoteInput" class="form-control" rows="2" placeholder="Ghi chú thêm về tiện ích...">${tempAm.note}</textarea>
      </div>
    `;
  };

  openModal(
    existing ? `Sửa tiện ích ${existing.id}` : 'Thêm tiện ích mới',
    '',
    [
      ...(existing ? [{
        html: isCurrentlyActive ? ICON_STOP : ICON_PLAY,
        title: isCurrentlyActive ? 'Ngừng kinh doanh' : 'Mở kinh doanh lại',
        className: isCurrentlyActive ? 'btn btn-danger btn-icon' : 'btn btn-wood btn-icon',
        onClick: () => {
          existing.status = isCurrentlyActive ? 'Ngừng kinh doanh' : 'Đang kinh doanh';
          saveState();
          closeModal();
          renderRoomAmenities();
        }
      }] : []),
      { label: 'Bỏ qua', className: 'btn btn-outline', onClick: closeModal },
      {
        label: 'Lưu',
        className: 'btn btn-primary',
        onClick: () => {
          tempAm.groupId = document.getElementById('amGroupSelect').value;
          tempAm.name = document.getElementById('amNameInput').value.trim();
          tempAm.note = document.getElementById('amNoteInput').value.trim();
          if (!tempAm.name) {
            amErr = 'Vui lòng nhập tên tiện ích (*).';
            renderBody();
            return;
          }

          const duplicate = state.amenities.find(a =>
            a.name.toLowerCase() === tempAm.name.toLowerCase() && (!existing || a.id !== existing.id)
          );
          if (duplicate) {
            amErr = `Tiện ích "${tempAm.name}" đã tồn tại (${duplicate.id}).`;
            renderBody();
            return;
          }

          const grpObj = state.amenityGroups.find(g => g.id === tempAm.groupId);
          const groupName = grpObj ? grpObj.name : 'Tiện nghi cơ bản';

          if (existing) {
            const oldName = existing.name;
            existing.groupId = tempAm.groupId;
            existing.groupName = groupName;
            existing.name = tempAm.name;
            existing.note = tempAm.note;
            if (oldName !== tempAm.name) {
              state.roomCategories.forEach(cat => {
                if (Array.isArray(cat.amenitiesList)) {
                  cat.amenitiesList = cat.amenitiesList.map(x => x.toLowerCase() === oldName.toLowerCase() ? tempAm.name : x);
                  cat.amenities = cat.amenitiesList.join(', ');
                }
              });
            }
          } else {
            state.amenities.push({ id: tempAm.id, groupId: tempAm.groupId, groupName, name: tempAm.name, note: tempAm.note, status: 'Đang kinh doanh' });
          }
          saveState();
          updateSidebarCounters();
          closeModal();
          renderRoomAmenities();
        }
      }
    ]
  );

  renderBody();
}

// ============================================================================
// 6. PHÂN HỆ GIAO DỊCH ĐƯỢC TÁCH SẠCH SẼ SANG transactions.js

// 6B. RENDER VIEW: DỊCH VỤ -> NHÓM DỊCH VỤ & DỊCH VỤ
// ============================================================================
let serviceGroupBizTab = 'Đang kinh doanh';
let serviceGroupSearch = '';

function setServiceGroupBizTab(tab) {
  serviceGroupBizTab = tab;
  renderServiceGroups();
}

function toggleServiceGroupStatus(grpId) {
  const grp = state.serviceGroups.find(g => g.id === grpId);
  if (!grp) return;
  const current = grp.status || 'Đang kinh doanh';
  grp.status = current === 'Đang kinh doanh' ? 'Ngừng kinh doanh' : 'Đang kinh doanh';
  saveState();
  renderServiceGroups();
}

function generateNextServiceGroupId() {
  let maxNum = 0;
  (state.serviceGroups || []).forEach(g => {
    const m = String(g.id).match(/^NDV(\d+)$/i);
    if (m) maxNum = Math.max(maxNum, Number(m[1]));
  });
  return 'NDV' + String(maxNum + 1).padStart(3, '0');
}

function renderServiceGroups() {
  const container = document.getElementById('view-service-groups');
  if (!Array.isArray(state.serviceGroups)) state.serviceGroups = [];
  const activeCount = state.serviceGroups.filter(g => (g.status || 'Đang kinh doanh') === 'Đang kinh doanh').length;
  const stoppedCount = state.serviceGroups.filter(g => (g.status || 'Đang kinh doanh') === 'Ngừng kinh doanh').length;

  const filtered = state.serviceGroups.filter(g => {
    const st = g.status || 'Đang kinh doanh';
    if (st !== serviceGroupBizTab) return false;
    if (serviceGroupSearch) {
      const q = serviceGroupSearch.toLowerCase();
      if (!g.id.toLowerCase().includes(q) && !g.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  container.innerHTML = `
    <div class="toolbar">
      <div class="sub-tabs" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">
        <button type="button" class="sub-tab-btn ${serviceGroupBizTab === 'Đang kinh doanh' ? 'active' : ''}" onclick="setServiceGroupBizTab('Đang kinh doanh')">
          Đang kinh doanh (${activeCount})
        </button>
        <button type="button" class="sub-tab-btn ${serviceGroupBizTab === 'Ngừng kinh doanh' ? 'active' : ''}" onclick="setServiceGroupBizTab('Ngừng kinh doanh')">
          Ngừng kinh doanh (${stoppedCount})
        </button>
      </div>
      <button class="btn btn-primary" onclick="openServiceGroupModal()">+ Thêm nhóm dịch vụ</button>
    </div>

    <div class="toolbar">
      <div class="toolbar-filters">
        <input type="text" id="sgSearchInput" class="form-control" placeholder="Tìm mã nhóm DV, tên nhóm DV..." value="${serviceGroupSearch}" />
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã nhóm DV</th>
                <th>Tên nhóm DV</th>
                <th>SL dịch vụ</th>
                <th>Ghi chú</th>
                <th>Trạng thái</th>
                <th style="width: 96px; text-align: center;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Không có nhóm dịch vụ nào ở mục ${serviceGroupBizTab}.</td></tr>
              ` : filtered.map(g => {
                const st = g.status || 'Đang kinh doanh';
                const isActive = st === 'Đang kinh doanh';
                const srvCount = state.services.filter(s => s.groupId === g.id).length;
                return `
                  <tr>
                    <td><strong>${g.id}</strong></td>
                    <td><strong>${g.name}</strong></td>
                    <td>${srvCount} dịch vụ</td>
                    <td>${g.note || '-'}</td>
                    <td><span class="badge ${isActive ? 'badge-available' : 'badge-maintenance'}">${st}</span></td>
                    <td style="text-align:center;">
                      <div style="display:inline-flex; gap:6px; align-items:center;">
                        <button class="btn btn-outline btn-icon" title="Chỉnh sửa" onclick="openServiceGroupModal('${g.id}')">${ICON_EDIT}</button>
                        <button class="btn ${isActive ? 'btn-danger' : 'btn-wood'} btn-icon" title="${isActive ? 'Ngừng kinh doanh' : 'Mở kinh doanh lại'}" onclick="toggleServiceGroupStatus('${g.id}')">${isActive ? ICON_STOP : ICON_PLAY}</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('sgSearchInput').addEventListener('input', e => {
    serviceGroupSearch = e.target.value;
    renderServiceGroups();
    const el = document.getElementById('sgSearchInput');
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  });
}

function openServiceGroupModal(grpId = null) {
  const existing = grpId ? state.serviceGroups.find(g => g.id === grpId) : null;
  const isCurrentlyActive = existing ? (existing.status || 'Đang kinh doanh') === 'Đang kinh doanh' : true;
  let sgErr = '';
  const tempSg = {
    id: existing ? existing.id : generateNextServiceGroupId(),
    name: existing ? existing.name : '',
    note: existing ? (existing.note || '') : ''
  };

  const renderBody = () => {
    document.getElementById('modalBody').innerHTML = `
      ${sgErr ? `<div class="form-error-banner">${sgErr}</div>` : ''}
      <div class="form-grid-2">
        <div class="form-group">
          <label>Mã nhóm DV <span class="req-star">*</span></label>
          <input type="text" class="form-control" value="${tempSg.id}" disabled style="background:#f3f4f6;color:var(--text-muted);cursor:not-allowed;" />
        </div>
        <div class="form-group">
          <label>Tên nhóm DV <span class="req-star">*</span></label>
          <input type="text" id="sgNameInput" class="form-control" value="${tempSg.name}" placeholder="VD: Spa, Giặt ủi..." />
        </div>
      </div>
      <div class="form-group">
        <label>Ghi chú</label>
        <textarea id="sgNoteInput" class="form-control" rows="2" placeholder="Mô tả nhóm dịch vụ...">${tempSg.note}</textarea>
      </div>
    `;
  };

  openModal(
    existing ? `Sửa nhóm dịch vụ ${existing.id}` : 'Thêm nhóm dịch vụ mới',
    '',
    [
      ...(existing ? [{
        html: isCurrentlyActive ? ICON_STOP : ICON_PLAY,
        title: isCurrentlyActive ? 'Ngừng kinh doanh' : 'Mở kinh doanh lại',
        className: isCurrentlyActive ? 'btn btn-danger btn-icon' : 'btn btn-wood btn-icon',
        onClick: () => {
          existing.status = isCurrentlyActive ? 'Ngừng kinh doanh' : 'Đang kinh doanh';
          saveState();
          closeModal();
          renderServiceGroups();
        }
      }] : []),
      { label: 'Bỏ qua', className: 'btn btn-outline', onClick: closeModal },
      {
        label: 'Lưu',
        className: 'btn btn-primary',
        onClick: () => {
          tempSg.name = document.getElementById('sgNameInput').value.trim();
          tempSg.note = document.getElementById('sgNoteInput').value.trim();
          if (!tempSg.name) {
            sgErr = 'Vui lòng nhập tên nhóm dịch vụ (*).';
            renderBody();
            return;
          }
          if (existing) {
            Object.assign(existing, { name: tempSg.name, note: tempSg.note });
            state.services.forEach(s => {
              if (s.groupId === existing.id) s.group = tempSg.name;
            });
          } else {
            state.serviceGroups.push({ id: tempSg.id, name: tempSg.name, note: tempSg.note, status: 'Đang kinh doanh' });
          }
          saveState();
          closeModal();
          renderServiceGroups();
        }
      }
    ]
  );

  renderBody();
}

let serviceBizStatusTab = 'Đang kinh doanh';
let serviceSearchQuery = '';
let serviceGroupFilter = 'ALL';

function setServiceBizStatusTab(tab) {
  serviceBizStatusTab = tab;
  renderServices();
}

function toggleServiceStatus(srvId) {
  const srv = state.services.find(s => s.id === srvId);
  if (!srv) return;
  const current = srv.status || 'Đang kinh doanh';
  srv.status = current === 'Đang kinh doanh' ? 'Ngừng kinh doanh' : 'Đang kinh doanh';
  saveState();
  renderServices();
}

function generateNextServiceId() {
  let maxNum = 0;
  state.services.forEach(s => {
    const m = String(s.id).match(/^DV(\d+)$/i);
    if (m) {
      const n = Number(m[1]);
      if (n > maxNum) maxNum = n;
    }
  });
  return 'DV' + String(maxNum + 1).padStart(3, '0');
}

function renderServices() {
  const container = document.getElementById('view-services');
  const activeCount = state.services.filter(s => (s.status || 'Đang kinh doanh') === 'Đang kinh doanh').length;
  const stoppedCount = state.services.filter(s => (s.status || 'Đang kinh doanh') === 'Ngừng kinh doanh').length;

  const srvGroupOptions = [...new Set([
    ...(state.serviceGroups || []).map(g => g.name).filter(Boolean),
    ...(state.services || []).map(s => s.group || 'Spa').filter(Boolean)
  ])];

  const filtered = state.services.filter(s => {
    const st = s.status || 'Đang kinh doanh';
    if (st !== serviceBizStatusTab) return false;
    const grp = s.group || 'Spa';
    if (serviceGroupFilter !== 'ALL' && grp !== serviceGroupFilter) return false;
    if (serviceSearchQuery) {
      const q = serviceSearchQuery.toLowerCase();
      if (!s.id.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q) && !grp.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  container.innerHTML = `
    <div class="toolbar">
      <div class="sub-tabs" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">
        <button type="button" class="sub-tab-btn ${serviceBizStatusTab === 'Đang kinh doanh' ? 'active' : ''}" onclick="setServiceBizStatusTab('Đang kinh doanh')">
          Đang kinh doanh (${activeCount})
        </button>
        <button type="button" class="sub-tab-btn ${serviceBizStatusTab === 'Ngừng kinh doanh' ? 'active' : ''}" onclick="setServiceBizStatusTab('Ngừng kinh doanh')">
          Ngừng kinh doanh (${stoppedCount})
        </button>
      </div>
      <button class="btn btn-primary" onclick="openServiceCatalogModal()">+ Thêm dịch vụ</button>
    </div>

    <div class="toolbar">
      <div class="toolbar-filters">
        <input type="text" id="srvSearchInput" class="form-control" placeholder="Tìm mã dịch vụ, tên dịch vụ, nhóm..." value="${serviceSearchQuery}" />
        <select id="srvGroupFilter" class="form-control">
          <option value="ALL">Tất cả nhóm danh mục</option>
          ${srvGroupOptions.map(g => `<option value="${g}" ${serviceGroupFilter === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã DV</th>
                <th>Tên dịch vụ</th>
                <th>Đơn giá niêm yết</th>
                <th>Đơn vị tính</th>
                <th>Nhóm danh mục</th>
                <th>Trạng thái</th>
                <th style="width: 96px; text-align: center;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">Không có dịch vụ nào ở mục ${serviceBizStatusTab}.</td></tr>
              ` : filtered.map(s => {
                const st = s.status || 'Đang kinh doanh';
                const isActive = st === 'Đang kinh doanh';
                return `
                  <tr>
                    <td><strong>${s.id}</strong></td>
                    <td><strong>${s.name}</strong><div style="font-size:12px;color:var(--text-muted);">${s.detail || ''}</div></td>
                    <td><strong>${formatVND(s.price)}</strong></td>
                    <td>${s.unit}</td>
                    <td><span class="badge badge-wood">${s.group || 'Spa'}</span></td>
                    <td><span class="badge ${isActive ? 'badge-available' : 'badge-maintenance'}">${st}</span></td>
                    <td style="text-align:center;">
                      <div style="display:inline-flex; gap:6px; align-items:center;">
                        <button class="btn btn-outline btn-icon" title="Chỉnh sửa" onclick="openServiceCatalogModal('${s.id}')">${ICON_EDIT}</button>
                        <button class="btn ${isActive ? 'btn-danger' : 'btn-wood'} btn-icon" title="${isActive ? 'Ngừng kinh doanh' : 'Mở kinh doanh lại'}" onclick="toggleServiceStatus('${s.id}')">${isActive ? ICON_STOP : ICON_PLAY}</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('srvSearchInput').addEventListener('input', e => {
    serviceSearchQuery = e.target.value;
    renderServices();
    const el = document.getElementById('srvSearchInput');
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  });
  document.getElementById('srvGroupFilter')?.addEventListener('change', e => {
    serviceGroupFilter = e.target.value;
    renderServices();
  });
}

function openServiceCatalogModal(srvId = null) {
  const existing = srvId ? state.services.find(s => s.id === srvId) : null;
  const isCurrentlyActive = existing ? (existing.status || 'Đang kinh doanh') === 'Đang kinh doanh' : true;
  const SERVICE_CATEGORY_OPTIONS = [
    { id: 'NDV001', name: 'Spa' },
    { id: 'NDV002', name: 'Giặt ủi' },
    { id: 'NDV003', name: 'Đưa đón' },
    { id: 'NDV004', name: 'Tour tham quan' },
    { id: 'NDV005', name: 'Phí phạt vi phạm' }
  ];
  let srvErr = '';
  const tempSrv = {
    id: existing ? existing.id : generateNextServiceId(),
    name: existing ? existing.name : '',
    group: existing ? (existing.group || 'Spa') : 'Spa',
    groupId: existing ? (existing.groupId || 'NDV001') : 'NDV001',
    price: existing ? existing.price : '',
    unit: existing ? existing.unit : 'lượt',
    detail: existing ? (existing.detail || '') : ''
  };

  const renderBody = () => {
    const knownNames = new Set(SERVICE_CATEGORY_OPTIONS.map(o => o.name));
    const extraOpt = tempSrv.group && !knownNames.has(tempSrv.group)
      ? [`<option value="${tempSrv.group}" selected>${tempSrv.group}</option>`]
      : [];
    document.getElementById('modalBody').innerHTML = `
      ${srvErr ? `<div class="form-error-banner">${srvErr}</div>` : ''}
      <div class="form-grid-2">
        <div class="form-group">
          <label>Mã dịch vụ <span class="req-star">*</span></label>
          <input type="text" class="form-control" value="${tempSrv.id}" disabled style="background:#f3f4f6;color:var(--text-muted);cursor:not-allowed;" />
        </div>
        <div class="form-group">
          <label>Nhóm danh mục <span class="req-star">*</span></label>
          <select id="srvCatGroupInput" class="form-control">
            ${SERVICE_CATEGORY_OPTIONS.map(o => `<option value="${o.name}" ${tempSrv.group === o.name ? 'selected' : ''}>${o.name}</option>`).join('')}
            ${extraOpt.join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Tên dịch vụ <span class="req-star">*</span></label>
        <input type="text" id="srvCatNameInput" class="form-control" value="${tempSrv.name}" placeholder="VD: Massage body 60 phút" />
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Đơn giá niêm yết (VNĐ) <span class="req-star">*</span></label>
          <input type="number" id="srvCatPriceInput" class="form-control" value="${tempSrv.price}" step="10000" min="0" />
        </div>
        <div class="form-group">
          <label>Đơn vị tính <span class="req-star">*</span></label>
          <input type="text" id="srvCatUnitInput" class="form-control" value="${tempSrv.unit}" placeholder="lượt, người, món, chiều..." />
        </div>
      </div>
      <div class="form-group">
        <label>Mô tả / Ghi chú</label>
        <input type="text" id="srvCatDetailInput" class="form-control" value="${tempSrv.detail}" />
      </div>
    `;
  };

  openModal(
    existing ? `Sửa dịch vụ ${existing.id}` : 'Thêm dịch vụ mới',
    '',
    [
      ...(existing ? [{
        html: isCurrentlyActive ? ICON_STOP : ICON_PLAY,
        title: isCurrentlyActive ? 'Ngừng kinh doanh' : 'Mở kinh doanh lại',
        className: isCurrentlyActive ? 'btn btn-danger btn-icon' : 'btn btn-wood btn-icon',
        onClick: () => {
          existing.status = isCurrentlyActive ? 'Ngừng kinh doanh' : 'Đang kinh doanh';
          saveState();
          closeModal();
          renderServices();
        }
      }] : []),
      { label: 'Bỏ qua', className: 'btn btn-outline', onClick: closeModal },
      {
        label: 'Lưu',
        className: 'btn btn-primary',
        onClick: () => {
          const groupName = document.getElementById('srvCatGroupInput').value.trim();
          const matchedOpt = SERVICE_CATEGORY_OPTIONS.find(o => o.name === groupName);
          tempSrv.group = groupName;
          tempSrv.groupId = matchedOpt ? matchedOpt.id : (tempSrv.groupId || 'NDV001');
          tempSrv.name = document.getElementById('srvCatNameInput').value.trim();
          const priceRaw = String(document.getElementById('srvCatPriceInput').value).trim();
          tempSrv.unit = document.getElementById('srvCatUnitInput').value.trim();
          tempSrv.detail = document.getElementById('srvCatDetailInput').value.trim();

          if (!tempSrv.group || !tempSrv.name || priceRaw === '' || !tempSrv.unit) {
            srvErr = 'Vui lòng điền đầy đủ các thông tin bắt buộc (*).';
            renderBody();
            return;
          }
          const priceNum = Number(priceRaw) || 0;
          if (existing) {
            Object.assign(existing, { groupId: tempSrv.groupId, group: tempSrv.group, name: tempSrv.name, price: priceNum, unit: tempSrv.unit, detail: tempSrv.detail });
          } else {
            state.services.push({ id: tempSrv.id, groupId: tempSrv.groupId, group: tempSrv.group, name: tempSrv.name, price: priceNum, unit: tempSrv.unit, detail: tempSrv.detail, status: 'Đang kinh doanh' });
          }
          saveState();
          closeModal();
          renderServices();
        }
      }
    ]
  );

  renderBody();
}

// ============================================================================
// 6C. RENDER VIEW: DANH MỤC -> KHÁCH HÀNG
// ============================================================================
let customerSearchQuery = '';

function renderCustomers() {
  const container = document.getElementById('view-customers');
  if (!Array.isArray(state.customers)) state.customers = [];

  const filtered = state.customers.filter(c => {
    if (!customerSearchQuery) return true;
    const q = customerSearchQuery.toLowerCase();
    return (
      c.id.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-filters">
        <input type="text" id="custSearchInput" class="form-control" placeholder="Tìm mã KH, tên khách hàng, SĐT, email..." value="${customerSearchQuery}" />
      </div>
      <button class="btn btn-primary" onclick="openCustomerModal()">+ Thêm khách hàng</button>
    </div>

    <div class="card">
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã KH</th>
                <th>Tên khách hàng</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>CCCD / Hộ chiếu</th>
                <th style="width: 72px; text-align: center;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Không tìm thấy khách hàng phù hợp.</td></tr>
              ` : filtered.map(c => {
                return `
                  <tr>
                    <td><strong>${c.id}</strong></td>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.phone || '-'}</td>
                    <td>${c.email || '-'}</td>
                    <td>${c.idCard || '-'}</td>
                    <td style="text-align:center;">
                      <button class="btn btn-outline btn-icon" title="Chỉnh sửa" onclick="openCustomerModal('${c.id}')">${ICON_EDIT}</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('custSearchInput').addEventListener('input', e => {
    customerSearchQuery = e.target.value;
    renderCustomers();
    const el = document.getElementById('custSearchInput');
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  });
}

function openCustomerModal(custId = null) {
  const existing = custId ? state.customers.find(c => c.id === custId) : null;
  let custErr = '';

  let nextNum = 0;
  state.customers.forEach(c => {
    const m = String(c.id).match(/^KH(\d+)$/i);
    if (m) nextNum = Math.max(nextNum, Number(m[1]));
  });
  const autoCustId = 'KH' + String(nextNum + 1).padStart(3, '0');

  const tempC = {
    id: existing ? existing.id : autoCustId,
    name: existing ? existing.name : '',
    phone: existing ? (existing.phone || '') : '',
    email: existing ? (existing.email || '') : '',
    idCard: existing ? (existing.idCard || '') : '',
    note: existing ? (existing.note || '') : ''
  };

  const renderBody = () => {
    document.getElementById('modalBody').innerHTML = `
      ${custErr ? `<div class="form-error-banner">${custErr}</div>` : ''}
      <div class="form-grid-2">
        <div class="form-group">
          <label>Mã KH <span class="req-star">*</span></label>
          <input type="text" class="form-control" value="${tempC.id}" disabled style="background:#f3f4f6;color:var(--text-muted);cursor:not-allowed;" />
        </div>
        <div class="form-group">
          <label>Tên khách hàng <span class="req-star">*</span></label>
          <input type="text" id="custNameInput" class="form-control" value="${tempC.name}" placeholder="Nguyễn Văn A" />
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Số điện thoại <span class="req-star">*</span></label>
          <input type="text" id="custPhoneInput" class="form-control" value="${tempC.phone}" placeholder="0912 xxx xxx" />
        </div>
        <div class="form-group">
          <label>Email <span class="req-star">*</span></label>
          <input type="email" id="custEmailInput" class="form-control" value="${tempC.email}" placeholder="khachhang@email.com" />
        </div>
      </div>
      <div class="form-group">
        <label>CCCD / Hộ chiếu</label>
        <input type="text" id="custIdCardInput" class="form-control" value="${tempC.idCard}" />
      </div>
    `;
  };

  openModal(
    existing ? `Sửa thông tin khách hàng ${existing.id}` : 'Thêm khách hàng mới',
    '',
    [
      { label: 'Bỏ qua', className: 'btn btn-outline', onClick: closeModal },
      {
        label: 'Lưu',
        className: 'btn btn-primary',
        onClick: () => {
          tempC.name = document.getElementById('custNameInput').value.trim();
          tempC.phone = document.getElementById('custPhoneInput').value.trim();
          tempC.email = document.getElementById('custEmailInput').value.trim();
          tempC.idCard = document.getElementById('custIdCardInput').value.trim();
          tempC.note = existing ? (existing.note || '') : '';

          if (!tempC.name || !tempC.phone || !tempC.email) {
            custErr = 'Vui lòng nhập đầy đủ Tên khách hàng, Số điện thoại và Email (*).';
            renderBody();
            return;
          }

          if (existing) {
            Object.assign(existing, { name: tempC.name, phone: tempC.phone, email: tempC.email, idCard: tempC.idCard, note: tempC.note });
          } else {
            state.customers.unshift({ id: tempC.id, name: tempC.name, phone: tempC.phone, email: tempC.email, idCard: tempC.idCard, note: tempC.note, status: 'Đang hoạt động' });
          }
          saveState();
          closeModal();
          renderCustomers();
        }
      }
    ]
  );

  renderBody();
}

// 9. RENDER VIEW 4: QUẢN TRỊ VIÊN (QuanTriVien)
// ============================================================================
let staffRoleFilter = 'ALL';

function renderStaff() {
  const container = document.getElementById('view-staff');
  const roles = [...new Set(state.staff.map(s => s.role).filter(Boolean))];

  const filtered = state.staff.filter(s => {
    if (staffRoleFilter !== 'ALL' && s.role !== staffRoleFilter) return false;
    return true;
  });

  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-filters">
        <select id="staffRoleSelect" class="form-control">
          <option value="ALL">Tất cả vai trò (${state.staff.length} quản trị viên)</option>
          ${roles.map(r => `<option value="${r}" ${staffRoleFilter === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary" onclick="openStaffModal()">+ Thêm Quản trị viên</button>
    </div>

    <div class="card">
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã QTV</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Mật khẩu</th>
                <th>Vai trò</th>
                <th style="width: 96px; text-align: center;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Chưa có quản trị viên nào.</td></tr>
              ` : filtered.map(nv => `
                <tr>
                  <td><strong>${nv.id}</strong></td>
                  <td><strong>${nv.name}</strong></td>
                  <td>${nv.email || '-'}</td>
                  <td><span style="color:var(--text-muted);">••••••</span></td>
                  <td><span class="badge badge-pistachio">${nv.role}</span></td>
                  <td style="text-align: center;">
                    <div style="display:inline-flex; gap:6px; align-items:center;">
                      <button class="btn btn-outline btn-icon" title="Chỉnh sửa" onclick="openStaffModal('${nv.id}')">${ICON_EDIT}</button>
                      <button class="btn btn-danger btn-icon" title="Xóa" onclick="deleteStaff('${nv.id}')">${ICON_STOP}</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('staffRoleSelect').addEventListener('change', e => {
    staffRoleFilter = e.target.value;
    renderStaff();
  });
}

function openStaffModal(staffId = null) {
  const existing = staffId ? state.staff.find(s => s.id === staffId) : null;
  let adminErr = '';

  const renderBody = () => {
    document.getElementById('modalBody').innerHTML = `
      ${adminErr ? `<div class="form-error-banner">${adminErr}</div>` : ''}
      <div class="form-grid-2">
        <div class="form-group">
          <label>Họ tên <span class="req-star">*</span></label>
          <input type="text" id="nvNameInput" class="form-control" value="${existing ? existing.name : ''}" placeholder="Nguyễn Văn A" />
        </div>
        <div class="form-group">
          <label>Email <span class="req-star">*</span></label>
          <input type="email" id="nvEmailInput" class="form-control" value="${existing ? (existing.email || '') : ''}" placeholder="admin@velorahotel.vn" />
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Mật khẩu <span class="req-star">*</span></label>
          <input type="text" id="nvPassInput" class="form-control" value="${existing ? (existing.password || '123') : '123'}" />
        </div>
        <div class="form-group">
          <label>Vai trò <span class="req-star">*</span></label>
          <input type="text" id="nvRoleInput" class="form-control" value="${existing ? existing.role : 'Quản trị viên / Lễ tân'}" />
        </div>
      </div>
    `;
  };

  openModal(
    existing ? `Sửa Quản trị viên ${existing.id}` : 'Thêm Quản trị viên mới',
    '',
    [
      { label: 'Bỏ qua', className: 'btn btn-outline', onClick: closeModal },
      {
        label: 'Lưu',
        className: 'btn btn-primary',
        onClick: () => {
          const name = document.getElementById('nvNameInput').value.trim();
          const email = document.getElementById('nvEmailInput').value.trim();
          const password = document.getElementById('nvPassInput').value.trim();
          const role = document.getElementById('nvRoleInput').value.trim();
          if (!name || !email || !password || !role) {
            adminErr = 'Vui lòng nhập đầy đủ Họ tên, Email, Mật khẩu và Vai trò (*).';
            renderBody();
            return;
          }

          if (existing) {
            Object.assign(existing, { name, email, password, role });
          } else {
            let maxNum = 0;
            state.staff.forEach(s => {
              const m = String(s.id).match(/(\d+)$/);
              if (m) maxNum = Math.max(maxNum, Number(m[1]));
            });
            const newId = 'NV-' + String(maxNum + 1).padStart(3, '0');
            state.staff.push({ id: newId, name, email, password, role, department: 'Quản trị', shift: 'Toàn thời gian', phone: '', status: 'Đang làm việc' });
          }
          saveState();
          closeModal();
          renderStaff();
        }
      }
    ]
  );

  renderBody();
}

function deleteStaff(id) {
  if (confirm('Xóa quản trị viên này khỏi danh sách?')) {
    state.staff = state.staff.filter(s => s.id !== id);
    (state.bookings || []).forEach(b => { if (b.adminId === id) b.adminId = ''; });
    saveState();
    renderStaff();
  }
}

// ============================================================================
// 9B. CÁC BẢNG BỔ SUNG THEO CDTT.drawio: BẢNG GIÁ, NHÓM TIỆN ÍCH, PHÁT SINH, LỊCH SỬ THAY ĐỔI
// ============================================================================
let pricePlanStatusTab = 'Đang áp dụng';

function setPricePlanStatusTab(tab) {
  pricePlanStatusTab = tab;
  renderPricePlans();
}

function toggleHidePricePlan(bpId) {
  const bp = (state.pricePlans || []).find(p => p.id === bpId);
  if (!bp) return;
  const isHidden = (bp.status || 'Đang áp dụng') === 'Đã ẩn';
  bp.status = isHidden ? 'Đang áp dụng' : 'Đã ẩn';
  pricePlanStatusTab = isHidden ? 'Đang áp dụng' : 'Đã ẩn';
  saveState();
  renderPricePlans();
}

function renderPricePlans() {
  const container = document.getElementById('view-price-plans');
  if (!Array.isArray(state.pricePlans)) state.pricePlans = [];

  const allPlans = state.pricePlans.map(p => ({ ...p, status: p.status || 'Đang áp dụng' }));
  const activeCount = allPlans.filter(p => p.status === 'Đang áp dụng').length;
  const hiddenCount = allPlans.filter(p => p.status === 'Đã ẩn').length;
  const filteredPlans = allPlans.filter(p => p.status === pricePlanStatusTab);

  container.innerHTML = `
    <div class="toolbar">
      <div class="sub-tabs" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">
        <button type="button" class="sub-tab-btn ${pricePlanStatusTab === 'Đang áp dụng' ? 'active' : ''}" onclick="setPricePlanStatusTab('Đang áp dụng')">
          Đang áp dụng (${activeCount})
        </button>
        <button type="button" class="sub-tab-btn ${pricePlanStatusTab === 'Đã ẩn' ? 'active' : ''}" onclick="setPricePlanStatusTab('Đã ẩn')">
          Đã ẩn (${hiddenCount})
        </button>
      </div>
      <button class="btn btn-primary" onclick="openPricePlanModal()">+ Thêm bảng giá</button>
    </div>
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã bảng giá</th>
                <th>Loại phòng</th>
                <th>Ngày bắt đầu</th>
                <th>Ngày kết thúc</th>
                <th>Giá phòng</th>
                <th>Ghi chú</th>
                <th>Trạng thái</th>
                <th style="width: 100px; text-align: center;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPlans.length === 0 ? `
                <tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">Không có bảng giá nào ở mục ${pricePlanStatusTab}.</td></tr>
              ` : filteredPlans.map(bp => {
                const cat = getCategoryById(bp.categoryId);
                const isActive = bp.status === 'Đang áp dụng';
                return `
                  <tr>
                    <td><strong>${bp.id}</strong></td>
                    <td><strong>${cat ? cat.name : bp.categoryId}</strong></td>
                    <td>${bp.startDate || '-'}</td>
                    <td>${bp.endDate || 'Không giới hạn'}</td>
                    <td><strong>${formatVND(bp.price)}</strong></td>
                    <td>${bp.note || '-'}</td>
                    <td><span class="badge ${isActive ? 'badge-available' : 'badge-maintenance'}">${bp.status}</span></td>
                    <td style="text-align:center;">
                      <div style="display:inline-flex; gap:6px; align-items:center;">
                        <button class="btn btn-outline btn-icon" title="Chỉnh sửa" onclick="openPricePlanModal('${bp.id}')">${ICON_EDIT}</button>
                        <button class="btn ${isActive ? 'btn-danger' : 'btn-wood'} btn-icon" title="${isActive ? 'Ẩn bảng giá' : 'Hiện lại bảng giá'}" onclick="toggleHidePricePlan('${bp.id}')">${isActive ? ICON_STOP : ICON_PLAY}</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function openPricePlanModal(bpId = null) {
  if (!Array.isArray(state.pricePlans)) state.pricePlans = [];
  const existing = bpId ? state.pricePlans.find(p => p.id === bpId) : null;
  let maxNum = 0;
  state.pricePlans.forEach(p => {
    const m = String(p.id).match(/^BG(\d+)$/i);
    if (m) maxNum = Math.max(maxNum, Number(m[1]));
  });
  const nextId = 'BG' + String(maxNum + 1).padStart(3, '0');
  let errMsg = '';
  const isExistingHidden = existing ? (existing.status || 'Đang áp dụng') === 'Đã ẩn' : false;

  const renderBody = () => {
    document.getElementById('modalBody').innerHTML = `
      ${errMsg ? `<div class="form-error-banner">${errMsg}</div>` : ''}
      <div class="form-grid-2">
        <div class="form-group">
          <label>Mã bảng giá <span class="req-star">*</span></label>
          <input type="text" class="form-control" value="${existing ? existing.id : nextId}" disabled style="background:#f3f4f6;color:var(--text-muted);" />
        </div>
        <div class="form-group">
          <label>Loại phòng <span class="req-star">*</span></label>
          <select id="bpCatInput" class="form-control">
            ${state.roomCategories.map(c => `<option value="${c.id}" ${(existing ? existing.categoryId : state.roomCategories[0]?.id) === c.id ? 'selected' : ''}>${c.id} - ${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-grid-3">
        <div class="form-group">
          <label>Ngày bắt đầu <span class="req-star">*</span></label>
          <input type="date" id="bpStartInput" class="form-control" value="${existing ? existing.startDate : '2026-11-01'}" />
        </div>
        <div class="form-group">
          <label>Ngày kết thúc</label>
          <input type="date" id="bpEndInput" class="form-control" value="${existing ? (existing.endDate || '') : ''}" />
        </div>
        <div class="form-group">
          <label>Giá phòng (VNĐ) <span class="req-star">*</span></label>
          <input type="number" id="bpPriceInput" class="form-control" min="0" step="50000" value="${existing ? existing.price : 1400000}" />
        </div>
      </div>
      <div class="form-group">
        <label>Ghi chú</label>
        <input type="text" id="bpNoteInput" class="form-control" value="${existing ? (existing.note || '') : ''}" placeholder="VD: Giá mùa cao điểm..." />
      </div>
    `;
  };

  openModal(
    existing ? `Sửa Bảng giá ${existing.id}` : 'Thêm Bảng giá mới',
    '',
    [
      ...(existing ? [{
        label: isExistingHidden ? 'Hiện lại' : 'Ẩn',
        className: isExistingHidden ? 'btn btn-wood' : 'btn btn-danger',
        onClick: () => {
          existing.status = isExistingHidden ? 'Đang áp dụng' : 'Đã ẩn';
          pricePlanStatusTab = existing.status;
          saveState();
          closeModal();
          renderPricePlans();
        }
      }] : []),
      { label: 'Bỏ qua', className: 'btn btn-outline', onClick: closeModal },
      {
        label: 'Lưu',
        className: 'btn btn-primary',
        onClick: () => {
          const categoryId = document.getElementById('bpCatInput').value;
          const startDate = document.getElementById('bpStartInput').value;
          const endDate = document.getElementById('bpEndInput').value;
          const price = Number(document.getElementById('bpPriceInput').value) || 0;
          const note = document.getElementById('bpNoteInput').value.trim();

          if (!categoryId || !startDate || price <= 0) {
            errMsg = 'Vui lòng chọn Loại phòng, Ngày bắt đầu và Giá phòng (> 0).';
            renderBody();
            return;
          }
          if (existing) {
            Object.assign(existing, { categoryId, startDate, endDate, price, note, status: existing.status || 'Đang áp dụng' });
          } else {
            state.pricePlans.push({ id: nextId, categoryId, startDate, endDate, price, note, status: 'Đang áp dụng' });
          }
          saveState();
          closeModal();
          renderPricePlans();
        }
      }
    ]
  );
  renderBody();
}

function renderAmenityGroups() {
  const container = document.getElementById('view-amenity-groups');
  if (!Array.isArray(state.amenityGroups)) state.amenityGroups = [];

  container.innerHTML = `
    <div class="toolbar">
      <div></div>
      <button class="btn btn-primary" onclick="openAmenityGroupModal()">+ Thêm nhóm tiện ích</button>
    </div>
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã nhóm</th>
                <th>Tên nhóm</th>
                <th>SL tiện ích</th>
                <th style="width: 72px; text-align: center;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${state.amenityGroups.length === 0 ? `
                <tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px;">Chưa có nhóm tiện ích nào.</td></tr>
              ` : state.amenityGroups.map(g => {
                const count = (state.amenities || []).filter(a => a.groupId === g.id).length;
                return `
                  <tr>
                    <td><strong>${g.id}</strong></td>
                    <td><strong>${g.name}</strong></td>
                    <td>${count} tiện ích</td>
                    <td style="text-align:center;">
                      <button class="btn btn-outline btn-icon" title="Chỉnh sửa" onclick="openAmenityGroupModal('${g.id}')">${ICON_EDIT}</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function openAmenityGroupModal(grpId = null) {
  if (!Array.isArray(state.amenityGroups)) state.amenityGroups = [];
  const existing = grpId ? state.amenityGroups.find(g => g.id === grpId) : null;
  let maxNum = 0;
  state.amenityGroups.forEach(g => {
    const m = String(g.id).match(/^NTI(\d+)$/i);
    if (m) maxNum = Math.max(maxNum, Number(m[1]));
  });
  const nextId = 'NTI' + String(maxNum + 1).padStart(3, '0');
  let errMsg = '';

  const renderBody = () => {
    document.getElementById('modalBody').innerHTML = `
      ${errMsg ? `<div class="form-error-banner">${errMsg}</div>` : ''}
      <div class="form-grid-2">
        <div class="form-group">
          <label>Mã nhóm <span class="req-star">*</span></label>
          <input type="text" class="form-control" value="${existing ? existing.id : nextId}" disabled style="background:#f3f4f6;color:var(--text-muted);" />
        </div>
        <div class="form-group">
          <label>Tên nhóm <span class="req-star">*</span></label>
          <input type="text" id="ntiNameInput" class="form-control" value="${existing ? existing.name : ''}" placeholder="VD: Phòng tắm, Công nghệ..." />
        </div>
      </div>
    `;
  };

  openModal(
    existing ? `Sửa Nhóm tiện ích ${existing.id}` : 'Thêm Nhóm tiện ích',
    '',
    [
      { label: 'Bỏ qua', className: 'btn btn-outline', onClick: closeModal },
      {
        label: 'Lưu',
        className: 'btn btn-primary',
        onClick: () => {
          const name = document.getElementById('ntiNameInput').value.trim();
          if (!name) {
            errMsg = 'Vui lòng nhập Tên nhóm (*).';
            renderBody();
            return;
          }
          if (existing) {
            existing.name = name;
            (state.amenities || []).forEach(a => { if (a.groupId === existing.id) a.groupName = name; });
          } else {
            state.amenityGroups.push({ id: nextId, name });
          }
          saveState();
          closeModal();
          renderAmenityGroups();
        }
      }
    ]
  );
  renderBody();
}

// 10. RENDER VIEW 5: BÁO CÁO (DOANH THU TỔNG, DOANH THU DỊCH VỤ, TẦN SUẤT SỬ DỤNG PHÒNG)
// ============================================================================
let activeReportTab = 'revenue-total';
let reportFilterFrom = '';
let reportFilterTo = '';
let reportRoomCatFilter = 'ALL';

function setReportTab(tab) {
  switchView('report-' + tab);
}

function getReportDataset() {
  const getSt = bk => (typeof getBookingComputedStatus === 'function' ? getBookingComputedStatus(bk) : (bk.status || 'Chưa xác nhận'));
  const allBookings = Array.isArray(state.bookings) ? state.bookings : [];
  const allInvoices = Array.isArray(state.invoices) ? state.invoices : [];
  const inDateRange = dateStr => {
    if (!dateStr) return true;
    const d = String(dateStr).slice(0, 10);
    if (reportFilterFrom && d < reportFilterFrom) return false;
    if (reportFilterTo && d > reportFilterTo) return false;
    return true;
  };

  const bookingsInRange = allBookings.filter(b => inDateRange(b.checkIn || b.bookingTime));
  const activeBookings = bookingsInRange.filter(b => getSt(b) !== 'Đã hủy');
  const cancelFeeInvoices = allInvoices.filter(i => i.categoryType === 'Phí hủy phòng' && inDateRange(i.createdDate || i.createdTime));

  const getBookingServiceTotal = bk => {
    const fromBk = Array.isArray(bk.serviceItems)
      ? bk.serviceItems.reduce((s, it) => s + ((Number(it.qty) || 1) * (Number(it.price) || 0)), 0)
      : 0;
    if (fromBk > 0) return fromBk;
    const inv = allInvoices.find(i => i.bookingId === bk.id && i.categoryType !== 'Phí hủy phòng');
    return inv ? (Number(inv.serviceChargeTotal) || 0) : 0;
  };

  const totalRoomRevenue = activeBookings.reduce((s, b) => s + (Number(b.roomTotal) || 0), 0);
  const totalSurchargeRevenue = activeBookings.reduce((s, b) => s + (Number(b.surchargeTotal) || 0), 0);
  const totalServiceRevenue = activeBookings.reduce((s, b) => s + getBookingServiceTotal(b), 0);
  const totalCancelFeeRevenue = cancelFeeInvoices.reduce((s, i) => s + (Number(i.totalBeforeDeposit) || 0), 0);
  const grandTotalRevenue = totalRoomRevenue + totalSurchargeRevenue + totalServiceRevenue + totalCancelFeeRevenue;

  // Doanh thu theo hạng phòng
  const categoryRevenueStats = (state.roomCategories || []).map(cat => {
    let ordersCount = 0;
    let nightsCount = 0;
    let rev = 0;
    activeBookings.forEach(bk => {
      const n = Math.max(1, Number(bk.nights) || 1);
      const items = Array.isArray(bk.items) && bk.items.length > 0
        ? bk.items
        : [{ categoryId: bk.categoryId, qty: 1, unitPrice: cat.price }];
      const matched = items.filter(it => it.categoryId === cat.id);
      if (matched.length > 0) {
        ordersCount++;
        nightsCount += n;
        rev += matched.reduce((s, it) => s + ((Number(it.qty) || 1) * (Number(it.unitPrice) || cat.price || 0) * n), 0);
      }
    });
    return { cat, ordersCount, nightsCount, rev };
  });

  // Doanh thu dịch vụ chi tiết & theo nhóm
  const serviceMap = new Map();
  const groupRevenueMap = new Map();
  const catalogById = new Map((state.services || []).map(s => [s.id, s]));
  const catalogByName = new Map((state.services || []).map(s => [String(s.name || '').toLowerCase(), s]));

  activeBookings.forEach(bk => {
    let items = Array.isArray(bk.serviceItems) && bk.serviceItems.length > 0 ? bk.serviceItems : null;
    if (!items) {
      const inv = allInvoices.find(i => i.bookingId === bk.id && i.categoryType !== 'Phí hủy phòng');
      if (inv && Array.isArray(inv.serviceItems)) items = inv.serviceItems;
    }
    (items || []).forEach(it => {
      const catSrv = (it.serviceId && catalogById.get(it.serviceId)) || catalogByName.get(String(it.name || '').toLowerCase());
      const srvId = it.serviceId || catSrv?.id || it.name;
      const srvName = it.name || catSrv?.name || 'Dịch vụ';
      const groupName = catSrv?.group || 'Dịch vụ khác';
      const qty = Math.max(1, Number(it.qty) || 1);
      const unitPrice = Number(it.price) || Number(catSrv?.price) || 0;
      const amount = qty * unitPrice;

      if (!serviceMap.has(srvId)) {
        serviceMap.set(srvId, { id: catSrv?.id || srvId, name: srvName, group: groupName, unit: catSrv?.unit || 'Lần', qty: 0, bookingsCount: 0, unitPrice, revenue: 0 });
      }
      const entry = serviceMap.get(srvId);
      entry.qty += qty;
      entry.bookingsCount += 1;
      entry.revenue += amount;

      if (!groupRevenueMap.has(groupName)) groupRevenueMap.set(groupName, { group: groupName, qty: 0, revenue: 0 });
      const gEntry = groupRevenueMap.get(groupName);
      gEntry.qty += qty;
      gEntry.revenue += amount;
    });
  });

  const serviceBreakdown = Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue || b.qty - a.qty);
  const serviceGroupBreakdown = Array.from(groupRevenueMap.values()).sort((a, b) => b.revenue - a.revenue);
  const totalServiceUnits = serviceBreakdown.reduce((s, x) => s + x.qty, 0);

  // Tần suất sử dụng phòng theo từng phòng & hạng phòng
  const staysInRange = (state.checkins || []).filter(ci => inDateRange(ci.actualCheckIn || ci.expectedCheckIn));
  const roomUsageMap = new Map();
  (state.rooms || []).forEach(r => {
    const cat = getCategoryById(r.categoryId);
    const hasOpenStay = typeof getOpenStayForRoom === 'function' ? !!getOpenStayForRoom(r.id) : false;
    const isReserved = r.status === 'Đã đặt';
    const isActiveUse = hasOpenStay || r.status === 'Đang ở' || isReserved;
    roomUsageMap.set(r.id, {
      room: r,
      categoryId: r.categoryId,
      categoryName: cat ? cat.name : r.categoryId,
      stayCount: 0,
      holdCount: 0,
      nightsUsed: 0,
      currentStatus: hasOpenStay || r.status === 'Đang ở' ? 'Đang ở' : (isReserved ? 'Đã giữ chỗ' : 'Trống'),
      isActiveUse
    });
  });

  staysInRange.forEach(ci => {
    const rec = roomUsageMap.get(ci.roomId);
    if (!rec) return;
    const bk = allBookings.find(b => b.id === ci.bookingId);
    const nights = bk ? Math.max(1, Number(bk.nights) || 1) : 1;
    rec.stayCount += 1;
    rec.nightsUsed += nights;
  });
  activeBookings.forEach(bk => {
    if (getSt(bk) !== 'Đã xác nhận') return;
    const assignedIds = typeof getBookingAssignedRoomIds === 'function' ? getBookingAssignedRoomIds(bk) : (bk.roomId ? [bk.roomId] : []);
    const nights = Math.max(1, Number(bk.nights) || 1);
    assignedIds.forEach(rid => {
      const rec = roomUsageMap.get(rid);
      if (rec) {
        rec.holdCount += 1;
        rec.nightsUsed += nights;
      }
    });
  });

  const roomUsageList = Array.from(roomUsageMap.values())
    .sort((a, b) => (b.stayCount + b.holdCount) - (a.stayCount + a.holdCount) || b.nightsUsed - a.nightsUsed || a.room.id.localeCompare(b.room.id));

  const categoryUsageStats = (state.roomCategories || []).map(cat => {
    const roomsOfCat = (state.rooms || []).filter(r => r.categoryId === cat.id && (r.businessStatus || 'Đang kinh doanh') === 'Đang kinh doanh');
    const inUseNow = roomsOfCat.filter(r => roomUsageMap.get(r.id)?.isActiveUse).length;
    const occPct = roomsOfCat.length > 0 ? Math.round((inUseNow / roomsOfCat.length) * 100) : 0;
    const catUsageRows = roomUsageList.filter(u => u.categoryId === cat.id);
    const totalTurns = catUsageRows.reduce((s, u) => s + u.stayCount + u.holdCount, 0);
    const totalNights = catUsageRows.reduce((s, u) => s + u.nightsUsed, 0);
    const catRevRow = categoryRevenueStats.find(c => c.cat.id === cat.id);
    return { cat, totalRooms: roomsOfCat.length, inUseNow, occPct, totalTurns, totalNights, rev: catRevRow ? catRevRow.rev : 0 };
  });

  return {
    activeBookings,
    cancelFeeInvoices,
    totalRoomRevenue,
    totalSurchargeRevenue,
    totalServiceRevenue,
    totalCancelFeeRevenue,
    grandTotalRevenue,
    getBookingServiceTotal,
    categoryRevenueStats,
    serviceBreakdown,
    serviceGroupBreakdown,
    totalServiceUnits,
    roomUsageList,
    categoryUsageStats
  };
}

function renderReports() {
  const container = document.getElementById('view-reports');
  if (!container) return;
  if (typeof syncRoomReservationStates === 'function') syncRoomReservationStates();

  const ds = getReportDataset();
  const revenueSummaryRows = [
    {
      name: 'Doanh thu tiền phòng',
      amount: ds.totalRoomRevenue
    },
    {
      name: 'Doanh thu dịch vụ (Spa, Giặt ủi, Đưa đón, Tour...)',
      amount: ds.totalServiceRevenue
    },
    {
      name: 'Doanh thu phát sinh (Phụ thu giường phụ, trẻ em, nhận sớm/trả muộn)',
      amount: ds.totalSurchargeRevenue
    },
    {
      name: 'Phí hủy đặt phòng (Khấu trừ tiền cọc)',
      amount: ds.totalCancelFeeRevenue
    }
  ];

  const totalRoomsAll = ds.categoryUsageStats.reduce((s, c) => s + c.totalRooms, 0);
  const totalInUseAll = ds.categoryUsageStats.reduce((s, c) => s + c.inUseNow, 0);
  const totalTurnsAll = ds.categoryUsageStats.reduce((s, c) => s + c.totalTurns, 0);
  const totalNightsAll = ds.categoryUsageStats.reduce((s, c) => s + c.totalNights, 0);
  const overallOccPct = totalRoomsAll > 0 ? Math.round((totalInUseAll / totalRoomsAll) * 100) : 0;

  const filteredRoomUsage = reportRoomCatFilter === 'ALL'
    ? ds.roomUsageList
    : ds.roomUsageList.filter(u => u.categoryId === reportRoomCatFilter);

  let reportLabel = 'Báo cáo Doanh thu tổng';
  let tabContentHTML = '';

  if (activeReportTab === 'revenue-total') {
    reportLabel = 'Tổng hợp doanh thu tiền phòng, dịch vụ và các khoản phát sinh';
    tabContentHTML = `
      <div class="card" style="margin-bottom:0;">
        <div class="card-header">
          <div>
            <div class="card-title">Báo cáo Doanh thu tổng</div>
            <div class="card-subtitle">Tổng hợp theo từng nguồn thu của khách sạn</div>
          </div>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:55px; text-align:center;">STT</th>
                  <th>Khoản mục doanh thu</th>
                  <th style="text-align:right; width:170px;">Doanh thu (VNĐ)</th>
                  <th style="text-align:right; width:110px;">Tỷ trọng</th>
                </tr>
              </thead>
              <tbody>
                ${revenueSummaryRows.map((row, idx) => {
                  const pct = ds.grandTotalRevenue > 0 ? Math.round((row.amount / ds.grandTotalRevenue) * 100) : 0;
                  return `
                    <tr>
                      <td style="text-align:center;">${idx + 1}</td>
                      <td><strong>${row.name}</strong></td>
                      <td style="text-align:right;"><strong>${formatVND(row.amount)}</strong></td>
                      <td style="text-align:right;"><span class="badge badge-pistachio">${pct}%</span></td>
                    </tr>
                  `;
                }).join('')}
                <tr style="background:#f3f6f4; font-weight:700;">
                  <td colspan="2" style="text-align:center;">Tổng cộng doanh thu</td>
                  <td style="text-align:right; color:var(--primary-800); font-size:15px;">${formatVND(ds.grandTotalRevenue)}</td>
                  <td style="text-align:right;">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } else if (activeReportTab === 'revenue-service') {
    reportLabel = 'Thống kê doanh thu theo từng dịch vụ phát sinh';
    tabContentHTML = `
      <div class="card" style="margin-bottom:0;">
        <div class="card-header">
          <div>
            <div class="card-title">Báo cáo Doanh thu dịch vụ</div>
            <div class="card-subtitle">Số lượng sử dụng, đơn giá và doanh thu từng dịch vụ</div>
          </div>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive" style="max-height:460px; overflow-y:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:55px; text-align:center;">STT</th>
                  <th style="width:90px;">Mã DV</th>
                  <th>Tên dịch vụ</th>
                  <th>Nhóm dịch vụ</th>
                  <th style="text-align:center;">Số lượng</th>
                  <th style="text-align:right;">Đơn giá</th>
                  <th style="text-align:right;">Doanh thu (VNĐ)</th>
                  <th style="text-align:right; width:100px;">Tỷ trọng</th>
                </tr>
              </thead>
              <tbody>
                ${ds.serviceBreakdown.length === 0 ? `
                  <tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:24px;">Không có dịch vụ phát sinh trong khoảng thời gian đã chọn.</td></tr>
                ` : ds.serviceBreakdown.map((srv, idx) => {
                  const pct = ds.totalServiceRevenue > 0 ? Math.round((srv.revenue / ds.totalServiceRevenue) * 100) : 0;
                  return `
                    <tr>
                      <td style="text-align:center;">${idx + 1}</td>
                      <td><strong>${srv.id}</strong></td>
                      <td><strong>${srv.name}</strong></td>
                      <td><span class="badge badge-wood">${srv.group}</span></td>
                      <td style="text-align:center;">${srv.qty}</td>
                      <td style="text-align:right;">${formatVND(srv.unitPrice)}</td>
                      <td style="text-align:right;"><strong>${formatVND(srv.revenue)}</strong></td>
                      <td style="text-align:right;"><span class="badge badge-pistachio">${pct}%</span></td>
                    </tr>
                  `;
                }).join('')}
                ${ds.serviceBreakdown.length > 0 ? `
                  <tr style="background:#f3f6f4; font-weight:700;">
                    <td colspan="4" style="text-align:center;">Tổng cộng</td>
                    <td style="text-align:center;">${ds.totalServiceUnits}</td>
                    <td></td>
                    <td style="text-align:right; color:var(--primary-800); font-size:15px;">${formatVND(ds.totalServiceRevenue)}</td>
                    <td style="text-align:right;">100%</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } else {
    reportLabel = 'Thống kê tần suất sử dụng theo loại phòng';
    tabContentHTML = `
      <div class="card" style="margin-bottom:0;">
        <div class="card-header">
          <div>
            <div class="card-title">Báo cáo Tần suất sử dụng theo Loại phòng</div>
            <div class="card-subtitle">Tổng hợp lượt sử dụng, tổng đêm phòng và tỷ lệ lấp đầy</div>
          </div>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:55px; text-align:center;">STT</th>
                  <th style="width:95px;">Mã loại</th>
                  <th>Tên loại phòng</th>
                  <th style="text-align:center;">Số phòng</th>
                  <th style="text-align:center;">Lượt sử dụng</th>
                  <th style="text-align:center;">Tổng đêm phòng</th>
                  <th style="text-align:center;">Tỷ lệ lấp đầy</th>
                </tr>
              </thead>
              <tbody>
                ${ds.categoryUsageStats.map((c, idx) => `
                  <tr>
                    <td style="text-align:center;">${idx + 1}</td>
                    <td><strong>${c.cat.id}</strong></td>
                    <td><strong>${c.cat.name}</strong></td>
                    <td style="text-align:center;">${c.totalRooms}</td>
                    <td style="text-align:center;"><strong>${c.totalTurns}</strong></td>
                    <td style="text-align:center;"><strong>${c.totalNights}</strong></td>
                    <td style="text-align:center;"><span class="badge badge-pistachio">${c.occPct}%</span></td>
                  </tr>
                `).join('')}
                <tr style="background:#f3f6f4; font-weight:700;">
                  <td colspan="3" style="text-align:center;">Tổng cộng</td>
                  <td style="text-align:center;">${totalRoomsAll}</td>
                  <td style="text-align:center;">${totalTurnsAll}</td>
                  <td style="text-align:center;">${totalNightsAll}</td>
                  <td style="text-align:center;">${overallOccPct}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="toolbar">
      <div style="font-size:13.5px; color:var(--text-muted);">${reportLabel}</div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <input type="date" id="reportFromDate" class="form-control" style="width:auto;" value="${reportFilterFrom}" title="Từ ngày" />
        <span style="color:var(--text-muted); font-size:12.5px;">→</span>
        <input type="date" id="reportToDate" class="form-control" style="width:auto;" value="${reportFilterTo}" title="Đến ngày" />
        ${(reportFilterFrom || reportFilterTo) ? `<button type="button" id="reportClearDateBtn" class="btn btn-outline btn-sm">Xóa lọc ngày</button>` : ''}
        <button type="button" class="btn btn-outline" onclick="exportReportCSV()">⬇ Xuất CSV</button>
        <button type="button" class="btn btn-primary" onclick="openReportPrintModal()">In Báo cáo</button>
      </div>
    </div>

    ${tabContentHTML}
  `;

  document.getElementById('reportFromDate')?.addEventListener('change', e => {
    reportFilterFrom = e.target.value;
    renderReports();
  });
  document.getElementById('reportToDate')?.addEventListener('change', e => {
    reportFilterTo = e.target.value;
    renderReports();
  });
  document.getElementById('reportClearDateBtn')?.addEventListener('click', () => {
    reportFilterFrom = '';
    reportFilterTo = '';
    renderReports();
  });
  document.getElementById('reportRoomCatSelect')?.addEventListener('change', e => {
    reportRoomCatFilter = e.target.value;
    renderReports();
  });
}

function exportReportCSV() {
  const ds = getReportDataset();
  let rows = [];
  let fileName = 'Bao_Cao_Velora_Hotel_SaPa.csv';

  if (activeReportTab === 'revenue-total') {
    fileName = 'Bao_Cao_Doanh_Thu_Tong_Velora.csv';
    const pctOf = val => (ds.grandTotalRevenue > 0 ? Math.round((val / ds.grandTotalRevenue) * 100) + '%' : '0%');
    rows.push(['STT', 'Khoan Muc Doanh Thu', 'Doanh Thu (VND)', 'Ty Trong']);
    rows.push([1, 'Doanh thu tien phong', ds.totalRoomRevenue, pctOf(ds.totalRoomRevenue)]);
    rows.push([2, 'Doanh thu dich vu', ds.totalServiceRevenue, pctOf(ds.totalServiceRevenue)]);
    rows.push([3, 'Doanh thu phat sinh (Phu thu)', ds.totalSurchargeRevenue, pctOf(ds.totalSurchargeRevenue)]);
    rows.push([4, 'Phi huy dat phong', ds.totalCancelFeeRevenue, pctOf(ds.totalCancelFeeRevenue)]);
    rows.push(['', 'Tong cong doanh thu', ds.grandTotalRevenue, '100%']);
  } else if (activeReportTab === 'revenue-service') {
    fileName = 'Bao_Cao_Doanh_Thu_Dich_Vu_Velora.csv';
    rows.push(['Ma DV', 'Ten Dich Vu', 'Nhom Dich Vu', 'Don Vi', 'So Luong', 'Don Gia', 'Doanh Thu']);
    ds.serviceBreakdown.forEach(s => {
      rows.push([s.id, s.name, s.group, s.unit, s.qty, s.unitPrice, s.revenue]);
    });
  } else {
    fileName = 'Bao_Cao_Tan_Suat_Su_Dung_Phong_Velora.csv';
    rows.push(['STT', 'Ma Loai', 'Ten Loai Phong', 'So Phong', 'Luot Su Dung', 'Tong Dem Phong', 'Ty Le Lap Day']);
    ds.categoryUsageStats.forEach((c, idx) => {
      rows.push([idx + 1, c.cat.id, c.cat.name, c.totalRooms, c.totalTurns, c.totalNights, c.occPct + '%']);
    });
  }

  const csvContent = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function openReportPrintModal() {
  const ds = getReportDataset();
  const hotel = state.hotelInfo || {};
  const hotelName = hotel.name || 'Velora Hotel';
  const hotelAddr = hotel.address || 'Số 29, Đường Thác Bạc, Sa Pa, Lào Cai';
  const hotelPhone = hotel.hotline || hotel.phone || '0214 356 5555';
  const now = new Date();
  const printDateVi = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const fmtIsoVi = iso => {
    if (!iso) return 'Tất cả';
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
  };
  const periodLabel = (reportFilterFrom || reportFilterTo)
    ? `Từ ngày: ${fmtIsoVi(reportFilterFrom)} &nbsp;&nbsp; Đến ngày: ${fmtIsoVi(reportFilterTo)}`
    : 'Kỳ báo cáo: Toàn bộ dữ liệu hiện tại';

  let reportTitle = 'BÁO CÁO DOANH THU TỔNG';
  let tableHeadHTML = '';
  let tableBodyHTML = '';

  if (activeReportTab === 'revenue-total') {
    reportTitle = 'BÁO CÁO DOANH THU TỔNG';
    const summaryRows = [
      { name: 'Doanh thu tiền phòng', amount: ds.totalRoomRevenue },
      { name: 'Doanh thu dịch vụ', amount: ds.totalServiceRevenue },
      { name: 'Doanh thu phát sinh (Phụ thu)', amount: ds.totalSurchargeRevenue },
      { name: 'Phí hủy đặt phòng', amount: ds.totalCancelFeeRevenue }
    ];
    tableHeadHTML = `
      <tr>
        <th style="width:48px;">STT</th>
        <th>Khoản mục doanh thu</th>
        <th style="width:155px;">Doanh thu (VNĐ)</th>
        <th style="width:90px;">Tỷ trọng</th>
      </tr>
    `;
    tableBodyHTML = summaryRows.map((r, i) => {
      const pct = ds.grandTotalRevenue > 0 ? Math.round((r.amount / ds.grandTotalRevenue) * 100) : 0;
      return `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td>${r.name}</td>
          <td style="text-align:right;">${formatVND(r.amount)}</td>
          <td style="text-align:center;">${pct}%</td>
        </tr>
      `;
    }).join('') + `
      <tr class="report-total-row">
        <td colspan="2" style="text-align:center;">Tổng cộng</td>
        <td style="text-align:right;">${formatVND(ds.grandTotalRevenue)}</td>
        <td style="text-align:center;">100%</td>
      </tr>
    `;
  } else if (activeReportTab === 'revenue-service') {
    reportTitle = 'BÁO CÁO DOANH THU THEO DỊCH VỤ';
    tableHeadHTML = `
      <tr>
        <th style="width:45px;">STT</th>
        <th>Tên dịch vụ</th>
        <th style="width:130px;">Nhóm dịch vụ</th>
        <th style="width:90px;">Số lượng</th>
        <th style="width:140px;">Doanh thu (VNĐ)</th>
      </tr>
    `;
    tableBodyHTML = ds.serviceBreakdown.length === 0
      ? `<tr><td colspan="5" style="text-align:center; color:#6b7280;">Chưa có doanh thu dịch vụ phát sinh trong kỳ báo cáo.</td></tr>`
      : ds.serviceBreakdown.map((srv, idx) => `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${srv.name}</td>
            <td>${srv.group}</td>
            <td style="text-align:center;">${srv.qty}</td>
            <td style="text-align:right;">${formatVND(srv.revenue)}</td>
          </tr>
        `).join('') + `
          <tr class="report-total-row">
            <td colspan="3" style="text-align:center;">Tổng cộng</td>
            <td style="text-align:center;">${ds.totalServiceUnits}</td>
            <td style="text-align:right;">${formatVND(ds.totalServiceRevenue)}</td>
          </tr>
        `;
  } else {
    reportTitle = 'BÁO CÁO TẦN SUẤT SỬ DỤNG PHÒNG';
    tableHeadHTML = `
      <tr>
        <th style="width:45px;">STT</th>
        <th style="width:90px;">Mã loại</th>
        <th>Tên loại phòng</th>
        <th style="width:80px;">Số phòng</th>
        <th style="width:90px;">Lượt dùng</th>
        <th style="width:95px;">Tổng đêm</th>
        <th style="width:110px;">Tỷ lệ lấp đầy</th>
      </tr>
    `;
    const totalRoomsAll = ds.categoryUsageStats.reduce((s, c) => s + c.totalRooms, 0);
    const totalInUseAll = ds.categoryUsageStats.reduce((s, c) => s + c.inUseNow, 0);
    const totalTurnsAll = ds.categoryUsageStats.reduce((s, c) => s + c.totalTurns, 0);
    const totalNightsAll = ds.categoryUsageStats.reduce((s, c) => s + c.totalNights, 0);
    const avgOccPct = totalRoomsAll > 0 ? Math.round((totalInUseAll / totalRoomsAll) * 100) : 0;

    tableBodyHTML = ds.categoryUsageStats.map((c, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="text-align:center;">${c.cat.id}</td>
        <td>${c.cat.name}</td>
        <td style="text-align:center;">${c.totalRooms}</td>
        <td style="text-align:center;">${c.totalTurns}</td>
        <td style="text-align:center;">${c.totalNights}</td>
        <td style="text-align:center;">${c.occPct}%</td>
      </tr>
    `).join('') + `
      <tr class="report-total-row">
        <td colspan="3" style="text-align:center;">Tổng cộng</td>
        <td style="text-align:center;">${totalRoomsAll}</td>
        <td style="text-align:center;">${totalTurnsAll}</td>
        <td style="text-align:center;">${totalNightsAll}</td>
        <td style="text-align:center;">${avgOccPct}%</td>
      </tr>
    `;
  }

  openModal(
    `Xem & In ${reportTitle}`,
    `
      <div class="report-print-sheet">
        <div class="report-print-head">
          <div>
            <strong>${hotelName}</strong><br/>
            <span>Địa chỉ: ${hotelAddr}</span><br/>
            <span>Điện thoại: ${hotelPhone}</span>
          </div>
          <div style="text-align:right; font-weight:600;">
            Ngày in báo cáo: ${printDateVi}
          </div>
        </div>

        <div class="report-print-title">
          <h4>${reportTitle}</h4>
          <div class="report-period">${periodLabel}</div>
        </div>

        <table class="report-print-table">
          <thead>${tableHeadHTML}</thead>
          <tbody>${tableBodyHTML}</tbody>
        </table>

        <div class="report-print-signatures">
          <div class="report-print-sign-col">
            <strong>Giám đốc khách sạn</strong>
            <span>(Ký và ghi rõ họ tên)</span>
          </div>
          <div class="report-print-sign-col">
            <strong>Người lập báo cáo</strong>
            <span>(Ký và ghi rõ họ tên)</span>
          </div>
        </div>
      </div>
    `,
    [
      { label: 'In báo cáo', className: 'btn btn-wood', onClick: () => window.print() },
      { label: 'Đóng', className: 'btn btn-outline', onClick: closeModal }
    ]
  );
}

// ============================================================================
// 11. MODAL HELPER
// ============================================================================
function openModal(title, bodyHtml, buttons = []) {
  const modal = document.getElementById('commonModal');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;

  const footer = document.getElementById('modalFooter');
  footer.innerHTML = '';
  buttons.forEach(btnCfg => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = btnCfg.className || 'btn btn-outline';
    if (btnCfg.title) btn.title = btnCfg.title;
    if (btnCfg.html) {
      btn.innerHTML = btnCfg.html;
    } else {
      btn.textContent = btnCfg.label;
    }
    btn.addEventListener('click', btnCfg.onClick);
    footer.appendChild(btn);
  });

  modal.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('commonModal').classList.add('hidden');
}

document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
document.getElementById('commonModal').addEventListener('click', (e) => {
  if (e.target.id === 'commonModal') closeModal();
});

// ============================================================================
// KHỞI ĐỘNG ỨNG DỤNG
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initNavigation();
  autoCancelNoShowBookings();
  if (typeof syncRoomReservationStates === 'function') syncRoomReservationStates();
  updateSidebarCounters();

  setInterval(() => {
    if (autoCancelNoShowBookings()) {
      if (currentView === 'bookings') renderBookings();
      else if (currentView === 'dashboard') renderDashboard();
    }
  }, 30000);
});
