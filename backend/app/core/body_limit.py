"""Bound streamed requests before JSON parsing, including direct backend access."""

from starlette.responses import JSONResponse


class RequestBodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] in {"GET", "HEAD", "OPTIONS"}:
            return await self.app(scope, receive, send)
        limit = (
            7_000_000
            if scope["path"].startswith("/api/master/items/")
            and scope["path"].endswith("/image")
            else 65536 if scope["path"].startswith(("/api/inventory/", "/api/purchasing/", "/api/sales/", "/api/routing/")) else 16384
        )
        chunks, size = [], 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body = message.get("body", b"")
            size += len(body)
            if size > limit:
                response = JSONResponse(
                    {
                        "error": {
                            "code": "REQUEST_TOO_LARGE",
                            "message": "The request exceeds the allowed size",
                        }
                    },
                    status_code=413,
                )
                return await response(scope, receive, send)
            chunks.append(body)
            if not message.get("more_body", False):
                break
        pending = True

        async def replay():
            nonlocal pending
            if pending:
                pending = False
                return {
                    "type": "http.request",
                    "body": b"".join(chunks),
                    "more_body": False,
                }
            return await receive()

        await self.app(scope, replay, send)
