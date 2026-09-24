from pydantic import BaseModel


class WeatherWarningOut(BaseModel):
    warning: str | None
