export class InputController {
  constructor({ canvas, camera, onTap, onHover, onGesture, dragThreshold = 8 } = {}) {
    this.canvas = canvas;
    this.camera = camera;
    this.onTap = onTap || null;
    this.onHover = onHover || null;
    this.onGesture = onGesture || null;
    this.dragThreshold = dragThreshold;
    this.pointers = new Map();
    this.lastSingle = null;
    this.pinch = null;

    this.boundDown = (event) => this.#down(event);
    this.boundMove = (event) => this.#move(event);
    this.boundUp = (event) => this.#up(event);
    this.boundCancel = (event) => this.#up(event, true);
    this.boundLeave = () => { if (!this.pointers.size) this.onHover?.(null); };
    this.boundWheel = (event) => this.#wheel(event);

    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.boundDown);
    canvas.addEventListener('pointermove', this.boundMove);
    canvas.addEventListener('pointerup', this.boundUp);
    canvas.addEventListener('pointercancel', this.boundCancel);
    canvas.addEventListener('lostpointercapture', this.boundCancel);
    canvas.addEventListener('pointerleave', this.boundLeave);
    canvas.addEventListener('wheel', this.boundWheel, { passive: false });
  }

  #local(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  #down(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const point = this.#local(event);
    try { this.canvas.setPointerCapture?.(event.pointerId); } catch { /* Synthetic input may have no capture target. */ }
    this.pointers.set(event.pointerId, { ...point, startX: point.x, startY: point.y, moved: false });

    if (this.pointers.size === 1) {
      this.lastSingle = { ...point };
      this.pinch = null;
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      for (const pointer of this.pointers.values()) pointer.moved = true;
      this.pinch = {
        distance: Math.hypot(b.x - a.x, b.y - a.y), zoom: this.camera.model.zoom,
        midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
      this.lastSingle = null;
      this.onGesture?.();
      this.onHover?.(null);
    }
  }

  #move(event) {
    const current = this.pointers.get(event.pointerId);
    const point = this.#local(event);
    if (!current) {
      if (!this.pointers.size) this.onHover?.(point);
      return;
    }
    current.x = point.x;
    current.y = point.y;
    if (Math.hypot(current.x - current.startX, current.y - current.startY) > this.dragThreshold) current.moved = true;

    if (this.pointers.size === 1 && this.lastSingle) {
      if (!current.moved) return;
      this.onGesture?.();
      this.onHover?.(null);
      this.camera.panByScreen(point.x - this.lastSingle.x, point.y - this.lastSingle.y);
      this.lastSingle = { ...point };
      return;
    }

    if (this.pointers.size === 2 && this.pinch) {
      const [a, b] = [...this.pointers.values()];
      const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      const midpoint = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
      const zoom = this.pinch.zoom * (distance / Math.max(1, this.pinch.distance));
      this.camera.panByScreen(midpoint.x - this.pinch.midpoint.x, midpoint.y - this.pinch.midpoint.y);
      this.camera.zoomAt(midpoint.x, midpoint.y, zoom);
      this.pinch.midpoint = midpoint;
    }
  }

  #up(event, cancelled = false) {
    const current = this.pointers.get(event.pointerId);
    if (!current) return;
    const point = this.#local(event);
    const rect = this.canvas.getBoundingClientRect();
    const withinCanvas = point.x >= 0 && point.y >= 0 && point.x <= rect.width && point.y <= rect.height;
    const wasTap = !cancelled && withinCanvas && !current.moved && this.pointers.size === 1
      && Math.hypot(point.x - current.startX, point.y - current.startY) <= this.dragThreshold;
    this.pointers.delete(event.pointerId);
    try { this.canvas.releasePointerCapture?.(event.pointerId); } catch { /* Capture may already be released. */ }

    if (wasTap) this.onTap?.(point.x, point.y);

    if (this.pointers.size === 1) {
      const remaining = [...this.pointers.values()][0];
      this.lastSingle = { x: remaining.x, y: remaining.y };
      remaining.moved = true;
      this.pinch = null;
      this.onHover?.(null);
    } else if (this.pointers.size === 0) {
      this.lastSingle = null;
      this.pinch = null;
      this.onHover?.(cancelled ? null : point);
    }
  }

  #wheel(event) {
    event.preventDefault();
    const point = this.#local(event);
    const factor = Math.exp(-event.deltaY * 0.0014);
    this.onGesture?.();
    this.camera.zoomAt(point.x, point.y, this.camera.model.zoom * factor);
    this.onHover?.(point);
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.boundDown);
    this.canvas.removeEventListener('pointermove', this.boundMove);
    this.canvas.removeEventListener('pointerup', this.boundUp);
    this.canvas.removeEventListener('pointercancel', this.boundCancel);
    this.canvas.removeEventListener('lostpointercapture', this.boundCancel);
    this.canvas.removeEventListener('pointerleave', this.boundLeave);
    this.canvas.removeEventListener('wheel', this.boundWheel);
    this.pointers.clear();
  }
}
