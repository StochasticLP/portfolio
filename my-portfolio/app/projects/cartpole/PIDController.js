// Factory function for a stateful PID controller for the cart-pole system
// Each instance keeps its own error history
export function createPIDController() {
  let poleErrorHistory = [0, 0]; // Initialize with two zero errors
  let cartErrorHistory = [0, 0]; // Initialize with two zero errors

  // The actual controller function
  function PIDController({ cartPosition, poleAngle }) {
    const poleSetPoint = 0; // desired state
    const poleP = 0.05;
    const poleI = 0.0;
    const poleD = 0.3;
    const guards = [poleSetPoint + 0.5, poleSetPoint - 0.5];
    const poleError = poleAngle - poleSetPoint; // Error from desired angle

    poleErrorHistory.push(poleError);
    if (poleErrorHistory.length > 1000) poleErrorHistory.shift(); // Limit history size

    const cartSetPoint = 800; // desired cart position (center of canvas)
    const cartP = 0.00000;
    const cartI = 0.0;
    const cartD = 0.0000;
    const cartError = cartPosition - cartSetPoint; // Error from desired position

    cartErrorHistory.push(cartError);
    if (cartErrorHistory.length > 1000) cartErrorHistory.shift(); // Limit history size

    // Calculate PID components
    const poleForce =
      poleP * poleError +
      poleI * poleErrorHistory.reduce((sum, e) => sum + e, 0) +
      poleD * (poleError - poleErrorHistory[poleErrorHistory.length - 2]);

    const cartForce =
      cartP * cartError +
      cartI * cartErrorHistory.reduce((sum, e) => sum + e, 0) +
      cartD * (cartErrorHistory[cartErrorHistory.length - 2] - cartError);

    if (poleAngle > guards[0] || poleAngle < guards[1]) {
      return 0; // Prevent force application if outside guardrails
    } else {
      return poleForce + cartForce; // Return the calculated force
    }
  }

  return PIDController;
}
