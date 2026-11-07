# Lunar triple pendulum

This folder builds closed-loop recordings of a cart that carries three rods on the Moon.
The input is cart acceleration. Gravity is 1.62 m/s^2.
A separate cart mass does not enter.

## Run

Use the virtual environment in this folder.

1. `python test_dynamics.py`
   This checks energy and the small-oscillation frequencies.
2. `python solve_all.py`
   This solves the 28 motions, builds the 56 feedback recordings, and writes `public/data/lunar-pendulum.json`.
3. `python verify.py`
   This checks the JSON file.

On Windows, call the interpreter by its full path:

`tools\lunar-pendulum\.venv\Scripts\python.exe tools\lunar-pendulum\solve_all.py`

A solved pair is stored in `cache/`. A later run continues from that cache.
The run writes progress to `cache/progress.log`.

## Method

Each rod is uniform. The center of mass is at mid-length.
The inertia about the center of mass is m l^2 / 12.
Angle zero is straight up. A positive angle is clockwise.
The model is the Lagrange equation of the three rods.
The same vector field is used in the optimizer and in the simulation.

With zero cart acceleration, cart speed is constant.
The total energy in the inertial frame that moves with the cart stays constant.
With a nonzero input, the lab-frame energy rate equals the generalized cart force times cart speed.

The feedforward is a Hermite-Simpson collocation problem.
The solver is IPOPT with MUMPS.
Time is free from 4 s to 20 s.
The cost is the integral of u squared, plus 0.5 times time.
The factor 0.5 is tuned up from 0.01 so the motions stay short.
A motion from A to B, run backward in time, is a motion from B to A.
Rates flip sign. The input value is copied.
Each link may wind by one or two extra turns.
The kept motion is the one with the lowest cost.
Eight transitions do not pass as one motion.
Each of those eight is two motions joined through an intermediate equilibrium.
The JSON field `via` names that equilibrium.
A direct transition has `via` set to null.

The feedback is a time-varying linear quadratic regulator on the 1 ms nominal.
The state weight starts from diag(30, 80, 80, 80, 3, 5, 5, 5).
The cart position weight is tuned to 200 and the cart speed weight is tuned to 25 so the hold ends inside 2 cm.
The regulator tries four weight sets, in this order: base, stiff, soft, tight.
The first set that passes is the one stored.
After the motion, a steady regulator holds the target for 2.5 s.
The plant is not the design model.
Each rod in the plant is 0.5 percent longer.
Each angle starts 0.3 deg off the nominal.
White noise of 0.05 m/s^2 is added to the input.
The input is clipped to ±8 m/s^2.
The controller updates at 200 Hz.

The playback file samples the closed-loop motion at 30 frames per second.
The file is about 604 KB.
Fifty-six recordings at 30 frames per second, with a 2.5 s hold, do not fit in 250 KB.

## References

- Glück, T., Eder, A., and Kugi, A. Swing-up control of a triple pendulum on a cart with experimental validation. Automatica, 49(3), 2013.
- Ju, D., Lee, T., and Lee, Y. S. Transition Control of a Rotary Double Inverted Pendulum Using Direct Collocation. Mathematics, 2025.
