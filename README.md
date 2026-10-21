# ⚙️ Engineering Scripts

**Interactive 3D labs for physics and engineering.** Drag something in the scene and watch the law at
work: pull a magnet through a coil and see the flux, the EMF and the induced current respond live, with
Lenz's law drawn in the scene and the equations one click away.

<p align="center">
  <img src="labs/web/media/coil-induction.gif" width="85%" alt="Coil and induction lab: a magnet pushed into a coil, with field lines and live EMF plots">
</p>

## ▶️ How to open

Clone or download the repository, then double-click **`index.html`** at the top of the folder (on a Mac
you can also run `open index.html`). It opens the catalogue: one card per topic. Click one to launch it.

**One file per topic.** Each topic is a single self-contained page that holds all of its animations,
with a sidebar to switch between them:

| Topic | Open this file | Animations |
|---|---|---|
| Physics | [`labs/web/physics.html`](labs/web/physics.html) | 13 |
| Maths | [`labs/web/maths.html`](labs/web/maths.html) | 6 |
| Computer science | [`visualizations/algorithm-visualization/web/index.html`](visualizations/algorithm-visualization/web/index.html) | the Algorithm Visualizer |
| Digital electronics | [`visualizations/electronics-visualization/web/index.html`](visualizations/electronics-visualization/web/index.html) | the Electronics Visualizer |

The other topics (analog electronics, circuits, control, electronic warfare, machine learning, signal
theory) are planned; they will appear as `labs/web/<topic>.html` in the same way. No install, no server,
no internet connection.

## 🧪 What is in each animation

On the right, top to bottom: **Scenario** (start from the first, simplest one), the **controls** that
scenario uses, and a folded **View** section for what is drawn. In the scene: things to drag, live
readouts (✓ when a physical check holds), a play bar. **Theory** opens the equations.

Physics: motion and energy · forces and torque · vectors and fields · coil and induction · point
charges · charged particle in E and B · electromagnetic waves · optics bench · gas in a piston · flight ·
orbits · Lagrange points · orbital transfers.
Maths: functions · unit circle · complex numbers · derivative/integral/Taylor · linear maps · surfaces and
the gradient.

The full map, including planned animations, is in [`labs/TOPICS.md`](labs/TOPICS.md).

## 🔨 How to build

Only needed if you change an animation's source. The built pages are committed, and everything needed to
rebuild them is in the repository: the source (`labs/src/<topic>/<animation>/`), the shared library
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
* `labs/` → the animations: `catalog.json` (the topic → animation map), `src/<topic>/<animation>/` (source), `web/<topic>.html` (built pages, one per topic), `tools/` (tests, smoke, capture).
* `visualizations/` → the algorithm and electronics visualizers.
* `legacy/` → archive, not part of the labs.
* `doc/` → images for this README.
