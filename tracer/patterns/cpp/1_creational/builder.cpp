// Builder
//
// An object with many optional parts is put together step by step by a separate
// builder, which collects the parts and checks them, and only at the end
// produces the finished, unchangeable object.
#include <string>
#include <vector>
#include "../tracer/objects.hpp"

static Tracer T("builder", "Builder", "Creational", __FILE__);

// The product: complete and fixed once built.
struct Request {
    const std::string method, url, body;
    const std::vector<std::string> headers;
};

class RequestBuilder {
    std::string method = "GET", url, body;
    std::vector<std::string> headers;

    // tracer-hide-begin
    std::string snap(const std::string& call) const {
        std::vector<std::string> f = {"method = " + method, "url = " + (url.empty() ? "?" : url)};
        for (auto& h : headers) f.push_back("+ " + h);
        if (!body.empty()) f.push_back("body = " + body);
        return S.set("b", f).json("main", "b", call);
    }
    // tracer-hide-end

  public:
    RequestBuilder& to(const std::string& u) {
        url = u;
        T.at(__LINE__, __func__).graphState(snap(".to(\"" + u + "\")")).sequence(S.console()).note("Each call sets one part and returns the builder itself, so calls chain.").emit();
        return *this;
    }
    RequestBuilder& post(const std::string& b) {
        method = "POST";
        body = b;
        T.at(__LINE__, __func__).graphState(snap(".post(...)")).sequence(S.console()).note("Changing the method and adding a body: still only the builder changes.").emit();
        return *this;
    }
    RequestBuilder& header(const std::string& h) {
        headers.push_back(h);
        T.at(__LINE__, __func__).graphState(snap(".header(\"" + h + "\")")).sequence(S.console()).note("Optional parts can be added in any order, as many as needed.").emit();
        return *this;
    }
    Request build() const {
        if (url.empty()) {
            say("build() refused: no url");
            T.at(__LINE__, __func__).graphState(S.json("main", "b", ".build()")).sequence(S.console()).note("The builder checks the whole before creating anything: no half-made Request ever exists.").emit();
            return {"", "", "", {}};
        }
        say("%s %s (%d header%s)%s", method.c_str(), url.c_str(), (int)headers.size(), headers.size() == 1 ? "" : "s", body.empty() ? "" : " with a body");
        T.at(__LINE__, __func__).graphState(S.obj("req", "Request", {"method = " + method, "url = " + url, fmt("headers: %d", (int)headers.size())}).rel("b", "req", "builds", "creates").json("main", "b", ".build()")).sequence(S.console()).note("Only now is the Request created, complete and const.").emit();
        return {method, url, body, headers};
    }
};

// tracer-hide-begin
static std::string scene() {
    S.clear().obj("main", "main()").obj("b", "RequestBuilder", {"method = GET", "url = ?"});
    return trace::Scene::layout({{"main", {0, 0}}, {"b", {230, 0}}, {"req", {230, 190}}});
}
// tracer-hide-end

int main() {
    T.view("objects").input("a GET with headers").layout(scene());
    {
        Request r = RequestBuilder().to("/users").header("Accept: json").header("Auth: token").build();
    }

    T.input("a POST, and a forgotten url").layout(scene());
    {
        Request r = RequestBuilder().to("/orders").post("{\"qty\": 2}").build();
        Request bad = RequestBuilder().header("Accept: json").build();
    }

    T.dump("traces/builder.js");
    return 0;
}
