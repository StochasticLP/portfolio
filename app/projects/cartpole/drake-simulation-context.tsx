'use client';

import { createContext, useContext } from 'react';
import { Socket } from 'socket.io-client';

export interface ControllerState {
  type: 'manual' | 'lqr' | 'pid' | 'zero';
  force: number;
}

export interface DrakeSimulationContextType {
  socket: Socket | null;
  connected: boolean;
  status: { message: string; color: string };
  meshcatUrl: string;
  controller: ControllerState;
  activeControllers: string[];
  connect: () => void;
  disconnect: () => void;
  reset: () => void;
  setForce: (force: number) => void;
  toggleController: (type: string) => void;
  sendKeyboardInput: (key: string, isDown: boolean) => void;
}

export const DrakeSimulationContext = createContext<DrakeSimulationContextType | null>(null);

export function useDrakeSimulation() {
  const context = useContext(DrakeSimulationContext);
  if (!context) {
    throw new Error('useDrakeSimulation must be used within a DrakeSimulationProvider');
  }
  return context;
}
