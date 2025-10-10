"""
drake-simulation-server/simulations/cartpole/cartpole.py (REFACTORED)

Cartpole simulation using the base class
"""
import os
import numpy as np
from pydrake.all import (
    LinearQuadraticRegulator,
    LeafSystem,
    BasicVector,
)
from simulations.drake_simulation_base import DrakeSimulationBase

class SwitchableController(LeafSystem):
    """
    A controller that can switch between multiple control modes at runtime.
    
    Modes:
    - "manual": Direct force control
    - "lqr": LQR balancing controller
    - "pid": PID controller (placeholder)
    - "zero": No control (zero force)
    """
    
    def __init__(self, plant, controllers=[]):
        LeafSystem.__init__(self)
        
        # Store plant reference for controller design
        self.plant = plant
        
        if "manual" in controllers:
            # Manual control force
            self.manual_force = 0.0
        
        # LQR controller
        if "lqr" in controllers:
            self.lqr_controller = self._design_lqr()
        
        if "pid" in controllers:
            # PID gains
            self.kp = 10.0
            self.ki = 0.0
            self.kd = 5.0
            self.integral_error = 0.0
        
        # Declare input port for state
        self.DeclareVectorInputPort("state", BasicVector(4))
        
        # Declare output port for control
        self.DeclareVectorOutputPort(
            "control",
            BasicVector(1),
            self.CalcControl
        )
        
        # Declare periodic update for integral term
        self.DeclarePeriodicDiscreteUpdateEvent(
            period_sec=0.01,
            offset_sec=0.0,
            update=self.UpdateIntegral
        )
        
        # Discrete state for integral term
        self.DeclareDiscreteState(1)

        self.controller_active = {mode: (mode in controllers) for mode in ["manual", "lqr", "pid"]}
    
    def _design_lqr(self):
        """Design LQR controller for upright equilibrium."""
        context = self.plant.CreateDefaultContext()
        self.plant.get_actuation_input_port().FixValue(context, [0])
        
        # Upright state [x, theta, x_dot, theta_dot]
        upright = np.array([0, np.pi, 0, 0])
        self.plant.SetPositionsAndVelocities(context, upright)
        
        Q = np.diag((10.0, 10.0, 1.0, 1.0))
        R = np.array([1.0])
        
        return LinearQuadraticRegulator(
            self.plant, context, Q, R,
            input_port_index=self.plant.get_actuation_input_port().get_index() #type: ignore
        )
    
    def CalcControl(self, context, output):
        """Calculate control output based on current mode."""
        state = np.array(self.get_input_port(0).Eval(context))
        
        if self.controller_active.get("manual", False):
            # Use LQR controller
            lqr_context = self.lqr_controller.CreateDefaultContext()
            self.lqr_controller.get_input_port(0).FixValue(lqr_context, state)
            control = self.lqr_controller.get_output_port(0).Eval(lqr_context)[0]
            
        elif self.controller_active.get("pid", False):
            # Simple PID on theta (pole angle)
            theta = state[1]
            theta_dot = state[3]
            
            # Target is upright (theta = pi)
            error = np.pi - theta
            
            # Normalize error to [-pi, pi]
            error = (error + np.pi) % (2 * np.pi) - np.pi
            
            # Get integral from discrete state
            integral = context.get_discrete_state(0).GetAtIndex(0)
            
            # PID control
            control = self.kp * error + self.ki * integral + self.kd * (-theta_dot)
            
        else:
            control = 0.0

        if self.controller_active.get("manual", False):
            control += self.manual_force
            
        
        output.SetFromVector([control])
    
    def UpdateIntegral(self, context, discrete_state):
        """Update integral term for PID controller."""
        if self.controller_active.get("pid", False):
            state = np.array(self.get_input_port(0).Eval(context))
            theta = state[1]
            error = np.pi - theta
            error = (error + np.pi) % (2 * np.pi) - np.pi
            
            dt = 0.01
            current_integral = context.get_discrete_state(0).GetAtIndex(0)
            new_integral = current_integral + error * dt
            
            # Anti-windup
            new_integral = np.clip(new_integral, -10.0, 10.0)
            
            discrete_state.get_mutable_vector(0).SetAtIndex(0, new_integral)
    
    def set_controller_active(self, controller, value):
        """
        Switch control mode.
        
        Args:
            mode: One of "manual", "lqr", "pid", "zero"
        """
        if controller in ["manual", "lqr", "pid", "zero"] and value in [True, False]:
            self.controller_active[controller] = value
            # Reset integral when switching to PID
            if controller == "pid" and value:
                self.integral_error = 0.0
        else:
            print(f"Unknown mode: {controller} or invalid value: {value}")
    
    def set_manual_force(self, force):
        """Set the manual control force."""
        if self.controller_active.get("manual", False):
            self.manual_force = float(force)
    
    def set_pid_gains(self, kp=None, ki=None, kd=None):
        """Update PID gains."""
        if kp is not None:
            self.kp = kp
        if ki is not None:
            self.ki = ki
        if kd is not None:
            self.kd = kd


class CartpoleSimulation(DrakeSimulationBase):
    """
    Cartpole simulation with multiple control modes:
    - LQR: Linear Quadratic Regulator for balancing
    - Manual: Direct force control via keyboard
    - PID: PID controller (placeholder)
    """
    
    def __init__(self):
        super().__init__()
        self.manual_force_system = None
        self.controller = None
    
    def get_urdf_path(self):
        """Return path to cartpole URDF."""
        return os.path.abspath("simulations/cartpole/cartpole.urdf")
    
    def get_default_state(self):
        """Return default upright state with small perturbation."""
        # [x, theta, x_dot, theta_dot]
        # Upright is theta = pi
        return np.array([0, np.pi, 0, 0]) + 0.1 * np.random.randn(4)
    
    def configure_plant(self, plant, params):
        """Configure plant properties (optional for cartpole)."""
        pass
    
    def add_controllers(self, builder, plant, params):
        """Add controllers based on control_type parameter."""
        control_type = params.get("controllers", ["manual"])
        controllers = {}
        
        switchController = SwitchableController(plant, control_type)
        controller = builder.AddSystem(switchController)
        builder.Connect(plant.get_state_output_port(), controller.get_input_port(0))
        builder.Connect(controller.get_output_port(0), plant.get_actuation_input_port())

        controllers["switchController"] = switchController

        return controllers
    
    def configure_visualization(self, meshcat, params):
        """Configure 2D visualization for cartpole."""
        meshcat.Delete()
        meshcat.Set2dRenderMode(xmin=-2.5, xmax=2.5, ymin=-1.0, ymax=2.5)
    
    def handle_keyboard_down(self, key):
        """Handle keyboard press for manual control."""
        controller = self.controllers.get("switchController", None)
        
        force_magnitude = 10.0  # Adjust as needed
        if controller is not None:
            if key == "ArrowLeft" or key == "a":
                controller.set_manual_force(-force_magnitude)
            elif key == "ArrowRight" or key == "d":
                controller.set_manual_force(force_magnitude)
    
    def handle_keyboard_up(self, key):
        """Handle keyboard release for manual control."""
        controller = self.controllers.get("switchController", None)

        if controller is not None:
            if key in ["ArrowLeft", "ArrowRight", "a", "d"]:
                controller.set_manual_force(0.0)
    
    def handle_ui_input(self, action, value):
        """Handle UI inputs."""
        controller = self.controllers.get("switchController", None)

        if controller is not None:
            if action == "set_force" and self.manual_force_system:
                controller.set_manual_force(value)
            elif action == "set_controller_active":
                controller.set_controller_active(value.get("controller"), value.get("active", False))

# Create a singleton instance that will be imported by simulate_system.py
Simulation = CartpoleSimulation
