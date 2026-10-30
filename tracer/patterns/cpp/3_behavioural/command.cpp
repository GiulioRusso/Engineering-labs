// Command
//
// Each request becomes an object with execute() and undo(). The editor does
// not run edits directly: it runs commands and keeps them on a history stack,
// so undoing is just popping the last one and asking it to reverse itself.
#include <string>
#include <vector>
#include "../tracer/objects.hpp"

static Tracer T("command", "Command", "Behavioural", __FILE__);

// The receiver: the object the commands act on.
struct Document {
    std::string text;
};

// The command interface.
struct Command {
    virtual void execute() = 0;
    virtual void undo() = 0;
    virtual std::string id() const = 0;
    virtual ~Command() = default;
};

class Insert : public Command {
    Document& doc;
    std::string what;
    std::string name;

  public:
    Insert(Document& d, std::string w, std::string n) : doc(d), what(w), name(n) {}
    void execute() override {
        doc.text += what;
        T.at(__LINE__, __func__).graphState(S.set("doc", {"text = \"" + doc.text + "\""}).json(name, "doc", "append \"" + what + "\"", "call", name)).sequence(S.console()).note("The command knows its receiver and what to do to it.").emit();
    }
    void undo() override {
        doc.text.erase(doc.text.size() - what.size());
        T.at(__LINE__, __func__).graphState(S.set("doc", {"text = \"" + doc.text + "\""}).json(name, "doc", "remove \"" + what + "\"", "call", name)).sequence(S.console()).note("Undo is the exact reverse, and the command remembers everything it needs for it.").emit();
    }
    std::string id() const override { return name; }
};

class Editor {
    Document& doc;
    std::vector<Command*> history;

  public:
    explicit Editor(Document& d) : doc(d) {}

    void run(Command* c) {
        T.at(__LINE__, __func__).graphState(S.json("editor", c->id(), "execute()")).vars({{"history", (int)history.size()}}).sequence(S.console()).note("The editor runs the command without knowing what it does.").emit();
        c->execute();
        history.push_back(c);
        say("typed  -> \"%s\"", doc.text.c_str());
        T.at(__LINE__, __func__).graphState(S.rel("editor", c->id(), fmt("history[%d]", (int)history.size() - 1)).set("editor", {fmt("history: %d", (int)history.size())}).json("", "", "", "call", "editor"))
         .vars({{"history", (int)history.size()}}).sequence(S.console()).note("...and pushes it on the history stack.").emit();
    }

    void undo() {
        if (history.empty()) {
            say("nothing to undo");
            T.at(__LINE__, __func__).graphState(S.json("", "", "", "call", "editor")).sequence(S.console()).note("Empty history: nothing to undo.").emit();
            return;
        }
        Command* c = history.back();
        history.pop_back();
        T.at(__LINE__, __func__).graphState(S.unrel("editor", c->id()).set("editor", {fmt("history: %d", (int)history.size())}).json("editor", c->id(), "undo()")).vars({{"history", (int)history.size()}}).sequence(S.console()).note("Pop the last command and ask it to undo itself.").emit();
        c->undo();
        say("undo   -> \"%s\"", doc.text.c_str());
        T.at(__LINE__, __func__).graphState(S.json("", "", "", "call", "editor")).sequence(S.console()).note("The document is back to how it was before that command.").emit();
    }
};

// tracer-hide-begin
static std::string scene() {
    S.clear().obj("main", "main()").obj("editor", "Editor", {"history: 0"}).obj("doc", "Document", {"text = \"\""})
     .obj("c1", "Insert", {"what = \"Hello\""}).obj("c2", "Insert", {"what = \", world\""}).obj("c3", "Insert", {"what = \"!\""});
    S.rel("c1", "doc", "", "has").rel("c2", "doc", "", "has").rel("c3", "doc", "", "has");
    return trace::Scene::layout({{"main", {0, 0}}, {"editor", {0, 150}}, {"c1", {220, 0}}, {"c2", {220, 110}}, {"c3", {220, 220}}, {"doc", {440, 110}}});
}
// tracer-hide-end

int main() {
    T.view("objects").input("type, then undo").layout(scene());
    {
        Document doc;
        Editor editor(doc);
        Insert c1(doc, "Hello", "c1"), c2(doc, ", world", "c2"), c3(doc, "!", "c3");
        editor.run(&c1);
        editor.run(&c2);
        editor.run(&c3);
        editor.undo();
    }

    T.input("undo everything, and once more").layout(scene());
    {
        Document doc;
        Editor editor(doc);
        Insert c1(doc, "Hello", "c1"), c2(doc, ", world", "c2"), c3(doc, "!", "c3");
        editor.run(&c1);
        editor.run(&c2);
        editor.undo();
        editor.undo();
        editor.undo();
    }

    T.dump("traces/command.js");
    return 0;
}
