# ⚙️ Engineering Scripts

**Interactive 3D labs for physics and engineering.** Drag something in the scene and watch the law at
work: pull a magnet through a coil and see the flux, the EMF and the induced current respond live, with
Lenz's law drawn in the scene and the equations one click away.

<p align="center">
  <img src="labs/web/media/coil-induction.gif" width="85%" alt="Coil and induction lab: a magnet pushed into a coil, with field lines and live EMF plots">
</p>

## ▶️ How to open

Clone or download the repository, then double-click **`index.html`** at the top of the folder (on a Mac
you can also run `open index.html`). It opens the catalogue: every topic of the original notebooks, each
with its animations. Click one to launch it.

No install, no server, no internet connection. Every animation is a single self-contained HTML file, so
you can also double-click it directly, e.g. `labs/web/physics/coil-induction.html`.

## 🧪 Animations, by topic

Organised exactly like the original notebooks: every notebook gets one animation (some get several).
Computer science and most of digital electronics are covered by the two step-by-step visualizers below.

| Topic | Notebooks | Animations built | Where |
|---|---|---|---|
| Analog electronics | 4 | 0 / 4 | `labs/web/analog-electronics/` |
| Circuits | 5 | 0 / 5 | `labs/web/circuits/` |
| Computer science | 11 | Algorithm Visualizer | `visualizations/algorithm-visualization/` |
| Control systems | 9 | 0 / 9 | `labs/web/control-systems/` |
| Digital electronics | 10 | Electronics Visualizer (6 of 10) | `visualizations/electronics-visualization/` |
| Electronic warfare | 5 | 0 / 5 | `labs/web/electronic-warfare/` |
| Machine learning | 4 | 0 / 4 | `labs/web/machine-learning/` |
| Maths | 6 | 0 / 6 | `labs/web/maths/` |
| Physics | 9 | 1 / 13 — [Coil: magnetic field and induction](labs/web/physics/coil-induction.html) | `labs/web/physics/` |
| Signal theory | 17 | 0 / 17 | `labs/web/signal-theory/` |

The full list, notebook by notebook, is in [`labs/TOPICS.md`](labs/TOPICS.md).

Each lab has scenarios, sliders, draggable objects, linked 2D plots, live readouts with the physical
invariants that prove the picture honest, an *Explain* drawer with the theory, and a guided tour.

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

## 📓 Legacy notebooks

The original 80 Jupyter notebooks (matplotlib + ipywidgets) are kept in
[`legacy/notebooks/`](legacy/notebooks/README.md) and tagged `notebooks-final`. They are frozen; new work
happens in `labs/`.

## 📂 Repository structure

* `index.html` → the launcher: double-click it.
* `labs/` → the animations: `catalog.json` (the topic → notebook → animation map), `src/<topic>/` (source), `web/<topic>/` (built pages), `tools/` (tests, smoke, capture).
* `visualizations/` → the algorithm and electronics visualizers.
* `legacy/` → the frozen notebooks and their `requirements.txt`.
* `doc/` → images for this README.
