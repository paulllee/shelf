from pathlib import Path

import frontmatter

from app.models import (
    ActivityModel,
    HabitModel,
    MediaModel,
    PresetModel,
    TaskModel,
    WorkoutModel,
    WorkoutTemplateModel,
)


def write_media_item(media_item: MediaModel, file_path: Path) -> None:
    """Serialize a MediaItem to a markdown file with frontmatter."""
    post = frontmatter.Post(content=media_item.review or "")
    post["name"] = media_item.name
    post["country"] = media_item.country
    post["type"] = media_item.type
    post["status"] = media_item.status
    post["rating"] = media_item.rating or ""

    with open(file_path, "wb") as f:
        frontmatter.dump(post, f)
        f.write(b"\n")


def write_workout(workout: WorkoutModel, file_path: Path) -> None:
    """Serialize a Workout to a markdown file with frontmatter."""
    post = frontmatter.Post(content=workout.content or "")
    post["date"] = workout.date.isoformat()
    post["time"] = workout.time.strftime("%H:%M:%S")

    groups: list[dict] = []
    for group in workout.groups:
        exercises: list[dict] = []
        for exercise in group.exercises:
            sets: list[dict] = []
            for s in exercise.sets:
                set_dict: dict = {}
                if s.reps is not None:
                    set_dict["reps"] = s.reps
                if s.weight is not None:
                    set_dict["weight"] = s.weight
                sets.append(set_dict)
            exercises.append({"name": exercise.name, "sets": sets})
        groups.append(
            {
                "name": group.name,
                "rest_seconds": group.rest_seconds,
                "exercises": exercises,
            }
        )
    post["groups"] = groups

    with open(file_path, "wb") as f:
        frontmatter.dump(post, f)
        f.write(b"\n")


def write_habit(habit: HabitModel, file_path: Path) -> None:
    """Serialize a Habit to a markdown file with frontmatter."""
    post = frontmatter.Post(content="")
    post["name"] = habit.name
    post["days"] = habit.days
    post["color"] = habit.color
    post["completions"] = habit.completions

    if habit.shifts:
        serialized_shifts: list[dict] = []
        for s in habit.shifts:
            entry: dict = {"from": s.from_date}
            if s.to_date:
                entry["to"] = s.to_date
            serialized_shifts.append(entry)
        post["shifts"] = serialized_shifts

    with open(file_path, "wb") as f:
        frontmatter.dump(post, f)
        f.write(b"\n")


def write_activity(activity: ActivityModel, file_path: Path) -> None:
    """Serialize an Activity to a markdown file with frontmatter."""
    post = frontmatter.Post(content="")
    post["name"] = activity.name
    post["date"] = activity.date.isoformat()

    with open(file_path, "wb") as f:
        frontmatter.dump(post, f)
        f.write(b"\n")


def write_preset(preset: PresetModel, file_path: Path) -> None:
    """Serialize a Preset to a markdown file with frontmatter."""
    post = frontmatter.Post(content="")
    post["name"] = preset.name

    with open(file_path, "wb") as f:
        frontmatter.dump(post, f)
        f.write(b"\n")


def write_task(
    task: TaskModel,
    file_path: Path,
    created_at_iso: str,
    completed_at_iso: str | None = None,
) -> None:
    """Serialize a Task to a markdown file with frontmatter."""
    post = frontmatter.Post(content=task.notes or "")
    post["title"] = task.title
    post["status"] = task.status
    post["do_date"] = task.do_date.isoformat() if task.do_date else None
    post["parent"] = task.parent
    post["created_at"] = created_at_iso
    post["completed_at"] = completed_at_iso

    with open(file_path, "wb") as f:
        frontmatter.dump(post, f)
        f.write(b"\n")


def write_template(template: WorkoutTemplateModel, file_path: Path) -> None:
    """Serialize a WorkoutTemplate to a markdown file with frontmatter."""
    post = frontmatter.Post(content="")
    post["name"] = template.name

    groups: list[dict] = []
    for group in template.groups:
        exercises: list[dict] = []
        for exercise in group.exercises:
            sets: list[dict] = []
            for s in exercise.sets:
                set_dict: dict = {}
                if s.reps is not None:
                    set_dict["reps"] = s.reps
                if s.weight is not None:
                    set_dict["weight"] = s.weight
                sets.append(set_dict)
            exercises.append({"name": exercise.name, "sets": sets})
        groups.append(
            {
                "name": group.name,
                "rest_seconds": group.rest_seconds,
                "exercises": exercises,
            }
        )
    post["groups"] = groups

    with open(file_path, "wb") as f:
        frontmatter.dump(post, f)
        f.write(b"\n")
