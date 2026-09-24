class ServiceError(Exception):
    """Base class for service-layer errors that routers translate into HTTP responses."""

    code = "service_error"
    status_code = 400

    def __init__(self, message: str, code: str | None = None, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code


class OtpCooldownError(ServiceError):
    code = "otp_resend_cooldown"
    status_code = 429


class OtpRateLimitError(ServiceError):
    code = "otp_rate_limited"
    status_code = 429


class OtpExpiredError(ServiceError):
    code = "otp_expired"
    status_code = 400


class OtpIncorrectError(ServiceError):
    code = "otp_incorrect"
    status_code = 400


class OtpAttemptsExceededError(ServiceError):
    code = "otp_attempts_exceeded"
    status_code = 429


class OtpNotFoundError(ServiceError):
    code = "otp_not_found"
    status_code = 400


class RefreshTokenInvalidError(ServiceError):
    code = "refresh_token_invalid"
    status_code = 401


class RefreshTokenReuseDetectedError(ServiceError):
    code = "refresh_token_reuse_detected"
    status_code = 401


class ValidationError(ServiceError):
    code = "validation_error"
    status_code = 422


class NotFoundError(ServiceError):
    code = "not_found"
    status_code = 404


class ForbiddenError(ServiceError):
    code = "forbidden"
    status_code = 403


class ConflictError(ServiceError):
    code = "conflict"
    status_code = 409
