// objects.hpp - object diagrams for the design-pattern traces.
//
// A pattern is about objects and the messages between them, so each step records
// the objects alive at that moment (id, class, a few fields), the references
// between them, and the call being made right now. Every mutation of the scene
// happens inside a T.at(...) chain, which the player hides from the source
// panel: the code on screen stays the pattern's own code.
#pragma once

#include <cstdio>
#include <string>
#include <utility>
#include <vector>

#include "../../../algorithms/cpp/tracer/tracer.hpp"

namespace trace {

class Scene {
  public:
    struct Obj { std::string id, cls; std::vector<std::string> fields; bool fresh; };
    struct Rel { std::string from, to, label, kind; };

    // create (or replace) an object; it is drawn "new" on the step it appears
    Scene& obj(const std::string& id, const std::string& cls, std::vector<std::string> fields = {}) {
        for (auto& o : objs_) if (o.id == id) { o.cls = cls; o.fields = std::move(fields); return *this; }
        objs_.push_back({id, cls, std::move(fields), true});
        return *this;
    }
    Scene& set(const std::string& id, std::vector<std::string> fields) {
        for (auto& o : objs_) if (o.id == id) o.fields = std::move(fields);
        return *this;
    }
    Scene& drop(const std::string& id) {
        std::vector<Obj> keep;
        for (auto& o : objs_) if (o.id != id) keep.push_back(o);
        objs_ = keep;
        std::vector<Rel> rk;
        for (auto& r : rels_) if (r.from != id && r.to != id) rk.push_back(r);
        rels_ = rk;
        return *this;
    }
    // a lasting reference: kind "has" (a field pointing at another object) or "creates"
    Scene& rel(const std::string& from, const std::string& to, const std::string& label = "", const std::string& kind = "has") {
        unrel(from, to);
        rels_.push_back({from, to, label, kind});
        return *this;
    }
    Scene& unrel(const std::string& from, const std::string& to) {
        std::vector<Rel> rk;
        for (auto& r : rels_) if (!(r.from == from && r.to == to)) rk.push_back(r);
        rels_ = rk;
        return *this;
    }
    Scene& print(const std::string& line) { console_.push_back(line); return *this; }
    Scene& clear() { objs_.clear(); rels_.clear(); console_.clear(); return *this; }

    // the step's snapshot; the call from → to (if any) is drawn highlighted with its label,
    // kind "call" or "return"; active marks the object whose method is running
    std::string json(const std::string& from = "", const std::string& to = "", const std::string& label = "",
                     const std::string& kind = "call", const std::string& active = "") {
        std::string n, e;
        for (auto& o : objs_) {
            if (!n.empty()) n += ",";
            std::string f = "[";
            for (size_t i = 0; i < o.fields.size(); ++i) f += (i ? "," : "") + Val::quote(o.fields[i]);
            const char* st = o.id == active || (active.empty() && o.id == to) ? "active" : o.fresh ? "new" : "";
            n += Val::quote(o.id) + ":{\"cls\":" + Val::quote(o.cls) + ",\"fields\":" + f + "],\"state\":" + Val::quote(st) + "}";
            o.fresh = false;
        }
        for (auto& r : rels_) {
            if (!e.empty()) e += ",";
            e += "{\"from\":" + Val::quote(r.from) + ",\"to\":" + Val::quote(r.to) + ",\"label\":" + Val::quote(r.label) + ",\"kind\":" + Val::quote(r.kind) + "}";
        }
        if (!from.empty() && !to.empty()) {
            if (!e.empty()) e += ",";
            e += "{\"from\":" + Val::quote(from) + ",\"to\":" + Val::quote(to) + ",\"label\":" + Val::quote(label) + ",\"kind\":" + Val::quote(kind) + ",\"state\":\"current\"}";
        }
        return "{\"nodes\":{" + n + "},\"edges\":[" + e + "]}";
    }
    // what the program has printed so far (the last lines)
    std::string console(size_t last = 6) const {
        std::string s;
        size_t a = console_.size() > last ? console_.size() - last : 0;
        for (size_t i = a; i < console_.size(); ++i) s += (i > a ? "\n" : "") + console_[i];
        return s;
    }
    // hand-placed positions for the objects of one scenario
    static std::string layout(std::initializer_list<std::pair<const char*, std::pair<int, int>>> pos) {
        std::string s = "{";
        bool first = true;
        for (auto& p : pos) { s += (first ? "" : ",") + Val::quote(p.first) + ":{\"x\":" + std::to_string(p.second.first) + ",\"y\":" + std::to_string(p.second.second) + "}"; first = false; }
        return s + "}";
    }

  private:
    std::vector<Obj> objs_;
    std::vector<Rel> rels_;
    std::vector<std::string> console_;
};

}  // namespace trace

// The scene every pattern program records into, and two small helpers: fmt()
// formats a string, say() is the program's own output (shown under the diagram).
inline trace::Scene S;
template <class... A> std::string fmt(const char* f, A... a) { char b[200]; std::snprintf(b, sizeof b, f, a...); return b; }
inline std::string fmt(const char* f) { return f; }
template <class... A> void say(const char* f, A... a) { S.print(fmt(f, a...)); }
