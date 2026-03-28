"""Photosynthesis Quiz — self-contained widget config.

Everything here is a mechanical transform from CourseBuilder output:
  state.json fields → TrackedStateField + spawn tool return
  data.json topic   → prompt.md
  QuizView.jsx      → PhotosynthesisQuiz.tsx (wiring swap)
"""
from pathlib import Path
from langchain_core.tools import tool
from backend.agent.subagents.registry import SubagentConfig, TrackedStateField
from examples.textbook_content.shared_tools import quiz_domain_tools


# ── Spawn tool ───────────────────────────────────────────
# Initial values: mechanical copy from state.json fields

@tool
def show_photosynthesis_quiz() -> dict:
    """Show the Photosynthesis Quiz. [Layout: full width, fill height]"""
    # Transformed from state.json — each key matches a TrackedStateField below
    return {
        "currentIndex": 0,
        "answers": {},
        "results": {},
        "phase": "in_progress",
        "score": 0,
        "totalQuestions": 5,
    }


# ── Subagent config ──────────────────────────────────────
# TrackedStateField: mechanical copy from state.json key + description

_PROMPT_FILE = Path(__file__).parent / "prompt.md"
_PROMPT = _PROMPT_FILE.read_text() if _PROMPT_FILE.exists() else "You are a photosynthesis tutor."

SUBAGENT = SubagentConfig(
    id="photosynthesis_quiz",
    spawn_tool=show_photosynthesis_quiz,
    domain_tools=quiz_domain_tools,
    prompt=_PROMPT,
    intro_message="光合作用测验开始！选一个答案，答不上来可以问我要提示哦！",
    # Transformed from state.json — each entry is (key, description) from the schema
    tracked_state=[
        TrackedStateField("currentIndex", "Zero-based index of the active question"),
        TrackedStateField("answers", "Map of question index (string) to selected option key. e.g. {\"0\":\"B\",\"2\":\"A\"}. Missing keys = unanswered."),
        TrackedStateField("results", "Map of question index (string) to 'correct' or 'wrong'. Set after each answer."),
        TrackedStateField("phase", "Quiz phase: in_progress (answering), review (results summary), complete (finished)."),
        TrackedStateField("score", "Number of correct answers so far."),
        TrackedStateField("totalQuestions", "Total number of questions in this quiz."),
    ],
)
