// Chain of Responsibility
//
// A request is passed along a chain of handlers. Each one either deals with it
// or hands it to the next. The sender only knows the first handler, and the
// chain can be rearranged without the sender noticing.
#include <string>
#include "../tracer/objects.hpp"

static Tracer T("chain", "Chain of Responsibility", "Behavioural", __FILE__);

struct Ticket { std::string text; int level; };   // 1 = how-to, 2 = account, 3 = bug

class Handler {
    Handler* next = nullptr;

  public:
    Handler* setNext(Handler* h) {
        next = h;
        return h;
    }
    void handle(const Ticket& t) {
        if (canHandle(t)) {
            resolve(t);
        } else if (next) {
            T.at(__LINE__, __func__).graphState(S.json(id(), next->id(), "handle(ticket)")).vars({{"level", t.level}}).sequence(S.console()).note(id() + " cannot deal with it and passes it on.").emit();
            next->handle(t);
        } else {
            say("%s: nobody could handle \"%s\"", id().c_str(), t.text.c_str());
            T.at(__LINE__, __func__).graphState(S.json("", "", "", "call", id())).sequence(S.console()).note("End of the chain: the request falls off. A real chain needs a catch-all.").emit();
        }
    }
    virtual ~Handler() = default;

  protected:
    virtual bool canHandle(const Ticket& t) const = 0;
    virtual void resolve(const Ticket& t) = 0;
    virtual std::string id() const = 0;
};

class FaqBot : public Handler {
  protected:
    bool canHandle(const Ticket& t) const override { return t.level <= 1; }
    void resolve(const Ticket& t) override {
        say("bot: here is the FAQ entry for \"%s\"", t.text.c_str());
        T.at(__LINE__, __func__).graphState(S.json("", "", "", "call", "bot")).sequence(S.console()).note("The bot answers easy questions itself.").emit();
    }
    std::string id() const override { return "bot"; }
};

class Agent : public Handler {
  protected:
    bool canHandle(const Ticket& t) const override { return t.level <= 2; }
    void resolve(const Ticket& t) override {
        say("agent: I have fixed your account (\"%s\")", t.text.c_str());
        T.at(__LINE__, __func__).graphState(S.json("", "", "", "call", "agent")).sequence(S.console()).note("A human agent handles account problems.").emit();
    }
    std::string id() const override { return "agent"; }
};

class Engineer : public Handler {
  protected:
    bool canHandle(const Ticket& t) const override { return t.level <= 3; }
    void resolve(const Ticket& t) override {
        say("engineer: bug filed and patched (\"%s\")", t.text.c_str());
        T.at(__LINE__, __func__).graphState(S.json("", "", "", "call", "eng")).sequence(S.console()).note("Only real bugs reach the engineers.").emit();
    }
    std::string id() const override { return "eng"; }
};

// tracer-hide-begin
static std::string scene() {
    S.clear().obj("app", "main()").obj("bot", "FaqBot", {"handles level 1"}).obj("agent", "Agent", {"handles level ≤ 2"}).obj("eng", "Engineer", {"handles level ≤ 3"});
    S.rel("bot", "agent", "next").rel("agent", "eng", "next");
    return trace::Scene::layout({{"app", {0, 0}}, {"bot", {220, 0}}, {"agent", {220, 130}}, {"eng", {220, 260}}});
}
// tracer-hide-end

static void submit(Handler& first, const Ticket& t) {
    T.at(__LINE__, __func__).graphState(S.json("app", "bot", fmt("handle(level %d)", t.level))).vars({{"level", t.level}}).sequence(S.console()).note("The app only knows the first handler.").emit();
    first.handle(t);
}

int main() {
    FaqBot bot;
    Agent agent;
    Engineer eng;
    bot.setNext(&agent)->setNext(&eng);

    T.view("objects").input("three tickets").layout(scene());
    submit(bot, {"how do I reset my password?", 1});
    submit(bot, {"I was charged twice", 2});
    submit(bot, {"the app crashes on save", 3});

    T.input("a ticket nobody handles").layout(scene());
    submit(bot, {"please refund my holiday", 4});

    T.dump("traces/chain.js");
    return 0;
}
