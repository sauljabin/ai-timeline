"""Execute every notebook and retain only reproducible metadata and outputs."""

import json
import subprocess
import sys
import tempfile
from pathlib import Path
from shutil import copy2


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
NOTEBOOK_DIRECTORY = REPOSITORY_ROOT / "notebooks"
NOTEBOOK_PATTERN = "*.ipynb"


def normalized_notebook(path):
    notebook = json.loads(path.read_text(encoding="utf-8"))

    for cell in notebook.get("cells", []):
        cell.get("metadata", {}).pop("execution", None)

    language_info = notebook.get("metadata", {}).get("language_info", {})
    language_info.pop("version", None)

    return json.dumps(notebook, ensure_ascii=False, indent=1) + "\n"


def execute_notebook(path, working_directory):
    command = [
        sys.executable,
        "-m",
        "jupyter",
        "nbconvert",
        "--to",
        "notebook",
        "--execute",
        "--inplace",
        "--ExecutePreprocessor.timeout=180",
        "--ExecutePreprocessor.record_timing=False",
        path.name,
    ]
    subprocess.run(command, cwd=working_directory, check=True)


def main():
    notebook_paths = sorted(NOTEBOOK_DIRECTORY.glob(NOTEBOOK_PATTERN))

    if not notebook_paths:
        raise SystemExit("No notebooks found.")

    with tempfile.TemporaryDirectory(prefix="ai-timeline-notebooks-") as temporary_directory:
        temporary_notebooks = Path(temporary_directory) / "notebooks"
        temporary_notebooks.mkdir()

        for source_path in NOTEBOOK_DIRECTORY.iterdir():
            if source_path.suffix in {".ipynb", ".py"}:
                copy2(source_path, temporary_notebooks / source_path.name)

        executed_notebooks = {}

        for notebook_path in notebook_paths:
            temporary_path = temporary_notebooks / notebook_path.name
            print(f"Executing {notebook_path.relative_to(REPOSITORY_ROOT)}")
            execute_notebook(temporary_path, temporary_notebooks)
            executed_notebooks[notebook_path] = normalized_notebook(temporary_path)

    for notebook_path, executed_content in executed_notebooks.items():
        if notebook_path.read_text(encoding="utf-8") != executed_content:
            notebook_path.write_text(executed_content, encoding="utf-8")


if __name__ == "__main__":
    main()
