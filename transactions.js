// ============================================================================
// VELORA HOTEL - PHÂN HỆ GIAO DỊCH (ĐẶT PHÒNG & THANH TOÁN)
// ============================================================================

let bookingStatusTab = 'ALL';
let bookingSearchQuery = '';
let invoiceSearchQuery = '';
let invoiceTypeFilter = 'ALL';

// -------------------- HÀM TIỆN ÍCH NGHIỆP VỤ --------------------
function calcNightsDiff(inDate, outDate) {
  if (!inDate || !outDate) return 1;
  const d1 = new Date(inDate);
  const d2 = new Date(outDate);
  const diff = Math.round((d2 - d1) / 86400000);
  return diff >= 1 ? diff : 1;
}

function formatFullDateTimeVi(dtStr, fallbackTime = '') {
  if (!dtStr && !fallbackTime) return '-';
  const raw = String(dtStr || '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2}))?/);
  if (!m) return raw;
  const tm = m[4] || fallbackTime;
  return `${m[3]}/${m[2]}/${m[1]}${tm ? ' ' + tm : ''}`;
}

function formatCheckinTimeDisplay(dt) {
  if (!dt) return '-';
  return String(dt).replace('T', ' ');
}

function generateNextBookingId() {
  let maxNum = 0;
  (state.bookings || []).forEach(b => {
    const m = String(b.id).match(/^DP(\d+)$/i);
    if (m && Number(m[1]) > maxNum) maxNum = Number(m[1]);
  });
  return 'DP' + String(maxNum + 1).padStart(3, '0');
}

function generateNextCustomerId() {
  let maxNum = 0;
  (state.customers || []).forEach(c => {
    const m = String(c.id).match(/^KH(\d+)$/i);
    if (m && Number(m[1]) > maxNum) maxNum = Number(m[1]);
  });
  (state.bookings || []).forEach(b => {
    const m = String(b.customerId || '').match(/^KH(\d+)$/i);
    if (m && Number(m[1]) > maxNum) maxNum = Number(m[1]);
  });
  return 'KH' + String(maxNum + 1).padStart(3, '0');
}

function generateNextInvoiceId() {
  let maxNum = 0;
  (state.invoices || []).forEach(inv => {
    const m = String(inv.id).match(/^HD(\d+)$/i);
    if (m && Number(m[1]) > maxNum) maxNum = Number(m[1]);
  });
  return 'HD' + String(maxNum + 1).padStart(3, '0');
}

function generateNextCheckinId() {
  let maxNum = 0;
  (state.checkins || []).forEach(ci => {
    const m = String(ci.id).match(/^(?:LT|NP)(\d+)$/i);
    if (m && Number(m[1]) > maxNum) maxNum = Number(m[1]);
  });
  return 'LT' + String(maxNum + 1).padStart(3, '0');
}

function getCheckinComputedStatus(ci) {
  if (!ci) return 'Đang lưu trú';
  if (ci.actualCheckOut || ci.status === 'Đã trả phòng' || ci.status === 'Hoàn thành') return 'Đã trả phòng';
  return 'Đang lưu trú';
}

function getBookingComputedStatus(bk) {
  if (!bk) return 'Chưa xác nhận';
  if (bk.cancelled || bk.status === 'Đã hủy') return 'Đã hủy';
  if (bk.checkedOutPaid || bk.status === 'Hoàn thành') return 'Hoàn thành';
  const bkStays = (state.checkins || []).filter(c => c.bookingId === bk.id);
  if (bkStays.some(c => getCheckinComputedStatus(c) === 'Đang lưu trú') || bk.status === 'Đang lưu trú') {
    return 'Đang lưu trú';
  }
  if (bk.depositPaid || bk.status === 'Đã xác nhận' || bk.status === 'Đang xử lý') {
    return 'Đã xác nhận';
  }
  return 'Chưa xác nhận';
}

function renderBookingStatusBadge(status) {
  if (status === 'Đang lưu trú' || status === 'Đang xử lý') return `<span class="badge badge-occupied">${status}</span>`;
  if (status === 'Đã xác nhận') return `<span class="badge badge-pistachio">${status}</span>`;
  if (status === 'Hoàn thành') return `<span class="badge badge-available">${status}</span>`;
  if (status === 'Chưa xác nhận') return `<span class="badge badge-reserved">${status}</span>`;
  if (status === 'Đã hủy') return `<span class="badge badge-maintenance">${status}</span>`;
  return `<span class="badge badge-pistachio">${status}</span>`;
}

function getRoomNameById(roomId) {
  if (!roomId) return '';
  const rm = (state.rooms || []).find(r => r.id === roomId);
  return rm && rm.name ? rm.name : roomId;
}

function getBookingAssignedRoomIds(bk) {
  if (!bk) return [];
  if (Array.isArray(bk.roomIds) && bk.roomIds.length > 0) return bk.roomIds.filter(Boolean);
  return bk.roomId ? [bk.roomId] : [];
}

function getRoomOccupancyMaps(excludeBookingId = null) {
  const openStayByRoom = new Map();
  (state.checkins || []).forEach(ci => {
    if (getCheckinComputedStatus(ci) === 'Đang lưu trú' && ci.roomId) {
      openStayByRoom.set(ci.roomId, ci);
    }
  });
  const reservedByRoom = new Map();
  (state.bookings || []).forEach(bk => {
    if (excludeBookingId && bk.id === excludeBookingId) return;
    if (getBookingComputedStatus(bk) !== 'Đã xác nhận') return;
    getBookingAssignedRoomIds(bk).forEach(rid => {
      if (!reservedByRoom.has(rid)) reservedByRoom.set(rid, bk);
    });
  });
  return { openStayByRoom, reservedByRoom };
}

function isRoomSelectableForHold(room, openStayByRoom, reservedByRoom) {
  if (!room) return false;
  if ((room.businessStatus || 'Đang kinh doanh') !== 'Đang kinh doanh') return false;
  if (openStayByRoom.has(room.id) || reservedByRoom.has(room.id)) return false;
  if (room.status === 'Đang ở' || room.status === 'Đang dọn' || room.status === 'Bảo trì') return false;
  return true;
}

function allocateRoomsForBooking(items, excludeBookingId = null, preferredIds = [], customMaps = null) {
  const { openStayByRoom, reservedByRoom } = customMaps || getRoomOccupancyMaps(excludeBookingId);
  const safeItems = Array.isArray(items) && items.length > 0 ? items : [{ categoryId: 'HP001', qty: 1 }];
  const slots = [];
  const used = new Set();
  const prefPool = Array.isArray(preferredIds) ? preferredIds.filter(Boolean) : [];
  let flatIdx = 0;

  safeItems.forEach(it => {
    const cat = getCategoryById(it.categoryId);
    const count = Math.max(1, Number(it.qty) || 1);
    for (let k = 0; k < count; k++) {
      let pickedId = '';
      const exactPref = prefPool[flatIdx];
      const exactRoom = exactPref ? (state.rooms || []).find(r => r.id === exactPref) : null;
      if (exactRoom && exactRoom.categoryId === it.categoryId && !used.has(exactRoom.id) && isRoomSelectableForHold(exactRoom, openStayByRoom, reservedByRoom)) {
        pickedId = exactRoom.id;
      } else {
        const sameCatPref = prefPool.find(pid => {
          if (used.has(pid)) return false;
          const r = (state.rooms || []).find(rm => rm.id === pid);
          return r && r.categoryId === it.categoryId && isRoomSelectableForHold(r, openStayByRoom, reservedByRoom);
        });
        if (sameCatPref) {
          pickedId = sameCatPref;
        } else {
          const fallback = (state.rooms || []).find(r => r.categoryId === it.categoryId && !used.has(r.id) && isRoomSelectableForHold(r, openStayByRoom, reservedByRoom));
          if (fallback) pickedId = fallback.id;
        }
      }
      if (pickedId) used.add(pickedId);
      slots.push({
        categoryId: it.categoryId,
        categoryName: cat ? cat.name : it.categoryId,
        slotIndex: k + 1,
        slotTotal: count,
        roomId: pickedId
      });
      flatIdx++;
    }
  });
  return slots;
}

function syncRoomReservationStates() {
  if (!Array.isArray(state.rooms)) return;
  const { openStayByRoom } = getRoomOccupancyMaps(null);
  const reservedByRoom = new Map();

  (state.bookings || []).forEach(bk => {
    if (getBookingComputedStatus(bk) !== 'Đã xác nhận') return;
    let bkRoomIds = getBookingAssignedRoomIds(bk).filter(rid => !openStayByRoom.has(rid) && !reservedByRoom.has(rid));
    const neededCount = (Array.isArray(bk.items) && bk.items.length > 0)
      ? bk.items.reduce((s, it) => s + Math.max(1, Number(it.qty) || 1), 0)
      : 1;
    if (bkRoomIds.length < neededCount) {
      const items = (Array.isArray(bk.items) && bk.items.length > 0) ? bk.items : [{ categoryId: bk.categoryId || 'HP001', qty: 1 }];
      const allocated = allocateRoomsForBooking(items, bk.id, bkRoomIds, { openStayByRoom, reservedByRoom });
      bkRoomIds = allocated.map(s => s.roomId).filter(Boolean);
      bk.roomIds = bkRoomIds;
      bk.roomId = bkRoomIds[0] || '';
    } else if (!Array.isArray(bk.roomIds) || bk.roomIds.length === 0) {
      bk.roomIds = bkRoomIds;
      bk.roomId = bkRoomIds[0] || '';
    }
    bkRoomIds.forEach(rid => {
      if (!reservedByRoom.has(rid)) reservedByRoom.set(rid, bk);
    });
  });

  state.rooms.forEach(r => {
    if (openStayByRoom.has(r.id)) {
      r.status = 'Đang ở';
      r.currentGuest = openStayByRoom.get(r.id).guestName || r.currentGuest || '';
    } else if (reservedByRoom.has(r.id)) {
      r.status = 'Đã đặt';
      r.currentGuest = reservedByRoom.get(r.id).guestName || '';
    } else if (r.status === 'Đang ở' || r.status === 'Đã đặt') {
      r.status = 'Trống';
      r.currentGuest = '';
    }
  });
}

function getBookingNightlyRate(bk) {
  if (!bk) return 1400000;
  if (Array.isArray(bk.items) && bk.items.length > 0) {
    return bk.items.reduce((sum, it) => sum + ((Number(it.qty) || 1) * (Number(it.unitPrice) || 0)), 0);
  }
  const cat = getCategoryById(bk.categoryId);
  return cat ? cat.price : 1400000;
}

function calcEarlyCheckinDetails(bk, actualCheckInStr) {
  const rate = getBookingNightlyRate(bk);
  if (!bk || !bk.checkIn || !actualCheckInStr) {
    return { fee: 0, label: 'Đúng giờ quy định (14:00)', percent: 0, dailyRate: rate };
  }
  const actual = new Date(actualCheckInStr);
  const stdIn = new Date(`${bk.checkIn}T14:00`);
  const earlySix = new Date(`${bk.checkIn}T06:00`);
  const checkInDateLabel = formatFullDateTimeVi(bk.checkIn);
  if (isNaN(actual.getTime()) || actual >= stdIn) {
    return { fee: 0, label: `Nhận từ 14:00 ngày ${checkInDateLabel} → Đúng giờ quy định (0%)`, percent: 0, dailyRate: rate };
  }
  if (actual < earlySix) {
    return { fee: rate, label: `Nhận trước 06:00 ngày ${checkInDateLabel} → Phụ thu +100% giá phòng/ngày`, percent: 100, dailyRate: rate };
  }
  return { fee: Math.round(rate * 0.5), label: `Nhận 06:00 – trước 14:00 ngày ${checkInDateLabel} → Phụ thu +50% giá phòng/ngày`, percent: 50, dailyRate: rate };
}

function calcLateCheckoutDetails(bk, actualCheckOutStr) {
  const rate = getBookingNightlyRate(bk);
  if (!bk || !bk.checkOut || !actualCheckOutStr) {
    return { fee: 0, label: 'Đúng giờ quy định (12:00)', percent: 0, dailyRate: rate };
  }
  const actual = new Date(actualCheckOutStr);
  const stdOut = new Date(`${bk.checkOut}T12:00`);
  const lateSixPm = new Date(`${bk.checkOut}T18:00`);
  const outDateLabel = formatFullDateTimeVi(bk.checkOut);
  if (isNaN(actual.getTime()) || actual <= stdOut) {
    return {
      fee: 0,
      label: `Trả phòng sớm / đúng hạn (trước 12:00 ngày ${outDateLabel}) → Giữ nguyên toàn bộ số ngày ban đầu, không trừ tiền (0%)`,
      percent: 0,
      dailyRate: rate
    };
  }
  if (actual <= lateSixPm) {
    return { fee: Math.round(rate * 0.5), label: `Trả muộn 12:00 – 18:00 ngày ${outDateLabel} → Phụ thu +50% giá phòng/ngày`, percent: 50, dailyRate: rate };
  }
  const extraDays = Math.max(1, Math.ceil((actual - stdOut) / 86400000));
  return {
    fee: rate * extraDays,
    label: `Trả muộn sau 18:00 ngày ${outDateLabel} → Phụ thu +${extraDays * 100}% giá phòng/ngày`,
    percent: extraDays * 100,
    dailyRate: rate
  };
}

function recordCancelFeeInvoiceIfForfeited(bk, cancelDate, feePercent, ruleLabel, feeAmount) {
  if (!bk || !(Number(feeAmount) > 0)) return null;
  if (!Array.isArray(state.invoices)) state.invoices = [];
  const dup = state.invoices.find(inv => inv.bookingId === bk.id && inv.categoryType === 'Phí hủy phòng');
  if (dup) return dup;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dDate = cancelDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const categorySummary = [...new Set((bk.items || []).map(it => getCategoryById(it.categoryId)?.name || it.categoryId).filter(Boolean))].join(', ') || '-';
  const inv = {
    id: generateNextInvoiceId(),
    bookingId: bk.id,
    customerId: bk.customerId || '',
    guestName: bk.guestName || 'Khách hàng',
    roomId: '-',
    roomNames: '-',
    categoryName: categorySummary,
    createdDate: dDate,
    createdTime: `${dDate} ${hhmm}`,
    categoryType: 'Phí hủy phòng',
    roomCharge: 0,
    surchargeAmount: Number(feeAmount),
    serviceItems: [{
      name: `Phí hủy đặt phòng (${feePercent}% tiền cọc)`,
      qty: 1,
      price: Number(feeAmount),
      note: ruleLabel || ''
    }],
    serviceChargeTotal: Number(feeAmount),
    totalBeforeDeposit: Number(feeAmount),
    depositPaid: Number(feeAmount),
    finalPayable: 0,
    paymentMethod: 'Khấu trừ tiền cọc',
    status: 'Đã thanh toán'
  };
  state.invoices.unshift(inv);
  return inv;
}

function autoCancelNoShowBookings() {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let changed = false;
  (state.bookings || []).forEach(bk => {
    const st = getBookingComputedStatus(bk);
    if (st === 'Hoàn thành' || st === 'Đã hủy' || st === 'Đang lưu trú') return;
    if ((state.checkins || []).some(c => c.bookingId === bk.id)) return;
    if (!bk.checkIn) return;
    const endOfCheckInDay = new Date(`${bk.checkIn}T23:59:59`);
    if (isNaN(endOfCheckInDay.getTime())) return;
    const createdAt = bk.bookingTime ? new Date(String(bk.bookingTime).replace(' ', 'T')) : null;
    if (createdAt && !isNaN(createdAt.getTime()) && createdAt > new Date(`${bk.checkIn}T14:00`)) return;
    if (now > endOfCheckInDay) {
      bk.cancelled = true;
      bk.status = 'Đã hủy';
      bk.autoCancelled = true;
      bk.cancelDate = todayStr;
      bk.roomIds = [];
      bk.roomId = '';
      bk.cancelFee = bk.depositPaid ? (bk.depositAmount || 0) : 0;
      bk.cancelReason = `Quá ngày nhận phòng (${bk.checkIn}) khách không đến`;
      recordCancelFeeInvoiceIfForfeited(bk, todayStr, 100, 'Quá ngày nhận phòng (No-show): Thu 100% tiền cọc', bk.cancelFee);
      recordBookingHistory(bk.id, 'Tự động hủy No-show', st, 'Đã hủy');
      changed = true;
    }
  });
  if (changed) {
    syncRoomReservationStates();
    saveState();
  }
  return changed;
}

// -------------------- DANH MỤC: ĐẶT PHÒNG --------------------
function setBookingStatusTab(tab) {
  bookingStatusTab = tab;
  renderBookings();
}

function renderBookings() {
  autoCancelNoShowBookings();
  const container = document.getElementById('view-bookings');
  if (!container) return;

  const allCount = state.bookings.length;
  const unconfirmedCount = state.bookings.filter(bk => getBookingComputedStatus(bk) === 'Chưa xác nhận').length;
  const confirmedCount = state.bookings.filter(bk => getBookingComputedStatus(bk) === 'Đã xác nhận').length;
  const stayingCount = state.bookings.filter(bk => getBookingComputedStatus(bk) === 'Đang lưu trú').length;
  const completedCount = state.bookings.filter(bk => getBookingComputedStatus(bk) === 'Hoàn thành').length;
  const cancelledCount = state.bookings.filter(bk => getBookingComputedStatus(bk) === 'Đã hủy').length;

  const filtered = state.bookings.filter(bk => {
    const computedStatus = getBookingComputedStatus(bk);
    if (bookingStatusTab !== 'ALL' && computedStatus !== bookingStatusTab) return false;
    if (bookingSearchQuery) {
      const q = bookingSearchQuery.toLowerCase();
      return (
        bk.id.toLowerCase().includes(q) ||
        (bk.guestName || '').toLowerCase().includes(q) ||
        (bk.phone || '').toLowerCase().includes(q) ||
        (bk.source || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const isCancelledTab = bookingStatusTab === 'Đã hủy';

  container.innerHTML = `
    <div class="toolbar">
      <div class="sub-tabs" style="margin-bottom:0; border-bottom:none; padding-bottom:0;">
        <button type="button" class="sub-tab-btn ${bookingStatusTab === 'ALL' ? 'active' : ''}" onclick="setBookingStatusTab('ALL')">Tất cả (${allCount})</button>
        <button type="button" class="sub-tab-btn ${bookingStatusTab === 'Chưa xác nhận' ? 'active' : ''}" onclick="setBookingStatusTab('Chưa xác nhận')">Chưa xác nhận (${unconfirmedCount})</button>
        <button type="button" class="sub-tab-btn ${bookingStatusTab === 'Đã xác nhận' ? 'active' : ''}" onclick="setBookingStatusTab('Đã xác nhận')">Đã xác nhận (${confirmedCount})</button>
        <button type="button" class="sub-tab-btn ${bookingStatusTab === 'Đang lưu trú' ? 'active' : ''}" onclick="setBookingStatusTab('Đang lưu trú')">Đang lưu trú (${stayingCount})</button>
        <button type="button" class="sub-tab-btn ${bookingStatusTab === 'Hoàn thành' ? 'active' : ''}" onclick="setBookingStatusTab('Hoàn thành')">Hoàn thành (${completedCount})</button>
        <button type="button" class="sub-tab-btn ${bookingStatusTab === 'Đã hủy' ? 'active' : ''}" onclick="setBookingStatusTab('Đã hủy')">Đã hủy (${cancelledCount})</button>
      </div>
      <button type="button" class="btn btn-primary" onclick="openBookingModal()">+ Tạo đơn đặt phòng</button>
    </div>

    <div class="toolbar">
      <div class="toolbar-filters">
        <input type="text" id="bkSearchInput" class="form-control" placeholder="Tìm mã đặt phòng, tên khách, SĐT..." value="${bookingSearchQuery}" />
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding:0;">
        <div class="table-responsive">
          <table class="data-table compact-table">
            <thead>
              <tr>
                <th style="width:48px; text-align:center;">STT</th>
                <th>Mã đặt phòng</th>
                <th>Nguồn tạo</th>
                <th>Thời gian tạo</th>
                <th>Khách hàng</th>
                <th>Ngày nhận</th>
                <th>Ngày trả</th>
                <th style="text-align:right;">Tiền cọc</th>
                <th style="text-align:right;">Tổng tiền</th>
                <th style="text-align:right;">${isCancelledTab ? 'Số tiền hoàn trả' : 'Còn cần trả'}</th>
                <th style="text-align:center;">Trạng thái</th>
                <th style="width:60px; text-align:center;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr><td colspan="12" style="text-align:center; color:var(--text-muted); padding:24px;">Không có đơn đặt phòng nào.</td></tr>
              ` : filtered.map((bk, idx) => {
                const st = getBookingComputedStatus(bk);
                const isDeposited = bk.depositPaid !== undefined ? bk.depositPaid : (st !== 'Chưa xác nhận');
                const depositPaidVal = isDeposited ? (Number(bk.depositAmount) || 0) : 0;
                const grandTotal = Number(bk.totalAmount) || Number(bk.roomTotal) || 0;
                const remainingPay = (st === 'Hoàn thành' || st === 'Đã hủy')
                  ? 0
                  : Math.max(0, grandTotal - depositPaidVal);
                const refundAmount = Math.max(0, depositPaidVal - (Number(bk.cancelFee) || 0));
                const linkedStays = (state.checkins || []).filter(c => c.bookingId === bk.id);
                const actualInTimes = [...new Set(linkedStays.map(s => formatFullDateTimeVi(s.actualCheckIn)).filter(v => v && v !== '-'))];
                const actualOutTimes = [...new Set(linkedStays.map(s => formatFullDateTimeVi(s.actualCheckOut)).filter(v => v && v !== '-'))];
                const checkInCellHtml = actualInTimes.length > 0
                  ? actualInTimes.join(', ')
                  : formatFullDateTimeVi(bk.checkIn);
                const checkOutCellHtml = actualOutTimes.length > 0
                  ? actualOutTimes.join(', ')
                  : formatFullDateTimeVi(bk.checkOut);
                return `
                  <tr>
                    <td style="text-align:center;">${idx + 1}</td>
                    <td>
                      <strong>${bk.id}</strong>
                    </td>
                    <td><span class="badge badge-wood">${bk.source || 'Trực tiếp tại quầy'}</span></td>
                    <td>${formatFullDateTimeVi(bk.bookingTime || bk.checkIn, '09:00')}</td>
                    <td>
                      <strong>${bk.guestName || '-'}</strong>
                      <div class="sub-phone">${bk.phone || '-'}</div>
                    </td>
                    <td>${checkInCellHtml}</td>
                    <td>${checkOutCellHtml}</td>
                    <td style="text-align:right; color:${isDeposited ? 'var(--wood-700)' : 'var(--text-muted)'}; font-weight:${isDeposited ? '700' : '500'};">${formatVND(depositPaidVal)}</td>
                    <td style="text-align:right;"><strong>${formatVND(grandTotal)}</strong></td>
                    ${isCancelledTab
                      ? `<td style="text-align:right;"><strong style="color:${refundAmount > 0 ? '#047857' : 'var(--text-muted)'};">${formatVND(refundAmount)}</strong></td>`
                      : `<td style="text-align:right;"><strong style="color:${remainingPay > 0 ? '#b91c1c' : '#047857'};">${formatVND(remainingPay)}</strong></td>`
                    }
                    <td style="text-align:center;">${renderBookingStatusBadge(st)}</td>
                    <td style="text-align:center;">
                      <button class="btn btn-outline btn-icon" title="Chỉnh sửa / Chi tiết" onclick="openBookingModal('${bk.id}')">${ICON_EDIT}</button>
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

  document.getElementById('bkSearchInput')?.addEventListener('input', e => {
    bookingSearchQuery = e.target.value;
    renderBookings();
    const el = document.getElementById('bkSearchInput');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  });
}

// -------------------- CHI TIẾT / CHỈNH SỬA ĐƠN ĐẶT PHÒNG --------------------
function openBookingModal(bookingId = null) {
  const existing = bookingId ? state.bookings.find(b => b.id === bookingId) : null;
  const defaultCat = state.roomCategories[0] || { id: 'HP001', name: 'Superior', price: 1400000, stdAdults: 2, maxAdultsLimit: 3, extraAdultFee: 200000, extraChildFee: 100000 };

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const addDaysIso = (isoStr, days = 1) => {
    const dt = new Date((isoStr || todayStr) + 'T00:00:00');
    dt.setDate(dt.getDate() + days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const tmrStr = addDaysIso(todayStr, 1);
  const nowTimeStr = `${todayStr} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const normViText = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const existingStatus = existing ? getBookingComputedStatus(existing) : 'Chưa xác nhận';
  const linkedStays = existing ? (state.checkins || []).filter(c => c.bookingId === existing.id) : [];
  const hasCheckedIn = linkedStays.length > 0 || existingStatus === 'Đang lưu trú' || existingStatus === 'Hoàn thành';
  const isLocked = existing && (existingStatus === 'Hoàn thành' || existingStatus === 'Đã hủy');
  const isDepositLocked = isLocked || (existing && (existingStatus === 'Đã xác nhận' || existingStatus === 'Đang lưu trú'));

  const dNowMidnight = new Date(todayStr + 'T00:00:00');
  const dOrigCheckIn = existing && existing.checkIn ? new Date(existing.checkIn + 'T00:00:00') : dNowMidnight;
  const daysBeforeCheckIn = existing && !isNaN(dOrigCheckIn.getTime()) ? Math.round((dOrigCheckIn - dNowMidnight) / 86400000) : 999;
  const isPreCheckInEdit = !!(existing && !hasCheckedIn && !isLocked);
  const isConfirmedPolicyActive = !!(isPreCheckInEdit && existingStatus === 'Đã xác nhận');
  const canModifyDateOrUpgrade = !isConfirmedPolicyActive || daysBeforeCheckIn >= 3;

  const origItems = existing
    ? (Array.isArray(existing.items) && existing.items.length > 0
        ? existing.items.map(it => ({ ...it }))
        : [{ categoryId: existing.categoryId || defaultCat.id, qty: 1, unitPrice: getCategoryEffectivePrice(existing.categoryId || defaultCat.id, existing.checkIn) }])
    : [];
  const origNights = existing ? Math.max(1, Number(existing.nights) || calcNightsDiff(existing.checkIn, existing.checkOut)) : 1;
  const origRoomTotal = existing
    ? (Number(existing.roomTotal) || origItems.reduce((s, it) => s + ((Number(it.qty) || 1) * (Number(it.unitPrice) || 0) * origNights), 0))
    : 0;
  const origDepositPaidVal = existing && existing.depositPaid
    ? (Number(existing.depositAmount) || Math.round(origRoomTotal * 0.5))
    : 0;
  const origScheduledDeposit = existing
    ? (Number(existing.depositAmount) || Math.round(origRoomTotal * 0.5))
    : 0;
  const stayEarlyFee = linkedStays.reduce((s, lt) => s + (Number(lt.earlySurcharge) || 0), 0);
  const stayLateFee = linkedStays.reduce((s, lt) => s + (Number(lt.lateSurcharge) || 0), 0);
  const uniqueActualTimes = [...new Set(linkedStays.map(s => formatFullDateTimeVi(s.actualCheckIn)).filter(v => v && v !== '-'))];
  const actualCheckInSummary = uniqueActualTimes.length > 0 ? uniqueActualTimes.join(', ') : formatFullDateTimeVi(existing?.checkIn, '14:00');
  const assignedIdsInit = existing ? getBookingAssignedRoomIds(existing) : [];
  const assignedRoomsSummary = linkedStays.length
    ? [...new Set(linkedStays.map(s => getRoomNameById(s.roomId)).filter(Boolean))].join(', ')
    : (assignedIdsInit.length ? assignedIdsInit.map(getRoomNameById).join(', ') : '-');

  let draftItems = existing && Array.isArray(existing.items) && existing.items.length > 0
    ? existing.items.map(it => ({ ...it, _lockedOriginal: hasCheckedIn }))
    : [{ categoryId: existing ? existing.categoryId : defaultCat.id, qty: 1, unitPrice: getCategoryEffectivePrice(existing ? existing.categoryId : defaultCat.id, existing ? existing.checkIn : todayStr), _lockedOriginal: hasCheckedIn }];
  let draftAssignedRoomIds = [...assignedIdsInit];

  let draftServices = existing && Array.isArray(existing.serviceItems)
    ? existing.serviceItems.map(s => ({ ...s }))
    : [];

  let showSurchargeBox = false;
  let showServiceBox = false;
  let srvSearchText = '';
  let draftSrvQty = 1;
  let bkErr = '';
  const primaryCatInit = getCategoryById(draftItems[0].categoryId) || defaultCat;
  const initAdultQty = existing ? (existing.extraAdultsQty !== undefined ? existing.extraAdultsQty : (existing.extraBed || 0)) : 0;
  const initChildQty = existing ? (existing.extraChildrenQty !== undefined ? existing.extraChildrenQty : (existing.children6to11 || 0)) : 0;
  const initUnder6Qty = existing ? (existing.extraUnder6Qty !== undefined ? existing.extraUnder6Qty : (existing.childrenUnder6 || 0)) : 0;

  const newCustId = generateNextCustomerId();
  let isNewCustomerMode = !existing || !(state.customers || []).some(c => c.id === existing.customerId);
  let custSearchText = '';
  const matchedInitCust = existing ? (state.customers || []).find(c => c.id === existing.customerId) : null;

  const tempBk = {
    id: existing ? existing.id : generateNextBookingId(),
    customerId: existing ? (existing.customerId || newCustId) : newCustId,
    bookingTime: existing ? (existing.bookingTime || nowTimeStr) : nowTimeStr,
    source: existing ? (existing.source || 'Trực tiếp tại quầy') : 'Trực tiếp tại quầy',
    guestName: existing ? (existing.guestName || '') : '',
    phone: existing ? (existing.phone || '') : '',
    email: existing ? (existing.email || matchedInitCust?.email || '') : '',
    idCard: existing ? (existing.idCard || matchedInitCust?.idCard || '') : '',
    checkIn: existing ? existing.checkIn : todayStr,
    checkOut: existing ? existing.checkOut : tmrStr,
    nights: existing ? calcNightsDiff(existing.checkIn, existing.checkOut) : 1,
    adults: existing ? (Number(existing.adults) || 2) : 2,
    children: existing ? Math.max(0, Number(existing.children !== undefined ? existing.children : 0) || 0) : 0,
    childrenUnder6: initUnder6Qty > 0 ? 1 : 0,
    children6to11: initChildQty > 0 ? 1 : 0,
    depositPaid: existing ? (existing.depositPaid !== undefined ? existing.depositPaid : existingStatus !== 'Chưa xác nhận') : false,
    extraDepositPaid: false,
    extraDepositMethod: 'Chuyển khoản ngân hàng',
    checkedOutPaid: existing ? (existing.checkedOutPaid !== undefined ? existing.checkedOutPaid : existingStatus === 'Hoàn thành') : false,
    note: existing ? (existing.note || '') : '',
    extraAdultChecked: initAdultQty > 0,
    extraAdultQty: initAdultQty > 0 ? initAdultQty : 1,
    extraChildChecked: initChildQty > 0,
    extraChildQty: 1,
    extraUnder6Checked: initUnder6Qty > 0,
    extraUnder6Qty: 1,
    adultRate: primaryCatInit.extraAdultFee !== undefined ? primaryCatInit.extraAdultFee : 200000,
    childRate: primaryCatInit.extraChildFee !== undefined ? primaryCatInit.extraChildFee : 100000
  };

  const getCaps = () => {
    let stdCap = 0;
    let maxExtraBeds = 0;
    let maxChildrenCap = 0;
    draftItems.forEach(it => {
      const c = ensureCategoryDefaults(getCategoryById(it.categoryId) || defaultCat);
      const q = Math.max(1, Number(it.qty) || 1);
      const stdPerRoom = Math.max(1, Number(c.stdAdults) || 2);
      const extraPerRoom = c.autoExtraGuest !== false ? Math.max(0, Number(c.maxExtraBed) || 0) : 0;
      const childPerRoom = Math.max(0, Number(c.stdChildren !== undefined ? c.stdChildren : 1) || 0);
      stdCap += q * stdPerRoom;
      maxExtraBeds += q * extraPerRoom;
      maxChildrenCap += q * childPerRoom;
    });
    return { stdCap, maxCap: stdCap, maxChildrenCap, maxExtraAdults: maxExtraBeds };
  };

  const syncFields = () => {
    const g = id => document.getElementById(id);
    if (g('bkGuestInput')) tempBk.guestName = g('bkGuestInput').value;
    if (g('bkPhoneInput')) tempBk.phone = g('bkPhoneInput').value;
    if (g('bkCustEmailInput')) tempBk.email = g('bkCustEmailInput').value;
    if (g('bkCustIdCardInput')) tempBk.idCard = g('bkCustIdCardInput').value;
    if (g('bkSourceSelect')) tempBk.source = g('bkSourceSelect').value;
    if (g('bkCheckInInput') && !hasCheckedIn && canModifyDateOrUpgrade) tempBk.checkIn = g('bkCheckInInput').value;
    if (g('bkCheckOutInput') && canModifyDateOrUpgrade) tempBk.checkOut = g('bkCheckOutInput').value;
    tempBk.nights = calcNightsDiff(tempBk.checkIn, tempBk.checkOut);
    if (g('bkDepositCheck') && !isDepositLocked) tempBk.depositPaid = g('bkDepositCheck').checked;
    if (g('bkExtraDepositCheck')) tempBk.extraDepositPaid = g('bkExtraDepositCheck').checked;
    if (g('bkExtraDepositMethod')) tempBk.extraDepositMethod = g('bkExtraDepositMethod').value;
    if (g('bkSrvQtyInput')) draftSrvQty = Math.max(1, Number(g('bkSrvQtyInput').value) || 1);
    if (g('bkNoteInput')) tempBk.note = g('bkNoteInput').value;

    document.querySelectorAll('[data-bk-cat]').forEach(el => {
      const i = Number(el.getAttribute('data-bk-cat'));
      if (draftItems[i] && !(hasCheckedIn && draftItems[i]._lockedOriginal) && canModifyDateOrUpgrade) {
        draftItems[i].categoryId = el.value;
        draftItems[i].unitPrice = getCategoryEffectivePrice(el.value, tempBk.checkIn);
      }
    });
    document.querySelectorAll('[data-bk-qty]').forEach(el => {
      const i = Number(el.getAttribute('data-bk-qty'));
      if (draftItems[i] && !(hasCheckedIn && draftItems[i]._lockedOriginal) && canModifyDateOrUpgrade) {
        draftItems[i].qty = Math.max(1, Number(el.value) || 1);
      }
    });
    const slotAssignEls = Array.from(document.querySelectorAll('[data-bk-assign-slot]'));
    if (slotAssignEls.length > 0) {
      draftAssignedRoomIds = slotAssignEls
        .sort((a, b) => Number(a.getAttribute('data-bk-assign-slot')) - Number(b.getAttribute('data-bk-assign-slot')))
        .map(el => el.value || '');
    }

    const caps = getCaps();
    if (g('bkAdultsInput')) {
      const v = parseInt(g('bkAdultsInput').value, 10);
      tempBk.adults = isNaN(v) ? 1 : Math.min(caps.maxCap, Math.max(1, v));
    }
    if (g('bkChildrenInput')) {
      const vc = parseInt(g('bkChildrenInput').value, 10);
      tempBk.children = isNaN(vc) ? 0 : Math.min(caps.maxChildrenCap, Math.max(0, vc));
    }
    if (g('bkExAdultCheck')) tempBk.extraAdultChecked = caps.maxExtraAdults > 0 && g('bkExAdultCheck').checked;
    if (g('bkExAdultQty')) tempBk.extraAdultQty = caps.maxExtraAdults > 0 ? Math.min(caps.maxExtraAdults, Math.max(1, Number(g('bkExAdultQty').value) || 1)) : 1;
    if (g('bkExChildCheck')) tempBk.extraChildChecked = g('bkExChildCheck').checked;
    if (g('bkExChildQty')) tempBk.extraChildQty = 1;
    if (g('bkUnder6Check')) tempBk.extraUnder6Checked = g('bkUnder6Check').checked;
    if (g('bkUnder6Qty')) tempBk.extraUnder6Qty = 1;

    const pCat = getCategoryById(draftItems[0].categoryId);
    if (pCat) {
      tempBk.adultRate = pCat.extraAdultFee !== undefined ? pCat.extraAdultFee : 200000;
      tempBk.childRate = pCat.extraChildFee !== undefined ? pCat.extraChildFee : 100000;
    }
  };

  const computeUpgradeAnalysis = (curRoomTotal) => {
    const curDep50 = Math.round(curRoomTotal * 0.5);
    if (!isConfirmedPolicyActive) {
      return {
        hasCategoryUpgrade: false,
        hasCategoryDowngrade: false,
        hasRoomUpgrade: false,
        additionalDeposit: 0,
        newDeposit50: curDep50
      };
    }
    let hasCategoryUpgrade = false;
    let hasCategoryDowngrade = false;
    draftItems.forEach((it, idx) => {
      const newCat = getCategoryById(it.categoryId);
      const newBase = Number(newCat?.price ?? it.unitPrice) || 0;
      if (idx < origItems.length) {
        const oldCat = getCategoryById(origItems[idx].categoryId);
        const oldBase = Number(oldCat?.price ?? origItems[idx].unitPrice) || 0;
        if (it.categoryId !== origItems[idx].categoryId) {
          if (newBase > oldBase) hasCategoryUpgrade = true;
          else if (newBase < oldBase) hasCategoryDowngrade = true;
        }
      } else {
        hasCategoryUpgrade = true;
      }
    });
    const hasQtyIncrease = draftItems.length > origItems.length ||
      draftItems.some((it, idx) => idx < origItems.length && (Number(it.qty) || 1) > (Number(origItems[idx].qty) || 1));
const datesChangedNow = !!(existing && (tempBk.checkIn !== existing.checkIn || tempBk.checkOut !== existing.checkOut));
const hasRoomUpgrade = !!(hasCategoryUpgrade || datesChangedNow || (hasQtyIncrease && curRoomTotal > origRoomTotal));
    const additionalDeposit = hasRoomUpgrade ? Math.max(0, curDep50 - origDepositPaidVal) : 0;
    return { hasCategoryUpgrade, hasCategoryDowngrade, hasRoomUpgrade, additionalDeposit, newDeposit50: curDep50 };
  };
  const datesLockedByPolicy = isLocked || (isConfirmedPolicyActive && !canModifyDateOrUpgrade);

  const renderModalBody = () => {
    const nights = Math.max(1, Number(tempBk.nights) || 1);
    const caps = getCaps();
    if (tempBk.adults > caps.maxCap) tempBk.adults = caps.maxCap;
    if (tempBk.adults < 1) tempBk.adults = 1;
    if (tempBk.children > caps.maxChildrenCap) tempBk.children = caps.maxChildrenCap;
    if (tempBk.children < 0) tempBk.children = 0;
    if (caps.maxExtraAdults <= 0) tempBk.extraAdultChecked = false;
    else if (tempBk.extraAdultQty > caps.maxExtraAdults) tempBk.extraAdultQty = caps.maxExtraAdults;
    tempBk.extraChildQty = 1;
    tempBk.extraUnder6Qty = 1;

    const primaryCat = getCategoryById(draftItems[0].categoryId) || defaultCat;
    const roomOnlyTotal = draftItems.reduce((s, it) => s + ((Number(it.qty) || 1) * (Number(it.unitPrice) || 0) * nights), 0);
    const adultSurTotal = tempBk.extraAdultChecked ? (tempBk.extraAdultQty * tempBk.adultRate * nights) : 0;
    const childSurTotal = tempBk.extraChildChecked ? (tempBk.extraChildQty * tempBk.childRate * nights) : 0;
    const surchargeTotal = adultSurTotal + childSurTotal + stayEarlyFee + stayLateFee;
    const serviceTotal = draftServices.reduce((s, x) => s + ((Number(x.qty) || 1) * (Number(x.price) || 0)), 0);
    const grandTotal = roomOnlyTotal + surchargeTotal + serviceTotal;
    const deposit50 = Math.round(roomOnlyTotal * 0.5);
    const upgInfo = computeUpgradeAnalysis(roomOnlyTotal);
    const activeServices = (state.services || []).filter(s => (s.status || 'Đang kinh doanh') === 'Đang kinh doanh');
    const getFilteredServices = query => {
      const q = normViText(query);
      if (!q) return activeServices;
      return activeServices.filter(s => normViText(`${s.name} ${s.group || ''}`).includes(q));
    };
    const renderServiceSearchItems = query => {
      const matches = getFilteredServices(query);
      if (matches.length === 0) {
        return `<div style="padding:10px; text-align:center; font-size:12.5px; color:var(--text-muted);">Không tìm thấy dịch vụ phù hợp.</div>`;
      }
      return matches.map(s => `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:7px 10px; border-bottom:1px solid var(--border-color); background:#fff;">
          <div style="min-width:0;">
            <div style="font-size:13px; font-weight:500; color:var(--text-primary);">${s.name}</div>
            <div style="font-size:11.5px; color:var(--text-muted);">${s.group || 'Dịch vụ'} &bull; ${formatVND(s.price)}/${s.unit}</div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" data-bk-pick-srv="${s.id}" style="flex-shrink:0;">+ Thêm</button>
        </div>
      `).join('');
    };

    const getFilteredCustomers = query => {
      const q = normViText(query);
      const list = Array.isArray(state.customers) ? state.customers : [];
      if (!q) return list;
      return list.filter(c => normViText(`${c.id} ${c.name} ${c.phone || ''} ${c.idCard || ''}`).includes(q));
    };
    const renderCustomerSelectOptions = query => {
      const matches = getFilteredCustomers(query);
      if (matches.length === 0) {
        return `<option value="">-- Không tìm thấy khách phù hợp --</option>`;
      }
      return matches.map(c => `<option value="${c.id}" ${c.id === tempBk.customerId ? 'selected' : ''}>${c.id} - ${c.name} (${c.phone || 'Chưa có SĐT'})</option>`).join('');
    };

    const assignedSlots = (!hasCheckedIn && !isLocked && tempBk.depositPaid)
      ? allocateRoomsForBooking(draftItems, existing?.id || null, draftAssignedRoomIds)
      : [];
    if (!hasCheckedIn && !isLocked && tempBk.depositPaid) {
      draftAssignedRoomIds = assignedSlots.map(s => s.roomId || '');
    }
    const { openStayByRoom, reservedByRoom } = getRoomOccupancyMaps(existing?.id || null);

    let stt = 0;
    document.getElementById('modalBody').innerHTML = `
      ${bkErr ? `<div class="form-error-banner">${bkErr}</div>` : ''}
      ${isPreCheckInEdit ? (
        !isConfirmedPolicyActive
          ? `<div style="margin-bottom:10px; padding:8px 12px; border-radius:8px; background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; font-size:12.5px;"><strong>Chờ xác nhận (chưa đặt cọc):</strong> Được tự do thay đổi ngày và hạng phòng. Chính sách đổi ngày / tăng hạng phòng trước ≥ 3 ngày và phân phòng giữ chỗ sẽ áp dụng sau khi xác nhận đơn.</div>`
          : (canModifyDateOrUpgrade
              ? `<div style="margin-bottom:10px; padding:8px 12px; border-radius:8px; background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; font-size:12.5px;"><strong>Đã xác nhận • Chính sách 3 ngày:</strong> Còn <strong>${daysBeforeCheckIn} ngày</strong> trước ngày nhận phòng (≥ 3 ngày) — Cho phép đổi ngày lưu trú hoặc tăng hạng phòng (nếu tăng hạng phòng phải thanh toán thêm tiền cọc).</div>`
              : `<div style="margin-bottom:10px; padding:8px 12px; border-radius:8px; background:#fffbeb; border:1px solid #fcd34d; color:#92400e; font-size:12.5px;"><strong>Đã xác nhận • Chính sách 3 ngày:</strong> Còn <strong>${Math.max(0, daysBeforeCheckIn)} ngày</strong> tới ngày nhận phòng (${formatFullDateTimeVi(existing.checkIn)}) nên <strong>không được đổi ngày hoặc tăng hạng phòng</strong> (chỉ áp dụng trước ≥ 3 ngày).</div>`)
      ) : ''}

      ${!isLocked ? `
        <div class="kv-sub-box" style="padding:10px 12px; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
            <strong style="font-size:12.5px; color:var(--text-primary);">Khách hàng (${isNewCustomerMode ? `Mới • ${tempBk.customerId}` : `Khách cũ • ${tempBk.customerId}`})</strong>
            <div style="display:flex; gap:6px;">
              <button type="button" id="bkCustModeOldBtn" class="btn ${!isNewCustomerMode ? 'btn-primary' : 'btn-outline'} btn-sm">Chọn khách cũ</button>
              <button type="button" id="bkCustModeNewBtn" class="btn ${isNewCustomerMode ? 'btn-primary' : 'btn-outline'} btn-sm">+ Thêm khách hàng mới</button>
            </div>
          </div>
          ${!isNewCustomerMode ? `
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <input type="text" id="bkCustSearchInput" class="form-control" value="${custSearchText.replace(/"/g, '&quot;')}" placeholder="Tìm khách cũ theo tên, SĐT, mã KH..." style="flex:1; min-width:180px;" />
              <select id="bkCustomerSelect" class="form-control" style="flex:1.4; min-width:220px;">
                ${renderCustomerSelectOptions(custSearchText)}
              </select>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="form-grid-3">
        <div class="form-group">
          <label>Mã đặt phòng</label>
          <input type="text" class="form-control" value="${tempBk.id}" disabled style="background:#f3f4f6;color:var(--text-muted);" />
        </div>
        <div class="form-group">
          <label>Tên KH <span class="req-star">*</span></label>
          <input type="text" id="bkGuestInput" class="form-control" value="${tempBk.guestName}" placeholder="Nguyễn Văn A" ${isLocked ? 'disabled' : ''} />
        </div>
        <div class="form-group">
          <label>Số ĐT <span class="req-star">*</span></label>
          <input type="text" id="bkPhoneInput" class="form-control" value="${tempBk.phone}" placeholder="0912 xxx xxx" ${isLocked ? 'disabled' : ''} />
        </div>
      </div>

      ${!isLocked && isNewCustomerMode ? `
        <div class="form-grid-2">
          <div class="form-group">
            <label>Email khách hàng mới</label>
            <input type="email" id="bkCustEmailInput" class="form-control" value="${String(tempBk.email || '').replace(/"/g, '&quot;')}" placeholder="khachhang@email.com (không bắt buộc)" />
          </div>
          <div class="form-group">
            <label>CCCD / Hộ chiếu</label>
            <input type="text" id="bkCustIdCardInput" class="form-control" value="${String(tempBk.idCard || '').replace(/"/g, '&quot;')}" placeholder="Nhập CCCD / Hộ chiếu (nếu có)" />
          </div>
        </div>
      ` : ''}

      <div class="form-grid-3">
        ${hasCheckedIn ? `
          <div class="form-group">
            <label>Thời gian thực nhận <small style="color:var(--text-muted);">(Đã khóa)</small></label>
            <input type="text" id="bkActualCheckInDisplay" class="form-control" value="${actualCheckInSummary}" disabled style="background:#f3f4f6;color:var(--text-primary);font-weight:600;cursor:not-allowed;" />
          </div>
        ` : `
          <div class="form-group">
            <label>Ngày nhận <span class="req-star">*</span></label>
            <input type="date" id="bkCheckInInput" class="form-control" value="${tempBk.checkIn}" min="${(!existing || !existing.checkIn || existing.checkIn >= todayStr) ? todayStr : existing.checkIn}" ${datesLockedByPolicy ? 'disabled style="background:#f3f4f6;cursor:not-allowed;"' : ''} />
          </div>
        `}
        <div class="form-group">
          <label>Ngày trả <span class="req-star">*</span></label>
          <input type="date" id="bkCheckOutInput" class="form-control" value="${tempBk.checkOut}" min="${addDaysIso((tempBk.checkIn && tempBk.checkIn >= todayStr) ? tempBk.checkIn : todayStr, 1)}" ${datesLockedByPolicy ? 'disabled style="background:#f3f4f6;cursor:not-allowed;"' : ''} />
        </div>
        <div class="form-group">
          <label>Nguồn tạo</label>
          <select id="bkSourceSelect" class="form-control" ${isLocked ? 'disabled' : ''}>
            ${['Trực tiếp tại quầy', 'Hotline / Zalo', 'Website', 'Booking.com', 'Agoda', 'Traveloka'].map(s => `<option value="${s}" ${tempBk.source === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>

      ${hasCheckedIn ? `
        <div class="form-group">
          <label>Phòng đã nhận <small style="color:var(--text-muted);">(${existingStatus})</small></label>
          <input type="text" id="bkAssignedRoomsDisplay" class="form-control" value="${assignedRoomsSummary}" disabled style="background:#f3f4f6;color:var(--text-primary);font-weight:600;cursor:not-allowed;" />
        </div>
      ` : ''}

      <div class="form-grid-2">
        <div class="form-group">
          <label>Số người lớn (Tối đa ${caps.maxCap})</label>
          <div class="qty-stepper">
            <button type="button" id="bkAdultsMinus" class="qty-stepper-btn" ${tempBk.adults <= 1 || isLocked ? 'disabled' : ''}>-</button>
            <input type="number" id="bkAdultsInput" class="form-control" min="1" max="${caps.maxCap}" value="${tempBk.adults}" ${isLocked ? 'disabled' : ''} />
            <button type="button" id="bkAdultsPlus" class="qty-stepper-btn" ${tempBk.adults >= caps.maxCap || isLocked ? 'disabled' : ''}>+</button>
          </div>
        </div>
        <div class="form-group">
          <label>Số trẻ em (Tối đa ${caps.maxChildrenCap})</label>
          <div class="qty-stepper">
            <button type="button" id="bkChildrenMinus" class="qty-stepper-btn" ${tempBk.children <= 0 || isLocked ? 'disabled' : ''}>-</button>
            <input type="number" id="bkChildrenInput" class="form-control" min="0" max="${caps.maxChildrenCap}" value="${tempBk.children}" ${isLocked ? 'disabled' : ''} />
            <button type="button" id="bkChildrenPlus" class="qty-stepper-btn" ${tempBk.children >= caps.maxChildrenCap || isLocked ? 'disabled' : ''}>+</button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>Ghi chú</label>
        <input type="text" id="bkNoteInput" class="form-control" value="${tempBk.note}" placeholder="Ghi chú đơn..." ${isLocked ? 'disabled' : ''} />
      </div>

      ${existingStatus === 'Đã hủy' ? `
        <div class="kv-section" style="border-color:#fecaca; background:#fef2f2;">
          <div class="kv-section-header" style="margin-bottom:8px;">
            <div class="kv-section-title" style="color:#991b1b;">Thông tin hủy đặt phòng</div>
            <span class="badge badge-maintenance">Đã hủy</span>
          </div>
          <div class="form-grid-2">
            <div class="form-group" style="margin-bottom:0;">
              <label>Ngày hủy</label>
              <input type="text" id="bkCancelDateDisplay" class="form-control" value="${existing?.cancelDate ? formatFullDateTimeVi(existing.cancelDate) : '-'}" disabled style="background:#ffffff; color:#111827;" />
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>Lý do hủy phòng</label>
              <input type="text" id="bkCancelReasonDisplay" class="form-control" value="${String(existing?.cancelReason || 'Không có lý do').replace(/"/g, '&quot;')}" disabled style="background:#ffffff; color:#111827; font-weight:500;" />
            </div>
          </div>
        </div>
      ` : ''}

      <div class="kv-section">
        <div class="kv-section-header">
          <div class="kv-section-title">Danh sách hạng mục (${nights} ngày)</div>
          ${!isLocked && !(isConfirmedPolicyActive && !canModifyDateOrUpgrade) ? `<button type="button" id="bkAddRoomCatBtn" class="btn btn-outline btn-sm">+ Thêm hạng phòng</button>` : ''}
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:45px; text-align:center;">STT</th>
                <th>Hạng mục</th>
                <th style="width:85px; text-align:center;">Số lượng</th>
                <th style="text-align:right;">Đơn giá</th>
                <th style="text-align:right;">Thành tiền</th>
                ${!isLocked ? '<th style="width:58px;"></th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${draftItems.map((it, idx) => {
                stt++;
                const lineTotal = (Number(it.qty) || 1) * (Number(it.unitPrice) || 0) * nights;
                const rowLocked = isLocked || (hasCheckedIn && !!it._lockedOriginal) || (isConfirmedPolicyActive && !canModifyDateOrUpgrade);
                const origRow = isConfirmedPolicyActive && idx < origItems.length ? origItems[idx] : null;
                const origRowCat = origRow ? getCategoryById(origRow.categoryId) : null;
                const origRowBasePrice = origRow ? (Number(origRowCat?.price ?? origRow.unitPrice) || 0) : 0;
                const minRowQty = (isConfirmedPolicyActive && isDepositLocked && origRow) ? Math.max(1, Number(origRow.qty) || 1) : 1;
                return `
                  <tr>
                    <td style="text-align:center;">${stt}</td>
                    <td>
                      <select class="form-control" data-bk-cat="${idx}" style="padding:5px 8px; font-size:13px;${rowLocked ? ' background:#f3f4f6; cursor:not-allowed;' : ''}" ${rowLocked ? 'disabled' : ''}>
                        ${state.roomCategories.map(c => {
                          const catBase = Number(c.price) || 0;
                          const isDowngrade = origRow && c.id !== origRow.categoryId && catBase < origRowBasePrice;
                          const isUpgradeOption = origRow && c.id !== origRow.categoryId && catBase > origRowBasePrice;
                          const suffix = isDowngrade ? 'Không hỗ trợ hạ hạng' : (isUpgradeOption ? `${nights} ngày • Tăng hạng` : `${nights} ngày`);
                          return `<option value="${c.id}" ${it.categoryId === c.id ? 'selected' : ''} ${isDowngrade ? 'disabled' : ''}>${c.name} (${suffix})</option>`;
                        }).join('')}
                      </select>
                    </td>
                    <td><input type="number" class="form-control" data-bk-qty="${idx}" value="${it.qty}" min="${minRowQty}" style="padding:5px 6px; font-size:13px; text-align:center;${rowLocked ? ' background:#f3f4f6; cursor:not-allowed;' : ''}" ${rowLocked ? 'disabled' : ''} /></td>
                    <td style="text-align:right;">${formatVND(it.unitPrice)}</td>
                    <td style="text-align:right;"><strong>${formatVND(lineTotal)}</strong></td>
                    ${!isLocked ? `<td style="text-align:center;">${(!rowLocked && draftItems.length > 1 && !(isConfirmedPolicyActive && isDepositLocked && idx < origItems.length)) ? `<button type="button" class="btn btn-danger btn-sm" data-bk-del-cat="${idx}">Xóa</button>` : ''}</td>` : ''}
                  </tr>
                `;
              }).join('')}

              ${tempBk.extraAdultChecked ? (() => {
                stt++;
                return `
                  <tr>
                    <td style="text-align:center;">${stt}</td>
                    <td>Phụ thu giường phụ (${tempBk.extraAdultQty} giường • ${primaryCat.name} • ${nights} ngày)</td>
                    <td style="text-align:center;">${tempBk.extraAdultQty}</td>
                    <td style="text-align:right;">${formatVND(tempBk.adultRate)}</td>
                    <td style="text-align:right;"><strong>${formatVND(adultSurTotal)}</strong></td>
                    ${!isLocked ? `<td style="text-align:center;"><button type="button" class="btn btn-danger btn-sm" id="bkRmAdultSurBtn">Xóa</button></td>` : ''}
                  </tr>
                `;
              })() : ''}

              ${tempBk.extraChildChecked ? (() => {
                stt++;
                return `
                  <tr>
                    <td style="text-align:center;">${stt}</td>
                    <td>Phụ thu thêm ${tempBk.extraChildQty} trẻ em (${primaryCat.name} • ${nights} ngày)</td>
                    <td style="text-align:center;">${tempBk.extraChildQty}</td>
                    <td style="text-align:right;">${formatVND(tempBk.childRate)}</td>
                    <td style="text-align:right;"><strong>${formatVND(childSurTotal)}</strong></td>
                    ${!isLocked ? `<td style="text-align:center;"><button type="button" class="btn btn-danger btn-sm" id="bkRmChildSurBtn">Xóa</button></td>` : ''}
                  </tr>
                `;
              })() : ''}

              ${tempBk.extraUnder6Checked ? (() => {
                stt++;
                return `
                  <tr>
                    <td style="text-align:center;">${stt}</td>
                    <td>Trẻ dưới 6 tuổi (${tempBk.extraUnder6Qty} trẻ • Miễn phí • ${nights} ngày)</td>
                    <td style="text-align:center;">${tempBk.extraUnder6Qty}</td>
                    <td style="text-align:right;">0đ</td>
                    <td style="text-align:right;"><strong>0đ</strong></td>
                    ${!isLocked ? `<td style="text-align:center;"><button type="button" class="btn btn-danger btn-sm" id="bkRmUnder6Btn">Xóa</button></td>` : ''}
                  </tr>
                `;
              })() : ''}

              ${stayEarlyFee > 0 ? (() => {
                stt++;
                const dailyRate = draftItems.reduce((s, it) => s + ((Number(it.qty) || 1) * (Number(it.unitPrice) || 0)), 0);
                const earlyPct = dailyRate > 0 ? Math.round((stayEarlyFee / dailyRate) * 100) : 0;
                const stayRoomsLabel = linkedStays.length
                  ? [...new Set(linkedStays.map(s => getRoomNameById(s.roomId)).filter(Boolean))].join(', ')
                  : (existing?.roomId ? getRoomNameById(existing.roomId) : 'Check-in');
                return `
                  <tr>
                    <td style="text-align:center;">${stt}</td>
                    <td>Phụ thu nhận phòng sớm (${earlyPct > 0 ? `${earlyPct}% giá phòng/ngày • ` : ''}${stayRoomsLabel})</td>
                    <td style="text-align:center;">1</td>
                    <td style="text-align:right;">${formatVND(stayEarlyFee)}</td>
                    <td style="text-align:right;"><strong>${formatVND(stayEarlyFee)}</strong></td>
                    ${!isLocked ? '<td></td>' : ''}
                  </tr>
                `;
              })() : ''}

              ${stayLateFee > 0 ? (() => {
                stt++;
                return `
                  <tr>
                    <td style="text-align:center;">${stt}</td>
                    <td>Phụ thu trả phòng muộn</td>
                    <td style="text-align:center;">1</td>
                    <td style="text-align:right;">${formatVND(stayLateFee)}</td>
                    <td style="text-align:right;"><strong>${formatVND(stayLateFee)}</strong></td>
                    ${!isLocked ? '<td></td>' : ''}
                  </tr>
                `;
              })() : ''}

              ${draftServices.map((srv, idx) => {
                stt++;
                return `
                  <tr>
                    <td style="text-align:center;">${stt}</td>
                    <td>Dịch vụ: ${srv.name}</td>
                    <td style="text-align:center;">${srv.qty}</td>
                    <td style="text-align:right;">${formatVND(srv.price)}</td>
                    <td style="text-align:right;"><strong>${formatVND((Number(srv.qty) || 1) * (Number(srv.price) || 0))}</strong></td>
                    ${!isLocked ? `<td style="text-align:center;"><button type="button" class="btn btn-danger btn-sm" data-bk-del-srv="${idx}">Xóa</button></td>` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        ${!isLocked ? `
          <div style="display:flex; gap:12px; align-items:center; padding-top:4px;">
            <button type="button" id="bkToggleSurBtn" class="kv-link-btn">+ Phụ thu</button>
            <button type="button" id="bkToggleSrvBtn" class="kv-link-btn">+ Dịch vụ</button>
          </div>
        ` : ''}

        ${showSurchargeBox && !isLocked ? `
          <div class="kv-sub-box" style="gap:10px;">
            <label class="kv-checkbox-row">
              <input type="checkbox" id="bkExAdultCheck" ${tempBk.extraAdultChecked ? 'checked' : ''} ${caps.maxExtraAdults <= 0 ? 'disabled' : ''} />
              <span style="min-width:145px;">Giường phụ</span>
              <input type="number" id="bkExAdultQty" class="kv-inline-input" value="${tempBk.extraAdultQty}" min="1" max="${Math.max(1, caps.maxExtraAdults)}" style="width:68px;" ${caps.maxExtraAdults <= 0 ? 'disabled' : ''} />
              <span>giường &times; ${formatVND(tempBk.adultRate)}/ngày <small style="color:var(--text-muted);">(Tối đa ${caps.maxExtraAdults})</small></span>
            </label>
            <label class="kv-checkbox-row">
              <input type="checkbox" id="bkExChildCheck" ${tempBk.extraChildChecked ? 'checked' : ''} />
              <span style="min-width:145px;">Phụ thu thêm trẻ em</span>
              <input type="number" id="bkExChildQty" class="kv-inline-input" value="${tempBk.extraChildQty}" min="1" max="1" style="width:68px;" />
              <span>khách &times; ${formatVND(tempBk.childRate)}/ngày <small style="color:var(--text-muted);">(Tối đa 1)</small></span>
            </label>
            <label class="kv-checkbox-row">
              <input type="checkbox" id="bkUnder6Check" ${tempBk.extraUnder6Checked ? 'checked' : ''} />
              <span style="min-width:145px;">Trẻ dưới 6 tuổi</span>
              <input type="number" id="bkUnder6Qty" class="kv-inline-input" value="${tempBk.extraUnder6Qty}" min="1" max="1" style="width:68px;" />
              <span>trẻ &times; 0đ/ngày <small style="color:var(--text-muted);">(Miễn phí • Tối đa 1)</small></span>
            </label>
          </div>
        ` : ''}

        ${showServiceBox && !isLocked ? `
          <div class="kv-sub-box" style="gap:10px;">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <input type="text" id="bkSrvSearchInput" class="form-control" value="${srvSearchText.replace(/"/g, '&quot;')}" placeholder="Tìm dịch vụ theo tên hoặc nhóm (VD: Massage, Xe, Giặt ủi)..." style="flex:1; min-width:210px;" />
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:12.5px; color:var(--text-muted);">SL:</span>
                <input type="number" id="bkSrvQtyInput" class="form-control" value="${draftSrvQty}" min="1" style="width:72px; text-align:center;" />
              </div>
            </div>
            <div id="bkSrvResultsList" style="max-height:190px; overflow-y:auto; border:1px solid var(--border-color); border-radius:8px; background:#fff;">
              ${renderServiceSearchItems(srvSearchText)}
            </div>
          </div>
        ` : ''}
      </div>

      ${!hasCheckedIn && !isLocked && tempBk.depositPaid ? `
        <div class="kv-section">
          <div class="kv-section-header" style="margin-bottom:8px;">
            <div class="kv-section-title">Phân phòng giữ chỗ (${assignedSlots.length} phòng)</div>
            <span class="badge badge-pistachio">Tự động giữ phòng khi xác nhận</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:10px;">
            ${assignedSlots.map((slot, sIdx) => {
              const catRooms = (state.rooms || []).filter(r =>
                r.categoryId === slot.categoryId &&
                (r.id === slot.roomId || isRoomSelectableForHold(r, openStayByRoom, reservedByRoom))
              );
              return `
                <div class="form-group" style="margin:0;">
                  <label style="font-size:12px;">${slot.categoryName} (${slot.slotIndex}/${slot.slotTotal}) <span class="req-star">*</span></label>
                  <select class="form-control" data-bk-assign-slot="${sIdx}">
                    ${catRooms.length === 0 ? `<option value="">-- Hết phòng trống --</option>` : ''}
                    ${catRooms.map(r => `<option value="${r.id}" ${r.id === slot.roomId ? 'selected' : ''}>${r.name || r.id} (${r.id})</option>`).join('')}
                  </select>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <div class="calc-summary-box">
        <div class="calc-row"><span>Tiền phòng (${nights} ngày):</span><strong>${formatVND(roomOnlyTotal)}</strong></div>
        ${surchargeTotal > 0 ? `<div class="calc-row"><span>Phụ thu:</span><strong>${formatVND(surchargeTotal)}</strong></div>` : ''}
        ${serviceTotal > 0 ? `<div class="calc-row"><span>Dịch vụ:</span><strong>${formatVND(serviceTotal)}</strong></div>` : ''}
        <div class="calc-row total"><span>Tổng tiền:</span><span>${formatVND(grandTotal)}</span></div>
        <div class="calc-row deposit"><span>Cọc 50% giá trị tiền phòng:</span><span>${formatVND(deposit50)}</span></div>
        ${isConfirmedPolicyActive && isDepositLocked && upgInfo.hasRoomUpgrade ? `
          <div style="margin-top:6px; padding-top:8px; border-top:1px dashed var(--border-color);">
            <div class="calc-row"><span>Tiền cọc đã đóng ban đầu:</span><strong>${formatVND(origDepositPaidVal)}</strong></div>
            <div class="calc-row"><span>Tiền cọc 50% sau tăng hạng phòng:</span><strong>${formatVND(upgInfo.newDeposit50)}</strong></div>
            <div class="calc-row total"><span>Tiền cọc cần thanh toán thêm:</span><span style="color:#b45309;">+${formatVND(upgInfo.additionalDeposit)}</span></div>
            ${upgInfo.additionalDeposit > 0 ? `
              <div style="display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap; margin-top:8px; padding:8px 10px; background:#fffbeb; border:1px solid #fcd34d; border-radius:8px;">
                <label class="kv-checkbox-row" style="margin:0; font-weight:600; color:#92400e;">
                  <input type="checkbox" id="bkExtraDepositCheck" ${tempBk.extraDepositPaid ? 'checked' : ''} />
                  <span>Khách đã thanh toán thêm tiền cọc ${formatVND(upgInfo.additionalDeposit)} <span class="req-star">*</span></span>
                </label>
                <select id="bkExtraDepositMethod" class="form-control" style="width:auto; min-width:185px; padding:4px 8px; font-size:12.5px;">
                  ${['Chuyển khoản ngân hàng', 'Tiền mặt', 'Thẻ tín dụng / POS', 'Ví điện tử'].map(m => `<option value="${m}" ${tempBk.extraDepositMethod === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
              </div>
            ` : ''}
          </div>
        ` : ''}
        ${existingStatus === 'Đã hủy' ? (() => {
          const paidDep = existing?.depositPaid ? (Number(existing?.depositAmount) || 0) : 0;
          const cFee = Number(existing?.cancelFee) || 0;
          const refundAmt = Math.max(0, paidDep - cFee);
          return `
            <div class="calc-row"><span>Tiền cọc đã đặt:</span><strong>${formatVND(paidDep)}</strong></div>
            <div class="calc-row"><span>Phí hủy phòng:</span><strong style="color:#b91c1c;">${formatVND(cFee)}</strong></div>
            <div class="calc-row total"><span>Số tiền hoàn trả:</span><span style="color:#047857;">${formatVND(refundAmt)}</span></div>
          `;
        })() : ''}
        ${!isLocked ? `
          <div style="padding-top:8px; border-top:1px dashed var(--border-color); margin-top:4px;">
            <label class="kv-checkbox-row" ${isDepositLocked ? 'style="cursor:not-allowed; opacity:0.85;"' : ''}>
              <input type="checkbox" id="bkDepositCheck" ${tempBk.depositPaid ? 'checked' : ''} ${isDepositLocked ? 'disabled' : ''} />
              <span>Khách đã đặt cọc 50%${isDepositLocked ? ' <small style="color:var(--text-muted);">(Đã xác nhận - không thể thay đổi)</small>' : ''}</span>
            </label>
          </div>
        ` : ''}
      </div>
    `;

    // Bind events
    const applySelectedCustomer = custId => {
      const c = (state.customers || []).find(x => x.id === custId);
      if (!c) return;
      tempBk.customerId = c.id;
      tempBk.guestName = c.name || '';
      tempBk.phone = c.phone || '';
      tempBk.email = c.email || '';
      tempBk.idCard = c.idCard || '';
    };
    document.getElementById('bkCustModeOldBtn')?.addEventListener('click', () => {
      syncFields();
      isNewCustomerMode = false;
      const list = Array.isArray(state.customers) ? state.customers : [];
      if (!list.some(c => c.id === tempBk.customerId) && list.length > 0) {
        applySelectedCustomer(list[0].id);
      }
      renderModalBody();
    });
    document.getElementById('bkCustModeNewBtn')?.addEventListener('click', () => {
      syncFields();
      isNewCustomerMode = true;
      tempBk.customerId = newCustId;
      tempBk.guestName = '';
      tempBk.phone = '';
      tempBk.email = '';
      tempBk.idCard = '';
      renderModalBody();
    });
    document.getElementById('bkCustomerSelect')?.addEventListener('change', e => {
      syncFields();
      if (e.target.value) {
        applySelectedCustomer(e.target.value);
        renderModalBody();
      }
    });
    document.getElementById('bkCustSearchInput')?.addEventListener('input', e => {
      custSearchText = e.target.value;
      const sel = document.getElementById('bkCustomerSelect');
      if (sel) {
        sel.innerHTML = renderCustomerSelectOptions(custSearchText);
        if (sel.value && sel.value !== tempBk.customerId) {
          applySelectedCustomer(sel.value);
          const gNameEl = document.getElementById('bkGuestInput');
          const gPhoneEl = document.getElementById('bkPhoneInput');
          if (gNameEl) gNameEl.value = tempBk.guestName;
          if (gPhoneEl) gPhoneEl.value = tempBk.phone;
        }
      }
    });
    document.getElementById('bkAdultsMinus')?.addEventListener('click', () => { syncFields(); if (tempBk.adults > 1) { tempBk.adults--; renderModalBody(); } });
    document.getElementById('bkAdultsPlus')?.addEventListener('click', () => { syncFields(); if (tempBk.adults < caps.maxCap) { tempBk.adults++; renderModalBody(); } });
    document.getElementById('bkAdultsInput')?.addEventListener('change', () => { syncFields(); renderModalBody(); });
    document.getElementById('bkChildrenMinus')?.addEventListener('click', () => { syncFields(); if (tempBk.children > 0) { tempBk.children--; renderModalBody(); } });
    document.getElementById('bkChildrenPlus')?.addEventListener('click', () => { syncFields(); if (tempBk.children < caps.maxChildrenCap) { tempBk.children++; renderModalBody(); } });
    document.getElementById('bkChildrenInput')?.addEventListener('change', () => { syncFields(); renderModalBody(); });
    document.getElementById('bkCheckInInput')?.addEventListener('change', () => {
      syncFields();
      const minIn = (!existing || !existing.checkIn || existing.checkIn >= todayStr) ? todayStr : existing.checkIn;
      if (tempBk.checkIn && tempBk.checkIn < minIn) {
        tempBk.checkIn = minIn;
      }
      if (!tempBk.checkOut || tempBk.checkOut <= tempBk.checkIn) {
        tempBk.checkOut = addDaysIso(tempBk.checkIn, 1);
      }
      draftItems.forEach(it => { it.unitPrice = getCategoryEffectivePrice(it.categoryId, tempBk.checkIn); });
      renderModalBody();
    });
    document.getElementById('bkCheckOutInput')?.addEventListener('change', () => {
      syncFields();
      const minOut = addDaysIso((tempBk.checkIn && tempBk.checkIn >= todayStr) ? tempBk.checkIn : todayStr, 1);
      if (tempBk.checkOut && tempBk.checkOut < minOut) {
        tempBk.checkOut = minOut;
      }
      renderModalBody();
    });
    document.querySelectorAll('[data-bk-cat], [data-bk-qty], [data-bk-assign-slot]').forEach(el => el.addEventListener('change', () => { syncFields(); renderModalBody(); }));
    document.getElementById('bkAddRoomCatBtn')?.addEventListener('click', () => {
      syncFields();
      draftItems.push({ categoryId: defaultCat.id, qty: 1, unitPrice: getCategoryEffectivePrice(defaultCat.id, tempBk.checkIn), _lockedOriginal: false });
      renderModalBody();
    });
    document.querySelectorAll('[data-bk-del-cat]').forEach(btn => btn.addEventListener('click', () => {
      syncFields();
      draftItems.splice(Number(btn.getAttribute('data-bk-del-cat')), 1);
      renderModalBody();
    }));
    document.getElementById('bkToggleSurBtn')?.addEventListener('click', () => { syncFields(); showSurchargeBox = !showSurchargeBox; if (showSurchargeBox) showServiceBox = false; renderModalBody(); });
    document.getElementById('bkToggleSrvBtn')?.addEventListener('click', () => { syncFields(); showServiceBox = !showServiceBox; if (showServiceBox) showSurchargeBox = false; renderModalBody(); });
    ['bkExAdultCheck', 'bkExAdultQty', 'bkExChildCheck', 'bkExChildQty', 'bkUnder6Check', 'bkUnder6Qty', 'bkDepositCheck', 'bkExtraDepositCheck', 'bkExtraDepositMethod'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => { syncFields(); renderModalBody(); });
    });
    document.getElementById('bkRmAdultSurBtn')?.addEventListener('click', () => { syncFields(); tempBk.extraAdultChecked = false; renderModalBody(); });
    document.getElementById('bkRmChildSurBtn')?.addEventListener('click', () => { syncFields(); tempBk.extraChildChecked = false; renderModalBody(); });
    document.getElementById('bkRmUnder6Btn')?.addEventListener('click', () => { syncFields(); tempBk.extraUnder6Checked = false; renderModalBody(); });
    const bindServicePickerItems = () => {
      document.querySelectorAll('[data-bk-pick-srv]').forEach(btn => btn.addEventListener('click', () => {
        syncFields();
        const srvId = btn.getAttribute('data-bk-pick-srv');
        const qty = Math.max(1, Number(document.getElementById('bkSrvQtyInput')?.value) || draftSrvQty || 1);
        const srvObj = state.services.find(s => s.id === srvId);
        if (!srvObj) return;
        const ex = draftServices.find(s => s.serviceId === srvObj.id);
        if (ex) ex.qty += qty;
        else draftServices.push({ serviceId: srvObj.id, name: srvObj.name, price: srvObj.price, qty });
        renderModalBody();
      }));
    };
    bindServicePickerItems();
    document.getElementById('bkSrvSearchInput')?.addEventListener('input', e => {
      srvSearchText = e.target.value;
      const box = document.getElementById('bkSrvResultsList');
      if (box) {
        box.innerHTML = renderServiceSearchItems(srvSearchText);
        bindServicePickerItems();
      }
    });
    document.getElementById('bkSrvQtyInput')?.addEventListener('change', e => {
      draftSrvQty = Math.max(1, Number(e.target.value) || 1);
    });
    document.querySelectorAll('[data-bk-del-srv]').forEach(btn => btn.addEventListener('click', () => {
      syncFields();
      draftServices.splice(Number(btn.getAttribute('data-bk-del-srv')), 1);
      renderModalBody();
    }));
  };

  const persistBookingForm = (forceConfirmDeposit = false) => {
    syncFields();
    if (forceConfirmDeposit) tempBk.depositPaid = true;
    const guestName = String(tempBk.guestName || '').trim();
    const phone = String(tempBk.phone || '').trim();
    if (!guestName || !phone || !tempBk.checkIn || !tempBk.checkOut) {
      bkErr = 'Vui lòng điền đầy đủ Tên KH, Số ĐT, Ngày nhận và Ngày trả (*).';
      renderModalBody();
      return false;
    }
    if ((!existing || tempBk.checkIn !== existing.checkIn) && tempBk.checkIn < todayStr) {
      bkErr = 'Ngày nhận phòng không được chọn những ngày trước hôm nay.';
      renderModalBody();
      return false;
    }
    if (new Date(tempBk.checkOut) <= new Date(tempBk.checkIn)) {
      bkErr = 'Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 ngày.';
      renderModalBody();
      return false;
    }
    const nights = calcNightsDiff(tempBk.checkIn, tempBk.checkOut);
    const rTotal = draftItems.reduce((s, it) => s + ((Number(it.qty) || 1) * (Number(it.unitPrice) || 0) * nights), 0);
    const upgCheck = computeUpgradeAnalysis(rTotal);

    const datesChanged = isPreCheckInEdit && (tempBk.checkIn !== existing.checkIn || tempBk.checkOut !== existing.checkOut);
    const itemsChanged = isPreCheckInEdit && (
      draftItems.length !== origItems.length ||
      draftItems.some((it, idx) => !origItems[idx] || it.categoryId !== origItems[idx].categoryId || (Number(it.qty) || 1) !== (Number(origItems[idx].qty) || 1))
    );

    if (isConfirmedPolicyActive && !canModifyDateOrUpgrade && (datesChanged || itemsChanged)) {
      bkErr = 'Chỉ được phép đổi ngày hoặc tăng hạng phòng trước ngày nhận phòng ít nhất 3 ngày.';
      renderModalBody();
      return false;
    }
    if (isPreCheckInEdit && canModifyDateOrUpgrade && tempBk.checkIn !== existing.checkIn && tempBk.checkIn < todayStr) {
      bkErr = 'Ngày nhận phòng mới không thể nhỏ hơn ngày hiện tại.';
      renderModalBody();
      return false;
    }
    if (upgCheck.hasCategoryDowngrade) {
      bkErr = 'Không hỗ trợ hạ hạng phòng. Chỉ cho phép giữ nguyên hoặc tăng hạng phòng trước ≥ 3 ngày.';
      renderModalBody();
      return false;
    }
    if (isConfirmedPolicyActive && isDepositLocked && upgCheck.hasRoomUpgrade && upgCheck.additionalDeposit > 0 && !tempBk.extraDepositPaid) {
      bkErr = `Tăng hạng phòng phát sinh thêm tiền cọc ${formatVND(upgCheck.additionalDeposit)}. Vui lòng xác nhận khách đã thanh toán thêm tiền cọc trước khi lưu.`;
      renderModalBody();
      return false;
    }

    const exAdults = tempBk.extraAdultChecked ? tempBk.extraAdultQty : 0;
    const exChildren = tempBk.extraChildChecked ? 1 : 0;
    const exUnder6 = tempBk.extraUnder6Checked ? 1 : 0;
    const surTotal = (exAdults * tempBk.adultRate * nights) + (exChildren * tempBk.childRate * nights) + stayEarlyFee + stayLateFee;
    const srvTotal = draftServices.reduce((s, x) => s + ((Number(x.qty) || 1) * (Number(x.price) || 0)), 0);
    const totalAmount = rTotal + surTotal + srvTotal;
    const depositAmount = (existing && isDepositLocked)
      ? (upgCheck.hasRoomUpgrade && upgCheck.additionalDeposit > 0 && tempBk.extraDepositPaid ? upgCheck.newDeposit50 : origDepositPaidVal)
      : Math.round(rTotal * 0.5);
    const primaryCatId = draftItems[0].categoryId;
    const computedStatus = linkedStays.some(s => getCheckinComputedStatus(s) === 'Đang lưu trú')
      ? 'Đang lưu trú'
      : (tempBk.depositPaid ? 'Đã xác nhận' : 'Chưa xác nhận');

    const prevCheckIn = existing ? existing.checkIn : '';
    const prevCheckOut = existing ? existing.checkOut : '';
    const cleanItems = draftItems.map(({ _lockedOriginal, ...rest }) => rest);

    let assignedRoomIds = existing ? getBookingAssignedRoomIds(existing) : [];
    if (!hasCheckedIn) {
      if (computedStatus === 'Đã xác nhận') {
        const finalSlots = allocateRoomsForBooking(cleanItems, existing?.id || null, draftAssignedRoomIds);
        const missingSlot = finalSlots.find(s => !s.roomId);
        if (missingSlot) {
          bkErr = `Không đủ phòng trống hạng ${missingSlot.categoryName} để phân phòng giữ chỗ khi xác nhận.`;
          renderModalBody();
          return false;
        }
        assignedRoomIds = finalSlots.map(s => s.roomId);
        if (new Set(assignedRoomIds).size !== assignedRoomIds.length) {
          bkErr = 'Không được chọn trùng cùng một phòng vật lý.';
          renderModalBody();
          return false;
        }
      } else {
        assignedRoomIds = [];
      }
    }

    if (existing) {
      Object.assign(existing, {
        customerId: tempBk.customerId,
        guestName, phone, email: tempBk.email || existing.email || '', idCard: tempBk.idCard || existing.idCard || '', source: tempBk.source,
        checkIn: tempBk.checkIn, checkOut: tempBk.checkOut, nights,
        adults: tempBk.adults,
        children: tempBk.children,
        childrenUnder6: exUnder6,
        children6to11: exChildren,
        childrenTotal: tempBk.children + exUnder6 + exChildren,
        items: cleanItems, serviceItems: draftServices,
        extraAdultsQty: exAdults, extraChildrenQty: exChildren, extraUnder6Qty: exUnder6, categoryId: primaryCatId,
        roomIds: assignedRoomIds, roomId: assignedRoomIds[0] || existing.roomId || '',
        roomTotal: rTotal, surchargeTotal: surTotal, totalAmount, depositAmount,
        depositPaid: !!tempBk.depositPaid, status: computedStatus, note: tempBk.note.trim()
      });
      if (!hasCheckedIn && computedStatus === 'Chưa xác nhận') {
        existing.roomId = '';
      }
      if (datesChanged) {
        recordBookingHistory(existing.id, 'Đổi ngày lưu trú', `${prevCheckIn} → ${prevCheckOut}`, `${tempBk.checkIn} → ${tempBk.checkOut}`);
      }
      if (existingStatus === 'Chưa xác nhận' && computedStatus === 'Đã xác nhận') {
        const heldNames = assignedRoomIds.map(getRoomNameById).join(', ');
        recordBookingHistory(existing.id, 'Xác nhận & phân phòng giữ chỗ', 'Chưa xác nhận', `Đã xác nhận (${heldNames})`);
      }
      if (upgCheck.hasRoomUpgrade) {
        const oldCatsText = origItems.map(it => `${getCategoryById(it.categoryId)?.name || it.categoryId} x${it.qty || 1}`).join(', ');
        const newCatsText = cleanItems.map(it => `${getCategoryById(it.categoryId)?.name || it.categoryId} x${it.qty || 1}`).join(', ');
        recordBookingHistory(existing.id, 'Tăng hạng phòng & bổ sung cọc', `${oldCatsText} (Cọc ${formatVND(origDepositPaidVal)})`, `${newCatsText} (Cọc ${formatVND(depositAmount)})`);
      }
    } else {
      state.bookings.unshift({
        id: tempBk.id, bookingTime: tempBk.bookingTime, customerId: tempBk.customerId,
        adminId: currentAdminUser.id, source: tempBk.source, guestName, phone, email: tempBk.email || '', idCard: tempBk.idCard || '',
        adults: tempBk.adults,
        children: tempBk.children,
        childrenUnder6: exUnder6,
        children6to11: exChildren,
        childrenTotal: tempBk.children + exUnder6 + exChildren,
        extraBed: exAdults, extraAdultsQty: exAdults, extraChildrenQty: exChildren, extraUnder6Qty: exUnder6,
        categoryId: primaryCatId, roomIds: assignedRoomIds, roomId: assignedRoomIds[0] || '', checkIn: tempBk.checkIn, checkOut: tempBk.checkOut, nights,
        items: cleanItems, serviceItems: draftServices, earlyLatePercent: 0,
        roomTotal: rTotal, surchargeTotal: surTotal, totalAmount, depositAmount,
        depositPaid: !!tempBk.depositPaid, checkedOutPaid: false, status: computedStatus, note: tempBk.note.trim()
      });
    }

    if (!Array.isArray(state.customers)) state.customers = [];
    const cust = state.customers.find(c => c.id === tempBk.customerId);
    if (cust) {
      cust.name = guestName;
      cust.phone = phone;
      if (tempBk.email) cust.email = tempBk.email.trim();
      if (tempBk.idCard) cust.idCard = tempBk.idCard.trim();
    } else {
      state.customers.unshift({
        id: tempBk.customerId, name: guestName, phone,
        email: (tempBk.email || '').trim(), idCard: (tempBk.idCard || '').trim(),
        note: '', status: 'Đang hoạt động'
      });
    }

    syncRoomReservationStates();
    saveState();
    updateSidebarCounters();
    return true;
  };

  const canCancel = existing && !isLocked && linkedStays.length === 0;
  const canConfirmDeposit = existing && !isLocked && linkedStays.length === 0 && existingStatus === 'Chưa xác nhận';
  const canCheckin = existing && !isLocked && linkedStays.length === 0 && existingStatus === 'Đã xác nhận';
  const isStaying = existing && linkedStays.some(s => getCheckinComputedStatus(s) === 'Đang lưu trú');

  const buttons = [];
  if (canCancel) {
    buttons.push({ label: 'Hủy đặt phòng', className: 'btn btn-danger', onClick: () => { closeModal(); openCancelBookingModal(existing.id); } });
  }
  if (canConfirmDeposit) {
    buttons.push({
      label: 'Xác nhận',
      className: 'btn btn-wood',
      onClick: () => {
        if (!persistBookingForm(true)) return;
        bookingStatusTab = 'Đã xác nhận';
        closeModal();
        renderBookings();
      }
    });
  }
  if (canCheckin) {
    buttons.push({ label: 'Nhận phòng', className: 'btn btn-wood', onClick: () => { closeModal(); openCheckinModal(null, existing.id); } });
  }
  if (isStaying) {
    buttons.push({
      label: 'Trả phòng & Thanh toán',
      className: 'btn btn-wood',
      onClick: () => {
        if (!persistBookingForm(false)) return;
        closeModal();
        checkOutAndCreateInvoice(existing.id);
      }
    });
  }
  buttons.push({ label: isLocked ? 'Đóng' : 'Bỏ qua', className: 'btn btn-outline', onClick: closeModal });
  if (!isLocked) {
    buttons.push({
      label: 'Lưu',
      className: 'btn btn-primary',
      onClick: () => {
        if (!persistBookingForm(false)) return;
        if (bookingStatusTab === 'Chưa xác nhận' && tempBk.depositPaid) {
          bookingStatusTab = 'Đã xác nhận';
        }
        closeModal();
        renderBookings();
      }
    });
  }

  openModal(existing ? `Chi tiết Đơn đặt phòng ${existing.id}` : 'Tạo Đơn đặt phòng mới', '', buttons);
  renderModalBody();
}

// -------------------- CHECK-IN (GÁN PHÒNG VẬT LÝ -> SINH LUU_TRU) --------------------
function openCheckinModal(checkinId = null, prefillBookingId = null) {
  if (!Array.isArray(state.checkins)) state.checkins = [];
  const existing = checkinId ? state.checkins.find(c => c.id === checkinId) : null;
  const availableBookings = existing ? state.bookings : state.bookings.filter(b => {
    const st = getBookingComputedStatus(b);
    return !state.checkins.some(c => c.bookingId === b.id) && (st === 'Chưa xác nhận' || st === 'Đã xác nhận');
  });
  if (!existing && availableBookings.length === 0) {
    openModal('Nhận phòng (Check-in)', '<p style="color:var(--text-muted);">Không có đơn đặt phòng nào chờ nhận phòng.</p>', [{ label: 'Đóng', className: 'btn btn-outline', onClick: closeModal }]);
    return;
  }

  const initBkId = existing ? existing.bookingId : (prefillBookingId && availableBookings.some(b => b.id === prefillBookingId) ? prefillBookingId : availableBookings[0].id);
  const initBk = state.bookings.find(b => b.id === initBkId) || availableBookings[0];
  const now = new Date();
  const bkYear = initBk?.checkIn ? Number(String(initBk.checkIn).slice(0, 4)) : now.getFullYear();
  const effectiveYear = (!isNaN(bkYear) && now.getFullYear() < bkYear) ? bkYear : now.getFullYear();
  const nowInputStr = `${effectiveYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const buildSlots = bk => {
    const items = Array.isArray(bk.items) && bk.items.length > 0 ? bk.items : [{ categoryId: bk.categoryId || 'HP001', qty: 1 }];
    const preAssignedIds = getBookingAssignedRoomIds(bk);
    const { openStayByRoom, reservedByRoom } = getRoomOccupancyMaps(bk.id);
    const slots = [];
    const used = new Set();
    items.forEach(it => {
      const cat = getCategoryById(it.categoryId);
      const count = Math.max(1, Number(it.qty) || 1);
      const preCat = state.rooms.filter(r =>
        preAssignedIds.includes(r.id) &&
        r.categoryId === it.categoryId &&
        !openStayByRoom.has(r.id) &&
        !reservedByRoom.has(r.id)
      );
      const vacant = state.rooms.filter(r =>
        r.categoryId === it.categoryId &&
        isRoomSelectableForHold(r, openStayByRoom, reservedByRoom)
      );
      for (let k = 0; k < count; k++) {
        let pick = preCat.find(r => !used.has(r.id)) ||
          vacant.find(r => !used.has(r.id)) ||
          state.rooms.find(r => isRoomSelectableForHold(r, openStayByRoom, reservedByRoom) && !used.has(r.id));
        if (pick) used.add(pick.id);
        slots.push({ detailId: it.detailId || null, categoryId: it.categoryId, categoryName: cat ? cat.name : it.categoryId, slotIndex: k + 1, slotTotal: count, roomId: pick ? pick.id : '' });
      }
    });
    return slots;
  };

  let ciErr = '';
  const tempCi = {
    bookingId: initBkId,
    customerId: initBk?.customerId || '',
    guestName: initBk?.guestName || '',
    phone: initBk?.phone || '',
    idCard: initBk?.idCard || '',
    roomSlots: buildSlots(initBk),
    actualCheckIn: nowInputStr,
    earlySurcharge: calcEarlyCheckinDetails(initBk, nowInputStr).fee,
    note: initBk?.note || ''
  };

  const renderCiSummaryHTML = (bk, eRes, fee) => `
    <div class="calc-row"><span>Giờ nhận phòng quy định:</span><strong>14:00 ${formatFullDateTimeVi(bk?.checkIn)}</strong></div>
    <div class="calc-row"><span>Giá trị tiền phòng / ngày:</span><strong>${formatVND(eRes.dailyRate)}</strong></div>
    <div class="calc-row total"><span>Phụ thu nhận sớm (${eRes.percent}% giá phòng/ngày):</span><span>${formatVND(fee)}</span></div>
  `;

  const renderCiBody = () => {
    const bk = state.bookings.find(b => b.id === tempCi.bookingId) || initBk;
    const eRes = calcEarlyCheckinDetails(bk, tempCi.actualCheckIn);
    tempCi.earlySurcharge = eRes.fee;

    document.getElementById('modalBody').innerHTML = `
      ${ciErr ? `<div class="form-error-banner">${ciErr}</div>` : ''}
      <div class="form-grid-2">
        <div class="form-group">
          <label>Đơn đặt phòng</label>
          <input type="text" class="form-control" value="${tempCi.bookingId} - ${tempCi.guestName}" disabled style="background:#f3f4f6;" />
        </div>
        <div class="form-group">
          <label>CCCD / Hộ chiếu <span class="req-star">*</span></label>
          <input type="text" id="ciIdCardInput" class="form-control" value="${tempCi.idCard}" placeholder="Nhập số CCCD / Hộ chiếu" />
        </div>
      </div>
      <div class="kv-section" style="margin-bottom:12px;">
        <div class="kv-section-header"><div class="kv-section-title">Chọn số phòng vật lý (${tempCi.roomSlots.length} phòng)</div></div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:10px;">
          ${tempCi.roomSlots.map((slot, sIdx) => {
            const { openStayByRoom, reservedByRoom } = getRoomOccupancyMaps(bk?.id || null);
            const slotRooms = state.rooms.filter(r =>
              (r.businessStatus || 'Đang kinh doanh') === 'Đang kinh doanh' &&
              !openStayByRoom.has(r.id) &&
              !reservedByRoom.has(r.id) &&
              (r.status === 'Trống' || r.status === 'Đã đặt' || r.id === slot.roomId)
            );
            return `
              <div class="form-group" style="margin:0;">
                <label style="font-size:12px;">${slot.categoryName} (${slot.slotIndex}/${slot.slotTotal}) <span class="req-star">*</span></label>
                <select class="form-control" data-ci-slot-room="${sIdx}">
                  <option value="">-- Chọn phòng --</option>
                  ${slotRooms.map(r => `<option value="${r.id}" ${r.id === slot.roomId ? 'selected' : ''}>${r.name} (${r.id})</option>`).join('')}
                </select>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Thời gian Check-in thực tế <span class="req-star">*</span></label>
          <input type="datetime-local" id="ciActualInInput" class="form-control" value="${tempCi.actualCheckIn}" />
          <small id="ciEarlyLabel" style="font-size:11.5px; color:var(--text-muted);">${eRes.label}</small>
        </div>
        <div class="form-group">
          <label>Ghi chú nhận phòng</label>
          <input type="text" id="ciNoteInput" class="form-control" value="${tempCi.note}" />
        </div>
      </div>
      <div id="ciSummaryBox" class="calc-summary-box">
        ${renderCiSummaryHTML(bk, eRes, tempCi.earlySurcharge)}
      </div>
    `;
    const syncCiTimePreview = e => {
      tempCi.actualCheckIn = e.target.value;
      const liveBk = state.bookings.find(b => b.id === tempCi.bookingId) || initBk;
      const liveRes = calcEarlyCheckinDetails(liveBk, tempCi.actualCheckIn);
      tempCi.earlySurcharge = liveRes.fee;
      const lbl = document.getElementById('ciEarlyLabel');
      const box = document.getElementById('ciSummaryBox');
      if (lbl) lbl.textContent = liveRes.label;
      if (box) box.innerHTML = renderCiSummaryHTML(liveBk, liveRes, tempCi.earlySurcharge);
    };
    const ciTimeEl = document.getElementById('ciActualInInput');
    ciTimeEl?.addEventListener('input', syncCiTimePreview);
    ciTimeEl?.addEventListener('change', syncCiTimePreview);
  };

  openModal(
    `Nhận phòng (Check-in) • ${initBk.id}`,
    '',
    [
      { label: 'Bỏ qua', className: 'btn btn-outline', onClick: closeModal },
      {
        label: 'Xác nhận Check-in',
        className: 'btn btn-primary',
        onClick: () => {
          tempCi.idCard = (document.getElementById('ciIdCardInput')?.value || '').trim();
          tempCi.actualCheckIn = document.getElementById('ciActualInInput')?.value || '';
          tempCi.note = (document.getElementById('ciNoteInput')?.value || '').trim();
          document.querySelectorAll('[data-ci-slot-room]').forEach(sel => { tempCi.roomSlots[Number(sel.getAttribute('data-ci-slot-room'))].roomId = sel.value; });

          if (!tempCi.idCard) { ciErr = 'Vui lòng nhập số CCCD / Hộ chiếu (*).'; renderCiBody(); return; }
          const chosen = tempCi.roomSlots.map(s => s.roomId);
          if (chosen.some(r => !r)) { ciErr = 'Vui lòng chọn đủ số phòng vật lý.'; renderCiBody(); return; }
          if (new Set(chosen).size !== chosen.length) { ciErr = 'Không chọn trùng phòng vật lý.'; renderCiBody(); return; }

          const bk = state.bookings.find(b => b.id === tempCi.bookingId);
          const cust = (state.customers || []).find(c => c.id === tempCi.customerId);
          if (cust) cust.idCard = tempCi.idCard;

          let nextNum = 0;
          (state.checkins || []).forEach(ci => {
            const m = String(ci.id).match(/^(?:LT|NP)(\d+)$/i);
            if (m && Number(m[1]) > nextNum) nextNum = Number(m[1]);
          });

          const fee = calcEarlyCheckinDetails(bk, tempCi.actualCheckIn).fee;
          tempCi.roomSlots.forEach((slot, idx) => {
            nextNum += 1;
            state.checkins.unshift({
              id: 'LT' + String(nextNum).padStart(3, '0'),
              detailId: slot.detailId || null,
              categoryId: slot.categoryId,
              bookingId: tempCi.bookingId,
              customerId: tempCi.customerId,
              guestName: tempCi.guestName,
              phone: tempCi.phone,
              idCard: tempCi.idCard,
              roomId: slot.roomId,
              expectedCheckIn: `${bk.checkIn} 14:00`,
              actualCheckIn: tempCi.actualCheckIn,
              expectedCheckOut: `${bk.checkOut} 12:00`,
              actualCheckOut: '',
              earlySurcharge: idx === 0 ? fee : 0,
              lateSurcharge: 0,
              staffName: currentAdminUser.name,
              note: tempCi.note,
              status: 'Đang lưu trú'
            });
            const rm = state.rooms.find(r => r.id === slot.roomId);
            if (rm) { rm.status = 'Đang ở'; rm.currentGuest = tempCi.guestName; }
          });

          if (bk) {
            bk.roomIds = [...chosen];
            bk.roomId = chosen[0];
            bk.idCard = tempCi.idCard;
            bk.depositPaid = true;
            bk.status = 'Đang lưu trú';
            bk.surchargeTotal = (Number(bk.surchargeTotal) || 0) + fee;
            const srvSum = Array.isArray(bk.serviceItems) ? bk.serviceItems.reduce((s, x) => s + (x.qty * x.price), 0) : 0;
            bk.totalAmount = (bk.roomTotal || 0) + bk.surchargeTotal + srvSum;
          }

          syncRoomReservationStates();
          bookingStatusTab = 'Đang lưu trú';
          saveState();
          updateSidebarCounters();
          closeModal();
          renderBookings();
        }
      }
    ]
  );
  renderCiBody();
}

// -------------------- TRẢ PHÒNG & THANH TOÁN --------------------
function checkOutAndCreateInvoice(bookingId) {
  const bk = state.bookings.find(b => b.id === bookingId);
  if (!bk) return;

  const existingInv = (state.invoices || []).find(i => i.bookingId === bk.id);
  if (getBookingComputedStatus(bk) === 'Hoàn thành' && existingInv) {
    openInvoiceDetailModal(existingInv.id);
    return;
  }

  const now = new Date();
  const bkYear = bk.checkOut ? Number(String(bk.checkOut).slice(0, 4)) : now.getFullYear();
  const effectiveYear = (!isNaN(bkYear) && now.getFullYear() < bkYear) ? bkYear : now.getFullYear();
  const nowInputStr = `${effectiveYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const stays = (state.checkins || []).filter(c => c.bookingId === bk.id);
  const nights = Math.max(1, Number(bk.nights) || calcNightsDiff(bk.checkIn, bk.checkOut));
  const items = Array.isArray(bk.items) && bk.items.length > 0
    ? bk.items
    : [{ categoryId: bk.categoryId || 'HP001', qty: 1, unitPrice: getCategoryEffectivePrice(bk.categoryId || 'HP001', bk.checkIn) }];
  const fullRoomCharge = Number(bk.roomTotal) || items.reduce((s, it) => s + ((Number(it.qty) || 1) * (Number(it.unitPrice) || 0) * nights), 0);

  const primaryCat = getCategoryById(items[0].categoryId);
  const adultRate = primaryCat?.extraAdultFee !== undefined ? primaryCat.extraAdultFee : 200000;
  const childRate = primaryCat?.extraChildFee !== undefined ? primaryCat.extraChildFee : 100000;
  const guestSurFee = ((Number(bk.extraAdultsQty) || 0) * adultRate * nights) + ((Number(bk.extraChildrenQty) || 0) * childRate * nights);
  const earlyFee = stays.reduce((s, lt) => s + (Number(lt.earlySurcharge) || 0), 0);
  const baseSurcharge = Math.max(Number(bk.surchargeTotal) || 0, guestSurFee + earlyFee);

  const srvItems = Array.isArray(bk.serviceItems) ? bk.serviceItems.map(s => ({ ...s })) : [];
  const srvTotal = srvItems.reduce((sum, s) => sum + ((Number(s.qty) || 1) * (Number(s.price) || 0)), 0);
  const paidDeposit = bk.depositPaid ? (Number(bk.depositAmount) || Math.round(fullRoomCharge * 0.5)) : 0;

  const uniqueActualIn = [...new Set(stays.map(s => formatFullDateTimeVi(s.actualCheckIn)).filter(v => v && v !== '-'))].join(', ') || formatFullDateTimeVi(bk.checkIn, '14:00');
  const roomNamesStr = stays.length
    ? [...new Set(stays.map(s => getRoomNameById(s.roomId)).filter(Boolean))].join(', ')
    : (bk.roomId ? getRoomNameById(bk.roomId) : '-');
  const categorySummary = [...new Set(items.map(it => getCategoryById(it.categoryId)?.name || it.categoryId).filter(Boolean))].join(', ');

  let tempCheckOutStr = nowInputStr;
  let selectedMethod = 'Chuyển khoản ngân hàng';

  const buildInvoiceRowsHTML = (lateRes) => {
    let stt = 0;
    const rows = [];
    items.forEach(it => {
      stt++;
      const cName = getCategoryById(it.categoryId)?.name || it.categoryId;
      const qty = Number(it.qty) || 1;
      const unitP = Number(it.unitPrice) || 0;
      rows.push(`
        <tr>
          <td style="text-align:center;">${stt}</td>
          <td>Tiền phòng ${cName} (${nights} ngày ban đầu)</td>
          <td style="text-align:center;">${qty}</td>
          <td style="text-align:right;">${formatVND(unitP)}</td>
          <td style="text-align:right;"><strong>${formatVND(qty * unitP * nights)}</strong></td>
        </tr>
      `);
    });
    if (guestSurFee > 0) {
      stt++;
      rows.push(`
        <tr>
          <td style="text-align:center;">${stt}</td>
          <td>Phụ thu thêm khách (${nights} ngày)</td>
          <td style="text-align:center;">1</td>
          <td style="text-align:right;">${formatVND(guestSurFee)}</td>
          <td style="text-align:right;"><strong>${formatVND(guestSurFee)}</strong></td>
        </tr>
      `);
    }
    if (earlyFee > 0) {
      stt++;
      rows.push(`
        <tr>
          <td style="text-align:center;">${stt}</td>
          <td>Phụ thu nhận phòng sớm</td>
          <td style="text-align:center;">1</td>
          <td style="text-align:right;">${formatVND(earlyFee)}</td>
          <td style="text-align:right;"><strong>${formatVND(earlyFee)}</strong></td>
        </tr>
      `);
    }
    const otherBaseSur = Math.max(0, baseSurcharge - guestSurFee - earlyFee);
    if (otherBaseSur > 0) {
      stt++;
      rows.push(`
        <tr>
          <td style="text-align:center;">${stt}</td>
          <td>Phụ thu khác</td>
          <td style="text-align:center;">1</td>
          <td style="text-align:right;">${formatVND(otherBaseSur)}</td>
          <td style="text-align:right;"><strong>${formatVND(otherBaseSur)}</strong></td>
        </tr>
      `);
    }
    if (lateRes.fee > 0) {
      stt++;
      rows.push(`
        <tr>
          <td style="text-align:center;">${stt}</td>
          <td>Phụ thu trả phòng muộn (${lateRes.percent}% giá phòng/ngày)</td>
          <td style="text-align:center;">1</td>
          <td style="text-align:right;">${formatVND(lateRes.fee)}</td>
          <td style="text-align:right;"><strong>${formatVND(lateRes.fee)}</strong></td>
        </tr>
      `);
    }
    srvItems.forEach(item => {
      stt++;
      const qty = Number(item.qty) || 1;
      const price = Number(item.price) || 0;
      rows.push(`
        <tr>
          <td style="text-align:center;">${stt}</td>
          <td>Dịch vụ: ${item.name}</td>
          <td style="text-align:center;">${qty}</td>
          <td style="text-align:right;">${formatVND(price)}</td>
          <td style="text-align:right;"><strong>${formatVND(qty * price)}</strong></td>
        </tr>
      `);
    });
    return rows.join('');
  };

  const buildSummaryHTML = (lateRes) => {
    const totalSur = baseSurcharge + lateRes.fee;
    const totalBefore = fullRoomCharge + totalSur + srvTotal;
    const payable = Math.max(0, totalBefore - paidDeposit);
    return `
      <div class="calc-row"><span>Tiền phòng (${nights} ngày gốc - không trừ khi trả sớm):</span><strong>${formatVND(fullRoomCharge)}</strong></div>
      ${totalSur > 0 ? `<div class="calc-row"><span>Phụ thu (thêm khách / nhận sớm / trả muộn):</span><strong>${formatVND(totalSur)}</strong></div>` : ''}
      ${srvTotal > 0 ? `<div class="calc-row"><span>Dịch vụ phát sinh:</span><strong>${formatVND(srvTotal)}</strong></div>` : ''}
      <div class="calc-row"><span>Tổng tiền hóa đơn:</span><strong>${formatVND(totalBefore)}</strong></div>
      <div class="calc-row deposit"><span>Đã cọc giữ phòng:</span><span>-${formatVND(paidDeposit)}</span></div>
      <div class="calc-row total"><span>Cần thanh toán khi trả phòng:</span><span>${formatVND(payable)}</span></div>
    `;
  };

  const initialLateRes = calcLateCheckoutDetails(bk, tempCheckOutStr);
  openModal(
    `Hóa đơn Trả phòng & Thanh toán • ${bk.id}`,
    `
      <div class="form-grid-3" style="margin-bottom:10px;">
        <div class="form-group"><label>Khách hàng</label><input type="text" class="form-control" value="${bk.guestName || '-'}" disabled style="background:#f3f4f6;" /></div>
        <div class="form-group"><label>Phòng đã nhận</label><input type="text" class="form-control" value="${roomNamesStr}" disabled style="background:#f3f4f6;font-weight:600;" /></div>
        <div class="form-group"><label>Thời gian thực nhận</label><input type="text" class="form-control" value="${uniqueActualIn}" disabled style="background:#f3f4f6;" /></div>
      </div>
      <div class="form-grid-3" style="margin-bottom:12px;">
        <div class="form-group"><label>Thời gian trả dự kiến</label><input type="text" class="form-control" value="${formatFullDateTimeVi(bk.checkOut, '12:00')}" disabled style="background:#f3f4f6;" /></div>
        <div class="form-group">
          <label>Thời gian trả thực tế <span class="req-star">*</span></label>
          <input type="datetime-local" id="coActualOutInput" class="form-control" value="${tempCheckOutStr}" />
          <small id="coLateLabel" style="font-size:11.5px; color:var(--text-muted);">${initialLateRes.label}</small>
        </div>
        <div class="form-group">
          <label>Phương thức thanh toán</label>
          <select id="coPaymentMethod" class="form-control">
            ${['Chuyển khoản ngân hàng', 'Tiền mặt', 'Thẻ tín dụng / POS', 'Ví điện tử'].map(m => `<option value="${m}">${m}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="kv-section">
        <div class="kv-section-header">
          <div class="kv-section-title">Chi tiết hóa đơn thanh toán (${nights} ngày ban đầu)</div>
          <span class="badge badge-reserved">Chờ thanh toán</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:45px; text-align:center;">STT</th>
                <th>Hạng mục</th>
                <th style="width:70px; text-align:center;">SL</th>
                <th style="width:115px; text-align:right;">Đơn giá</th>
                <th style="width:125px; text-align:right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody id="coInvoiceTbody">${buildInvoiceRowsHTML(initialLateRes)}</tbody>
          </table>
        </div>
      </div>

      <div id="coInvoiceSummary" class="calc-summary-box">${buildSummaryHTML(initialLateRes)}</div>
    `,
    [
      { label: 'Bỏ qua', className: 'btn btn-outline', onClick: closeModal },
      {
        label: 'Xác nhận Thanh toán & Hoàn thành',
        className: 'btn btn-primary',
        onClick: () => {
          const actualOut = document.getElementById('coActualOutInput')?.value || tempCheckOutStr;
          const method = document.getElementById('coPaymentMethod')?.value || selectedMethod;
          const finalLateRes = calcLateCheckoutDetails(bk, actualOut);
          const totalSurcharge = baseSurcharge + finalLateRes.fee;
          const totalBeforeDeposit = fullRoomCharge + totalSurcharge + srvTotal;
          const finalPayable = Math.max(0, totalBeforeDeposit - paidDeposit);

          bk.depositPaid = true;
          bk.checkedOutPaid = true;
          bk.status = 'Hoàn thành';
          bk.roomTotal = fullRoomCharge;
          bk.surchargeTotal = totalSurcharge;
          bk.totalAmount = totalBeforeDeposit;

          stays.forEach((ci, idx) => {
            ci.actualCheckOut = actualOut;
            ci.lateSurcharge = idx === 0 ? finalLateRes.fee : 0;
            ci.status = 'Đã trả phòng';
            const rm = state.rooms.find(r => r.id === ci.roomId);
            if (rm) { rm.status = 'Đang dọn'; rm.currentGuest = ''; }
          });

          if (!Array.isArray(state.invoices)) state.invoices = [];
          const newInv = {
            id: generateNextInvoiceId(),
            bookingId: bk.id,
            customerId: bk.customerId || '',
            guestName: bk.guestName,
            roomId: bk.roomId || stays[0]?.roomId || '-',
            roomNames: roomNamesStr,
            categoryName: categorySummary || bk.categoryId,
            createdDate: actualOut.slice(0, 10),
            createdTime: formatCheckinTimeDisplay(actualOut),
            categoryType: 'Thanh toán trả phòng',
            roomCharge: fullRoomCharge,
            surchargeAmount: totalSurcharge,
            serviceItems: srvItems,
            serviceChargeTotal: srvTotal,
            totalBeforeDeposit,
            depositPaid: paidDeposit,
            finalPayable,
            paymentMethod: method,
            status: 'Đã thanh toán'
          };
          state.invoices.unshift(newInv);

          bookingStatusTab = 'Hoàn thành';
          saveState();
          updateSidebarCounters();
          closeModal();
          renderBookings();
          openInvoicePrintModal(newInv.id);
        }
      }
    ]
  );

  const syncCheckoutPreview = e => {
    tempCheckOutStr = e.target.value;
    const lateRes = calcLateCheckoutDetails(bk, tempCheckOutStr);
    const lbl = document.getElementById('coLateLabel');
    const tbody = document.getElementById('coInvoiceTbody');
    const summary = document.getElementById('coInvoiceSummary');
    if (lbl) lbl.textContent = lateRes.label;
    if (tbody) tbody.innerHTML = buildInvoiceRowsHTML(lateRes);
    if (summary) summary.innerHTML = buildSummaryHTML(lateRes);
  };
  const coOutEl = document.getElementById('coActualOutInput');
  coOutEl?.addEventListener('input', syncCheckoutPreview);
  coOutEl?.addEventListener('change', syncCheckoutPreview);
  document.getElementById('coPaymentMethod')?.addEventListener('change', e => { selectedMethod = e.target.value; });
}

// -------------------- HỦY ĐẶT PHÒNG --------------------
function openCancelBookingModal(bookingId) {
  const bk = state.bookings.find(b => b.id === bookingId);
  if (!bk) return;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isDeposited = bk.depositPaid !== undefined ? bk.depositPaid : (getBookingComputedStatus(bk) !== 'Chưa xác nhận');
  const paidDeposit = isDeposited ? (bk.depositAmount || 0) : 0;

  const getCancelResult = () => {
    const cancelDate = document.getElementById('cancelDateInput')?.value || todayStr;
    const d1 = new Date(cancelDate + 'T00:00:00');
    const d2 = new Date(bk.checkIn + 'T00:00:00');
    const days = Math.round((d2 - d1) / 86400000);
    let feePercent = 100;
    let ruleLabel = 'Hủy sát ngày / 1–3 ngày: Thu 100% tiền cọc (không hoàn cọc)';
    if (days >= 10) { feePercent = 0; ruleLabel = 'Hủy trước ≥ 10 ngày: Miễn phí (0% tiền cọc), hoàn 100% cọc'; }
    else if (days >= 4) { feePercent = 50; ruleLabel = 'Hủy trước 4–9 ngày: Thu 50% tiền cọc (hoàn 50% cọc)'; }
    const feeAmount = Math.round((paidDeposit * feePercent) / 100);
    return { cancelDate, days, feePercent, ruleLabel, feeAmount, refund: Math.max(0, paidDeposit - feeAmount) };
  };

  openModal(
    `Hủy Đặt phòng ${bk.id}`,
    `
      <div class="form-grid-2" style="margin-bottom:12px;">
        <div class="form-group"><label>Khách hàng</label><input type="text" class="form-control" value="${bk.guestName}" disabled style="background:#f3f4f6;" /></div>
        <div class="form-group"><label>Ngày nhận phòng</label><input type="text" class="form-control" value="${formatFullDateTimeVi(bk.checkIn)}" disabled style="background:#f3f4f6;" /></div>
      </div>
      <div class="form-grid-2" style="margin-bottom:12px;">
        <div class="form-group"><label>Ngày báo hủy</label><input type="date" id="cancelDateInput" class="form-control" value="${todayStr}" /></div>
        <div class="form-group"><label>Lý do hủy phòng</label><input type="text" id="cancelReasonInput" class="form-control" placeholder="Khách thay đổi lịch trình..." /></div>
      </div>
      <div id="cancelPolicyPreview" class="calc-summary-box"></div>
    `,
    [
      { label: 'Bỏ qua', className: 'btn btn-outline', onClick: closeModal },
      {
        label: 'Xác nhận Hủy',
        className: 'btn btn-danger',
        onClick: () => {
          const res = getCancelResult();
          bk.cancelled = true;
          bk.status = 'Đã hủy';
          bk.cancelDate = res.cancelDate;
          bk.roomIds = [];
          bk.roomId = '';
          bk.cancelFee = res.feeAmount;
          bk.cancelReason = document.getElementById('cancelReasonInput').value.trim();
          recordCancelFeeInvoiceIfForfeited(bk, res.cancelDate, res.feePercent, res.ruleLabel, res.feeAmount);
          syncRoomReservationStates();
          bookingStatusTab = 'Đã hủy';
          saveState();
          updateSidebarCounters();
          closeModal();
          renderBookings();
        }
      }
    ]
  );

  const updatePreview = () => {
    const res = getCancelResult();
    document.getElementById('cancelPolicyPreview').innerHTML = `
      <div class="calc-row"><span>Tiền cọc đã đặt:</span><strong>${formatVND(paidDeposit)}${!isDeposited ? ' (Chưa đặt cọc)' : ''}</strong></div>
      <div class="calc-row"><span>Số ngày báo trước:</span><strong>${res.days} ngày</strong></div>
      <div class="calc-row"><span>Chính sách:</span><strong>${res.ruleLabel}</strong></div>
      <div class="calc-row total"><span>Phí hủy (${res.feePercent}% tiền cọc):</span><span>${formatVND(res.feeAmount)}</span></div>
      ${isDeposited ? `<div class="calc-row deposit"><span>Tiền cọc hoàn lại:</span><span>${formatVND(res.refund)}</span></div>` : ''}
    `;
  };
  document.getElementById('cancelDateInput')?.addEventListener('change', updatePreview);
  updatePreview();
}

// -------------------- THANH TOÁN (ThanhToan) --------------------
function renderInvoices() {
  const container = document.getElementById('view-invoices');
  if (!container) return;

  const invoiceCategories = [...new Set([
    'Thanh toán trả phòng',
    'Phí hủy phòng',
    ...(state.invoices || []).map(inv => inv.categoryType || 'Thanh toán trả phòng').filter(Boolean)
  ])];

  const filtered = (state.invoices || []).filter(inv => {
    const invType = inv.categoryType || 'Thanh toán trả phòng';
    if (invoiceTypeFilter !== 'ALL' && invType !== invoiceTypeFilter) return false;
    if (invoiceSearchQuery.trim() !== '') {
      const q = invoiceSearchQuery.trim().toLowerCase();
      return (
        inv.id.toLowerCase().includes(q) ||
        (inv.bookingId || '').toLowerCase().includes(q) ||
        (inv.customerId || '').toLowerCase().includes(q) ||
        (inv.guestName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-filters">
        <input type="text" id="invSearchInput" class="form-control" placeholder="Tìm mã thanh toán, mã đơn đặt, tên khách..." value="${invoiceSearchQuery}" />
        <select id="invCategoryFilter" class="form-control">
          <option value="ALL">Tất cả phân loại</option>
          ${invoiceCategories.map(cat => `<option value="${cat}" ${invoiceTypeFilter === cat ? 'selected' : ''}>${cat}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="card">
      <div class="card-body" style="padding:0;">
        <div class="table-responsive">
          <table class="data-table compact-table">
            <thead>
              <tr>
                <th>Mã thanh toán</th>
                <th>Mã đơn đặt</th>
                <th>Khách hàng</th>
                <th>Thời gian lập</th>
                <th>Phân loại</th>
                <th>Phương thức</th>
                <th style="text-align:right;">Tổng tiền</th>
                <th style="width:60px; text-align:center;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:24px;">Không có giao dịch thanh toán nào.</td></tr>
              ` : filtered.map(inv => `
                <tr>
                  <td><strong>${inv.id}</strong></td>
                  <td><strong>${inv.bookingId || '-'}</strong></td>
                  <td><strong>${inv.guestName}</strong></td>
                  <td>${formatFullDateTimeVi(inv.createdTime || inv.createdDate)}</td>
                  <td><span class="badge ${inv.categoryType === 'Phí hủy phòng' ? 'badge-maintenance' : 'badge-pistachio'}">${inv.categoryType || 'Thanh toán trả phòng'}</span></td>
                  <td>${inv.paymentMethod || '-'}</td>
                  <td style="text-align:right;"><strong>${formatVND(inv.totalBeforeDeposit)}</strong></td>
                  <td style="text-align:center;"><button class="btn btn-outline btn-icon" title="Xem chi tiết" onclick="openInvoiceDetailModal('${inv.id}')">${ICON_PLAY}</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('invSearchInput')?.addEventListener('input', e => {
    invoiceSearchQuery = e.target.value;
    renderInvoices();
    const el = document.getElementById('invSearchInput');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  });
  document.getElementById('invCategoryFilter')?.addEventListener('change', e => {
    invoiceTypeFilter = e.target.value;
    renderInvoices();
  });
}

function getInvoiceSurchargeBreakdown(inv, bk, stays, nights) {
  const list = [];
  const totalSur = Number(inv?.surchargeAmount) || 0;
  if (totalSur <= 0 && (!stays || stays.length === 0)) return list;

  const primaryCatId = (bk?.items && bk.items[0]?.categoryId) || bk?.categoryId;
  const primaryCat = primaryCatId ? getCategoryById(primaryCatId) : null;
  const adultRate = primaryCat?.extraAdultFee !== undefined ? primaryCat.extraAdultFee : 200000;
  const childRate = primaryCat?.extraChildFee !== undefined ? primaryCat.extraChildFee : 100000;
  const exAdults = Number(bk?.extraAdultsQty !== undefined ? bk.extraAdultsQty : (bk?.extraBed || 0)) || 0;
  const exChildren = Number(bk?.extraChildrenQty !== undefined ? bk.extraChildrenQty : (bk?.children6to11 || 0)) || 0;
  const adultFee = exAdults > 0 ? exAdults * adultRate * nights : 0;
  const childFee = exChildren > 0 ? exChildren * childRate * nights : 0;
  const earlyFee = (stays || []).reduce((s, lt) => s + (Number(lt.earlySurcharge) || 0), 0);
  const lateFee = (stays || []).reduce((s, lt) => s + (Number(lt.lateSurcharge) || 0), 0);
  const dailyRate = bk ? getBookingNightlyRate(bk) : 0;

  if (adultFee > 0) {
    list.push({ label: `Phụ thu giường phụ (${exAdults} giường • ${primaryCat?.name || 'Phòng'} • ${nights} ngày)`, qty: exAdults, unitPrice: adultRate, total: adultFee });
  }
  if (childFee > 0) {
    list.push({ label: `Phụ thu thêm ${exChildren} trẻ em (${primaryCat?.name || 'Phòng'} • ${nights} ngày)`, qty: exChildren, unitPrice: childRate, total: childFee });
  }
  if (earlyFee > 0) {
    const pct = dailyRate > 0 ? Math.round((earlyFee / dailyRate) * 100) : 0;
    list.push({ label: `Phụ thu nhận phòng sớm${pct > 0 ? ` (${pct}% giá phòng/ngày)` : ''}`, qty: 1, unitPrice: earlyFee, total: earlyFee });
  }
  if (lateFee > 0) {
    const pct = dailyRate > 0 ? Math.round((lateFee / dailyRate) * 100) : 0;
    list.push({ label: `Phụ thu trả phòng muộn${pct > 0 ? ` (${pct}% giá phòng/ngày)` : ''}`, qty: 1, unitPrice: lateFee, total: lateFee });
  }

  const knownSum = adultFee + childFee + earlyFee + lateFee;
  const otherFee = Math.max(0, totalSur - knownSum);
  if (otherFee > 0) {
    list.push({ label: 'Phụ thu khác', qty: 1, unitPrice: otherFee, total: otherFee });
  }
  return list;
}

function openInvoiceDetailModal(invId) {
  const inv = state.invoices.find(i => i.id === invId);
  if (!inv) return;
  const bk = inv.bookingId ? (state.bookings || []).find(b => b.id === inv.bookingId) : null;
  const stays = inv.bookingId ? (state.checkins || []).filter(c => c.bookingId === inv.bookingId) : [];
  const roomDisplay = inv.roomNames || (stays.length ? [...new Set(stays.map(s => getRoomNameById(s.roomId)).filter(Boolean))].join(', ') : (inv.roomId ? getRoomNameById(inv.roomId) : '-'));
  const nights = bk ? Math.max(1, Number(bk.nights) || calcNightsDiff(bk.checkIn, bk.checkOut)) : 1;
  const isCancelInvoice = inv.categoryType === 'Phí hủy phòng';

  let stt = 0;
  const rows = [];
  if (isCancelInvoice) {
    const cancelItems = Array.isArray(inv.serviceItems) && inv.serviceItems.length > 0
      ? inv.serviceItems
      : [{ name: 'Phí hủy đặt phòng (khấu trừ tiền cọc)', qty: 1, price: inv.totalBeforeDeposit || 0 }];
    cancelItems.forEach(item => {
      const q = Number(item.qty) || 1;
      const p = Number(item.price) || 0;
      rows.push(`<tr><td style="text-align:center;">${++stt}</td><td>${item.name}${bk?.cancelReason ? ` <small style="color:var(--text-muted);">(${bk.cancelReason})</small>` : ''}</td><td style="text-align:center;">${q}</td><td style="text-align:right;">${formatVND(p)}</td><td style="text-align:right;"><strong>${formatVND(q * p)}</strong></td></tr>`);
    });
  } else {
    if (bk && Array.isArray(bk.items) && bk.items.length > 0) {
      bk.items.forEach(it => {
        const catName = getCategoryById(it.categoryId)?.name || it.categoryId;
        const q = Number(it.qty) || 1;
        const p = Number(it.unitPrice) || 0;
        rows.push(`<tr><td style="text-align:center;">${++stt}</td><td>Tiền phòng ${catName} (${nights} ngày)</td><td style="text-align:center;">${q}</td><td style="text-align:right;">${formatVND(p)}</td><td style="text-align:right;"><strong>${formatVND(q * p * nights)}</strong></td></tr>`);
      });
    } else {
      rows.push(`<tr><td style="text-align:center;">${++stt}</td><td>Tiền phòng (${inv.categoryName || '-'})</td><td style="text-align:center;">1</td><td style="text-align:right;">${formatVND(inv.roomCharge)}</td><td style="text-align:right;"><strong>${formatVND(inv.roomCharge)}</strong></td></tr>`);
    }
    const surBreakdown = getInvoiceSurchargeBreakdown(inv, bk, stays, nights);
    surBreakdown.forEach(sur => {
      rows.push(`<tr><td style="text-align:center;">${++stt}</td><td>${sur.label}</td><td style="text-align:center;">${sur.qty}</td><td style="text-align:right;">${formatVND(sur.unitPrice)}</td><td style="text-align:right;"><strong>${formatVND(sur.total)}</strong></td></tr>`);
    });
    (inv.serviceItems || []).forEach(item => {
      const q = Number(item.qty) || 1;
      const p = Number(item.price) || 0;
      rows.push(`<tr><td style="text-align:center;">${++stt}</td><td>Dịch vụ: ${item.name}</td><td style="text-align:center;">${q}</td><td style="text-align:right;">${formatVND(p)}</td><td style="text-align:right;"><strong>${formatVND(q * p)}</strong></td></tr>`);
    });
  }

  openModal(
    `Chi tiết Thanh toán ${inv.id}`,
    `
      <div class="form-grid-3" style="margin-bottom:10px;">
        <div class="form-group"><label>Mã thanh toán</label><input type="text" class="form-control" value="${inv.id}" disabled style="background:#f3f4f6;" /></div>
        <div class="form-group"><label>Mã đặt phòng</label><input type="text" class="form-control" value="${inv.bookingId || '-'}" disabled style="background:#f3f4f6;" /></div>
        <div class="form-group"><label>Thời gian lập</label><input type="text" class="form-control" value="${formatFullDateTimeVi(inv.createdTime || inv.createdDate)}" disabled style="background:#f3f4f6;" /></div>
      </div>
      <div class="form-grid-3" style="margin-bottom:12px;">
        <div class="form-group"><label>Khách hàng</label><input type="text" class="form-control" value="${inv.guestName || '-'}" disabled style="background:#f3f4f6;" /></div>
        <div class="form-group"><label>${isCancelInvoice ? 'Phân loại' : 'Phòng'}</label><input type="text" class="form-control" value="${isCancelInvoice ? (inv.categoryType || 'Phí hủy phòng') : roomDisplay}" disabled style="background:#f3f4f6;" /></div>
        <div class="form-group"><label>Phương thức</label><input type="text" class="form-control" value="${inv.paymentMethod || '-'}" disabled style="background:#f3f4f6;" /></div>
      </div>
      <div class="kv-section">
        <div class="kv-section-header">
          <div class="kv-section-title">Chi tiết các khoản</div>
          <span class="badge ${isCancelInvoice ? 'badge-maintenance' : 'badge-available'}">${isCancelInvoice ? 'Phí hủy phòng' : (inv.status || 'Đã thanh toán')}</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th style="width:45px;text-align:center;">STT</th><th>Hạng mục</th><th style="width:70px;text-align:center;">SL</th><th style="width:115px;text-align:right;">Đơn giá</th><th style="width:125px;text-align:right;">Thành tiền</th></tr></thead>
            <tbody>${rows.join('')}</tbody>
          </table>
        </div>
      </div>
      <div class="calc-summary-box">
        ${isCancelInvoice ? `
          <div class="calc-row"><span>Tiền cọc đã đặt:</span><strong>${formatVND(bk?.depositAmount || inv.depositPaid)}</strong></div>
          <div class="calc-row"><span>Khấu trừ phí hủy:</span><strong>${formatVND(inv.totalBeforeDeposit)}</strong></div>
          <div class="calc-row total"><span>Hoàn lại cho khách:</span><span>${formatVND(Math.max(0, (Number(bk?.depositAmount) || Number(inv.depositPaid) || 0) - (Number(inv.totalBeforeDeposit) || 0)))}</span></div>
        ` : `
          <div class="calc-row"><span>Tổng tiền:</span><strong>${formatVND(inv.totalBeforeDeposit)}</strong></div>
          <div class="calc-row deposit"><span>Đã cọc giữ phòng:</span><span>-${formatVND(inv.depositPaid)}</span></div>
          <div class="calc-row total"><span>Đã thanh toán khi trả phòng:</span><span>${formatVND(inv.finalPayable)}</span></div>
        `}
      </div>
    `,
    [{ label: 'Đóng', className: 'btn btn-primary', onClick: closeModal }]
  );
}

function openInvoicePrintModal(invId) {
  const inv = state.invoices.find(i => i.id === invId);
  if (!inv) return;

  const bk = inv.bookingId ? (state.bookings || []).find(b => b.id === inv.bookingId) : null;
  const stays = inv.bookingId ? (state.checkins || []).filter(c => c.bookingId === inv.bookingId) : [];
  const hotel = state.hotelInfo || {};
  const hotelName = hotel.name || 'Velora Hotel';
  const hotelAddr = hotel.address || 'Số 29, Đường Thác Bạc, Sa Pa, Lào Cai';
  const hotelPhone = hotel.hotline || hotel.phone || '0868 588 824';

  const roomDisplay = inv.roomNames || (stays.length ? [...new Set(stays.map(s => getRoomNameById(s.roomId)).filter(Boolean))].join(', ') : (inv.roomId ? getRoomNameById(inv.roomId) : '-'));
  const actualInDisplay = [...new Set(stays.map(s => formatFullDateTimeVi(s.actualCheckIn)).filter(v => v && v !== '-'))].join(', ') || (bk ? formatFullDateTimeVi(bk.checkIn, '14:00') : '-');
  const actualOutDisplay = [...new Set(stays.map(s => formatFullDateTimeVi(s.actualCheckOut)).filter(v => v && v !== '-'))].join(', ') || formatFullDateTimeVi(inv.createdTime || inv.createdDate);
  const nights = bk ? Math.max(1, Number(bk.nights) || calcNightsDiff(bk.checkIn, bk.checkOut)) : 1;
  const cashierName = inv.staffName || stays[0]?.staffName || currentAdminUser?.name || 'admin';
  const guestPhone = bk?.phone || '';

  const isCancelInvoice = inv.categoryType === 'Phí hủy phòng';
  const receiptRows = [];
  if (isCancelInvoice) {
    const cancelItems = Array.isArray(inv.serviceItems) && inv.serviceItems.length > 0
      ? inv.serviceItems
      : [{ name: 'Phí hủy đặt phòng (khấu trừ tiền cọc)', qty: 1, price: inv.totalBeforeDeposit || 0 }];
    cancelItems.forEach(item => {
      const q = Number(item.qty) || 1;
      const p = Number(item.price) || 0;
      receiptRows.push(`
        <tr>
          <td>
            <strong>${item.name}</strong>
            ${bk?.cancelReason ? `<div class="receipt-subline">Lý do: ${bk.cancelReason}</div>` : ''}
            ${item.note ? `<div class="receipt-subline">${item.note}</div>` : ''}
          </td>
          <td style="text-align:right;">${formatVND(p)}</td>
          <td style="text-align:center;">${q}</td>
          <td style="text-align:right;"><strong>${formatVND(q * p)}</strong></td>
        </tr>
      `);
    });
  } else {
    if (bk && Array.isArray(bk.items) && bk.items.length > 0) {
      bk.items.forEach(it => {
        const catName = getCategoryById(it.categoryId)?.name || it.categoryId;
        const roomQty = Number(it.qty) || 1;
        const unitP = Number(it.unitPrice) || 0;
        const totalUnits = roomQty * nights;
        receiptRows.push(`
          <tr>
            <td>
              <strong>${catName} (Ngày)</strong>${roomDisplay && roomDisplay !== '-' ? ` &bull; ${roomDisplay}` : ''}
              <div class="receipt-subline">${actualInDisplay} - ${actualOutDisplay}</div>
              <div class="receipt-subline">${roomQty} phòng &times; ${nights} ngày &bull; Đã trả</div>
            </td>
            <td style="text-align:right;">${formatVND(unitP)}</td>
            <td style="text-align:center;">${totalUnits}</td>
            <td style="text-align:right;"><strong>${formatVND(totalUnits * unitP)}</strong></td>
          </tr>
        `);
      });
    } else {
      receiptRows.push(`
        <tr>
          <td>
            <strong>${inv.categoryName || 'Tiền phòng'}</strong>${roomDisplay && roomDisplay !== '-' ? ` &bull; ${roomDisplay}` : ''}
            <div class="receipt-subline">${actualInDisplay} - ${actualOutDisplay}</div>
            <div class="receipt-subline">Đã trả</div>
          </td>
          <td style="text-align:right;">${formatVND(inv.roomCharge)}</td>
          <td style="text-align:center;">1</td>
          <td style="text-align:right;"><strong>${formatVND(inv.roomCharge)}</strong></td>
        </tr>
      `);
    }

    const surBreakdown = getInvoiceSurchargeBreakdown(inv, bk, stays, nights);
    surBreakdown.forEach(sur => {
      receiptRows.push(`<tr><td>${sur.label}</td><td style="text-align:right;">${formatVND(sur.unitPrice)}</td><td style="text-align:center;">${sur.qty}</td><td style="text-align:right;"><strong>${formatVND(sur.total)}</strong></td></tr>`);
    });

    (inv.serviceItems || []).forEach(item => {
      const q = Number(item.qty) || 1;
      const p = Number(item.price) || 0;
      receiptRows.push(`
        <tr>
          <td>Dịch vụ: ${item.name}</td>
          <td style="text-align:right;">${formatVND(p)}</td>
          <td style="text-align:center;">${q}</td>
          <td style="text-align:right;"><strong>${formatVND(q * p)}</strong></td>
        </tr>
      `);
    });
  }

  openModal(
    `Biểu mẫu Hóa đơn ${inv.id}`,
    `
      <div id="invoiceReceiptSheet" class="receipt-sheet">
        <div class="receipt-meta">
          <div><strong>Khách sạn:</strong> ${hotelName}</div>
          <div><strong>Địa chỉ:</strong> ${hotelAddr}</div>
          <div><strong>Điện thoại:</strong> ${hotelPhone}</div>
        </div>
        <hr class="receipt-divider" />
        <div class="receipt-meta">
          <div>Liên số: Liên 1</div>
          <div>Ngày xuất HĐ: ${formatFullDateTimeVi(inv.createdTime || inv.createdDate)}</div>
        </div>
        <div class="receipt-title-wrap">
          <h4>${isCancelInvoice ? 'BIÊN NHẬN PHÍ HỦY ĐẶT PHÒNG' : 'HÓA ĐƠN THANH TOÁN'}</h4>
          <div class="receipt-code">${inv.id}</div>
        </div>
        <div class="receipt-meta" style="margin-bottom:8px;">
          <div><strong>Khách hàng:</strong> ${inv.guestName || 'Khách lẻ'}${guestPhone ? ` (${guestPhone})` : ''}</div>
          <div><strong>Mã đặt phòng:</strong> ${inv.bookingId || '-'}</div>
          ${!isCancelInvoice ? `<div><strong>Phòng:</strong> ${roomDisplay}</div>` : ''}
          <div><strong>Thu ngân:</strong> ${cashierName}</div>
        </div>

        <table class="receipt-table">
          <thead>
            <tr>
              <th>Nội dung</th>
              <th style="text-align:right; width:90px;">Đơn giá</th>
              <th style="text-align:center; width:45px;">SL</th>
              <th style="text-align:right; width:105px;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>${receiptRows.join('')}</tbody>
        </table>

        <div class="receipt-totals">
          ${isCancelInvoice ? `
            <div class="receipt-total-row"><span>Tiền cọc đã đặt:</span><span>${formatVND(bk?.depositAmount || inv.depositPaid)}</span></div>
            <div class="receipt-total-row"><span>Khấu trừ phí hủy:</span><span>${formatVND(inv.totalBeforeDeposit)}</span></div>
            <div class="receipt-total-row grand"><span>Hoàn lại cho khách:</span><span>${formatVND(Math.max(0, (Number(bk?.depositAmount) || Number(inv.depositPaid) || 0) - (Number(inv.totalBeforeDeposit) || 0)))}</span></div>
          ` : `
            <div class="receipt-total-row"><span>Tổng tiền hàng:</span><span>${formatVND(inv.totalBeforeDeposit)}</span></div>
            <div class="receipt-total-row"><span>Đã cọc giữ phòng:</span><span>-${formatVND(inv.depositPaid)}</span></div>
            <div class="receipt-total-row grand"><span>Tổng cộng thanh toán:</span><span>${formatVND(inv.finalPayable)}</span></div>
          `}
          <div class="receipt-total-row" style="font-size:12px; color:#4b5563;"><span>Hình thức:</span><span>${inv.paymentMethod || 'Chuyển khoản ngân hàng'}</span></div>
        </div>

        <div class="receipt-footer">
          <div>Cảm ơn và hẹn gặp lại</div>
          <div>${hotelName} PMS</div>
        </div>
      </div>
    `,
    [
      { label: 'In hóa đơn', className: 'btn btn-wood', onClick: () => window.print() },
      { label: 'Đóng', className: 'btn btn-primary', onClick: closeModal }
    ]
  );
}
