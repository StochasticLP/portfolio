"""Hermite-Simpson direct collocation with casadi and IPOPT."""

from __future__ import annotations

import time

import casadi as ca
import numpy as np

from dynamics import G_MOON, L_NOM, M_NOM, f_acc, model

U_MAX = 6.0
X_MAX = 2.0
T_MIN = 4.0
T_MAX = 20.0
DEFECT_LIMIT = 1e-6


def hermite_state(s, y0, y1, f0, f1, h):
    s2 = s * s
    s3 = s2 * s
    h00 = 2.0 * s3 - 3.0 * s2 + 1.0
    h10 = s3 - 2.0 * s2 + s
    h01 = -2.0 * s3 + 3.0 * s2
    h11 = s3 - s2
    return h00 * y0 + h10 * h * f0 + h01 * y1 + h11 * h * f1


def quadratic_control(s, u0, um, u1):
    l0 = 2.0 * (s - 0.5) * (s - 1.0)
    lm = 4.0 * s * (1.0 - s)
    l1 = 2.0 * s * (s - 0.5)
    return l0 * u0 + lm * um + l1 * u1


def trajectory_metrics(X, Xm, U, Um, T):
    N = X.shape[1] - 1
    h = float(T) / N
    defect = 0.0
    cost = 0.01 * float(T)
    for k in range(N):
        f0 = f_acc(X[:, k], float(U[0, k]))
        fm = f_acc(Xm[:, k], float(Um[0, k]))
        f1 = f_acc(X[:, k + 1], float(U[0, k + 1]))
        herm = Xm[:, k] - (0.5 * (X[:, k] + X[:, k + 1]) + (h / 8.0) * (f0 - f1))
        simp = X[:, k + 1] - (X[:, k] + (h / 6.0) * (f0 + 4.0 * fm + f1))
        defect = max(defect, float(np.max(np.abs(herm))), float(np.max(np.abs(simp))))
        uk = float(U[0, k])
        um = float(Um[0, k])
        u1 = float(U[0, k + 1])
        cost += (h / 6.0) * (uk * uk + 4.0 * um * um + u1 * u1)
    x_violation = max(0.0, float(np.max(np.abs(X[0, :]))) - X_MAX, float(np.max(np.abs(Xm[0, :]))) - X_MAX)
    u_violation = max(0.0, float(np.max(np.abs(U))) - U_MAX, float(np.max(np.abs(Um))) - U_MAX)
    return {"defect": defect, "cost": cost, "x_violation": x_violation, "u_violation": u_violation}


def reverse_solution(sol):
    """Time reversal. Positions stay, rates flip, u(T-t) is copied."""
    X = sol["X"][:, ::-1].copy()
    Xm = sol["Xm"][:, ::-1].copy()
    X[4:, :] *= -1.0
    Xm[4:, :] *= -1.0
    out = {
        "success": True,
        "status": sol.get("status", "reversed"),
        "T": float(sol["T"]),
        "N": int(sol["N"]),
        "X": X,
        "Xm": Xm,
        "U": sol["U"][:, ::-1].copy(),
        "Um": sol["Um"][:, ::-1].copy(),
        "from_id": int(sol["to_id"]),
        "to_id": int(sol["from_id"]),
        "k": [-int(v) for v in sol.get("k", [0, 0, 0])],
        "reversed": True,
    }
    metrics = trajectory_metrics(out["X"], out["Xm"], out["U"], out["Um"], out["T"])
    out.update(metrics)
    return out


def resample_guess(sol, N_new):
    """Cubic / quadratic collocation interpolant, sampled on a new mesh."""
    T = float(sol["T"])
    N = int(sol["N"])
    h = T / N
    f_nodes = [f_acc(sol["X"][:, k], float(sol["U"][0, k])) for k in range(N + 1)]

    def state_at(t):
        if t <= 0.0:
            return sol["X"][:, 0].copy()
        if t >= T:
            return sol["X"][:, -1].copy()
        k = min(int(np.floor(t / h)), N - 1)
        s = (t - k * h) / h
        return hermite_state(s, sol["X"][:, k], sol["X"][:, k + 1], f_nodes[k], f_nodes[k + 1], h)

    def u_at(t):
        if t <= 0.0:
            return float(sol["U"][0, 0])
        if t >= T:
            return float(sol["U"][0, -1])
        k = min(int(np.floor(t / h)), N - 1)
        s = (t - k * h) / h
        return float(quadratic_control(s, sol["U"][0, k], sol["Um"][0, k], sol["U"][0, k + 1]))

    X = np.zeros((8, N_new + 1))
    Xm = np.zeros((8, N_new))
    U = np.zeros((1, N_new + 1))
    Um = np.zeros((1, N_new))
    h_new = T / N_new
    for k in range(N_new + 1):
        X[:, k] = state_at(k * h_new)
        U[0, k] = np.clip(u_at(k * h_new), -U_MAX, U_MAX)
    for k in range(N_new):
        Xm[:, k] = state_at((k + 0.5) * h_new)
        Um[0, k] = np.clip(u_at((k + 0.5) * h_new), -U_MAX, U_MAX)
    X[:, 0] = sol["X"][:, 0]
    X[:, -1] = sol["X"][:, -1]
    X[0, :] = np.clip(X[0, :], -X_MAX, X_MAX)
    Xm[0, :] = np.clip(Xm[0, :], -X_MAX, X_MAX)
    return {"X": X, "Xm": Xm, "U": U, "Um": Um, "T": T}


class CollocationSolver:
    def __init__(self, N, print_level=0, max_iter=400, max_cpu=40.0, time_weight=0.01, u_max=None, x_max=None):
        t0 = time.perf_counter()
        self.N = int(N)
        u_bound = U_MAX if u_max is None else float(u_max)
        x_bound = X_MAX if x_max is None else float(x_max)
        opti = ca.Opti()
        self.opti = opti
        self.X = opti.variable(8, N + 1)
        self.Xm = opti.variable(8, N)
        self.U = opti.variable(1, N + 1)
        self.Um = opti.variable(1, N)
        self.T = opti.variable()
        self.s0 = opti.parameter(8)
        self.sF = opti.parameter(8)

        f = model()["f_acc"]
        length = ca.DM(L_NOM)
        mass = ca.DM(M_NOM)
        grav = G_MOON
        h = self.T / float(N)
        cost = 0
        for k in range(N):
            f0 = f(self.X[:, k], self.U[0, k], length, mass, grav)
            fm = f(self.Xm[:, k], self.Um[0, k], length, mass, grav)
            f1 = f(self.X[:, k + 1], self.U[0, k + 1], length, mass, grav)
            mid = 0.5 * (self.X[:, k] + self.X[:, k + 1]) + (h / 8.0) * (f0 - f1)
            opti.subject_to(self.Xm[:, k] == mid)
            step = self.X[:, k] + (h / 6.0) * (f0 + 4.0 * fm + f1)
            opti.subject_to(self.X[:, k + 1] == step)
            cost = cost + (h / 6.0) * (
                self.U[0, k] ** 2 + 4.0 * self.Um[0, k] ** 2 + self.U[0, k + 1] ** 2
            )

        opti.subject_to(self.X[:, 0] == self.s0)
        opti.subject_to(self.X[:, -1] == self.sF)
        opti.subject_to(opti.bounded(T_MIN, self.T, T_MAX))
        opti.subject_to(opti.bounded(-u_bound, self.U, u_bound))
        opti.subject_to(opti.bounded(-u_bound, self.Um, u_bound))
        opti.subject_to(opti.bounded(-x_bound, self.X[0, :], x_bound))
        opti.subject_to(opti.bounded(-x_bound, self.Xm[0, :], x_bound))
        opti.subject_to(opti.bounded(-10.0, self.X[4, :], 10.0))
        opti.subject_to(opti.bounded(-10.0, self.Xm[4, :], 10.0))
        for i in range(3):
            opti.subject_to(opti.bounded(-8.0 * np.pi, self.X[1 + i, :], 8.0 * np.pi))
            opti.subject_to(opti.bounded(-8.0 * np.pi, self.Xm[1 + i, :], 8.0 * np.pi))
            opti.subject_to(opti.bounded(-40.0, self.X[5 + i, :], 40.0))
            opti.subject_to(opti.bounded(-40.0, self.Xm[5 + i, :], 40.0))
        opti.minimize(cost + float(time_weight) * self.T)
        opti.solver(
            "ipopt",
            {"print_time": False},
            {
                "linear_solver": "mumps",
                "print_level": int(print_level),
                "sb": "yes",
                "max_iter": int(max_iter),
                "tol": 1e-7,
                "constr_viol_tol": 1e-8,
                "acceptable_tol": 1e-5,
                "acceptable_constr_viol_tol": 1e-6,
                "acceptable_iter": 5,
                "mu_strategy": "adaptive",
                "nlp_scaling_method": "gradient-based",
                "max_cpu_time": float(max_cpu),
            },
        )
        self.build_s = time.perf_counter() - t0

    def solve(self, s0, sF, guess):
        opti = self.opti
        opti.set_value(self.s0, np.asarray(s0, dtype=float))
        opti.set_value(self.sF, np.asarray(sF, dtype=float))
        opti.set_initial(self.X, guess["X"])
        opti.set_initial(self.Xm, guess["Xm"])
        opti.set_initial(self.U, guess["U"])
        opti.set_initial(self.Um, guess["Um"])
        opti.set_initial(self.T, float(np.clip(guess["T"], T_MIN, T_MAX)))
        status = "error"
        try:
            sol = opti.solve()
            status = sol.stats().get("return_status", "Solve_Succeeded")
            X = np.array(sol.value(self.X), dtype=float)
            Xm = np.array(sol.value(self.Xm), dtype=float)
            U = np.array(sol.value(self.U), dtype=float).reshape(1, -1)
            Um = np.array(sol.value(self.Um), dtype=float).reshape(1, -1)
            T = float(sol.value(self.T))
        except RuntimeError:
            try:
                status = opti.stats().get("return_status", "error")
            except Exception:
                status = "error"
            return {"success": False, "status": str(status), "N": self.N}
        if X.shape != (8, self.N + 1):
            X = X.reshape(8, self.N + 1, order="F")
            Xm = Xm.reshape(8, self.N, order="F")
        metrics = trajectory_metrics(X, Xm, U, Um, T)
        ok = status in ("Solve_Succeeded", "Solved_To_Acceptable_Level")
        ok = ok and metrics["defect"] <= DEFECT_LIMIT
        ok = ok and metrics["x_violation"] <= 1e-5 and metrics["u_violation"] <= 1e-5
        return {
            "success": bool(ok),
            "status": str(status),
            "T": T,
            "N": self.N,
            "X": X,
            "Xm": Xm,
            "U": U,
            "Um": Um,
            **metrics,
        }
