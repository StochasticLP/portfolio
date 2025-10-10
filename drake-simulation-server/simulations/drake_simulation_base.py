from abc import ABC, abstractmethod
import numpy as np
from pydrake.all import (
    DiagramBuilder,
    Simulator,
    AddMultibodyPlantSceneGraph,
    Parser,
    MeshcatVisualizer,
)


class DrakeSimulationBase(ABC):
    """
    Base class for Drake simulations.
    
    Each specific simulation (cartpole, pendulum, etc.) should inherit from this
    and implement the abstract methods. The simulate_system.py will call these methods.
    """
    
    def __init__(self):
        self.builder = None
        self.plant = None
        self.scene_graph = None
        self.diagram = None
        self.urdf_path = None
        
    @abstractmethod
    def get_urdf_path(self) -> str:
        """Return the path to the URDF file."""
        pass
    
    @abstractmethod
    def get_default_state(self) -> tuple[float] | list[float] | np.ndarray:
        """Return the default initial state as a numpy array or tuple."""
        pass
    
    @abstractmethod
    def configure_plant(self, plant, params):
        """
        Configure the plant after models are loaded but before finalization.
        Use this to set properties, add constraints, etc.
        
        Args:
            plant: MultibodyPlant instance
            params: Simulation parameters dict
        """
        pass
    
    @abstractmethod
    def add_controllers(self, builder, plant, params) -> dict:
        """
        Add controllers and connect them to the plant.
        
        Args:
            builder: DiagramBuilder instance
            plant: MultibodyPlant instance
            params: Simulation parameters dict
            
        Returns:
            dict: Dictionary of controllers (for later access if needed)
        """
        pass
    
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
    
    def build_diagram(self, params, meshcat, initial_state=None):
        """
        Build the complete Drake diagram.
        This is called by simulate_system.py
        
        Args:
            params: Simulation parameters dict
            meshcat: Meshcat instance
            initial_state: Initial state to set (optional)
            
        Returns:
            tuple: (simulator, plant_context, context, plant)
        """
        # Initialize builder and plant
        self.builder = DiagramBuilder()
        time_step = params.get("time_step", 0.0)
        self.plant, self.scene_graph = AddMultibodyPlantSceneGraph(
            self.builder, time_step=time_step
        )
        
        # Load URDF
        parser = Parser(self.plant)
        self.urdf_path = self.get_urdf_path()
        parser.AddModelsFromUrl(f"file://{self.urdf_path}")
        
        # Configure plant before finalization
        self.configure_plant(self.plant, params)
        
        # Finalize plant
        self.plant.Finalize()
        
        # Add controllers
        self.controllers = self.add_controllers(self.builder, self.plant, params)
        
        # Configure visualization
        self.configure_visualization(meshcat, params)
        MeshcatVisualizer.AddToBuilder(self.builder, self.scene_graph, meshcat)
        
        # Build diagram
        self.diagram = self.builder.Build()
        
        # Create simulator and contexts
        simulator = Simulator(self.diagram)
        context = simulator.get_mutable_context()
        plant_context = self.plant.GetMyMutableContextFromRoot(context)
        
        # Set initial state
        if initial_state is None:
            initial_state = self.get_default_state()
        self.plant.SetPositionsAndVelocities(plant_context, initial_state)
        
        return simulator, plant_context, context, self.plant
    
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
