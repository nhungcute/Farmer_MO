const DEFAULT_DIRECTION = 'NONE';

function upper(value, fallback = '') {
  return String(value ?? fallback).trim().toUpperCase();
}

function normalizeFrames(clip) {
  const defaultDuration = clip?.fps > 0 ? 1000 / clip.fps : 1000 / 8;
  return (clip?.frames || []).map((frame) => {
    if (typeof frame === 'string') return { id: frame, durationMs: defaultDuration };
    return {
      ...frame,
      id: frame.id,
      durationMs: Number(frame.durationMs) > 0 ? Number(frame.durationMs) : defaultDuration,
    };
  });
}

export class ManifestAnimationRegistry {
  constructor(manifest) {
    this.manifest = manifest || { animations: {} };
  }

  getAnimation(animationId) {
    return this.manifest?.animations?.[animationId] || null;
  }

  states(animationId) {
    const animation = this.getAnimation(animationId);
    return animation ? Object.keys(animation.animations || {}) : [];
  }

  directions(animationId) {
    const animation = this.getAnimation(animationId);
    return animation?.directions || [];
  }

  resolve(animationId, state = 'DEFAULT', direction) {
    const animation = this.getAnimation(animationId);
    if (!animation) return null;

    const stateKey = upper(state, 'DEFAULT');
    const requestedStateMap = animation.animations?.[stateKey];
    const defaultStateMap = animation.animations?.DEFAULT;
    // Treat an absent/empty requested state as a normal DEFAULT fallback and
    // report the actual clip state in event metadata.
    const hasRequestedState = requestedStateMap && typeof requestedStateMap === 'object'
      && Object.keys(requestedStateMap).length > 0;
    const stateMap = hasRequestedState ? requestedStateMap : defaultStateMap;
    const resolvedState = hasRequestedState ? stateKey : 'DEFAULT';
    if (!stateMap) return null;

    const requestedDirection = upper(direction, animation.defaultDirection || DEFAULT_DIRECTION);
    const resolved = this.#resolveDirection(animation, stateMap, requestedDirection, new Set());
    if (!resolved) return null;

    const frames = normalizeFrames(resolved.clip);
    if (!frames.length) return null;

    return {
      animationId,
      state: resolvedState,
      direction: resolved.direction,
      requestedDirection,
      flipX: Boolean(resolved.flipX),
      frames,
      fps: Number(resolved.clip.fps) || 8,
      loop: resolved.clip.loop !== false,
      holdLast: Boolean(resolved.clip.holdLast),
      events: Array.isArray(resolved.clip.events) ? resolved.clip.events.map((event) => ({ ...event })) : [],
      anchor: { ...(animation.anchor || { x: 0.5, y: 0.5 }) },
      sourceScale: Number(animation.sourceScale) || Number(this.manifest.sourceScale) || 1,
      atlas: animation.atlas,
    };
  }

  #resolveDirection(animation, stateMap, direction, seen) {
    if (seen.has(direction)) return null;
    seen.add(direction);

    const direct = stateMap?.[direction];
    if (direct?.frames?.length) return { clip: direct, direction, flipX: Boolean(direct.flipX) };

    if (direct?.mirrorOf && animation.mirrorAllowed) {
      const sourceDirection = upper(direct.mirrorOf);
      const source = this.#resolveDirection(animation, stateMap, sourceDirection, seen);
      if (source) return { ...source, direction, flipX: direct.flipX !== false ? !source.flipX : source.flipX };
    }

    const defaultDirection = upper(animation.defaultDirection, DEFAULT_DIRECTION);
    if (direction !== defaultDirection) {
      const fallback = this.#resolveDirection(animation, stateMap, defaultDirection, seen);
      if (fallback) return fallback;
    }

    for (const [candidateDirection, candidate] of Object.entries(stateMap || {})) {
      if (candidate?.frames?.length) return { clip: candidate, direction: candidateDirection, flipX: Boolean(candidate.flipX) };
    }

    return null;
  }
}

export class AnimationTimeline {
  constructor({ onEvent } = {}) {
    this.onEvent = onEvent || null;
    this.clip = null;
    this.positionMs = 0;
    this.frameIndex = 0;
    this.finished = false;
    this.paused = false;
    this.playbackRate = 1;
    this.loopCount = 0;
  }

  setClip(clip, { preservePhase = false, phase = 0 } = {}) {
    const oldPhase = preservePhase ? this.phase : phase;
    this.clip = clip;
    this.positionMs = 0;
    this.frameIndex = 0;
    this.finished = false;
    this.loopCount = 0;
    if (clip) this.seekPhase(oldPhase);
    return this;
  }

  get totalDurationMs() {
    return this.clip ? this.clip.frames.reduce((sum, frame) => sum + frame.durationMs, 0) : 0;
  }

  get phase() {
    const total = this.totalDurationMs;
    return total > 0 ? (this.positionMs % total) / total : 0;
  }

  currentFrame() {
    return this.clip?.frames?.[this.frameIndex] || null;
  }

  seekPhase(phase = 0) {
    const total = this.totalDurationMs;
    if (!this.clip || total <= 0) return;
    const normalized = Math.max(0, Math.min(0.999999, Number(phase) || 0));
    this.positionMs = total * normalized;
    this.frameIndex = this.#frameIndexAt(this.positionMs);
  }

  update(deltaMs) {
    if (!this.clip || this.paused || this.finished) return this.currentFrame();
    const total = this.totalDurationMs;
    if (total <= 0) return this.currentFrame();

    const scaled = Math.max(0, Number(deltaMs) || 0) * this.playbackRate;
    if (scaled === 0) return this.currentFrame();

    const previous = this.positionMs;
    const target = previous + scaled;

    if (this.clip.loop) {
      const loopsCrossed = Math.floor(target / total) - Math.floor(previous / total);
      this.#emitEvents(previous, target, total, Math.min(loopsCrossed + 1, 8));
      this.loopCount += Math.max(0, loopsCrossed);
      this.positionMs = target % total;
    } else {
      const endPosition = Math.min(total, target);
      this.#emitEvents(previous, endPosition, total, 1);
      this.positionMs = endPosition;
      if (target >= total) {
        this.finished = true;
        this.positionMs = Math.max(0, total - 0.0001);
      }
    }

    this.frameIndex = this.#frameIndexAt(this.positionMs);
    return this.currentFrame();
  }

  #frameIndexAt(positionMs) {
    if (!this.clip?.frames?.length) return 0;
    let cursor = 0;
    for (let index = 0; index < this.clip.frames.length; index += 1) {
      cursor += this.clip.frames[index].durationMs;
      if (positionMs < cursor) return index;
    }
    return this.clip.frames.length - 1;
  }

  #frameStartMs(frameIndex) {
    let cursor = 0;
    for (let index = 0; index < frameIndex; index += 1) cursor += this.clip.frames[index]?.durationMs || 0;
    return cursor;
  }

  #emitEvents(previous, target, total, maxCycles) {
    if (!this.onEvent || !this.clip?.events?.length || target <= previous) return;
    const firstCycle = Math.floor(previous / total);
    const lastCycle = Math.floor(Math.max(previous, target - 0.0001) / total);
    let cycles = 0;

    for (let cycle = firstCycle; cycle <= lastCycle && cycles < maxCycles; cycle += 1, cycles += 1) {
      const cycleStart = cycle * total;
      for (const event of this.clip.events) {
        const frameIndex = Number(event.frame);
        if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= this.clip.frames.length) continue;
        const eventTime = cycleStart + this.#frameStartMs(frameIndex);
        if (eventTime > previous && eventTime <= target) {
          this.onEvent({ ...event, animationId: this.clip.animationId, state: this.clip.state, direction: this.clip.direction, loop: cycle });
        }
      }
    }
  }
}
