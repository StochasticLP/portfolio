"""Solve all 56 lunar triple-pendulum transitions and write the playback file.

The search is resumable. Solved pairs are stored in cache/. Progress is appended
to cache/progress.log. Time reversal supplies the opposite feedforward.
"""

from __future__ import annotations

import argparse
import json
import os
import time
import traceback
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")

import numpy as np

from collocation import DEFECT_LIMIT, reverse_solution, trajectory_metrics
from dynamics import STATE_NAMES, equilibrium_angles, equilibrium_state, potential_energy
from guesses import make_guess

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CACHE = HERE / "cache"
LOG_PATH = CACHE / "progress.log"
JSON_PATH = ROOT / "public" / "data" / "lunar-pendulum.json"

_SOLVERS = {}


def log(msg):
    CACHE.mkdir(parents=True, exist_ok=True)
    line = time.strftime("%Y-%m-%d %H:%M:%S") + " " + msg
    print(line, flush=True)
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")


TIME_WEIGHT = 0.5


def get_solver(n, max_iter=300, max_cpu=70.0):
    key = (int(n), int(max_iter), float(TIME_WEIGHT))
    if key not in _SOLVERS:
        from collocation import CollocationSolver

        solver = CollocationSolver(
            int(n),
            print_level=0,
            max_iter=max_iter,
            max_cpu=max_cpu,
            time_weight=TIME_WEIGHT,
        )
        _SOLVERS[key] = solver
        log(f"built N={n} in {solver.build_s:.1f}s")
    return _SOLVERS[key]


def _pack_result(sol, from_id, to_id, k, label):
    sol = dict(sol)
    sol["from_id"] = int(from_id)
    sol["to_id"] = int(to_id)
    sol["k"] = [int(v) for v in k]
    sol["label"] = label
    sol["reversed"] = False
    return sol


def _accept(sol):
    return bool(sol.get("success")) and float(sol.get("defect", 1.0)) <= DEFECT_LIMIT and int(sol.get("N", 0)) >= 80


def run_attempt(task):
    """One multi-start attempt. Runs in a worker process."""
    try:
        return _run_attempt(task)
    except Exception as exc:
        return {
            "success": False,
            "status": "exception",
            "error": repr(exc),
            "trace": traceback.format_exc(limit=6),
            "label": task.get("label", "?"),
            "from_id": task["a"],
            "to_id": task["b"],
        }


def _guess_for(task, s0, sF, n):
    bump = np.zeros(4)
    moved = np.abs(sF[1:4] - s0[1:4]) > 0.5
    if task["kind"] == "bump":
        sign = 1.0 if task["seed"] % 2 == 0 else -1.0
        bump[1:] = sign * task["amp"] * moved
    return make_guess(
        s0,
        sF,
        task["T"],
        n,
        kind=task["kind"],
        seed=int(task["seed"]),
        cart_amp=float(task["amp"]),
        bump=bump,
    )


def _run_attempt(task):
    from collocation import resample_guess

    a = int(task["a"])
    b = int(task["b"])
    k = tuple(int(v) for v in task["k"])
    s0 = equilibrium_state(a)
    sF = equilibrium_state(b, winding=k)
    n_coarse = int(task["n_coarse"])
    n_base = int(task["n_base"])
    n_refine = int(task["n_refine"])
    label = task["label"]

    if task.get("donor"):
        donor = load_solution(Path(task["donor"]))
        guess = _transplant(donor, s0, sF, n_base)
        sol = get_solver(n_base).solve(s0, sF, guess)
        if not sol.get("success"):
            sol["label"] = label
            sol["from_id"] = a
            sol["to_id"] = b
            return sol
        if n_refine > n_base:
            refined = get_solver(n_refine).solve(s0, sF, resample_guess(sol, n_refine))
            if refined.get("success") and refined["cost"] <= sol["cost"] + 1e-3:
                sol = refined
        return _pack_result(sol, a, b, k, label)

    # Direct solve on the base mesh first. A coarse mesh is only a backup guess.
    guess_b = _guess_for(task, s0, sF, n_base)
    base = get_solver(n_base).solve(s0, sF, guess_b)
    if not base.get("success"):
        guess_c = _guess_for(task, s0, sF, n_coarse)
        coarse = get_solver(n_coarse, max_iter=180, max_cpu=30.0).solve(s0, sF, guess_c)
        if coarse.get("success"):
            base = get_solver(n_base).solve(s0, sF, resample_guess(coarse, n_base))
    if not base.get("success"):
        base["label"] = label
        base["from_id"] = a
        base["to_id"] = b
        base["k"] = list(k)
        return base
    best = base
    if n_refine > n_base:
        refined = get_solver(n_refine).solve(s0, sF, resample_guess(base, n_refine))
        if refined.get("success"):
            best = refined
    return _pack_result(best, a, b, k, label)


def _transplant(sol, s0, sF, n):
    from collocation import resample_guess

    guess = resample_guess(sol, n)
    d0 = np.asarray(s0[:4], dtype=float) - guess["X"][:4, 0]
    dF = np.asarray(sF[:4], dtype=float) - guess["X"][:4, -1]
    for k in range(n + 1):
        blend = 0.5 * (1.0 - np.cos(np.pi * k / n))
        guess["X"][:4, k] += (1.0 - blend) * d0 + blend * dF
    for k in range(n):
        blend = 0.5 * (1.0 - np.cos(np.pi * (k + 0.5) / n))
        guess["Xm"][:4, k] += (1.0 - blend) * d0 + blend * dF
    guess["X"][:, 0] = np.asarray(s0, dtype=float)
    guess["X"][:, -1] = np.asarray(sF, dtype=float)
    guess["X"][0, :] = np.clip(guess["X"][0, :], -2.0, 2.0)
    guess["Xm"][0, :] = np.clip(guess["Xm"][0, :], -2.0, 2.0)
    guess["U"] = np.clip(guess["U"], -6.0, 6.0)
    guess["Um"] = np.clip(guess["Um"], -6.0, 6.0)
    guess["T"] = float(np.clip(sol["T"], 4.0, 20.0))
    return guess


def save_solution(path, sol):
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        path,
        X=sol["X"],
        Xm=sol["Xm"],
        U=sol["U"],
        Um=sol["Um"],
        T=float(sol["T"]),
        N=int(sol["N"]),
        cost=float(sol["cost"]),
        defect=float(sol["defect"]),
        from_id=int(sol["from_id"]),
        to_id=int(sol["to_id"]),
        k=np.asarray(sol.get("k", [0, 0, 0]), dtype=int),
        status=str(sol.get("status", "")),
    )


def load_solution(path):
    data = np.load(path, allow_pickle=False)
    sol = {
        "success": True,
        "status": str(data["status"]),
        "T": float(data["T"]),
        "N": int(data["N"]),
        "X": np.array(data["X"], dtype=float),
        "Xm": np.array(data["Xm"], dtype=float),
        "U": np.array(data["U"], dtype=float).reshape(1, -1),
        "Um": np.array(data["Um"], dtype=float).reshape(1, -1),
        "from_id": int(data["from_id"]),
        "to_id": int(data["to_id"]),
        "k": [int(v) for v in np.array(data["k"]).reshape(-1)],
        "reversed": False,
        "cost": float(data["cost"]),
        "defect": float(data["defect"]),
    }
    metrics = trajectory_metrics(sol["X"], sol["Xm"], sol["U"], sol["Um"], sol["T"])
    sol.update(metrics)
    sol["success"] = sol["defect"] <= DEFECT_LIMIT and sol["N"] >= 80
    return sol


def load_cache():
    solved = {}
    if not CACHE.exists():
        return solved
    for path in sorted(CACHE.glob("pair_*.npz")):
        try:
            sol = load_solution(path)
        except Exception as exc:
            log(f"skip cache {path.name}: {exc}")
            continue
        if not sol["success"]:
            log(f"drop cache {path.name} defect={sol['defect']:.3e} N={sol['N']}")
            continue
        solved[(sol["from_id"], sol["to_id"])] = sol
    return solved


def pair_ready(solved, a, b):
    return (a, b) in solved or (b, a) in solved


def directed(solved, a, b):
    if (a, b) in solved:
        return solved[(a, b)]
    if (b, a) in solved:
        return reverse_solution(solved[(b, a)])
    raise KeyError((a, b))


def falling_direction(a, b):
    if potential_energy(a) >= potential_energy(b):
        return a, b
    return b, a


def priority_windings(src, dst):
    th0 = equilibrium_angles(src)
    th1 = equilibrium_angles(dst)
    found = [(0, 0, 0)]
    flip = [0, 0, 0]
    for i in range(3):
        if abs(th0[i] - th1[i]) > 1.0:
            flip[i] = -1
    if tuple(flip) != (0, 0, 0):
        found.append(tuple(flip))
    for i in range(3):
        for sign in (-1, 1):
            k = [0, 0, 0]
            k[i] = sign
            found.append(tuple(k))
    for sign in (-2, 2):
        found.append((sign, sign, sign))
    unique = []
    for k in found:
        if k not in unique:
            unique.append(k)
    return unique


def _task(a, b, k, kind, T, amp, seed, label, n_coarse, n_base, n_refine, donor=None):
    return {
        "a": int(a),
        "b": int(b),
        "k": list(k),
        "kind": kind,
        "T": float(T),
        "amp": float(amp),
        "seed": int(seed),
        "label": label,
        "n_coarse": int(n_coarse),
        "n_base": int(n_base),
        "n_refine": int(n_refine),
        "donor": donor,
    }


def stage_tasks(solved, n_coarse, n_base, n_refine, only=None):
    """Three waves of attempts for pairs that are still missing."""
    pairs = []
    for a in range(1, 9):
        for b in range(a + 1, 9):
            if only and frozenset((a, b)) not in only and (a, b) not in only and (b, a) not in only:
                # only may be directed pairs; keep the unordered pair if either direction was requested
                if not any(frozenset((a, b)) == frozenset(p) for p in only):
                    continue
            if pair_ready(solved, a, b):
                continue
            pairs.append((a, b))
    pairs.sort(key=lambda ab: (np.count_nonzero(np.abs(equilibrium_angles(ab[0]) - equilibrium_angles(ab[1])) > 1), ab))

    wave1 = []
    wave2 = []
    wave3 = []
    for a0, b0 in pairs:
        src, dst = falling_direction(a0, b0)
        winds = priority_windings(src, dst)
        for k in winds[:2]:
            wave1.append(
                _task(
                    src,
                    dst,
                    k,
                    "cosine",
                    6.5,
                    0.0,
                    1,
                    f"{src}->{dst} cosine T=6.5 k={k}",
                    n_coarse,
                    n_base,
                    n_refine,
                )
            )
        # Opposite direction and wider windings.
        specs2 = [
            ("cosine", 6.0, 0.0, 5),
            ("cosine", 14.0, 0.0, 6),
            ("bump", 9.0, 1.6, 7),
            ("bump", 9.0, 1.6, 8),
            ("random", 8.0, 0.6, 11),
            ("random", 12.0, -0.6, 12),
        ]
        for kind, T, amp, seed in specs2:
            wave2.append(_task(dst, src, winds[0], kind, T, amp, seed, f"{dst}->{src} {kind} T={T}", n_coarse, n_base, n_refine))
        for k in winds[2:6]:
            wave2.append(_task(src, dst, k, "cosine", 9.0, 0.0, 9, f"{src}->{dst} cosine k={k}", n_coarse, n_base, n_refine))
        for k in winds:
            if any(abs(v) == 2 for v in k):
                wave2.append(_task(src, dst, k, "wiggle", 12.0, 1.0, 15, f"{src}->{dst} k={k}", n_coarse, n_base, n_refine))
    return pairs, wave1, wave2, wave3


def _execute(tasks, workers):
    if not tasks:
        return []
    results = []
    if workers <= 1:
        for task in tasks:
            log("start " + task["label"])
            results.append(run_attempt(task))
            _announce(results[-1])
        return results
    with ProcessPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(run_attempt, task): task for task in tasks}
        for fut in as_completed(futures):
            try:
                result = fut.result()
            except Exception as exc:
                result = {"success": False, "status": "pool", "error": repr(exc), "label": futures[fut]["label"]}
            results.append(result)
            _announce(result)
    return results


def _announce(result):
    label = result.get("label", "?")
    if result.get("success"):
        log(
            f"ok {label} T={result['T']:.3f} cost={result['cost']:.3f} "
            f"defect={result['defect']:.2e} N={result['N']} {result.get('status')}"
        )
    else:
        extra = result.get("error") or result.get("status")
        log(f"fail {label} {extra}")


def consider(solved, sol):
    """Keep the lowest-cost solution of this direction. Do not delete the reverse."""
    if not _accept(sol):
        return False
    a, b = int(sol["from_id"]), int(sol["to_id"])
    current = solved.get((a, b))
    if current is not None and current["cost"] <= sol["cost"] + 1e-4:
        return False
    solved[(a, b)] = sol
    save_solution(CACHE / f"pair_{a}_{b}.npz", sol)
    log(f"cache {a}->{b} cost={sol['cost']:.3f} T={sol['T']:.3f}")
    return True


def _round_num(value, digits):
    number = round(float(value), digits)
    if number == 0:
        return 0
    return number


def _record_arrays(report):
    S = report["S"]
    U = report["U"]
    return {
        "x": [_round_num(v, 3) for v in S[0]],
        "th1": [_round_num(v, 4) for v in S[1]],
        "th2": [_round_num(v, 4) for v in S[2]],
        "th3": [_round_num(v, 4) for v in S[3]],
        "u": [_round_num(v, 3) for v in U],
    }


def closed_loop_one(sol, from_id, to_id, via=None):
    from tvlqr import record_transition

    best = None
    for profile in ("base", "stiff", "soft", "tight"):
        report = record_transition(sol, from_id, to_id, profile=profile, perturb=True, via=via)
        log(
            f"loop {from_id}->{to_id} {profile} pass={report['pass']} "
            f"peak|u|={report['peak_abs_u']:.3f} peak|x|={report['peak_abs_x']:.3f} "
            f"x={report['x_final']:.4f} th_deg={np.array2string(report['th_err_deg'], precision=3)} "
            f"sat={report['sat_frac']:.4f} gain={report['gain']}"
        )
        if best is None or report["pass"] or (
            np.max(np.abs(report["th_err_deg"])) < np.max(np.abs(best["th_err_deg"]))
        ):
            best = report
        if report["pass"]:
            return report
    return best


def try_stitch(solved, a, b):
    from tvlqr import concat_nominals, record_from_dense

    candidates = []
    for mid in range(1, 9):
        if mid in (a, b):
            continue
        if not pair_ready(solved, a, mid) or not pair_ready(solved, mid, b):
            continue
        left = directed(solved, a, mid)
        right = directed(solved, mid, b)
        candidates.append((float(left["T"]) + float(right["T"]), mid, left, right))
    candidates.sort(key=lambda item: (item[0] + (0.0 if item[1] == 8 else 0.3), item[0]))
    for _total, mid, left, right in candidates[:4]:
        t, S, U = concat_nominals(left, right, dwell=0.5)
        for profile in ("base", "stiff", "soft", "tight"):
            report = record_from_dense(t, S, U, a, b, profile=profile, perturb=True, via=mid)
            log(
                f"stitch {a}->{b} via {mid} {profile} pass={report['pass']} "
                f"T={report['T']:.2f} th_deg={np.array2string(report['th_err_deg'], precision=3)}"
            )
            if report["pass"]:
                return report
    return None


def write_json(records):
    states = []
    for idx, name in enumerate(STATE_NAMES, start=1):
        states.append(
            {
                "id": idx,
                "name": name,
                "theta": [_round_num(v, 4) for v in equilibrium_angles(idx)],
            }
        )
    transitions = {}
    for key in sorted(records, key=lambda item: (int(item.split("-")[0]), int(item.split("-")[1]))):
        transitions[key] = records[key]
    payload = {
        "meta": {
            "g": 1.62,
            "l": [0.5, 0.4, 0.3],
            "m": [0.6, 0.4, 0.25],
            "uMax": 6,
            "xMax": 2,
            "fps": 30,
            "method": "Hermite-Simpson collocation + TVLQR",
            "holdSeconds": 2.5,
        },
        "states": states,
        "transitions": transitions,
    }
    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, separators=(",", ":"))
    JSON_PATH.write_text(text, encoding="utf-8")
    return len(text.encode("utf-8"))


def print_table(rows):
    header = f"{'pair':<7}{'pass':<6}{'T':>8}{'peak|u|':>10}{'peak|x|':>10}{'x_f':>10}{'ang_deg':>10}{'sat%':>8}{'via':>5}"
    log(header)
    n_pass = 0
    for row in rows:
        n_pass += int(row["pass"])
        ang = float(np.max(np.abs(row["th_err_deg"])))
        via = "-" if row.get("via") in (None, "null") else str(row["via"])
        log(
            f"{row['key']:<7}{('PASS' if row['pass'] else 'FAIL'):<6}{row['T']:8.2f}"
            f"{row['peak_abs_u']:10.3f}{row['peak_abs_x']:10.3f}{row['x_final']:10.4f}"
            f"{ang:10.3f}{100.0 * row['sat_frac']:8.2f}{via:>5}"
        )
    log(f"passed {n_pass}/{len(rows)}")
    return n_pass


def build_record(report, from_id, to_id):
    arrays = _record_arrays(report)
    via = report.get("via")
    return {
        "from": int(from_id),
        "to": int(to_id),
        "T": float(report["T"]),
        "duration": float(report["duration"]),
        "via": None if via in (None, "null") else int(via),
        **arrays,
    }


def missing_ordered(solved):
    missing = []
    for a in range(1, 9):
        for b in range(1, 9):
            if a == b:
                continue
            if not pair_ready(solved, a, b):
                missing.append((a, b))
    return missing


def _loop_worker(job):
    a, b, path, do_reverse = job
    try:
        sol = load_solution(Path(path))
        if do_reverse:
            sol = reverse_solution(sol)
        if float(sol.get("defect", 1.0)) > DEFECT_LIMIT:
            return {"key": f"{a}-{b}", "error": f"defect {sol['defect']:.3e}"}
        report = closed_loop_one(sol, a, b, via=None)
        row = {
            "key": f"{a}-{b}",
            "pass": bool(report["pass"]),
            "T": float(report["T"]),
            "peak_abs_u": float(report["peak_abs_u"]),
            "peak_abs_x": float(report["peak_abs_x"]),
            "x_final": float(report["x_final"]),
            "th_err_deg": np.asarray(report["th_err_deg"], dtype=float),
            "sat_frac": float(report["sat_frac"]),
            "via": report.get("via"),
        }
        return {"key": f"{a}-{b}", "record": build_record(report, a, b), "row": row}
    except Exception as exc:
        return {"key": f"{a}-{b}", "error": repr(exc), "trace": traceback.format_exc(limit=6)}


def run_loops(solved, workers):
    records = {}
    rows = []
    jobs = []
    for a in range(1, 9):
        for b in range(1, 9):
            if a == b:
                continue
            if (a, b) in solved:
                jobs.append((a, b, str(CACHE / f"pair_{a}_{b}.npz"), False))
            elif (b, a) in solved:
                jobs.append((a, b, str(CACHE / f"pair_{b}_{a}.npz"), True))
    log(f"closed-loop jobs {len(jobs)}")
    if workers <= 1:
        packed = [_loop_worker(job) for job in jobs]
    else:
        packed = []
        with ProcessPoolExecutor(max_workers=workers) as pool:
            futures = [pool.submit(_loop_worker, job) for job in jobs]
            for fut in as_completed(futures):
                packed.append(fut.result())
                log(f"loop done {packed[-1].get('key')} pass={packed[-1].get('row', {}).get('pass')}")
    for item in packed:
        if "record" not in item:
            log(f"loop missing {item.get('key')} {item.get('error')}")
            continue
        records[item["key"]] = item["record"]
        rows.append(item["row"])
    failed = [row for row in rows if not row["pass"]]
    for row in failed:
        a_id, b_id = (int(part) for part in row["key"].split("-"))
        report = try_stitch(solved, a_id, b_id)
        if report is None or not report["pass"]:
            log(f"no stitch for {row['key']}")
            continue
        records[row["key"]] = build_record(report, a_id, b_id)
        row["pass"] = True
        row["T"] = float(report["T"])
        row["peak_abs_u"] = float(report["peak_abs_u"])
        row["peak_abs_x"] = float(report["peak_abs_x"])
        row["x_final"] = float(report["x_final"])
        row["th_err_deg"] = np.asarray(report["th_err_deg"], dtype=float)
        row["sat_frac"] = float(report["sat_frac"])
        row["via"] = report.get("via")
        log(f"stitched {row['key']} via {row['via']}")
    for a, b in missing_ordered(solved):
        report = try_stitch(solved, a, b)
        key = f"{a}-{b}"
        if report is None:
            log(f"no stitch for {key}")
            continue
        records[key] = build_record(report, a, b)
        rows.append(
            {
                "key": key,
                "pass": bool(report["pass"]),
                "T": float(report["T"]),
                "peak_abs_u": float(report["peak_abs_u"]),
                "peak_abs_x": float(report["peak_abs_x"]),
                "x_final": float(report["x_final"]),
                "th_err_deg": np.asarray(report["th_err_deg"], dtype=float),
                "sat_frac": float(report["sat_frac"]),
                "via": report.get("via"),
            }
        )
    return records, rows


def warm_tasks(solved, unfinished_pairs, n_base, n_refine):
    tasks = []
    donors = list(solved.items())
    for a0, b0 in unfinished_pairs:
        for direction in (falling_direction(a0, b0), (b0, a0) if falling_direction(a0, b0) != (b0, a0) else (a0, b0)):
            src, dst = direction
            used = 0
            for (i, j), sol in donors:
                if used >= 3:
                    break
                if len({i, j, src, dst}) > 3:
                    continue
                path = str(CACHE / f"pair_{i}_{j}.npz")
                if not Path(path).exists():
                    continue
                k = (0, 0, 0)
                tasks.append(
                    _task(
                        src,
                        dst,
                        k,
                        "cosine",
                        float(sol["T"]),
                        0.0,
                        21 + used,
                        f"warm {src}->{dst} from {i}->{j}",
                        n_coarse=40,
                        n_base=n_base,
                        n_refine=n_refine,
                        donor=path,
                    )
                )
                used += 1
    return tasks


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=10)
    parser.add_argument("--smoke", action="store_true")
    parser.add_argument("--hold-only", action="store_true")
    parser.add_argument("--skip-solve", action="store_true")
    parser.add_argument("--pairs", default="")
    args = parser.parse_args()
    t_wall = time.perf_counter()
    CACHE.mkdir(parents=True, exist_ok=True)

    if args.hold_only:
        from tvlqr import hold_equilibrium

        n_ok = 0
        for state_id in range(1, 9):
            report = hold_equilibrium(state_id)
            n_ok += int(report["pass"])
            log(f"hold {state_id} {STATE_NAMES[state_id - 1]} pass={report['pass']} gain={report['gain']} x={report['x']:.4f} th={report['th_err_deg']}")
        log(f"hold passed {n_ok}/8")
        return

    n_coarse, n_base, n_refine = 40, 80, 120
    only = None
    if args.pairs:
        only = []
        for bit in args.pairs.split(","):
            left, right = bit.split("-")
            only.append((int(left), int(right)))
    if args.smoke:
        n_coarse, n_base, n_refine = 20, 40, 60
        only = [(1, 2)]
        args.workers = 1
        log("smoke mode: pair 1-2, coarse mesh only, no JSON")

    solved = {} if args.smoke else load_cache()
    log(f"cache has {len(solved)} directed solutions")

    if not args.skip_solve and not args.smoke:
        _pairs, wave1, wave2, _wave3 = stage_tasks(solved, n_coarse, n_base, n_refine, only=only)
        # Drop attempts for pairs that get solved mid-wave by filtering before each wave.
        log(f"wave 1 tasks {len(wave1)}")
        for result in _execute(wave1, args.workers):
            consider(solved, result)
        still = [(a, b) for a in range(1, 9) for b in range(a + 1, 9) if not pair_ready(solved, a, b)]
        if only:
            still = [ab for ab in still if any(frozenset(ab) == frozenset(p) for p in only)]
        log(f"after wave 1, open pairs {still}")
        if still:
            open_set = {frozenset(ab) for ab in still}
            wave2 = [task for task in wave2 if frozenset((task["a"], task["b"])) in open_set]
            log(f"wave 2 tasks {len(wave2)}")
            for result in _execute(wave2, args.workers):
                consider(solved, result)
        still = [(a, b) for a in range(1, 9) for b in range(a + 1, 9) if not pair_ready(solved, a, b)]
        if only:
            still = [ab for ab in still if any(frozenset(ab) == frozenset(p) for p in only)]
        if still:
            log(f"warm starts for {still}")
            tasks = warm_tasks(solved, still, n_base, n_refine)
            log(f"wave 3 tasks {len(tasks)}")
            for result in _execute(tasks, args.workers):
                consider(solved, result)
        still = [(a, b) for a in range(1, 9) for b in range(a + 1, 9) if not pair_ready(solved, a, b)]
        log(f"direct solves {28 - len(still)}/28 open={still}")
    elif args.smoke:
        src, dst = falling_direction(1, 2)
        tasks = [
            _task(src, dst, (0, 0, 0), "cosine", 7.0, 0.0, 1, "smoke cosine", n_coarse, n_base, n_refine),
            _task(src, dst, (0, 0, -1), "wiggle", 8.0, 1.0, 2, "smoke wiggle", n_coarse, n_base, n_refine),
        ]
        # Smoke accepts N>=40 so the mesh check can run before the long job.
        global_accept = _accept

        def _accept_smoke(sol):
            return bool(sol.get("success")) and float(sol.get("defect", 1)) <= DEFECT_LIMIT and int(sol.get("N", 0)) >= 40

        globals()["_accept"] = _accept_smoke
        for result in _execute(tasks, 1):
            consider(solved, result)
        globals()["_accept"] = global_accept

    if args.smoke:
        if not pair_ready(solved, 1, 2):
            log("smoke did not solve 1-2")
            return
        sol = directed(solved, 1, 2)
        report = closed_loop_one(sol, sol["from_id"], sol["to_id"])
        log(f"smoke closed loop pass={report['pass']} T={report['T']:.3f}")
        rev = reverse_solution(sol if not sol.get("reversed") else solved.get((sol["to_id"], sol["from_id"]), sol))
        log(f"smoke reverse defect={rev['defect']:.3e}")
        log(f"smoke wall {time.perf_counter() - t_wall:.1f}s")
        return

    records, rows = run_loops(solved, args.workers)
    n_pass = print_table(rows)
    if len(records) == 56:
        size = write_json(records)
        log(f"wrote {JSON_PATH} bytes={size} pass={n_pass}/56 wall={time.perf_counter() - t_wall:.1f}s")
    else:
        log(f"JSON not written, records={len(records)} wall={time.perf_counter() - t_wall:.1f}s")


if __name__ == "__main__":
    main()
