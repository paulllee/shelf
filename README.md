# shelf

self hosted, markdown-backed, personalized ui to navigate media reviews, media
watchlist, and more

## media (reviews + watchlist)

### data model

each review will be a separate md file in a media dir

```md
---
name: _
country: korea | japan | america
type: variety | drama | movie | series
status: queued | watching | watched
rating: n/5 ? _
---

optional description?
```

if status is not watched, that will be in a watchlist

each field will be available to edit when i click on a review

i can sort the media options by what a user wants to

### htmx endpoints

`GET /media-items` media items elements

you can also filter out columns that you don't want

`GET|POST|DEL /media-items/{name}`

delete should go to a temp directory, until a user clears the bin

## workouts

tbd

## wishlist

tbd

## recipes

tbd
