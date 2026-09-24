from fastapi import HTTPException, Request, status

from app.core.redis_client import get_redis


def rate_limit(key_prefix: str, max_requests: int, window_seconds: int):
    """A per-client-IP fixed-window rate limiter, applied as a route dependency.
    This is a defense-in-depth layer in front of the finer-grained, per-resource
    limits already enforced in the service layer (e.g. OTP cooldown/attempts)."""

    def dependency(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"ratelimit:{key_prefix}:{client_ip}"
        r = get_redis()
        count = r.incr(key)
        if count == 1:
            r.expire(key, window_seconds)
        if count > max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down and try again shortly.",
            )

    return dependency
