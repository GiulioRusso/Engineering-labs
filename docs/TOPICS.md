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

## Coding

| Topic | What you do | Status |
|---|---|---|
| [Sequence and variables](web/coding.html?lab=sequence) | time undefined · space undefined | done |
| [Types and expressions](web/coding.html?lab=types) | time undefined · space undefined | done |
| [Selection: if / else](web/coding.html?lab=selection) | time undefined · space undefined | done |
| [Multi-way selection: else if](web/coding.html?lab=multiway) | time undefined · space undefined | done |
| [Iteration: the counting loop](web/coding.html?lab=for_loop) | time undefined · space undefined | done |
| [Iteration: the while loop](web/coding.html?lab=while_loop) | time undefined · space undefined | done |
| [Nested loops](web/coding.html?lab=nested_loops) | time undefined · space undefined | done |
| [Loop control: break and continue](web/coding.html?lab=break_continue) | time undefined · space undefined | done |
| [Arrays and lists](web/coding.html?lab=arrays) | time undefined · space undefined | done |
| [Strings](web/coding.html?lab=strings) | time undefined · space undefined | done |
| [Dictionaries and maps](web/coding.html?lab=maps) | time undefined · space undefined | done |
| [Functions](web/coding.html?lab=functions) | time undefined · space undefined | done |
| [Scope and parameter passing](web/coding.html?lab=scope) | time undefined · space undefined | done |
| [Recursion](web/coding.html?lab=recursion) | time undefined · space undefined | done |
| [Classes and objects](web/coding.html?lab=classes) | time undefined · space undefined | done |

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

## Design patterns

| Topic | What you do | Status |
|---|---|---|
| [Singleton](web/design-patterns.html?lab=singleton) | time undefined · space undefined | done |
| [Factory Method](web/design-patterns.html?lab=factory_method) | time undefined · space undefined | done |
| [Builder](web/design-patterns.html?lab=builder) | time undefined · space undefined | done |
| [Adapter](web/design-patterns.html?lab=adapter) | time undefined · space undefined | done |
| [Decorator](web/design-patterns.html?lab=decorator) | time undefined · space undefined | done |
| [Composite](web/design-patterns.html?lab=composite) | time undefined · space undefined | done |
| [Proxy](web/design-patterns.html?lab=proxy) | time undefined · space undefined | done |
| [Strategy](web/design-patterns.html?lab=strategy) | time undefined · space undefined | done |
| [Observer](web/design-patterns.html?lab=observer) | time undefined · space undefined | done |
| [Command](web/design-patterns.html?lab=command) | time undefined · space undefined | done |
| [State](web/design-patterns.html?lab=state) | time undefined · space undefined | done |
| [Template Method](web/design-patterns.html?lab=template_method) | time undefined · space undefined | done |
| [Chain of Responsibility](web/design-patterns.html?lab=chain) | time undefined · space undefined | done |

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
| [State space and eigenvalues](web/control-systems.html?lab=state-space) | Position and velocity as one state: the phase plane, its arrow field, and the eigenvalues of A as the poles. | done |
| [Pole placement](web/control-systems.html?lab=pole-placement) | Feed back the whole state and put the closed-loop poles anywhere, at a price in force. | done |
| [Observers and the Kalman filter](web/control-systems.html?lab=observers) | Estimating the velocity you cannot measure from a noisy position: observer speed against noise. | done |
| [Sampling and the z-plane](web/control-systems.html?lab=z-plane) | z = e^{sT}: where sampling sends the poles, and when the samples stop telling the truth. | done |
| [A controller in a computer](web/control-systems.html?lab=digital-controller) | The same PD loop computed every T seconds: the hold adds delay, and too slow a sample rate destabilises it. | done |

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
| [The radar equation](web/electronic-warfare.html?lab=radar-equation) | The range equation as a dB budget: every factor, the noise floor, SNR against range. | done |
| [Detection in noise](web/electronic-warfare.html?lab=detection) | Radar equation, threshold, false alarms and probability of detection on an A-scope. | done |
| [The PPI scope](web/electronic-warfare.html?lab=ppi) | A rotating beam paints aircraft, ground clutter and rain on a plan display. | done |
| [The plain pulse](web/electronic-warfare.html?lab=plain-pulse) | Pulse, spectrum, echo and matched filter; then two aircraft in formation split by Doppler. | done |
| [The LFM chirp](web/electronic-warfare.html?lab=chirp) | Bandwidth without a short pulse; compression, weighting, and range–Doppler coupling on a fighter and tanker. | done |
| [Phase codes](web/electronic-warfare.html?lab=phase-codes) | Barker-13: compression with a sign switch, and the sidelobe floor that hides a small target. | done |
| [The Doppler effect](web/electronic-warfare.html?lab=doppler-effect) | Wavefronts squeeze off an approaching target; transmitted and received waves side by side. | done |
| [Pulse-Doppler: range and velocity](web/electronic-warfare.html?lab=pulse-doppler) | Range profile and Doppler spectrum from a burst of pulses; resolution and velocity wrap. | done |
| [The range–Doppler map](web/electronic-warfare.html?lab=rd-map) | Place three targets and see the radar image, with folding in both range and velocity. | done |
| [The PRF dilemma](web/electronic-warfare.html?lab=ambiguity) | Reported against true range and velocity: raise the PRF and one folds, lower it and the other does. | done |
| [Moving-target indication](web/electronic-warfare.html?lab=mti) | Pulse cancellers remove the ground and reveal blind speeds. | done |
| [Phased-array beamforming](web/electronic-warfare.html?lab=beamforming) | The instantaneous near field beside the far-field pattern: steering, taper, grating lobes. | done |
| [Maxwell on a grid](web/electronic-warfare.html?lab=fdtd) | Solve E and H step by step (FDTD): walls, slits, standing waves, the Courant limit. | done |
| [Pointing a beam](web/electronic-warfare.html?lab=pointing) | Gain is borrowed solid angle: fly a receiver through the beam and watch the link close. | done |
| [Lobing and angle tracking](web/electronic-warfare.html?lab=lobing) | Two squinted beams, the Δ/Σ error signal and a loop that follows a weaving target. | done |
| [Searching a volume](web/electronic-warfare.html?lab=search) | A pencil beam nodding through elevation bars: coverage, gaps and frame time. | done |
| [Airborne engagement](web/electronic-warfare.html?lab=engagement) | Own ship, sweeping beam, three targets: radial velocity, range–Doppler history and the target’s warning receiver. | done |
| [Ground clutter](web/electronic-warfare.html?lab=ground-clutter) | Iso-range circles and iso-Doppler hyperbolas on the ground; the footprint and its clutter spectrum. | done |
| [Pulsed radar: the blocks](web/electronic-warfare.html?lab=pulsed-radar-arch) | Synchronizer, modulator, magnetron, duplexer, limiter, superhet receiver, detector and display, with the signal at every block. | done |
| [Coherent pulse-Doppler radar](web/electronic-warfare.html?lab=coherent-radar-arch) | One reference clock, COHO and STALO, chirp generator, TWT, IQ receiver, pulse compression, Doppler FFT, CFAR and tracker. | done |
| [AESA and T/R modules](web/electronic-warfare.html?lab=aesa-arch) | Inside a transmit/receive module, and how phase shifters line the elements up to form a beam. | done |
| [ESM receiver](web/electronic-warfare.html?lab=esm-arch) | Intercepting radars: frequency, angle of arrival, pulse descriptor words, deinterleaving and identification. | done |
| [DRFM jammer](web/electronic-warfare.html?lab=drfm-arch) | Sample the radar pulse, store it, play it back delayed and Doppler-shifted: false targets and range-gate pull-off. | done |
| [Receiver architectures](web/electronic-warfare.html?lab=receivers) | Follow one pulse through a superheterodyne, a digital-IF and a homodyne receiver, stage by stage. | done |
| [IQ demodulation](web/electronic-warfare.html?lab=iq-receiver) | RF pulse to I and Q: LO detuning, filter bandwidth and rise time. | done |
| [Jamming and burn-through](web/electronic-warfare.html?lab=jamming) | Self-screening and stand-off jammers: S/J against range and the burn-through point. | done |
| [What is an emitter fingerprint](web/electronic-warfare.html?lab=sei-intro) | Two radars of the same model send the same pulse; the hardware makes them differ. | done |
| [Transmitter imperfections](web/electronic-warfare.html?lab=tx-fingerprint) | Modulator edges, droop and ripple, oscillator offset and phase noise, amplifier AM/AM and AM/PM, output filter. | done |
| [What the receiver adds](web/electronic-warfare.html?lab=rx-effects) | LO offset, bandwidth, IQ imbalance, DC, ADC bits, clock jitter, sampling phase. | done |
| [Channel and operating conditions](web/electronic-warfare.html?lab=channel-drift) | SNR, Doppler, multipath, temperature, warm-up, supply voltage. | done |
| [Fingerprint workbench](web/electronic-warfare.html?lab=fingerprint-workbench) | Every Tx, channel and Rx knob on one pulse, in every representation, with two units of the same model side by side. | done |

## Information theory

| Topic | What you do | Status |
|---|---|---|
| [Entropy](web/information-theory.html?lab=entropy) | Surprisal in bits, and why a predictable source carries little information. | done |
| [Typical sequences and compression](web/information-theory.html?lab=typical-sequences) | Long random sequences almost all have the same surprise, and there are only 2^{nH} of them. | done |
| [Huffman coding](web/information-theory.html?lab=huffman) | Build the optimal prefix code merge by merge; compare its length with the entropy. | done |
| [Mutual information](web/information-theory.html?lab=mutual-information) | A joint table and its information diagram: how much the output tells about the input. | done |
| [Channel capacity](web/information-theory.html?lab=channel-capacity) | The binary symmetric channel: mutual information and Shannon's limit. | done |
| [The repetition code](web/information-theory.html?lab=repetition-code) | Send every bit n times and vote: reliability bought with rate. | done |
| [The Hamming (7,4) code](web/information-theory.html?lab=hamming-code) | Three parity circles locate and fix any single flipped bit. | done |
| [CRC: detecting errors](web/information-theory.html?lab=crc) | Long division over GF(2): the remainder rides along, and any error that is not a multiple of the generator shows. | done |
| [Convolutional codes and Viterbi](web/information-theory.html?lab=viterbi) | A rate-½ code on its trellis: the decoder keeps one survivor per state and finds the most likely message. | done |

## Machine learning

| Topic | What you do | Status |
|---|---|---|
| [Nearest neighbours and decision trees](web/machine-learning.html?lab=neighbours-trees) | Classify by a vote of neighbours, or by a few yes/no questions. | done |
| [Clustering and PCA](web/machine-learning.html?lab=clustering-pca) | No labels: k-means finds groups, PCA finds the main directions. | done |
| [Linear regression](web/machine-learning.html?lab=linear-regression) | Fit a line by least squares: residual squares, R², and gradient descent with and without feature scaling. | done |
| [Logistic regression](web/machine-learning.html?lab=logistic-regression) | Probabilities for yes/no labels: the sigmoid, log loss, and why separable data breaks it. | done |
| [Support vector machines](web/machine-learning.html?lab=svm) | The widest street between two classes: support vectors, hard and soft margins, the cost C. | done |
| [The kernel trick](web/machine-learning.html?lab=kernel-trick) | An RBF kernel separates rings; γ from too smooth to islands round every point. | done |
| [Bagging and random forests](web/machine-learning.html?lab=random-forest) | Many bootstrapped trees vote: smoother boundaries, lower variance, and where they disagree. | done |
| [Boosting](web/machine-learning.html?lab=boosting) | AdaBoost adds one stump per round and re-weights the mistakes; when it starts memorising. | done |
| [Overfitting and how to fight it](web/machine-learning.html?lab=overfitting) | Capacity, bias and variance, ridge, early stopping, cross-validation. | done |
| [Classification metrics](web/machine-learning.html?lab=metrics) | Accuracy, precision, recall on rare classes. | done |
| [ROC curves and thresholds](web/machine-learning.html?lab=roc-curves) | Two score distributions and a threshold: ROC, AUC, precision and recall, and rare positives. | done |

## Deep learning

| Topic | What you do | Status |
|---|---|---|
| [Inside a neuron](web/deep-learning.html?lab=neuron-anatomy) | Inputs, weights, bias, sum, activation: every number of one neuron, with its controls. | done |
| [Logic gates and the perceptron](web/deep-learning.html?lab=logic-gates) | AND, OR, NAND as one neuron; the perceptron rule learns them and fails on XOR. | done |
| [The neuron](web/deep-learning.html?lab=neuron) | Weights tilt it, the bias slides it, gradient descent learns them. | done |
| [Hidden layers](web/deep-learning.html?lab=hidden-layer) | A hidden layer bends the plane: two moons. | done |
| [Training a small network](web/deep-learning.html?lab=network-playground) | Train an MLP live on XOR and circles: decision map, what each hidden unit learns, loss curves. | done |
| [Depth, width and learning rate](web/deep-learning.html?lab=depth-width) | Two spirals need depth; too high a learning rate, and weight decay, change everything. | done |
| [Universal approximation](web/deep-learning.html?lab=universal-approximation) | One hidden layer fits any curve: watch each ReLU or tanh unit add its piece. | done |
| [Activation functions](web/deep-learning.html?lab=activations) | Sigmoid, tanh, ReLU, GELU: the bend in every layer and the gradient it lets through. | done |
| [Dense layer](web/deep-learning.html?lab=dense-layer) | One dot product per output. | done |
| [Convolutional layer](web/deep-learning.html?lab=conv-layer) | A kernel sliding over an image; stride, padding, dilation; channels in 3D. | done |
| [Pooling layer](web/deep-learning.html?lab=pooling) | Max and average, no parameters. | done |
| [Softmax output layer](web/deep-learning.html?lab=softmax) | From scores to probabilities, with temperature. | done |
| [Putting the layers together](web/deep-learning.html?lab=cnn-stack) | A whole CNN: shapes and where the parameters live. | done |
| [Loss functions](web/deep-learning.html?lab=loss-functions) | Squared, absolute, Huber; the sigmoid trap; every loss vs the margin. | done |
| [Backpropagation and mini-batches](web/deep-learning.html?lab=backpropagation) | The chain rule run backwards through a network; noisy cheap steps with SGD. | done |
| [Optimizers](web/deep-learning.html?lab=optimizers) | GD, momentum, RMSProp and Adam on 3D loss surfaces. | done |
| [Vanishing gradients](web/deep-learning.html?lab=vanishing-gradients) | Why deep sigmoid stacks barely train: the gradient layer by layer. | done |
| [Weight initialisation](web/deep-learning.html?lab=weight-initialization) | Xavier and He: the weight scale that keeps signals alive through many layers. | done |
| [Handwritten digits (MNIST)](web/deep-learning.html?lab=mnist-digits) | Train an MLP live on real handwritten digits; inspect one digit, its probabilities and the pixels that matter. | done |
| [What the digit network learned](web/deep-learning.html?lab=mnist-weights) | Weights as images: templates, stroke features, and a gallery of mistakes. | done |
| [Convolution filters on digits](web/deep-learning.html?lab=convolution-filters) | A 3×3 kernel sliding over a handwritten digit: edges, blur, sharpen, with every weight shown. | done |
| [A CNN on handwritten digits](web/deep-learning.html?lab=mnist-cnn) | A small CNN learns its own filters live and beats an MLP with four times the parameters. | done |

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
| [Matrices and linear maps](web/maths.html?lab=matrices) | A 3×3 matrix deforms the unit cube: determinant, eigenvectors. | done |
| [Linear systems](web/maths.html?lab=linear-systems) | Two equations as two lines: one, none or infinitely many solutions. | done |
| [The determinant](web/maths.html?lab=determinant) | The area a matrix gives to the unit square, with a sign. | done |
| [Eigenvalues and eigenvectors](web/maths.html?lab=eigenvectors) | The directions a matrix only stretches. | done |
| [Least squares](web/maths.html?lab=least-squares) | Fitting the best line through data. | done |
| [Functions of two variables](web/maths.html?lab=surfaces) | Walk on a surface: gradient, tangent plane, level curves. | done |
| [Divergence and curl](web/maths.html?lab=vector-calculus) | Tracers in a flow: spreading is divergence, turning is curl. | done |
| [Double integrals](web/maths.html?lab=double-integrals) | Volume under a surface as a stack of boxes. | done |
| [Constrained optimisation](web/maths.html?lab=lagrange) | Lagrange multipliers: where ∇f is parallel to ∇g. | done |
| [Line integrals and work](web/maths.html?lab=line-integrals) | Work along a path; conservative and rotational fields. | done |

## Numerical methods

| Topic | What you do | Status |
|---|---|---|
| [Round-off and cancellation](web/numerical-methods.html?lab=round-off) | Sixteen digits, and how one subtraction can lose them all; why the order of a sum matters. | done |
| [Bisection](web/numerical-methods.html?lab=bisection) | Halve a bracket around a sign change: slow, sure, one bit per step. | done |
| [The secant method](web/numerical-methods.html?lab=secant-method) | Follow chords to the root: order 1.618 without a derivative. | done |
| [Fixed-point iteration](web/numerical-methods.html?lab=fixed-point) | x ← g(x) as a cobweb: why |g′| < 1 decides everything. | done |
| [Gaussian elimination and LU](web/numerical-methods.html?lab=gaussian-elimination) | Row operations one at a time: the multipliers fill L, the matrix becomes U, and why pivoting matters. | done |
| [Jacobi and Gauss–Seidel](web/numerical-methods.html?lab=iterative-solvers) | Iterates walking to the crossing of two lines; the spectral radius decides how fast, or whether at all. | done |
| [Conditioning](web/numerical-methods.html?lab=conditioning) | Nearly parallel lines: a small error in b becomes a big error in x, by up to the condition number κ. | done |
| [Golden-section search](web/numerical-methods.html?lab=golden-section) | Minimising without derivatives: the bracket shrinks by 0.618 per evaluation. | done |
| [Gradient descent and Newton](web/numerical-methods.html?lab=descent-newton) | Fixed steps, line searches and Newton’s method on a bowl and on Rosenbrock’s banana valley. | done |
| [Euler, Heun and RK4](web/numerical-methods.html?lab=ode-methods) | Step an oscillator forward: spirals, energy drift and symplectic methods. | done |
| [Stability and stiffness](web/numerical-methods.html?lab=ode-stability) | Explicit Euler blows up past h = 2/|λ|; implicit Euler never does. | done |
| [Order of accuracy](web/numerical-methods.html?lab=ode-order) | Error against step size on log axes: slopes 1, 2 and 4. | done |
| [Interpolation and Runge](web/numerical-methods.html?lab=interpolation) | Polynomials through samples: equispaced wiggles vs Chebyshev nodes. | done |
| [Numerical integration](web/numerical-methods.html?lab=quadrature) | Trapezoid vs Simpson: chords, parabolas, errors ∝ h² and h⁴. | done |
| [Finite differences](web/numerical-methods.html?lab=finite-differences) | Derivatives from differences: truncation meets round-off. | done |

## Probability and statistics

| Topic | What you do | Status |
|---|---|---|
| [Outcomes and events](web/probability.html?lab=events) | Two dice: events as sets of outcomes, the addition rule. | done |
| [Counting](web/probability.html?lab=counting) | Pascal’s triangle, combinations and the birthday problem. | done |
| [Conditional probability](web/probability.html?lab=conditional) | Areas of a square and a tree diagram; independence. | done |
| [Bayes’ theorem](web/probability.html?lab=bayes) | 1000 people and a screening test. | done |
| [The law of large numbers](web/probability.html?lab=law-large-numbers) | Frequencies settle to the probability, error ∝ 1/√n. | done |
| [Expected value and variance](web/probability.html?lab=expected-value) | The long-run average of a game, and its spread. | done |
| [Probability distributions](web/probability.html?lab=distributions) | Normal, uniform, exponential, Poisson, binomial: probability as area. | done |
| [The normal curve and z-scores](web/probability.html?lab=normal-curve) | Shift and squeeze any bell into the standard one: z = (x − μ)/σ, percentiles and the 68–95–99.7 rule. | done |
| [Two variables: joint, marginal, conditional](web/probability.html?lab=joint-distributions) | A cloud of (X, Y) pairs, its two shadows, a slice through it, and why Var(X + Y) needs the covariance. | done |
| [The Galton board](web/probability.html?lab=galton) | Binomial rows of pegs turning into a bell; sums of dice. | done |
| [Sample means and the CLT](web/probability.html?lab=central-limit) | Averages of anything become normal. | done |
| [Mean, median and spread](web/probability.html?lab=descriptive-stats) | What one outlier does to the mean, median, standard deviation and IQR. | done |
| [Histograms and box plots](web/probability.html?lab=histograms-boxplots) | Bin width shapes the picture; the box plot shows five numbers, and can hide two humps. | done |
| [Correlation](web/probability.html?lab=correlation) | Pearson against Spearman, Anscombe's quartet, and r ≈ 0 with a perfect relation. | done |
| [Fitting a line: least squares](web/probability.html?lab=line-fit) | Drag a line through the points; the residuals become squares, and the best line has the least total area. | done |
| [Sampling distributions](web/probability.html?lab=sampling-distribution) | Repeat the sample and the statistic varies: standard error σ/√n, for the mean, median and sd. | done |
| [Confidence intervals](web/probability.html?lab=confidence-intervals) | How often the interval catches the truth. | done |
| [The bootstrap](web/probability.html?lab=bootstrap) | Resample your one sample to get a confidence interval without a formula. | done |
| [Maximum likelihood](web/probability.html?lab=mle) | Slide the parameter to the peak of the likelihood: coin, measurements, waiting times. | done |
| [Hypothesis tests](web/probability.html?lab=hypothesis-tests) | α, p-value and power. | done |
| [z and t tests](web/probability.html?lab=z-and-t-tests) | One-sample, two-sample and paired t tests; why small samples need t's fat tails. | done |
| [p-values, power and p-hacking](web/probability.html?lab=p-values-power) | Hundreds of experiments: p is uniform under H₀, piles up near 0 with an effect; test 20 outcomes and something always 'works'. | done |
| [Chi-square goodness of fit](web/probability.html?lab=chi-square-gof) | Is this die fair? Observed against expected counts, and Mendel's peas. | done |
| [Chi-square test of independence](web/probability.html?lab=chi-square-independence) | Does the outcome depend on the treatment? A 2 × 3 table, expected counts and Cramér's V. | done |
| [ANOVA](web/probability.html?lab=anova) | Several group means at once: variation between groups against within, the F ratio. | done |
| [Rank tests (Mann–Whitney)](web/probability.html?lab=rank-tests) | One wild value wrecks the t test; ranks do not care. | done |
| [Regression inference](web/probability.html?lab=regression-inference) | Confidence and prediction bands, the slope test, residual plots and R². | done |
| [Bayesian updating](web/probability.html?lab=bayesian-update) | Prior × likelihood → posterior, flip by flip; credible against confidence intervals. | done |
| [Random walks](web/probability.html?lab=random-walk) | Coin-flip walks spread as √n; Monte Carlo π by darts. | done |
| [Markov chains](web/probability.html?lab=markov-chains) | A walker hopping between states with fixed odds: the long-run share of time in each settles to the stationary distribution. | done |
| [Monte Carlo: areas and π](web/probability.html?lab=monte-carlo-area) | Random points estimate an area. | done |
| [How fast Monte Carlo converges](web/probability.html?lab=monte-carlo-error) | Error ∝ 1/√N, whatever the dimension. | done |
| [Buffon’s needle](web/probability.html?lab=buffon) | Needles on a ruled floor estimate π. | done |
| [Importance sampling](web/probability.html?lab=importance-sampling) | Sample where the function matters. | done |

## Physics

| Topic | What you do | Status |
|---|---|---|
| [Adding forces](web/physics.html?lab=forces) | Add forces tip to tail: the resultant, and equilibrium when they cancel. | done |
| [Newton’s laws and friction](web/physics.html?lab=newtons-laws) | A block on a slope: free-body diagram, static and kinetic friction, a pulley. | done |
| [Projectile motion](web/physics.html?lab=kinematics) | A thrown ball: launch angle, range, height, and what air drag changes. | done |
| [Circular motion](web/physics.html?lab=circular-motion) | Uniform motion on a circle: speed, angular speed and centripetal acceleration. | done |
| [Work and energy](web/physics.html?lab=work-energy) | A bead on a track trades potential for kinetic energy; loop the loop without falling. | done |
| [Friction turns energy into heat](web/physics.html?lab=friction-energy) | Each swing climbs less high: kinetic + potential + heat stays constant. | done |
| [Momentum and collisions](web/physics.html?lab=momentum) | Two carts collide: momentum always survives, kinetic energy not always. | done |
| [Torque](web/physics.html?lab=torque) | Turn a lever: force, lever arm and angle. | done |
| [Rolling and moment of inertia](web/physics.html?lab=rolling) | Sphere, disc, shell and hoop race down a slope; a falling mass spins a spool. | done |
| [Angular momentum](web/physics.html?lab=angular-momentum) | A skater pulls in their arms and spins faster: L = Iω stays, the energy does not. | done |
| [Buoyancy](web/physics.html?lab=fluids) | A block in a liquid bobs and settles where buoyancy equals weight. | done |
| [Simple harmonic motion](web/physics.html?lab=oscillations) | A mass on a spring: period, amplitude and energy going back and forth. | done |
| [Damped oscillations](web/physics.html?lab=damping) | Friction drains the swing: underdamped, critical and overdamped. | done |
| [Driven oscillations and resonance](web/physics.html?lab=resonance) | A periodic push: amplitude and phase lag against drive frequency. | done |
| [The pendulum](web/physics.html?lab=pendulum) | Small and large swings, the exact period, friction and pushing in rhythm. | done |
| [Coupled oscillators](web/physics.html?lab=coupled-oscillators) | Two masses joined by a spring swap their energy back and forth: normal modes and beats. | done |
| [Normal modes of a chain](web/physics.html?lab=normal-modes) | N beads on springs: N modes, their shapes and frequencies. | done |
| [Travelling waves](web/physics.html?lab=waves) | A wave on a string: wavelength, frequency, speed, and a single pulse. | done |
| [Superposition and beats](web/physics.html?lab=wave-superposition) | Two waves on one string add up: cancellation, standing waves and beats. | done |
| [Standing waves](web/physics.html?lab=standing-waves) | Modes of a string fixed at both ends: nodes, antinodes and harmonics. | done |
| [Doppler effect and shock waves](web/physics.html?lab=doppler) | A moving source squeezes its waves ahead; faster than the waves, a Mach cone. | done |
| [Kinetic theory of gases](web/physics.html?lab=thermodynamics) | Atoms in a box: pressure from wall impacts, temperature as speed, Maxwell–Boltzmann. | done |
| [Isothermal and adiabatic processes](web/physics.html?lab=gas-processes) | Squeeze a gas slowly with the walls held at T, or insulated: p–V paths and heating. | done |
| [Heat engines and efficiency](web/physics.html?lab=heat-engines) | Carnot and Otto cycles on the p–V diagram: heat in, heat out, net work. | done |
| [Entropy and the T–S diagram](web/physics.html?lab=entropy-ts) | Heat as area under T(S): why the Carnot rectangle is the best engine. | done |
| [Heat conduction](web/physics.html?lab=heat-conduction) | Fourier’s law in a rod: the steady straight line, a spreading hot spot, copper joined to wood. | done |
| [Field of a point charge](web/physics.html?lab=electrostatics) | Field lines, |E| and the potential around a single charge. | done |
| [Dipoles and charge pairs](web/physics.html?lab=dipole) | Superposition: opposite and like charges, dipoles and a quadrupole. | done |
| [Gauss’s law](web/physics.html?lab=gauss-law) | The flux through a closed surface counts only the charge inside. | done |
| [Magnetic field of currents](web/physics.html?lab=magnetic-field) | A loop and a solenoid: field lines, B on the axis. | done |
| [No magnetic charge: Gauss’s law for B](web/physics.html?lab=gauss-magnetism) | Flux of B through any closed surface round a magnet is zero; compare a charge | done |
| [Ampère’s law](web/physics.html?lab=ampere-law) | ∮B·dl round any loop equals μ₀ times the current through it | done |
| [Cyclotron motion](web/physics.html?lab=charged-particle) | A charge in a magnetic field: circles at the cyclotron frequency, helices along B. | done |
| [E×B drift](web/physics.html?lab=exb-drift) | Add an electric field: drift across both fields, or acceleration along B. | done |
| [Moving magnet and Lenz’s law](web/physics.html?lab=induction) | Move a magnet through a coil: flux, EMF, Lenz’s law and magnetic braking. | done |
| [AC induction](web/physics.html?lab=ac-induction) | An alternating current in one coil drives an EMF in another: the transformer idea. | done |
| [Displacement current](web/physics.html?lab=displacement-current) | A charging capacitor: a changing E field makes B like a current | done |
| [Electromagnetic waves](web/physics.html?lab=em-wave) | E and B travelling together; reflection and standing waves. | done |
| [Refraction and total reflection](web/physics.html?lab=geometric-optics) | Snell’s law, the critical angle and total internal reflection. | done |
| [Thin lenses](web/physics.html?lab=lenses) | Converging and diverging lenses: ray diagrams, image position and magnification. | done |
| [Curved mirrors](web/physics.html?lab=mirrors) | A concave mirror: real and virtual images, the mirror equation. | done |
| [Interference](web/physics.html?lab=interference) | Two slits, two waves: bright and dark fringes. | done |
| [Single-slit diffraction](web/physics.html?lab=diffraction) | Light spreads through a slit: sinc² pattern, first zero at λ/a, the phasor chain. | done |
| [Diffraction gratings](web/physics.html?lab=grating) | N slits: sharp lines at d sin θ = mλ, and resolving two close colours. | done |

## Modern physics

| Topic | What you do | Status |
|---|---|---|
| [Time dilation and the twins](web/modern-physics.html?lab=time-dilation) | A light clock on a moving ship ticks slow; the travelling twin comes back younger. | done |
| [Spacetime diagrams](web/modern-physics.html?lab=spacetime) | Boosted axes, the light cone, and why simultaneity depends on the observer. | done |
| [The photoelectric effect](web/modern-physics.html?lab=photoelectric) | Light as photons: K_max = hf − φ, the threshold, four metals. | done |
| [Compton scattering](web/modern-physics.html?lab=compton) | X-rays bounce off electrons like billiard balls: the wavelength grows by λc(1 − cos θ). | done |
| [Matter waves: electrons through two slits](web/modern-physics.html?lab=matter-waves) | One electron at a time, the dots build an interference pattern; watch which slit, and it is gone. | done |
| [The uncertainty principle](web/modern-physics.html?lab=uncertainty) | Squeeze a wave packet in space and its momentum spreads: Δx·Δp ≥ ħ/2. | done |
| [Particle in a box](web/modern-physics.html?lab=particle-in-a-box) | Allowed energies n²h²/8mL², stationary states, and a superposition that sloshes. | done |
| [Quantum tunnelling](web/modern-physics.html?lab=tunnelling) | An electron leaks through a barrier it cannot climb, exponentially less with every nanometre. | done |
| [Hydrogen spectrum](web/modern-physics.html?lab=atomic-spectra) | Bohr levels and the Lyman, Balmer and Paschen series of lines. | done |
| [Binding energy, fission and fusion](web/modern-physics.html?lab=binding-energy) | The curve of binding energy per nucleon, term by term, and why energy comes from both ends. | done |
| [Radioactive decay](web/modern-physics.html?lab=radioactive-decay) | Random decays, half-life, the exponential law, and parent–daughter chains. | done |

## Flight and space

| Topic | What you do | Status |
|---|---|---|
| [Lift and drag](web/flight-and-space.html?lab=flight) | Level flight of a light aircraft: angle of attack, lift curve and drag polar. | done |
| [How an airfoil lifts](web/flight-and-space.html?lab=airfoil-lift) | Flow and pressure round a Joukowski airfoil: suction on top, camber, the Kutta condition, and no equal transit time. | done |
| [The standard atmosphere](web/flight-and-space.html?lab=standard-atmosphere) | Temperature, pressure, density and the speed of sound with altitude | done |
| [The stall](web/flight-and-space.html?lab=stall) | Past the critical angle of attack the flow separates and lift collapses. | done |
| [Drag polar and power curves](web/flight-and-space.html?lab=drag-polar) | Friction against induced drag, the best L/D speed, power needed against power available. | done |
| [Turning flight and load factor](web/flight-and-space.html?lab=turns) | Banked turns: load factor, turn radius and a higher stall speed. | done |
| [Gliding and the sink polar](web/flight-and-space.html?lab=gliding) | Best glide, minimum sink, and the speed to fly into a headwind | done |
| [Static stability](web/flight-and-space.html?lab=static-stability) | Centre of gravity against neutral point: the pitching-moment slope, trim, and what a gust does. | done |
| [Take-off and landing](web/flight-and-space.html?lab=takeoff-landing) | The ground roll: thrust, drag and wheel friction; weight, altitude, headwind and runway surface. | done |
| [Range: the Breguet equation](web/flight-and-space.html?lab=range-endurance) | How far a jet flies: speed, L/D, engine and fuel | done |
| [Gravitational field](web/flight-and-space.html?lab=gravity-field) | The field of two masses, arrow by arrow. | done |
| [Newton’s cannon and escape speed](web/flight-and-space.html?lab=newtons-cannon) | Fire faster: fall back, circle, ellipse, escape | done |
| [Kepler orbits](web/flight-and-space.html?lab=orbits) | Circular and elliptical orbits: speed, period, geostationary and Molniya. | done |
| [Kepler’s first and second laws](web/flight-and-space.html?lab=kepler-laws) | Ellipses with the Sun at a focus; equal areas in equal times | done |
| [Kepler’s third law](web/flight-and-space.html?lab=kepler-third) | T² ∝ a³ for the eight planets, and weighing a star | done |
| [Inclination and ground tracks](web/flight-and-space.html?lab=ground-tracks) | A tilted orbit over a turning Earth: polar, retrograde, the ISS track. | done |
| [Earth’s bulge (J2)](web/flight-and-space.html?lab=orbit-perturbations) | The equatorial bulge turns the orbit plane: sun-synchronous orbits. | done |
| [Orbital transfers](web/flight-and-space.html?lab=orbital-transfers) | Hohmann and bi-elliptic transfers, Δv and the rocket equation. | done |
| [Hohmann against bi-elliptic](web/flight-and-space.html?lab=hohmann-vs-bielliptic) | When three burns beat two: the 11.94 and 15.58 radius ratios, and the time it costs. | done |
| [Plane changes](web/flight-and-space.html?lab=plane-change) | Turning an orbit costs 2v sin(Δi/2): do it slow, at apoapsis, and combine it with a burn. | done |
| [Rendezvous](web/flight-and-space.html?lab=rendezvous) | Relative motion near the ISS (Clohessy–Wiltshire): speed up to fall behind, and a two-burn rendezvous. | done |
| [Lagrange points](web/flight-and-space.html?lab=lagrange-points) | The rotating two-body potential and its five equilibria. | done |
| [Gravity assist](web/flight-and-space.html?lab=gravity-assist) | A flyby turns the velocity; seen from the Sun the craft speeds up or slows down | done |
| [Escape to the planets](web/flight-and-space.html?lab=escape-and-c3) | Patched conics: v∞ from a Hohmann round the Sun, C3, the escape burn and the Oberth effect. | done |
| [The rocket equation](web/flight-and-space.html?lab=rocket-equation) | Δv = Isp g₀ ln(m₀/m_f) during a burn | done |
| [Staging](web/flight-and-space.html?lab=staging) | Why rockets drop empty stages, and how much payload each choice carries | done |
| [Launch: gravity turn and losses](web/flight-and-space.html?lab=gravity-turn) | Pitch kick, gravity loss, drag loss and max-Q on the way up | done |
| [Atmospheric entry](web/flight-and-space.html?lab=reentry) | Deceleration, heating and the entry corridor, with or without lift | done |

## Robotics

| Topic | What you do | Status |
|---|---|---|
| [Rotation matrices](web/robotics.html?lab=rotation-matrices) | Elementary rotations; the columns are the new axes | done |
| [Composing rotations](web/robotics.html?lab=composing-rotations) | Current frame or fixed frame: the order of the product | done |
| [Euler angles and roll–pitch–yaw](web/robotics.html?lab=euler-angles) | ZYZ and RPY, and the gimbal-lock singularity | done |
| [Axis–angle and quaternions](web/robotics.html?lab=quaternions) | Unit quaternions and the orientation error used by CLIK | done |
| [Homogeneous transforms](web/robotics.html?lab=homogeneous-transforms) | Rotation and translation in one 4×4 matrix | done |
| [A planar arm](web/robotics.html?lab=planar-arm) | Forward kinematics and the reachable workspace | done |
| [Denavit–Hartenberg convention](web/robotics.html?lab=dh-convention) | Four numbers per link, chained into the forward kinematics | done |
| [A 7-joint arm: Kinova Jaco2](web/robotics.html?lab=jaco2-arm) | The course project’s robot: DH table, home posture, redundancy | done |
| [Inverse kinematics](web/robotics.html?lab=inverse-kinematics) | Elbow up and elbow down, and targets out of reach | done |
| [The Jacobian and singularities](web/robotics.html?lab=robot-jacobian) | Tip velocity from joint speeds; the manipulability ellipse | done |
| [Statics: τ = Jᵀ F](web/robotics.html?lab=statics-duality) | Joint torques for a tip force, and the force ellipse | done |
| [Closed-loop inverse kinematics](web/robotics.html?lab=clik) | Tracking the project’s square with J⁺, Jᵀ or damped least squares | done |
| [Redundancy and the null space](web/robotics.html?lab=redundancy) | A spare joint pursues a second goal without moving the tip | done |
| [Trapezoidal velocity profile](web/robotics.html?lab=trapezoidal-profile) | Accelerate, cruise, brake: the admissible cruise speeds | done |
| [Cubic and quintic trajectories](web/robotics.html?lab=polynomial-trajectories) | Smoothness up to the acceleration, compared with the trapezoid | done |
| [Robot dynamics](web/robotics.html?lab=robot-dynamics) | B(q)q̈ + C q̇ + g = τ on a free two-link arm | done |
| [PD control with gravity compensation](web/robotics.html?lab=pd-gravity) | Set-point regulation, and the sag without ĝ | done |
| [Computed torque](web/robotics.html?lab=computed-torque) | Inverse dynamics cancels the arm’s dynamics, if the model is right | done |
| [Impedance control](web/robotics.html?lab=impedance-control) | Pushing into a wall with a bounded, chosen force | done |

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

## Structural mechanics

| Topic | What you do | Status |
|---|---|---|
| [The tensile test](web/structural-mechanics.html?lab=tensile-test) | Elastic, yield, hardening, necking, fracture — and unloading. | done |
| [Mohr’s circle](web/structural-mechanics.html?lab=mohr-circle) | Plane stress on a rotating element; principal stresses and maximum shear. | done |
| [Stress concentration and fatigue](web/structural-mechanics.html?lab=stress-concentration) | The stress triples beside a hole, and a few times the stress can cut the fatigue life by orders of magnitude. | done |
| [Simply supported beam](web/structural-mechanics.html?lab=simply-supported) | Reactions, shear and moment diagrams, and the deflected shape. | done |
| [Cantilever](web/structural-mechanics.html?lab=cantilever) | One support, a moment at the wall, the tip droops. | done |
| [Cross sections](web/structural-mechanics.html?lab=cross-section) | Second moment, the neutral axis, and why beams are shaped like an I. | done |
| [A statically indeterminate beam](web/structural-mechanics.html?lab=propped-cantilever) | One support too many for statics: compatibility finds the reaction, and the beam is stiffer for it. | done |
| [Torsion of shafts](web/structural-mechanics.html?lab=torsion) | Shear stress grows from zero at the centre to the surface: why tubes carry torque so well. | done |
| [Trusses: the method of joints](web/structural-mechanics.html?lab=trusses) | Every member only pulls or pushes: forces from equilibrium at each joint, tension and compression in colour. | done |
| [Buckling of columns](web/structural-mechanics.html?lab=buckling) | Euler's load, end conditions, slenderness and imperfections. | done |
