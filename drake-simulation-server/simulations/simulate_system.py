import os
import threading
import queue
import time
from pydrake.all import Meshcat
import importlib

def import_sim(sim_name):
    """Import a simulation module."""
    try:
        module = importlib.import_module(f'simulations.{sim_name}')
        # Check if module has a Simulation class
        if hasattr(module, 'Simulation'):
            return module.Simulation()
        else:
            raise AttributeError(f"Module {sim_name} has no 'Simulation' class")
    except (ModuleNotFoundError, AttributeError) as e:
        print(f"Error loading simulation: {e}")
        return None

def get_available_simulations():
    sim_dir = 'simulations'
    files = os.listdir(sim_dir)
    return [f[:-3] for f in files if f.endswith('.py') and f != '__init__.py' and f != 'base_simulation.py' and f != 'simulate_system.py']

class Simulation:
    def __init__(self, sid, params=None):
        self.sid = sid
        self.params = params or {"sim_type": "cartpole"}
        self.meshcat = Meshcat(port=0)
        self.url = self.meshcat.web_url()
        self.running = False
        self.input_queue = queue.Queue()
        self.thread = None
        self.state = None
        
        # Import the specific simulation
        sim_name = self.params.get("sim_type", "cartpole")
        self.sim_instance = import_sim(sim_name)
        
        if self.sim_instance is None:
            raise ValueError(f"Could not load simulation: {sim_name}")
        
        self.build_diagram()
    
    def build_diagram(self):
        """Build or rebuild the Drake diagram."""
        if self.state is None:
            if self.sim_instance is not None and hasattr(self.sim_instance, "get_default_state"):
                self.state = self.sim_instance.get_default_state()
        
        try:
            if self.sim_instance is not None and hasattr(self.sim_instance, "build_diagram"):
                self.simulator, self.plant_context, self.context, self.plant = \
                    self.sim_instance.build_diagram(self.params, self.meshcat, self.state)
        except Exception as e:
            print(f"Error building simulation: {e}")
            raise
    
    def handle_input(self, input_data):
        """Handle input events from the client."""
        input_type = input_data.get("type")
        
        if input_type == "keyboard_down":
            key = input_data.get("key")
            if self.sim_instance is not None and hasattr(self.sim_instance, "handle_keyboard_down"):
              self.sim_instance.handle_keyboard_down(key)
            
        elif input_type == "keyboard_up":
            key = input_data.get("key")
            if self.sim_instance is not None and hasattr(self.sim_instance, "handle_keyboard_up"):
              self.sim_instance.handle_keyboard_up(key)
            
        elif input_type == "ui_input":
            action = input_data.get("action")
            value = input_data.get("value")
            if self.sim_instance is not None and hasattr(self.sim_instance, "handle_ui_input"):
              self.sim_instance.handle_ui_input(action, value)
            
        elif input_type == "update_param":
            # Update params and rebuild diagram
            self.params.update(input_data.get("params", {}))
            self.build_diagram()
            
        elif input_type == "reset":
            self.context.SetTime(0.0)
            default_state = self.sim_instance.get_default_state() if self.sim_instance else None
            self.plant.SetPositionsAndVelocities(
                self.plant_context, 
                default_state
            )
            self.simulator.Initialize()
    
    def run_loop(self):
        """Main simulation loop."""
        self.running = True
        self.simulator.set_target_realtime_rate(1.0)
        current_time = self.context.get_time()
        step_size = 0.01
        
        while self.running:
            start = time.time()
            
            # Process all queued inputs
            while not self.input_queue.empty():
                input_data = self.input_queue.get()
                self.handle_input(input_data)
            
            # Advance simulation
            self.simulator.AdvanceTo(current_time + step_size)
            current_time += step_size
            self.state = self.plant.GetPositionsAndVelocities(self.plant_context)
            
            # Sleep to maintain real-time
            elapsed = time.time() - start
            if elapsed < step_size:
                time.sleep(step_size - elapsed)
    
    def start(self):
        """Start the simulation in a separate thread."""
        if not self.running:
            self.thread = threading.Thread(target=self.run_loop)
            self.thread.start()
    
    def stop(self):
        """Stop the simulation."""
        if self.running:
            self.running = False
            if self.thread:
                self.thread.join()
            del self.meshcat
