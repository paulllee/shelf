from dataclasses import dataclass, field
from datetime import date, time
from enum import IntEnum

from pydantic import BaseModel
from slugify import slugify


# media


class MediaCountry(IntEnum):
    """Enum of supported media origin countries."""

    UNDEFINED = 0
    KOREA = 1
    JAPAN = 2
    AMERICA = 3

    @staticmethod
    def get(name: str | object) -> "MediaCountry":
        """Look up a MediaCountry member by case-insensitive name."""
        return MediaCountry[str(name).upper()]

    @staticmethod
    def get_defined_names() -> list[str]:
        """Return the names of all defined members."""
        return [m.name for m in MediaCountry]


class MediaType(IntEnum):
    """Enum of supported media types."""

    UNDEFINED = 0
    VARIETY = 1
    DRAMA = 2
    MOVIE = 3
    SERIES = 4

    @staticmethod
    def get(name: str | object) -> "MediaType":
        """Look up a MediaType member by case-insensitive name."""
        return MediaType[str(name).upper()]

    @staticmethod
    def get_defined_names() -> list[str]:
        """Return the names of all defined members."""
        return [m.name for m in MediaType]


class MediaStatus(IntEnum):
    """Enum of media watch statuses."""

    QUEUED = 0
    WATCHING = 1
    WATCHED = 2

    @staticmethod
    def get(name: str | object) -> "MediaStatus":
        """Look up a MediaStatus member by case-insensitive name."""
        return MediaStatus[str(name).upper()]

    @staticmethod
    def get_defined_names() -> list[str]:
        """Return the names of all defined members."""
        return [m.name for m in MediaStatus]


@dataclass
class Media:
    """Internal representation of a media item parsed from markdown."""

    name: str
    country: MediaCountry
    type: MediaType
    status: MediaStatus
    rating: str
    review: str

    @property
    def id(self) -> str:
        """Generate a URL-safe slug from the media name."""
        return slugify(self.name).lower()

    @property
    def country_str(self) -> str:
        """Return the country name in lowercase."""
        return self.country.name.lower()

    @property
    def type_str(self) -> str:
        """Return the type name in lowercase."""
        return self.type.name.lower()

    @property
    def status_str(self) -> str:
        """Return the status name in lowercase."""
        return self.status.name.lower()


class MediaModel(BaseModel):
    """Pydantic model for media item API input."""

    name: str
    country: str
    type: str
    status: str
    rating: str | None = None
    review: str | None = None

    @property
    def id(self) -> str:
        """Generate a URL-safe slug from the media name."""
        return slugify(self.name).lower()


# workout


@dataclass
class WorkoutSet:
    """A single set within an exercise (reps and/or weight)."""

    reps: int | None = None
    weight: float | None = None


@dataclass
class Exercise:
    """A named exercise with its sets."""

    name: str
    sets: list[WorkoutSet]


@dataclass
class ExerciseGroup:
    """A group of exercises performed together with a shared rest period."""

    name: str
    rest_seconds: int
    exercises: list[Exercise]


@dataclass
class Workout:
    """Internal representation of a workout parsed from markdown."""

    date: date
    time: time
    groups: list[ExerciseGroup]
    content: str

    @property
    def id(self) -> str:
        """Generate a timestamp-based ID from date and time."""
        return f"{self.date.strftime('%Y%m%d')}-{self.time.strftime('%H%M%S')}"


class WorkoutSetModel(BaseModel):
    """Pydantic model for a workout set API input."""

    reps: int | None = None
    weight: float | None = None


class ExerciseModel(BaseModel):
    """Pydantic model for an exercise API input."""

    name: str
    sets: list[WorkoutSetModel]


class ExerciseGroupModel(BaseModel):
    """Pydantic model for an exercise group API input."""

    name: str
    rest_seconds: int
    exercises: list[ExerciseModel]


class WorkoutModel(BaseModel):
    """Pydantic model for workout API input."""

    date: date
    time: time
    groups: list[ExerciseGroupModel]
    content: str | None = None

    @property
    def id(self) -> str:
        """Generate a timestamp-based ID from date and time."""
        return f"{self.date.strftime('%Y%m%d')}-{self.time.strftime('%H%M%S')}"


# workout templates


@dataclass
class WorkoutTemplate:
    """Internal representation of a workout template parsed from markdown."""

    name: str
    groups: list[ExerciseGroup]

    @property
    def id(self) -> str:
        """Generate a URL-safe slug from the template name."""
        return slugify(self.name).lower()


class WorkoutTemplateModel(BaseModel):
    """Pydantic model for workout template API input."""

    name: str
    groups: list[ExerciseGroupModel]

    @property
    def id(self) -> str:
        """Generate a URL-safe slug from the template name."""
        return slugify(self.name).lower()


# habits


@dataclass
class HabitShift:
    """A date shift for a habit occurrence (reschedule or skip)."""

    from_date: str  # YYYY-MM-DD — the original scheduled date
    to_date: str | None = None  # YYYY-MM-DD — new date, or None = skip


class HabitShiftModel(BaseModel):
    """Pydantic model for a habit shift API input."""

    from_date: str  # YYYY-MM-DD — original scheduled date
    to_date: str | None = None  # YYYY-MM-DD — new date, or None = skip


@dataclass
class Habit:
    """Internal representation of a habit parsed from markdown."""

    name: str
    days: list[int]  # 0=Sun … 6=Sat
    color: str  # hex color string
    completions: list[str]  # YYYY-MM-DD strings
    shifts: list[HabitShift] = field(default_factory=list)

    @property
    def id(self) -> str:
        """Generate a URL-safe slug from the habit name."""
        return slugify(self.name).lower()


@dataclass
class Activity:
    """Internal representation of an activity parsed from markdown."""

    name: str
    date: date

    @property
    def id(self) -> str:
        """Generate an ID from date and slugified name."""
        return f"{self.date.isoformat()}-{slugify(self.name).lower()}"


class HabitModel(BaseModel):
    """Pydantic model for habit API input."""

    name: str
    days: list[int]
    color: str
    completions: list[str] = []
    shifts: list[HabitShiftModel] = []

    @property
    def id(self) -> str:
        """Generate a URL-safe slug from the habit name."""
        return slugify(self.name).lower()


class ActivityModel(BaseModel):
    """Pydantic model for activity API input."""

    name: str
    date: date

    @property
    def id(self) -> str:
        """Generate an ID from date and slugified name."""
        return f"{self.date.isoformat()}-{slugify(self.name).lower()}"


@dataclass
class Preset:
    """Internal representation of an activity preset parsed from markdown."""

    name: str

    @property
    def id(self) -> str:
        """Generate a URL-safe slug from the preset name."""
        return slugify(self.name).lower()


class PresetModel(BaseModel):
    """Pydantic model for activity preset API input."""

    name: str

    @property
    def id(self) -> str:
        """Generate a URL-safe slug from the preset name."""
        return slugify(self.name).lower()
