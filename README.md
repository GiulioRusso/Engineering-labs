# ⚙️ Engineering Scripts

**Interactive Jupyter notebooks for exploring STEM concepts** — signal theory, control systems, circuits, electronics, computer science, machine learning, maths and physics. Every notebook pairs a short theory section with matplotlib + ipywidgets demos you can play with.

<p align="center">
  <img src="doc/phased_array.gif" width="75%" alt="Phased array beam steering">
</p>

## 📚 Topics

| Topic | Notebooks | Covers |
|---|---|---|
| [Analog electronics](notebooks/README.md#analog-electronics) | 4 | Transistors, amplifiers, op-amps, CMOS |
| [Circuits](notebooks/README.md#circuits) | 5 | Components, network theory, AC steady state, telecom circuits, antennas |
| [Computer science](notebooks/README.md#computer-science) | 11 | Complexity, arrays, lists, trees, heaps, graphs, scheduling, synchronization |
| [Control systems](notebooks/README.md#control-systems) | 9 | Time response, stability, Bode, Nyquist, Nichols, root locus, PID |
| [Digital electronics](notebooks/README.md#digital-electronics) | 10 | Logic gates, adders, latches, flip-flops, counters, registers, FSM, ALU, memory |
| [Electronic warfare](notebooks/README.md#electronic-warfare) | 5 | Radar pulses, receivers, radar systems, EW scenarios |
| [Machine learning](notebooks/README.md#machine-learning) | 4 | Neurons to CNNs, layers, loss functions, generalization |
| [Maths](notebooks/README.md#maths) | 6 | Functions, trigonometry, complex numbers, calculus, linear algebra |
| [Physics](notebooks/README.md#physics) | 9 | Motion, forces, thermodynamics, optics, electromagnetism, flight, orbits, rockets |
| [Signal theory](notebooks/README.md#signal-theory) | 17 | Signals, Fourier, sampling, convolution, LTI, filtering, modulation, antennas |

The full per-notebook index, with an *Open in Colab* badge for each, is in [notebooks/README.md](notebooks/README.md).

## ⚙️ How to run

ipywidgets don't render on GitHub: the page shows one static figure per notebook. To use the sliders, run the notebook.

**JupyterLab (local):**

```bash
python -m venv venv
source venv/bin/activate   # Linux / macOS
venv\Scripts\activate      # Windows

pip install -r requirements.txt
jupyter lab notebooks/
```

**Colab:** click the badge next to any notebook in [notebooks/README.md](notebooks/README.md).

## 🎞️ Visualizers

Two step-by-step animated players, separate from the notebooks. C++ code runs at build time and records traces; a vanilla HTML/JS player replays them. No dependencies: open `web/index.html` by double-clicking it.

* [`visualizations/algorithm-visualization/`](visualizations/algorithm-visualization/) → **Algorithm Visualizer**: the whole *Algorithms and Data Structures* programme. Docs: [GUIDE.md](visualizations/algorithm-visualization/GUIDE.md).
* [`visualizations/electronics-visualization/`](visualizations/electronics-visualization/) → **Electronics Visualizer**: digital logic circuits, gate by gate.

## 📂 Repository structure

* `notebooks/<topic>/` → the notebooks, one folder per topic.
* `visualizations/` → the web visualizers.
* `doc/` → images for this README.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
