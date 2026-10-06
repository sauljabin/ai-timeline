---
kernelspec:
  name: python3
  display_name: Python 3
---

# 1972 Prolog

Prolog is a programming language in which you write down facts and rules, then ask questions, and the computer searches for the answers itself. Alain Colmerauer and Philippe Roussel created it in 1972 at the University of Aix-Marseille ("Prolog" comes from *programmation en logique*). Their goal was a system that could answer questions about texts written in French. Robert Kowalski, then at the University of Edinburgh, supplied the theory: logical statements can be read as a program, and answering a question means searching for a proof. Prolog became the main language of symbolic AI in Europe and Japan.

## High-Level Ideas

A Prolog program is a list of statements, not a list of steps. Take this tiny program:

```prolog
father_child(tom, sally).
parent_child(P, C) :- father_child(P, C).
```

The first line is a *fact*: Tom is Sally's father. The second is a *rule*. Read `:-` as "if": P is a parent of C if P is the father of C. Names that start with a capital letter, like `P` and `C`, are *variables*.

Now ask the *query* `parent_child(Who, sally)`. Prolog finds the rule whose head `parent_child(P, C)` can be made identical to the question by setting `P = Who` and `C = sally`. Making two terms identical by giving variables values is called *unification*. The rule now needs `father_child(Who, sally)`, which unifies with the fact when `Who = tom`. Answer: `Who = tom`.

When a path fails, or after it reports an answer, Prolog goes back to its last choice and tries the next option. This is called *backtracking*. Prolog tries statements from top to bottom, and the parts of a rule from left to right.

## Example: A Family Tree

The program below has four facts and five rules. The `ancestor` rule refers to itself, so it can follow a chain of parents of any length.

```{literalinclude} family.pl
:lang: prolog
```

## Example: Asking Questions

This page runs real SWI-Prolog from Python through the PySwip library. `consult` loads the program file above, and `query` returns one answer per solution, as a dictionary of variable values.

```{code-cell} python
from pyswip import Prolog

prolog = Prolog()
# Loading the file again replaces it, so re-running adds no duplicates.
prolog.consult("family.pl")


def ask(query):
    answers = list(prolog.query(query))
    print(f"?- {query}.")
    for answer in answers:
        bindings = [f"{name} = {value}" for name, value in answer.items()]
        print("   " + (", ".join(bindings) or "true"))
    if not answers:
        print("   false")
    return answers


children = ask("father_child(tom, Child)")
siblings = ask("sibling(sally, Sibling)")
known = ask("ancestor(mike, sally)")

assert [answer["Child"] for answer in children] == ["sally", "erica"]
assert [answer["Sibling"] for answer in siblings] == ["erica"]
# One proof and no variables to report: the answer is "true".
assert known == [{}]
```

Nothing in the program says Mike is Sally's ancestor. Prolog proved it: Mike is Tom's father, and Tom is Sally's father.

## Example: The Search Tree

Prolog gives its answers in the order its search finds them:

```{code-cell} python
ancestors = ask("ancestor(Who, sally)")

assert [answer["Who"] for answer in ancestors] == ["trude", "tom", "mike"]
```

The usual way to draw that search is a *search tree*. Take the question `parent_child(Who, sally)`. The root of the tree is the question itself. Prolog takes the first goal and looks for clauses whose head matches it. Each matching clause starts a branch, and the branch leads to a new node: the goals that are still left to prove. Here there are two branches, one for the mother rule and one for the father rule. Following the mother rule leaves the goal `mother_child(Who, sally)`, and the fact `mother_child(trude, sally)` proves it with `Who = trude`. A node with no goals left is an *answer*. A node whose first goal matches nothing is a *dead end*, and Prolog backtracks to the nearest node that still has an untried branch.

The panel grows the tree one step at a time, in the order Prolog explores it, and highlights the clause used in the program. Start with `parent_child(Who, sally)`, then try `sibling(sally, Sibling)`: there, two branches reach the test `sally \= sally`, which fails, because Sally is not her own sibling. When a tree is too wide for text, such as the 52-node `ancestor(Who, sally)` tree, its nodes are drawn as dots and a box under the tree shows the current node.

```{code-cell} python
:tags: [remove-cell]
import json
from pathlib import Path

# search_tree.pl is a small Prolog interpreter written in Prolog. It searches
# in the same order as Prolog itself and records every node of the tree.
prolog.consult("search_tree.pl")


def readable(goal_text):
    # SWI-Prolog prints \= without spaces; add them for the reader.
    return goal_text.replace("\\=", " \\= ")


def split_goals(goals_text):
    # "a(X, Y), b(Y)" -> ["a(X, Y)", "b(Y)"]: split only at commas
    # outside parentheses. "true" means no goals are left.
    if goals_text == "true":
        return []
    goals, depth, current = [], 0, ""
    for character in goals_text:
        depth += {"(": 1, ")": -1}.get(character, 0)
        if character == "," and depth == 0:
            goals.append(current.strip())
            current = ""
        else:
            current += character
    return goals + [current.strip()]


def record_search(query):
    result = list(prolog.query(f'search_tree("{query}", Events)'))[0]
    events = []
    for event in result["Events"]:
        kind, node_id = event[0], event[1]
        if kind == "node":
            _, _, parent, line, resolved, goals = event
            events.append({
                "type": "node", "id": node_id,
                "parent": None if parent == "none" else parent,
                "line": None if line == "none" else line,
                "resolved": readable(resolved),
                "goals": split_goals(readable(goals)),
            })
        elif kind == "answer":
            events.append({"type": "answer", "id": node_id, "bindings": event[2]})
        else:
            events.append({"type": "done", "id": node_id, "reason": event[2]})
    # The recorder must find the same answers as asking SWI-Prolog directly.
    direct = [
        ", ".join(f"{name} = {value}" for name, value in answer.items())
        for answer in prolog.query(query)
    ]
    recorded = [event["bindings"] for event in events if event["type"] == "answer"]
    assert recorded == direct, (query, recorded, direct)
    return {"query": query, "events": events, "answers": direct}


searches = [
    record_search("parent_child(Who, sally)"),
    record_search("sibling(sally, Sibling)"),
    record_search("ancestor(Who, sally)"),
]
assert [len([e for e in s["events"] if e["type"] == "node"]) for s in searches] == [5, 14, 52]

# The sibling tree reaches the failing test "sally \\= sally" on two branches.
sibling_events = searches[1]["events"]
failed_tests = [
    e for e in sibling_events
    if e["type"] == "node" and e["goals"] == ["sally \\= sally"]
]
assert len(failed_tests) == 2

# Check the description of the ancestor tree below: its leaves are 3 answers and
# 22 dead ends, and every dead end is a mother_child or father_child goal
# that matches no fact.
ancestor_events = searches[2]["events"]
nodes = {e["id"]: e for e in ancestor_events if e["type"] == "node"}
parents = {node["parent"] for node in nodes.values()}
answer_ids = {e["id"] for e in ancestor_events if e["type"] == "answer"}
dead_ends = [n for i, n in nodes.items() if i not in parents and i not in answer_ids]
assert len(answer_ids) == 3 and len(dead_ends) == 22
assert all(n["goals"][0].startswith(("mother_child(", "father_child(")) for n in dead_ends)

data_directory = Path("../widgets/data")
data_directory.mkdir(parents=True, exist_ok=True)
(data_directory / "prolog-tree.json").write_text(json.dumps({
    "program": Path("family.pl").read_text().rstrip("\n"),
    "searches": searches,
}))
```

```{anywidget} ../widgets/prolog-tree.mjs
{ "data": "prolog-tree.json" }
```

The code that runs this panel is in [chapters/1972-prolog.md](https://github.com/sauljabin/ai-timeline-notebook/blob/main/chapters/1972-prolog.md) and [chapters/search_tree.pl](https://github.com/sauljabin/ai-timeline-notebook/blob/main/chapters/search_tree.pl), a small Prolog program that records the tree while searching in the same order as Prolog.

In the `ancestor(Who, sally)` tree, the first branch uses the base rule on line 19 and finds `trude` and then `tom`, because the mother rule comes before the father rule. The second branch uses the recursive rule on line 21. It walks through every parent-child pair, and only the pair Mike and Tom leads to an answer: `mike`. The tree's other 22 leaves are dead ends, each a `mother_child` or `father_child` goal that matches no fact.

## Example: Statement Order Matters

Because the search goes top to bottom and left to right, changing the order of statements changes the order of the answers, without changing which answers are true. The next cell edits a copy of the program in three ways and asks the same question each time, in a fresh SWI-Prolog process. In the last version the recursive rule calls itself first: `ancestor(A, D) :- ancestor(A, P), parent_child(P, D)`. After the real answers, that rule keeps calling itself forever, so a 3-second limit stops it.

```{code-cell} python
:tags: [remove-input]
import subprocess
import tempfile

program = Path("family.pl").read_text()
mother_rule = "parent_child(Parent, Child) :- mother_child(Parent, Child).\n"
father_rule = "parent_child(Parent, Child) :- father_child(Parent, Child).\n"
base_rule = "ancestor(Ancestor, Descendant) :- parent_child(Ancestor, Descendant).\n"
recursive_rule = "ancestor(Ancestor, Descendant) :-\n    parent_child(Ancestor, Person),\n    ancestor(Person, Descendant).\n"
left_recursive_rule = "ancestor(Ancestor, Descendant) :-\n    ancestor(Ancestor, Person),\n    parent_child(Person, Descendant).\n"
for rule in (mother_rule, father_rule, base_rule, recursive_rule):
    assert program.count(rule) == 1

variants = {
    "As written": program,
    "Father rule before mother rule": program.replace(mother_rule + father_rule, father_rule + mother_rule),
    "Recursive ancestor rule first": program.replace(base_rule, "").replace(recursive_rule, recursive_rule + base_rule),
    "Recursive rule calls itself first": program.replace(recursive_rule, left_recursive_rule),
}

# findall collects every answer; the time limit turns an endless search into a printed result.
goal = (
    "catch(call_with_time_limit(3, (findall(A, ancestor(A, sally), Answers), print(Answers))),"
    " time_limit_exceeded, write('no end: stopped after 3 seconds')), nl"
)
results = {}
for name, source in variants.items():
    with tempfile.NamedTemporaryFile("w", suffix=".pl") as file:
        file.write(source)
        file.flush()
        completed = subprocess.run(
            ["swipl", "-q", "-g", goal, "-t", "halt", file.name],
            capture_output=True, text=True, check=True,
        )
    results[name] = completed.stdout.strip()
    print(f"{name:>34}: {results[name]}")

assert results == {
    "As written": "[trude,tom,mike]",
    "Father rule before mother rule": "[tom,trude,mike]",
    "Recursive ancestor rule first": "[mike,trude,tom]",
    "Recursive rule calls itself first": "no end: stopped after 3 seconds",
}
```

Same facts and the same logic give different answer orders, or no end at all. Prolog reads like logic, but the programmer still has to think about the order of the search.

## Why This Mattered

Prolog turned "write down what is true, then ask questions" into a working programming language. It was used for expert systems, natural-language processing, and theorem proving. Japan's Fifth Generation Computer Systems project, started in 1982, chose logic programming as the basis for its machines. Prolog's search, unification, and backtracking also influenced later rule engines and database query languages such as Datalog.

## How This Differs from the Original

The family tree is the standard teaching example from the Wikipedia article on Prolog, with the `\=` check and the `ancestor` rules added. The 1972 Marseille system was a question-answering program for French text, and its syntax differed from the standard Prolog that SWI-Prolog runs today.

## Sources

- Alain Colmerauer and Philippe Roussel, "The birth of Prolog", *History of Programming Languages II*, ACM, 1996 (first published in *ACM SIGPLAN Notices* 28(3), 1993).
- Robert Kowalski, "Predicate logic as programming language", *Proceedings of the IFIP Congress 74*, North-Holland, 1974, pp. 569–574.
- Wikipedia, "Prolog", section "Syntax and semantics": source of the family-tree facts.
