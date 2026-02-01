from pathlib import Path

import frontmatter

from app.models import MediaModel, WorkoutModel


def write_media_item(media_item: MediaModel, file_path: Path) -> None:
    """
    serializes a MediaItem to a markdown file with frontmatter
    """
    post = frontmatter.Post(content=media_item.review or "")
    post["name"] = media_item.name
    post["country"] = media_item.country
    post["type"] = media_item.type
    post["status"] = media_item.status
    post["rating"] = media_item.rating or ""

    with open(file_path, "wb") as f:
        frontmatter.dump(post, f)


def write_workout(workout: WorkoutModel, file_path: Path) -> None:
    """
    serializes a Workout to a markdown file with frontmatter
    """
    post = frontmatter.Post(content=workout.content or "")
    post["date"] = workout.date.isoformat()
    post["time"] = workout.time.strftime("%H:%M:%S")

    groups = []
    for group in workout.groups:
        exercises = []
        for exercise in group.exercises:
            sets = []
            for s in exercise.sets:
                set_dict: dict = {"reps": s.reps}
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
