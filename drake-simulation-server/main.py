from simulations.simulate_system import Simulation
import asyncio
import time
from fastapi import FastAPI
import socketio
import uvicorn

# FastAPI and Socket.IO setup
app = FastAPI()
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
sio_app = socketio.ASGIApp(sio, app)

# Active simulations: sid -> {"sim": Simulation, "timer": task, "last_activity": time}
active_simulations = {}

async def shutdown(sid):
    if sid in active_simulations:
        sim_data = active_simulations[sid]
        sim_data["sim"].stop()
        del active_simulations[sid]
        print(f"Shutdown simulation for {sid}")

async def schedule_shutdown(sid):
    await asyncio.sleep(900)  # 15 minutes
    await shutdown(sid)

def update_activity(sid):
    if sid in active_simulations:
        sim_data = active_simulations[sid]
        if "timer" in sim_data and sim_data["timer"]:
            sim_data["timer"].cancel()
        sim_data["timer"] = asyncio.create_task(schedule_shutdown(sid))
        sim_data["last_activity"] = time.time()

@sio.event
async def connect(sid, environ):
    print(f"User {sid} connected")
    # Start simulation on connect (assuming page open)
    sim = Simulation(sid)
    sim.start()
    active_simulations[sid] = {"sim": sim, "timer": None, "last_activity": time.time()}
    update_activity(sid)
    await sio.emit("simulation_started", {"url": sim.url}, to=sid)

@sio.event
async def disconnect(sid):
    print(f"User {sid} disconnected")
    await shutdown(sid)

@sio.event
async def input_event(sid, data):
    if sid in active_simulations:
        update_activity(sid)
        active_simulations[sid]["sim"].input_queue.put(data)

# General event for keyboard, ui, params
@sio.event
async def keyboard_down(sid, data):
    await input_event(sid, {"type": "keyboard_down", "key": data["key"]})

@sio.event
async def keyboard_up(sid, data):
    await input_event(sid, {"type": "keyboard_up", "key": data["key"]})

@sio.event
async def ui_input(sid, data):
    await input_event(sid, {"type": "ui_input", **data})

@sio.event
async def update_param(sid, data):
    await input_event(sid, {"type": "update_param", "params": data})

if __name__ == "__main__":
    uvicorn.run(sio_app, host="0.0.0.0", port=8000)
