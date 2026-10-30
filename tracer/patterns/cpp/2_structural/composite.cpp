// Composite
//
// Single objects and groups of objects share one interface, so a whole tree can
// be treated like a single item. A folder's size is the sum of its children's
// sizes, and the caller never checks whether it holds a file or a folder.
#include <string>
#include <vector>
#include "../tracer/objects.hpp"

static Tracer T("composite", "Composite", "Structural", __FILE__);

struct Node {
    virtual int size() = 0;
    virtual std::string id() const = 0;
    virtual ~Node() = default;
};

// A leaf.
class File : public Node {
    std::string name;
    int kb;

  public:
    File(std::string n, int k) : name(std::move(n)), kb(k) {}
    int size() override {
        T.at(__LINE__, __func__).graphState(S.json("", "", "", "call", name)).vars({{"kb", kb}}).sequence(S.console()).note("A file just knows its own size.").emit();
        return kb;
    }
    std::string id() const override { return name; }
};

// A composite: holds other Nodes, files or folders alike.
class Folder : public Node {
    std::string name;
    std::vector<Node*> children;

  public:
    explicit Folder(std::string n) : name(std::move(n)) {}
    void add(Node* n) { children.push_back(n); }
    int size() override {
        int total = 0;
        for (Node* c : children) {
            T.at(__LINE__, __func__).graphState(S.json(name, c->id(), "size()")).vars({{"total", total}}).sequence(S.console()).note(name + " asks each child the same question, without checking what kind of child it is.").emit();
            total += c->size();
            T.at(__LINE__, __func__).graphState(S.set(name, {fmt("total = %d KB", total)}).json(c->id(), name, "", "return", name)).vars({{"total", total}}).sequence(S.console()).note("Add up and move on.").emit();
        }
        return total;
    }
    std::string id() const override { return name; }
};

static void report(Node& n) {
    T.at(__LINE__, __func__).graphState(S.json("main", n.id(), "size()")).sequence(S.console()).note("The caller treats a whole tree and a single file the same way.").emit();
    int kb = n.size();
    say("%s: %d KB", n.id().c_str(), kb);
    T.at(__LINE__, __func__).graphState(S.json(n.id(), "main", fmt("%d KB", kb), "return", "main")).sequence(S.console()).note("One number for the whole subtree.").emit();
}

// tracer-hide-begin
static std::string scene() {
    S.clear().obj("main", "main()").obj("docs", "Folder", {"total = ?"}).obj("cv.pdf", "File", {"120 KB"}).obj("photos", "Folder", {"total = ?"})
     .obj("a.jpg", "File", {"800 KB"}).obj("b.jpg", "File", {"650 KB"});
    S.rel("docs", "cv.pdf", "").rel("docs", "photos", "").rel("photos", "a.jpg", "").rel("photos", "b.jpg", "");
    return trace::Scene::layout({{"main", {0, 0}}, {"docs", {200, 0}}, {"cv.pdf", {120, 140}}, {"photos", {320, 140}}, {"a.jpg", {220, 280}}, {"b.jpg", {420, 280}}});
}
// tracer-hide-end

int main() {
    File cv("cv.pdf", 120), a("a.jpg", 800), b("b.jpg", 650);
    Folder photos("photos"), docs("docs");
    photos.add(&a);
    photos.add(&b);
    docs.add(&cv);
    docs.add(&photos);

    T.view("objects").input("the size of a folder tree").layout(scene());
    report(docs);

    T.input("a single file: same call").layout(scene());
    report(cv);

    T.dump("traces/composite.js");
    return 0;
}
