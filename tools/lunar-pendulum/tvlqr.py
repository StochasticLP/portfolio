"""Time-varying LQR along a collocation nominal, then a steady hold."""

from __future__ import annotations

import numpy as np
from scipy.linalg import solve_discrete_are

from dynamics import (
    G_MOON,
    L_NOM,
    M_NOM,
    equilibrium_angles,
    equilibrium_state,
    f_acc,
    jacobians,
    wrap_angle,
)

HOLD_S = 2.5
FPS = 30
SIM_DT = 0.001
CTRL_DT = 0.005
U_CLIP = 8.0
# Position weight is above the brief's starting diagonal so the cart
# returns inside 2 cm during the 2.5 s hold. Angle weights stay near the brief.
Q_BASE = np.diag([200.0, 80.0, 80.0, 80.0, 25.0, 6.0, 6.0, 6.0])
R_BASE = np.array([[1.0]])

PROFILES = {
    "base": (Q_BASE, np.array([[1.0]])),
    # Fallbacks keep the cart weights that finish inside 2 cm. Stiff raises
    # the angle weights. Soft raises R so the gain uses less control.
    "stiff": (np.diag([200.0, 220.0, 220.0, 220.0, 25.0, 12.0, 12.0, 12.0]), np.array([[1.0]])),
    "soft": (np.diag([200.0, 50.0, 50.0, 50.0, 25.0, 4.0, 4.0, 4.0]), np.array([[4.0]])),
    # Stronger angle feedback for arrivals that stop just outside 0.5 deg.
    "tight": (np.diag([300.0, 600.0, 600.0, 600.0, 40.0, 40.0, 40.0, 40.0]), np.array([[2.0]])),
}


def frame_times(duration, fps=FPS):
    step = 1.0 / float(fps)
    n_full = int(np.floor(float(duration) * fps + 1e-9))
    t = np.arange(n_full + 1, dtype=float) * step
    if float(duration) - t[-1] > 1e-8:
        t = np.append(t, float(duration))
    return t


def discretize(A, B, dt):
    eye = np.eye(A.shape[0])
    Ad = eye + A * dt + (A @ A) * (0.5 * dt * dt)
    Bd = (eye + A * (0.5 * dt)) @ B * dt
    return Ad, Bd


def riccati_step(P, Ad, Bd, Qd, Rd):
    S = Rd + Bd.T @ P @ Bd
    K = np.linalg.solve(S, Bd.T @ P @ Ad)
    closed = Ad - Bd @ K
    Pnew = Qd + K.T @ Rd @ K + closed.T @ P @ closed
    Pnew = 0.5 * (Pnew + Pnew.T)
    return Pnew, K.reshape(-1)


def algebraic_gain(A, B, Q, R, dt):
    Ad, Bd = discretize(A, B, dt)
    Qd = Q * dt
    Rd = R * dt
    try:
        P = solve_discrete_are(Ad, Bd, Qd, Rd)
        P = 0.5 * (P + P.T)
        S = Rd + Bd.T @ P @ Bd
        K = np.linalg.solve(S, Bd.T @ P @ Ad).reshape(-1)
        if np.all(np.isfinite(P)) and np.all(np.isfinite(K)):
            return P, K, "dare"
    except Exception:
        P = None
    P = np.eye(A.shape[0]) * 50.0
    K = np.zeros(A.shape[0])
    for _ in range(30000):
        P, K = riccati_step(P, Ad, Bd, Qd, Rd)
    return P, K, "iterated"


def dense_nominal(sol, dt=SIM_DT):
    """Collocation cubic state and quadratic input on a 1 ms grid."""
    from collocation import hermite_state, quadratic_control

    T = float(sol["T"])
    N = int(sol["N"])
    h = T / N
    f_nodes = [f_acc(sol["X"][:, k], float(sol["U"][0, k])) for k in range(N + 1)]
    n_full = int(np.floor(T / dt + 1e-9))
    t = np.arange(n_full + 1, dtype=float) * dt
    if T - t[-1] > 1e-8:
        t = np.append(t, T)
    S = np.zeros((8, t.size))
    U = np.zeros(t.size)
    for i, ti in enumerate(t):
        if ti <= 0.0:
            S[:, i] = sol["X"][:, 0]
            U[i] = float(sol["U"][0, 0])
            continue
        if ti >= T:
            S[:, i] = sol["X"][:, -1]
            U[i] = float(sol["U"][0, -1])
            continue
        k = min(int(np.floor(ti / h)), N - 1)
        s = (ti - k * h) / h
        S[:, i] = hermite_state(s, sol["X"][:, k], sol["X"][:, k + 1], f_nodes[k], f_nodes[k + 1], h)
        U[i] = quadratic_control(s, float(sol["U"][0, k]), float(sol["Um"][0, k]), float(sol["U"][0, k + 1]))
    S[:, 0] = sol["X"][:, 0]
    S[:, -1] = sol["X"][:, -1]
    return t, S, U


def backward_gains(t, S, U, P_inf, K_inf, Q, R):
    n = t.size
    Ks = np.zeros((n, 8))
    P = np.array(P_inf, dtype=float, copy=True)
    As = []
    Bs = []
    for k in range(n):
        A, B = jacobians(S[:, k], float(U[k]))
        As.append(A)
        Bs.append(B)
    Ks[-1] = np.asarray(K_inf, dtype=float).reshape(-1)
    for k in range(n - 2, -1, -1):
        dt = float(t[k + 1] - t[k])
        Ad, Bd = discretize(As[k], Bs[k], dt)
        P, K = riccati_step(P, Ad, Bd, Q * dt, R * dt)
        Ks[k] = K
    return Ks


def _rk4(s, u, dt, length):
    k1 = f_acc(s, u, length=length)
    k2 = f_acc(s + 0.5 * dt * k1, u, length=length)
    k3 = f_acc(s + 0.5 * dt * k2, u, length=length)
    k4 = f_acc(s + dt * k3, u, length=length)
    return s + (dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)


def _sample_nom(tq, t, S, U, Ks):
    if tq <= t[0]:
        return S[:, 0].copy(), float(U[0]), Ks[0]
    if tq >= t[-1]:
        return S[:, -1].copy(), float(U[-1]), Ks[-1]
    idx = int(np.searchsorted(t, tq, side="right") - 1)
    idx = min(max(idx, 0), t.size - 2)
    span = t[idx + 1] - t[idx]
    a = 0.0 if span <= 0.0 else (tq - t[idx]) / span
    s = (1.0 - a) * S[:, idx] + a * S[:, idx + 1]
    u = (1.0 - a) * U[idx] + a * U[idx + 1]
    return s, float(u), Ks[idx]


def simulate_closed_loop(
    t_nom,
    S_nom,
    U_nom,
    Ks,
    K_inf,
    from_id,
    to_id,
    Q=None,
    R=None,
    perturb=True,
    noise_std=0.05,
    length_scale=1.005,
    angle_offset_deg=0.3,
):
    """RK4 at 1 ms. Controller is zero-order hold at 200 Hz. u is clipped to ±8."""
    del Q, R  # Gains are already built by the caller.
    T = float(t_nom[-1])
    t_end = T + HOLD_S
    s_hold = S_nom[:, -1].copy()
    s_hold[4:] = 0.0
    length = L_NOM * (length_scale if perturb else 1.0)
    s = S_nom[:, 0].copy()
    if perturb:
        sign_rng = np.random.default_rng(10007 * int(from_id) + 17 * int(to_id))
        signs = sign_rng.choice(np.array([-1.0, 1.0]), size=3)
        s[1:4] = s[1:4] + signs * np.deg2rad(angle_offset_deg)
        noise_rng = np.random.default_rng(30011 * int(from_id) + 19 * int(to_id))
    else:
        noise_rng = None

    def command_at(t_now, state):
        if t_now >= T - 1e-12:
            s_nom = s_hold
            u_nom = 0.0
            K = K_inf
        else:
            s_nom, u_nom, K = _sample_nom(t_now, t_nom, S_nom, U_nom, Ks)
        err = state - s_nom
        err = np.array(err, dtype=float, copy=True)
        err[1:4] = wrap_angle(err[1:4])
        u_cmd = float(u_nom - K @ err)
        if noise_rng is not None and noise_std > 0.0:
            u_cmd += float(noise_rng.normal(0.0, noise_std))
        return float(np.clip(u_cmd, -U_CLIP, U_CLIP))

    n_max = int(np.ceil(t_end / SIM_DT)) + 3
    t_log = np.zeros(n_max)
    S_log = np.zeros((8, n_max))
    U_log = np.zeros(n_max)
    u_applied = command_at(0.0, s)
    t_log[0] = 0.0
    S_log[:, 0] = s
    U_log[0] = u_applied
    n_rec = 1
    t = 0.0
    next_ctrl = CTRL_DT
    while t < t_end - 1e-12:
        if t >= next_ctrl - 1e-12:
            u_applied = command_at(t, s)
            next_ctrl += CTRL_DT
        step = min(SIM_DT, t_end - t)
        s = _rk4(s, u_applied, step, length)
        t += step
        t_log[n_rec] = t
        S_log[:, n_rec] = s
        U_log[n_rec] = u_applied
        n_rec += 1

    t_log = t_log[:n_rec]
    S_log = S_log[:, :n_rec]
    U_log = U_log[:n_rec]
    frames = frame_times(t_end)
    S_f = np.vstack([np.interp(frames, t_log, S_log[i]) for i in range(8)])
    U_f = np.interp(frames, t_log, U_log)
    th0 = equilibrium_angles(from_id)
    for i in range(3):
        turn = np.round((S_f[1 + i, 0] - th0[i]) / (2.0 * np.pi))
        S_f[1 + i, :] -= 2.0 * np.pi * turn

    th_tgt = equilibrium_angles(to_id)
    th_err = wrap_angle(s[1:4] - th_tgt)
    sat_frac = float(np.mean(np.abs(U_log) >= U_CLIP - 1e-9))
    report = {
        "T": T,
        "duration": float(t_end),
        "t_final": float(t),
        "x_final": float(s[0]),
        "th_err_deg": np.rad2deg(th_err),
        "rates": s[4:].copy(),
        "peak_abs_u": float(np.max(np.abs(U_log))),
        "peak_abs_x": float(np.max(np.abs(S_log[0]))),
        "sat_frac": float(sat_frac),
        "pass": bool(
            np.all(np.abs(th_err) < np.deg2rad(0.5))
            and abs(s[0]) < 0.02
            and abs(s[4]) < 0.05
            and np.all(np.abs(s[5:8]) < 0.08)
            and sat_frac <= 0.05
        ),
    }
    return frames, S_f, U_f, report


def gains_for_target(state_id, Q, R, dt=SIM_DT):
    s = equilibrium_state(state_id)
    A, B = jacobians(s, 0.0)
    return algebraic_gain(A, B, Q, R, dt)


def record_from_dense(t, S, U, from_id, to_id, profile="base", perturb=True, via=None):
    Q, R = PROFILES[profile]
    P_inf, K_inf, how = gains_for_target(to_id, Q, R, SIM_DT)
    Ks = backward_gains(t, S, U, P_inf, K_inf, Q, R)
    frames, S_f, U_f, report = simulate_closed_loop(
        t, S, U, Ks, K_inf, from_id, to_id, Q=Q, R=R, perturb=perturb
    )
    report["profile"] = profile
    report["gain"] = how
    report["frames"] = frames
    report["S"] = S_f
    report["U"] = U_f
    report["via"] = via
    return report


def record_transition(sol, from_id, to_id, profile="base", perturb=True, via=None):
    t, S, U = dense_nominal(sol)
    return record_from_dense(t, S, U, from_id, to_id, profile=profile, perturb=perturb, via=via)


def concat_nominals(sol_ab, sol_bc, dwell=0.5):
    """Join two collocation nominals with a short dwell at the shared equilibrium."""
    t1, S1, U1 = dense_nominal(sol_ab)
    t2, S2, U2 = dense_nominal(sol_bc)
    S2 = S2.copy()
    for i in range(3):
        delta = S1[1 + i, -1] - S2[1 + i, 0]
        S2[1 + i, :] += 2.0 * np.pi * np.round(delta / (2.0 * np.pi))
    n_dwell = max(int(round(dwell / SIM_DT)), 1)
    dwell_t = np.arange(1, n_dwell + 1) * (dwell / n_dwell)
    S_d = np.repeat(S1[:, -1:].copy(), n_dwell, axis=1)
    S_d[4:, :] = 0.0
    U_d = np.zeros(n_dwell)
    t_d = t1[-1] + dwell_t
    t2s = t2[1:] + t_d[-1]
    S2s = S2[:, 1:]
    U2s = U2[1:]
    t = np.concatenate([t1, t_d, t2s])
    S = np.concatenate([S1, S_d, S2s], axis=1)
    U = np.concatenate([U1, U_d, U2s])
    return t, S, U


def hold_equilibrium(state_id, seconds=3.0, profile="base"):
    """Regulator-only check. No feedforward motion."""
    Q, R = PROFILES[profile]
    _P, K_inf, how = gains_for_target(state_id, Q, R, SIM_DT)
    s_eq = equilibrium_state(state_id)
    t = np.array([0.0, 0.2])
    S = np.repeat(s_eq.reshape(8, 1), 2, axis=1)
    U = np.zeros(2)
    Ks = np.repeat(K_inf.reshape(1, 8), 2, axis=0)
    # Reuse the simulator by pretending T is tiny and the rest is hold.
    # The helper always adds HOLD_S, so call the loop inline for a short check.
    length = L_NOM * 1.005
    s = s_eq.copy()
    s[1:4] += np.deg2rad(0.3)
    rng = np.random.default_rng(50 + state_id)
    t_now = 0.0
    next_ctrl = 0.0
    u_applied = 0.0
    while t_now < seconds - 1e-12:
        if t_now >= next_ctrl - 1e-12:
            err = s - s_eq
            err[1:4] = wrap_angle(err[1:4])
            u_cmd = float(-(K_inf @ err) + rng.normal(0.0, 0.05))
            u_applied = float(np.clip(u_cmd, -U_CLIP, U_CLIP))
            next_ctrl += CTRL_DT
        step = min(SIM_DT, seconds - t_now)
        s = _rk4(s, u_applied, step, length)
        t_now += step
    err = wrap_angle(s[1:4] - equilibrium_angles(state_id))
    ok = bool(np.all(np.abs(err) < np.deg2rad(0.5)) and abs(s[0]) < 0.02 and np.all(np.abs(s[4:]) < 0.08))
    return {"id": state_id, "pass": ok, "x": float(s[0]), "th_err_deg": np.rad2deg(err), "rates": s[4:].copy(), "gain": how}
