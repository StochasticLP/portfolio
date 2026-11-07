"""Rest-to-rest initial guesses for collocation."""

from __future__ import annotations

import numpy as np


def _blend(s):
    return 0.5 * (1.0 - np.cos(np.pi * s))


def _blend_rate(s, delta, T):
    # d/dt of blend * delta. Zero at both ends.
    return delta * (0.5 * np.pi * np.sin(np.pi * s)) / T


def make_guess(s0, sF, T, N, kind="cosine", seed=0, cart_amp=0.0, bump=None):
    """Sample a smooth curve from s0 to sF.

    kind:
      cosine — straight blend in every coordinate
      wiggle — blend plus a cart pulse
      bump — blend plus an angle pulse
      random — blend plus a small Fourier series
    """
    q0 = np.asarray(s0[:4], dtype=float)
    qF = np.asarray(sF[:4], dtype=float)
    delta = qF - q0
    bump = np.zeros(4) if bump is None else np.asarray(bump, dtype=float)
    rng = np.random.default_rng(seed)
    coeffs = rng.normal(scale=0.35, size=(4, 3))
    coeffs[0, :] *= 0.4

    def extras(s):
        # Value added on top of the blend. Zero value and zero derivative at ends
        # for the analytic pieces; random uses the same sin(pi s)^2 envelope.
        window = np.sin(np.pi * s) ** 2
        extra = np.zeros(4)
        if kind == "wiggle":
            extra[0] = cart_amp * window * np.sin(2.0 * np.pi * s)
        elif kind == "bump":
            extra += bump * window
        elif kind == "random":
            series = np.zeros(4)
            for k in range(3):
                series += coeffs[:, k] * np.sin((k + 1) * np.pi * s)
            extra = series * window
            extra[0] += cart_amp * window * np.sin(2.0 * np.pi * s)
        return extra

    def q_of(s):
        return q0 + delta * _blend(s) + extras(s)

    def deriv(fn, s):
        if s <= 0.0 or s >= 1.0:
            return np.zeros(4)
        ds = 1e-4
        sp = min(1.0, s + ds)
        sm = max(0.0, s - ds)
        return (fn(sp) - fn(sm)) / ((sp - sm) * T)

    X = np.zeros((8, N + 1))
    Xm = np.zeros((8, N))
    U = np.zeros((1, N + 1))
    Um = np.zeros((1, N))

    def fill(s, into, col):
        q = q_of(s)
        qd = deriv(q_of, s)
        into[:4, col] = q
        into[4:, col] = qd
        # Cart acceleration from the x-row, clipped into the bound.
        xdd = deriv(lambda z: q_of(z)[0:1], s)
        return float(np.clip(xdd[0], -6.0, 6.0))

    for k in range(N + 1):
        U[0, k] = fill(k / N, X, k)
    for k in range(N):
        Um[0, k] = fill((k + 0.5) / N, Xm, k)

    X[:, 0] = np.asarray(s0, dtype=float)
    X[:, -1] = np.asarray(sF, dtype=float)
    X[4:, 0] = 0.0
    X[4:, -1] = 0.0
    return {"X": X, "Xm": Xm, "U": U, "Um": Um, "T": float(T)}
