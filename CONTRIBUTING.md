# Contributing

## Adding a notebook

1. Put it in `notebooks/<topic>/`, named in lowercase `snake_case` after its content (no `_01`/`_02` suffixes).
2. Use only the packages in `requirements.txt`.
3. Add a row to the topic table in `notebooks/README.md`.

## Outputs

ipywidgets don't render on GitHub, so a notebook with no outputs shows nothing there. The rule:

- Each notebook commits **exactly one** static output: a "hero" PNG of its first interactive demo in its default state.
- Every other cell output, and all embedded widget state, is cleared before committing.
- Keep figures at a modest dpi; no animated outputs.
