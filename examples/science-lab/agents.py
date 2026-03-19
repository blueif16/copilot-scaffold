# Science Lab example — backend agent declarations.
# Only smart widgets with agent: { id, promptFile, toolsModule } need entries here.
# Dumb widgets (agent: null) are not listed — they have no backend agent.

WIDGET_AGENTS = [
    # No smart widgets in this demo — both UserCard and TopicProgress are dumb.
    # When you add smart widgets, add entries like:
    # {
    #   "id": "ice-cream-expert",
    #   "prompt_file": Path(__file__).parent / "widgets/ice-cream-maker/agent/prompt.md",
    #   "tools_module": "examples.science_lab.widgets.ice_cream_maker.agent.tools",
    # },
]
