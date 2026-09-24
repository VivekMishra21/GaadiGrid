from pydantic import BaseModel, ConfigDict


class FuelTypeOut(BaseModel):
    id: int
    code: str
    label: str
    unit: str

    model_config = ConfigDict(from_attributes=True)
