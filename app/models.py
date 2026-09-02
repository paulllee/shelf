from dataclasses import dataclass
from enum import IntEnum

from pydantic import BaseModel
from slugify import slugify


class MediaCountry(IntEnum):
    UNDEFINED = 0
    KOREA = 1
    JAPAN = 2
    AMERICA = 3

    @staticmethod
    def get(name: str | object) -> "MediaCountry":
        return MediaCountry[str(name).upper()]


class MediaType(IntEnum):
    UNDEFINED = 0
    VARIETY = 1
    DRAMA = 2
    MOVIE = 3
    SERIES = 4

    @staticmethod
    def get(name: str | object) -> "MediaType":
        return MediaType[str(name).upper()]


class MediaStatus(IntEnum):
    QUEUED = 0
    WATCHING = 1
    WATCHED = 2

    @staticmethod
    def get(name: str | object) -> "MediaStatus":
        return MediaStatus[str(name).upper()]


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
    rating: str | None = None
    review: str | None = None

    @property
    def id(self) -> str:
        return slugify(self.name).lower()
