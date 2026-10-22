// D Latch Transparency — Why It's "Level-Sensitive"
//
// As long as EN=1 the latch is transparent: Q copies D instant by instant,
// even several times within the same enable pulse. Only when EN falls does Q
// latch onto the last value seen. This — sensitive to the LEVEL of EN, not
// one of its edges — is what tells a latch apart from a flip-flop.
#include <string>
#include <vector>
#include "../tracer/tracer.hpp"
#include "../sim/logic.hpp"
#include "../sim/circuit.hpp"
#include "../sim/waves.hpp"

static Tracer T("d_latch_transparency", "Transparency", "Latches", __FILE__);
static const int N = 24;

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

int main() {
    T.view("waveform").complexity("level-sensitive", "4 NAND");
    T.panel("schematic", "Circuit");

    std::vector<int> D(N, 0), EN(N, 0), Qv(N);
    for (int t : {2, 3, 4, 5, 6, 7}) EN[t] = 1;
    for (int t : {14, 15, 16, 17}) EN[t] = 1;
    for (int t : {3, 4, 8, 9, 15, 16, 20, 21}) D[t] = 1;

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
    T.input("D changes both inside and outside the EN pulse");
    for (int t = 0; t < N; t++) {
        T.at(__LINE__, __func__)
         .vars({{"t", t}, {"D", D[t]}, {"EN", EN[t]}, {"Q", Qv[t]}})
         .waveState(W.json(t))
         .circuitState(sch.json({{"D", D[t]}, {"EN", EN[t]}, {"g1", NAND(D[t], EN[t])}, {"g2", NAND(NAND(D[t], EN[t]), EN[t])}, {"g3", Qv[t]}, {"g4", 1 - Qv[t]}, {"Q", Qv[t]}, {"Qb", 1 - Qv[t]}}))
         .note(EN[t] ? "EN=1: transparent, Q follows D = " + std::to_string(D[t]) + "."
                     : "EN=0: latched, Q stays " + std::to_string(Qv[t]) +
                       " no matter what D does.")
         .emit();
    }

    T.dump("traces/d_latch_transparency.js");
}
