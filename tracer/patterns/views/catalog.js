// catalog.js - metadata only, one entry per design pattern (chapters become the sidebar groups).
window.CATALOG = [
  { chapter: '1 · Creational', items: [
    { id: 'singleton',       name: 'Singleton',       what: 'Exactly one instance, shared through a static access function' },
    { id: 'factory_method',  name: 'Factory Method',  what: 'Subclasses decide which concrete class the shared code creates' },
    { id: 'builder',         name: 'Builder',         what: 'Assemble a complex object step by step, create it only when complete' },
  ]},
  { chapter: '2 · Structural', items: [
    { id: 'adapter',         name: 'Adapter',         what: 'Make an existing class fit the interface a client expects' },
    { id: 'decorator',       name: 'Decorator',       what: 'Add behaviour by wrapping objects with the same interface' },
    { id: 'composite',       name: 'Composite',       what: 'Treat a tree of objects and a single object the same way' },
    { id: 'proxy',           name: 'Proxy',           what: 'A stand-in that controls access, here creating the real object lazily' },
  ]},
  { chapter: '3 · Behavioural', items: [
    { id: 'strategy',        name: 'Strategy',        what: 'Interchangeable algorithms behind one interface, swapped at run time' },
    { id: 'observer',        name: 'Observer',        what: 'A subject notifies every subscribed observer through one interface' },
    { id: 'command',         name: 'Command',         what: 'Requests as objects: run them, keep a history, undo them' },
    { id: 'state',           name: 'State',           what: 'Behaviour that changes with state, one class per state' },
    { id: 'template_method', name: 'Template Method', what: 'A fixed algorithm skeleton whose steps subclasses fill in' },
    { id: 'chain',           name: 'Chain of Responsibility', what: 'Pass a request along handlers until one deals with it' },
  ]},
];
