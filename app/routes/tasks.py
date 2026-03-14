import logging
from datetime import date, datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel
from slugify import slugify

from app.models import Task, TaskModel
from app.writer import write_task

logger: logging.Logger = logging.getLogger("uvicorn.error")

router = APIRouter()


def get_tasks_dir(request: Request) -> Path:
    """Return the tasks directory path from app state."""
    return request.app.state.tasks_dir


def try_get_task_md(request: Request, task_id: str) -> Path:
    """Return the markdown file path for a task, raising 404 if missing."""
    md_path = get_tasks_dir(request) / f"{task_id}.md"
    if not md_path.exists():
        raise HTTPException(status_code=404, detail=f"{task_id}.md not found")
    return md_path


def _cascade_delete(task_id: str, all_tasks: list[Task], tasks_dir: Path) -> None:
    """Recursively delete all descendant sub-tasks of a given task."""
    children = [t for t in all_tasks if t.parent == task_id]
    for child in children:
        _cascade_delete(child.id, all_tasks, tasks_dir)
        child_path = tasks_dir / f"{child.id}.md"
        if child_path.exists():
            child_path.unlink()


def parse_task_to_dict(task: Task, all_tasks: list[Task]) -> dict:
    """Convert a Task dataclass to a JSON-serializable dict with subtasks."""
    subtasks = [
        parse_task_to_dict(t, all_tasks)
        for t in sorted(
            [t for t in all_tasks if t.parent == task.id],
            key=lambda t: t.title.lower(),
        )
    ]
    return {
        "id": task.id,
        "title": task.title,
        "status": task.status,
        "due": task.due.isoformat() if task.due else None,
        "parent": task.parent,
        "notes": task.notes,
        "created_at": task.created_at.isoformat(),
        "subtasks": subtasks,
    }


@router.get("/tasks")
async def get_tasks(request: Request) -> list[dict]:
    """Return all top-level tasks with nested subtasks, sorted by title."""
    all_tasks: list[Task] = request.app.state.task_items
    top_level = sorted(
        [t for t in all_tasks if not t.parent],
        key=lambda t: t.title.lower(),
    )
    return [parse_task_to_dict(t, all_tasks) for t in top_level]


@router.get("/task/{task_id}")
async def get_task(request: Request, task_id: str) -> dict:
    """Return a single task by ID with subtasks."""
    md_path = try_get_task_md(request, task_id)
    task: Task = request.app.state.parse_md_to_task(md_path)
    all_tasks: list[Task] = request.app.state.task_items
    return parse_task_to_dict(task, all_tasks)


@router.post("/task")
async def create_task(request: Request, task: TaskModel) -> dict:
    """Create a new task."""
    now = datetime.now()
    task_id = task.make_id(now)
    md_path: Path = get_tasks_dir(request) / f"{task_id}.md"
    if md_path.exists():
        raise HTTPException(status_code=409, detail="task already exists")

    created_at_iso = now.isoformat()
    write_task(task, md_path, created_at_iso)
    request.app.state.task_items = request.app.state.parse_all_tasks()

    parsed: Task = request.app.state.parse_md_to_task(md_path)
    all_tasks: list[Task] = request.app.state.task_items
    return parse_task_to_dict(parsed, all_tasks)


@router.put("/task/{task_id}")
async def update_task(request: Request, task_id: str, task: TaskModel) -> dict:
    """Update an existing task, handling renames."""
    old_md_path: Path = try_get_task_md(request, task_id)

    # Read existing task to preserve created_at
    existing: Task = request.app.state.parse_md_to_task(old_md_path)
    new_id = task.make_id(existing.created_at)
    new_md_path: Path = get_tasks_dir(request) / f"{new_id}.md"

    if task_id != new_id:
        # Update children that reference the old ID
        all_tasks: list[Task] = request.app.state.task_items
        for child in [t for t in all_tasks if t.parent == task_id]:
            child_path = get_tasks_dir(request) / f"{child.id}.md"
            child_model = TaskModel(
                title=child.title,
                status=child.status,
                due=child.due,
                parent=new_id,
                notes=child.notes,
            )
            write_task(child_model, child_path, child.created_at.isoformat())
        old_md_path.unlink()

    write_task(task, new_md_path, existing.created_at.isoformat())
    request.app.state.task_items = request.app.state.parse_all_tasks()

    parsed: Task = request.app.state.parse_md_to_task(new_md_path)
    all_tasks_updated: list[Task] = request.app.state.task_items
    return parse_task_to_dict(parsed, all_tasks_updated)


@router.delete("/task/{task_id}")
async def delete_task(request: Request, task_id: str) -> dict[str, bool]:
    """Delete a task and cascade delete its sub-tasks."""
    try_get_task_md(request, task_id).unlink()

    # Cascade delete sub-tasks (recursive to handle grandchildren)
    all_tasks: list[Task] = request.app.state.task_items
    _cascade_delete(task_id, all_tasks, get_tasks_dir(request))

    request.app.state.task_items = request.app.state.parse_all_tasks()
    return {"ok": True}


# AI chat endpoint


class ChatRequest(BaseModel):
    """Pydantic model for chat API input."""

    message: str
    history: list[dict] = []


def _build_chat_tools() -> list[types.Tool]:
    """Build Google GenAI tool definitions for task management."""
    return [
        types.Tool(
            function_declarations=[
                {
                    "name": "create_task",
                    "description": "Create a new task. Returns the created task with its generated ID.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string",
                                "description": "The task title",
                            },
                            "status": {
                                "type": "string",
                                "enum": ["open", "closed"],
                                "description": "Task status, defaults to open",
                            },
                            "due": {
                                "type": "string",
                                "description": "Optional due date in YYYY-MM-DD format",
                            },
                            "parent_id": {
                                "type": "string",
                                "description": "Optional parent task ID for sub-tasks",
                            },
                            "notes": {
                                "type": "string",
                                "description": "Optional notes/description",
                            },
                        },
                        "required": ["title"],
                    },
                },
                {
                    "name": "update_task",
                    "description": "Update an existing task by ID. Only provided fields are changed.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "task_id": {
                                "type": "string",
                                "description": "The task ID to update",
                            },
                            "title": {"type": "string", "description": "New title"},
                            "status": {
                                "type": "string",
                                "enum": ["open", "closed"],
                                "description": "New status",
                            },
                            "due": {
                                "type": "string",
                                "description": "New due date in YYYY-MM-DD or null to clear",
                            },
                            "notes": {"type": "string", "description": "New notes"},
                        },
                        "required": ["task_id"],
                    },
                },
                {
                    "name": "close_task",
                    "description": "Close a task by setting its status to closed.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "task_id": {
                                "type": "string",
                                "description": "The task ID to close",
                            },
                        },
                        "required": ["task_id"],
                    },
                },
                {
                    "name": "list_tasks",
                    "description": "List current tasks with their IDs. Use this to find task IDs before updating/closing.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "status_filter": {
                                "type": "string",
                                "enum": ["open", "closed"],
                                "description": "Filter by status. If omitted, returns open tasks.",
                            },
                            "include_closed": {
                                "type": "boolean",
                                "description": "If true, include closed tasks too",
                            },
                        },
                    },
                },
                {
                    "name": "search_tasks",
                    "description": "Search across all tasks (open and closed) by title or notes content.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query to match against task titles and notes",
                            },
                        },
                        "required": ["query"],
                    },
                },
            ]
        )
    ]


def _execute_tool(
    tool_name: str, tool_input: dict, request: Request
) -> tuple[str, bool]:
    """Execute a chat tool and return (result_text, tasks_changed)."""
    tasks_dir = get_tasks_dir(request)
    all_tasks: list[Task] = request.app.state.task_items

    if tool_name == "create_task":
        title = tool_input["title"]
        slug = slugify(title).lower()

        # Check for duplicates among open tasks
        for t in all_tasks:
            if slugify(t.title).lower() == slug and t.status == "open":
                return (
                    f"A task with a similar title already exists: '{t.title}' (ID: {t.id}). "
                    "Not creating a duplicate.",
                    False,
                )

        now = datetime.now()
        due = None
        if tool_input.get("due"):
            due = date.fromisoformat(tool_input["due"])

        task_model = TaskModel(
            title=title,
            status=tool_input.get("status", "open"),
            due=due,
            parent=tool_input.get("parent_id"),
            notes=tool_input.get("notes"),
        )
        task_id = task_model.make_id(now)
        md_path = tasks_dir / f"{task_id}.md"
        write_task(task_model, md_path, now.isoformat())
        request.app.state.task_items = request.app.state.parse_all_tasks()
        return (
            f"Created task '{title}' (ID: {task_id})"
            + (f" due {tool_input['due']}" if tool_input.get("due") else "")
            + (
                f" as sub-task of {tool_input['parent_id']}"
                if tool_input.get("parent_id")
                else ""
            ),
            True,
        )

    elif tool_name == "update_task":
        task_id = tool_input["task_id"]
        md_path = tasks_dir / f"{task_id}.md"
        if not md_path.exists():
            return f"Task '{task_id}' not found.", False

        existing: Task = request.app.state.parse_md_to_task(md_path)
        title = tool_input.get("title", existing.title)
        status = tool_input.get("status", existing.status)
        due = existing.due
        if "due" in tool_input:
            due = date.fromisoformat(tool_input["due"]) if tool_input["due"] else None
        notes = tool_input.get("notes", existing.notes)

        task_model = TaskModel(
            title=title,
            status=status,
            due=due,
            parent=existing.parent,
            notes=notes,
        )
        new_id = task_model.make_id(existing.created_at)
        new_md_path = tasks_dir / f"{new_id}.md"

        if task_id != new_id:
            # Update children references
            for child in [t for t in all_tasks if t.parent == task_id]:
                child_path = tasks_dir / f"{child.id}.md"
                child_model = TaskModel(
                    title=child.title,
                    status=child.status,
                    due=child.due,
                    parent=new_id,
                    notes=child.notes,
                )
                write_task(child_model, child_path, child.created_at.isoformat())
            md_path.unlink()

        write_task(task_model, new_md_path, existing.created_at.isoformat())
        request.app.state.task_items = request.app.state.parse_all_tasks()
        return f"Updated task '{title}' (ID: {new_id})", True

    elif tool_name == "close_task":
        task_id = tool_input["task_id"]
        md_path = tasks_dir / f"{task_id}.md"
        if not md_path.exists():
            return f"Task '{task_id}' not found.", False

        existing = request.app.state.parse_md_to_task(md_path)
        task_model = TaskModel(
            title=existing.title,
            status="closed",
            due=existing.due,
            parent=existing.parent,
            notes=existing.notes,
        )
        write_task(task_model, md_path, existing.created_at.isoformat())
        request.app.state.task_items = request.app.state.parse_all_tasks()
        return f"Closed task '{existing.title}' (ID: {task_id})", True

    elif tool_name == "list_tasks":
        status_filter = tool_input.get("status_filter")
        include_closed = tool_input.get("include_closed", False)

        filtered = all_tasks
        if status_filter:
            filtered = [t for t in filtered if t.status == status_filter]
        elif not include_closed:
            filtered = [t for t in filtered if t.status == "open"]

        if not filtered:
            return "No tasks found.", False

        lines = []
        for t in sorted(filtered, key=lambda t: t.title.lower()):
            prefix = f"[{t.status}]"
            due_str = f" (due {t.due.isoformat()})" if t.due else ""
            parent_str = f" [sub-task of {t.parent}]" if t.parent else ""
            lines.append(f"- {prefix} {t.title}{due_str}{parent_str} — ID: {t.id}")
        return "\n".join(lines), False

    elif tool_name == "search_tasks":
        query = tool_input["query"].lower()
        matches = [
            t
            for t in all_tasks
            if query in t.title.lower() or query in (t.notes or "").lower()
        ]
        if not matches:
            return f"No tasks matching '{tool_input['query']}'.", False

        lines = []
        for t in sorted(matches, key=lambda t: t.title.lower()):
            prefix = f"[{t.status}]"
            due_str = f" (due {t.due.isoformat()})" if t.due else ""
            lines.append(f"- {prefix} {t.title}{due_str} — ID: {t.id}")
        return "\n".join(lines), False

    return f"Unknown tool: {tool_name}", False


@router.post("/chat")
async def chat(request: Request, body: ChatRequest) -> dict:
    """Process a chat message using Gemini with task management tools."""
    client = request.app.state.genai_client
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="AI chat not available — GEMINI_API_KEY not set",
        )

    model = request.app.state.gemini_model

    system_prompt = (
        "You are a helpful task manager assistant. Use the provided tools to manage tasks. "
        "When the user asks to create, update, close, or list tasks, use the appropriate tool. "
        "Always use list_tasks first to check for existing tasks before creating new ones to avoid duplicates. "
        "When creating sub-tasks, first use list_tasks to find the parent task ID. "
        "Be concise in your responses."
    )

    # Build contents from history + new message
    contents: list[types.Content] = []
    for msg in body.history:
        role = "model" if msg["role"] == "assistant" else msg["role"]
        contents.append(
            types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])])
        )
    contents.append(
        types.Content(role="user", parts=[types.Part.from_text(text=body.message)])
    )

    tools = _build_chat_tools()
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        tools=tools,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        max_output_tokens=1024,
    )

    tasks_changed = False

    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )

        # Process tool calls in a loop until we get a text-only response
        while response.candidates and any(
            part.function_call for part in response.candidates[0].content.parts
        ):
            # Append model response to conversation
            contents.append(response.candidates[0].content)

            # Execute each function call and build function response parts
            function_response_parts: list[types.Part] = []
            for part in response.candidates[0].content.parts:
                if part.function_call:
                    tool_input = (
                        dict(part.function_call.args) if part.function_call.args else {}
                    )
                    result_text, changed = _execute_tool(
                        part.function_call.name, tool_input, request
                    )
                    if changed:
                        tasks_changed = True
                    function_response_parts.append(
                        types.Part.from_function_response(
                            name=part.function_call.name,
                            response={"result": result_text},
                        )
                    )

            contents.append(types.Content(role="user", parts=function_response_parts))

            response = await client.aio.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )

        # Extract final text response
        response_text = response.text if response.text else "Done."

        return {"response": response_text, "tasks_changed": tasks_changed}

    except genai_errors.ClientError as e:
        logger.exception("Gemini client error")
        raise HTTPException(status_code=400, detail=f"Invalid request: {e}")
    except genai_errors.ServerError:
        logger.exception("Gemini server error")
        raise HTTPException(status_code=502, detail="Gemini service unavailable")
    except genai_errors.APIError as e:
        logger.exception("Gemini API error")
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e}")
    except Exception:
        logger.exception("Chat processing error")
        raise HTTPException(status_code=500, detail="Chat processing failed")
