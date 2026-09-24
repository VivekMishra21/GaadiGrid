from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.config import settings

# Permits the default Swagger UI's CDN-loaded assets (FastAPI's /docs pulls its JS/CSS
# from jsdelivr and its favicon from fastapi.tiangolo.com) while still locking down
# every other response to same-origin only. This is the one HTML page this API serves
# itself; every other route returns JSON, which CSP doesn't apply to in a browser
# sense but costs nothing to send the header on anyway.
CONTENT_SECURITY_POLICY = (
    "default-src 'self'; "
    "script-src 'self' https://cdn.jsdelivr.net; "
    "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
    "img-src 'self' data: https://fastapi.tiangolo.com; "
    "frame-ancestors 'none'"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(self), camera=(), microphone=()"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Content-Security-Policy"] = CONTENT_SECURITY_POLICY
        if settings.is_production:
            # Only meaningful once real TLS termination is in front of the API (see
            # the risks doc) — sending it over plain http in dev would be a no-op at
            # best and misleading at worst.
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response
