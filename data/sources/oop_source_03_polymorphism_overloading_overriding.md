# Java OOP Foundations: Overloading, Overriding, and Polymorphism

Method overloading means defining methods with the same name but different parameter lists in the same class or inheritance context. Java chooses an overloaded method at compile time from the method signature. Changing only the return type is not enough to overload a method.

Method overriding means a subclass provides a compatible replacement for a superclass method. The method name and compatible signature must match, and `@Override` helps Java detect mistakes. Polymorphism uses overriding when a superclass reference points to a subclass object and the actual object type determines which method runs at runtime.
