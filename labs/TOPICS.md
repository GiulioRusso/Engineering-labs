# Topic map

Each topic is one file, `web/<topic>.html`. Generated from `catalog.json` by `build.mjs`: edit the JSON, not this file.

## Analog electronics

| Animation | What you do | Status |
|---|---|---|
| Transistors: the device curves | Drag the operating point over the 3D I_C(V_BE, V_CE) surface; small-signal gain appears as the slope. | planned |
| Amplifier stages | Common emitter, emitter follower, differential pair: drag the bias and watch the signal swing, invert and clip. | planned |
| The CMOS inverter | Sweep the input: both transistors, the transfer curve, noise margins and the crowbar current. | planned |
| Op-amps and the virtual short | Drag the open-loop gain from 10 to 10⁶ and watch V+ − V− collapse to zero. | planned |

## Circuits

| Animation | What you do | Status |
|---|---|---|
| R, C, L and the diode | One component at a time: drive it, see voltage and current, and where the energy goes. | planned |
| Circuits as a potential landscape | Nodes lifted to their potential, carriers flowing downhill: Kirchhoff, Thévenin, superposition. | planned |
| RLC resonance with phasors | Phasors rotating in 3D and unrolling into waves; drag the frequency through resonance. | planned |
| Transmission lines and the Smith chart | Drag the load on a Smith chart; the standing wave on the line follows. | planned |
| From the feed to the antenna | Lengthen a line until it radiates: where the circuit stops being a circuit. | planned |

## Computer science

In the Algorithm Visualizer.

## Control systems

| Animation | What you do | Status |
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

| Animation | What you do | Status |
|---|---|---|
| Radar pulses and the ambiguity function | Plain, chirp and Barker pulses; the matched filter and the 3D ambiguity surface. | planned |
| Range, Doppler and PRF | Targets in 3D airspace; the range–Doppler map and what a PRF folds. | planned |
| Radar receiver chain | RF to IQ baseband stage by stage, the spectrum at every step. | planned |
| PPI sweep and echoes | A rotating beam, echoes on a PPI scope, moving targets. | planned |
| Jamming and burn-through | Drag the aircraft, jammer and radar; J/S and burn-through range as live rings. | planned |

## Machine learning

| Animation | What you do | Status |
|---|---|---|
| A neuron is a plane, a layer is a fold | Drag a neuron's weights over 2D data lifted to 3D; ReLU layers fold the plane. | planned |
| Inside a convolution | Slide a filter over an image volume; stride, padding, dilation and channels. | planned |
| Loss landscapes and optimizers | SGD, momentum and Adam racing on a 3D loss surface. | planned |
| Bias, variance and model selection | Drag degree and regularization; fits fan out, train and test errors split. | planned |

## Maths

| Animation | What you do | Status |
|---|---|---|
| [Functions](web/maths.html?lab=function-explorer) | Linear, quadratic, exponential, logarithmic: drag the parameters, watch the graph and its key points. | done |
| [The unit circle](web/maths.html?lab=unit-circle) | A point on the circle unrolls into sine, cosine and tangent waves in 3D. | done |
| [Complex numbers](web/maths.html?lab=complex-plane) | Drag z and w; sums, products and powers as rotations and scalings. | done |
| [Derivative, integral, Taylor](web/maths.html?lab=calculus) | A tangent that slides, Riemann sums that converge, Taylor polynomials that hug. | done |
| [Linear maps on the unit cube](web/maths.html?lab=linear-maps) | Drag the matrix columns; the cube deforms, eigenvectors light up, det is the volume. | done |
| [Surfaces, gradient, div and curl](web/maths.html?lab=surfaces-gradient) | Drag a point on z = f(x, y): tangent plane, gradient, level curves. | done |

## Physics

| Animation | What you do | Status |
|---|---|---|
| [Motion, momentum and energy](web/physics.html?lab=motion-energy) | Trajectories with velocity and acceleration vectors, energy bars, circular motion. | done |
| [Forces and torque](web/physics.html?lab=forces-torque) | Drag forces on a body; resultant, torque, equilibrium and buoyancy. | done |
| [Vectors and vector fields](web/physics.html?lab=vector-fields) | Dot and cross product in 3D; divergence and curl of a field you can probe. | done |
| [Gas in a piston](web/physics.html?lab=gas-piston) | Particles in a 3D box, a P–V diagram linked, Carnot and Otto cycles. | done |
| [Optics bench](web/physics.html?lab=optics-bench) | Drag lenses and mirrors; rays, images and the double slit. | done |
| [Point charges](web/physics.html?lab=point-charges) | Drag charges in 3D; field lines and equipotential surfaces reshape live. | done |
| [Coil: magnetic field and induction](web/physics.html?lab=coil-induction) | Drag a magnet or a probe ring through a coil; flux, EMF and Lenz's law live. | done |
| [Charged particle in E and B](web/physics.html?lab=charged-particle) | Drag E and B; helix, cycloid and E×B drift. | done |
| [Electromagnetic wave and reflection](web/physics.html?lab=em-wave) | E and B travelling together, standing waves, Fresnel and Brewster. | done |
| [Flight: lift, drag, envelope](web/physics.html?lab=flight-envelope) | A 3D aircraft with its forces; drag polar, ISA and the V–n diagram. | done |
| [Orbits and ground tracks](web/physics.html?lab=orbits) | Drag i, Ω, ω; the ground track and J2 precession follow. | done |
| [Transfers and staging](web/physics.html?lab=orbital-transfers) | Hohmann, bi-elliptic and gravity assists with the Δv budget. | done |
| [Lagrange points](web/physics.html?lab=lagrange-points) | The rotating-frame potential as a 3D surface, five equilibria. | done |

## Signal theory

| Animation | What you do | Status |
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
