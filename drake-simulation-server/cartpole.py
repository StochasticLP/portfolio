import os
from pydrake.all import (
    AddMultibodyPlantSceneGraph,
    DiagramBuilder,
    MeshcatVisualizer,
    Parser,
    Simulator,
    Meshcat,
)

meshcat = Meshcat(port=7000)

def cartpole_sim():
    builder = DiagramBuilder()
    plant, scene_graph = AddMultibodyPlantSceneGraph(builder, time_step=0.0)
    parser = Parser(plant)
    urdf_path = os.path.abspath("cartpole.urdf")
    parser.AddModelsFromUrl(f"file://{urdf_path}")
    plant.Finalize()

    meshcat.Delete()
    meshcat.Set2dRenderMode(xmin=-2.5, xmax=2.5, ymin=-1.0, ymax=2.5)
    MeshcatVisualizer.AddToBuilder(builder, scene_graph, meshcat)

    diagram = builder.Build()
    simulator = Simulator(diagram)
    context = simulator.get_mutable_context()
    context.SetContinuousState([0, 1, 0, 0]) #type: ignore
    return simulator

simulator = cartpole_sim()

# Run simulation
while True:
    simulator.AdvanceTo(simulator.get_context().get_time() + 0.01)
