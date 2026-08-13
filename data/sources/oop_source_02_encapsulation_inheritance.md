# Java OOP Foundations: Encapsulation and Inheritance

Encapsulation protects object state by keeping fields private and exposing controlled behavior through methods. In Java, private fields cannot be directly changed by unrelated outside code. Getters and setters can expose carefully controlled access, including validation before state changes. Encapsulation is not the same as perfect security; it is a design boundary that reduces accidental misuse.

Inheritance models an is-a relationship between a superclass and subclass. A subclass declared with `extends` inherits accessible behavior from its superclass and may add specialized behavior. Inheritance should not be used for every reuse problem. If one object merely has or uses another object, composition is usually clearer than inheritance.
