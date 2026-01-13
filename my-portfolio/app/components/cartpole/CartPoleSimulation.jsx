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
    <div className="relative flex flex-col items-center">
      <canvas ref={canvasRef} width={width} height={height} />
      <div className="absolute bottom-420 right-200 pointer-events-auto bg-[var(--text-primary)] text-[var(--bg-primary)] p-3 rounded-lg shadow-lg">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold select-none">
          <input
            type="checkbox"
            checked={controlModes.includes('pid')}
            onChange={(e) => {
              if (e.target.checked) {
                setControlModes((prev) => [...prev, 'pid']);
              } else {
                setControlModes((prev) => prev.filter((mode) => mode !== 'pid'));
              }
            }}
            className="accent-[var(--bg-primary)] h-4 w-4"
          />
          PID control
        </label>
      </div>
    </div>
  );
};

export default CartPoleSimulation;
