// Adapter
//
// Two pieces that should work together have incompatible interfaces. An adapter
// implements the interface the client expects and translates each call into
// the one the existing class understands, so neither side has to change.
#include <string>
#include "../tracer/objects.hpp"

static Tracer T("adapter", "Adapter", "Structural", __FILE__);

// What the climate app expects: temperatures in °C as a double.
struct TemperatureSensor {
    virtual double celsius() = 0;
    virtual ~TemperatureSensor() = default;
};

// A modern sensor already fits.
struct DigitalSensor : TemperatureSensor {
    double celsius() override {
        T.at(__LINE__, __func__).graphState(S.json("app", "sensor", "celsius()", "call", "sensor")).sequence(S.console()).note("A sensor that already speaks the right interface answers directly.").emit();
        return 21.0;
    }
};

// An old probe we cannot change: tenths of a degree Fahrenheit, as an int.
class LegacyProbe {
  public:
    int readTenthsF() {
        T.at(__LINE__, __func__).graphState(S.json("adapter", "probe", "readTenthsF()", "call", "probe")).sequence(S.console()).note("The legacy probe answers in its own units: 698 means 69.8 °F.").emit();
        return 698;
    }
};

// The adapter: looks like a TemperatureSensor, works by calling the probe.
class ProbeAdapter : public TemperatureSensor {
    LegacyProbe& probe;

  public:
    explicit ProbeAdapter(LegacyProbe& p) : probe(p) {}
    double celsius() override {
        T.at(__LINE__, __func__).graphState(S.json("app", "adapter", "celsius()", "call", "adapter")).sequence(S.console()).note("The app calls celsius() as usual: it has no idea an adapter is in between.").emit();
        int raw = probe.readTenthsF();
        double c = (raw / 10.0 - 32) * 5 / 9;
        T.at(__LINE__, __func__).graphState(S.json("probe", "adapter", fmt("%d", raw), "return", "adapter")).vars({{"raw", raw}, {"c", c}}).sequence(S.console()).note("The adapter converts: (69.8 − 32) × 5/9 = 21 °C.").emit();
        return c;
    }
};

// The client only knows the interface.
struct ClimateApp {
    void show(TemperatureSensor& s, const std::string& id) {
        double c = s.celsius();
        say("%s: %.1f °C", id.c_str(), c);
        T.at(__LINE__, __func__).graphState(S.json(id, "app", fmt("%.1f", c), "return", "app")).vars({{"c", c}}).sequence(S.console()).note("Same code, same result type, whatever is behind the interface.").emit();
    }
};

// tracer-hide-begin
static std::string scene(bool adapter) {
    S.clear().obj("main", "main()").obj("app", "ClimateApp");
    if (adapter) { S.obj("adapter", "ProbeAdapter").obj("probe", "LegacyProbe", {"units: 0.1 °F"}); S.rel("adapter", "probe", "probe"); }
    else S.obj("sensor", "DigitalSensor", {"units: °C"});
    return trace::Scene::layout({{"main", {0, 0}}, {"app", {0, 140}}, {"sensor", {240, 140}}, {"adapter", {240, 140}}, {"probe", {460, 140}}});
}
// tracer-hide-end

int main() {
    ClimateApp app;

    T.view("objects").input("a sensor that fits").layout(scene(false));
    DigitalSensor sensor;
    app.show(sensor, "sensor");

    T.input("an old probe, adapted").layout(scene(true));
    LegacyProbe probe;
    ProbeAdapter adapter(probe);
    app.show(adapter, "adapter");

    T.dump("traces/adapter.js");
    return 0;
}
