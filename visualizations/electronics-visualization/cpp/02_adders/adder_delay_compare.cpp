// Ripple vs Carry-Look-Ahead — Why the Circuit's Shape Matters
//
// An n-bit ripple-carry has to wait for n cascaded carries: the delay grows
// linearly with the width. A carry-look-ahead computes every carry directly
// from the inputs with a fixed level of gates: the delay stays constant.
// Same result, different circuit shape.
#include <string>
#include "../tracer/tracer.hpp"
#include "../sim/waves.hpp"
#include "../sim/circuit.hpp"

static Tracer T("adder_delay_compare", "Ripple vs Carry-Look-Ahead", "Adders", __FILE__);

int main() {
    T.view("table").complexity("O(n)", "O(1)");
    T.panel("schematic", "Ripple-carry chain: the carry passes through every stage");
    T.panel("waveform", "When each ripple carry C1…C8 is valid, vs all CLA carries (in gate delays)");
    Schematic sch;
    sch.pin("C0", 0.0, 1.0, "left");
    for (int k = 1; k <= 8; k++) { std::string f = "fa" + std::to_string(k); sch.gate(f, "FA", 0.4 + 1.4 * k, 1.0); sch.wire(k == 1 ? "C0" : "fa" + std::to_string(k - 1), f + ".a"); }
    sch.pin("C8", 12.4, 1.0, "right"); sch.wire("fa8", "C8");
    Waves W;
    for (int k = 1; k <= 8; k++) { std::vector<int> v(18, -1); for (int t = 2 * k; t < 18; t++) v[t] = 1; W.add("C" + std::to_string(k), "out", v); }
    { std::vector<int> v(18, -1); for (int t = 4; t < 18; t++) v[t] = 1; W.add("CLA", "data", v); }
    T.input("Delay as width grows");

    const int NMAX = 8;
    for (int n = 1; n <= NMAX; n++) {
        int ripple = 2 * n;
        int cla = 4;
        auto b = T.at(__LINE__, __func__);
        b.vars({{"n", n}, {"ripple delay", ripple}, {"CLA delay", cla}});
        for (int m = 1; m <= n; m++) {
            b.table("n=" + std::to_string(m), {{"ripple", 2 * m}, {"CLA", cla}});
        }
        { std::map<std::string, int> v{{"C0", 1}, {"C8", n == 8}}; for (int k = 1; k <= 8; k++) v["fa" + std::to_string(k)] = k <= n ? 1 : 0; b.circuitState(sch.json(v, "fa" + std::to_string(n))); }
        b.waveState(W.json(2 * n));
        b.note("At " + std::to_string(n) + " bits: ripple-carry takes " + std::to_string(ripple) +
               " cascaded gate delays, carry-look-ahead takes " + std::to_string(cla) +
               " regardless of n.");
        b.emit();
    }

    T.dump("traces/adder_delay_compare.js");
}
