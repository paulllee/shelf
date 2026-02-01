from pathlib import Path

import frontmatter

from app.models import MediaModel


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
