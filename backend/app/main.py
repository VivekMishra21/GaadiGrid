import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import app.models  # noqa: F401  (registers every table for Alembic autogenerate)
from app.core.config import settings
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.routers.addresses import router as addresses_router
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.bookings import router as bookings_router
from app.routers.expenses import router as expenses_router
from app.routers.health import router as health_router
from app.routers.notifications import router as notifications_router
from app.routers.payments import router as payments_router
from app.routers.payments import webhook_router as payments_webhook_router
from app.routers.providers import router as providers_router
from app.routers.queue_reports import flags_router as queue_report_flags_router
from app.routers.queue_reports import router as queue_reports_router
from app.routers.settlements import admin_router as admin_settlements_router
from app.routers.settlements import router as settlements_router
from app.routers.stations import fuel_types_router
from app.routers.stations import router as stations_router
from app.routers.users import router as users_router
from app.routers.vehicles import router as vehicles_router
from app.services.exceptions import ServiceError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("gaadigrid")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.is_production and settings.otp_provider == "dev":
        raise RuntimeError("OTP_PROVIDER=dev must not be used in production. Configure a real SMS provider.")
    if settings.is_production and settings.payment_provider == "dev":
        raise RuntimeError("PAYMENT_PROVIDER=dev must not be used in production. Configure a real payment gateway.")

    from app.database.session import SessionLocal
    from app.workers.reference_data import ensure_fuel_types

    db = SessionLocal()
    try:
        ensure_fuel_types(db)
    finally:
        db.close()

    yield


app = FastAPI(title="GaadiGrid API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)


@app.exception_handler(ServiceError)
async def service_error_handler(_request: Request, exc: ServiceError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"code": "http_error", "message": exc.detail}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    details = [
        {"loc": list(err.get("loc", [])), "msg": err.get("msg", ""), "type": err.get("type", "")}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "validation_error",
                "message": "Request validation failed.",
                "details": details,
            },
        },
    )


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(vehicles_router)
app.include_router(addresses_router)
app.include_router(admin_router)
app.include_router(stations_router)
app.include_router(fuel_types_router)
app.include_router(queue_reports_router)
app.include_router(queue_report_flags_router)
app.include_router(providers_router)
app.include_router(bookings_router)
app.include_router(payments_router)
app.include_router(payments_webhook_router)
app.include_router(settlements_router)
app.include_router(admin_settlements_router)
app.include_router(expenses_router)
app.include_router(notifications_router)
