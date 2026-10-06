"""Build the website from scratch and fail on any error.

1. Check that every line of code shown on the site fits the page column
   (79 characters), so readers never need to scroll sideways.
2. Delete the previous build and the widget data, so nothing stale survives.
3. Build the site with Jupyter Book. This runs every code cell of every
   chapter; a failing cell (for example a failed assert) stops the build.
   The chapters' code also writes the data files the widgets read.
4. Run the JavaScript tests, which check the widgets' copies of the
   algorithms against the data the Python code just wrote.
5. Copy the widgets next to the built pages.

Set BASE_URL (for example /ai-timeline-notebook) when the site is served
from a sub-path, as on GitHub Pages.
"""

import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
BUILD_DIRECTORY = REPOSITORY_ROOT / "_build"
SITE_DIRECTORY = BUILD_DIRECTORY / "html"
WIDGET_DIRECTORY = REPOSITORY_ROOT / "widgets"
WIDGET_DATA_DIRECTORY = WIDGET_DIRECTORY / "data"
CHAPTER_DIRECTORY = REPOSITORY_ROOT / "chapters"
MAX_CODE_WIDTH = 79  # The page column fits 84 characters of code.


def shown_code_lines(chapter):
    """Yield (line number, text) for code a reader sees in a chapter."""
    lines = chapter.read_text(encoding="utf-8").splitlines()
    index = 0
    while index < len(lines):
        fence = re.match(r"```\{(code-cell|literalinclude)\}\s*(\S*)", lines[index])
        if not fence:
            index += 1
            continue
        kind, argument = fence.groups()
        body = []
        index += 1
        while not lines[index].startswith("```"):
            body.append((index + 1, lines[index]))
            index += 1
        if kind == "literalinclude":
            # An included file is shown in full.
            included = (chapter.parent / argument).read_text(encoding="utf-8").splitlines()
            yield from ((f"{argument}:{number}", text) for number, text in enumerate(included, 1))
        elif not any("remove-cell" in text or "remove-input" in text for _, text in body):
            yield from ((f"{chapter.name}:{number}", text) for number, text in body)
        index += 1


def check_code_width():
    too_wide = [
        f"  {place} ({len(text)} characters)"
        for chapter in sorted(CHAPTER_DIRECTORY.glob("*.md"))
        for place, text in shown_code_lines(chapter)
        if len(text) > MAX_CODE_WIDTH
    ]
    if too_wide:
        sys.exit(f"Shown code lines longer than {MAX_CODE_WIDTH} characters:\n" + "\n".join(too_wide))


def run(command):
    print(f"\n$ {' '.join(command)}", flush=True)
    # Jupyter Book starts the code kernel by running "python" from PATH.
    # Put this interpreter's folder first so the chapters run with the
    # project's own environment and dependencies.
    environment = dict(os.environ)
    environment["PATH"] = os.pathsep.join([str(Path(sys.executable).parent), environment.get("PATH", "")])
    subprocess.run(command, cwd=REPOSITORY_ROOT, check=True, env=environment)


def main():
    check_code_width()

    for directory in (BUILD_DIRECTORY, WIDGET_DATA_DIRECTORY):
        if directory.exists():
            shutil.rmtree(directory)

    run([sys.executable, "-m", "jupyter", "book", "build", "--html", "--execute", "--strict"])
    run(["node", "--test", str(WIDGET_DIRECTORY / "tests")])

    shutil.copytree(
        WIDGET_DIRECTORY,
        SITE_DIRECTORY / "widgets",
        ignore=shutil.ignore_patterns("tests"),
    )
    print(f"\nSite built in {SITE_DIRECTORY.relative_to(REPOSITORY_ROOT)}/")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        sys.exit(error.returncode)
