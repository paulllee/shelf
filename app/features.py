from fastapi import Depends, HTTPException, Request

from app.settings import ViewName


def require_view(view: ViewName) -> Depends:
    async def check_view(request: Request) -> None:
        enabled_views = request.app.state.enabled_views
        if view not in enabled_views:
            raise HTTPException(status_code=404, detail=f"view disabled: {view}")

    return Depends(check_view)
