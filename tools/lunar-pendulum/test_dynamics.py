"""Energy, power, and small-oscillation checks for the lunar triple pendulum.

Run:  .venv\\Scripts\\python.exe test_dynamics.py
"""

from __future__ import annotations

import numpy as np
from scipy.integrate import solve_ivp
from scipy.linalg import eigvals

from dynamics import (
    L_NOM,
    M_NOM,
    G_MOON,
    comoving_energy,
    energy,
    equilibrium_state,
    f_acc,
    f_force,
    generalized_force,
    jacobians,
    mass_matrix,
)


def _energy_independent(s, length, mass, grav):
    """Hand-written kinetic plus potential. Not the casadi graph."""
    x = s[0]
    th = s[1:4]
    xd = s[4]
    thd = s[5:8]
    kinetic = 0.0
    potential = 0.0
    for i in range(3):
        vx = xd
        vy = 0.0
        cy = 0.0
        for j in range(i):
            cy += length[j] * np.cos(th[j])
            vx += length[j] * np.cos(th[j]) * thd[j]
            vy -= length[j] * np.sin(th[j]) * thd[j]
        cy += 0.5 * length[i] * np.cos(th[i])
        vx += 0.5 * length[i] * np.cos(th[i]) * thd[i]
        vy -= 0.5 * length[i] * np.sin(th[i]) * thd[i]
        inertia = mass[i] * length[i] ** 2 / 12.0
        kinetic += 0.5 * mass[i] * (vx * vx + vy * vy) + 0.5 * inertia * thd[i] ** 2
        potential += mass[i] * grav * cy
    return kinetic + potential


def _hanging_mk(length, mass, grav):
    """Fixed-pivot mass and stiffness for small angles from straight down.

    Absolute angles. Potential is diagonal in those angles. Kinetic terms come
    from horizontal COM motion at the down pose, plus spin about each COM.
    """
    K = np.zeros((3, 3))
    M = np.zeros((3, 3))
    for a in range(3):
        K[a, a] = grav * length[a] * (0.5 * mass[a] + np.sum(mass[a + 1 :]))
    lever = np.zeros((3, 3))
    for i in range(3):
        for j in range(3):
            if j < i:
                lever[i, j] = length[j]
            elif j == i:
                lever[i, j] = 0.5 * length[i]
        M += mass[i] * np.outer(lever[i], lever[i])
        M[i, i] += mass[i] * length[i] ** 2 / 12.0
    return M, K


def test_energy_matches_independent_kinematics():
    rng = np.random.default_rng(1)
    for _ in range(12):
        s = rng.normal(scale=[0.4, 2.0, 2.0, 2.0, 1.0, 2.0, 2.0, 2.0])
        assert abs(energy(s) - _energy_independent(s, L_NOM, M_NOM, G_MOON)) < 1e-9


def test_mass_matrix_upright_entries():
    M = mass_matrix(np.zeros(8))
    assert np.allclose(M, M.T, atol=1e-10)
    assert abs(M[0, 0] - np.sum(M_NOM)) < 1e-9
    # d(horizontal momentum)/d(th1d) at the upright pose.
    m, l = M_NOM, L_NOM
    m_x_th1 = m[0] * (l[0] / 2) + m[1] * l[0] + m[2] * l[0]
    assert abs(M[0, 1] - m_x_th1) < 1e-9
    m_th1 = m[0] * l[0] ** 2 / 3.0 + (m[1] + m[2]) * l[0] ** 2
    assert abs(M[1, 1] - m_th1) < 1e-9
    eig = np.linalg.eigvalsh(M)
    assert np.all(eig > 1e-8)


def test_equilibrium_acceleration_sign():
    s = np.zeros(8)
    s[1] = 0.05
    assert f_acc(s, 0.0)[5] > 0.0
    s = equilibrium_state(8)
    s[1] += 0.05
    assert f_acc(s, 0.0)[5] < 0.0
    for state_id in range(1, 9):
        sd = f_acc(equilibrium_state(state_id), 0.0)
        assert np.linalg.norm(sd) < 1e-9
        assert abs(generalized_force(equilibrium_state(state_id), 0.0)) < 1e-8


def test_energy_drift_zero_generalized_force():
    """Actuator force 0. DOP853, 20 s, rtol 1e-11. Relative lab-energy drift < 1e-8."""
    rng = np.random.default_rng(12345)
    s0 = np.array(
        [
            rng.uniform(-0.8, 0.8),
            *rng.uniform(-2.2, 2.2, size=3),
            rng.uniform(-1.5, 1.5),
            *rng.uniform(-3.5, 3.5, size=3),
        ]
    )

    def rhs(_t, s):
        return f_force(s, 0.0)

    sol = solve_ivp(rhs, (0.0, 20.0), s0, method="DOP853", rtol=1e-11, atol=1e-12)
    assert sol.success, sol.message
    e0 = energy(s0)
    e1 = energy(sol.y[:, -1])
    rel = abs(e1 - e0) / max(abs(e0), 1e-6)
    assert rel < 1e-8, rel


def test_energy_drift_u0_comoving():
    """Cart acceleration u = 0, random large state, 20 s, DOP853 rtol 1e-11.

    Cart speed is then constant. Total energy of the rods in that inertial
    frame drifts by less than 1e-8 relative.
    """
    rng = np.random.default_rng(54321)
    s0 = np.array(
        [
            rng.uniform(-0.8, 0.8),
            *rng.uniform(-2.5, 2.5, size=3),
            rng.uniform(-2.0, 2.0),
            *rng.uniform(-4.0, 4.0, size=3),
        ]
    )

    def rhs(_t, s):
        return f_acc(s, 0.0)

    sol = solve_ivp(rhs, (0.0, 20.0), s0, method="DOP853", rtol=1e-11, atol=1e-12)
    assert sol.success, sol.message
    e0 = comoving_energy(s0)
    e1 = comoving_energy(sol.y[:, -1])
    rel = abs(e1 - e0) / max(abs(e0), 1e-6)
    assert rel < 1e-8, rel
    # Lab energy is not the conserved quantity once the cart has speed.
    # The comoving value above is the check the integrator must pass.


def test_power_balance_nonzero_u():
    """With u != 0, lab energy rate equals generalized cart force times xd."""
    rng = np.random.default_rng(99)
    for _ in range(10):
        s = rng.normal(scale=[0.5, 1.5, 1.5, 1.5, 1.0, 2.0, 2.0, 2.0])
        u = float(rng.uniform(-4.0, 4.0))
        if abs(u) < 0.3:
            u = 1.25
        sd = f_acc(s, u)
        eps = 1e-7
        d_edt = (energy(s + eps * sd) - energy(s - eps * sd)) / (2.0 * eps)
        power = generalized_force(s, u) * s[4]
        scale = max(1.0, abs(power))
        assert abs(d_edt - power) < 1e-6 * scale

    def u_of(t):
        return 1.8 * np.sin(1.7 * t)

    def rhs(t, s):
        return f_acc(s, u_of(t))

    s0 = np.array([0.2, 0.4, -0.7, 1.1, -0.3, 0.5, -0.4, 0.2])
    sol = solve_ivp(rhs, (0.0, 3.0), s0, method="DOP853", rtol=1e-10, atol=1e-12, dense_output=True)
    assert sol.success
    ts = np.linspace(0.0, 3.0, 4001)
    # Integrate F * xd along the solution and compare with Delta E.
    acc = 0.0
    for a, b in zip(ts[:-1], ts[1:]):
        tm = 0.5 * (a + b)
        sm = sol.sol(tm)
        acc += generalized_force(sm, u_of(tm)) * sm[4] * (b - a)
    delta_e = energy(sol.y[:, -1]) - energy(s0)
    assert abs(delta_e - acc) < 1e-5 * max(1.0, abs(delta_e))


def test_small_oscillation_frequencies():
    M, K = _hanging_mk(L_NOM, M_NOM, G_MOON)
    w2 = np.real(eigvals(K, M))
    w_ind = np.sqrt(np.sort(w2))
    assert np.all(w2 > 0.0)

    A, _B = jacobians(equilibrium_state(8), 0.0)
    ev = np.linalg.eigvals(A)
    osc = []
    for e in ev:
        if abs(np.real(e)) < 1e-7 and abs(np.imag(e)) > 1e-6:
            osc.append(abs(np.imag(e)))
    w_lin = np.unique(np.round(osc, decimals=8))
    w_lin.sort()
    assert w_lin.shape == (3,)
    assert np.allclose(w_lin, w_ind, rtol=1e-8, atol=1e-8), (w_lin, w_ind)


def _main():
    tests = [
        test_energy_matches_independent_kinematics,
        test_mass_matrix_upright_entries,
        test_equilibrium_acceleration_sign,
        test_energy_drift_zero_generalized_force,
        test_energy_drift_u0_comoving,
        test_power_balance_nonzero_u,
        test_small_oscillation_frequencies,
    ]
    for fn in tests:
        fn()
        print("pass", fn.__name__)
    print("all dynamics tests passed")


if __name__ == "__main__":
    _main()
