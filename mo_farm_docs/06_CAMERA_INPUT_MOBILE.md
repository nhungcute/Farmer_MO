# 06 — CAMERA, INPUT & MOBILE CONTROL

## 1. Camera model

State:

```ts
{
  x: number,
  y: number,
  zoom: number
}
```

Zoom:

```text
min = 0.65
default = 1.0
max = 1.5
```

Có thể thay đổi sau playtest.

## 2. Touch

### Một ngón

- Tap: select/interact.
- Drag: pan camera.
- Trong placement: drag ghost object.

### Hai ngón

- Pinch: zoom.
- Có thể pan đồng thời theo midpoint.

## 3. Gesture threshold

Để tránh tap bị hiểu thành drag:

```text
tap threshold: 8–12 px
```

Nếu di chuyển vượt threshold → pan.

## 4. Desktop

- Mouse drag: pan.
- Wheel: zoom.
- Left click: select.
- ESC: close/cancel.
- R: rotate trong build mode nếu object hỗ trợ.
- +/- hoặc wheel: zoom.

## 5. Camera bounds

Không cho camera kéo vô hạn ra ngoài farm.

Tính bounds dựa trên map extents + padding.

## 6. Focus animation

Click quest hoặc user action:

```ts
camera.focusOn({
  gridX,
  gridY,
  zoom: 1.1,
  duration: 750
});
```

Dùng easing.

## 7. Build mode input priority

Priority:

```text
UI overlay
> build ghost
> object interaction
> camera
```

Không để kéo panel vô tình pan camera.

## 8. Safe area

Dùng:

```css
env(safe-area-inset-left)
env(safe-area-inset-right)
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

Toolbar không sát notch.

## 9. Haptic

Có thể dùng Vibration API ở Android nếu hỗ trợ:

- Build valid: 15ms.
- Invalid: 30ms.
- Reward: 20ms.

Không phụ thuộc vào haptic để truyền thông tin.

## 10. Acceptance

- iPhone/Android landscape pan mượt.
- Pinch không zoom browser.
- UI button không làm pan camera.
- Tap target tối thiểu khoảng 44px logical.


## 11. Implementation requirements

Canvas phải đặt `touch-action: none` và dùng Pointer Events. Khi pointer bắt đầu trên canvas, giữ pointer capture đến `pointerup`/`pointercancel`.

Gesture state phải xử lý:

- Tap dưới threshold 8–12px.
- Chuyển tap thành drag sau threshold.
- Hai ngón pinch quanh midpoint.
- Pointer thêm/bớt giữa gesture.
- `pointercancel` khi browser hoặc OS thu hồi touch.
- Modal scroll và UI button được ưu tiên hơn canvas.

Pinch không được làm browser zoom trang. Resize/orientation change phải cập nhật viewport và camera bounds mà không reload scene.
