% Records Prolog's search tree for a query, using a tiny Prolog interpreter
% written in Prolog. It searches in the same order as Prolog itself: the first
% goal first, clauses from top to bottom, backtracking on failure.
%
% Each node of the tree is the list of goals still to prove. A node's children
% are the nodes reached by using one clause for its first goal. A node with no
% goals left is an answer; a node with no matching clause is a dead end.

:- dynamic event/1.
:- dynamic counter/1.

% search_tree(+QueryText, -Events): runs the query and returns the events in
% the order the search produced them, as lists:
%   [node, Id, ParentId, Line, ResolvedGoal, Goals]  a new node
%   [answer, Id, Bindings]                           all goals proved
%   [done, Id, Reason]                               every option tried;
%                                                    Reason is test (a built-in
%                                                    test failed) or tried
search_tree(QueryText, Events) :-
    retractall(event(_)),
    retractall(counter(_)),
    assertz(counter(0)),
    term_string(Query, QueryText, [variable_names(Names)]),
    forall(node([Query], Names, none, none, none), true),
    findall(Event, event(Event), Events).

node(Goals, Names, Parent, Line, Resolved) :-
    retract(counter(Last)),
    Id is Last + 1,
    assertz(counter(Id)),
    show(Names, Goals, GoalsText),
    assertz(event([node, Id, Parent, Line, Resolved, GoalsText])),
    expand(Goals, Names, Id).

% No goals left: the query is proved. Record the variable values.
expand([], Names, Id) :- !,
    findall(Text, (member(Name = Value, Names), show_binding(Names, Name, Value, Text)), Bindings),
    atomic_list_concat(Bindings, ', ', BindingsText),
    assertz(event([answer, Id, BindingsText])).
% A built-in test such as \= has no clauses: it either succeeds or fails.
expand([Goal | Rest], Names, Id) :-
    predicate_property(Goal, built_in), !,
    show(Names, [Goal], GoalText),
    (   call(Goal)
    ->  (   node(Rest, Names, Id, builtin, GoalText)
        ;   assertz(event([done, Id, tried])), fail
        )
    ;   assertz(event([done, Id, test])), fail
    ).
% Otherwise try every clause whose head matches the first goal, in order.
expand([Goal | Rest], Names, Id) :-
    show(Names, [Goal], GoalText),
    (   nth_clause(Goal, _, Reference),
        clause(Goal, Body, Reference),
        clause_property(Reference, line_count(Line)),
        body_goals(Body, BodyGoals),
        append(BodyGoals, Rest, Next),
        node(Next, Names, Id, Line, GoalText)
    ;   assertz(event([done, Id, tried])), fail
    ).

body_goals(true, []) :- !.
body_goals((First, Rest), [First | Goals]) :- !, body_goals(Rest, Goals).
body_goals(Goal, [Goal]).

% Prints goals with the query's own variable names; other unbound variables
% get letters A, B, ... so shared variables keep the same name.
show(Names, Goals, Text) :-
    copy_term(Names-Goals, NamesCopy-GoalsCopy),
    maplist(name_variable, NamesCopy),
    numbervars(GoalsCopy, 0, _),
    (   GoalsCopy == []
    ->  Text = true  % An atom, like every other text this file returns.
    ;   maplist(goal_text, GoalsCopy, Texts),
        atomic_list_concat(Texts, ', ', Text)
    ).

% Binds a still-unbound query variable to its name, so it prints as that name.
name_variable(Name = Variable) :- ignore(Variable = '$VAR'(Name)).

goal_text(Goal, Text) :-
    format(string(Text), "~W", [Goal, [quoted(true), numbervars(true), spacing(next_argument)]]).

show_binding(Names, Name, Value, Text) :-
    show(Names, [Value], ValueText),
    format(string(Text), "~w = ~w", [Name, ValueText]).
