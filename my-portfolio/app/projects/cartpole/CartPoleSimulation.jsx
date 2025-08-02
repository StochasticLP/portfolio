import { useEffect, useRef, useState } from 'react';
import { CartPoleSimulationCore } from './CartPoleSimulationCore';
import { CartControl } from './CartControl';



const CartPoleSimulation = ({ options = {} }) => {
  const width = options.width || 800;
  const height = options.height || 600;
  const canvasRef = useRef(null);
  const [sliderForce, setSliderForce] = useState(0);
  const forceRef = useRef(0);
  const [model, setModel] = useState(null);
  const [controller, setController] = useState(null);
  const [controlModes, setControlModes] = useState(['slider', 'pid']);
  const [arrowForce, setArrowForce] = useState(0);
  const [systemState, setSystemState] = useState({
    cartPosition: 0,
    cartVelocity: 0,
    poleAngle: 0,
    poleAngularVelocity: 0,
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    // Model
    const modelInstance = new CartPoleSimulationCore(canvasRef.current, options);
    setModel(modelInstance);
    // Controller
    const controllerInstance = new CartControl(modelInstance, forceRef);
    setController(controllerInstance);
    controllerInstance.setModes(controlModes);
    controllerInstance.start();
    // Arrow key force
    let leftHeld = false;
    let rightHeld = false;
    let animationId;
    function applyArrowForce() {
      let force = 0;
      if (leftHeld) force -= 0.01;
      if (rightHeld) force += 0.01;
      setArrowForce(force);
      modelInstance.applyForce(force);
      animationId = requestAnimationFrame(applyArrowForce);
    }
    function handleKeyDown(e) {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft') leftHeld = true;
      if (e.key === 'ArrowRight') rightHeld = true;
      if (leftHeld || rightHeld) {
        if (!animationId) applyArrowForce();
      }
    }
    function handleKeyUp(e) {
      if (e.key === 'ArrowLeft') leftHeld = false;
      if (e.key === 'ArrowRight') rightHeld = false;
      if (!leftHeld && !rightHeld && animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // System state updater
    let stateAnimationId;
    function updateSystemState() {
      if (modelInstance && modelInstance.getState) {
        setSystemState(modelInstance.getState());
      }
      stateAnimationId = requestAnimationFrame(updateSystemState);
    }
    updateSystemState();

    return () => {
      controllerInstance.stop();
      modelInstance.cleanup();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (stateAnimationId) cancelAnimationFrame(stateAnimationId);
    };
    // eslint-disable-next-line
  }, [canvasRef]);

  useEffect(() => {
    if (controller) {
      controller.setModes(controlModes);
    }
  }, [controlModes, controller]);

  // Slider controls
  const handleSlider = (e) => {
    const value = parseFloat(e.target.value);
    setSliderForce(value);
    forceRef.current = value * 0.001; // scale for simulation
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas ref={canvasRef} width={width} height={height} />
    </div>
  );
};

export default CartPoleSimulation;
      /*
      <div style={{ marginBottom: 8 }}>
        <label>Controllers:</label>
        <div>
          <label>
            <input
              type="checkbox"
              checked={controlModes.includes('slider')}
              onChange={(e) => {
                setControlModes((m) =>
                  e.target.checked
                    ? [...m, 'slider']
                    : m.filter((x) => x !== 'slider')
                );
              }}
            />
            Slider
          </label>
          <label style={{ marginLeft: 16 }}>
            <input
              type="checkbox"
              checked={controlModes.includes('pid')}
              onChange={(e) => {
                setControlModes((m) =>
                  e.target.checked
                    ? [...m, 'pid']
                    : m.filter((x) => x !== 'pid')
                );
              }}
            />
            PID
          </label>
        </div>
        {controlModes.includes('slider') && (
          <>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={sliderForce}
              onChange={handleSlider}
              style={{ width: 300 }}
            />
            <div>Force: {sliderForce}</div>
          </>
        )}
        <div style={{ marginTop: 8 }}>
          <strong>Arrow Key Force:</strong> {arrowForce.toFixed(3)}
        </div>
      </div>
      <div style={{ marginBottom: 16, fontFamily: 'monospace', fontSize: 16, background: '#f8f8f8', display: 'inline-block', padding: 12, borderRadius: 8, border: '1px solid #ddd' }}>
        <div><strong>Cart Position:</strong> {systemState.cartPosition.toFixed(2)}</div>
        <div><strong>Cart Velocity:</strong> {systemState.cartVelocity.toFixed(2)}</div>
        <div><strong>Pole Angle:</strong> {(systemState.poleAngle * 180 / Math.PI).toFixed(2)}°</div>
        <div><strong>Pole Angular Velocity:</strong> {systemState.poleAngularVelocity.toFixed(2)}</div>
      </div>
      */