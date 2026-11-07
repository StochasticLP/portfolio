"""Reload public/data/lunar-pendulum.json and check shape, ends, and equilibria.

Run from any directory:
  tools/lunar-pendulum/.venv/Scripts/python.exe tools/lunar-pendulum/verify.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
JSON_PATH = ROOT / "public" / "data" / "lunar-pendulum.json"

NAMES = ["UUU", "UUD", "UDU", "UDD", "DUU", "DUD", "DDU", "DDD"]
HOLD = 2.5
FPS = 30


def wrap_angle(a):
    return (np.asarray(a, dtype=float) + np.pi) % (2.0 * np.pi) - np.pi


def equilibrium_theta(state_id):
    bits = int(state_id) - 1
    theta = []
    for i in range(3):
        down = (bits >> (2 - i)) & 1
        theta.append(math.pi if down else 0.0)
    return theta


def frame_times(duration, fps=FPS):
    step = 1.0 / float(fps)
    n_full = int(math.floor(float(duration) * fps + 1e-9))
    t = [k * step for k in range(n_full + 1)]
    if float(duration) - t[-1] > 1e-8:
        t.append(float(duration))
    return t


def main():
    payload = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    meta = payload["meta"]
    assert meta["g"] == 1.62
    assert meta["l"] == [0.5, 0.4, 0.3]
    assert meta["m"] == [0.6, 0.4, 0.25]
    assert meta["uMax"] == 6
    assert meta["xMax"] == 2
    assert meta["fps"] == 30
    assert meta["method"] == "Hermite-Simpson collocation + TVLQR"
    assert meta["holdSeconds"] == HOLD

    states = payload["states"]
    assert len(states) == 8
    for state in states:
        state_id = int(state["id"])
        assert state["name"] == NAMES[state_id - 1]
        theta = equilibrium_theta(state_id)
        for got, exp in zip(state["theta"], theta):
            assert abs(got - round(exp, 4)) < 1e-6

    transitions = payload["transitions"]
    assert len(transitions) == 56
    for a in range(1, 9):
        for b in range(1, 9):
            if a == b:
                continue
            key = f"{a}-{b}"
            assert key in transitions, key
            item = transitions[key]
            assert item["from"] == a and item["to"] == b
            T = float(item["T"])
            duration = float(item["duration"])
            via = item["via"]
            if via is None:
                assert 4.0 - 1e-6 <= T <= 20.0 + 1e-3
            else:
                assert via in range(1, 9) and via not in (a, b)
                assert 4.0 <= T <= 45.0
            assert abs(duration - (T + HOLD)) < 2e-3
            n = len(frame_times(duration))
            for name in ("x", "th1", "th2", "th3", "u"):
                assert len(item[name]) == n, (key, name, len(item[name]), n)
                assert np.all(np.isfinite(item[name]))
            x = np.asarray(item["x"], dtype=float)
            u = np.asarray(item["u"], dtype=float)
            th = np.vstack([item["th1"], item["th2"], item["th3"]])
            assert np.max(np.abs(u)) <= 8.0 + 1e-3
            # Closed loop starts on the wrapped equilibrium, plus the 0.3 deg offset.
            th0 = equilibrium_theta(a)
            th1 = equilibrium_theta(b)
            assert abs(x[0]) <= 0.02
            assert abs(x[-1]) < 0.02 + 1e-3
            for i in range(3):
                assert abs(wrap_angle(th[i, 0] - th0[i])) < np.deg2rad(1.0)
                assert abs(wrap_angle(th[i, -1] - th1[i])) < np.deg2rad(0.7)
                jumps = np.diff(th[i])
                assert np.max(np.abs(jumps)) < np.pi
    print(f"verify passed {JSON_PATH} bytes={JSON_PATH.stat().st_size}")


if __name__ == "__main__":
    main()
