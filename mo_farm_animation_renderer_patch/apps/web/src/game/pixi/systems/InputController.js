export class InputController {
  constructor({ canvas, camera, onTap, dragThreshold = 8 } = {}) {
    this.canvas = canvas;
    this.camera = camera;
    this.onTap = onTap || null;
    this.dragThreshold = dragThreshold;
    this.pointers = new Map();
    this.lastSingle = null;
    this.pinch = null;

    this.boundDown = (event) => this.#down(event);
    this.boundMove = (event) => this.#move(event);
    this.boundUp = (event) => this.#up(event);
    this.boundWheel = (event) => this.#wheel(event);

    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.boundDown);
    canvas.addEventListener('pointermove', this.boundMove);
    canvas.addEventListener('pointerup', this.boundUp);
    canvas.addEventListener('pointercancel', this.boundUp);
    canvas.addEventListener('wheel', this.boundWheel, { passive: false });
  }

  #local(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  #down(event) {
    const point = this.#local(event);
    this.canvas.setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, { ...point, startX: point.x, startY: point.y, moved: false });

    if (this.pointers.size === 1) {
      this.lastSingle = { ...point };
      this.pinch = null;
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = { distance: Math.hypot(b.x - a.x, b.y - a.y), zoom: this.camera.model.zoom };
      this.lastSingle = null;
    }
  }

  #move(event) {
    const current = this.pointers.get(event.pointerId);
    if (!current) return;
    const point = this.#local(event);
    current.x = point.x;
    current.y = point.y;
    if (Math.hypot(current.x - current.startX, current.y - current.startY) > this.dragThreshold) current.moved = true;

    if (this.pointers.size === 1 && this.lastSingle) {
      this.camera.panByScreen(point.x - this.lastSingle.x, point.y - this.lastSingle.y);
      this.lastSingle = { ...point };
      return;
    }

    if (this.pointers.size === 2 && this.pinch) {
      const [a, b] = [...this.pointers.values()];
      const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      const midpoint = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
      const zoom = this.pinch.zoom * (distance / Math.max(1, this.pinch.distance));
      this.camera.zoomAt(midpoint.x, midpoint.y, zoom);
    }
  }

  #up(event) {
    const current = this.pointers.get(event.pointerId);
    const point = this.#local(event);
    const wasTap = current && !current.moved && this.pointers.size === 1;
    this.pointers.delete(event.pointerId);

    if (wasTap) this.onTap?.(point.x, point.y);

    if (this.pointers.size === 1) {
      const remaining = [...this.pointers.values()][0];
      this.lastSingle = { x: remaining.x, y: remaining.y };
      this.pinch = null;
    } else if (this.pointers.size === 0) {
      this.lastSingle = null;
      this.pinch = null;
    }
  }

  #wheel(event) {
    event.preventDefault();
    const point = this.#local(event);
    const factor = Math.exp(-event.deltaY * 0.0014);
    this.camera.zoomAt(point.x, point.y, this.camera.model.zoom * factor);
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.boundDown);
    this.canvas.removeEventListener('pointermove', this.boundMove);
    this.canvas.removeEventListener('pointerup', this.boundUp);
    this.canvas.removeEventListener('pointercancel', this.boundUp);
    this.canvas.removeEventListener('wheel', this.boundWheel);
    this.pointers.clear();
  }
}
