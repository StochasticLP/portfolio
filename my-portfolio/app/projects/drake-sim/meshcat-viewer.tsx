'use client';

import { useState, useEffect, useCallback } from 'react';
import { Socket, io } from 'socket.io-client';

interface MeshcatViewerProps {
  width?: number | string;
  height?: number | string;
}

interface ControllerState {
  type: 'manual' | 'lqr' | 'pid' | 'zero';
  force: number;
}

export default function MeshcatViewer({ width = '100%', height = '600px' }: MeshcatViewerProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState({ message: 'Not connected', color: 'text-red-500' });
  const [meshcatUrl, setMeshcatUrl] = useState<string>('');
  const [controller, setController] = useState<ControllerState>({
    type: 'manual',
    force: 0,
  });

  // Socket connection handling
  const connectToServer = useCallback(() => {
    //const newSocket = io('ws://localhost:8000', { transports: ['websocket'] });
    const newSocket = io('https://drake.lukedphillips.com', {transports: ['websocket'],});
    
    newSocket.on('connect', () => {
      setConnected(true);
      setStatus({ message: `Connected! SID: ${newSocket.id}`, color: 'text-green-500' });
      newSocket.emit('init', { "sim_type": "cartpole", "controllers": ["manual", "lqr"] });
    });

    newSocket.on('simulation_started', (data: { url: string }) => {
      setStatus({ message: 'Simulation started!', color: 'text-green-500' });
      setMeshcatUrl(data.url);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      setStatus({ message: 'Disconnected', color: 'text-red-500' });
      setMeshcatUrl('');
    });

    newSocket.on('error', (data: { message: string }) => {
      setStatus({ message: `Error: ${data.message}`, color: 'text-red-500' });
    });

    setSocket(newSocket);
    return newSocket;
  }, []);

  const disconnectFromServer = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [socket]);

  const resetSimulation = useCallback(() => {
    socket?.emit('input_event', { type: 'reset' });
    setStatus({ message: 'Simulation reset', color: 'text-green-500' });
  }, [socket]);

  const handleForceChange = useCallback((force: number) => {
    setController(prev => ({ ...prev, force }));
    socket?.emit('ui_input', {
      action: 'set_force',
      value: force,
    });
  }, [socket]);

  const handleControllerChange = useCallback((type: ControllerState['type']) => {
    setController(prev => ({ ...prev, type }));
    socket?.emit('ui_input', {
      action: 'toggle_controller',
      value: { controller: type },
    });
    setStatus({ message: `Controller set to ${type}`, color: 'text-green-500' });
  }, [socket]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!connected) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        socket?.emit('keyboard_down', { key: e.key });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!connected) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        socket?.emit('keyboard_up', { key: e.key });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [connected, socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromServer();
    };
  }, [disconnectFromServer]);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold mb-4">Drake Simulation Viewer</h1>
      
      <div className="space-x-2">
        <button
          onClick={connectToServer}
          disabled={connected}
          className={`px-4 py-2 rounded ${
            connected ? 'bg-gray-300' : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
        >
          Connect
        </button>
        <button
          onClick={disconnectFromServer}
          disabled={!connected}
          className={`px-4 py-2 rounded ${
            !connected ? 'bg-gray-300' : 'bg-red-500 hover:bg-red-600'
          } text-white`}
        >
          Disconnect
        </button>
      </div>

      <div className={status.color}>{status.message}</div>

      {connected && (
        <div className="space-y-4">
          <button
            onClick={resetSimulation}
            className="px-4 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white"
          >
            Reset Simulation
          </button>

          <div className="space-y-2">
            <label className="block">
              <span className="mr-2">Manual Force:</span>
              <input
                type="range"
                min="-20"
                max="20"
                step="0.1"
                value={controller.force}
                onChange={(e) => handleForceChange(parseFloat(e.target.value))}
                className="w-64"
              />
              <span className="ml-2">{controller.force}</span>
            </label>

            <div className="flex items-center space-x-2">
              <label>Controller:</label>
              <select
                value={controller.type}
                onChange={(e) => handleControllerChange(e.target.value as ControllerState['type'])}
                className="px-2 py-1 rounded border"
              >
                <option value="manual">Manual</option>
                <option value="lqr">LQR</option>
                <option value="pid">PID</option>
                <option value="zero">Zero</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {meshcatUrl && (
        <div className="space-y-2">
          <a
            href={meshcatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Open Meshcat Visualization
          </a>
          <iframe
            src={meshcatUrl}
            width={width}
            height={height}
            style={{ border: '2px solid #ccc' }}
            className="rounded"
          />
        </div>
      )}
    </div>
  );
}
