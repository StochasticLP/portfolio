import { createPIDController } from './PIDController';

// Controller: handles control logic and events
export class CartControl {
  constructor(model, forceRef, { onUpdate } = {}) {
    this.model = model;
    this.forceRef = forceRef;
    this.PIDController = createPIDController();
    this.controlMode = 'slider'; // or 'pid', 'lqr', 'nn'
    this.running = false;
    this.onUpdate = onUpdate;
    this._loop = this._loop.bind(this);
  }

  setModes(modes) {
    this.controlModes = modes;
  }

  _loop() {
    if (!this.running) return;
    let force = 0;
    const state = this.model.getState();
    if (this.controlModes && this.controlModes.length) {
      for (const mode of this.controlModes) {
        if (mode === 'slider') {
          force += this.forceRef.current || 0;
        }
        if (mode === 'pid') {
          force += this.PIDController(state);
        }
        // TODO: add LQR, NN
      }
    }
    this.model.applyForce(force);
    if (this.onUpdate) this.onUpdate(state, force);
    requestAnimationFrame(this._loop);
  }

  start() {
    if (!this.running) {
      this.running = true;
      this._loop();
    }
  }

  stop() {
    this.running = false;
  }
}
