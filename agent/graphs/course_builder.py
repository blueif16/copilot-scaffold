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
# Multi-file convention:
#   /App.js          → Sandpack host (throwaway — not promoted)
#   /Simulation.js   → becomes TopicNameSimulation.tsx
#   /state.json      → becomes TS types + Python state schema
#   /data.json       → becomes config.py + reactions.py
#
# Graph: chat_node ←→ tool_executor (ReAct loop)
# ═══════════════════════════════════════════════════════════

from __future__ import annotations

import json
import os
from typing import Any, Literal

from copilotkit import CopilotKitState
from copilotkit.langgraph import copilotkit_emit_state, copilotkit_customize_config
from config import get_gemini_model
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langgraph.graph import END, START, StateGraph
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver


# ── Component Library ────────────────────────────────────

COMPONENT_LIBRARY_DIR = os.path.join(os.path.dirname(__file__), "..", "component_library")


def _load_component_index() -> list[dict]:
    """Load the component library index."""
    index_path = os.path.join(COMPONENT_LIBRARY_DIR, "index.json")
    if not os.path.exists(index_path):
        return []
    with open(index_path, "r") as f:
        return json.load(f)


def _load_component_source(name: str) -> str | None:
    """Load a component's source code by name."""
    path = os.path.join(COMPONENT_LIBRARY_DIR, "components", f"{name}.js")
    if not os.path.exists(path):
        return None
    with open(path, "r") as f:
        return f.read()


def _search_component_library(query: str) -> str:
    """Search component metadata without emitting nested LangGraph tool events."""
    index = _load_component_index()
    if not index:
        return json.dumps({"results": [], "message": "Component library is empty. Build the component from scratch."})

    query_lower = query.lower()
    query_terms = query_lower.split()

    matches = []
    for comp in index:
        score = 0
        searchable = f"{comp['name']} {comp['description']} {' '.join(comp.get('tags', []))}".lower()
        for term in query_terms:
            if term in searchable:
                score += 1
            if term in comp["name"].lower():
                score += 2
        if score > 0:
            matches.append({**comp, "_score": score})

    matches.sort(key=lambda x: x["_score"], reverse=True)

    results = [{k: v for k, v in match.items() if k != "_score"} for match in matches[:5]]
    if not results:
        return json.dumps({"results": [], "message": f"No components match '{query}'. Build it from scratch in /Simulation.js."})

    return json.dumps({"results": results})


def _get_component_payload(name: str) -> str:
    """Load a component payload without invoking a LangChain tool inside the graph."""
    source = _load_component_source(name)
    if source is None:
        return json.dumps({"error": f"Component '{name}' not found. Check the name matches search results exactly."})
    return json.dumps({"name": name, "source": source})


# ── System Prompts ───────────────────────────────────────

BASE_SYSTEM = """你是一位专业的教育互动设计师和React开发者。
你帮助老师为中国小学生创建互动科学课程。

你必须始终使用中文回复。

═══ 多文件结构（必须遵守）═══

每个课程由 4 个文件组成：

1. /Simulation.js — 交互式模拟组件（核心代码）
   - 必须接收 props: { state, onStateChange, onEvent }
   - state: 当前模拟状态（由 /state.json 定义）
   - onStateChange(patch): 合并局部状态更新
   - onEvent({ type, data }): 发射有意义的事件（类型由 /state.json 定义）
   - 只用内联样式，不能导入 CSS 或 Tailwind
   - 触控友好：所有交互元素最小 48px
   - 使用明亮活泼的颜色，适合儿童

2. /state.json — 状态和事件定义（纯 JSON，不是代码）
   格式：
   {
     "state": {
       "字段名": {
         "type": "number" | "string" | "boolean" | "enum" | "object" | "array",
         "initial": 默认值,
         "description": "字段用途描述"
         // 可选字段：
         // "min", "max" — 数值范围
         // "values" — enum 可选值列表
         // "derived": true — 计算字段，不写入 agent 状态
         // "internal": true — 仅 UI 用，agent 不可见
       }
     },
     "events": {
       "事件名": {
         "description": "事件描述",
         "data": { "字段": "类型" }
       }
     }
   }

3. /data.json — 课题配置和反应注册表（纯 JSON）
   格式：
   {
     "topic": {
       "id": "topic-slug",
       "level": 1,
       "ageRange": [6, 8],
       "pedagogicalPrompt": "观察 agent 的系统提示...",
       "knowledgeContext": "知识背景...",
       "chatSystemPrompt": "聊天 agent 的系统提示...",
       "suggestedQuestions": { "状态或阶段": ["问题1?"] },
       "spotlight": { "id": "...", "trigger": "..." } // 或 null
     },
     "reactions": [
       {
         "id": "reaction-id",
         "event": "事件名",
         "conditions": { "field": "value", "field__gte": 3 },
         "response": {
           "message": "同伴说的话",
           "emotion": "excited|curious|impressed|celebrating|thinking|encouraging|watching|idle",
           "animation": "bounce|nod|tilt_head|confetti|wave|point|none",
           "sound": "gentle_chime|discovery_chime|achievement",
           "type": "observation|suggestion|milestone|prompt",
           "priority": 15,
           "autoExpireMs": 5000,
           "suggestions": ["建议问题?"],
           "unlockSpotlight": false,
           "progressUpdate": {}
         },
         "oneShot": true,
         "escalateToAi": false,
         "aiHint": "",
         "cooldownSeconds": null
       }
     ]
   }

4. /App.js — Sandpack 预览宿主（自动生成，不要修改）

═══ 工作流程 ═══

1. 对话开始时，先用 list_files 了解已有文件
2. 了解老师需求后，按顺序生成：
   a. /state.json — 先定义状态和事件
   b. /data.json — 定义配置、反应
   c. /Simulation.js — 用 write_file 生成完整组件
3. 生成 /Simulation.js 前，先用 search_components 搜索可复用组件
4. 如果找到合适组件，用 get_component 获取源码并集成
5. 没有匹配时直接自己写

═══ 工具使用规则 ═══

- write_file：创建新文件或完全重写（初次生成用这个）
- update_file：修改特定部分（先 read_file 验证 old_text 存在）
- search_components：搜索可复用 UI 组件库
- get_component：获取组件完整源码

效率规则：
- 文件 < 100 行：可以 write_file 重写
- 文件 > 100 行：必须 update_file 局部修改
- 修改 < 20% 内容：必须 update_file

═══ 输出规则 ═══

工具执行结果会自动显示在界面中，不要在回复里重复工具输出内容。
不要写 "已成功写入"、"文件已创建" 之类的确认。
直接说明你做了什么设计决策、为什么这样设计。

═══ 事件设计原则 ═══

在 /state.json 的 events 和 /Simulation.js 的 onEvent 调用之间保持一致：
- 每个 onEvent({ type, data }) 的 type 必须在 /state.json events 中声明
- 在有意义的交互时刻调用 onEvent（状态变化、里程碑、超时等）
- 不要在每帧调用 — 只在离散的教学时刻

═══ 对话开始 ═══

不要立即生成代码。先了解老师的需求：
1. 教材版本（人教版、苏教版、北师大版等）
2. 年级（一年级到六年级）
3. 具体知识点（例如：三年级上册「水的三态变化」）

如果老师已经明确说明了知识点，可以直接开始生成。"""

LAB_PROMPT = """
格式：交互式实验模拟

你正在构建一个交互式实验/模拟，学生可以操控变量并观察可视化结果。

/Simulation.js 布局模式：
- 顶部标题栏（实验名称 + 简短描述）
- 可视化模拟区域（占约 60% 空间）— 动画、粒子、图表等
- 控制面板 — 滑块、按钮、开关

使用 requestAnimationFrame 或 useEffect 定时器制作动画。
使用鲜艳的渐变和圆角形状。
所有界面文字使用中文。"""

QUIZ_PROMPT = """
格式：交互式测验

你正在构建一个测验/评估，学生回答问题并获得即时反馈。

/Simulation.js 布局模式：
- 顶部进度栏（题号 + 得分）
- 题目区域，文字大且清晰
- 答案选项为大号可点击按钮（最小 48px）
- 正确/错误反馈动画
- 结束时的总结界面

至少 5 道题，每题 3-4 个选项。
错误反馈要有教育意义。
所有题目和选项使用中文。"""

DIALOGUE_PROMPT = """
格式：交互式对话/故事

你正在构建一个对话/叙事体验，学生与角色互动并做选择。

/Simulation.js 布局模式：
- 角色显示区域（使用 emoji 或 CSS 艺术）
- 对话气泡框
- 选择按钮（每轮 2-3 个选项）
- 进度指示器

角色要温暖、鼓励。用讲故事的方式教授概念。
所有对话和选项使用中文。"""


# ── Path Validation ──────────────────────────────────────

def validate_path(path: str) -> tuple[bool, str]:
    """Validate file path for Sandpack virtual filesystem."""
    if not path.startswith('/'):
        return False, "Path must start with / (e.g., /App.js)"

    if path.count('/') > 2:
        return False, "Sandpack works best with shallow file structures"

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
        path: File path starting with / (e.g., /App.js, /state.json, /data.json, /Simulation.js)
        content: The full file content to write.
    """
    return json.dumps({"action": "write", "path": path, "content": content})


@tool
def update_file(path: str, old_text: str, new_text: str) -> str:
    """Replace a specific section of text in an existing file.
    IMPORTANT: Call read_file first to verify the exact text exists.
    Use this for targeted edits instead of rewriting the entire file.

    Args:
        path: File path to edit (e.g., /Simulation.js)
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


@tool
def search_components(query: str) -> str:
    """Search the reusable UI component library for components matching a query.
    Call this BEFORE building controls for /Simulation.js to check if a
    ready-made component exists (sliders, drag-drop, timers, grids, etc).

    Args:
        query: Search terms (e.g., "slider", "drag drop", "timer", "grid", "balance")

    Returns:
        Matching components with name, description, and prop interface.
        Use get_component(name) to get the full source code.
    """
    return _search_component_library(query)


@tool
def get_component(name: str) -> str:
    """Get the full source code of a reusable component from the library.
    Inline it into /Simulation.js or import it as a separate file.

    Args:
        name: Exact component name from search_components results (e.g., "ValueSlider")

    Returns:
        Full JSX source code of the component, or error if not found.
    """
    return _get_component_payload(name)


TOOLS = [read_file, list_files, write_file, update_file, delete_file, search_components, get_component]


# ── Agent State ──────────────────────────────────────────

class CourseBuilderState(CopilotKitState):
    """Course builder agent state.
    CopilotKitState provides: messages, copilotkit (actions + context).
    """
    files: dict[str, str]
    uploaded_images: list[dict[str, str]]  # [{id, base64, mimeType, filename}]
    _tool_results_cache: dict[str, str] = {}  # tool_call_id → full result (NOT synced to frontend)
    _active_tools: list[dict[str, str]] = []   # [{name, detail}] → pushed to frontend for inline rendering


# ── Graph Nodes ──────────────────────────────────────────

async def chat_node(state: CourseBuilderState, config: RunnableConfig) -> dict:
    """Main conversational node. Sends messages to LLM with tools bound."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage

    print(f"[Agent:chat_node] Received {len(state['messages'])} messages")

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

    # Detect format from CopilotKit context or message keywords
    copilotkit_context = state.get("copilotkit", {}).get("context", [])
    format_prompt = _detect_format_prompt(state["messages"], copilotkit_context)
    detected_format = "lab" if "实验" in format_prompt or "lab" in format_prompt.lower() else "quiz" if "测验" in format_prompt or "quiz" in format_prompt.lower() else "dialogue"
    print(f"[Agent:chat_node] Detected format: {detected_format}")

    # Inject file context on first user message
    files = state.get('files', {})
    if len(state['messages']) <= 2:
        if files:
            file_list = list(files.keys())
            file_context = f"\n\n沙盒中已有占位文件：{file_list}。获得知识点后，用 write_file 依次生成 /state.json、/data.json、/Simulation.js（完全替换占位内容）。/App.js 不需要修改。"
            print(f"[Agent:chat_node] Injecting scaffold context: {file_list}")
        else:
            file_context = "\n\n沙盒当前为空。获得知识点后依次用 write_file 创建 /state.json → /data.json → /Simulation.js。"
            print(f"[Agent:chat_node] No files in sandbox")
        system = SystemMessage(content=BASE_SYSTEM + format_prompt + file_context)
    else:
        system = SystemMessage(content=BASE_SYSTEM + format_prompt)

    # Check for uploaded images
    uploaded_images = state.get("uploaded_images") or []
    has_images = len(uploaded_images) > 0
    if has_images:
        print(f"[Agent:chat_node] Found {len(uploaded_images)} uploaded image(s): {[img.get('filename', '?') for img in uploaded_images]}")

    # Convert ToolMessages to HumanMessages for Gemini compatibility.
    # ToolMessages have short summaries (to avoid frontend leak). Full results
    # are stored in _tool_results_cache, keyed by tool_call_id.
    tool_cache = state.get("_tool_results_cache") or {}
    messages = []
    for msg in state["messages"]:
        if isinstance(msg, ToolMessage):
            # Prefer full result from cache; fall back to ToolMessage content
            full_result = tool_cache.get(msg.tool_call_id, msg.content)
            messages.append(HumanMessage(content=f"Tool result: {full_result}"))
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

    # Clear transient state after processing
    result: dict = {"messages": [response]}

    # Clear image uploads
    if has_images:
        result["uploaded_images"] = []
        await copilotkit_emit_state(config, {"uploaded_images": []})
        print(f"[Agent:chat_node] Cleared uploaded images from state")

    # Clear tool results cache when this is the final response (no more tool
    # calls). If the LLM is making more tool calls, keep the cache alive for
    # the next tool_executor → chat_node cycle.
    if tool_cache and not has_tool_calls:
        result["_tool_results_cache"] = {}
        result["_active_tools"] = []
        print(f"[Agent:chat_node] Cleared tool results cache ({len(tool_cache)} entries) and active tools")

    return result


async def tool_executor(state: CourseBuilderState, config: RunnableConfig) -> dict:
    """Execute tool calls with comprehensive error handling and logging."""
    import time

    # Suppress ToolMessage text from streaming to frontend.
    # Full tool results live in _tool_results_cache for chat_node's LLM context.
    # Tool call indicators come from ActionExecutionMessage (emit_tool_calls=True in chat_node).
    config = copilotkit_customize_config(config, emit_messages=False)

    last_message = state["messages"][-1]
    if not isinstance(last_message, AIMessage) or not last_message.tool_calls:
        return {}

    print(f"[Agent:tool_executor] Executing {len(last_message.tool_calls)} tool calls")

    # Emit tool indicators immediately so frontend can show them while executing
    active_tools = []
    for tc in last_message.tool_calls:
        name = tc["name"]
        args = tc["args"]
        detail = args.get("path") or args.get("query") or args.get("name") or ""
        active_tools.append({"name": name, "detail": detail})
    await copilotkit_emit_state(config, {"_active_tools": active_tools})
    print(f"[Agent:tool_executor] Emitted active tools: {[t['name'] for t in active_tools]}")

    files = dict(state.get("files") or {})
    tool_results = []
    errors = []
    full_results_cache: dict[str, str] = dict(state.get("_tool_results_cache") or {})

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

            elif name == "search_components":
                query = args.get("query", "")
                search_result = _search_component_library(query)
                result = f"✓ Component search results:\n\n{search_result}"
                print(f"[Agent:tool_executor] search_components: query='{query}'")

            elif name == "get_component":
                comp_name = args.get("name", "")
                get_result = _get_component_payload(comp_name)
                result = f"✓ Component source:\n\n{get_result}"
                print(f"[Agent:tool_executor] get_component: name='{comp_name}'")

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

        # Store full result in cache for chat_node's LLM context.
        # ToolMessage gets empty content — AG-UI streams ToolMessage
        # content as text, so anything here leaks into the chat UI.
        # Empty string is filtered out by frontend's trim() !== "" check.
        full_results_cache[tool_call_id] = result
        tool_results.append(
            ToolMessage(content="", tool_call_id=tool_call_id)
        )

    # Emit file changes to frontend
    total_size = sum(len(c) for c in files.values())
    print(f"[Agent:tool_executor] Emitting state: {len(files)} files, total size: {total_size} chars")
    if errors:
        print(f"[Agent:tool_executor] Errors encountered: {errors}")

    # Don't clear _active_tools here — keep them visible until chat_node
    # produces the final response, so frontend can show "complete" status.
    await copilotkit_emit_state(config, {"files": files})
    print(f"[Agent:tool_executor] State emitted successfully")
    print(f"[Agent:tool_executor] Current files in state: {list(files.keys())}")

    return {
        "files": files,
        "_tool_results_cache": full_results_cache,
        "messages": tool_results,
    }


def should_continue(state: CourseBuilderState) -> str:
    """Route: if last message has tool_calls → tool_executor, else → END."""
    last = state["messages"][-1] if state["messages"] else None
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tool_executor"
    return END


# ── Helpers ──────────────────────────────────────────────

def _detect_format_prompt(messages: list, copilotkit_context: list | None = None) -> str:
    """Detect format from CopilotKit readable context or message keywords."""
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

    text = " ".join(
        getattr(m, "content", "") for m in messages
        if hasattr(m, "content") and isinstance(getattr(m, "content", ""), str)
    ).lower()

    if "quiz" in text or "测验" in text or "练习" in text or "考试" in text:
        return QUIZ_PROMPT
    elif "dialogue" in text or "story" in text or "对话" in text or "故事" in text or "叙事" in text:
        return DIALOGUE_PROMPT
    else:
        return LAB_PROMPT


# ── Graph Builder ────────────────────────────────────────

async def build_course_builder_graph():
    """Build the course builder StateGraph with ReAct tool loop and PostgreSQL checkpointing."""

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
        from psycopg_pool import AsyncConnectionPool

        pool = AsyncConnectionPool(
            conninfo=db_uri,
            min_size=1,
            max_size=10,
            timeout=30.0,
        )
        await pool.open()

        checkpointer = AsyncPostgresSaver(pool)
        print(f"[wt-feat/course-builder-conversation-memory] PostgresSaver initialized successfully")
    except Exception as e:
        print(f"[wt-feat/course-builder-conversation-memory] ERROR: Failed to initialize PostgresSaver: {e}")
        raise

    return graph.compile(checkpointer=checkpointer)
