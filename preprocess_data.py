import importlib
import sys


def main() -> None:
    """
    Delegate to the canonical preprocessing script in data/preprocess_data.py.

    This wrapper exists to avoid duplicating preprocessing logic at the project
    root while preserving the existing entry point:

        python preprocess_data.py
    """
    try:
        # Importing the module will execute its top-level script logic, if any.
        importlib.import_module("data.preprocess_data")
    except ImportError as exc:
        print(
            "Error: Could not import the canonical preprocessing script "
            "'data/preprocess_data.py'.\n"
            f"Details: {exc}"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
