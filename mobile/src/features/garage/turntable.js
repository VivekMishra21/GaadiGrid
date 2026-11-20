/**
 * Rotation state for the 360° vehicle viewer. Plain JS (no React, no three.js) so it is cheap to
 * run every frame and easy to test: dragging turns the car, releasing lets it coast to a stop, and
 * an idle car drifts slowly so the garage never looks frozen.
 */
const TWO_PI = Math.PI * 2;

export class TurntableState {
  constructor({ radiansPerPixel = 0.0085, friction = 4.2, idleSpeed = 0.18, autoRotate = true } = {}) {
    this.radiansPerPixel = radiansPerPixel;
    this.friction = friction;
    this.idleSpeed = idleSpeed;
    this.autoRotate = autoRotate;
    this.angle = 0; // radians, kept within [0, 2π)
    this.velocity = 0; // radians per second
    this.dragging = false;
    this.idleFor = 0; // seconds since the last touch
  }

  begin() {
    this.dragging = true;
    this.velocity = 0;
    this.idleFor = 0;
  }

  /** dx in pixels since the previous move event, dt in seconds between those events. */
  drag(dx, dt = 1 / 60) {
    if (!this.dragging) return;
    const delta = dx * this.radiansPerPixel;
    this.angle = wrap(this.angle + delta);
    // light smoothing so a flick feels natural but one jittery sample does not
    const instant = dt > 0 ? delta / dt : 0;
    this.velocity = this.velocity * 0.6 + instant * 0.4;
  }

  end() {
    this.dragging = false;
    this.idleFor = 0;
  }

  /** Advance by dt seconds. Returns the current angle. */
  tick(dt) {
    if (this.dragging) return this.angle;
    this.idleFor += dt;

    if (Math.abs(this.velocity) > 0.01) {
      this.angle = wrap(this.angle + this.velocity * dt);
      this.velocity *= Math.exp(-this.friction * dt);
    } else {
      this.velocity = 0;
      // after a short pause, ease into the slow idle drift
      if (this.autoRotate && this.idleFor > 1.2) this.angle = wrap(this.angle + this.idleSpeed * dt);
    }
    return this.angle;
  }
}

function wrap(angle) {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}
