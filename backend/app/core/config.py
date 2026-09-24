from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"

    database_url: str = "postgresql+psycopg://gaadigrid:gaadigrid_dev@localhost:5433/gaadigrid"
    redis_url: str = "redis://localhost:6380/0"

    jwt_secret_key: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    otp_provider: str = "dev"
    otp_length: int = 6
    otp_expire_seconds: int = 300
    otp_resend_cooldown_seconds: int = 30
    otp_max_attempts: int = 5
    otp_max_resends_per_hour: int = 5

    sms_provider_api_key: str = ""
    sms_provider_sender_id: str = ""

    admin_seed_phone: str = "+919999999999"
    admin_seed_email: str = "admin@gaadigrid.dev"

    payment_provider: str = "dev"
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    dev_payment_webhook_secret: str = "dev-payment-webhook-secret-change-me"
    default_commission_rate: float = 0.15

    s3_endpoint_url: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_bucket_name: str = ""
    s3_region: str = ""

    maps_provider: str = "google"
    google_maps_server_api_key: str = ""
    mappls_client_id: str = ""
    mappls_client_secret: str = ""

    weather_provider: str = "dev"
    weather_api_key: str = ""

    push_provider: str = "dev"
    fcm_server_key: str = ""
    expo_access_token: str = ""

    cors_allowed_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:8081"

    # Queue reporting (Phase 2)
    queue_report_expire_minutes: int = 45
    queue_report_cooldown_seconds: int = 120
    queue_report_verified_partner_weight: float = 3.0
    queue_report_max_distance_km: float = 2.0
    queue_report_flag_threshold: int = 2
    default_station_search_radius_km: float = 10.0
    max_station_search_radius_km: float = 50.0

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
