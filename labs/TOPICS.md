# Topic map

Each subject is one file, `web/<subject>.html`. Generated from `catalog.json` by `build.mjs`: edit the JSON, not this file.

## Analog electronics

| Topic | What you do | Status |
|---|---|---|
| Transistors: the device curves | Drag the operating point over the 3D I_C(V_BE, V_CE) surface; small-signal gain appears as the slope. | planned |
| Amplifier stages | Common emitter, emitter follower, differential pair: drag the bias and watch the signal swing, invert and clip. | planned |
| The CMOS inverter | Sweep the input: both transistors, the transfer curve, noise margins and the crowbar current. | planned |
| Op-amps and the virtual short | Drag the open-loop gain from 10 to 10⁶ and watch V+ − V− collapse to zero. | planned |

## Circuits

| Topic | What you do | Status |
|---|---|---|
| R, C, L and the diode | One component at a time: drive it, see voltage and current, and where the energy goes. | planned |
| Circuits as a potential landscape | Nodes lifted to their potential, carriers flowing downhill: Kirchhoff, Thévenin, superposition. | planned |
| RLC resonance with phasors | Phasors rotating in 3D and unrolling into waves; drag the frequency through resonance. | planned |
| Transmission lines and the Smith chart | Drag the load on a Smith chart; the standing wave on the line follows. | planned |
| From the feed to the antenna | Lengthen a line until it radiates: where the circuit stops being a circuit. | planned |

## Computer science

In the Algorithm Visualizer.

## Control systems

| Topic | What you do | Status |
|---|---|---|
| Step response from the poles | Drag first- and second-order poles; the step response, overshoot and settling time follow. | planned |
| The s-plane and the z-plane | Poles over a 3D |H(s)| surface; natural modes grow or decay with their position. | planned |
| System type and steady-state error | Step, ramp and parabola into type 0, 1 and 2 loops: which error survives. | planned |
| Root locus | Drag the gain: closed-loop poles slide along the locus over |G(s)|. | planned |
| Bode diagrams | Build a Bode plot pole by pole; asymptotes, corners and margins. | planned |
| The Nyquist criterion | The Nyquist curve lifted along log ω in 3D; count the encirclements of −1. | planned |
| The Nichols chart | Gain vs phase with M-circles; drag the gain and read the margins. | planned |
| Lead and lag compensators | Drop a lead or lag network into the loop; the locus and margins move. | planned |
| PID on an inverted pendulum | Tune Kp, Ki, Kd and push the pendulum; windup and noise included. | planned |

## Digital electronics

In the Electronics Visualizer.

## Electronic warfare

| Topic | What you do | Status |
|---|---|---|
| Radar pulses and the ambiguity function | Plain, chirp and Barker pulses; the matched filter and the 3D ambiguity surface. | planned |
| Range, Doppler and PRF | Targets in 3D airspace; the range–Doppler map and what a PRF folds. | planned |
| Radar receiver chain | RF to IQ baseband stage by stage, the spectrum at every step. | planned |
| PPI sweep and echoes | A rotating beam, echoes on a PPI scope, moving targets. | planned |
| Jamming and burn-through | Drag the aircraft, jammer and radar; J/S and burn-through range as live rings. | planned |

## Machine learning

| Topic | What you do | Status |
|---|---|---|
| A neuron is a plane, a layer is a fold | Drag a neuron's weights over 2D data lifted to 3D; ReLU layers fold the plane. | planned |
| Inside a convolution | Slide a filter over an image volume; stride, padding, dilation and channels. | planned |
| Loss landscapes and optimizers | SGD, momentum and Adam racing on a 3D loss surface. | planned |
| Bias, variance and model selection | Drag degree and regularization; fits fan out, train and test errors split. | planned |

## Maths

| Topic | What you do | Status |
|---|---|---|
| [Functions](web/maths.html?lab=functions) | Lines, parabolas, exponentials and logarithms: drag the graph, read the equation. | done |
| [Trigonometry](web/maths.html?lab=trigonometry) | A point on the unit circle: sine, cosine, tangent and the waves they make. | done |
| [Complex numbers](web/maths.html?lab=complex-numbers) | Sums, products, powers and roots as arrows in the plane. | done |
| [Vectors](web/maths.html?lab=vectors) | Dot and cross product of two arrows you drag in 3D. | done |
| [Calculus](web/maths.html?lab=calculus) | Derivative as a limit of slopes, integral as a limit of sums, Taylor polynomials. | done |
| [Matrices and linear maps](web/maths.html?lab=matrices) | A 3×3 matrix deforms the unit cube: determinant, eigenvectors. | done |
| [Functions of two variables](web/maths.html?lab=surfaces) | Walk on a surface: gradient, tangent plane, level curves. | done |
| [Divergence and curl](web/maths.html?lab=vector-calculus) | Tracers in a flow: spreading is divergence, turning is curl. | done |

## Physics

| Topic | What you do | Status |
|---|---|---|
| [Motion](web/physics.html?lab=kinematics) | Projectiles and circular motion: position, velocity, acceleration. | done |
| [Momentum and collisions](web/physics.html?lab=momentum) | Two carts collide: momentum always survives, kinetic energy not always. | done |
| [Forces and torque](web/physics.html?lab=forces) | Add forces tip to tail; turn a lever. | done |
| [Buoyancy](web/physics.html?lab=fluids) | A block in a liquid bobs and settles where buoyancy equals weight. | done |
| [Oscillations](web/physics.html?lab=oscillations) | Spring and pendulum: period, energy, damping and resonance. | done |
| [Gravitational field](web/physics.html?lab=gravity-field) | The field of two masses, arrow by arrow. | done |
| [Gas and heat](web/physics.html?lab=thermodynamics) | Atoms in a piston: pressure from impacts, heating, isothermal and adiabatic squeezes. | done |
| [Rays: refraction, lenses, mirrors](web/physics.html?lab=geometric-optics) | Snell’s law, total reflection and image formation. | done |
| [Interference](web/physics.html?lab=interference) | Two slits, two waves: bright and dark fringes. | done |
| [Electric charges](web/physics.html?lab=electrostatics) | Field lines, equipotentials and Gauss’s law for point charges. | done |
| [Magnetic field of currents](web/physics.html?lab=magnetic-field) | A loop and a solenoid: field lines, B on the axis. | done |
| [Electromagnetic induction](web/physics.html?lab=induction) | Move a magnet through a coil: flux, EMF, Lenz, magnetic braking. | done |
| [Charges in E and B](web/physics.html?lab=charged-particle) | Circles, helices and drifts of a charged particle. | done |
| [Electromagnetic waves](web/physics.html?lab=em-wave) | E and B travelling together; reflection and standing waves. | done |
| [Flight](web/physics.html?lab=flight) | Lift, drag, the stall and the flight envelope of a light aircraft. | done |
| [Orbits](web/physics.html?lab=orbits) | Kepler orbits around a turning Earth, ground tracks, J2. | done |
| [Orbital transfers](web/physics.html?lab=orbital-transfers) | Hohmann and bi-elliptic transfers, Δv and the rocket equation. | done |
| [Lagrange points](web/physics.html?lab=lagrange-points) | The rotating two-body potential and its five equilibria. | done |

## Signal theory

| Topic | What you do | Status |
|---|---|---|
| Signals in time and frequency | Pulses, sinc, chirp: the signal and its spectrum side by side, time–bandwidth. | planned |
| Fourier series as epicycles | Harmonics rebuild a waveform; the (t, Re, Im) helix and Gibbs. | planned |
| From the Fourier transform to the FFT | Winding a signal around the circle; DFT bins and the FFT butterfly. | planned |
| Sampling and aliasing | The spectrum wrapped on a cylinder of circumference fs: aliasing is literal folding. | planned |
| Convolution as a sliding area | Drag the shift; the product surface and its area trace the output. | planned |
| LTI systems | Impulse response, convolution, poles and the Bode plot of one system. | planned |
| Filtering in time and frequency | Shape a filter, watch the signal and its spectrum change together. | planned |
| Spectrum analysis | FFT bins, windows, frequency shifting and resampling. | planned |
| AM, FM and PM | The carrier as a 3D IQ helix; modulation index and spectra. | planned |
| Constellations and BER | BPSK, QPSK, QAM with noise; eye diagram and BER vs theory. | planned |
| IQ demodulation | Quadrature mixing, residual Δf spinning the constellation, FFT bins. | planned |
| Antennas and the link budget | Two antennas, Friis and two-ray path loss, planar arrays. | planned |
| Dipole antenna | 3D radiation pattern, near and far field, dipole length. | planned |
| Phased arrays | Drag elements and steering; 3D beam, grating lobes, phase vs true time delay. | planned |
| Vivaldi antenna | The tapered slot, its fields and its wideband pattern. | planned |
| Polarization | Helix, ellipse and a draggable point on the Poincaré sphere. | planned |
| Waveguides and coax | Modes in the cross-section, cutoff and dispersion. | planned |
