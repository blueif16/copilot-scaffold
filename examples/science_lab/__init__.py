"""Science Lab example — Python package.

Exports SUBAGENTS so the skeleton registry can discover and wire smart widgets
without knowing anything about science_lab specifically.
"""
from pathlib import Path
from backend.agent.subagents.registry import SubagentConfig
from examples.science_lab.tools import show_particle_sim
from examples.science_lab.particle_sim_agent import all_tools as particle_sim_domain_tools

_PROMPT_FILE = Path(__file__).parent / "widgets" / "particle-sim" / "agent" / "prompt.md"
_PARTICLE_SIM_PROMPT = (
    _PROMPT_FILE.read_text()
    if _PROMPT_FILE.exists()
    else "You are the Particle Simulation assistant. Help the user explore solid, liquid, and gas states."
)

SUBAGENTS = [
    SubagentConfig(
        id="particle_sim",
        spawn_tool=show_particle_sim,
        domain_tools=particle_sim_domain_tools,
        prompt=_PARTICLE_SIM_PROMPT,
    ),
]
