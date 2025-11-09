import { useState, useEffect, useRef, useCallback } from 'react';
import { CartPoleEngine } from './cartPoleEngine';
import { CartPoleRenderer } from './cartPoleRender';
import { CartPoleController } from './cartControl';
import { createPIDController } from '../core/PIDController';

export function useCartPoleSimulation(options = {}) {
  // Refs for instances that don't trigger re-renders
  const engineRef = useRef(null);
  const rendererRef = useRef(null);
  const controllerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const manualForceRef = useRef(0); // Current manual force (slider/arrows)
  
  // React state that triggers re-renders
  const [isRunning, setIsRunning] = useState(false);
  const [currentState, setCurrentState] = useState({
    cartPosition: 0,
    cartVelocity: 0,
    poleAngle: 0,
    poleAngularVelocity: 0,
  });
  const [controlModes, setControlModes] = useState(options.defaultControllers || ['pid']);
  
  // Initialize the simulation when canvas is provided
  const initializeSimulation = useCallback((canvas, renderOptions = {}) => {
    if (!canvas || engineRef.current) return; // Already initialized
    
    console.log('Initializing cart-pole simulation...');
    canvasRef.current = canvas;
    
    // Create physics engine
    engineRef.current = new CartPoleEngine({
      width: options.width || 1200,
      height: options.height || 600,
    });
    
    // Create renderer
    rendererRef.current = new CartPoleRenderer(canvas, engineRef.current.engine, {
      width: options.width || 1200,
      height: options.height || 600,
      renderMode: options.moonRender ? 'moon' : 'default',
    });
    
    // Create controller system
    controllerRef.current = new CartPoleController();
    
    // Add PID controller by default
    const pidController = {
      enabled: controlModes.includes('pid'),
      pidFunction: createPIDController(),
      compute: function(state) {
        if (!this.enabled) return 0;
        return this.pidFunction(state);
      },
      setParameters: function(params) {
        // PID parameters would be set here
        // For now, they're hardcoded in createPIDController
      }
    };
    
    controllerRef.current.addController('pid', pidController);
    
    // Set initial state
    setCurrentState(engineRef.current.getState());
    
  }, [options.width, options.height, options.moonRender, controlModes]);
  
  // Animation loop that runs the simulation
  const animationLoop = useCallback(() => {
    if (!isRunning || !engineRef.current || !controllerRef.current) {
      return;
    }
    
    // Get current state
    const state = engineRef.current.getState();
    
    // Compute control forces
    const controlOutput = controllerRef.current.computeControl(state);
    let totalForce = controlOutput.force || 0;
    
    // Add manual force (from slider, arrows, etc.)
    totalForce += manualForceRef.current;
    
    // Apply total force to simulation
    if (totalForce !== 0) {
      engineRef.current.applyForce(totalForce);
    }
    
    // Step the physics simulation
    engineRef.current.step();
    
    // Update React state (this will trigger re-renders)
    setCurrentState(state);
    
    // Continue the loop
    animationFrameRef.current = requestAnimationFrame(animationLoop);
  }, [isRunning]);
  
  // Start the simulation
  const start = useCallback(() => {
    if (isRunning || !engineRef.current) return;
    
    console.log('Starting cart-pole simulation...');
    setIsRunning(true);
    
    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(animationLoop);
  }, [isRunning, animationLoop]);
  
  // Stop the simulation  
  const stop = useCallback(() => {
    if (!isRunning) return;
    
    console.log('Stopping cart-pole simulation...');
    setIsRunning(false);
    
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [isRunning]);
  
  // Reset simulation to initial state
  const reset = useCallback(() => {
    if (!engineRef.current) return;
    
    console.log('Resetting cart-pole simulation...');
    
    // Stop if running
    const wasRunning = isRunning;
    if (isRunning) {
      stop();
    }
    
    // Reset physics
    engineRef.current.reset();
    
    // Reset forces
    manualForceRef.current = 0;
    
    // Update state
    setCurrentState(engineRef.current.getState());
    
    // Restart if it was running
    if (wasRunning) {
      // Use setTimeout to ensure stop() has completed
      setTimeout(() => start(), 50);
    }
  }, [isRunning, stop, start]);
  
  // Apply manual force (slider, arrow keys, etc.)
  const applyManualForce = useCallback((force) => {
    manualForceRef.current = force;
  }, []);
  
  
  // Update active controllers
  const setActiveControllers = useCallback((modes) => {
    setControlModes(modes);
    
    if (controllerRef.current) {
      // Update PID controller state
      controllerRef.current.enableController('pid', modes.includes('pid'));
      
      // Add more controllers here as they're implemented
      // controllerRef.current.enableController('lqr', modes.includes('lqr'));
    }
  }, []);
  
  // Set controller parameters
  const setControllerParameters = useCallback((controllerName, params) => {
    if (controllerRef.current) {
      controllerRef.current.setParameters(controllerName, params);
    }
  }, []);
  
  // Auto-start effect
  useEffect(() => {
    if (engineRef.current && !isRunning && options.autoStart !== false) {
      start();
    }
  }, [start, isRunning, options.autoStart]);
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up when component unmounts
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.cleanup();
      }
      if (engineRef.current) {
        engineRef.current.cleanup();
      }
    };
  }, []);
  
  // Update animation loop when isRunning changes
  useEffect(() => {
    if (isRunning && !animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    } else if (!isRunning && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [isRunning, animationLoop]);
  
  // Return the hook interface
  return {
    // Core instances (for advanced usage)
    engine: engineRef.current,
    renderer: rendererRef.current,
    controller: controllerRef.current,
    
    // Current simulation state
    state: currentState,
    isRunning,
    controlModes,
    
    // Control methods
    initializeSimulation,
    start,
    stop,
    reset,
    
    // Force application
    applyManualForce,
    applyDisturbance,
    
    // Configuration
    setActiveControllers,
    setControllerParameters,
    
    // Canvas reference
    canvasRef: canvasRef.current,
  };
}