from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

from app.models import (
    ExerciseGroupModel,
    ExerciseModel,
    Workout,
    WorkoutModel,
    WorkoutSetModel,
)
from app.writer import write_workout

router = APIRouter()


def get_workout_dir(request: Request) -> Path:
    return request.app.state.workout_dir


def try_get_workout_md(request: Request, id: str) -> Path:
    workout_dir: Path = get_workout_dir(request)
    md_name: str = f"{id}.md"
    md_path: Path = workout_dir / md_name
    if not md_path.exists():
        raise HTTPException(status_code=404, detail=f"{md_name} not found")
    return md_path


def parse_workout_to_model(workout: Workout) -> WorkoutModel:
    groups: list[ExerciseGroupModel] = []
    for g in workout.groups:
        exercises: list[ExerciseModel] = []
        for e in g.exercises:
            sets: list[WorkoutSetModel] = [
                WorkoutSetModel(reps=s.reps, weight=s.weight) for s in e.sets
            ]
            exercises.append(ExerciseModel(name=e.name, sets=sets))
        groups.append(
            ExerciseGroupModel(
                name=g.name, rest_seconds=g.rest_seconds, exercises=exercises
            )
        )
    return WorkoutModel(
        date=workout.date,
        time=workout.time,
        groups=groups,
        content=workout.content,
    )


@router.get("/workouts")
async def get_workouts(request: Request) -> list[WorkoutModel]:
    workouts: list[Workout] = sorted(
        request.app.state.workout_items, key=lambda w: (w.date, w.time), reverse=True
    )
    return [parse_workout_to_model(w) for w in workouts]


@router.post("/workout")
async def create_workout(request: Request, workout: WorkoutModel) -> WorkoutModel:
    workout_dir: Path = get_workout_dir(request)
    md_path: Path = workout_dir / f"{workout.id}.md"
    if md_path.exists():
        raise HTTPException(status_code=409, detail="Workout already exists")
    write_workout(workout, md_path)
    request.app.state.workout_items = request.app.state.parse_all_workouts()
    return parse_workout_to_model(request.app.state.parse_md_to_workout(md_path))


@router.get("/api/workout/{id}")
async def get_workout(request: Request, id: str) -> WorkoutModel:
    workout: Workout = request.app.state.parse_md_to_workout(
        try_get_workout_md(request, id)
    )
    return parse_workout_to_model(workout)


@router.put("/workout/{id}")
async def update_workout(
    request: Request, id: str, workout: WorkoutModel
) -> WorkoutModel:
    workout_dir: Path = get_workout_dir(request)
    old_md_path: Path = try_get_workout_md(request, id)
    new_id: str = workout.id

    if id != new_id:
        old_md_path.unlink()
        new_md_path: Path = workout_dir / f"{new_id}.md"
        write_workout(workout, new_md_path)
    else:
        write_workout(workout, old_md_path)

    request.app.state.workout_items = request.app.state.parse_all_workouts()
    return parse_workout_to_model(
        request.app.state.parse_md_to_workout(workout_dir / f"{workout.id}.md")
    )


@router.delete("/workout/{id}")
async def delete_workout(request: Request, id: str) -> dict[str, str]:
    md_path: Path = try_get_workout_md(request, id)
    md_path.unlink()
    request.app.state.workout_items = request.app.state.parse_all_workouts()
    return {"deleted": id}
