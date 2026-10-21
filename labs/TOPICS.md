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
| [Time response](web/control-systems.html?lab=time-response) | First- and second-order systems: time constant, damping, overshoot, settling. | done |
| [Poles and stability](web/control-systems.html?lab=poles) | Poles over the 3D |G(s)| surface: left half plane decays, right half plane grows. | done |
| [Feedback and steady-state error](web/control-systems.html?lab=steady-state-error) | Close the loop: step and ramp into type 0, 1 and 2 systems, which error survives. | done |
| [Root locus](web/control-systems.html?lab=root-locus) | Raise the gain: the closed-loop poles slide along the locus. | done |
| [PID control](web/control-systems.html?lab=pid) | A motor holds a rod upright: tune Kp, Ki, Kd, then push it, load it and add sensor noise. | done |
| [Bode diagram](web/control-systems.html?lab=bode) | Magnitude and phase against frequency; corners, slopes and asymptotes. | done |
| [Nyquist and stability margins](web/control-systems.html?lab=nyquist) | The frequency response as a curve around −1: gain and phase margins. | done |
| [Lead and lag compensation](web/control-systems.html?lab=lead-lag) | Add a lead or lag network to the loop: the margins and the step response move. | done |

## Digital electronics

In the Electronics Visualizer.

## Electronic warfare

| Topic | What you do | Status |
|---|---|---|
| [Radar pulses](web/electronic-warfare.html?lab=radar-pulses) | Pulse length, PRF, echoes, the matched filter and pulse compression; range ambiguity. | done |
| [Range and Doppler](web/electronic-warfare.html?lab=range-doppler) | A range–Doppler map: velocity from phase shifts, ground clutter, range and velocity folding. | done |
| [Detection in noise](web/electronic-warfare.html?lab=detection) | Radar equation, threshold, false alarms and probability of detection on an A-scope. | done |
| [The PPI scope](web/electronic-warfare.html?lab=ppi) | A rotating beam paints aircraft, ground clutter and rain on a plan display. | done |
| [Jamming and burn-through](web/electronic-warfare.html?lab=jamming) | Self-screening and stand-off jammers: S/J against range and the burn-through point. | done |

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
| [Calculus](web/maths.html?lab=calculus) | Derivative as a limit of slopes, integral as a limit of sums, Taylor polynomials. | done |
| [Sequences and series](web/maths.html?lab=sequences) | Partial sums that converge or not: geometric, harmonic, alternating, and the limit. | done |
| [Differential equations](web/maths.html?lab=differential-equations) | Slope fields and solution curves; Euler steps against the exact solution. | done |
| [Vectors](web/maths.html?lab=vectors) | Dot and cross product of two arrows you drag in 3D. | done |
| [Matrices and linear maps](web/maths.html?lab=matrices) | A 3×3 matrix deforms the unit cube: determinant, eigenvectors. | done |
| [Functions of two variables](web/maths.html?lab=surfaces) | Walk on a surface: gradient, tangent plane, level curves. | done |
| [Divergence and curl](web/maths.html?lab=vector-calculus) | Tracers in a flow: spreading is divergence, turning is curl. | done |
| [Probability](web/maths.html?lab=probability) | A Galton board: random falls build the binomial and then the normal curve. | done |

## Physics

| Topic | What you do | Status |
|---|---|---|
| [Motion](web/physics.html?lab=kinematics) | Projectiles and circular motion: position, velocity, acceleration. | done |
| [Momentum and collisions](web/physics.html?lab=momentum) | Two carts collide: momentum always survives, kinetic energy not always. | done |
| [Forces and torque](web/physics.html?lab=forces) | Add forces tip to tail; turn a lever. | done |
| [Buoyancy](web/physics.html?lab=fluids) | A block in a liquid bobs and settles where buoyancy equals weight. | done |
| [Oscillations](web/physics.html?lab=oscillations) | Spring and pendulum: period, energy, damping and resonance. | done |
| [Waves](web/physics.html?lab=waves) | A string: travelling pulses, superposition, standing waves, and the Doppler effect. | done |
| [Gas and heat](web/physics.html?lab=thermodynamics) | Atoms in a piston: pressure from impacts, heating, isothermal and adiabatic squeezes. | done |
| [Electric charges](web/physics.html?lab=electrostatics) | Field lines, equipotentials and Gauss’s law for point charges. | done |
| [Magnetic field of currents](web/physics.html?lab=magnetic-field) | A loop and a solenoid: field lines, B on the axis. | done |
| [Electromagnetic induction](web/physics.html?lab=induction) | Move a magnet through a coil: flux, EMF, Lenz, magnetic braking. | done |
| [Charges in E and B](web/physics.html?lab=charged-particle) | Circles, helices and drifts of a charged particle. | done |
| [Electromagnetic waves](web/physics.html?lab=em-wave) | E and B travelling together; reflection and standing waves. | done |
| [Rays: refraction, lenses, mirrors](web/physics.html?lab=geometric-optics) | Snell’s law, total reflection and image formation. | done |
| [Interference](web/physics.html?lab=interference) | Two slits, two waves: bright and dark fringes. | done |
| [Flight](web/physics.html?lab=flight) | Lift, drag, the stall and the flight envelope of a light aircraft. | done |
| [Gravitational field](web/physics.html?lab=gravity-field) | The field of two masses, arrow by arrow. | done |
| [Orbits](web/physics.html?lab=orbits) | Kepler orbits around a turning Earth, ground tracks, J2. | done |
| [Orbital transfers](web/physics.html?lab=orbital-transfers) | Hohmann and bi-elliptic transfers, Δv and the rocket equation. | done |
| [Lagrange points](web/physics.html?lab=lagrange-points) | The rotating two-body potential and its five equilibria. | done |

## Signal theory

| Topic | What you do | Status |
|---|---|---|
| [Signals and spectra](web/signal-theory.html?lab=signals) | Square, sawtooth, pulses, chirps and noise, in time and in frequency. | done |
| [Fourier series](web/signal-theory.html?lab=fourier-series) | Epicycles: stack rotating circles until they draw a square wave; Gibbs overshoot. | done |
| [Sampling and aliasing](web/signal-theory.html?lab=sampling) | Sample a sine faster or slower than 2f and watch an alias appear. | done |
| [DFT and FFT](web/signal-theory.html?lab=dft) | Samples into frequency bins: resolution, leakage, record length. | done |
| [Windows and leakage](web/signal-theory.html?lab=windows) | Rectangular, Hann, Blackman: dynamic range of a spectrum. | done |
| [Convolution](web/signal-theory.html?lab=convolution) | Flip, slide, multiply, integrate: watch y(t) being built. | done |
| [LTI systems](web/signal-theory.html?lab=lti-systems) | Impulse, step, square and sine through RC filters, an echo and a moving average. | done |
| [Digital filters](web/signal-theory.html?lab=filtering) | FIR low-, high- and band-pass on a noisy two-tone signal. | done |
| [AM and FM](web/signal-theory.html?lab=modulation) | A message on a carrier: envelope, sidebands, Bessel lines, Carson bandwidth. | done |
| [Constellations and bit errors](web/signal-theory.html?lab=constellations) | BPSK, QPSK, 8-PSK, 16-QAM in noise; measured vs theoretical bit error rate. | done |
| [IQ demodulation](web/signal-theory.html?lab=iq-demodulation) | Mix down to I and Q; phase and frequency errors rotate and spin the constellation. | done |
| [Link budget](web/signal-theory.html?lab=link-budget) | Friis: transmit power, antenna gains and path loss against receiver sensitivity. | done |
| [Dipole antennas](web/signal-theory.html?lab=dipole) | Radiation patterns and directivity from short to long dipoles. | done |
| [Phased arrays](web/signal-theory.html?lab=phased-array) | Steer a beam with phase steps; beam width and grating lobes. | done |
| [Polarization](web/signal-theory.html?lab=polarization) | Linear, circular and elliptical fields through a polarizer. | done |
| [Waveguide modes](web/signal-theory.html?lab=waveguide) | TE and TM fields in a rectangular guide; cut-off and guide wavelength. | done |
