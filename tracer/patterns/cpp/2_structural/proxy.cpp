// Proxy
//
// A stand-in object with the same interface as the real one controls access to
// it. This virtual proxy delays creating an expensive object until it is really
// needed, and then reuses it.
#include <memory>
#include <string>
#include "../tracer/objects.hpp"

static Tracer T("proxy", "Proxy", "Structural", __FILE__);

struct Image {
    virtual void display() = 0;
    virtual ~Image() = default;
};

// The real subject: loading it is slow (it reads a big file).
class HighResImage : public Image {
    std::string file;

  public:
    explicit HighResImage(std::string f) : file(std::move(f)) {
        say("loading %s from disk... (slow)", file.c_str());
        T.at(__LINE__, __func__).graphState(S.obj("real", "HighResImage", {"24 MB in memory"}).set("proxy", {"file = alps.raw", "real = &real"}).rel("proxy", "real", "real", "creates").json("proxy", "real", "new HighResImage", "call", "real"))
         .sequence(S.console()).note("The expensive object is created only now, at the first display().").emit();
    }
    void display() override {
        say("showing %s", file.c_str());
        T.at(__LINE__, __func__).graphState(S.json("proxy", "real", "display()", "call", "real")).sequence(S.console()).note("The real image does the actual work.").emit();
    }
};

// The proxy: same interface, cheap to create, creates the real one on demand.
class ImageProxy : public Image {
    std::string file;
    std::unique_ptr<HighResImage> real;

  public:
    explicit ImageProxy(std::string f) : file(std::move(f)) {}
    void display() override {
        T.at(__LINE__, __func__).graphState(S.json("gallery", "proxy", "display()")).sequence(S.console()).note("The gallery calls display() on what it believes is an image.").emit();
        if (!real) {
            real = std::make_unique<HighResImage>(file);
        }
        real->display();
    }
};

// tracer-hide-begin
static std::string scene() {
    S.clear().obj("gallery", "main()").obj("proxy", "ImageProxy", {"file = alps.raw", "real = null"});
    return trace::Scene::layout({{"gallery", {0, 0}}, {"proxy", {220, 0}}, {"real", {440, 0}}});
}
// tracer-hide-end

int main() {
    T.view("objects").input("shown twice: loaded once").layout(scene());
    {
        ImageProxy photo("alps.raw");
        T.at(__LINE__, "main").graphState(S.json()).sequence(S.console()).note("Creating the proxy costs nothing: no file has been read.").emit();
        photo.display();
        photo.display();
    }

    T.input("never shown: never loaded").layout(scene());
    {
        ImageProxy photo("alps.raw");
        say("user scrolled past the photo");
        T.at(__LINE__, "main").graphState(S.json()).sequence(S.console()).note("The photo was never displayed, so the 24 MB were never loaded.").emit();
    }

    T.dump("traces/proxy.js");
    return 0;
}
