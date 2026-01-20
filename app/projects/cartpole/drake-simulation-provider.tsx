'use client';

import { useState, useCallback, useEffect, ReactNode, useRef } from 'react';
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

  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Clear any existing timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    setStatus({ message: 'Connecting...', color: 'text-[var(--text-secondary)]' });

    const url = "https://drake.lukedphillips.com";

    const newSocket = io(url, { transports: ['websocket'] });

    // Set 5s timeout
    connectionTimeoutRef.current = setTimeout(() => {
      if (!newSocket.connected) {
        setStatus({ message: 'Failed to connect to server', color: 'text-[var(--color-accent-red)]' });
        newSocket.disconnect(); // Stop trying to connect
      }
    }, 5000);

    newSocket.on('connect', () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
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
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
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
