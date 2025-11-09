export class CartPoleController {
  constructor() {
    this.controllers = new Map(); // PID, LQR, etc.
  }
  
  addController(name, controller) { 
    this.controllers.set(name, controller);
   }
  enableController(name, enabled) { 
    if (this.controllers.has(name)) {
      this.controllers.get(name).enabled = true;
    }
   }
  computeControl(state) {
    for (const [name, controller] of this.controllers) {
      if (controller.enabled) {
        const force = controller.compute(state);
        if (force !== undefined) {
          return { name, force };
        }
      }
    }
    return { name: null, force: 0 };
  }
  setParameters(controllerName, params) {
    if (this.controllers.has(controllerName)) {
      this.controllers.get(controllerName).setParameters(params);
    }
  }
}