# Topic map

Each subject is one file, `web/<subject>.html`. Generated from `catalog.json` by `build.mjs`: edit the JSON, not this file.

## Analog electronics

| Topic | What you do | Status |
|---|---|---|
| [The diode](web/analog-electronics.html?lab=diode-iv) | Exponential I–V curve, load line and operating point. | done |
| [Rectifiers](web/analog-electronics.html?lab=rectifiers) | From AC to DC: half wave, bridge, smoothing capacitor and ripple. | done |
| [The Zener regulator](web/analog-electronics.html?lab=zener) | Holding a voltage steady against supply and load. | done |
| [The bipolar transistor](web/analog-electronics.html?lab=bjt) | Exponential control, output curves, saturation. | done |
| [The MOSFET](web/analog-electronics.html?lab=mosfet) | Cutoff, triode and saturation, in 2D and as a 3D surface. | done |
| [Transconductance](web/analog-electronics.html?lab=transconductance) | How much current each volt buys: BJT vs MOSFET. | done |
| [The bias point](web/analog-electronics.html?lab=bias-point) | Load line, Q point, and why an emitter resistor keeps it stable. | done |
| [Small-signal model](web/analog-electronics.html?lab=small-signal) | Zoom in until the curve is a straight line: g_m and its limits. | done |
| [Current mirror](web/analog-electronics.html?lab=current-mirror) | Copying a current with two matched transistors. | done |
| [Common-emitter amplifier](web/analog-electronics.html?lab=common-emitter) | Gain, inversion, clipping, and emitter degeneration. | done |
| [Emitter follower](web/analog-electronics.html?lab=emitter-follower) | No voltage gain — an impedance transformer. | done |
| [Differential pair](web/analog-electronics.html?lab=differential-pair) | The tanh, and rejecting what both inputs share. | done |
| [Miller effect](web/analog-electronics.html?lab=miller-effect) | Why a few picofarads kill the bandwidth of a high-gain stage. | done |
| [Negative feedback](web/analog-electronics.html?lab=negative-feedback) | Give away gain, buy accuracy and bandwidth. | done |
| [Cascading stages](web/analog-electronics.html?lab=cascading) | Loading at each junction, and the follower that fixes it. | done |
| [The ideal op-amp](web/analog-electronics.html?lab=virtual-short) | Inverting, non-inverting, follower: the virtual short. | done |
| [Finite open-loop gain](web/analog-electronics.html?lab=finite-gain) | Where the gain error comes from: loop gain. | done |
| [Bandwidth and slew rate](web/analog-electronics.html?lab=bandwidth-slew) | Gain × bandwidth, and the speed limit of big signals. | done |
| [Offset and bias current](web/analog-electronics.html?lab=offset-bias) | Errors with nothing at the input. | done |
| [Stability and phase margin](web/analog-electronics.html?lab=stability) | When feedback turns into ringing. | done |
| [Sallen-Key filter](web/analog-electronics.html?lab=sallen-key) | A second-order low-pass from one op-amp. | done |
| [The CMOS inverter](web/analog-electronics.html?lab=cmos-inverter) | Two switches that are never both fully on. | done |
| [Noise margins](web/analog-electronics.html?lab=noise-margins) | Why logic restores a noisy signal. | done |
| [Gate delay](web/analog-electronics.html?lab=gate-delay) | An RC charge: fan-out, width and supply. | done |
| [Power](web/analog-electronics.html?lab=cmos-power) | α C V² f, and the speed it costs to lower V. | done |
| [The latch: memory](web/analog-electronics.html?lab=latch) | Two inverters, two stable states, one unstable. | done |

## Circuits

| Topic | What you do | Status |
|---|---|---|
| [Source and resistor](web/circuits.html?lab=ohm) | Ohm’s law, power, and charges drifting round the loop. | done |
| [The capacitor](web/circuits.html?lab=capacitor) | Charging and discharging: i = C dv/dt and the time constant. | done |
| [The inductor](web/circuits.html?lab=inductor) | The current cannot jump: v = L di/dt. | done |
| [The diode](web/circuits.html?lab=diode) | The first part that is not a straight line. | done |
| [Parts under a sine](web/circuits.html?lab=sine-phase) | Phase: why the capacitor leads and the inductor lags. | done |
| [LC energy exchange](web/circuits.html?lab=lc-energy) | Electric and magnetic energy trading places. | done |
| [Series and parallel](web/circuits.html?lab=series-parallel) | Sharing a current or sharing a voltage. | done |
| [Kirchhoff’s current law](web/circuits.html?lab=kcl) | What flows into a node flows out. | done |
| [Thévenin and maximum power](web/circuits.html?lab=thevenin) | Any network is one source and one resistor. | done |
| [Superposition](web/circuits.html?lab=superposition) | One source at a time, then add. | done |
| [Circuits as a potential landscape](web/circuits.html?lab=circuit-landscape) | Nodes lifted to their voltage in 3D: resistors are slopes, the source is a lift. | done |
| [RLC step response](web/circuits.html?lab=rlc-step) | Underdamped, critical, overdamped: one number ζ. | done |
| [Phasors](web/circuits.html?lab=phasors) | A sine is a turning arrow; sines add like arrows. | done |
| [RLC phasors in 3D](web/circuits.html?lab=rlc-phasors) | Voltage and current helices unrolling in time. | done |
| [Impedance](web/circuits.html?lab=impedance) | R, X_L and X_C as arrows; |Z| against frequency. | done |
| [Series resonance](web/circuits.html?lab=series-resonance) | Q, bandwidth, and Q times the voltage across L and C. | done |
| [Parallel tank](web/circuits.html?lab=parallel-tank) | The same resonance inside out: impedance peaks. | done |
| [AC power](web/circuits.html?lab=ac-power) | Real, reactive and apparent power; power factor. | done |
| [RC filters](web/circuits.html?lab=rc-filter) | Low-pass and high-pass: Bode plot and phase. | done |
| [Selectivity](web/circuits.html?lab=selectivity) | How many poles it takes to reject the neighbouring channel. | done |
| [LC ladder](web/circuits.html?lab=lc-ladder) | From a Butterworth response to component values. | done |
| [Impedance matching](web/circuits.html?lab=matching) | An L-network that makes a load look like the source. | done |
| [Transmission lines and the Smith chart](web/circuits.html?lab=transmission-line) | When the wire is long enough that time matters. | done |
| [Envelope detector](web/circuits.html?lab=envelope-detector) | Getting the message back off an AM carrier. | done |
| [The mixer](web/circuits.html?lab=mixer) | Moving a signal to another frequency. | done |
| [From the feed to the antenna](web/circuits.html?lab=feed-to-antenna) | Where the circuit stops being a circuit: current on a dipole, the field leaving it. | done |

## Computer science

| Topic | What you do | Status |
|---|---|---|
| [Accessing](web/computer-science.html?lab=array_access) | time O(1) · space O(1) | done |
| [Insert](web/computer-science.html?lab=array_insert) | time O(n) · space O(1) | done |
| [Delete](web/computer-science.html?lab=array_delete) | time O(n) · space O(1) | done |
| [Linear Search](web/computer-science.html?lab=linear_search) | time O(n) · space O(1) | done |
| [Binary Search](web/computer-science.html?lab=binary_search) | time O(log n) · space O(1) | done |
| [Insertion Sort](web/computer-science.html?lab=insertion_sort) | time O(n²) · space O(1) | done |
| [Selection Sort](web/computer-science.html?lab=selection_sort) | time O(n²) · space O(1) | done |
| [Bubble Sort](web/computer-science.html?lab=bubble_sort) | time O(n²) · space O(1) | done |
| [Merge Sort](web/computer-science.html?lab=merge_sort) | time O(n log n) · space O(n) | done |
| [Quick Sort](web/computer-science.html?lab=quick_sort) | time O(n log n) · space O(log n) | done |
| [Kadane](web/computer-science.html?lab=kadane) | time O(n) · space O(1) | done |
| [Stack](web/computer-science.html?lab=stack) | time O(1) · space O(n) | done |
| [Circular Queue](web/computer-science.html?lab=queue) | time O(1) · space O(n) | done |
| [Accessing](web/computer-science.html?lab=list_access) | time O(n) · space O(1) | done |
| [Insert](web/computer-science.html?lab=list_insert) | time O(1)–O(n) · space O(1) | done |
| [Delete](web/computer-science.html?lab=list_delete) | time O(1)–O(n) · space O(1) | done |
| [Search](web/computer-science.html?lab=list_search) | time O(n) · space O(1) | done |
| [Singly / Doubly / Circular](web/computer-science.html?lab=list_types) | time — · space O(n) | done |
| [N-ary Tree](web/computer-science.html?lab=tree_basics) | time O(n) · space O(h) | done |
| [Breadth-First](web/computer-science.html?lab=tree_bfs) | time O(n) · space O(w) | done |
| [Pre-order](web/computer-science.html?lab=tree_preorder) | time O(n) · space O(h) | done |
| [In-order](web/computer-science.html?lab=tree_inorder) | time O(n) · space O(h) | done |
| [Post-order](web/computer-science.html?lab=tree_postorder) | time O(n) · space O(h) | done |
| [Search](web/computer-science.html?lab=bst_search) | time O(h) · space O(1) | done |
| [Insertion](web/computer-science.html?lab=bst_insert) | time O(h) · space O(h) | done |
| [Delete (3 cases)](web/computer-science.html?lab=bst_delete) | time O(h) · space O(h) | done |
| [Heapify](web/computer-science.html?lab=heap_heapify) | time O(log n) · space O(log n) | done |
| [Insert](web/computer-science.html?lab=heap_insert) | time O(log n) · space O(1) | done |
| [Delete](web/computer-science.html?lab=heap_delete) | time O(log n) · space O(log n) | done |
| [Matrix and List](web/computer-science.html?lab=graph_repr) | time O(1) / O(degree) · space O(V²) / O(V+E) | done |
| [Breadth-First Search](web/computer-science.html?lab=graph_bfs) | time O(V + E) · space O(V) | done |
| [Depth-First Search](web/computer-science.html?lab=graph_dfs) | time O(V + E) · space O(V) | done |
| [Dijkstra](web/computer-science.html?lab=dijkstra) | time O(V²) · space O(V) | done |
| [Floyd-Warshall](web/computer-science.html?lab=floyd_warshall) | time O(V³) · space O(V²) | done |
| [Bellman-Ford](web/computer-science.html?lab=bellman_ford) | time O(V·E) · space O(V) | done |
| [A*](web/computer-science.html?lab=a_star) | time O(E) · space O(V) | done |
| [Ford-Fulkerson](web/computer-science.html?lab=ford_fulkerson) | time O(E · f) · space O(V²) | done |
| [Kruskal](web/computer-science.html?lab=kruskal) | time O(E log E) · space O(V) | done |
| [First Come First Served](web/computer-science.html?lab=fcfs) | time O(n log n) · space O(n) | done |
| [Shortest Job First](web/computer-science.html?lab=sjf) | time O(n²) · space O(n) | done |
| [Priority Scheduling](web/computer-science.html?lab=priority_scheduling) | time O(n²) · space O(n) | done |
| [Round Robin](web/computer-science.html?lab=round_robin) | time O(n) · space O(n) | done |
| [Comparing All Four](web/computer-science.html?lab=scheduling_compare) | time — · space — | done |
| [Lock Variable](web/computer-science.html?lab=lock_variable) | time — · space O(1) | done |
| [Peterson's Solution](web/computer-science.html?lab=petersons_solution) | time — · space O(1) | done |
| [Semaphores](web/computer-science.html?lab=semaphores) | time O(1) · space O(n) | done |

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

| Topic | What you do | Status |
|---|---|---|
| [The Seven Gates](web/digital-electronics.html?lab=gates_truth) | time 1 t_p · space 1 gate | done |
| [Gates Over Time](web/digital-electronics.html?lab=gates_timing) | time 1 t_p · space 1 gate | done |
| [NAND Is Universal](web/digital-electronics.html?lab=nand_universal) | time 2 t_p · space 3 NAND | done |
| [Tri-State Buffer](web/digital-electronics.html?lab=tri_state) | time 1 t_p · space 1 buffer | done |
| [Half Adder](web/digital-electronics.html?lab=half_adder) | time 2 t_p · space 2 gate | done |
| [Full Adder](web/digital-electronics.html?lab=full_adder) | time 3 t_p · space 5 gate | done |
| [Ripple-Carry, 4 bit](web/digital-electronics.html?lab=ripple_carry) | time 4 t_p · space 4 FA | done |
| [Ripple vs Carry-Look-Ahead](web/digital-electronics.html?lab=adder_delay_compare) | time O(n) · space O(1) | done |
| [1-Bit Comparator](web/digital-electronics.html?lab=comparator_1bit) | time 2 t_p · space 5 gate | done |
| [Parity Generator](web/digital-electronics.html?lab=parity_tree) | time 2 t_p · space 3 XOR | done |
| [SR Latch (NOR)](web/digital-electronics.html?lab=sr_latch_nor) | time level-sensitive · space 2 NOR | done |
| [SR Over Time](web/digital-electronics.html?lab=sr_latch_timing) | time level-sensitive · space 2 NOR | done |
| [D Latch with Enable](web/digital-electronics.html?lab=d_latch) | time level-sensitive · space 4 NAND | done |
| [Transparency](web/digital-electronics.html?lab=d_latch_transparency) | time level-sensitive · space 4 NAND | done |
| [NOR vs NAND: Duality](web/digital-electronics.html?lab=sr_nor_vs_nand) | time level-sensitive · space 2+2 gates | done |
| [The Glitch That Survives](web/digital-electronics.html?lab=latch_glitch) | time level-sensitive · space 4 NAND | done |
| [SR Flip-Flop](web/digital-electronics.html?lab=sr_flipflop) | time edge-triggered · space 2 latches | done |
| [D Master-Slave](web/digital-electronics.html?lab=d_flipflop_master_slave) | time edge-triggered · space 2 D-latches | done |
| [Latch vs Flip-Flop](web/digital-electronics.html?lab=latch_vs_flipflop) | time — · space — | done |
| [JK Flip-Flop](web/digital-electronics.html?lab=jk_flipflop) | time edge-triggered · space 2 latches | done |
| [T as a Frequency Divider](web/digital-electronics.html?lab=t_flipflop_divider) | time edge-triggered · space 3 T-FF | done |
| [Setup and Hold](web/digital-electronics.html?lab=setup_hold) | time edge-triggered · space 1 D-FF | done |
| [Metastability](web/digital-electronics.html?lab=metastability) | time edge-triggered · space 1 D-FF | done |
| [Asynchronous Ripple Counter](web/digital-electronics.html?lab=ripple_counter) | time O(n) delay · space 4 T-FF | done |
| [Synchronous Counter](web/digital-electronics.html?lab=sync_counter) | time O(1) per stage · space 4 T-FF + AND | done |
| [Mod-N Counter](web/digital-electronics.html?lab=mod_n_counter) | time O(1) per stage · space 4 T-FF + decoder | done |
| [Ring and Johnson](web/digital-electronics.html?lab=ring_johnson) | time O(1) per step · space 4 flip-flops | done |
| [Gray Code](web/digital-electronics.html?lab=gray_counter) | time O(1) per step · space XOR + shift | done |
| [Moore vs Mealy](web/digital-electronics.html?lab=moore_vs_mealy) | time O(1) per symbol · space 2 states | done |
| ['101' Sequence Detector (Moore)](web/digital-electronics.html?lab=seq_detector_101) | time O(n) · space 4 states | done |
| [Same Input, Different Outputs](web/digital-electronics.html?lab=moore_mealy_timing) | time O(1) per symbol · space 2 states | done |
| [Traffic Light](web/digital-electronics.html?lab=traffic_light) | time O(1) per tick · space 3 states | done |

## Electronic warfare

| Topic | What you do | Status |
|---|---|---|
| [Pulse echo and range](web/electronic-warfare.html?lab=pulse-echo) | Watch a pulse fly out and back while the receiver records it; delay, duty cycle, the blind zone. | done |
| [Range resolution](web/electronic-warfare.html?lab=range-resolution) | Two aircraft, two echoes: when they overlap the radar sees one target. | done |
| [Pulse trains and RTI](web/electronic-warfare.html?lab=pulse-train) | A moving target draws a tilted track on the range–time intensity map. | done |
| [Pulses in flight](web/electronic-warfare.html?lab=pulses-in-flight) | Raise the PRF until several pulses are airborne and a distant target is reported close. | done |
| [The plain pulse](web/electronic-warfare.html?lab=plain-pulse) | Pulse, spectrum, echo and matched filter; then two aircraft in formation split by Doppler. | done |
| [The LFM chirp](web/electronic-warfare.html?lab=chirp) | Bandwidth without a short pulse; compression, weighting, and range–Doppler coupling on a fighter and tanker. | done |
| [Phase codes](web/electronic-warfare.html?lab=phase-codes) | Barker-13: compression with a sign switch, and the sidelobe floor that hides a small target. | done |
| [The Doppler effect](web/electronic-warfare.html?lab=doppler-effect) | Wavefronts squeeze off an approaching target; transmitted and received waves side by side. | done |
| [Pulse-Doppler: range and velocity](web/electronic-warfare.html?lab=pulse-doppler) | Range profile and Doppler spectrum from a burst of pulses; resolution and velocity wrap. | done |
| [The range–Doppler map](web/electronic-warfare.html?lab=rd-map) | Place three targets and see the radar image, with folding in both range and velocity. | done |
| [The PRF dilemma](web/electronic-warfare.html?lab=ambiguity) | Reported against true range and velocity: raise the PRF and one folds, lower it and the other does. | done |
| [Receiver architectures](web/electronic-warfare.html?lab=receivers) | Follow one pulse through a superheterodyne, a digital-IF and a homodyne receiver, stage by stage. | done |
| [IQ demodulation](web/electronic-warfare.html?lab=iq-receiver) | RF pulse to I and Q: LO detuning, filter bandwidth and rise time. | done |
| [Phased-array beamforming](web/electronic-warfare.html?lab=beamforming) | The instantaneous near field beside the far-field pattern: steering, taper, grating lobes. | done |
| [Maxwell on a grid](web/electronic-warfare.html?lab=fdtd) | Solve E and H step by step (FDTD): walls, slits, standing waves, the Courant limit. | done |
| [Pointing a beam](web/electronic-warfare.html?lab=pointing) | Gain is borrowed solid angle: fly a receiver through the beam and watch the link close. | done |
| [Lobing and angle tracking](web/electronic-warfare.html?lab=lobing) | Two squinted beams, the Δ/Σ error signal and a loop that follows a weaving target. | done |
| [Searching a volume](web/electronic-warfare.html?lab=search) | A pencil beam nodding through elevation bars: coverage, gaps and frame time. | done |
| [Airborne engagement](web/electronic-warfare.html?lab=engagement) | Own ship, sweeping beam, three targets: radial velocity, range–Doppler history and the target’s warning receiver. | done |
| [Ground clutter](web/electronic-warfare.html?lab=ground-clutter) | Iso-range circles and iso-Doppler hyperbolas on the ground; the footprint and its clutter spectrum. | done |
| [The radar equation](web/electronic-warfare.html?lab=radar-equation) | The range equation as a dB budget: every factor, the noise floor, SNR against range. | done |
| [Detection in noise](web/electronic-warfare.html?lab=detection) | Radar equation, threshold, false alarms and probability of detection on an A-scope. | done |
| [Moving-target indication](web/electronic-warfare.html?lab=mti) | Pulse cancellers remove the ground and reveal blind speeds. | done |
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
| [Transforming graphs](web/maths.html?lab=graph-transformations) | Shift, stretch and reflect any graph. | done |
| [Composition and inverses](web/maths.html?lab=composition-inverse) | Functions in a chain, and running them backwards. | done |
| [Polynomials and rational functions](web/maths.html?lab=polynomials) | Roots, multiplicity, end behaviour, asymptotes and holes. | done |
| [Trigonometry](web/maths.html?lab=trigonometry) | A point on the unit circle: sine, cosine, tangent and the waves they make. | done |
| [Solving triangles](web/maths.html?lab=triangles) | SOH-CAH-TOA, laws of sines and cosines. | done |
| [Parametric and polar curves](web/maths.html?lab=parametric-polar) | Lissajous figures, roses, cardioids and spirals. | done |
| [Conic sections](web/maths.html?lab=conics) | Cutting a cone; focus and directrix; the reflection property. | done |
| [Complex numbers](web/maths.html?lab=complex-numbers) | Sums, products, powers and roots as arrows in the plane. | done |
| [Euler’s formula](web/maths.html?lab=euler-formula) | e^{iθ} built term by term: the series that lands on the circle. | done |
| [Complex functions](web/maths.html?lab=complex-functions) | Domain colouring, zeros and poles, and conformal maps. | done |
| [Limits and continuity](web/maths.html?lab=limits) | Approaching a point from both sides: holes, jumps and asymptotes. | done |
| [Calculus](web/maths.html?lab=calculus) | Derivative as a limit of slopes, integral as a limit of sums, Taylor polynomials. | done |
| [Curve sketching](web/maths.html?lab=curve-sketching) | Rising, falling, maxima, minima and inflection from f′ and f″. | done |
| [Newton’s method](web/maths.html?lab=newton) | Solving equations by following tangents. | done |
| [Areas and volumes](web/maths.html?lab=integral-applications) | Area between curves and solids of revolution. | done |
| [Sequences and series](web/maths.html?lab=sequences) | Partial sums that converge or not: geometric, harmonic, alternating, and the limit. | done |
| [Differential equations](web/maths.html?lab=differential-equations) | Slope fields and solution curves; Euler steps against the exact solution. | done |
| [Vectors](web/maths.html?lab=vectors) | Dot and cross product of two arrows you drag in 3D. | done |
| [Linear systems](web/maths.html?lab=linear-systems) | Two equations as two lines: one, none or infinitely many solutions. | done |
| [The determinant](web/maths.html?lab=determinant) | The area a matrix gives to the unit square, with a sign. | done |
| [Eigenvalues and eigenvectors](web/maths.html?lab=eigenvectors) | The directions a matrix only stretches. | done |
| [Least squares](web/maths.html?lab=least-squares) | Fitting the best line through data. | done |
| [Matrices and linear maps](web/maths.html?lab=matrices) | A 3×3 matrix deforms the unit cube: determinant, eigenvectors. | done |
| [Functions of two variables](web/maths.html?lab=surfaces) | Walk on a surface: gradient, tangent plane, level curves. | done |
| [Divergence and curl](web/maths.html?lab=vector-calculus) | Tracers in a flow: spreading is divergence, turning is curl. | done |
| [Double integrals](web/maths.html?lab=double-integrals) | Volume under a surface as a stack of boxes. | done |
| [Constrained optimisation](web/maths.html?lab=lagrange) | Lagrange multipliers: where ∇f is parallel to ∇g. | done |
| [Line integrals and work](web/maths.html?lab=line-integrals) | Work along a path; conservative and rotational fields. | done |
| [Probability](web/maths.html?lab=probability) | A Galton board: random falls build the binomial and then the normal curve. | done |
| [Probability distributions](web/maths.html?lab=distributions) | Normal, exponential, Poisson, binomial: probability as area. | done |
| [Bayes’ theorem](web/maths.html?lab=bayes) | Why most positive tests for a rare disease are false. | done |
| [Sample means and the CLT](web/maths.html?lab=central-limit) | Averages become normal and narrower as 1/√n. | done |
| [Random walks and Monte Carlo](web/maths.html?lab=random-walk) | Diffusion as √n; estimating π with random darts. | done |

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
| [Pulses and their spectra](web/signal-theory.html?lab=pulses) | Rectangle, triangle, Gaussian, sinc and exponential: shape, spectrum, roll-off and phase. | done |
| [The chirp](web/signal-theory.html?lab=chirp-signal) | A sweep in frequency: long in time and wide in band at once. | done |
| [Time–bandwidth product](web/signal-theory.html?lab=time-bandwidth) | Why no pulse is narrow in both time and frequency; the Gaussian bound. | done |
| [Fourier series](web/signal-theory.html?lab=fourier-series) | Waves built from rotating circles, and how each coefficient is measured. | done |
| [The Gibbs phenomenon](web/signal-theory.html?lab=gibbs) | The 9 % overshoot at a jump that never goes away. | done |
| [From series to transform](web/signal-theory.html?lab=fourier-transform) | Line spectra fill a continuous envelope as the period grows; uncertainty. | done |
| [Leakage and windows](web/signal-theory.html?lab=leakage) | Tones between DFT bins, the seam at the record ends, and windows. | done |
| [The transform as correlation](web/signal-theory.html?lab=dft-correlation) | Multiply by a probe and take the area: the spectrum, one frequency at a time. | done |
| [Winding around a circle](web/signal-theory.html?lab=dft-winding) | The DFT bin as the centre of mass of the wound signal, bin by bin. | done |
| [DFT vs continuous transform](web/signal-theory.html?lab=dft-vs-transform) | DFT dots sit on the continuous sinc; what sets spacing and range. | done |
| [Why the FFT is fast](web/signal-theory.html?lab=fft) | The butterfly, N² vs N log N, and timings measured in your browser. | done |
| [Sampling a tone](web/signal-theory.html?lab=sampling) | Samples, sinc reconstruction, DFT and spectral replicas side by side. | done |
| [Aliasing](web/signal-theory.html?lab=aliasing) | Two tones through the same samples, the folding roof, the wagon wheel. | done |
| [Spectral replicas](web/signal-theory.html?lab=replicas) | Copies of a pulse spectrum collide as the sampling rate falls. | done |
| [Convolution](web/signal-theory.html?lab=convolution) | Flip, slide, multiply, integrate: continuous and by hand. | done |
| [The convolution theorem](web/signal-theory.html?lab=convolution-theorem) | Convolution in time is multiplication in frequency. | done |
| [Linearity and time invariance](web/signal-theory.html?lab=lti-properties) | Superposition and shift checked to rounding error. | done |
| [The impulse response](web/signal-theory.html?lab=impulse-response) | δ as a limit, and any input as a sum of impulses. | done |
| [Poles and the time response](web/signal-theory.html?lab=poles) | Where the poles sit tells how the system rings and decays. | done |
| [Frequency response](web/signal-theory.html?lab=frequency-response) | The Bode plot and the sinusoidal steady state. | done |
| [Filtering in time and frequency](web/signal-theory.html?lab=filtering) | Smoothing kernels, spectral masks and their ringing, the Gaussian. | done |
| [FIR filter design](web/signal-theory.html?lab=fir-design) | The windowed sinc: low-, high- and band-pass. | done |
| [Reading FFT bins](web/signal-theory.html?lab=fft-bins) | fftshift, resolution 1/T, zero padding, and a window for a weak tone. | done |
| [Shifting and resampling](web/signal-theory.html?lab=resampling) | RF→IF with a phasor; decimation with and without anti-alias filter. | done |
| [Amplitude, phase, frequency](web/signal-theory.html?lab=iq-phase) | From I/Q to envelope, unwrapped phase and instantaneous frequency. | done |
| [Frequency estimation](web/signal-theory.html?lab=crlb) | Peak interpolation against the Cramér–Rao bound. | done |
| [Plateau detection](web/signal-theory.html?lab=plateaus) | Smoothed derivatives say where, kernel density says at what level. | done |
| [Why a carrier](web/signal-theory.html?lab=why-carrier) | Antenna size, sharing the spectrum: putting a message on a carrier. | done |
| [Amplitude modulation](web/signal-theory.html?lab=am) | Envelope, sidebands, overmodulation, the envelope detector, DSB-SC. | done |
| [Frequency and phase modulation](web/signal-theory.html?lab=fm) | Instantaneous frequency, Bessel sidebands, Carson; PM vs FM. | done |
| [AM, FM and PM compared](web/signal-theory.html?lab=am-fm-pm) | The same message three ways, in time and frequency. | done |
| [BPSK and QPSK](web/signal-theory.html?lab=psk) | Bits on a carrier, the correlator, decisions and Gray coding. | done |
| [M-QAM](web/signal-theory.html?lab=qam) | Constellations, decision regions and noisy clouds. | done |
| [Bit error rate](web/signal-theory.html?lab=ber) | BER curves, theory against Monte Carlo. | done |
| [Eye diagram](web/signal-theory.html?lab=eye-diagram) | Raised-cosine pulses, ISI and the eye opening. | done |
| [The Shannon limit](web/signal-theory.html?lab=shannon) | Spectral efficiency against Eb/N0, and the gap to capacity. | done |
| [IQ demodulation](web/signal-theory.html?lab=iq-demodulation) | Pulse, mixer, low-pass: RF to IF to baseband. | done |
| [Residual Δf and DFT bins](web/signal-theory.html?lab=residual-df) | An off-tune oscillator rotates the baseband; one bin or leakage. | done |
| [Links and propagation](web/signal-theory.html?lab=link-budget) | Friis link budget, free-space loss, ground reflection and the breakpoint. | done |
| [Yagi and patch antennas](web/signal-theory.html?lab=yagi-patch) | Parasitic elements that steer a beam; the microstrip patch. | done |
| [Vivaldi antenna](web/signal-theory.html?lab=vivaldi) | Tapered slot: travelling wave, endfire beam, broadband match, arrays. | done |
| [Dipole: current and fields](web/signal-theory.html?lab=dipole-current) | Standing-wave current, E and H radiating, field lines detaching. | done |
| [Dipole: radiation pattern](web/signal-theory.html?lab=dipole-pattern) | E- and H-plane, 3D pattern, pattern against length. | done |
| [Dipole: impedance and directivity](web/signal-theory.html?lab=dipole-impedance) | Input impedance, resonance, matching, directivity vs length. | done |
| [Near and far field](web/signal-theory.html?lab=near-far-field) | Reactive, Fresnel and Fraunhofer regions around an antenna. | done |
| [Phased array: steering](web/signal-theory.html?lab=array-steering) | Wavefronts from delays, spacing, phase vs true time delay. | done |
| [Phased array: beams and lobes](web/signal-theory.html?lab=array-lobes) | Near-field beam, grating lobes, scanning, planar arrays. | done |
| [Phased array: tapers and nulls](web/signal-theory.html?lab=array-weights) | Amplitude tapers for low sidelobes; nulls on interferers. | done |
| [Polarization](web/signal-theory.html?lab=polarization) | The wave in 3D, the ellipse, orientation and ellipticity. | done |
| [Jones and Stokes](web/signal-theory.html?lab=jones-stokes) | Polarizers and wave plates as matrices; the Poincaré sphere; circular basis. | done |
| [Transmission lines](web/signal-theory.html?lab=transmission-lines) | The TEM coax, mismatch, standing waves and the Smith chart. | done |
| [Waveguides](web/signal-theory.html?lab=waveguides) | Cutoff, mode fields and slots, dispersion and pulse spreading. | done |
| [Dielectric guides](web/signal-theory.html?lab=optical-guide) | Total internal reflection, modes and evanescent tails. | done |
