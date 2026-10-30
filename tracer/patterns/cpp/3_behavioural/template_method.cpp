// Template Method
//
// A base class fixes the steps of an algorithm in one method and leaves some of
// the steps to subclasses. Every exporter opens, writes a header, writes the
// rows and closes, in that order; only how each step looks changes.
#include <string>
#include <vector>
#include "../tracer/objects.hpp"

static Tracer T("template_method", "Template Method", "Behavioural", __FILE__);

struct Row { std::string name; int score; };

class Exporter {
  public:
    // The template method: the order is fixed here, once, for every format.
    void exportAll(const std::vector<Row>& rows) {
        T.at(__LINE__, __func__).graphState(S.json("main", "exp", "exportAll(rows)")).sequence(S.console()).note("The skeleton runs in the base class: the same four steps for every format.").emit();
        header();
        for (const Row& r : rows) {
            row(r);
        }
        footer();
        T.at(__LINE__, __func__).graphState(S.json("", "", "", "call", "exp")).sequence(S.console()).note("Done. The base class never knew which format it was writing.").emit();
    }
    virtual ~Exporter() = default;

  protected:
    // The steps subclasses fill in; footer() has a default that does nothing.
    virtual void header() = 0;
    virtual void row(const Row& r) = 0;
    virtual void footer() {
        T.at(__LINE__, __func__).graphState(S.json("exp", "exp", "footer()", "call", "exp")).sequence(S.console()).note("This subclass did not override footer(): the base class default (nothing) runs. A hook.").emit();
    }
};

class CsvExporter : public Exporter {
  protected:
    void header() override {
        say("name,score");
        T.at(__LINE__, __func__).graphState(S.json("exp", "exp", "header()", "call", "exp")).sequence(S.console()).note("The base class calls header(); the CSV version runs.").emit();
    }
    void row(const Row& r) override {
        say("%s,%d", r.name.c_str(), r.score);
        T.at(__LINE__, __func__).graphState(S.json("exp", "exp", "row()", "call", "exp")).vars({{"name", r.name}, {"score", r.score}}).sequence(S.console()).note("One row in CSV form.").emit();
    }
};

class JsonExporter : public Exporter {
    bool first = true;

  protected:
    void header() override {
        say("[");
        T.at(__LINE__, __func__).graphState(S.json("exp", "exp", "header()", "call", "exp")).sequence(S.console()).note("Same call from the skeleton, JSON answer.").emit();
    }
    void row(const Row& r) override {
        say("  %s{\"name\": \"%s\", \"score\": %d}", first ? "" : ",", r.name.c_str(), r.score);
        first = false;
        T.at(__LINE__, __func__).graphState(S.json("exp", "exp", "row()", "call", "exp")).vars({{"name", r.name}, {"score", r.score}}).sequence(S.console()).note("JSON needs commas between rows: the subclass keeps that state itself.").emit();
    }
    void footer() override {
        say("]");
        T.at(__LINE__, __func__).graphState(S.json("exp", "exp", "footer()", "call", "exp")).sequence(S.console()).note("JSON overrides the footer hook to close the bracket.").emit();
    }
};

// tracer-hide-begin
static std::string scene(const char* cls) {
    S.clear().obj("main", "main()").obj("exp", cls, {"rows: 3"});
    return trace::Scene::layout({{"main", {0, 0}}, {"exp", {240, 0}}});
}
// tracer-hide-end

int main() {
    std::vector<Row> rows = {{"Ada", 91}, {"Alan", 87}, {"Grace", 95}};

    T.view("objects").input("CSV").layout(scene("CsvExporter"));
    {
        CsvExporter exp;
        exp.exportAll(rows);
    }

    T.input("JSON").layout(scene("JsonExporter"));
    {
        JsonExporter exp;
        exp.exportAll(rows);
    }

    T.dump("traces/template_method.js");
    return 0;
}
