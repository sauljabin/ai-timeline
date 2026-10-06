% Facts: things that are simply true.
mother_child(trude, sally).

father_child(tom, sally).
father_child(tom, erica).
father_child(mike, tom).

% A parent is a mother or a father: two clauses mean "or".
parent_child(Parent, Child) :- mother_child(Parent, Child).
parent_child(Parent, Child) :- father_child(Parent, Child).

% Siblings share a parent. \= stops a person from being their own sibling.
sibling(Person, Sibling) :-
    parent_child(Parent, Person),
    parent_child(Parent, Sibling),
    Person \= Sibling.

% Base case: a parent is an ancestor.
ancestor(Ancestor, Descendant) :- parent_child(Ancestor, Descendant).
% Recursive case: a parent of an ancestor is an ancestor.
ancestor(Ancestor, Descendant) :-
    parent_child(Ancestor, Person),
    ancestor(Person, Descendant).
