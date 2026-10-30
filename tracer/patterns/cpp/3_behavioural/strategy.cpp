// Strategy
//
// A family of interchangeable algorithms behind one interface. The object that
// uses them holds a pointer to "a strategy" and can be given a different one at
// run time, without any if/else on the kind of algorithm.
#include <string>
#include "../tracer/objects.hpp"

static Tracer T("strategy", "Strategy", "Behavioural", __FILE__);

// The interface every route strategy implements.
struct RouteStrategy {
    virtual double minutes(double km) const = 0;
    virtual std::string name() const = 0;
    virtual ~RouteStrategy() = default;
};

struct Car : RouteStrategy {
    double minutes(double km) const override {
        double m = 5 + km / 40 * 60;         // parking, then 40 km/h in town
        T.at(__LINE__, __func__).graphState(S.json("", "", "", "call", "car")).vars({{"km", km}, {"minutes", m}}).sequence(S.console()).note("Car: 5 minutes to park, then 40 km/h.").emit();
        return m;
    }
    std::string name() const override { return "car"; }
};

struct Walk : RouteStrategy {
    double minutes(double km) const override {
        double m = km / 5 * 60;              // 5 km/h
        T.at(__LINE__, __func__).graphState(S.json("", "", "", "call", "walk")).vars({{"km", km}, {"minutes", m}}).sequence(S.console()).note("Walking: 5 km/h, no parking.").emit();
        return m;
    }
    std::string name() const override { return "walk"; }
};

struct Bike : RouteStrategy {
    double minutes(double km) const override {
        double m = 2 + km / 15 * 60;         // unlock the bike, then 15 km/h
        T.at(__LINE__, __func__).graphState(S.json("", "", "", "call", "bike")).vars({{"km", km}, {"minutes", m}}).sequence(S.console()).note("Bike: 2 minutes to unlock, then 15 km/h.").emit();
        return m;
    }
    std::string name() const override { return "bike"; }
};

// The context: it uses a strategy, and does not care which one.
class Navigator {
    const RouteStrategy* strategy = nullptr;

  public:
    void setStrategy(const RouteStrategy* s) {
        strategy = s;
        T.at(__LINE__, __func__).graphState(S.unrel("nav", "car").unrel("nav", "walk").unrel("nav", "bike").rel("nav", s->name(), "strategy").set("nav", {"strategy = " + s->name()}).json("main", "nav", "setStrategy(" + s->name() + ")"))
         .sequence(S.console()).note("The navigator now points at a different algorithm. Nothing else in it changes.").emit();
    }

    void plan(double km) {
        T.at(__LINE__, __func__).graphState(S.json("main", "nav", fmt("plan(%.0f km)", km))).sequence(S.console()).note("The navigator delegates the one part that varies.").emit();
        double m = strategy->minutes(km);
        say("%s: %.0f km in %.0f min", strategy->name().c_str(), km, m);
        T.at(__LINE__, __func__).graphState(S.json(strategy->name(), "nav", fmt("%.0f min", m), "return", "nav")).vars({{"minutes", m}}).sequence(S.console()).note("The answer comes back; the navigator prints it the same way whatever the strategy.").emit();
    }
};

// tracer-hide-begin
static std::string scene() {
    S.clear().obj("main", "main()").obj("nav", "Navigator", {"strategy = none"}).obj("car", "Car").obj("walk", "Walk").obj("bike", "Bike");
    return trace::Scene::layout({{"main", {0, 110}}, {"nav", {200, 110}}, {"car", {420, 0}}, {"walk", {420, 110}}, {"bike", {420, 220}}});
}
// tracer-hide-end

int main() {
    Car car;
    Walk walk;
    Bike bike;

    T.view("objects").input("car, then walking").layout(scene());
    {
        Navigator nav;
        nav.setStrategy(&car);
        nav.plan(6);
        nav.setStrategy(&walk);
        nav.plan(6);
    }

    T.input("short trip: walk or bike").layout(scene());
    {
        Navigator nav;
        nav.setStrategy(&walk);
        nav.plan(1.5);
        nav.setStrategy(&bike);
        nav.plan(1.5);
    }

    T.dump("traces/strategy.js");
    return 0;
}
