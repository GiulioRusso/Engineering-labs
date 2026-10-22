// The Glitch That Survives — Why Transparency Is Dangerous
//
// A very brief pulse on D, entirely inside the window where EN=1, gets
// copied onto Q just like any other value — the latch has no way to tell a
// "real" data change from a one-instant disturbance apart. If the same pulse
// arrived while EN was already low, Q would never see it: the difference is
// all in the timing, not in the latch itself.
#include <string>
#include <vector>
#include "../tracer/tracer.hpp"
#include "../sim/logic.hpp"
#include "../sim/circuit.hpp"
#include "../sim/waves.hpp"

static Tracer T("latch_glitch", "The Glitch That Survives", "Latches", __FILE__);
static const int N = 20;

static Schematic dLatch() {
    Schematic S;
    S.gate("g1", "NAND", 1.6, 0.5);   // Sb = NAND(D, EN)
    S.gate("g2", "NAND", 1.6, 1.5);   // Rb = NAND(g1, EN)
    S.gate("g3", "NAND", 3.8, 0.8);   // Q  = NAND(g1, g4)
    S.gate("g4", "NAND", 3.8, 2.0);   // Qb = NAND(g2, g3)
    S.pin("D", 0.0, 0.3, "left");
    S.pin("EN", 0.0, 1.7, "left");
    S.wire("D", "g1.a");
    S.wire("EN", "g1.b");
    S.wire("g1", "g2.a");
    S.wire("EN", "g2.b");
    S.wire("g1", "g3.a");
    S.wire("g4", "g3.b");
    S.wire("g2", "g4.a");
    S.wire("g3", "g4.b");
    S.pin("Q", 5.6, 0.8, "right");
    S.pin("Qb", 5.6, 2.0, "right");
    S.wire("g3", "Q");
    S.wire("g4", "Qb");
    return S;
}

static void settleQuiet(int D, int EN, int& Q, int& Qb) {
    int Sb = NAND(D, EN), Rb = NAND(Sb, EN);
    for (int pass = 0; pass < 6; pass++) {
        int newQ = NAND(Sb, Qb), newQb = NAND(Rb, Q);
        bool changed = (newQ != Q) || (newQb != Qb);
        Q = newQ;
        Qb = newQb;
        if (!changed) break;
    }
}

void run(const std::string& label, int glitchPos, int enFall) {
    std::vector<int> D(N, 0), EN(N, 0), Qv(N);
    for (int t = 2; t < enFall; t++) EN[t] = 1;
    D[glitchPos] = 1;

    int Q = 0, Qb = 1;
    for (int t = 0; t < N; t++) {
        settleQuiet(D[t], EN[t], Q, Qb);
        Qv[t] = Q;
    }

    Waves W;
    W.add("D", "data", D);
    W.add("EN", "data", EN);
    W.add("Q", "out", Qv);

    Schematic sch = dLatch();
    T.input(label);
    for (int t = 0; t < N; t++) {
        T.at(__LINE__, __func__)
         .vars({{"t", t}, {"D", D[t]}, {"EN", EN[t]}, {"Q", Qv[t]}})
         .waveState(W.json(t))
         .circuitState(sch.json({{"D", D[t]}, {"EN", EN[t]}, {"g1", NAND(D[t], EN[t])}, {"g2", NAND(NAND(D[t], EN[t]), EN[t])}, {"g3", Qv[t]}, {"g4", 1 - Qv[t]}, {"Q", Qv[t]}, {"Qb", 1 - Qv[t]}}))
         .note(t == glitchPos
               ? (EN[t] ? "The glitch on D arrives while EN=1: the latch is transparent and copies it onto Q."
                        : "The glitch on D arrives at EN=0: the latch is latched, it never sees it.")
               : "Q = " + std::to_string(Qv[t]) + ".")
         .emit();
    }
}

int main() {
    T.view("waveform").complexity("level-sensitive", "4 NAND");
    T.panel("schematic", "Circuit");

    run("Glitch inside the EN=1 window: survives onto Q", 6, 10);
    run("Same glitch at EN=0: latched, Q does not change", 12, 10);

    T.dump("traces/latch_glitch.js");
}
