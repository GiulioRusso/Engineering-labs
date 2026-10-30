// Singleton
//
// A class that allows exactly one instance and gives everyone the same one
// through a static access function. The instance is created the first time it
// is asked for; later calls return the existing object.
#include <string>
#include "../tracer/objects.hpp"

static Tracer T("singleton", "Singleton", "Creational", __FILE__);

class Logger {
    int lines = 0;
    Logger() {                                // private: nobody else can construct one
        T.at(__LINE__, __func__).graphState(S.obj("log", "Logger", {"lines = 0"}).rel("cls", "log", "instance", "creates").set("cls", {"instance = &log"}).json("cls", "log", "new Logger()", "call", "log"))
         .sequence(S.console()).note("First request: the one and only Logger is constructed now.").emit();
    }

  public:
    Logger(const Logger&) = delete;           // and nobody can copy it
    Logger& operator=(const Logger&) = delete;

    static Logger& instance() {
        static Logger only;                   // built on the first call, thread-safe since C++11
        return only;
    }

    void write(const std::string& who, const std::string& msg) {
        lines++;
        say("[%d] %s: %s", lines, who.c_str(), msg.c_str());
        T.at(__LINE__, __func__).graphState(S.set("log", {fmt("lines = %d", lines)}).json(who, "log", "write()", "call", "log")).vars({{"lines", lines}}).sequence(S.console()).note("Whoever writes, it is the same object: the line counter keeps counting across callers.").emit();
    }
};

// Two parts of a program that each need logging.
struct Database {
    void save() {
        T.at(__LINE__, __func__).graphState(S.json("db", "cls", "Logger::instance()")).sequence(S.console()).note("The database asks the class for the instance; it never creates one itself.").emit();
        Logger& log = Logger::instance();
        T.at(__LINE__, __func__).graphState(S.rel("db", "log", "log").json("cls", "db", "&log", "return", "db")).sequence(S.console()).note("It gets back a reference to the single Logger.").emit();
        log.write("db", "record saved");
    }
};

struct Network {
    void send() {
        T.at(__LINE__, __func__).graphState(S.json("net", "cls", "Logger::instance()")).sequence(S.console()).note("A second, unrelated part of the program asks too.").emit();
        Logger& log = Logger::instance();
        T.at(__LINE__, __func__).graphState(S.rel("net", "log", "log").json("cls", "net", "&log", "return", "net")).sequence(S.console()).note("No new Logger: the static local already exists, so the same reference comes back.").emit();
        log.write("net", "packet sent");
    }
};

// tracer-hide-begin
static std::string scene() {
    S.clear().obj("main", "main()").obj("cls", "class Logger", {"instance = null"}).obj("db", "Database").obj("net", "Network");
    return trace::Scene::layout({{"main", {0, 120}}, {"db", {220, 0}}, {"net", {220, 240}}, {"cls", {440, 120}}, {"log", {440, 0}}});
}
// tracer-hide-end

int main() {
    T.view("objects").input("two users, one logger").layout(scene());
    Database db;
    Network net;
    T.at(__LINE__, "main").graphState(S.json()).sequence(S.console()).note("No Logger exists yet; only the class, with its static slot empty.").emit();
    db.save();
    net.send();
    db.save();

    T.dump("traces/singleton.js");
    return 0;
}
