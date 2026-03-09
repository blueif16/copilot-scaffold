# ═══════════════════════════════════════════════════════════
# Course Builder Agent — generates interactive JSX simulations
#
# Architecture:
#   Backend tools write to state["files"] directly.
#   copilotkit_emit_state pushes file changes to frontend in real-time.
#   Frontend useCoAgent reads state.files reactively → feeds to Sandpack.
#
#   No CopilotKit actions needed. Pure state sync.
#
# Graph: chat_node ←→ tool_executor (ReAct loop)
# ═══════════════════════════════════════════════════════════

from __future__ import annotations

import json
from typing import Any, Literal

from copilotkit import CopilotKitState
from copilotkit.langgraph import copilotkit_emit_state
from config import get_gemini_model
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langgraph.graph import END, START, StateGraph
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver


# ── System Prompts per Format ────────────────────────────

BASE_SYSTEM = """你是一位专业的教育互动设计师和React开发者。
你帮助老师为中国小学生创建互动科学课程。

你必须始终使用中文回复。

规则：
- JSX 必须在 Sandpack 中运行，可用 React + framer-motion
- 只使用内联样式 — 不能导入 CSS，不能用 Tailwind（Sandpack 没有）
- 所有状态使用本地管理（useState, useRef, useEffect）
- 触控友好：所有交互元素最小 48px 点击区域
- 代码整洁，注释清晰，视觉效果适合儿童
- 使用明亮、活泼的颜色
- 所有界面文字必须使用中文

工具使用规则（严格遵守）：
1. 会话开始时，先调用 list_files 了解现有文件
2. 使用 update_file 之前，必须先调用 read_file 验证：
   - 文件是否存在
   - old_text 是否在文件中（必须完全匹配，包括空格和换行）
3. 如果不确定文件内容，使用 write_file 完全重写
4. 小改动用 update_file，大改动用 write_file

工具选择指南：
- read_file：验证文件内容、检查修改前状态
- list_files：了解文件结构、确认文件存在
- write_file：创建新文件、完全重写、结构性变更
- update_file：修改特定函数、更新样式、调整文本
- delete_file：删除不需要的文件

效率规则：
- 文件 < 100 行：可以用 write_file 重写
- 文件 > 100 行：必须用 update_file 做局部修改
- 修改 < 20% 的内容：必须用 update_file

你必须始终写入 "/App.js" 作为主组件文件（注意是 .js 不是 .jsx，Sandpack 默认入口是 /App.js）。
也可以写入 "/interactions.json" 用于事件-反应映射。

重要：对话开始时，不要立即生成代码。
先了解老师的需求。如果请求模糊，请询问以下关键信息：
1. 教材版本（人教版、苏教版、北师大版等）
2. 年级（一年级到六年级）
3. 具体知识点（例如：三年级上册「水的三态变化」）

只有在获得足够上下文后才生成代码。
如果老师已经明确说明了知识点，可以直接开始生成。

模板工作流程：
沙盒中通常已有一个格式模板（/App.js），包含该格式的通用骨架代码。
获得知识点后，你应该：
1. 先调用 read_file("/App.js") 查看模板内容
2. 用 update_file 做针对性修改（替换配置数据、标题、可视化内容等）
3. 不要删除模板再重写 — 用 update_file 保留结构，只替换占位内容
4. 如果改动超过 50%，才考虑用 write_file 完全重写"""

LAB_PROMPT = """
格式：交互式实验模拟

你正在构建一个交互式实验/模拟，学生可以操控变量并观察可视化结果。
包括：滑块、拖放操作、动画状态变化。

组件接收一个 prop：`onEvent` — 用于有意义的交互回调。
在以下时刻调用 onEvent({ type, data })：
- phase_change, milestone, dwell_timeout, first_interaction, experiment_complete

结构：
- 可视化模拟区域（"实验台"）占约 60% 空间
- 控制面板：滑块、按钮、开关
- 状态/信息面板显示当前状态

使用 requestAnimationFrame 或 useEffect 定时器制作动画。
使用鲜艳的渐变和圆角形状 — 让它感觉像一个真正的儿童科学应用。
所有界面文字必须使用中文。"""

QUIZ_PROMPT = """
格式：交互式测验

你正在构建一个测验/评估，学生回答问题并获得即时反馈。
包括：选择题、拖拽匹配、填空题。

结构：
- 题目显示区域，文字大且清晰
- 答案选项为大号可点击按钮（最小 48px 高度）
- 进度指示器（例如"第 3 题 / 共 10 题"）
- 得分追踪
- 正确/错误时的反馈动画（正确时彩花，错误时轻微抖动）
- 结束时的总结界面，显示分数和鼓励语

至少包含 5 道题，每题 3-4 个选项。
错误反馈要有教育意义，不要惩罚性的 — 解释为什么正确答案是对的。
所有题目和选项必须使用中文。"""

DIALOGUE_PROMPT = """
格式：交互式对话/故事

你正在构建一个对话/叙事体验，学生与角色互动并做出影响故事的选择。

结构：
- 角色显示区域，带简单头像/插图（使用 emoji 或 CSS 艺术）
- 角色对话的气泡框
- 学生回应的选择按钮（每轮 2-3 个选项）
- 基于选择的分支路径
- 进度/章节指示器

角色要温暖、鼓励。使用讲故事的方式教授概念。
每个对话分支应教授关于该主题的不同内容。
所有对话和选项必须使用中文。"""


# ── Path Validation ──────────────────────────────────────

def validate_path(path: str) -> tuple[bool, str]:
    """Validate file path for Sandpack virtual filesystem."""
    if not path.startswith('/'):
        return False, "Path must start with / (e.g., /App.js)"

    # Sandpack typically uses root-level files
    if path.count('/') > 2:
        return False, "Sandpack works best with shallow file structures"

    # Validate extensions
    allowed_extensions = ['.jsx', '.js', '.tsx', '.ts', '.json', '.css']
    if not any(path.endswith(ext) for ext in allowed_extensions):
        return False, f"File extension not supported. Use: {', '.join(allowed_extensions)}"

    return True, ""


# ── Tools (modify state directly) ────────────────────────

@tool
def read_file(path: str) -> str:
    """Read the current content of a file.
    ALWAYS call this before update_file to verify the file exists and contains the expected text.

    Args:
        path: File path to read (e.g., /App.js)

    Returns:
        File content as string, or error message if file doesn't exist
    """
    return json.dumps({"action": "read", "path": path})


@tool
def list_files() -> str:
    """List all files currently in the sandbox.
    Call this at the start of a session to understand what files exist.

    Returns:
        JSON array of file paths
    """
    return json.dumps({"action": "list"})


@tool
def write_file(path: str, content: str) -> str:
    """Write or overwrite a file in the sandbox environment.
    Use this to create or fully replace files.

    Args:
        path: File path starting with / (e.g., /App.js, /interactions.json)
        content: The full file content to write.
    """
    return json.dumps({"action": "write", "path": path, "content": content})


@tool
def update_file(path: str, old_text: str, new_text: str) -> str:
    """Replace a specific section of text in an existing file.
    IMPORTANT: Call read_file first to verify the exact text exists.
    Use this for targeted edits instead of rewriting the entire file.

    Args:
        path: File path to edit (e.g., /App.js)
        old_text: The exact text to find and replace (must be unique in file)
        new_text: The replacement text
    """
    return json.dumps({"action": "update", "path": path, "old_text": old_text, "new_text": new_text})


@tool
def delete_file(path: str) -> str:
    """Delete a file from the sandbox.

    Args:
        path: File path to delete
    """
    return json.dumps({"action": "delete", "path": path})


TOOLS = [read_file, list_files, write_file, update_file, delete_file]


# ── Agent State ──────────────────────────────────────────

class CourseBuilderState(CopilotKitState):
    """Course builder agent state.
    CopilotKitState provides: messages, copilotkit (actions + context).
    """
    files: dict[str, str]
    uploaded_images: list[dict[str, str]]  # [{id, base64, mimeType, filename}]


# ── Graph Nodes ──────────────────────────────────────────

async def chat_node(state: CourseBuilderState, config: RunnableConfig) -> dict:
    """Main conversational node. Sends messages to LLM with tools bound."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage

    print(f"[Agent:chat_node] Received {len(state['messages'])} messages")

    # Debug: print message contents
    for i, msg in enumerate(state['messages']):
        content = getattr(msg, 'content', '')
        msg_type = type(msg).__name__
        print(f"[Agent:chat_node] Message {i}: {msg_type}, content: {content[:100]}")

    llm = ChatGoogleGenerativeAI(
        model=get_gemini_model(),
        temperature=1.0,
        max_retries=2,
    )

    model_with_tools = llm.bind_tools(TOOLS)

    # Detect format from CopilotKit context (useCopilotReadable) or message keywords
    copilotkit_context = state.get("copilotkit", {}).get("context", [])
    format_prompt = _detect_format_prompt(state["messages"], copilotkit_context)
    detected_format = "lab" if "实验" in format_prompt or "lab" in format_prompt.lower() else "quiz" if "测验" in format_prompt or "quiz" in format_prompt.lower() else "dialogue"
    print(f"[Agent:chat_node] Detected format: {detected_format}")

    # Inject file context on first user message
    files = state.get('files', {})
    if len(state['messages']) <= 2:  # First user message (or early in conversation)
        if files:
            file_list = list(files.keys())
            file_sizes = {path: len(content) for path, content in files.items()}
            file_context = f"\n\n沙盒中已有格式模板文件：{file_list}（大小：{file_sizes}）\n请先调用 read_file 查看模板内容，然后用 update_file 做针对性修改。不要直接重写。"
            print(f"[Agent:chat_node] Injecting template file context: {file_list}")
        else:
            file_context = "\n\n沙盒当前为空，没有文件。获得知识点后直接用 write_file 创建 /App.js。"
            print(f"[Agent:chat_node] No files in sandbox")
        system = SystemMessage(content=BASE_SYSTEM + format_prompt + file_context)
    else:
        system = SystemMessage(content=BASE_SYSTEM + format_prompt)

    # Check for uploaded images
    uploaded_images = state.get("uploaded_images") or []
    has_images = len(uploaded_images) > 0
    if has_images:
        print(f"[Agent:chat_node] Found {len(uploaded_images)} uploaded image(s): {[img.get('filename', '?') for img in uploaded_images]}")

    # Convert ToolMessages to HumanMessages for Gemini compatibility
    # Gemini requires conversations to end with user role
    messages = []
    for msg in state["messages"]:
        if isinstance(msg, ToolMessage):
            # Convert ToolMessage to HumanMessage with tool result content
            messages.append(HumanMessage(content=f"Tool result: {msg.content}"))
        else:
            messages.append(msg)

    # If images are present, upgrade the last HumanMessage to multimodal
    if has_images and messages:
        last_human_idx = None
        for i in range(len(messages) - 1, -1, -1):
            if isinstance(messages[i], HumanMessage):
                last_human_idx = i
                break

        if last_human_idx is not None:
            original_text = messages[last_human_idx].content
            if isinstance(original_text, str):
                # Build multipart content: text + image(s)
                multipart_content: list[dict] = [
                    {"type": "text", "text": original_text + "\n\n请仔细分析上传的图片内容，提取所有文字（包括OCR），理解图表/图片布局，并根据内容进行设计。"}
                ]
                for img in uploaded_images:
                    mime = img.get("mimeType", "image/jpeg")
                    b64 = img.get("base64", "")
                    multipart_content.append({
                        "type": "image_url",
                        "image_url": f"data:{mime};base64,{b64}",
                    })
                messages[last_human_idx] = HumanMessage(content=multipart_content)
                print(f"[Agent:chat_node] Upgraded message {last_human_idx} to multimodal ({len(uploaded_images)} image(s))")

    print(f"[Agent:chat_node] Invoking LLM with {len(messages)} messages + system prompt")
    try:
        response = await model_with_tools.ainvoke(
            [system, *messages],
            config,
        )
        print(f"[Agent:chat_node] LLM invocation successful")
    except Exception as e:
        print(f"[Agent:chat_node] LLM invocation failed: {e}")
        raise

    has_tool_calls = hasattr(response, 'tool_calls') and response.tool_calls
    response_content = getattr(response, 'content', '')
    print(f"[Agent:chat_node] LLM response: tool_calls={has_tool_calls}, content_length={len(response_content)}")
    print(f"[Agent:chat_node] LLM response content: {response_content[:200]}")
    if has_tool_calls:
        print(f"[Agent:chat_node] Tool calls: {response.tool_calls}")

    # Clear uploaded images after processing so they don't persist in state
    result: dict = {"messages": [response]}
    if has_images:
        result["uploaded_images"] = []
        await copilotkit_emit_state(config, {"uploaded_images": []})
        print(f"[Agent:chat_node] Cleared uploaded images from state")

    return result


async def tool_executor(state: CourseBuilderState, config: RunnableConfig) -> dict:
    """Execute tool calls with comprehensive error handling and logging."""
    import time

    last_message = state["messages"][-1]
    if not isinstance(last_message, AIMessage) or not last_message.tool_calls:
        return {}

    print(f"[Agent:tool_executor] Executing {len(last_message.tool_calls)} tool calls")

    files = dict(state.get("files") or {})
    tool_results = []
    errors = []

    for tc in last_message.tool_calls:
        start_time = time.time()
        name = tc["name"]
        args = tc["args"]
        tool_call_id = tc["id"]

        try:
            if name == "read_file":
                path = args.get("path", "/App.js")
                if path in files:
                    content = files[path]
                    result = f"✓ Read {path} ({len(content)} chars):\n\n{content}"
                    print(f"[Agent:tool_executor] read_file: {path} ({len(content)} chars)")
                else:
                    available = list(files.keys())
                    result = f"Error: File {path} does not exist.\n\nAvailable files: {available}\n\nUse list_files to see all files, or write_file to create it."
                    errors.append(f"read_file failed: {path} not found")
                    print(f"[Agent:tool_executor] read_file ERROR: {path} not found. Available: {available}")

            elif name == "list_files":
                file_list = list(files.keys())
                file_info = {path: f"{len(content)} chars" for path, content in files.items()}
                result = f"✓ Files in sandbox ({len(file_list)} total):\n\n{json.dumps(file_info, indent=2, ensure_ascii=False)}"
                print(f"[Agent:tool_executor] list_files: {len(file_list)} files - {file_list}")

            elif name == "write_file":
                path = args.get("path", "/App.js")
                content = args.get("content", "")

                # Validate path
                valid, error_msg = validate_path(path)
                if not valid:
                    result = f"Error: {error_msg}"
                    errors.append(f"write_file validation failed: {error_msg}")
                    print(f"[Agent:tool_executor] write_file VALIDATION ERROR: {error_msg}")
                else:
                    is_new = path not in files
                    files[path] = content
                    action = "Created" if is_new else "Overwrote"
                    result = f"✓ {action} {path} ({len(content)} chars)"
                    print(f"[Agent:tool_executor] write_file: {action} {path} ({len(content)} chars)")

            elif name == "update_file":
                path = args.get("path", "/App.js")
                old_text = args.get("old_text", "")
                new_text = args.get("new_text", "")

                if path not in files:
                    available = list(files.keys())
                    result = f"Error: File {path} does not exist.\n\nAvailable files: {available}\n\nUse write_file to create it, or call list_files to see all files."
                    errors.append(f"update_file failed: {path} not found")
                    print(f"[Agent:tool_executor] update_file ERROR: {path} not found. Available: {available}")
                else:
                    current = files[path]
                    if old_text in current:
                        files[path] = current.replace(old_text, new_text, 1)
                        result = f"✓ Updated {path} (replaced {len(old_text)} → {len(new_text)} chars)"
                        print(f"[Agent:tool_executor] update_file: {path} success (replaced {len(old_text)} → {len(new_text)} chars)")
                    else:
                        # Provide helpful context with preview
                        preview_len = 300
                        file_preview = current[:preview_len] + ("..." if len(current) > preview_len else "")
                        result = f"Error: Could not find the specified text in {path}.\n\nExpected to find:\n{old_text[:200]}...\n\nFile preview ({len(current)} chars total):\n{file_preview}\n\nSuggestion: Call read_file('{path}') first to see current content, then use exact text (including whitespace) for old_text parameter."
                        errors.append(f"update_file failed: text not found in {path}")
                        print(f"[Agent:tool_executor] update_file ERROR: text not found in {path}")
                        print(f"[Agent:tool_executor] Looking for: {old_text[:100]}...")

            elif name == "delete_file":
                path = args.get("path")
                if path in files:
                    del files[path]
                    result = f"✓ Deleted {path}"
                    print(f"[Agent:tool_executor] delete_file: {path}")
                else:
                    available = list(files.keys())
                    result = f"Error: File {path} does not exist.\n\nAvailable files: {available}"
                    errors.append(f"delete_file failed: {path} not found")
                    print(f"[Agent:tool_executor] delete_file ERROR: {path} not found")

            else:
                result = f"Error: Unknown tool '{name}'"
                errors.append(f"Unknown tool: {name}")
                print(f"[Agent:tool_executor] Unknown tool: {name}")

        except Exception as e:
            result = f"Error executing {name}: {str(e)}"
            errors.append(f"{name} exception: {str(e)}")
            print(f"[Agent:tool_executor] Exception in {name}: {e}")

        duration_ms = (time.time() - start_time) * 1000
        print(f"[Agent:tool_executor] Tool {name} completed in {duration_ms:.2f}ms")

        tool_results.append(
            ToolMessage(content=result, tool_call_id=tool_call_id)
        )

    # Emit state with verification
    total_size = sum(len(c) for c in files.values())
    print(f"[Agent:tool_executor] Emitting state: {len(files)} files, total size: {total_size} chars")
    if errors:
        print(f"[Agent:tool_executor] Errors encountered: {errors}")

    await copilotkit_emit_state(config, {"files": files})
    print(f"[Agent:tool_executor] State emitted successfully")
    print(f"[Agent:tool_executor] Current files in state: {list(files.keys())}")

    return {"files": files, "messages": tool_results}


def should_continue(state: CourseBuilderState) -> str:
    """Route: if last message has tool_calls → tool_executor, else → END."""
    last = state["messages"][-1] if state["messages"] else None
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tool_executor"
    return END


# ── Helpers ──────────────────────────────────────────────

def _detect_format_prompt(messages: list, copilotkit_context: list | None = None) -> str:
    """Detect format from CopilotKit readable context or message keywords."""
    # First check CopilotKit context (from useCopilotReadable on frontend)
    if copilotkit_context:
        for ctx in copilotkit_context:
            desc = ctx.get("description", "") if isinstance(ctx, dict) else ""
            val = ctx.get("value", "") if isinstance(ctx, dict) else ""
            val_str = str(val).lower() if val else ""
            if "format" in desc.lower() or "格式" in desc:
                if "quiz" in val_str or "测验" in val_str:
                    return QUIZ_PROMPT
                elif "dialogue" in val_str or "对话" in val_str or "故事" in val_str:
                    return DIALOGUE_PROMPT
                elif "lab" in val_str or "实验" in val_str:
                    return LAB_PROMPT

    # Fallback: scan message content
    text = " ".join(
        getattr(m, "content", "") for m in messages
        if hasattr(m, "content") and isinstance(getattr(m, "content", ""), str)
    ).lower()

    if "quiz" in text or "测验" in text or "练习" in text or "考试" in text:
        return QUIZ_PROMPT
    elif "dialogue" in text or "对话" in text or "故事" in text or "叙事" in text:
        return DIALOGUE_PROMPT
    else:
        return LAB_PROMPT


# ── Graph Builder ────────────────────────────────────────

async def build_course_builder_graph():
    """Build the course builder StateGraph with ReAct tool loop and PostgreSQL checkpointing."""
    import os
    from psycopg_pool import AsyncConnectionPool

    graph = StateGraph(CourseBuilderState)

    graph.add_node("chat_node", chat_node)
    graph.add_node("tool_executor", tool_executor)

    graph.add_edge(START, "chat_node")
    graph.add_conditional_edges("chat_node", should_continue, {
        "tool_executor": "tool_executor",
        END: END,
    })
    graph.add_edge("tool_executor", "chat_node")

    # PostgreSQL checkpointer for persistent conversation memory
    db_uri = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:your-super-secret-and-long-postgres-password@supabase-db:5432/postgres"
    )

    print(f"[wt-feat/course-builder-conversation-memory] Initializing PostgresSaver with URI: {db_uri.split('@')[1] if '@' in db_uri else 'local'}")

    try:
        # Create connection pool
        pool = AsyncConnectionPool(
            conninfo=db_uri,
            min_size=1,
            max_size=10,
            timeout=30.0,
        )
        await pool.open()

        # Initialize checkpointer with pool
        # Note: Tables already created by migration 20260308184809_course_builder_conversations.sql
        checkpointer = AsyncPostgresSaver(pool)
        print(f"[wt-feat/course-builder-conversation-memory] PostgresSaver initialized successfully")
    except Exception as e:
        print(f"[wt-feat/course-builder-conversation-memory] ERROR: Failed to initialize PostgresSaver: {e}")
        raise

    return graph.compile(checkpointer=checkpointer)
