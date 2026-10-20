# Topic map

Every original notebook and its animations, grouped like `legacy/notebooks/`. Each topic is one file,
`web/<topic>.html`. Generated from `catalog.json` by `build.mjs`: edit the JSON, not this file.

## Analog electronics

| Notebook | Animation | What you do | Status |
|---|---|---|---|
| `electronics_devices` | Transistors: the device curves | Drag the operating point over the 3D I_C(V_BE, V_CE) surface; small-signal gain appears as the slope. | planned |
| `electronics_amplifiers` | Amplifier stages | Common emitter, emitter follower, differential pair: drag the bias and watch the signal swing, invert and clip. | planned |
| `electronics_digital` | The CMOS inverter | Sweep the input: both transistors, the transfer curve, noise margins and the crowbar current. | planned |
| `electronics_opamps` | Op-amps and the virtual short | Drag the open-loop gain from 10 to 10⁶ and watch V+ − V− collapse to zero. | planned |

## Circuits

| Notebook | Animation | What you do | Status |
|---|---|---|---|
| `circuits_components` | R, C, L and the diode | One component at a time: drive it, see voltage and current, and where the energy goes. | planned |
| `circuits_theory` | Circuits as a potential landscape | Nodes lifted to their potential, carriers flowing downhill: Kirchhoff, Thévenin, superposition. | planned |
| `circuits_ac` | RLC resonance with phasors | Phasors rotating in 3D and unrolling into waves; drag the frequency through resonance. | planned |
| `circuits_telecom` | Transmission lines and the Smith chart | Drag the load on a Smith chart; the standing wave on the line follows. | planned |
| `circuits_antenna` | From the feed to the antenna | Lengthen a line until it radiates: where the circuit stops being a circuit. | planned |

## Computer science

| Notebook | Animation | What you do | Status |
|---|---|---|---|
| `big_o` | Algorithm Visualizer | — | covered |
| `arrays` | Algorithm Visualizer | — | covered |
| `stack_queue` | Algorithm Visualizer | — | covered |
| `linked_lists` | Algorithm Visualizer | — | covered |
| `trees` | Algorithm Visualizer | — | covered |
| `bst` | Algorithm Visualizer | — | covered |
| `heaps` | Algorithm Visualizer | — | covered |
| `graphs_traversal` | Algorithm Visualizer | — | covered |
| `graphs_shortest_paths` | Algorithm Visualizer | — | covered |
| `scheduling` | Algorithm Visualizer | — | covered |
| `synchronization` | Algorithm Visualizer | — | covered |

## Control systems

| Notebook | Animation | What you do | Status |
|---|---|---|---|
| `response` | Step response from the poles | Drag first- and second-order poles; the step response, overshoot and settling time follow. | planned |
| `stability` | The s-plane and the z-plane | Poles over a 3D |H(s)| surface; natural modes grow or decay with their position. | planned |
| `steady_state_error` | System type and steady-state error | Step, ramp and parabola into type 0, 1 and 2 loops: which error survives. | planned |
| `root_locus` | Root locus | Drag the gain: closed-loop poles slide along the locus over |G(s)|. | planned |
| `bode` | Bode diagrams | Build a Bode plot pole by pole; asymptotes, corners and margins. | planned |
| `nyquist` | The Nyquist criterion | The Nyquist curve lifted along log ω in 3D; count the encirclements of −1. | planned |
| `nichols` | The Nichols chart | Gain vs phase with M-circles; drag the gain and read the margins. | planned |
| `corrective_network` | Lead and lag compensators | Drop a lead or lag network into the loop; the locus and margins move. | planned |
| `pid` | PID on an inverted pendulum | Tune Kp, Ki, Kd and push the pendulum; windup and noise included. | planned |

## Digital electronics

| Notebook | Animation | What you do | Status |
|---|---|---|---|
| `logic_gates` | Electronics Visualizer | — | covered |
| `combinational_adders` | Electronics Visualizer | — | covered |
| `latches` | Electronics Visualizer | — | covered |
| `flipflops` | Electronics Visualizer | — | covered |
| `counters` | Electronics Visualizer | — | covered |
| `fsm` | Electronics Visualizer | — | covered |
| `msi_combinational` | Electronics Visualizer | — | planned (in the visualizer) |
| `registers` | Electronics Visualizer | — | planned (in the visualizer) |
| `alu` | Electronics Visualizer | — | planned (in the visualizer) |
| `memory` | Electronics Visualizer | — | planned (in the visualizer) |

## Electronic warfare

| Notebook | Animation | What you do | Status |
|---|---|---|---|
| `radar_pulses` | Radar pulses and the ambiguity function | Plain, chirp and Barker pulses; the matched filter and the 3D ambiguity surface. | planned |
| `radar_systems` | Range, Doppler and PRF | Targets in 3D airspace; the range–Doppler map and what a PRF folds. | planned |
| `radar_receivers` | Radar receiver chain | RF to IQ baseband stage by stage, the spectrum at every step. | planned |
| `radar_visualizations` | PPI sweep and echoes | A rotating beam, echoes on a PPI scope, moving targets. | planned |
| `ew_scenarios` | Jamming and burn-through | Drag the aircraft, jammer and radar; J/S and burn-through range as live rings. | planned |

## Machine learning

| Notebook | Animation | What you do | Status |
|---|---|---|---|
| `ml_basics` | A neuron is a plane, a layer is a fold | Drag a neuron's weights over 2D data lifted to 3D; ReLU layers fold the plane. | planned |
| `layers_visualized` | Inside a convolution | Slide a filter over an image volume; stride, padding, dilation and channels. | planned |
| `loss_functions` | Loss landscapes and optimizers | SGD, momentum and Adam racing on a 3D loss surface. | planned |
| `generalization_and_model_selection` | Bias, variance and model selection | Drag degree and regularization; fits fan out, train and test errors split. | planned |

## Maths

| Notebook | Animation | What you do | Status |
|---|---|---|---|
| `functions` | [Functions](web/maths.html?lab=function-explorer) | Linear, quadratic, exponential, logarithmic: drag the parameters, watch the graph and its key points. | done |
| `trigonometry` | [The unit circle](web/maths.html?lab=unit-circle) | A point on the circle unrolls into sine, cosine and tangent waves in 3D. | done |
| `complex_numbers` | [Complex numbers](web/maths.html?lab=complex-plane) | Drag z and w; sums, products and powers as rotations and scalings. | done |
| `calculus` | [Derivative, integral, Taylor](web/maths.html?lab=calculus) | A tangent that slides, Riemann sums that converge, Taylor polynomials that hug. | done |
| `linear_algebra` | [Linear maps on the unit cube](web/maths.html?lab=linear-maps) | Drag the matrix columns; the cube deforms, eigenvectors light up, det is the volume. | done |
| `multivariable_calculus` | [Surfaces, gradient, div and curl](web/maths.html?lab=surfaces-gradient) | Drag a point on z = f(x, y): tangent plane, gradient, level curves. | done |

## Physics

| Notebook | Animation | What you do | Status |
|---|---|---|---|
| `motion` | [Motion, momentum and energy](web/physics.html?lab=motion-energy) | Trajectories with velocity and acceleration vectors, energy bars, circular motion. | done |
| `forces` | [Forces and torque](web/physics.html?lab=forces-torque) | Drag forces on a body; resultant, torque, equilibrium and buoyancy. | done |
| `vector_operations` | [Vectors and vector fields](web/physics.html?lab=vector-fields) | Dot and cross product in 3D; divergence and curl of a field you can probe. | done |
| `electromagnetism` | [Coil: magnetic field and induction](web/physics.html?lab=coil-induction) | Drag a magnet or a probe ring through a coil; flux, EMF and Lenz's law live. | done |
| `electromagnetism` | [Point charges](web/physics.html?lab=point-charges) | Drag charges in 3D; field lines and equipotential surfaces reshape live. | done |
| `electromagnetism` | [Charged particle in E and B](web/physics.html?lab=charged-particle) | Drag E and B; helix, cycloid and E×B drift. | done |
| `electromagnetism` | [Electromagnetic wave and reflection](web/physics.html?lab=em-wave) | E and B travelling together, standing waves, Fresnel and Brewster. | done |
| `optics` | [Optics bench](web/physics.html?lab=optics-bench) | Drag lenses and mirrors; rays, images and the double slit. | done |
| `thermodynamics` | [Gas in a piston](web/physics.html?lab=gas-piston) | Particles in a 3D box, a P–V diagram linked, Carnot and Otto cycles. | done |
| `flight_dynamics` | [Flight: lift, drag, envelope](web/physics.html?lab=flight-envelope) | A 3D aircraft with its forces; drag polar, ISA and the V–n diagram. | done |
| `orbital_mechanics` | [Orbits and ground tracks](web/physics.html?lab=orbits) | Drag i, Ω, ω; the ground track and J2 precession follow. | done |
| `orbital_mechanics` | [Lagrange points](web/physics.html?lab=lagrange-points) | The rotating-frame potential as a 3D surface, five equilibria. | done |
| `rocket_science` | [Transfers and staging](web/physics.html?lab=orbital-transfers) | Hohmann, bi-elliptic and gravity assists with the Δv budget. | done |

## Signal theory

| Notebook | Animation | What you do | Status |
|---|---|---|---|
| `signals` | Signals in time and frequency | Pulses, sinc, chirp: the signal and its spectrum side by side, time–bandwidth. | planned |
| `fourier` | Fourier series as epicycles | Harmonics rebuild a waveform; the (t, Re, Im) helix and Gibbs. | planned |
| `fourier_dft_fft` | From the Fourier transform to the FFT | Winding a signal around the circle; DFT bins and the FFT butterfly. | planned |
| `sampling` | Sampling and aliasing | The spectrum wrapped on a cylinder of circumference fs: aliasing is literal folding. | planned |
| `convolution` | Convolution as a sliding area | Drag the shift; the product surface and its area trace the output. | planned |
| `lti_response` | LTI systems | Impulse response, convolution, poles and the Bode plot of one system. | planned |
| `signal_filtering` | Filtering in time and frequency | Shape a filter, watch the signal and its spectrum change together. | planned |
| `signal_analysis` | Spectrum analysis | FFT bins, windows, frequency shifting and resampling. | planned |
| `signal_modulation` | AM, FM and PM | The carrier as a 3D IQ helix; modulation index and spectra. | planned |
| `digital_comms` | Constellations and BER | BPSK, QPSK, QAM with noise; eye diagram and BER vs theory. | planned |
| `iq_demodulation` | IQ demodulation | Quadrature mixing, residual Δf spinning the constellation, FFT bins. | planned |
| `antenna_propagation` | Antennas and the link budget | Two antennas, Friis and two-ray path loss, planar arrays. | planned |
| `dipole` | Dipole antenna | 3D radiation pattern, near and far field, dipole length. | planned |
| `phased_array` | Phased arrays | Drag elements and steering; 3D beam, grating lobes, phase vs true time delay. | planned |
| `vivaldi` | Vivaldi antenna | The tapered slot, its fields and its wideband pattern. | planned |
| `electromagnetic_polarization` | Polarization | Helix, ellipse and a draggable point on the Poincaré sphere. | planned |
| `guided_wave_propagation` | Waveguides and coax | Modes in the cross-section, cutoff and dispersion. | planned |
