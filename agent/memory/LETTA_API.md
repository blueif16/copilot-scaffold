# Letta Python Client API Cheatsheet

## Client Initialization

```python
from letta import Letta

# Self-hosted server
client = Letta(base_url="http://localhost:8283")

# Cloud (with API key)
client = Letta(api_key="LETTA_API_KEY")
```

## Agent Creation

```python
agent_state = client.agents.create(
    name="agent-name",
    model="openai/gpt-4o-mini",
    embedding="openai/text-embedding-3-small",
    memory_blocks=[
        {"label": "block_name", "value": "Initial content"},
    ],
    tools=["web_search", "run_code"],  # Optional
    enable_sleeptime=True,  # Background memory processing
    description="Agent description"
)

agent_id = agent_state.id
```

## Memory Block Operations

```python
# Retrieve a single block
block = client.agents.blocks.retrieve(
    agent_id=agent_id,
    block_label="block_name"
)
value = block.value

# List all blocks for an agent
blocks = client.agents.blocks.list(agent_id=agent_id)
for block in blocks:
    print(f"{block.label}: {block.value}")

# Update a block manually
updated_block = client.agents.blocks.update(
    agent_id=agent_id,
    block_label="block_name",
    value="New content"
)
```

## Sending Messages

```python
response = client.agents.messages.create(
    agent_id=agent_id,
    messages=[
        {
            "role": "user",
            "content": "Your message here"
        }
    ]
)

# Process response messages
for message in response.messages:
    if message.message_type == "user_message":
        print(f"User: {message.content}")
    elif message.message_type == "assistant_message":
        print(f"Agent: {message.content}")
    elif message.message_type == "reasoning_message":
        print(f"Reasoning: {message.reasoning}")
```

## Key Concepts

- **Memory blocks**: Persistent, editable sections of agent context
- **Self-editing**: Agents autonomously update their own memory blocks
- **Archival memory**: Full conversation history, searchable via embeddings
- **Sleeptime**: Background processing for memory consolidation
