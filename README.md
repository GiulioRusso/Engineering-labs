# ⚙️ Engineering Scripts

**Interactive 3D labs for physics and engineering.** Drag something in the scene and watch the law at
work: pull a magnet through a coil and see the flux, the EMF and the induced current respond live, with
Lenz's law drawn in the scene and the equations one click away.

<p align="center">
  <img src="labs/web/media/induction.gif" width="85%" alt="Coil and induction lab: a magnet pushed into a coil, with field lines and live EMF plots">
</p>

## ▶️ How to open

Clone or download the repository, then double-click **`index.html`** at the top of the folder (on a Mac
you can also run `open index.html`). It opens the catalogue: one card per subject, and a search box over every topic.

**One file per subject**, holding all its topics:

| Subject | Open this file | Topics |
|---|---|---|
| Maths | [`labs/web/maths.html`](labs/web/maths.html) | functions and transformations · polynomials · limits · curve sketching · Newton's method · trigonometry, triangles, polar curves · conic sections · complex numbers, Euler's formula, complex functions · calculus and its applications · sequences and series · differential equations · vectors · matrices, linear systems, determinant, eigenvectors, least squares · functions of two variables · double and line integrals · Lagrange multipliers · divergence and curl · probability, distributions, Bayes, central limit theorem, random walks |
| Physics | [`labs/web/physics.html`](labs/web/physics.html) | motion · momentum · forces · buoyancy · oscillations · waves · gravitational field · gas and heat · rays · interference · electric charges · magnetic field · induction · charges in E and B · EM waves · flight · orbits · orbital transfers · Lagrange points |
| Control systems | [`labs/web/control-systems.html`](labs/web/control-systems.html) | time response · poles and stability · steady-state error · root locus · PID · Bode · Nyquist and margins · lead/lag compensation |
| Signal theory | [`labs/web/signal-theory.html`](labs/web/signal-theory.html) | pulses and spectra · time–bandwidth · Fourier series and Gibbs · DFT as winding · FFT · leakage and windows · sampling and aliasing · convolution · LTI systems and poles · filtering and FIR design · spectral analysis and frequency estimation · AM/FM/PM · PSK/QAM, BER, eye diagram, Shannon · IQ demodulation · dipoles · phased arrays · polarization · transmission lines and waveguides · fibres · Vivaldi · links and propagation · Yagi and patch |
| Electronic warfare | [`labs/web/electronic-warfare.html`](labs/web/electronic-warfare.html) | pulse echo and range resolution · pulse trains and RTI · waveforms (chirp, Barker) and pulse compression · Doppler and the range–Doppler map · receivers and IQ · phased arrays, FDTD, pointing, lobing, search · airborne radar and ground clutter · radar equation · detection · MTI · PPI · jamming and burn-through |
| Analog electronics | [`labs/web/analog-electronics.html`](labs/web/analog-electronics.html) | diodes, rectifiers, Zener · BJT and MOSFET (with a 3D view) · transconductance · bias point · small-signal model · current mirror · common emitter · emitter follower · differential pair · Miller effect · negative feedback · cascading · op-amps: virtual short, finite gain, bandwidth and slew, offset, stability, Sallen-Key · CMOS inverter, noise margins, delay, power, latch |
| Computer science | [`visualizations/algorithm-visualization/web/index.html`](visualizations/algorithm-visualization/web/index.html) | the Algorithm Visualizer |
| Digital electronics | [`visualizations/electronics-visualization/web/index.html`](visualizations/electronics-visualization/web/index.html) | the Electronics Visualizer |

The other subjects (circuits, machine learning) are planned; they will appear as `labs/web/<subject>.html` in the same way. No install, no server,
no internet connection.

## 🧪 How a topic works

Pick a topic in the left bar (drag its edge to resize, ‹ to hide it). On the right: the **cases** of the topic as tabs (e.g. Line,
Parabola…), then **Free** (every control, full explanation) and **examples** that each show one idea
(e.g. *At 90°: a·b = 0*) with only its own controls and explanation (**?**). **View** is folded at the
bottom. In the scene: things to drag, live readouts (✓ when a physical check holds), a play bar.

The full map, including planned topics, is in [`labs/TOPICS.md`](labs/TOPICS.md).

## 🔨 How to build

Only needed if you change an animation's source. The built pages are committed, and everything needed to
rebuild them is in the repository: the source (`labs/src/<subject>/<lab>/`), the shared library
(`labs/src/lib/`), the build script and exact dependency versions (`labs/package-lock.json`). A fresh
clone rebuilds byte-identical pages.

```bash
cd labs
npm install
npm test          # physics tests
npm run build     # src/ → web/
npm run smoke     # headless-Chrome check of every page
```

Architecture, lab anatomy, testing rules and how to add a lab: [`labs/GUIDE.md`](labs/GUIDE.md).

## 🎞️ Visualizers

Two step-by-step animated players for discrete topics, also openable by double-click:

* [`visualizations/algorithm-visualization/`](visualizations/algorithm-visualization/) → **Algorithm Visualizer**: the whole *Algorithms and Data Structures* programme, traced from real C++. Docs: [GUIDE.md](visualizations/algorithm-visualization/GUIDE.md).
* [`visualizations/electronics-visualization/`](visualizations/electronics-visualization/) → **Electronics Visualizer**: digital logic circuits, gate by gate.

## 📂 Repository structure

* `index.html` → the launcher: double-click it.
* `labs/` → the animations: `catalog.json` (the subject → topic map), `src/<subject>/<lab>/` (source), `web/<subject>.html` (built pages, one per subject), `tools/` (tests, smoke, capture).
* `visualizations/` → the algorithm and electronics visualizers.
* `legacy/` → archive, not part of the labs.
* `doc/` → images for this README.
