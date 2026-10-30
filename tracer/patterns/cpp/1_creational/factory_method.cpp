// Factory Method
//
// A base class writes the general algorithm and calls a "factory method" when
// it needs a new object; subclasses override that one method to decide which
// concrete class gets created. The general code never names a concrete class.
#include <memory>
#include <string>
#include "../tracer/objects.hpp"

static Tracer T("factory_method", "Factory Method", "Creational", __FILE__);

// The products.
struct Button {
    virtual void draw() = 0;
    virtual ~Button() = default;
};
struct WinButton : Button {
    void draw() override {
        say("[ OK ]  (Windows style)");
        T.at(__LINE__, __func__).graphState(S.json("dlg", "btn", "draw()", "call", "btn")).sequence(S.console()).note("The button that was made draws itself its own way.").emit();
    }
};
struct WebButton : Button {
    void draw() override {
        say("<button>OK</button>");
        T.at(__LINE__, __func__).graphState(S.json("dlg", "btn", "draw()", "call", "btn")).sequence(S.console()).note("The button that was made draws itself its own way.").emit();
    }
};

// The creator: render() is written once; createButton() is the factory method.
class Dialog {
  public:
    void render() {
        T.at(__LINE__, __func__).graphState(S.json("main", "dlg", "render()")).sequence(S.console()).note("render() is shared code in the base class. It needs a button...").emit();
        std::unique_ptr<Button> ok = createButton();
        T.at(__LINE__, __func__).graphState(S.rel("dlg", "btn", "ok").json("", "", "", "call", "dlg")).sequence(S.console()).note("...and gets one, without knowing which class it is.").emit();
        ok->draw();
    }
    virtual ~Dialog() = default;

  protected:
    virtual std::unique_ptr<Button> createButton() = 0;
};

class WindowsDialog : public Dialog {
  protected:
    std::unique_ptr<Button> createButton() override {
        T.at(__LINE__, __func__).graphState(S.obj("btn", "WinButton").rel("dlg", "btn", "creates", "creates").json("dlg", "dlg", "createButton()", "call", "dlg")).sequence(S.console()).note("The subclass decides: a Windows dialog makes a WinButton.").emit();
        return std::make_unique<WinButton>();
    }
};

class WebDialog : public Dialog {
  protected:
    std::unique_ptr<Button> createButton() override {
        T.at(__LINE__, __func__).graphState(S.obj("btn", "WebButton").rel("dlg", "btn", "creates", "creates").json("dlg", "dlg", "createButton()", "call", "dlg")).sequence(S.console()).note("A web dialog overrides the same method and makes a WebButton.").emit();
        return std::make_unique<WebButton>();
    }
};

// tracer-hide-begin
static std::string scene(const char* cls) {
    S.clear().obj("main", "main()").obj("dlg", cls);
    return trace::Scene::layout({{"main", {0, 0}}, {"dlg", {230, 0}}, {"btn", {230, 160}}});
}
// tracer-hide-end

int main() {
    T.view("objects").input("Windows").layout(scene("WindowsDialog"));
    {
        WindowsDialog dlg;
        dlg.render();
    }

    T.input("web").layout(scene("WebDialog"));
    {
        WebDialog dlg;
        dlg.render();
    }

    T.dump("traces/factory_method.js");
    return 0;
}
