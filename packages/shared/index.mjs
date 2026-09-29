import crypto from 'node:crypto';

export const LOCALE = 'vi-VN';

export function requestId() {
  return crypto.randomUUID();
}

export function normalizeName(value) {
  if (typeof value !== 'string') throw Object.assign(new Error('Tên nhân vật không hợp lệ'), { code: 'INVALID_INPUT' });
  const displayName = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  if ([...displayName].length < 2 || [...displayName].length > 24 || /[\p{Cc}\p{Cf}]/u.test(displayName)) {
    throw Object.assign(new Error('Tên nhân vật phải dài 2–24 ký tự và không chứa ký tự điều khiển'), { code: 'INVALID_INPUT' });
  }
  const lookupName = displayName.toLocaleLowerCase(LOCALE);
  return { displayName, lookupName };
}

export const errorMessages = Object.freeze({
  INVALID_INPUT: 'Dữ liệu nhập chưa đúng.',
  UNAUTHORIZED: 'Phiên chơi không hợp lệ.',
  SESSION_EXPIRED: 'Phiên chơi đã hết hạn. Vui lòng vào lại farm.',
  NOT_FOUND: 'Không tìm thấy dữ liệu.',
  NOT_ENOUGH_COINS: 'Không đủ Xu.',
  NOT_ENOUGH_ITEM: 'Không đủ vật phẩm.',
  WAREHOUSE_FULL: 'Kho đã đầy.',
  NOT_UNLOCKED: 'Nội dung này chưa mở khóa.',
  PLOT_NOT_EMPTY: 'Ô đất này đã được sử dụng.',
  CROP_NOT_READY: 'Cây chưa chín.',
  BUILDING_COLLISION: 'Vị trí xây dựng bị chồng lấn.',
  INVALID_ROTATION: 'Hướng xoay không hợp lệ.',
  UNIQUE_BUILDING_EXISTS: 'Công trình này đã tồn tại.',
  ORDER_NOT_COMPLETABLE: 'Chưa đủ vật phẩm cho đơn hàng.',
  ANIMAL_NOT_READY: 'Gà chưa có sản phẩm.',
  IDEMPOTENCY_KEY_REUSED: 'Mã yêu cầu đã được dùng cho dữ liệu khác.',
  RATE_LIMITED: 'Bạn thao tác quá nhanh. Vui lòng thử lại.',
  INTERNAL_ERROR: 'Có lỗi máy chủ. Vui lòng thử lại.',
});

export function localizedError(code, fallback = errorMessages.INTERNAL_ERROR) {
  return errorMessages[code] ?? fallback;
}

export function assert(condition, code, message = localizedError(code)) {
  if (!condition) throw Object.assign(new Error(message), { code });
}
