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
    DiagramBuilder, 
    AddMultibodyPlantSceneGraph, 
    Parser, 
    MeshcatVisualizer, 
    Simulator,
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
        
        # Manual control force
        self.manual_force = 0.0
        
        self.lqr_controller = self._design_lqr()
        
        # PID gains
        self.kp = 1000.0
        self.ki = 0.0
        self.kd = 1.0
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
        
        if self.controller_active.get("lqr", False):
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
    
    def toggle_controller(self, controller):
        """
        Switch control mode.
        
        Args:
            mode: One of "manual", "lqr", "pid", "zero"
        """
        if controller in ["manual", "lqr", "pid"] and controller in self.controller_active:
            self.controller_active[controller] = not self.controller_active[controller]
            # Reset integral when switching to PID
            if controller == "pid" and self.controller_active["pid"]:
                self.integral_error = 0.0
        elif controller == "zero":
            for key in self.controller_active:
                self.controller_active[key] = False
        else:
            print(f"Unknown mode: {controller}")
    
    def set_manual_force(self, force):
        """Set the manual control force."""
        if self.controller_active.get("manual", False):
            self.manual_force = float(force)
        print("manual force:", self.manual_force)
    
    def set_pid_gains(self, kp=None, ki=None, kd=None):
        """Update PID gains."""
        if kp is not None:
            self.kp = kp
        if ki is not None:
            self.ki = ki
        if kd is not None:
            self.kd = kd


class CartpoleSimulation(DrakeSimulationBase):
    def build_diagram(self, params, initial_state=None):
        self.builder = DiagramBuilder()
        self.plant, self.scene_graph = AddMultibodyPlantSceneGraph(self.builder, time_step=0.0)

        parser = Parser(self.plant)
        self.urdf_path = self.get_urdf_path()
        parser.AddModelsFromUrl(f"file://{self.urdf_path}")
        self.configure_plant(self.plant, params)
        self.plant.Finalize()

        self.controllers = self.add_controllers(self.builder, self.plant, params)

        if self.meshcat:
            self.configure_visualization(self.meshcat, params)
            MeshcatVisualizer.AddToBuilder(self.builder, self.scene_graph, self.meshcat)

        self.diagram = self.builder.Build()
        self.simulator = Simulator(self.diagram)
        self.context = self.simulator.get_mutable_context()
        self.plant_context = self.plant.GetMyMutableContextFromRoot(self.context)
        initial_state = initial_state if initial_state is not None else self.get_default_state()
        self.plant.SetPositionsAndVelocities(self.plant_context, initial_state)
        self.paused = False

    def get_meshcat_url(self) -> str:
        return self.meshcat.web_url()
    def reset_simulation(self):
        self.context.SetTime(0.0)
        self.plant.SetPositionsAndVelocities(self.plant_context, self.get_default_state())
        self.simulator.Initialize()

    def set_target_realtime_rate(self, rate: float):
        self.simulator.set_target_realtime_rate(rate)

    def get_context_time(self) -> float:
        return self.context.get_time()

    def advance_simulation(self, target_time: float):
        if not self.paused:
            self.simulator.AdvanceTo(target_time)

    def get_positions_and_velocities(self):
        return self.plant.GetPositionsAndVelocities(self.plant_context)

    def stop_simulation(self):
        if self.meshcat:
            self.meshcat.Delete()
            self.meshcat.Flush()
            del self.meshcat

    def send_data(self):
        # Send system state (positions and velocities)
        state = self.get_positions_and_velocities()
        return {"state": state.tolist(), "time": self.get_context_time()}

    def handle_ui_input(self, action, value):
        print("UI action:", action, "value:", value)
        controller = self.controllers.get("switchController", None)
        if controller is not None:
            if action == "set_force":
                controller.set_manual_force(float(value))
            elif action == "toggle_controller":
                controller.toggle_controller(value.get("controller"))
            elif action == "play":
                self.paused = False
            elif action == "pause":
                self.paused = True
            elif action == "set_speed":
                self.set_target_realtime_rate(float(value))
    """
    Cartpole simulation with multiple control modes:
    - LQR: Linear Quadratic Regulator for balancing
    - Manual: Direct force control via keyboard
    - PID: PID controller (placeholder)
    """
    
    def __init__(self):
        super().__init__()
        self.controller = None
    
    def get_urdf_path(self):
        return os.path.join(os.path.dirname(__file__), "cartpole.urdf")
    
    def get_default_state(self):
        """Return default upright state with small perturbation."""
        # [x, theta, x_dot, theta_dot]
        # Upright is theta = pi
        offset = np.random.normal(np.pi, 0.1)
        return np.array([0, 0, 0, 0]) + np.array([0, offset, 0, 0])
    
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

# Create a singleton instance that will be imported by simulate_system.py
Simulation = CartpoleSimulation
