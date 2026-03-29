# Manim

**Manim** is a Python framework for **educational and explanatory animation** (equations, diagrams, camera moves). Zenvi can integrate optional Manim workflows for that style of content. It is **not** required for normal cutting, transitions, or UGC style edits.

## Setup

Install Python deps from **requirements-manim.txt** and system libraries for **Cairo** and **Pango** on Linux (see **zenvi-core** README). Manim renders can be **slow** and are often **queued** so the UI stays responsive.

## When to use it

Use Manim when you want **math, charts, or step by step teaching motion** that is easier to express as code than as keyframes in a traditional NLE. For social edits and interview cutting, you can ignore Manim entirely.

[Manim community resources](https://www.manim.community/)

> **Tip:** If import errors mention Cairo or Pango, fix system packages first before reinstalling pip deps.
