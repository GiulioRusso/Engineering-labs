# Labs — topic map

39 labs, one self-contained HTML page each, rebuilt from the physics up. The notebooks in `notebooks/` are
background reading only. Discrete CS and digital logic are left out: the two existing visualizers already
cover them.

Each entry lists what the reader drags and sees, the questions the lab answers, the classic misconception it
provokes and then resolves, the analytic checks its model tests must pass, and an effort estimate
(**S** ≈ 1–2 days, **M** ≈ 3–5 days, **L** ≈ 1–2 weeks, assuming the shared lib already exists).

## Build order

Ordered so each lab reuses components from the ones before it. The **adds** column is the new `labs/src/lib/`
component a lab introduces; everything else comes from earlier labs.

| # | id | Area | Effort | Adds to lib | Status |
|---|---|---|---|---|---|
| 1 | `coil-induction` | Electromagnetism | L | the whole lib: stage, handles, panel, plots, HUD, explain, tour, URL state, theme; field lines, particle advection, arrow grid, slice plane; exact loop / axisymmetric-stack physics | done |
| 2 | `point-charges` | Electromagnetism | M | marching-cubes iso-surface (equipotentials); Web Worker helper if the 3D potential grid exceeds 8 ms | todo |
| 3 | `charged-particle-eb` | Electromagnetism | M | `integrators` (RK4, Verlet, Boris), trajectory trail | todo |
| 4 | `forces-motion` | Mechanics | S | vector-tip handles with snapping | todo |
| 5 | `orbits` | Space | L | globe + ground track, angle handles (i, Ω, ω) | todo |
| 6 | `orbital-transfers` | Space | M | manoeuvre timeline (Δv events on the time plot) | todo |
| 7 | `lagrange-points` | Space | M | `surface`: height-field mesh with colormap and contour lines | todo |
| 8 | `gyroscope` | Mechanics | M | rigid-body mesh with body-axes triad, quaternion state | todo |
| 9 | `flight-dynamics` | Mechanics | M | — | todo |
| 10 | `thermodynamics` | Thermal | M | particle box (instanced spheres, wall collisions, histogram plot) | todo |
| 11 | `plane-wave` | Electromagnetism | M | `wave-train`: E/B glyphs along an axis, animated by phase | todo |
| 12 | `polarization` | Electromagnetism | M | sphere-point handle (Poincaré sphere) | todo |
| 13 | `dipole-antenna` | Antennas | L | `pattern`: 3D radiation pattern mesh r = f(θ, φ), polar-cut plot | todo |
| 14 | `phased-array` | Antennas | L | uv heat map plot | todo |
| 15 | `waveguide-coax` | Electromagnetism | L | cross-section mode viewer (slice plane locked to a guide) | todo |
| 16 | `optics` | Optics | M | ray tracer (rays as Line2, refraction at surfaces) | todo |
| 17 | `fourier-epicycles` | Signals | M | `helix`: (t, Re, Im) 3D signal view with 2D projections | todo |
| 18 | `sampling-aliasing` | Signals | M | spectrum plot with replicas | todo |
| 19 | `convolution` | Signals | M | — | todo |
| 20 | `s-plane` | Signals / control | M | pole/zero handles on the complex plane | todo |
| 21 | `rlc-phasors` | Circuits | M | — | todo |
| 22 | `circuit-landscape` | Circuits | M | schematic-on-the-floor renderer (wires, components, carriers) | todo |
| 23 | `transmission-line` | Circuits | M | Smith chart plot | todo |
| 24 | `transistor-amplifier` | Electronics | M | — | todo |
| 25 | `opamp-feedback` | Electronics | M | — | todo |
| 26 | `root-locus` | Control | L | locus tracer (root continuation over gain) | todo |
| 27 | `frequency-response` | Control | M | Nyquist / Nichols plots | todo |
| 28 | `pid-control` | Control | L | controller block (P, I, D terms with windup clamp) | todo |
| 29 | `modulation-iq` | Signals | M | constellation plot, eye diagram | todo |
| 30 | `iq-receiver` | Signals / EW | M | signal-chain strip (block diagram linked to spectra) | todo |
| 31 | `radar-pulses` | Electronic warfare | L | — | todo |
| 32 | `range-doppler` | Electronic warfare | M | PPI scope plot | todo |
| 33 | `ew-engagement` | Electronic warfare | M | airspace scene (terrain plane, aircraft glyphs) | todo |
| 34 | `linear-maps` | Maths | M | — | todo |
| 35 | `surfaces-calculus` | Maths | M | — | todo |
| 36 | `complex-functions` | Maths | M | domain-colouring shader | todo |
| 37 | `loss-landscapes` | Machine learning | M | — | todo |
| 38 | `neuron-layers` | Machine learning | M | — | todo |
| 39 | `generalization` | Machine learning | S | — | todo |

Totals: 2 S, 29 M, 8 L.

---

## Electromagnetism

### 1. `coil-induction` — Coil: magnetic field and induction · L
*Source notebooks:* physics/electromagnetism, circuits/circuits_components.
- **Drag / see:** drag a bar magnet or a probe loop along and across the axis of a finite solenoid. The B field
  lines and flowing particles update, and Φ(t), EMF(t) and I_ind(t) are traced live on the plots. The
  induced current's own field appears around the probe loop and visibly opposes the change.
- **Questions:** Why is the field uniform inside a long solenoid and weak outside? What changes when the coil
  is short? Which way does the induced current flow? Why is there no EMF when the magnet is held still? Why
  is the moving magnet slowed down?
- **Misconception:** "a strong field induces a big EMF". The *Magnet held still inside the coil* scenario
  shows maximum flux and zero EMF.
- **Checks:** on-axis field of one loop μ0·I·R²/(2(R²+z²)^{3/2}) within 0.1 %; long-solenoid centre field
  μ0·n·I within 1 %; finite-solenoid on-axis formula
  (μ0nI/2)·[(z+L/2)/√((z+L/2)²+R²) − (z−L/2)/√((z−L/2)²+R²)]; ∇·B ≈ 0 on a sample grid; dipole far field
  ∝ 1/r³; EMF equals −dΦ/dt by finite difference; Lenz sign (induced moment antiparallel to dΦ/dt); force on
  the magnet opposes its velocity.

### 2. `point-charges` — Point charges: field lines and equipotentials · M
*Source:* physics/electromagnetism (Coulomb, dipole).
- **Drag / see:** drag point charges in 3D and change their sign and size. Field lines (count ∝ |q|) and
  equipotential iso-surfaces reshape live, with a slice plane showing V.
- **Questions:** Why do field lines never cross? Why are equipotentials perpendicular to field lines? What
  does a dipole look like from far away? Where is the field zero between two equal charges?
- **Misconception:** "field lines are paths that a charge follows". The *Release a test charge* scenario shows
  a charge with mass leaving the line.
- **Checks:** Coulomb force and superposition; Gauss's law (flux through a closed sphere = Q_enc/ε0 within
  0.5 %); ∮E·dl ≈ 0; dipole far-field potential p·cosθ/(4πε0r²); E = −∇V by finite difference.

### 3. `charged-particle-eb` — Charged particle in E and B · M
*Source:* physics/electromagnetism (Lorentz force).
- **Drag / see:** drag the tips of the E and B vectors and the particle's initial velocity. The trajectory
  draws as a helix, a cycloid, or a drift. A magnetic-mirror scenario uses a coil pair from lab 1.
- **Questions:** Why does a magnetic field do no work? What sets the radius and frequency of the circle? Why
  do crossed E and B fields make the particle drift sideways? Why do positive and negative charges drift the
  same way?
- **Misconception:** "the particle moves along E". In *Crossed fields* the drift is perpendicular to E.
- **Checks:** cyclotron frequency |q|B/m; Larmor radius mv⊥/(|q|B); E×B drift velocity E×B/B², independent of
  q and m; kinetic energy conserved in pure B to round-off (Boris); magnetic moment μ adiabatic invariant in
  the mirror within 1 %.

### 11. `plane-wave` — Electromagnetic plane wave and reflection · M
*Source:* physics/electromagnetism (EM wave, reflection), physics/optics.
- **Drag / see:** a train of E and B glyphs travels along z. Drag a dielectric or conductor interface into its
  path and drag the incidence angle: reflected and transmitted waves, a standing wave, and Fresnel R and T
  curves are linked.
- **Questions:** Why are E and B perpendicular to each other and to the direction of travel? What carries the
  energy? Where are the nodes of a standing wave in front of a mirror? Why does reflection vanish at the
  Brewster angle?
- **Misconception:** "E and B are 90° out of phase in a travelling wave". The *Freeze time* scenario shows they
  peak together.
- **Checks:** |E|/|B| = c; E ⟂ B ⟂ k; time-averaged Poynting E0²/(2η0); Fresnel R + T = 1; Brewster
  tan θB = n2/n1; critical angle for total internal reflection; nodes every λ/2 from a perfect conductor.

### 12. `polarization` — Polarization: helix, ellipse, Poincaré sphere · M
*Source:* signal-theory/electromagnetic_polarization.
- **Drag / see:** drag a point on the Poincaré sphere. The E-field helix along z, the polarization ellipse,
  and the Jones and Stokes readouts all follow. Drop in waveplates and polarizers.
- **Questions:** What does circular polarization look like in space and in time? How does a quarter-wave plate
  turn linear into circular? Why do two crossed polarizers block everything, and why does a third one at 45°
  let light through?
- **Misconception:** the snapshot helix in space has the opposite handedness to the rotation seen at a fixed
  point. The *Space vs time* scenario shows both side by side.
- **Checks:** S0² = S1² + S2² + S3² for fully polarized light; waveplate Jones matrices unitary; Malus's law
  cos²θ; a QWP at 45° maps linear to circular; orthogonal states are antipodal on the sphere.

### 13. `dipole-antenna` — Dipole antenna: near field, far field, pattern · L
*Source:* signal-theory/dipole, signal-theory/antenna_propagation, circuits/circuits_antenna.
- **Drag / see:** drag the dipole length from short to 1.5λ and drag an observation point around it. The 3D
  radiation doughnut, the E/H field slice, and the near-to-far transition are shown. A two-antenna *Friis
  link* scenario adds a receiver.
- **Questions:** Why doesn't a dipole radiate along its axis? Where does the near field end? Why is a
  half-wave dipole the usual choice? How much power reaches a receiving antenna at distance r?
- **Misconception:** "an antenna radiates equally in every direction". The *Sit on the axis* scenario shows
  zero.
- **Checks:** Hertzian pattern sin²θ with directivity 1.5; half-wave directivity 1.64 and R_rad ≈ 73.1 Ω;
  short-dipole R_rad = 80π²(l/λ)²; far-field |E|/|H| = η0 ≈ 376.7 Ω; reactive 1/r³ term equals radiative 1/r
  term at kr = 1; Friis equation; free-space path loss 20·log10(4πr/λ).

### 15. `waveguide-coax` — Waveguides and coax: modes and cutoff · L
*Source:* signal-theory/guided_wave_propagation, circuits/circuits_telecom.
- **Drag / see:** drag the frequency past cutoff and drag the guide width. The cross-section shows the mode's
  E and H, and the wave along z slows down, stretches, and stops below cutoff. A coax scenario shows TEM
  with no cutoff.
- **Questions:** Why does a hollow pipe have a cutoff frequency and a coax not? What does TE10 look like? Why
  can the phase velocity exceed c? What sets the impedance of a coax?
- **Misconception:** "the phase velocity faster than c means information travels faster than light". The
  *Two velocities* scenario tracks a crest and a pulse envelope separately.
- **Checks:** TE10 cutoff c/(2a); β = √(k² − kc²); vp·vg = c²; coax Z0 = (η0/(2π√εr))·ln(b/a); tangential E = 0
  on the walls; modal field divergence-free.

### 16. `optics` — Rays and waves: refraction, lenses, interference · M
*Source:* physics/optics.
- **Drag / see:** drag a lens, a mirror, an object and the light source. Rays refract and form images. A
  double-slit scenario switches to wavefronts with a linked intensity plot on the screen.
- **Questions:** Why does a straw look bent in water? Where does the image form, and when is it virtual? Why
  does a prism split white light? Where do the bright fringes fall?
- **Misconception:** "covering half the lens cuts off half the image". The *Cover the lens* scenario dims the
  whole image.
- **Checks:** Snell's law; critical angle; thin-lens 1/f = 1/do + 1/di and magnification −di/do; mirror f = R/2;
  fringe spacing λL/d; Cauchy dispersion ordering (blue bends more).

## Mechanics and space

### 4. `forces-motion` — Forces, torque and motion · S
*Source:* physics/forces, physics/motion, physics/vector_operations.
- **Drag / see:** drag force vectors applied to a body, drag a launch vector for a projectile (with and
  without drag), and drop a body into a fluid. Trajectory, energy bars and torque are linked.
- **Questions:** Why does a projectile go furthest at 45° (and not with air drag)? When does a body spin
  instead of slide? Why does a ship float?
- **Misconception:** "heavier objects fall faster". *Vacuum vs air* separates gravity from drag.
- **Checks:** drag-free range v²·sin2θ/g; terminal velocity √(2mg/(ρCdA)); work–energy theorem (drag work
  equals energy lost); τ = r × F and the right-hand rule; Archimedes buoyancy ρ_f·V·g; centripetal v²/r.

### 5. `orbits` — Orbits: elements, ground tracks, J2 · L
*Source:* physics/orbital_mechanics.
- **Drag / see:** drag handles for i, Ω and ω on the orbit, and drag a, e on the HUD. The satellite orbits
  a rotating Earth, the ground track is linked on a 2D map, and J2 precession can be switched on.
- **Questions:** What do the six orbital elements mean geometrically? Why does the ground track shift west each
  orbit? Why is a sun-synchronous orbit retrograde? Why is a geostationary orbit at one altitude only?
- **Misconception:** "to catch up with a satellite ahead, speed up". The *Rendezvous* scenario shows
  that burning prograde raises the orbit and slows you down.
- **Checks:** Kepler III T = 2π√(a³/μ); vis-viva; energy and angular-momentum drift < 1e-8 relative over 100
  orbits (symplectic Verlet); J2 nodal regression −(3/2)·n·J2·(Re/p)²·cos i; sun-synchronous inclination
  ≈ 98° at 700 km; ground-track shift ωE·T per orbit.

### 6. `orbital-transfers` — Transfers, staging and gravity assists · M
*Source:* physics/orbital_mechanics, physics/rocket_science.
- **Drag / see:** drag the burn points and Δv vectors on a transfer between two orbits. Hohmann, bi-elliptic
  and gravity-assist scenarios show the Δv budget on the time plot and the rocket equation in a staging bar.
- **Questions:** Why is Hohmann the cheapest two-burn transfer? When does going further out first save fuel?
  How does a flyby speed up a spacecraft for free? Why do rockets have stages?
- **Misconception:** "a gravity assist is free energy". The *Planet frame* view shows |v∞| unchanged.
- **Checks:** Hohmann Δv analytic; bi-elliptic beats Hohmann above r2/r1 ≈ 11.94; Tsiolkovsky
  Δv = ve·ln(m0/mf); |v∞| conserved in the planet frame; patched-conic energy bookkeeping.

### 7. `lagrange-points` — Lagrange points in the rotating frame · M
*Source:* physics/orbital_mechanics.
- **Drag / see:** drag the mass ratio and a test body. The effective potential is shown as a 3D surface with
  its five equilibria, and a trajectory runs in the rotating frame.
- **Questions:** Why are there five equilibrium points? Why are L4 and L5 stable when they sit on a hill? Why is
  JWST at L2? What is the Jacobi constant?
- **Misconception:** "L1 is where the two gravities are equal". The *Ignore rotation* toggle shows the wrong
  point.
- **Checks:** L4/L5 at equilateral triangles; L1 distance ≈ a·(μ/3)^{1/3} for small μ; Jacobi constant
  conserved within the integrator budget; L4 linearly stable iff μ < 0.0385 (Routh).

### 8. `gyroscope` — Rigid bodies and gyroscopic precession · M
*Source:* physics/motion (angular momentum).
- **Drag / see:** drag the spin rate and the tilt of a top, or flick a free rigid body about each principal
  axis. The L, ω and τ vectors are drawn, and the precession and nutation traces are plotted.
- **Questions:** Why does a spinning top not fall over? Why does precession get slower as the spin gets faster?
  Why is rotation about the intermediate axis unstable?
- **Misconception:** "the top moves in the direction the torque pushes". The *Torque vs motion* scenario
  shows L moving along τ, sideways.
- **Checks:** fast-top precession rate Ω = m·g·r/(I3·ω); torque-free energy and |L| conserved; intermediate-
  axis instability growth rate from the Euler equations; nutation frequency ≈ I3·ω/I1.

### 9. `flight-dynamics` — Flight: lift, drag and the flight envelope · M
*Source:* physics/flight_dynamics.
- **Drag / see:** drag the angle of attack, the altitude and the airspeed of a 3D aircraft. Lift, drag,
  thrust and weight vectors are drawn, and the drag polar, ISA profile and V-n diagram are linked.
- **Questions:** Where does lift come from? Why is there a speed of minimum drag? How far can a plane glide?
  Why does stall speed rise in a turn?
- **Misconception:** "equal transit time over the wing". The *Particle race* scenario shows the top air
  arriving first.
- **Checks:** thin-airfoil CL = 2πα; ISA T = 288.15 − 0.0065·h and the pressure profile; (L/D)max where
  CD0 = k·CL²; best glide tan γ = 1/(L/D)max; stall boundary n = ½ρV²S·CLmax/W.

### 10. `thermodynamics` — Gas in a piston: kinetic theory to cycles · M
*Source:* physics/thermodynamics.
- **Drag / see:** drag the piston and the heat source. Particles bounce in a 3D box, and the P–V diagram,
  speed histogram and energy bars are linked. Cycle scenarios include Carnot and Otto.
- **Questions:** What is pressure, microscopically? Why does a gas heat up when compressed with no heat added?
  Why does no engine beat Carnot?
- **Misconception:** "temperature and heat are the same thing". *Adiabatic compression* raises T with
  Q = 0.
- **Checks:** pressure from wall momentum flux = NkT/V within the statistical error; Maxwell–Boltzmann speed
  distribution (χ² test); adiabatic PV^γ = const; isothermal work nRT·ln(V2/V1); first law ΔU = Q − W; Carnot
  η = 1 − Tc/Th.

## Signals and antennas

### 14. `phased-array` — Phased arrays: steering and grating lobes · L
*Source:* signal-theory/phased_array, signal-theory/antenna_propagation, electronic-warfare/phased_array_animation.
- **Drag / see:** drag the elements apart and drag the steering angle. The wavefronts, the 3D beam and the
  grating lobes are shown, with a uv heat map for planar arrays and taper and phase-vs-true-time-delay toggles.
- **Questions:** How does a phase gradient steer a beam? Why does the beam widen when steered? Where do grating
  lobes come from? Why does a phase-steered beam squint with frequency?
- **Misconception:** "wider spacing is always better, since it gives a bigger aperture". The *Spread the
  elements* scenario shows grating lobes appear.
- **Checks:** uniform linear array factor analytic; grating lobes for d/λ ≥ 1/(1+|sin θ0|); HPBW
  ≈ 0.886·λ/(N·d·cos θ0); first sidelobe −13.26 dB uniform; true time delay squint-free; peak directivity ∝ N.

### 17. `fourier-epicycles` — Fourier: epicycles and the 3D helix · M
*Source:* signal-theory/fourier, signal-theory/fourier_dft_fft, signal-theory/signals.
- **Drag / see:** drag harmonic amplitudes and phases (or draw a waveform). Epicycles rebuild it, and the
  (t, Re, Im) helix shows each component, with time and frequency projections and windowing for leakage.
- **Questions:** How can sinusoids add up to a square wave? What is a negative frequency? Why does the overshoot
  never go away? Why does a sinusoid spread over many DFT bins?
- **Misconception:** "negative frequencies are a mathematical artefact". The *Real signal* scenario shows two
  counter-rotating helices.
- **Checks:** square-wave coefficients 4/(πk) for odd k; Gibbs overshoot ≈ 8.95 % of the jump; Parseval;
  FFT equals naive DFT to 1e-12; integer-bin sinusoid in one bin; Hann ENBW = 1.5 bins.

### 18. `sampling-aliasing` — Sampling and aliasing · M
*Source:* signal-theory/sampling, signal-theory/signal_analysis.
- **Drag / see:** drag the sampling rate and the signal frequency. The spectrum is wrapped onto a cylinder of
  circumference fs, so folding is literal, and reconstruction is shown in time.
- **Questions:** Why does a wheel spin backwards on video? Why 2× the highest frequency? What do the spectral
  replicas mean? Why do we need an anti-aliasing filter?
- **Misconception:** "sampling at exactly 2f is enough". *Sample at 2f* lands on zero crossings.
- **Checks:** alias frequency |f − k·fs| folded into [0, fs/2]; sinc reconstruction exact for a bandlimited
  signal; replica spacing fs; Gaussian-pulse replica overlap vs fs.

### 19. `convolution` — Convolution as a sliding area · M
*Source:* signal-theory/convolution, signal-theory/lti_response.
- **Drag / see:** drag the shift t and drag the shapes of x and h. The surface x(τ)·h(t − τ) over (τ, t) is
  shown, its area traces y(t), and impulse-response examples are included.
- **Questions:** Why flip h? Why is rect ∗ rect a triangle? Why does an LTI system's output equal the input
  convolved with h? Why is convolution multiplication in frequency?
- **Misconception:** forgetting the flip. The *Asymmetric h* scenario shows the wrong answer next to the
  right one.
- **Checks:** rect ∗ rect = triangle; Gaussian variances add; commutativity; δ is the identity; direct
  convolution equals FFT convolution.

### 20. `s-plane` — The s-plane: poles, zeros and |H(s)| · M
*Source:* signal-theory/lti_response, control-systems/stability, control-systems/response.
- **Drag / see:** drag poles and zeros on the complex plane. The |H(s)| surface rises above it, the jω-axis cut
  is the Bode plot, and the impulse and step responses are linked. A z-plane toggle is included.
- **Questions:** What does a pole *do* to the response? Why does the left half-plane mean stable? How does pole
  position set overshoot and settling time? How does the s-plane map onto the z-plane?
- **Misconception:** "a pole is where the system blows up". *Stable pole* shows infinite |H| at a point the
  system never visits.
- **Checks:** impulse response from residues vs RK4 ODE integration; −20 dB/decade per pole and −3 dB at the
  corner; final-value theorem; stability iff Re(p) < 0; z = e^{sT} maps the left half-plane inside the unit
  circle.

### 29. `modulation-iq` — Modulation: AM, FM, PM, QAM · M
*Source:* signal-theory/signal_modulation, signal-theory/digital_comms.
- **Drag / see:** drag the modulation index, the carrier and the noise. The 3D IQ helix and the 2D
  constellation are linked, along with the spectrum, eye diagram and live BER vs theory.
- **Questions:** What do AM, FM and PM do to the carrier? Why does FM need more bandwidth? Why does QPSK carry
  twice the bits of BPSK at the same BER per bit? What does noise do to a constellation?
- **Misconception:** "FM and PM are fundamentally different". *PM of the integral* overlays them.
- **Checks:** Carson bandwidth 2(Δf + fm); AM sideband power m²/4 of carrier each; BPSK BER Q(√(2Eb/N0)) vs
  Monte Carlo within a 95 % CI; QPSK per-bit BER equals BPSK; Gray mapping neighbours differ by one bit.

### 30. `iq-receiver` — The IQ receiver chain · M
*Source:* signal-theory/iq_demodulation, electronic-warfare/radar_receivers.
- **Drag / see:** drag the LO frequency and the filter bandwidths along a superheterodyne / direct-conversion
  chain. The spectrum at every stage and the IQ phasor are linked, and the residual Δf makes the constellation
  spin.
- **Questions:** Why two mixers (I and Q)? Where does the image frequency come from? Why does a small frequency
  offset rotate the constellation? When does a pulse land in one FFT bin, and when does it spread?
- **Misconception:** "one mixer is enough". *I only* loses the sign of the frequency.
- **Checks:** mixer products f_RF ± f_LO; image at f_LO ∓ f_IF; I² + Q² = envelope; rotation rate 2π·Δf;
  bin spreading when Δf·T is not an integer.

## Circuits and electronics

### 21. `rlc-phasors` — RLC resonance with rotating phasors · M
*Source:* circuits/circuits_ac, circuits/circuits_components.
- **Drag / see:** drag R, L, C and the source frequency. The V_R, V_L and V_C phasors rotate in 3D and unroll
  into time-domain helices, with resonance curves and power linked.
- **Questions:** What is a phasor really? Why are the inductor and capacitor voltages opposite? What happens at
  resonance? What is Q?
- **Misconception:** "at resonance the L and C voltages are small". *Resonance* shows them at Q × the source.
- **Checks:** ω0 = 1/√(LC); series Q = (1/R)·√(L/C); bandwidth ω0/Q; KVL phasor sum equals the source; mean
  power ½·V·I·cos φ; RK4 transient converges to the phasor steady state.

### 22. `circuit-landscape` — Circuits as a potential landscape · M
*Source:* circuits/circuits_theory, circuits/circuits_components.
- **Drag / see:** the schematic lies on the floor with each node lifted to a height equal to its potential.
  Charge carriers flow downhill through resistors. Drag component values and add or remove sources.
- **Questions:** What do Kirchhoff's laws mean physically? Why is any network equivalent to a Thévenin source?
  How does superposition work? Where is the power dissipated?
- **Misconception:** "resistors use up current". The *Follow the carriers* scenario shows the same current in
  and out.
- **Checks:** KCL at every node to round-off; Tellegen power balance; Thévenin equivalent matches at the port;
  superposition; voltage and current dividers.

### 23. `transmission-line` — Transmission lines and the Smith chart · M
*Source:* circuits/circuits_telecom, signal-theory/guided_wave_propagation.
- **Drag / see:** drag the load impedance on a Smith chart and drag the line length. The standing wave along a
  3D line, the forward and reflected waves and the input impedance are linked. A quarter-wave matching
  scenario is included.
- **Questions:** Why does a mismatched line have standing waves? What does VSWR measure? How does a
  quarter-wave section match a load? Why does line length matter?
- **Misconception:** "reflections only matter at very high frequency". *Long cable, slow edge* shows when they
  matter.
- **Checks:** Γ = (ZL − Z0)/(ZL + Z0); VSWR = (1 + |Γ|)/(1 − |Γ|); quarter-wave Zin = Z0²/ZL; Zin periodic
  in λ/2; forward − reflected power = delivered power; Smith chart point equals the computed Γ.

### 24. `transistor-amplifier` — Transistors as amplifiers · M
*Source:* analog-electronics/electronics_devices, analog-electronics/electronics_amplifiers.
- **Drag / see:** drag the operating point on the 3D I_C(V_BE, V_CE) surface (BJT or MOSFET) and drag the load
  line. A small input sine swings through the curve, and the output waveform shows gain and clipping.
- **Questions:** Why does a transistor need biasing? Where does gain come from? Why does the output clip? What
  is transconductance?
- **Misconception:** "the transistor makes power from nothing". The *Power bars* scenario shows the supply
  paying for it.
- **Checks:** Shockley exponential (60 mV/decade); gm = Ic/VT; MOSFET square law and gm = 2·Id/Vov; Early
  ro = VA/Ic; CE gain −gm·(Rc ∥ ro); Newton DC solution lies on the load line.

### 25. `opamp-feedback` — Op-amps and the virtual short · M
*Source:* analog-electronics/electronics_opamps.
- **Drag / see:** drag the open-loop gain from 10 to 10⁶ and drag the feedback ratio. V+ − V− shrinks toward
  zero, and gain–bandwidth, slew-rate and phase-margin scenarios are linked.
- **Questions:** Why does the gain depend only on two resistors? What is the virtual short? Why is there a
  gain–bandwidth trade-off? Why can a feedback amplifier ring?
- **Misconception:** "the inputs draw current to make V+ = V−". The *Open the loop* scenario shows that
  feedback, not the inputs, makes the short.
- **Checks:** closed-loop A/(1 + Aβ) → 1/β; constant gain–bandwidth product; full-power bandwidth
  SR/(2π·Vp); two-pole loop: phase margin vs step overshoot; output offset = input offset × noise gain.

## Control

### 26. `root-locus` — Root locus on the |G(s)| surface · L
*Source:* control-systems/root_locus, control-systems/corrective_network.
- **Drag / see:** drag open-loop poles, zeros and the gain on the 3D |G(s)| surface. The closed-loop poles
  slide along the locus, and the step response is linked. Lead and lag compensator scenarios are included.
- **Questions:** Where do closed-loop poles go as gain grows? Why does the locus start at poles and end at
  zeros? How does a zero pull the locus left? How do I place poles for a given overshoot?
- **Misconception:** "more gain is always faster and better". *Crank the gain* goes unstable.
- **Checks:** angle condition on every locus point; asymptote centroid and angles; breakaway at dK/ds = 0;
  second-order overshoot exp(−ζπ/√(1 − ζ²)); closed-loop poles equal eigenvalues of the state matrix.

### 27. `frequency-response` — Bode, Nyquist and Nichols, linked · M
*Source:* control-systems/bode, control-systems/nyquist, control-systems/nichols.
- **Drag / see:** drag poles, zeros, gain and time delay. The Nyquist curve is drawn in 3D, lifted along log ω,
  and it projects onto Nyquist, Bode and Nichols, with margins marked on all three.
- **Questions:** Why does encircling −1 mean unstable? What do gain and phase margin mean on each plot? Why does
  a time delay destabilise? Why is Nichols handy for design?
- **Misconception:** "positive phase margin means stable". *Conditionally stable* breaks it.
- **Checks:** GM and PM identical across the three views; Nyquist Z = N + P vs closed-loop poles; delay e^{−sT}
  adds phase −ωT and leaves the magnitude unchanged; Bode asymptotes.

### 28. `pid-control` — PID on an inverted pendulum · L
*Source:* control-systems/PID, control-systems/steady_state_error.
- **Drag / see:** drag Kp, Ki, Kd and push the cart-pole (or drone) with the mouse. The closed-loop poles on
  the s-plane and the error and effort plots are linked.
- **Questions:** What does each PID term do? Why does integral action remove steady-state error? Why does too
  much derivative amplify noise? What is integrator windup?
- **Misconception:** "more integral removes error faster". The *Windup* scenario overshoots wildly.
- **Checks:** linearised poles vs numerical Jacobian eigenvalues; type-1 zero step error and ramp error 1/Kv;
  final-value theorem; free-pendulum energy drift within the RK4 budget.

## Electronic warfare

All content textbook-level (Skolnik, Richards, Adamy).

### 31. `radar-pulses` — Radar pulses and the ambiguity function · L
*Source:* electronic-warfare/radar_pulses, electronic-warfare/radar_systems.
- **Drag / see:** drag the pulse type (plain, LFM, Barker), bandwidth and duration, and drag two targets in
  range and Doppler. The matched-filter output and the 3D ambiguity surface are linked.
- **Questions:** Why does a long pulse resolve targets poorly, and how does a chirp fix it? What is pulse
  compression? Why does a chirp couple range and Doppler? Why does a phase code fail with Doppler?
- **Misconception:** "a longer pulse always means worse range resolution". *Compressed long pulse* shows
  otherwise.
- **Checks:** matched-filter peak equals signal energy; compression ratio BT; range resolution c/(2B);
  Barker-13 peak sidelobe −22.3 dB; ambiguity volume conserved (Moyal) numerically; LFM ridge slope B/T.

### 32. `range-doppler` — Range, Doppler and the PRF trade-off · M
*Source:* electronic-warfare/radar_systems, electronic-warfare/radar_visualizations.
- **Drag / see:** drag targets in a 3D airspace and drag the PRF and pulse count. The PPI sweep and the
  range–Doppler map are linked, with ambiguous targets folding.
- **Questions:** How does a radar measure distance and speed? Why can't one PRF do both well? Where do blind
  speeds come from? Why does signal fall as 1/R⁴?
- **Misconception:** "higher PRF is always better". *Fast PRF* folds range.
- **Checks:** R_unamb = c/(2·PRF); fD = 2v/λ; unambiguous velocity ±λ·PRF/4; radar equation SNR ∝ 1/R⁴; coherent
  integration gain N.

### 33. `ew-engagement` — Jamming and burn-through · M
*Source:* electronic-warfare/EW_scenarios.
- **Drag / see:** drag an aircraft, a stand-off jammer and the radar in a 3D airspace. J/S, detection range and
  burn-through are drawn as live range rings.
- **Questions:** Why does a jammer win at long range and lose up close? What is burn-through? Why can an ESM
  receiver hear a radar before the radar sees it? Why do sidelobes matter for stand-off jamming?
- **Misconception:** "more jammer power always wins". The *Close in* scenario reaches burn-through.
- **Checks:** radar equation; self-screening J/S ∝ R² (Pj·Gj·4π·R² / (Pt·Gt·σ)); burn-through range solves
  J/S = threshold; one-way (ESM) vs two-way range advantage.

## Maths

### 34. `linear-maps` — Linear maps on the unit cube · M
*Source:* maths/linear_algebra.
- **Drag / see:** drag the three column vectors of a 3×3 matrix. The unit cube deforms, eigenvectors light
  up when they stay on their own line, and the determinant equals the volume.
- **Questions:** What does a matrix *do* to space? What is an eigenvector? Why is the determinant a volume? When
  is a matrix not invertible?
- **Misconception:** "every matrix has three real eigenvectors". The *Rotation* scenario has one.
- **Checks:** det equals the signed volume of the image cube; A·v = λ·v; rotation orthogonal with det 1; SVD
  reconstructs A; complex eigenvalue pair for rotations.

### 35. `surfaces-calculus` — Surfaces: gradient, tangent plane, Taylor · M
*Source:* maths/multivariable_calculus, maths/calculus, maths/functions.
- **Drag / see:** drag a point on a surface z = f(x, y). The tangent plane, gradient arrow and level curves are
  drawn, and Taylor approximations build up around the point. A div/curl scenario uses vector fields.
- **Questions:** Why is the gradient perpendicular to level curves? What is the tangent plane? How good is a
  Taylor approximation and where does it fail? What do divergence and curl measure?
- **Misconception:** "the gradient points along the contour". The *Hiker* scenario shows steepest ascent.
- **Checks:** analytic vs finite-difference gradient; tangent-plane error O(h²); Taylor remainder order;
  divergence theorem and Stokes' theorem numerically; double integrals vs analytic.

### 36. `complex-functions` — Complex functions: domain colouring and |f| · M
*Source:* maths/complex_numbers, maths/trigonometry.
- **Drag / see:** drag zeros and poles of f(z) and drag a closed contour. Domain colouring and the 3D |f|
  surface are shown, with the winding count live. A unit-circle scenario unrolls e^{iθ} into sin and cos.
- **Questions:** What does complex multiplication do geometrically? Why does e^{iθ} give sine and cosine? What
  does it mean that analytic maps preserve angles? How does a contour count zeros?
- **Misconception:** "|f| shows everything". *Same |f|, different phase* needs colour.
- **Checks:** argument principle (zeros − poles inside the contour); conformal angle preservation; |e^{iθ}| = 1;
  multiplication equals rotate-and-scale; trig identities on the unit circle.

## Machine learning

### 37. `loss-landscapes` — Loss landscapes and optimizers · M
*Source:* machine-learning/loss_functions, machine-learning/ml_basics.
- **Drag / see:** drag the starting point and the learning rate on a 3D loss surface. SGD, momentum and Adam
  trajectories race, and the loss is plotted vs step. Loss-function scenarios (MSE, MAE, Huber, CE) are
  included.
- **Questions:** Why does a large learning rate diverge? What does momentum fix? Why does cross-entropy beat
  squared error for classifiers? Why are ravines slow?
- **Misconception:** "a smaller learning rate is always safer". The *Plateau* scenario stalls.
- **Checks:** GD on a quadratic contracts by (1 − ηλ) and diverges for η > 2/λmax; momentum heavy-ball rate;
  Adam bias correction; analytic vs finite-difference gradients; logistic CE convex in w.

### 38. `neuron-layers` — A neuron is a plane, a layer is a fold · M
*Source:* machine-learning/ml_basics, machine-learning/layers_visualized.
- **Drag / see:** drag the weights of a neuron, and its decision plane tilts over 2D data lifted to 3D. Add a
  ReLU layer and watch it fold the plane. A conv scenario slides a filter over an image volume.
- **Questions:** Why can't one neuron solve XOR? What does a hidden layer do geometrically? Why are
  nonlinearities essential? What do stride, padding and dilation do to the output shape?
- **Misconception:** "stacking linear layers adds power". *Remove ReLU* collapses to one plane.
- **Checks:** decision boundary w·x + b = 0; XOR separable with one hidden layer; backprop gradient check;
  conv output size ⌊(n + 2p − d(k − 1) − 1)/s⌋ + 1; parameter counts.

### 39. `generalization` — Bias, variance and model selection · S
*Source:* machine-learning/generalization_and_model_selection.
- **Drag / see:** drag the polynomial degree and the regularization λ, and resample the data. The fits fan out,
  and the train and test error curves and the bias²–variance split are linked.
- **Questions:** Why does training error keep falling while test error rises? What does regularization buy?
  How does cross-validation pick d and λ?
- **Misconception:** "lower training error means a better model". The *Degree 15* scenario shows otherwise.
- **Checks:** ridge closed form; bias² + variance + noise equals Monte Carlo test MSE within CI; training error
  monotone in degree; k-fold CV estimator.
