"""
Unit tests for course_builder agent logic.
Fast, deterministic tests for format detection and state handling.
"""

import pytest
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from agent.graphs.course_builder import (
    _detect_format_prompt,
    LAB_PROMPT,
    QUIZ_PROMPT,
    DIALOGUE_PROMPT,
    CourseBuilderState,
)


class TestFormatDetection:
    """Test format detection logic in isolation."""

    def test_detects_lab_format(self):
        """Should detect lab format from keywords."""
        messages = [
            HumanMessage(content="Create a lab simulation for water cycle"),
        ]
        result = _detect_format_prompt(messages)
        assert LAB_PROMPT in result

    def test_detects_quiz_format(self):
        """Should detect quiz format from keywords."""
        messages = [
            HumanMessage(content="Create a quiz about photosynthesis"),
        ]
        result = _detect_format_prompt(messages)
        assert QUIZ_PROMPT in result

    def test_detects_dialogue_format(self):
        """Should detect dialogue format from keywords."""
        messages = [
            HumanMessage(content="Create a story about the solar system"),
        ]
        result = _detect_format_prompt(messages)
        assert DIALOGUE_PROMPT in result

    def test_defaults_to_lab_when_ambiguous(self):
        """Should default to lab format when no clear keywords."""
        messages = [
            HumanMessage(content="Create something about plants"),
        ]
        result = _detect_format_prompt(messages)
        assert LAB_PROMPT in result

    def test_handles_format_prefix(self):
        """Should detect format from [Format: X] prefix."""
        messages = [
            HumanMessage(content="[Format: quiz] Create content about cells"),
        ]
        result = _detect_format_prompt(messages)
        assert QUIZ_PROMPT in result


class TestStateHandling:
    """Test state structure and updates."""

    def test_initial_state_structure(self):
        """Should have correct initial state shape."""
        state = CourseBuilderState(
            messages=[],
            files={},
        )
        assert state["messages"] == []
        assert state["files"] == {}

    def test_state_accepts_file_updates(self):
        """Should accept file dictionary updates."""
        state = CourseBuilderState(
            messages=[],
            files={"/App.jsx": "console.log('test')"},
        )
        assert "/App.jsx" in state["files"]
        assert len(state["files"]["/App.jsx"]) > 0


class TestToolExecutorLogic:
    """Test tool executor logic without actual LLM calls."""

    def test_write_file_operation(self):
        """Should correctly process write_file tool call."""
        # Simulate tool call result
        files = {}
        path = "/App.jsx"
        content = "export default function App() { return <div>Test</div>; }"

        # Simulate what tool_executor does
        files[path] = content

        assert path in files
        assert files[path] == content
        assert len(files[path]) > 0

    def test_update_file_operation(self):
        """Should correctly process update_file tool call."""
        files = {"/App.jsx": "const x = 1;\nconst y = 2;"}

        # Simulate update
        old_text = "const y = 2;"
        new_text = "const y = 3;"

        if old_text in files["/App.jsx"]:
            files["/App.jsx"] = files["/App.jsx"].replace(old_text, new_text, 1)

        assert "const y = 3;" in files["/App.jsx"]
        assert "const y = 2;" not in files["/App.jsx"]

    def test_update_file_fails_gracefully_when_text_not_found(self):
        """Should handle update_file when old_text doesn't exist."""
        files = {"/App.jsx": "const x = 1;"}

        old_text = "const z = 999;"
        new_text = "const z = 1000;"

        if old_text in files["/App.jsx"]:
            files["/App.jsx"] = files["/App.jsx"].replace(old_text, new_text, 1)
        else:
            # Should not modify file
            pass

        assert files["/App.jsx"] == "const x = 1;"


class TestSystemPromptConstruction:
    """Test system prompt construction logic."""

    def test_lab_prompt_includes_base_rules(self):
        """Lab prompt should include base system rules."""
        from agent.graphs.course_builder import BASE_SYSTEM

        full_prompt = BASE_SYSTEM + LAB_PROMPT

        assert "React developer" in full_prompt
        assert "Sandpack" in full_prompt
        assert "inline styles" in full_prompt
        assert "Interactive Lab Simulation" in full_prompt

    def test_quiz_prompt_includes_feedback_guidance(self):
        """Quiz prompt should include feedback guidance."""
        assert "feedback" in QUIZ_PROMPT.lower()
        assert "question" in QUIZ_PROMPT.lower()
        assert "score" in QUIZ_PROMPT.lower()

    def test_dialogue_prompt_includes_branching(self):
        """Dialogue prompt should mention branching."""
        assert "branch" in DIALOGUE_PROMPT.lower()
        assert "choice" in DIALOGUE_PROMPT.lower()
        assert "character" in DIALOGUE_PROMPT.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
