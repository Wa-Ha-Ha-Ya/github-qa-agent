import os

def load_instructions() -> str:
    md_path = os.path.join(os.path.dirname(__file__), "../../instructions.md")
    with open(md_path, "r", encoding="utf-8") as f:
        return f.read().strip()