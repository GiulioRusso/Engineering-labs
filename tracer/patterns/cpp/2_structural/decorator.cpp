// Decorator
//
// Extra behaviour is added to an object by wrapping it in another object with
// the same interface. Each wrapper does its bit and forwards the call to the
// object inside, so wrappers stack in any combination at run time.
#include <memory>
#include <string>
#include "../tracer/objects.hpp"

static Tracer T("decorator", "Decorator", "Structural", __FILE__);

struct Coffee {
    virtual double cost() = 0;
    virtual std::string id() const = 0;
    virtual ~Coffee() = default;
};

struct Espresso : Coffee {
    double cost() override {
        T.at(__LINE__, __func__).graphState(S.json("", "", "", "call", "esp")).sequence(S.console()).note("The innermost object: the plain espresso, 1.50.").emit();
        return 1.50;
    }
    std::string id() const override { return "esp"; }
};

// Every decorator IS a Coffee and HAS a Coffee.
class Extra : public Coffee {
    std::unique_ptr<Coffee> inner;
    std::string name;
    double price;

  public:
    Extra(std::unique_ptr<Coffee> c, std::string n, double p) : inner(std::move(c)), name(std::move(n)), price(p) {}
    double cost() override {
        T.at(__LINE__, __func__).graphState(S.json(id(), inner->id(), "cost()")).sequence(S.console()).note(id() + " forwards the call to the coffee it wraps...").emit();
        double c = inner->cost() + price;
        T.at(__LINE__, __func__).graphState(S.json(inner->id(), id(), fmt("%.2f", c - price), "return", id())).vars({{"c", c}}).sequence(S.console()).note(fmt("...and adds its own %.2f on the way back.", price)).emit();
        return c;
    }
    std::string id() const override { return name; }
};

// tracer-hide-begin
static std::string scene(bool twice) {
    S.clear().obj("main", "main()").obj("esp", "Espresso", {"1.50"}).obj("milk", "Extra", {"+0.40 milk"}).obj("sugar", "Extra", {"+0.10 sugar"});
    S.rel("milk", "esp", "inner").rel("sugar", "milk", "inner");
    if (twice) { S.obj("milk2", "Extra", {"+0.40 milk"}).rel("milk2", "sugar", "inner"); }
    if (twice) return trace::Scene::layout({{"main", {0, 0}}, {"milk2", {220, 0}}, {"sugar", {220, 120}}, {"milk", {220, 240}}, {"esp", {220, 360}}});
    return trace::Scene::layout({{"main", {0, 0}}, {"sugar", {220, 0}}, {"milk", {220, 130}}, {"esp", {220, 260}}});
}
// tracer-hide-end

int main() {
    T.view("objects").input("espresso + milk + sugar").layout(scene(false));
    {
        std::unique_ptr<Coffee> c = std::make_unique<Espresso>();
        c = std::make_unique<Extra>(std::move(c), "milk", 0.40);
        c = std::make_unique<Extra>(std::move(c), "sugar", 0.10);
        // ask the outermost wrapper for the price
        T.at(__LINE__, "main").graphState(S.json("main", "sugar", "cost()")).sequence(S.console()).note("main holds only the outermost wrapper and asks it the price.").emit();
        double total = c->cost();
        say("total: %.2f", total);
        T.at(__LINE__, "main").graphState(S.json("sugar", "main", fmt("%.2f", total), "return", "main")).sequence(S.console()).note("1.50 + 0.40 + 0.10, assembled on the way back out.").emit();
    }

    T.input("one more layer, added at run time").layout(scene(true));
    {
        std::unique_ptr<Coffee> c = std::make_unique<Espresso>();
        c = std::make_unique<Extra>(std::move(c), "milk", 0.40);
        c = std::make_unique<Extra>(std::move(c), "sugar", 0.10);
        c = std::make_unique<Extra>(std::move(c), "milk2", 0.40);
        // the same question, one layer further out
        T.at(__LINE__, "main").graphState(S.json("main", "milk2", "cost()")).sequence(S.console()).note("A double milk: just one more wrapper. No class DoubleMilkSugarEspresso needed.").emit();
        double total = c->cost();
        say("total: %.2f", total);
        T.at(__LINE__, "main").graphState(S.json("milk2", "main", fmt("%.2f", total), "return", "main")).sequence(S.console()).note("Four objects, one interface.").emit();
    }

    T.dump("traces/decorator.js");
    return 0;
}
