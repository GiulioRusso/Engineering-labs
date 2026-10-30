// State
//
// An object whose behaviour depends on its state delegates every request to a
// state object, and replaces that object when the state changes. Each state is a
// class that knows only its own rules: no big switch over "what state am I in".
#include <string>
#include "../tracer/objects.hpp"

static Tracer T("state", "State", "Behavioural", __FILE__);

class Turnstile;

// One method per event; each state answers in its own way.
struct State {
    virtual void coin(Turnstile& t) = 0;
    virtual void push(Turnstile& t) = 0;
    virtual std::string name() const = 0;
    virtual ~State() = default;
};

// The context: it holds the current state and forwards every event to it.
class Turnstile {
    State* state;

  public:
    int coins = 0;
    explicit Turnstile(State* s) : state(s) {}
    void setState(State* s) {
        state = s;
        T.at(__LINE__, __func__).graphState(S.unrel("gate", "locked").unrel("gate", "unlocked").rel("gate", s->name(), "state").set("gate", {"state = " + s->name(), fmt("coins = %d", coins)}).json("", "", "", "call", "gate"))
         .sequence(S.console()).note("The state object decided to switch: the turnstile now points at " + s->name() + ".").emit();
    }
    void coin() {
        T.at(__LINE__, __func__).graphState(S.json("main", "gate", "coin()")).sequence(S.console()).note("Event: a coin. The turnstile does not decide anything itself...").emit();
        T.at(__LINE__, __func__).graphState(S.json("gate", state->name(), "coin(gate)")).sequence(S.console()).note("...it hands the event to its current state.").emit();
        state->coin(*this);
    }
    void push() {
        T.at(__LINE__, __func__).graphState(S.json("main", "gate", "push()")).sequence(S.console()).note("Event: someone pushes the arm.").emit();
        T.at(__LINE__, __func__).graphState(S.json("gate", state->name(), "push(gate)")).sequence(S.console()).note("Forwarded to the current state.").emit();
        state->push(*this);
    }
};

struct Locked : State {
    State* next = nullptr;
    void coin(Turnstile& t) override {
        t.coins++;
        say("locked: coin accepted, unlocking");
        t.setState(next);
    }
    void push(Turnstile&) override {
        say("locked: push blocked");
        T.at(__LINE__, __func__).graphState(S.json("", "", "", "call", "locked")).sequence(S.console()).note("Locked ignores a push: the rule lives here, not in the turnstile.").emit();
    }
    std::string name() const override { return "locked"; }
};

struct Unlocked : State {
    State* next = nullptr;
    void coin(Turnstile& t) override {
        t.coins++;
        say("unlocked: extra coin, thank you");
        T.at(__LINE__, __func__).graphState(S.set("gate", {"state = unlocked", fmt("coins = %d", t.coins)}).json("", "", "", "call", "unlocked")).sequence(S.console()).note("Already unlocked: the coin is kept, nothing changes.").emit();
    }
    void push(Turnstile& t) override {
        say("unlocked: person passes, locking");
        t.setState(next);
    }
    std::string name() const override { return "unlocked"; }
};

// tracer-hide-begin
static std::string scene() {
    S.clear().obj("main", "main()").obj("gate", "Turnstile", {"state = locked", "coins = 0"}).obj("locked", "Locked").obj("unlocked", "Unlocked");
    S.rel("gate", "locked", "state").rel("locked", "unlocked", "next", "creates").rel("unlocked", "locked", "next", "creates");
    return trace::Scene::layout({{"main", {0, 0}}, {"gate", {0, 150}}, {"locked", {260, 60}}, {"unlocked", {260, 250}}});
}
// tracer-hide-end

int main() {
    Locked locked;
    Unlocked unlocked;
    locked.next = &unlocked;
    unlocked.next = &locked;

    T.view("objects").input("coin, then push").layout(scene());
    {
        Turnstile gate(&locked);
        gate.coin();
        gate.push();
    }

    T.input("push while locked, two coins").layout(scene());
    {
        Turnstile gate(&locked);
        gate.push();
        gate.coin();
        gate.coin();
        gate.push();
    }

    T.dump("traces/state.js");
    return 0;
}
