"""Security response headers.

A Content-Security-Policy is delivered by the response that carries the
*document*. That is worth stating plainly, because it decides where each policy
below belongs (spec §12, open question 3):

- **The app page** — `index.html`, and with it the rendered markdown that made
  a CSP worth having — is served by Vite in development and by a static host or
  CDN in production. **Never by this API.** Its policy lives in
  `frontend/csp.ts`; a policy set here could not protect it.
- **This API's responses** are JSON. They legitimately load nothing at all, so
  their policy is the strictest one CSP can express, and it costs nothing to
  enforce it today.
- **`/docs` and `/redoc`** are the exception: real HTML pages, served by this
  app, that pull Swagger UI and ReDoc from a CDN. They need their own, looser
  policy — and they are developer tooling, so in production the better move is
  to switch them off entirely (see `docs/auth.md`).

Everything here is a plain response header. Nothing depends on Clerk, so
nothing here can break sign-in.
"""
from starlette.types import ASGIApp, Message, Receive, Scope, Send

# Paths that serve HTML documentation rather than API JSON.
DOCS_PATHS = frozenset({"/docs", "/redoc", "/docs/oauth2-redirect"})

# ─── The API policy ──────────────────────────────────────────────────────────
# `default-src 'none'` is the whole point: a JSON response has no business
# fetching a script, an image or a font, so nothing is allowed to. The rest
# closes the gaps `default-src` does not cover.
API_CSP = "; ".join([
    "default-src 'none'",
    # Clickjacking: this API can never be put in a frame by anyone.
    "frame-ancestors 'none'",
    # Stops an injected <base> rewriting where relative URLs resolve to.
    "base-uri 'none'",
    # No form on an API response should ever submit anywhere.
    "form-action 'none'",
])

# ─── The docs policy ─────────────────────────────────────────────────────────
# Swagger UI and ReDoc are loaded from jsDelivr by FastAPI's built-in pages,
# and both bootstrap themselves with an inline <script> block, which is why
# 'unsafe-inline' appears here and nowhere else. Scoped to two dev-only paths.
DOCS_CSP = "; ".join([
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    # Swagger's favicon comes from fastapi.tiangolo.com; ReDoc's logo from its own CDN.
    "img-src 'self' data: https://fastapi.tiangolo.com https://cdn.redoc.ly",
    # ReDoc renders large schemas in a worker.
    "worker-src 'self' blob:",
    # "Try it out" calls this same API.
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
])

# Applied to every response, documentation included.
BASELINE_HEADERS = {
    # Never let a browser second-guess a declared Content-Type. Without this, a
    # JSON response holding user-supplied text can be sniffed as HTML.
    "X-Content-Type-Options": "nosniff",
    # Send the origin, never the path, to other sites — board and ticket IDs
    # live in our URLs.
    "Referrer-Policy": "strict-origin-when-cross-origin",
    # `frame-ancestors` supersedes this, but it costs one header to also cover
    # browsers that read the old one.
    "X-Frame-Options": "DENY",
}


def policy_for(path: str) -> str:
    """The Content-Security-Policy that applies to a given request path."""
    return DOCS_CSP if path in DOCS_PATHS else API_CSP


class SecurityHeadersMiddleware:
    """Attach the security headers to every response.

    Written as raw ASGI rather than ``@app.middleware("http")`` so that it also
    covers responses the HTTP middleware stack never sees as a `Response`
    object — streaming responses, and anything raised before the router.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        csp = policy_for(scope.get("path", ""))

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                headers.append((b"content-security-policy", csp.encode("latin-1")))
                for name, value in BASELINE_HEADERS.items():
                    headers.append((name.encode("latin-1"), value.encode("latin-1")))
            await send(message)

        await self.app(scope, receive, send_with_headers)
