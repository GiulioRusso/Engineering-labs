# ⚙️ Engineering Scripts

**Interactive 3D labs for physics and engineering.** Drag something in the scene and watch the law at
work: pull a magnet through a coil and see the flux, the EMF and the induced current respond live, with
Lenz's law drawn in the scene and the equations one click away.

<p align="center">
  <img src="labs/web/media/coil-induction.gif" width="85%" alt="Coil and induction lab: a magnet pushed into a coil, with field lines and live EMF plots">
</p>

## ▶️ How to open

Clone or download the repository, then double-click **`labs/web/index.html`**. That's all: no install, no
server, no internet connection. Every lab is a single self-contained HTML file and works offline in Chrome,
Firefox and Safari.

## 🧪 Labs

| Lab | What you do | Open |
|---|---|---|
| **Coil: magnetic field and induction** | Drag a bar magnet or a probe ring through a coil. Watch the field lines, the flux, the EMF and the induced current, then drop the magnet and see it braked. | [`labs/web/coil-induction.html`](labs/web/coil-induction.html) |

38 more are planned, from point charges and antennas to orbits, control and ML: see
[`labs/TOPICS.md`](labs/TOPICS.md).

Each lab has scenarios, sliders, draggable objects, linked 2D plots, live readouts with the physical
invariants that prove the picture honest, an *Explain* drawer with the theory, and a guided tour.

## 🔨 How to build

Only needed if you change a lab's source. The built pages are committed.

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

* `labs/` → the 3D labs: `src/` (source), `web/` (built pages, open these), `tools/` (tests, smoke, capture).
* `visualizations/` → the algorithm and electronics visualizers.
* `legacy/` → the frozen notebooks and their `requirements.txt`.
* `doc/` → images for this README.
