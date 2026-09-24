"""This app currently assumes a single locale (India) throughout — there is no
per-user or per-provider timezone field anywhere in the schema. `IST` is the one
place that assumption is named, so provider working hours (wall-clock, e.g. "9:00")
convert correctly to/from the UTC-aware timestamps stored in the database."""

from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
