"""Triple pendulum on a cart. Moon gravity. Cart acceleration is the input.

The cart is an ideal drive (Glück, Eder, Kugi, Automatica 2013): the input
u is cart acceleration, so a separate cart mass does not enter. Link inertia
still makes the horizontal momentum finite.

One Lagrangian supplies every vector field:
  M(q) qdd + bias(q, qd) + G(q) = [F, 0, 0, 0]
  and the acceleration model enforces xdd = u, with F the implied cart force.
"""

from __future__ import annotations

import casadi as ca
import numpy as np

L_NOM = np.array([0.5, 0.4, 0.3], dtype=float)
M_NOM = np.array([0.6, 0.4, 0.25], dtype=float)
G_MOON = 1.62

# id 1..8: link1, link2, link3 with up=0, down=1, as binary, plus 1.
STATE_NAMES = ["UUU", "UUD", "UDU", "UDD", "DUU", "DUD", "DDU", "DDD"]


def equilibrium_angles(state_id: int) -> np.ndarray:
    bits = int(state_id) - 1
    th = np.zeros(3, dtype=float)
    for i in range(3):
        down = (bits >> (2 - i)) & 1
        th[i] = np.pi if down else 0.0
    return th


def equilibrium_state(state_id: int, winding=None) -> np.ndarray:
    th = equilibrium_angles(state_id)
    if winding is not None:
        th = th + 2.0 * np.pi * np.asarray(winding, dtype=float)
    s = np.zeros(8, dtype=float)
    s[1:4] = th
    return s


def wrap_angle(a):
    return (np.asarray(a, dtype=float) + np.pi) % (2.0 * np.pi) - np.pi


def _build():
    s = ca.SX.sym("s", 8)
    u = ca.SX.sym("u")
    Qf = ca.SX.sym("Qf")
    length = ca.SX.sym("l", 3)
    mass = ca.SX.sym("m", 3)
    grav = ca.SX.sym("g")

    q = s[0:4]
    qd = s[4:8]
    x = q[0]
    th = [q[1], q[2], q[3]]
    xd = qd[0]
    thd = [qd[1], qd[2], qd[3]]

    kinetic = 0
    potential = 0
    px = 0
    for i in range(3):
        cx = x
        cy = 0
        vx = xd
        vy = 0
        for j in range(i):
            cx = cx + length[j] * ca.sin(th[j])
            cy = cy + length[j] * ca.cos(th[j])
            vx = vx + length[j] * ca.cos(th[j]) * thd[j]
            vy = vy - length[j] * ca.sin(th[j]) * thd[j]
        cx = cx + 0.5 * length[i] * ca.sin(th[i])
        cy = cy + 0.5 * length[i] * ca.cos(th[i])
        vx = vx + 0.5 * length[i] * ca.cos(th[i]) * thd[i]
        vy = vy - 0.5 * length[i] * ca.sin(th[i]) * thd[i]
        inertia = mass[i] * length[i] ** 2 / 12.0
        kinetic = kinetic + 0.5 * mass[i] * (vx * vx + vy * vy) + 0.5 * inertia * thd[i] ** 2
        potential = potential + mass[i] * grav * cy
        px = px + mass[i] * vx

    # p = dT/dqd, M = dp/dqd. EL: M qdd + dp/dq * qd - dT/dq + dV/dq = Q.
    momentum = ca.jacobian(kinetic, qd).T
    mass_mx = ca.jacobian(momentum, qd)
    bias = ca.jacobian(momentum, q) @ qd - ca.jacobian(kinetic, q).T
    gravity = ca.jacobian(potential, q).T

    qdd_force = ca.solve(mass_mx, ca.vertcat(Qf, 0, 0, 0) - bias - gravity)
    sdot_force = ca.vertcat(qd, qdd_force)

    rhs = -mass_mx[1:, 0] * u - bias[1:] - gravity[1:]
    qdd_th = ca.solve(mass_mx[1:, 1:], rhs)
    qdd_acc = ca.vertcat(u, qdd_th)
    sdot_acc = ca.vertcat(qd, qdd_acc)
    force = (mass_mx @ qdd_acc + bias + gravity)[0]

    energy_sx = kinetic + potential
    A = ca.jacobian(sdot_acc, s)
    B = ca.jacobian(sdot_acc, u)

    packed = [s, length, mass, grav]
    funs = {
        "f_acc": ca.Function("f_acc", [s, u, length, mass, grav], [sdot_acc]),
        "f_force": ca.Function("f_force", [s, Qf, length, mass, grav], [sdot_force]),
        "energy": ca.Function("energy", packed, [energy_sx]),
        "Px": ca.Function("Px", packed, [px]),
        "Fgen": ca.Function("Fgen", [s, u, length, mass, grav], [force]),
        "jac": ca.Function("linearize", [s, u, length, mass, grav], [A, B]),
        "M": ca.Function("M", packed, [mass_mx]),
    }
    return funs


_MODEL = None


def model():
    global _MODEL
    if _MODEL is None:
        _MODEL = _build()
    return _MODEL


def _col(v):
    return np.asarray(v, dtype=float).reshape(-1)


def f_acc(s, u, length=L_NOM, mass=M_NOM, grav=G_MOON):
    out = model()["f_acc"](_col(s), float(u), _col(length), _col(mass), float(grav))
    return np.array(out, dtype=float).reshape(-1)


def f_force(s, generalized_cart_force, length=L_NOM, mass=M_NOM, grav=G_MOON):
    out = model()["f_force"](
        _col(s), float(generalized_cart_force), _col(length), _col(mass), float(grav)
    )
    return np.array(out, dtype=float).reshape(-1)


def energy(s, length=L_NOM, mass=M_NOM, grav=G_MOON):
    return float(model()["energy"](_col(s), _col(length), _col(mass), float(grav)))


def horizontal_momentum(s, length=L_NOM, mass=M_NOM, grav=G_MOON):
    return float(model()["Px"](_col(s), _col(length), _col(mass), float(grav)))


def generalized_force(s, u, length=L_NOM, mass=M_NOM, grav=G_MOON):
    return float(model()["Fgen"](_col(s), float(u), _col(length), _col(mass), float(grav)))


def comoving_energy(s, length=L_NOM, mass=M_NOM, grav=G_MOON):
    """Mechanical energy in the inertial frame that moves at the current cart speed.

    When cart acceleration is zero the cart speed is constant, that frame is
    inertial, and this energy is the total energy of the three rods.
    """
    s = _col(s)
    xd = float(s[4])
    mtot = float(np.sum(_col(mass)))
    return energy(s, length, mass, grav) - xd * horizontal_momentum(s, length, mass, grav) + 0.5 * mtot * xd * xd


def jacobians(s, u, length=L_NOM, mass=M_NOM, grav=G_MOON):
    A, B = model()["jac"](_col(s), float(u), _col(length), _col(mass), float(grav))
    return np.array(A, dtype=float), np.array(B, dtype=float).reshape(8, 1)


def mass_matrix(s, length=L_NOM, mass=M_NOM, grav=G_MOON):
    M = model()["M"](_col(s), _col(length), _col(mass), float(grav))
    return np.array(M, dtype=float)


def potential_energy(state_id: int) -> float:
    return energy(equilibrium_state(state_id))
