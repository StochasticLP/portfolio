'use client';

import { useState, useCallback, useEffect, ReactNode } from 'react';
import { Socket, io } from 'socket.io-client';
import { DrakeSimulationContext, ControllerState } from './drake-simulation-context';

interface DrakeSimulationProviderProps {
  children: ReactNode;
  initialControllers?: string[];
}

export default function DrakeSimulationProvider({ children, initialControllers = ['manual'] }: DrakeSimulationProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState({ message: 'Not connected', color: 'text-[var(--color-accent-red)]' });
  const [meshcatUrl, setMeshcatUrl] = useState<string>('');
  const [controller, setController] = useState<ControllerState>({
    type: 'manual',
    force: 0,
  });
  const [activeControllers, setActiveControllers] = useState<string[]>(initialControllers);

  const connect = useCallback(() => {
    // Default to production URL, fallback to localhost for dev/debugging if needed
    // Ideally this could be an env var, but for now we'll try the production one first
    // or just use the one specified in the plan: default drake.lukedphillips.com

    // Note: The user mentioned "default to drake.lukedphillips.com, fallback to localhost:8000".
    // Since io() doesn't really have a "fallback" mechanism built-in in this simple way without connection logic,
    // we will default to the production URL. If the user wants to debug locally, they might need to change this 
    // or we can check NODE_ENV.

    const url = process.env.NODE_ENV === 'development'
      ? 'https://drake.lukedanielphillips.com'
      : 'http://localhost:8000';

    const newSocket = io(url, { transports: ['websocket'] });

    newSocket.on('connect', () => {
      setConnected(true);
      setStatus({ message: `Connected! SID: ${newSocket.id}`, color: 'text-[var(--color-accent-green)]' });
      // Initialize with default controllers
      newSocket.emit('init', { "sim_type": "cartpole", "controllers": initialControllers });
    });

    newSocket.on('simulation_started', (data: { url: string }) => {
      setStatus({ message: 'Simulation started!', color: 'text-[var(--color-accent-green)]' });
      setMeshcatUrl(data.url);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      setStatus({ message: 'Disconnected', color: 'text-[var(--color-accent-red)]' });
      setMeshcatUrl('');
    });

    newSocket.on('error', (data: { message: string }) => {
      setStatus({ message: `Error: ${data.message}`, color: 'text-[var(--color-accent-red)]' });
    });

    setSocket(newSocket);
  }, [initialControllers]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
      setStatus({ message: 'Disconnected', color: 'text-[var(--color-accent-red)]' });
    }
  }, [socket]);

  const reset = useCallback(() => {
    socket?.emit('input_event', { type: 'reset' });
    setStatus({ message: 'Simulation reset', color: 'text-[var(--color-accent-green)]' });
  }, [socket]);

  const setForce = useCallback((force: number) => {
    setController(prev => ({ ...prev, force }));
    socket?.emit('ui_input', {
      action: 'set_force',
      value: force,
    });
  }, [socket]);

  const toggleController = useCallback((type: string) => {
    // Toggle logic: send toggle_controller event
    // The backend handles the actual toggling of active controllers
    socket?.emit('ui_input', {
      action: 'toggle_controller',
      value: { controller: type },
    });

    // Optimistically update local state or wait for feedback? 
    // For now, we'll just update our local list to reflect what we *think* is happening,
    // but ideally the backend should confirm. 
    setActiveControllers(prev => {
      if (prev.includes(type)) {
        return prev.filter(c => c !== type);
      } else {
        return [...prev, type];
      }
    });

    setStatus({ message: `Toggled controller ${type}`, color: 'text-[var(--color-accent-green)]' });
  }, [socket]);

  const sendKeyboardInput = useCallback((key: string, isDown: boolean) => {
    if (!connected) return;
    socket?.emit(isDown ? 'keyboard_down' : 'keyboard_up', { key });
  }, [socket, connected]);

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        sendKeyboardInput(e.key, true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        sendKeyboardInput(e.key, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [sendKeyboardInput]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <DrakeSimulationContext.Provider
      value={{
        socket,
        connected,
        status,
        meshcatUrl,
        controller,
        activeControllers,
        connect,
        disconnect,
        reset,
        setForce,
        toggleController,
        sendKeyboardInput,
      }}
    >
      {children}
    </DrakeSimulationContext.Provider>
  );
}
