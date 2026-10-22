// Gray Code — One Bit Changes at a Time
//
// Ordinary binary can change several bits in the same step (011 -> 100
// changes three): in a real circuit those bits don't switch at the exact
// same instant, and the transient state read mid-switch is garbage. Gray
// code guarantees exactly one bit changes per step, eliminating that problem
// by construction: g = n XOR (n >> 1).
#include <string>
#include <vector>
#include "../tracer/tracer.hpp"
#include "../sim/waves.hpp"
#include "../sim/circuit.hpp"

static Tracer T("gray_counter", "Gray Code", "Counters", __FILE__);
static const int NBITS = 4;

static std::vector<int> bits(int n) {
    std::vector<int> b(NBITS);
    for (int i = 0; i < NBITS; i++) b[i] = (n >> i) & 1;
    return b;
}

static int flipCount(const std::vector<int>& a, const std::vector<int>& b) {
    int c = 0;
    for (int i = 0; i < NBITS; i++) if (a[i] != b[i]) c++;
    return c;
}

int main() {
    T.view("array").complexity("O(1) per step", "XOR + shift");
    T.panel("schematic", "Binary → Gray converter");
    T.panel("waveform", "Gray bits over the count");
    T.panel("table", "Bits that change: binary vs Gray");
    Schematic sch;
    for (int i = 0; i < NBITS; i++) sch.pin("b" + std::to_string(i), 0.0, 0.4 + 0.8 * (NBITS - 1 - i), "left");
    for (int i = 0; i < NBITS - 1; i++) {
        std::string g = "x" + std::to_string(i);
        sch.gate(g, "XOR", 2.4, 0.8 + 0.8 * (NBITS - 2 - i));
        sch.wire("b" + std::to_string(i), g + ".b"); sch.wire("b" + std::to_string(i + 1), g + ".a");
        sch.pin("g" + std::to_string(i), 4.4, 0.8 + 0.8 * (NBITS - 2 - i), "right"); sch.wire(g, "g" + std::to_string(i));
    }
    sch.pin("g3", 4.4, 0.0, "right"); sch.wire("b3", "g3");
    std::vector<std::vector<int>> gh(NBITS, std::vector<int>(16));
    for (int n = 0; n < 16; n++) for (int i = 0; i < NBITS; i++) gh[i][n] = ((n ^ (n >> 1)) >> i) & 1;
    Waves W;
    for (int i = NBITS - 1; i >= 0; i--) W.add("g" + std::to_string(i), "out", gh[i]);

    std::vector<int> reg = bits(0);
    T.clearWatches();
    T.watchVector("gray", reg);

    T.input("0 .. 15 in Gray code");
    std::vector<int> prevBin = bits(0), prevGray = bits(0);
    for (int n = 0; n <= 15; n++) {
        int g = n ^ (n >> 1);
        reg = bits(g);
        std::vector<int> binNow = bits(n);
        int binFlips = n > 0 ? flipCount(prevBin, binNow) : 0;
        int grayFlips = n > 0 ? flipCount(prevGray, reg) : 0;
        T.at(__LINE__, __func__)
         .vars({{"n", n}, {"gray", g}, {"bits_changed_binary", binFlips}, {"bits_changed_gray", grayFlips}})
         .table("n=" + std::to_string(n), {{"binary", binFlips}, {"gray", grayFlips}})
         .waveState(W.json(n))
         .circuitState([&] { std::map<std::string, int> v; for (int i = 0; i < NBITS; i++) { v["b" + std::to_string(i)] = binNow[i]; v["g" + std::to_string(i)] = reg[i]; if (i < NBITS - 1) v["x" + std::to_string(i)] = reg[i]; } return sch.json(v); }())
         .note("g = " + std::to_string(n) + " XOR (" + std::to_string(n) + " >> 1) = " +
               std::to_string(g) + ". Ordinary binary would have changed " + std::to_string(binFlips) +
               " bits here, Gray changes " + std::to_string(grayFlips) + ".")
         .emit();
        prevBin = binNow;
        prevGray = reg;
    }

    T.dump("traces/gray_counter.js");
}
