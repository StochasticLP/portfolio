from abc import ABC, abstractmethod
import numpy as np
from numpy.typing import NDArray
from pydrake.all import (
    Meshcat,
    Simulator
)


class DrakeSimulationBase():
    """
    Base class for Drake simulations.
    
    Each specific simulation (cartpole, pendulum, etc.) should inherit from this
    and implement the abstract methods. The simulate_system.py will call these methods.
    """
    
    def __init__(self):
        self.simulator: Simulator
        self.meshcat: Meshcat = Meshcat(port=0)
        
    def get_default_state(self) -> NDArray[np.float64]:
        """Return the default initial state as a numpy array."""
        return np.array([])

    def build_diagram(self, params, initial_state=None):
        """Build or rebuild the Drake diagram."""
        pass

    def get_meshcat_url(self) -> str:
        return self.meshcat.web_url()

    def initialize_simulation(self):
        if self.simulator is not None:
            self.simulator.Initialize()

    def reset_simulation(self):
        """Reset the simulation to initial state."""
        pass


    def set_target_realtime_rate(self, rate: float):
        """Set the target realtime rate for the simulation."""
        pass

    def get_context_time(self) -> float:
        """Get the current simulation time."""
        return 0.0

    def advance_simulation(self, target_time: float):
        """Advance the simulation to the target time."""
        pass
    
    def get_positions_and_velocities(self) -> NDArray[np.float64]:
        """Get the positions and velocities of the plant/system."""
        return np.array([])

    def stop_simulation(self):
        """Stop/cleanup the simulation."""
        pass
    

    def send_data(self):
        """Send arbitrary data to the client (to be implemented in subclass). Should return a dict."""
        return {}
    
    def configure_visualization(self, meshcat, params):
        """
        Configure meshcat visualization (optional override).
        Default behavior clears meshcat and sets 2D mode if requested.
        
        Args:
            meshcat: Meshcat instance
            params: Simulation parameters dict
        """
        meshcat.Delete()
        if params.get("2d_mode", False):
            xmin = params.get("xmin", -2.5)
            xmax = params.get("xmax", 2.5)
            ymin = params.get("ymin", -1.0)
            ymax = params.get("ymax", 2.5)
            meshcat.Set2dRenderMode(xmin=xmin, xmax=xmax, ymin=ymin, ymax=ymax)
    
    # (Removed duplicate build_diagram with meshcat argument)
    
    def handle_keyboard_down(self, key):
        """
        Handle keyboard down events (optional override).
        
        Args:
            key: The key that was pressed
        """
        pass
    
    def handle_keyboard_up(self, key):
        """
        Handle keyboard up events (optional override).
        
        Args:
            key: The key that was released
        """
        pass
    
    def handle_ui_input(self, action, value):
        """
        Handle UI input events (optional override).
        
        Args:
            action: The action type
            value: The value for the action
        """
        pass
Simulation = DrakeSimulationBase  # Alias
