# Physics: split and deepen — execution plan

Plan for an executor model (Sonnet). Work phase by phase, top to bottom. Each phase ends green
(`npm test`, `npm run build`, `node tools/smoke.mjs physics` with 0 failures) before the next starts.
Stop and report after each phase; do not commit unless the user asks.

## 0. Read first

- `docs/GUIDE.md` sections "How the code is organised", "Writing a lab", "Testing". They are the contract.
- Reference labs to copy from:
  - 2D, animated: `src/physics/oscillations/lab.js`, `src/physics/motion-energy/lab.js`
  - 2D, static (`timeless: true`) with charts: `src/structural-mechanics/beams/lab.js`
  - animated with charts and `ctx.setClock`: `src/numerical-methods/odes/lab.js`
  - per-case static/animated switch: `src/structural-mechanics/materials/lab.js`
    (`ctx.setClock(state.case === 'mohr' ? 0 : 10)`)
- Seeded randomness: `src/lib/random.js`. Test helpers: `near`, `ok` from `src/lib/testing.js`.

### Hard rules

1. **Never rename or delete an existing topic id** in `catalog.json` (`kinematics`, `oscillations`,
   `waves`, `thermodynamics`, …). URLs and `web/media/<id>.png` depend on them. A split keeps the
   old id for the first piece and only changes its `title`/`what`/`cases`.
2. `model.js` is pure (no DOM, no three.js). Every new model has `model.test.js` that checks against an
   analytic result, a conservation law, or an independent method. Never a test that only re-runs the
   same formula.
3. Worked-example numbers in `explain.html` are computed by running the model in node, never by hand.
   Paste the command you used into your report.
4. Every case and every example needs its `explain.html` section (smoke fails otherwise). A case section
   is for a first-timer: `look`, plain-words paragraph, `eq`, `steps`, `worked`, `pitfall`, `try`.
   Example sections: 1–3 sentences.
5. Topics in `catalog.json` stay grouped: insert new topics next to the others of the same `group`.
   Write the file with `json.dumps(indent=1, ensure_ascii=False)` (same format as now).
6. Budget: `web/physics.html` is 1.2 MB now, limit 3 MB (build throws). Print the size after every
   new lab; if it passes 2.6 MB, stop and report.
7. After each phase: `node tools/capture.mjs physics --no-gif` to (re)make thumbnails, then look at the
   PNGs of the topics you touched (Read tool). Fix anything overlapping, clipped or empty.

### Known traps (learned the hard way in this repo)

- Chart line colour is fixed the first time a key is used: if a segment's colour changes, put the
  colour in the key.
- `chart.dots` does not filter NaN or out-of-range points: filter before passing.
- Static cases inside an animated lab: `ctx.setClock(0)`, else a useless play bar shows.
- Do not allocate keys/arrays into a `Set` every frame (unbounded growth); use a `Map` keyed by string.
- Label pools: get labels once in `setup` (`ctx.label('', 'tick')`), hide unused ones; never create
  labels in `update`.
- Example `set` is applied on top of the case `set`. When moving an example into a new case, fold the
  old case's `set` into the new case's `set`.
- Restructuring cases breaks old deep links (`#case/example`). Accepted; mention it in the report.

## 1. Current state

19 topics from 14 labs. Several topics pack 3–6 ideas into one entry:

| Topic id | Lab | Packs together |
|---|---|---|
| kinematics | motion-energy `projectile`,`circular` | projectiles, circular motion |
| forces | forces-torque `sum`,`torque` | vector sum, torque |
| oscillations | oscillations `spring`,`pendulum` | SHM, damping, resonance, nonlinear pendulum |
| waves | waves (4 cases) | travelling, superposition, standing, Doppler |
| thermodynamics | gas-piston (1 case, 7 examples) | kinetic theory, heating, isothermal, adiabatic |
| electrostatics | point-charges (1 case, 8 examples) | single charge, dipole, like charges, quadrupole, Gauss |
| induction | coil-induction `magnet`,`ac` | moving magnet, braking, AC |
| charged-particle | charged-particle (1 case, 11 examples) | cyclotron, helix, E×B drift, E∥B |
| geometric-optics | optics-bench `snell`,`lens`,`mirror` | refraction, TIR, lenses, mirrors |
| orbits | orbits (1 case, 10 examples) | Kepler orbits, inclination, ground tracks, J2 |
| flight | flight-envelope (1 case, 9 examples) | lift/drag, turns, stall |

Missing entirely: work and energy, Newton's laws with friction, rotation/rolling, coupled oscillators,
heat engines, heat conduction, diffraction, and all of modern physics.

## Phase A — catalog-only splits (no code)

The cases already exist; only `catalog.json` changes. For each row: edit the existing topic, add the
new ones right after it. All `from` values are the physics lab folder name.

| Existing id → new title, cases | New topics (id · title · from · cases) |
|---|---|
| `kinematics` → "Projectile motion", `["projectile"]` | `circular-motion` · Circular motion · motion-energy · `["circular"]` |
| `forces` → "Adding forces", `["sum"]` | `torque` · Torque · forces-torque · `["torque"]` |
| `waves` → "Travelling waves", `["travel"]` | `superposition` · Superposition and beats · waves · `["super"]`; `standing-waves` · Standing waves · waves · `["standing"]`; `doppler` · Doppler effect and shock waves · waves · `["doppler"]` |
| `induction` → "Moving magnet and Lenz's law", `["magnet"]` | `ac-induction` · AC induction · coil-induction · `["ac"]` |
| `geometric-optics` → "Refraction and total reflection", `["snell"]` | `lenses` · Thin lenses · optics-bench · `["lens"]`; `mirrors` · Curved mirrors · optics-bench · `["mirror"]` |

Write a fresh `what` (one sentence, same tone as existing ones) for each changed or new topic. Check
the explain sections of each case read well standalone (the drawer now shows only that case); if a
section says "see above" or refers to another case, rewrite that sentence.

Done when: build + smoke green, new thumbnails captured and checked, `docs/TOPICS.md` regenerated.

## Phase B — split single-case labs into cases

Here a lab has one case with many examples. Promote groups of examples to cases, then split topics as
in Phase A. Rules: the new case's `set` = old case `set` + the example's `set` it was built from; the
remaining examples keep their ids where possible; write a full first-timer case section for each new
case (the old example section is a starting point, not enough).

### B1. oscillations

| Case | Built from | Examples |
|---|---|---|
| `spring` (keep) | — | `heavy`, `stiff`, `wide` |
| `damped` (new) | `light` | `light`→ becomes the case; examples `critical`, `over` |
| `driven` (new) | `resonance` | `above`, `sharp`, new `below` (wd = 1: in phase, amplitude ≈ F0/k) |
| `pendulum` (keep) | — | `long`, `heavy`, `big`, `top`, `damped`, `pushed` |

New in `driven`: aux plot = steady amplitude vs drive frequency (use `steadyAmplitude`), marker at the
current `wd`; HUD shows phase lag `atan2(2γω, ω0²−ω²)` in degrees. Add a test: phase lag at resonance
= 90° (±0.5°) measured from the simulation after transients.

Catalog: `oscillations` → "Simple harmonic motion", `["spring"]`; new `damping` · Damped oscillations ·
`["damped"]`; `resonance` · Driven oscillations and resonance · `["driven"]`; `pendulum` · The pendulum ·
`["pendulum"]`. All group "Waves and oscillations".

### B2. gas-piston

| Case | Built from | Examples |
|---|---|---|
| `gas` (keep) | — | `more`, `cold` (heating at fixed volume) |
| `isothermal` (new) | `iso-half` | `iso-quarter`, `hand` |
| `adiabatic` (new) | `adi-half` | `adi-quarter` |

New in `gas` case: aux plot = histogram of particle speeds vs the Maxwell–Boltzmann curve
in the dimension `model.js` simulates (check it): 3D `f(v) = 4π (m/2πkT)^{3/2} v² e^{−mv²/2kT}`,
2D `f(v) = (m v / kT) e^{−mv²/2kT}`. Test: the model's long-run speed histogram matches f(v) (mean speed within 3 %).

New in `isothermal`/`adiabatic`: aux plot = P–V path with the other process drawn dashed for
comparison. Test: area under the isothermal path = nRT ln(V1/V2) (numeric trapz vs formula, 1e-4).

Catalog: `thermodynamics` → "Kinetic theory of gases", `["gas"]`; new `gas-processes` · Isothermal and
adiabatic processes · gas-piston · `["isothermal","adiabatic"]`. Group "Heat".

### B3. charged-particle

| Case | Built from | Examples |
|---|---|---|
| `particle` (keep, cyclotron) | — | `strong-b`, `speed`, `anti`, `electron` |
| `helix` (new) | `helix` | `shallow` |
| `drift` (new) | `drift` | `pair`, `strong-e` |
| `parallel` (new) | `along` | `brake` |

Catalog: `charged-particle` → "Cyclotron motion", `["particle","helix"]`; new `exb-drift` · E×B drift ·
`["drift","parallel"]`.

### B4. orbits

| Case | Built from | Examples |
|---|---|---|
| `orbit` (keep) | — | `high`, `geo`, `ellipse`, `molniya` |
| `inclined` (new) | `iss` | `polar`, `retro` |
| `j2` (new) | `sso` | `sso-off`, `iss-j2` |

Catalog: `orbits` → "Kepler orbits", `["orbit"]`; new `ground-tracks` · Inclination and ground tracks ·
`["inclined"]`; `orbit-perturbations` · Earth's bulge (J2) · `["j2"]`. Group "Flight and space".

### B5. point-charges

| Case | Built from | Examples |
|---|---|---|
| `charges` (keep) | — | `neg`, `big` |
| `pair` (new) | `pair` | `like`, `unequal`, `close` |
| `many` (new) | `four` | `same` |

Add `gauss` as its own case if the Gauss sphere toggle is enough to drive one (look at the lab): set
the sphere on, show flux vs sphere radius in the aux plot with steps where it crosses a charge. Test:
flux·ε₀ equals enclosed charge for three radii (1e-4; the guide says this is already tested; reuse).

Catalog: `electrostatics` → "Field of a point charge", `["charges"]`; new `dipole` · Dipoles and
charge pairs · `["pair","many"]`; `gauss-law` · Gauss's law · `["gauss"]` (only if the case exists).

### B6. flight-envelope (optional, do last)

Cases `flight` (`slow`, `fast`, `high`), `turn` from `b30` (`b60`, `slowturn`), `stall` from `stall`
(`before`, `neg`). Catalog: `flight` → "Lift and drag"; new `turns` · Turning flight and load factor;
`stall` · The stall.

## Phase C — new labs

Ordered by value. Each is one folder `src/physics/<lab>/` with the four files. Layout default: the
`createChart` boxes used in the newer labs, SQ = [-4.6,-2.35,4.6,4.6] for the main drawing,
TR = [1.0,0.55,3.5,1.9] and BR = [1.0,-2.35,3.5,1.9] for charts, plus the `aux` plot and three HUD rows
(copy from `src/numerical-methods/odes/lab.js`). Topic ids differ from folder names, so every new
topic needs `"from": "<folder>"` plus its `cases`.

### C1. `energy-track`: work and energy (group Mechanics)

Topics: `work-energy` · Work and energy · `["ramp","loop"]`; `friction-energy` · Friction turns
energy into heat · `["friction"]`.

Model: a bead on a 2D track y(x), state (s, v) along the arc length. Tracks: `ramp` (incline into a
flat), `valley` (parabola), `loop` (ramp into a vertical circle of radius R). Equation:
`dv/dt = −g sinθ − μ·N/m·sign(v)`, with `N/m = g cosθ + v²κ` (κ signed curvature). On the loop, if
N < 0 the bead leaves the track: switch to projectile motion. RK4, fixed dt. Return energies KE, PE,
heat (∫μN|v|dt) per step.

Tests: frictionless total energy constant (relative drift < 1e-6 over 10 s); loop from h = 2.5R
completes, h = 2.4R detaches (N < 0) before the top; ramp θ then flat with μ: distance on the flat
= h(1 − μ cotθ)/μ (1e-3); KE + PE + heat constant with friction (1e-6).

Lab: track and bead in SQ; TR energy bars (KE, PE, heat) as stems; BR energies vs time. Cases:
`ramp` (examples: `higher` start, `steeper` same height → same final speed), `loop` (`just` h = 2.5R,
`short` h = 2.2R falls), `friction` (`mu02` μ = 0.2, `valley` oscillation dying out).

### C2. `incline`: Newton's laws and friction (group Mechanics)

Topic: `newtons-laws` · Newton's laws and friction · `["incline","pulley"]`.

Model: block mass m on an incline θ, μs, μk; optional hanging mass M over a pulley at the top.
`accel(p)`: if at rest and |net driving force| ≤ μs·N → 0 (static, return the friction needed), else
kinetic. Free-body forces as vectors for drawing.

Tests: no pulley, starts sliding exactly at tanθ = μs (bisection on θ, 1e-6); kinetic a = g(sinθ −
μk cosθ); Atwood (θ = 90° hanging, frictionless) a = (M − m)g/(M + m); static friction never exceeds
μs·N.

Lab: static per case (`ctx.setClock(0)`) except when sliding; draw incline, block, force arrows
(weight, normal, friction, tension) labelled with values. TR: acceleration vs θ with the stick/slip
threshold marked. Cases: `incline` (`below` stays, `above` slides, `steep`), `pulley` (`balanced`,
`heavy` pulls up).

### C3. `rotation`: rotation and rolling (group Mechanics)

Topics: `rolling` · Rolling and moment of inertia · `["rolling","spool"]`; `angular-momentum` ·
Angular momentum · `["spin"]`.

Model: `I(shape, M, R)` for hoop, disc, solid sphere, hollow sphere; rolling without slipping
`a = g sinθ / (1 + I/MR²)`; spool with falling mass `a = mg/(m + I/r²)`; spinning skater:
L = Iω constant, KE = L²/2I.

Tests: the four accelerations against the closed forms; an energy check (mgh = ½Mv² + ½Iω² at the
bottom, 1e-9); race order sphere > disc > hollow sphere > hoop; skater KE ratio = I₁/I₂.

Lab: `rolling` race of the four shapes side by side on parallel inclines (rotating spokes so rolling is
visible), BR position vs time; `spool` falling mass; `spin` top view of a skater (two masses on arms,
slider for arm radius animates in), TR ω and KE vs time. Examples: `mass` (double M: same race),
`hoop-disc`, `arms-in` (ω × 3).

### C4. `heat-engine`: heat engines (group Heat)

Topics: `heat-engines` · Heat engines and efficiency · `["carnot","otto"]`; `entropy-ts` · Entropy and
the T–S diagram · `["ts"]`.

Model: ideal monatomic gas, n = 1 mol. A cycle = list of legs {type: isothermal | adiabatic |
isochoric | isobaric, to: state}. Per leg: sampled (V, P, T, S) path, W, Q, ΔU. Cycles: Carnot(Th, Tc,
V ratio), Otto(r, T1, heat added), Stirling optional.

Tests: Carnot η = 1 − Tc/Th (1e-9); Otto η = 1 − r^(1−γ); over a cycle ΔU = 0 and ΔS = 0 (1e-9);
W_net = shoelace area of the sampled P–V loop (1e-3) = Q_in − Q_out.

Lab: point moving around the cycle; SQ P–V diagram with legs coloured by heat in (red) / out (blue);
piston drawing in TR; BR T–S diagram (`ts` case makes it the main view). HUD: W, Q_in, η vs Carnot.
Examples: `hotter` Th up, `close` Th ≈ Tc (η → 0), `r10` Otto r = 10.

### C5. `coupled`: coupled oscillators (group Waves and oscillations)

Topics: `coupled-oscillators` · Coupled oscillators · `["two"]`; `normal-modes` · Normal modes of a
chain · `["chain"]`.

Model: N masses, springs k to the walls and κ between them (N = 2 for `two`, up to 12 for `chain`).
Exact solution by modes: build the stiffness matrix, eigen-decompose (Jacobi, symmetric, small N),
project the initial state.

Tests: N = 2 frequencies √(k/m) and √((k+2κ)/m); chain frequencies 2√(κ/m)|sin(nπ/2(N+1))| for k = κ
(1e-9); total energy constant; beat period 2π/(ω₂ − ω₁) from the simulation (1e-3).

Lab: masses and springs drawn in a row; BR displacements vs time; TR mode spectrum (stems at each ωₙ,
height = mode energy). Examples: `mode1` both in phase, `mode2` opposite, `beats` one mass pulled
(energy swaps), `weak` small κ (slow swaps), `chain-n3` third mode of 8 masses.

### C6. `diffraction`: diffraction and gratings (group Optics)

Topics: `diffraction` · Single-slit diffraction · `["single","phasor"]`; `grating` · Diffraction
gratings · `["grating"]`.

Model: single slit I(θ) = I₀ sinc²(β), β = πa sinθ/λ; N slits × (sin Nφ / N sin φ)², φ = πd sinθ/λ;
phasor sum of M Huygens sources (independent method); grating resolving power R = mN.

Tests: closed forms vs the phasor sum with M = 2000 sources (1e-4); first zero at sinθ = λ/a;
principal maxima at d sinθ = mλ; N−2 secondary maxima between principal ones (count peaks).

Lab: `timeless`. SQ: intensity on a screen as a colour strip in the wavelength's colour plus the
I(θ) curve; TR: phasor chain for the angle under a slider (the chain curling into a circle at the first
zero is the key picture); BR for `grating`: N = 2, 5, 20 overlaid. Examples: `wide` slit, `narrow`,
`first-zero` (phasor closes), `n20`, `two-lines` (two close wavelengths resolved or not).

### C7. `heat-conduction`: heat conduction (group Heat)

Topic: `heat-conduction` · Heat conduction · `["rod","pulse","composite"]`.

Model: 1D rod, explicit FTCS with substeps so r = αΔt/Δx² ≤ 0.4, Dirichlet or insulated ends, per-cell
α (two materials). Steady state of a composite rod analytic (series thermal resistances).

Tests: steady state linear for one material (1e-6); composite interface temperature vs the resistance
formula (1e-3); insulated ends conserve total heat (1e-9); Gaussian pulse variance grows as σ₀² + 2αt
(1e-2).

Lab: rod coloured by temperature (colormap from `lib/viz/colormap.js`); BR T(x) now with steady state
dashed; HUD heat flux q = −k dT/dx at both ends. Cases `rod` (hot left, cold right), `pulse`
(insulated, spreads), `composite` (copper + wood: steep gradient in the wood).

### C8. Modern physics (new group "Modern physics", after "Flight and space")

Create the group with C8a. No icon or hue changes (those are per subject, not per group).

**C8a. `relativity`**: topics `time-dilation` · Time dilation and the light clock · `["clock","twins"]`;
`spacetime` · Spacetime diagrams · `["minkowski"]`.
Model: γ(β), Lorentz transform of events, interval, velocity addition, twin proper times (piecewise
worldline). Tests: interval invariant under random boosts (1e-12); velocity addition < c and two
boosts = one boost with added velocity; twin ages for β = 0.8, 10 years out: 20 vs 12 years.
Lab: light clock moving vs at rest; Minkowski diagram with boosted axes (slider β), events A, B showing
simultaneity flip; twins worldlines with ticks per year.

**C8b. `quantum`**: topics `photoelectric` · The photoelectric effect · `["photo"]`; `particle-in-a-box`
· Particle in a box · `["box"]`; `atomic-spectra` · Hydrogen spectrum · `["bohr"]`.
Model: K_max = hf − φ (metals table: Na 2.28 eV, Zn 4.33, Cu 4.7 — verify values, cite the source in a
comment); infinite well ψₙ, Eₙ = n²h²/8mL², superposition time evolution; Bohr Eₙ = −13.6/n² eV,
lines 1/λ = R(1/n₁² − 1/n₂²).
Tests: ψₙ normalised and orthogonal (numeric, 1e-6); Hα = 656.3 nm (±0.2, uses the reduced mass
Rydberg or state the vacuum/air difference); photo threshold f₀ = φ/h; stopping voltage slope = h/e.
Lab: `photo` K_max vs f lines for several metals with the slider frequency; `box` |ψ|² animated for a
1+2 superposition (sloshing), energy ladder in TR; `bohr` level diagram with transitions and the
spectrum strip in true colours.

**C8c. `decay`**: topic `radioactive-decay` · Radioactive decay · `["decay","chain"]`.
Model: grid of N = 400 nuclei, each decays with probability 1 − e^{−λΔt} per step (seeded
`lib/random.js`); parent → daughter chain with Bateman solution.
Tests: Bateman vs RK4 of the ODEs (1e-8); Monte Carlo mean count at t = T½ within 3σ of N/2 (fixed
seed); secular equilibrium activity ratio → 1.
Lab: grid of dots that change colour on decay; BR N(t) noisy vs e^{−λt}; examples `half-life` (marks
at each T½), `small-n` (N = 20: noise dominates), `chain-secular`, `chain-transient`.

## Phase D — wrap up

1. `README.md`: update the Physics row (topic count) in the Subjects table.
2. `docs/GUIDE.md`: append the new tests to the "Testing" list (one line each, with tolerances).
3. Full run: `npm test`, `npm run build`, `node tools/smoke.mjs` (all subjects, 0 failures; confirms
   the catalogue links every topic), `node tools/capture.mjs physics --no-gif`.
4. Check every other `web/<subject>.html` is byte-identical to before (`git status web/`): only
   `physics.html`, `index.html`, `docs/TOPICS.md`, and new/changed `web/media/*.png` should change.
5. Report: topics before/after (19 → ~45), `web/physics.html` size, test count, anything skipped.

## Expected topic list after all phases

Mechanics: kinematics (Projectile motion), circular-motion, forces (Adding forces), torque,
newtons-laws, work-energy, friction-energy, momentum, rolling, angular-momentum, fluids.
Waves and oscillations: oscillations (SHM), damping, resonance, pendulum, coupled-oscillators,
normal-modes, waves (Travelling), superposition, standing-waves, doppler.
Heat: thermodynamics (Kinetic theory), gas-processes, heat-engines, entropy-ts, heat-conduction.
Electromagnetism: electrostatics (Point charge), dipole, gauss-law, magnetic-field, induction,
ac-induction, charged-particle (Cyclotron), exb-drift, em-wave.
Optics: geometric-optics (Refraction), lenses, mirrors, interference, diffraction, grating.
Flight and space: flight (Lift and drag), turns, stall, gravity-field, orbits (Kepler), ground-tracks,
orbit-perturbations, orbital-transfers, lagrange-points.
Modern physics: time-dilation, spacetime, photoelectric, particle-in-a-box, atomic-spectra,
radioactive-decay.
