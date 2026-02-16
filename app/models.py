from dataclasses import dataclass
from datetime import date, time
from enum import IntEnum
from typing import Optional

from pydantic import BaseModel
from slugify import slugify


# media


class MediaCountry(IntEnum):
    UNDEFINED = 0
    KOREA = 1
    JAPAN = 2
    AMERICA = 3

    @staticmethod
    def get(name: str | object) -> "MediaCountry":
        return MediaCountry[str(name).upper()]

    @staticmethod
    def get_defined_names() -> list[str]:
        return [m.name for m in MediaCountry]


class MediaType(IntEnum):
    UNDEFINED = 0
    VARIETY = 1
    DRAMA = 2
    MOVIE = 3
    SERIES = 4

    @staticmethod
    def get(name: str | object) -> "MediaType":
        return MediaType[str(name).upper()]

    @staticmethod
    def get_defined_names() -> list[str]:
        return [m.name for m in MediaType]


class MediaStatus(IntEnum):
    QUEUED = 0
    WATCHING = 1
    WATCHED = 2

    @staticmethod
    def get(name: str | object) -> "MediaStatus":
        return MediaStatus[str(name).upper()]

    @staticmethod
    def get_defined_names() -> list[str]:
        return [m.name for m in MediaStatus]


@dataclass
class Media:
    name: str
    country: MediaCountry
    type: MediaType
    status: MediaStatus
    rating: str
    review: str

    @property
    def id(self) -> str:
        return slugify(self.name).lower()

    @property
    def country_str(self) -> str:
        return self.country.name.lower()

    @property
    def type_str(self) -> str:
        return self.type.name.lower()

    @property
    def status_str(self) -> str:
        return self.status.name.lower()


class MediaModel(BaseModel):
    name: str
    country: str
    type: str
    status: str
    rating: Optional[str] = None
    review: Optional[str] = None

    @property
    def id(self) -> str:
        return slugify(self.name).lower()


# workout


@dataclass
class WorkoutSet:
    reps: int | None = None
    weight: float | None = None


@dataclass
class Exercise:
    name: str
    sets: list[WorkoutSet]


@dataclass
class ExerciseGroup:
    name: str
    rest_seconds: int
    exercises: list[Exercise]


@dataclass
class Workout:
    date: date
    time: time
    groups: list[ExerciseGroup]
    content: str

    @property
    def id(self) -> str:
        return f"{self.date.strftime('%Y%m%d')}-{self.time.strftime('%H%M%S')}"


class WorkoutSetModel(BaseModel):
    reps: Optional[int] = None
    weight: Optional[float] = None


class ExerciseModel(BaseModel):
    name: str
    sets: list[WorkoutSetModel]


class ExerciseGroupModel(BaseModel):
    name: str
    rest_seconds: int
    exercises: list[ExerciseModel]


class WorkoutModel(BaseModel):
    date: date
    time: time
    groups: list[ExerciseGroupModel]
    content: Optional[str] = None

    @property
    def id(self) -> str:
        return f"{self.date.strftime('%Y%m%d')}-{self.time.strftime('%H%M%S')}"


# workout templates


@dataclass
class WorkoutTemplate:
    name: str
    groups: list[ExerciseGroup]

    @property
    def id(self) -> str:
        return slugify(self.name).lower()


class WorkoutTemplateModel(BaseModel):
    name: str
    groups: list[ExerciseGroupModel]

    @property
    def id(self) -> str:
        return slugify(self.name).lower()
