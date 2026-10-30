// Observer
//
// A subject keeps a list of observers and, whenever its state changes, calls
// the same method on each of them. It knows them only through a small
// interface, so new kinds of observer can be added without touching it.
#include <cstdio>
#include <string>
#include <vector>
#include "../tracer/objects.hpp"

static Tracer T("observer", "Observer", "Behavioural", __FILE__);

// The only thing the subject knows about its observers.
struct Observer {
    virtual void update(double temperature) = 0;
    virtual std::string name() const = 0;
    virtual ~Observer() = default;
};

// The subject: a weather station.
class WeatherStation {
    std::vector<Observer*> observers;
    double temperature = 20;

  public:
    void subscribe(Observer* o) {
        observers.push_back(o);
        T.at(__LINE__, __func__).graphState(S.rel("station", o->name(), "observers").json("main", "station", "subscribe(" + o->name() + ")"))
         .vars({{"observers", (int)observers.size()}}).sequence(S.console()).note("The station stores a pointer to " + o->name() + ". It does not know its class, only that it has update().").emit();
    }

    void unsubscribe(Observer* o) {
        for (size_t i = 0; i < observers.size(); i++) {
            if (observers[i] == o) {
                observers.erase(observers.begin() + i);
                break;
            }
        }
        T.at(__LINE__, __func__).graphState(S.unrel("station", o->name()).json("main", "station", "unsubscribe(" + o->name() + ")"))
         .vars({{"observers", (int)observers.size()}}).sequence(S.console()).note(o->name() + " is removed from the list: from now on it hears nothing. It still exists.").emit();
    }

    void setTemperature(double t) {
        temperature = t;
        T.at(__LINE__, __func__).graphState(S.set("station", {fmt("temperature = %.1f", t), fmt("observers: %d", (int)observers.size())}).json("main", "station", fmt("setTemperature(%.1f)", t)))
         .vars({{"temperature", t}}).sequence(S.console()).note("The state changes, and the station tells everyone on its list.").emit();
        notify();
    }

    void notify() {
        for (Observer* o : observers) {
            T.at(__LINE__, __func__).graphState(S.json("station", o->name(), fmt("update(%.1f)", temperature))).vars({{"temperature", temperature}})
             .sequence(S.console()).note("Same call for every observer: the loop does not care which concrete class it is talking to.").emit();
            o->update(temperature);
        }
    }
};

// Three unrelated observers, each reacting in its own way.
class PhoneApp : public Observer {
    double shown = 0;

  public:
    void update(double t) override {
        shown = t;
        say("phone: it is %.1f °C", t);
        T.at(__LINE__, __func__).graphState(S.set("phone", {fmt("shown = %.1f", t)}).json("", "", "", "call", "phone"))
         .sequence(S.console()).note("The phone app redraws its screen.").emit();
    }
    std::string name() const override { return "phone"; }
};

class Thermostat : public Observer {
    bool heating = false;

  public:
    void update(double t) override {
        heating = t < 19;
        say("thermostat: heating %s", heating ? "ON" : "off");
        T.at(__LINE__, __func__).graphState(S.set("thermo", {fmt("heating = %s", heating ? "on" : "off")}).json("", "", "", "call", "thermo"))
         .sequence(S.console()).note("The thermostat decides whether to heat.").emit();
    }
    std::string name() const override { return "thermo"; }
};

class Logger : public Observer {
    int readings = 0;

  public:
    void update(double t) override {
        readings++;
        say("log: reading #%d = %.1f", readings, t);
        T.at(__LINE__, __func__).graphState(S.set("log", {fmt("readings = %d", readings)}).json("", "", "", "call", "log"))
         .sequence(S.console()).note("The logger keeps a count.").emit();
    }
    std::string name() const override { return "log"; }
};

// tracer-hide-begin
static std::string scene() {
    S.clear().obj("main", "main()").obj("station", "WeatherStation", {"temperature = 20.0", "observers: 0"})
     .obj("phone", "PhoneApp", {"shown = 0"}).obj("thermo", "Thermostat", {"heating = off"}).obj("log", "Logger", {"readings = 0"});
    return trace::Scene::layout({{"main", {0, 120}}, {"station", {200, 120}}, {"phone", {420, 0}}, {"thermo", {420, 120}}, {"log", {420, 240}}});
}
// tracer-hide-end

int main() {
    T.view("objects").input("subscribe and notify").layout(scene());
    {
        WeatherStation station;
        PhoneApp phone;
        Thermostat thermo;
        Logger log;
        T.at(__LINE__, "main").graphState(S.json()).sequence(S.console()).note("Four independent objects. The station has an empty list of observers.").emit();
        station.subscribe(&phone);
        station.subscribe(&thermo);
        station.subscribe(&log);
        station.setTemperature(21.5);
        station.setTemperature(17.0);
    }

    T.input("unsubscribe one").layout(scene());
    {
        WeatherStation station;
        PhoneApp phone;
        Thermostat thermo;
        Logger log;
        T.at(__LINE__, "main").graphState(S.json()).sequence(S.console()).note("Same objects; this time the phone will stop listening halfway.").emit();
        station.subscribe(&phone);
        station.subscribe(&thermo);
        station.setTemperature(18.0);
        station.unsubscribe(&phone);
        station.setTemperature(22.0);
    }

    T.dump("traces/observer.js");
    return 0;
}
