<p align="center">
  <img src="docs/logo.svg" width="96" alt="Engineering Labs logo">
</p>

<h1 align="center">Engineering Labs</h1>

**Interactive tutorials for engineering subjects.** Every topic is a visual experiment: drag magnets, step through C++ code, or tune filters—with deep explanations one click away.

<p align="center">
  <img src="web/media/induction.png" width="85%" alt="Interactive Induction Lab">
</p>

**Author:** Giulio Russo · [GitHub](https://github.com/GiulioRusso) · [LinkedIn](https://www.linkedin.com/in/giuliorusso)

## 🚀 Quick Start

```bash
git clone https://github.com/GiulioRusso/engineering-labs.git
cd engineering-labs
```

Open **`index.html`** in any browser. Catalogue self-contained, runs offline.

## 📚 Subjects

| Subject | Entry | Key Topics |
|---|---|---|
| **Maths** | [`web/maths.html`](web/maths.html) | Calculus, Linear Algebra, Differential Equations, Complex Analysis |
| **Probability & Stats** | [`web/probability.html`](web/probability.html) | Distributions, Bayes, Monte Carlo, Hypothesis Testing |
| **Physics** | [`web/physics.html`](web/physics.html) | Mechanics, EM, Optics, Thermodynamics, Orbital Motion |
| **Circuits** | [`web/circuits.html`](web/circuits.html) | RLC, Phasors, Impedance, AC Power, Filter Design |
| **Analog Electronics** | [`web/analog-electronics.html`](web/analog-electronics.html) | BJTs, MOSFETs, Op-Amps, Feedback, CMOS |
| **Digital Electronics** | [`web/digital-electronics.html`](web/digital-electronics.html) | Logic Gates, FSMs, Counters, Timing Analysis |
| **Computer Science** | [`web/computer-science.html`](web/computer-science.html) | Algorithms, Data Structures, CPU Scheduling (Real C++) |
| **Signal Theory** | [`web/signal-theory.html`](web/signal-theory.html) | Fourier, Sampling, LTI Systems, Modulation, IQ |
| **Control Systems** | [`web/control-systems.html`](web/control-systems.html) | PID, Root Locus, Bode/Nyquist, Stability |
| **Electronic Warfare** | [`web/electronic-warfare.html`](web/electronic-warfare.html) | Pulse Compression, Radar Eq, Jamming, Doppler |
| **Machine Learning** | [`web/machine-learning.html`](web/machine-learning.html) | Neural Nets, Optimizers, Loss Surfaces, Generalization |

Full list: [`docs/TOPICS.md`](docs/TOPICS.md).

## ⚙️ How it Works

- **Interactive Cases:** Switch between guided examples and a "Free" mode for full control.
- **Contextual Help:** Click **?** for formulas, plain-language theory, and common pitfalls.
- **Precision:** Every axis is labeled with units. Play-bars appear only for time-evolving systems.
- **Shareable:** The URL reflects the exact state of the lab.

## 🛠 Development

Built pages are committed. To rebuild:

```bash
npm install
npm test          # Model verification
npm run build     # Source → web/
npm run smoke     # Headless validation of all cases
```

For C++ traces (CS/Digital), edit `tracer/`, run local `./build.sh`, then `npm run build`.

Guide: [`docs/GUIDE.md`](docs/GUIDE.md).

## 📂 Structure

```
index.html    Catalogue entry point
web/          Built pages & media
src/          Source (Models, Labs, Explanations)
tracer/       C++ trace recording & rendering
tools/        Testing & build utilities
docs/         Technical guide & topic registry
```
