from pathlib import Path

import frontmatter

from app.models import MediaModel


def write_media_item(media_item: MediaModel, file_path: Path) -> None:
    post = frontmatter.Post(content=media_item.review or "")
    post["name"] = media_item.name
    post["country"] = media_item.country
    post["type"] = media_item.type
    post["status"] = media_item.status
    post["rating"] = media_item.rating or ""

    with file_path.open("wb") as file:
        frontmatter.dump(post, file)
        file.write(b"\n")
