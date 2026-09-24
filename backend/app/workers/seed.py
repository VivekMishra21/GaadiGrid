"""Development seed data for GaadiGrid.

Creates one account per role plus a sample address and vehicle, all clearly labeled as
development data and located in Noida (the initial development city). Refuses to run
against a production environment.

Run with:  python -m app.workers.seed
"""

import sys
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func

from app.core.config import settings
from app.core.constants import ConsentType, Role
from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.address import Address
from app.models.expense import Expense, ExpenseCategory
from app.models.fuel_availability import FuelAvailability
from app.models.fuel_price import FuelPrice
from app.models.fuel_station import FuelStation
from app.models.fuel_type import FuelType as FuelTypeModel
from app.models.provider import Provider
from app.models.provider_availability import ProviderAvailability
from app.models.provider_staff_member import ProviderStaffMember
from app.models.queue_report import QueueReport, QueueReportType
from app.models.service_package import ServiceCategory, ServicePackage
from app.models.station_facility import FacilityCode, StationFacility
from app.models.user import User
from app.models.user_consent import UserConsent
from app.models.vehicle import FuelType, Vehicle, VehicleType
from app.repositories.station_repository import _point_wkt
from app.workers.reference_data import ensure_fuel_types

# Example car-care business for Noida. A generic-sounding name, not tied to any real
# registered business — same reasoning as SEED_STATIONS above (no [DEV] prefix on the
# business name itself; the owner account that manages it is already clearly labeled).
SEED_PROVIDER = {
    "business_name": "Sparkle Auto Care",
    "description": "Doorstep car wash, detailing and AC servicing in Noida.",
    "phone": "+919812345678",
    "email": "contact@sparkleautocare.example",
    "address": "Shop 4, Sector 62 Market, Noida",
    "city": "Noida",
    "locality": "Sector 62",
    "latitude": 28.6270,
    "longitude": 77.3715,
}

SEED_PACKAGES = [
    {
        "category": ServiceCategory.CAR_WASH,
        "name": "Basic Exterior Wash",
        "description": "Exterior foam wash and dry.",
        "price": 249.0,
        "duration_minutes": 45,
        "is_doorstep": True,
    },
    {
        "category": ServiceCategory.DETAILING,
        "name": "Interior Deep Clean",
        "description": "Vacuum, upholstery shampoo, dashboard polish.",
        "price": 799.0,
        "duration_minutes": 120,
        "is_doorstep": True,
    },
    {
        "category": ServiceCategory.AC_SERVICE,
        "name": "AC Gas Refill & Service",
        "description": "AC gas top-up and cabin filter check. At our service center.",
        "price": 1499.0,
        "duration_minutes": 90,
        "is_doorstep": False,
    },
]

DEV_PASSWORD = "GaadiGrid@Dev123"

# Example stations for Noida (the initial development city). Names/brands are
# generic (common Indian fuel brands + locality), not tied to any specific real
# registered outlet. Prices and queue data are illustrative — the freshness
# mechanism (updated_at / age_minutes / "no recent reports") is what keeps the UI
# from ever presenting this as live verified information, per the project's
# instruction not to represent seed data as real-time.
SEED_STATIONS = [
    {
        "name": "Indian Oil - Sector 18",
        "brand": "Indian Oil",
        "address": "Sector 18, Noida",
        "city": "Noida",
        "locality": "Sector 18",
        "latitude": 28.5708,
        "longitude": 77.3260,
        "is_24_hours": True,
        "prices": {"PETROL": 96.72, "DIESEL": 89.62},
        "facilities": [FacilityCode.AIR, FacilityCode.WASHROOM, FacilityCode.ATM, FacilityCode.UPI, FacilityCode.CARD_PAYMENT],
    },
    {
        "name": "HP Petrol Pump - Sector 62",
        "brand": "HP",
        "address": "Sector 62, Noida",
        "city": "Noida",
        "locality": "Sector 62",
        "latitude": 28.6273,
        "longitude": 77.3720,
        "is_24_hours": True,
        "prices": {"PETROL": 96.55, "DIESEL": 89.45, "CNG": 76.90},
        "facilities": [
            FacilityCode.AIR,
            FacilityCode.NITROGEN,
            FacilityCode.WASHROOM,
            FacilityCode.DRINKING_WATER,
            FacilityCode.UPI,
            FacilityCode.CARD_PAYMENT,
            FacilityCode.CONVENIENCE_STORE,
        ],
    },
    {
        "name": "Bharat Petroleum - Sector 44",
        "brand": "BPCL",
        "address": "Sector 44, Noida",
        "city": "Noida",
        "locality": "Sector 44",
        "latitude": 28.5691,
        "longitude": 77.3910,
        "is_24_hours": True,
        "prices": {"PETROL": 96.80, "DIESEL": 89.70},
        "facilities": [FacilityCode.AIR, FacilityCode.PUC, FacilityCode.CAR_WASH, FacilityCode.WHEELCHAIR_ACCESSIBLE],
    },
    {
        "name": "Shell - Sector 37",
        "brand": "Shell",
        "address": "Sector 37, Noida",
        "city": "Noida",
        "locality": "Sector 37",
        "latitude": 28.5691,
        "longitude": 77.3313,
        "is_24_hours": False,
        "opens_at": "06:00:00",
        "closes_at": "23:00:00",
        "prices": {"PETROL": 97.10, "DIESEL": 90.05},
        "facilities": [FacilityCode.AIR, FacilityCode.WASHROOM, FacilityCode.CARD_PAYMENT, FacilityCode.CONVENIENCE_STORE],
    },
    {
        "name": "Reliance Petroleum - Sector 15",
        "brand": "Reliance",
        "address": "Sector 15, Noida",
        "city": "Noida",
        "locality": "Sector 15",
        "latitude": 28.5847,
        "longitude": 77.3151,
        "is_24_hours": True,
        "prices": {"PETROL": 96.40, "DIESEL": 89.30, "EV": 18.50},
        "facilities": [FacilityCode.AIR, FacilityCode.UPI, FacilityCode.CARD_PAYMENT],
    },
    {
        "name": "HP CNG Station - Sector 71",
        "brand": "HP",
        "address": "Sector 71, Noida",
        "city": "Noida",
        "locality": "Sector 71",
        "latitude": 28.5963,
        "longitude": 77.3606,
        "is_24_hours": True,
        "prices": {"CNG": 77.20},
        "facilities": [FacilityCode.AIR, FacilityCode.WASHROOM, FacilityCode.DRINKING_WATER],
        "cng_unavailable": False,
    },
]

SEED_USERS = [
    {"role": Role.CUSTOMER, "phone": "+919810000001", "full_name": "[DEV] Aarav Sharma (Customer)"},
    {"role": Role.PROVIDER_OWNER, "email": "owner@gaadigrid.dev", "full_name": "[DEV] Priya Verma (Provider Owner)"},
    {"role": Role.PROVIDER_STAFF, "email": "staff@gaadigrid.dev", "full_name": "[DEV] Rohan Gupta (Provider Staff)"},
    {"role": Role.ADMIN, "email": settings.admin_seed_email, "full_name": "[DEV] GaadiGrid Admin"},
    {"role": Role.SUPER_ADMIN, "email": "superadmin@gaadigrid.dev", "full_name": "[DEV] GaadiGrid Super Admin"},
]


def seed_stations(db, customer: User | None, provider_owner: User | None) -> None:
    """Idempotent: creates the example Noida stations (with prices, facilities,
    availability) if they don't already exist, plus a handful of sample queue
    reports so the freshness/trust-decay behaviour is visible without waiting."""
    ensure_fuel_types(db)
    fuel_types_by_code = {ft.code: ft for ft in db.query(FuelTypeModel).all()}

    created_stations = []
    for spec in SEED_STATIONS:
        existing = (
            db.query(FuelStation)
            .filter(FuelStation.name == spec["name"], FuelStation.city == spec["city"])
            .first()
        )
        if existing:
            print(f"Skipping (already exists): {spec['name']}")
            created_stations.append(existing)
            continue

        station = FuelStation(
            name=spec["name"],
            brand=spec["brand"],
            address=spec["address"],
            city=spec["city"],
            locality=spec["locality"],
            latitude=spec["latitude"],
            longitude=spec["longitude"],
            location=func.ST_GeogFromText(_point_wkt(spec["latitude"], spec["longitude"])),
            is_24_hours=spec["is_24_hours"],
            opens_at=time.fromisoformat(spec["opens_at"]) if spec.get("opens_at") else None,
            closes_at=time.fromisoformat(spec["closes_at"]) if spec.get("closes_at") else None,
        )
        db.add(station)
        db.flush()

        for code, price in spec["prices"].items():
            fuel_type = fuel_types_by_code[code]
            db.add(FuelPrice(station_id=station.id, fuel_type_id=fuel_type.id, price=price))
            db.add(FuelAvailability(station_id=station.id, fuel_type_id=fuel_type.id, is_available=True))

        for facility_code in spec["facilities"]:
            db.add(StationFacility(station_id=station.id, facility_code=facility_code))

        print(f"Created station: {spec['name']}")
        created_stations.append(station)

    db.commit()

    if customer is not None and provider_owner is not None and len(created_stations) >= 6:
        has_reports = db.query(QueueReport).first()
        if not has_reports:
            now = datetime.now(timezone.utc)
            db.add_all(
                [
                    QueueReport(
                        station_id=created_stations[0].id,
                        reported_by_id=customer.id,
                        report_type=QueueReportType.NO_QUEUE,
                        reporter_latitude=created_stations[0].latitude,
                        reporter_longitude=created_stations[0].longitude,
                        is_verified_partner_report=False,
                    ),
                    QueueReport(
                        station_id=created_stations[0].id,
                        reported_by_id=provider_owner.id,
                        report_type=QueueReportType.WAIT_5_10,
                        reporter_latitude=created_stations[0].latitude,
                        reporter_longitude=created_stations[0].longitude,
                        is_verified_partner_report=True,
                    ),
                    # Deliberately backdated past the default 45-minute freshness
                    # window, to demonstrate that expired reports drop out of the
                    # combined queue status instead of being shown as current.
                    QueueReport(
                        station_id=created_stations[1].id,
                        reported_by_id=customer.id,
                        report_type=QueueReportType.WAIT_10_20,
                        reporter_latitude=created_stations[1].latitude,
                        reporter_longitude=created_stations[1].longitude,
                        is_verified_partner_report=False,
                        created_at=now - timedelta(minutes=60),
                        updated_at=now - timedelta(minutes=60),
                    ),
                    QueueReport(
                        station_id=created_stations[5].id,
                        reported_by_id=provider_owner.id,
                        report_type=QueueReportType.CNG_GOOD_PRESSURE,
                        reporter_latitude=created_stations[5].latitude,
                        reporter_longitude=created_stations[5].longitude,
                        is_verified_partner_report=True,
                    ),
                ]
            )
            db.commit()
            print("Created sample queue reports (including one deliberately expired, for demo purposes).")


def seed_provider(db, provider_owner: User | None, provider_staff: User | None) -> None:
    """Idempotent: creates one example provider (owned by the seeded PROVIDER_OWNER
    account) with a few service packages and a Mon-Sat availability window, so the
    booking flow has something real to browse and book against. Also links the
    seeded PROVIDER_STAFF account to it, demonstrating Phase 5's staff management
    without needing a fresh manual setup every time."""
    if provider_owner is None:
        return

    provider = db.query(Provider).filter(Provider.owner_user_id == provider_owner.id).first()
    if provider is None:
        provider = Provider(owner_user_id=provider_owner.id, **SEED_PROVIDER)
        db.add(provider)
        db.flush()

        for spec in SEED_PACKAGES:
            db.add(ServicePackage(provider_id=provider.id, **spec))

        # Monday(0)-Saturday(5): open. Sunday(6): closed (no row).
        for day in range(6):
            db.add(ProviderAvailability(provider_id=provider.id, day_of_week=day, opens_at=time(9, 0), closes_at=time(19, 0)))

        db.commit()
        print(f"Created provider: {provider.business_name} (with {len(SEED_PACKAGES)} packages, Mon-Sat 9am-7pm)")
    else:
        print(f"Skipping (already exists): {provider.business_name}")

    if provider_staff is not None:
        existing_link = db.query(ProviderStaffMember).filter(ProviderStaffMember.user_id == provider_staff.id).first()
        if existing_link is None:
            db.add(ProviderStaffMember(provider_id=provider.id, user_id=provider_staff.id))
            db.commit()
            print(f"Linked {provider_staff.full_name} to {provider.business_name} as staff.")
        else:
            print(f"Skipping (already linked): {provider_staff.full_name} is already on staff.")


def seed_expenses(db, customer: User | None) -> None:
    """Idempotent: adds a couple of sample expenses to the seeded customer's default
    vehicle, so the Expenses screen has something real to show. Reviews and disputes
    aren't seeded here — they only make sense attached to a real (customer-confirmed,
    provider-completed) booking, and seeding a fake one would misrepresent the booking
    flow; the live-verification pass creates a real booking to demonstrate those
    instead, same approach as Phase 4's payments/settlements."""
    if customer is None:
        return

    vehicle = db.query(Vehicle).filter(Vehicle.owner_id == customer.id, Vehicle.is_default.is_(True)).first()
    if vehicle is None:
        return

    has_expense = db.query(Expense).filter(Expense.vehicle_id == vehicle.id).first()
    if has_expense:
        print("Skipping (already exists): sample expenses")
        return

    db.add_all(
        [
            Expense(
                owner_id=customer.id,
                vehicle_id=vehicle.id,
                category=ExpenseCategory.FUEL,
                amount=1500.0,
                expense_date=date.today() - timedelta(days=10),
                note="[DEV] Petrol fill-up",
            ),
            Expense(
                owner_id=customer.id,
                vehicle_id=vehicle.id,
                category=ExpenseCategory.PARKING,
                amount=100.0,
                expense_date=date.today() - timedelta(days=3),
                note="[DEV] Mall parking",
            ),
        ]
    )
    db.commit()
    print(f"Created 2 sample expenses for {vehicle.registration_number}.")


def run():
    if settings.is_production:
        print("Refusing to seed: ENVIRONMENT=production.")
        sys.exit(1)

    db = SessionLocal()
    try:
        created_customer = None
        created_provider_owner = None
        created_provider_staff = None

        for spec in SEED_USERS:
            existing = None
            if "phone" in spec:
                existing = db.query(User).filter(User.phone == spec["phone"]).first()
            else:
                existing = db.query(User).filter(User.email == spec["email"]).first()

            if existing:
                print(f"Skipping (already exists): {spec['full_name']}")
                if spec["role"] == Role.CUSTOMER:
                    created_customer = existing
                elif spec["role"] == Role.PROVIDER_OWNER:
                    created_provider_owner = existing
                elif spec["role"] == Role.PROVIDER_STAFF:
                    created_provider_staff = existing
                continue

            user = User(
                role=spec["role"],
                full_name=spec["full_name"],
                phone=spec.get("phone"),
                email=spec.get("email"),
                password_hash=hash_password(DEV_PASSWORD) if "email" in spec else None,
                is_active=True,
            )
            db.add(user)
            db.flush()

            if spec["role"] == Role.CUSTOMER:
                db.add(
                    UserConsent(
                        user_id=user.id,
                        consent_type=ConsentType.TERMS_OF_SERVICE,
                        version="1.0",
                        accepted_at=user.created_at,
                    )
                )
                db.add(
                    UserConsent(
                        user_id=user.id,
                        consent_type=ConsentType.PRIVACY_POLICY,
                        version="1.0",
                        accepted_at=user.created_at,
                    )
                )
                created_customer = user
            elif spec["role"] == Role.PROVIDER_OWNER:
                created_provider_owner = user
            elif spec["role"] == Role.PROVIDER_STAFF:
                created_provider_staff = user

            print(f"Created: {spec['full_name']} ({'phone ' + spec['phone'] if 'phone' in spec else spec['email']})")

        db.commit()

        if created_customer is not None:
            has_address = db.query(Address).filter(Address.user_id == created_customer.id).first()
            if not has_address:
                db.add(
                    Address(
                        user_id=created_customer.id,
                        label="Home",
                        line1="[DEV] H-142, Sector 62",
                        city="Noida",
                        state="Uttar Pradesh",
                        pincode="201309",
                        latitude=28.6139,
                        longitude=77.3910,
                        is_default=True,
                    )
                )

            has_vehicle = db.query(Vehicle).filter(Vehicle.owner_id == created_customer.id).first()
            if not has_vehicle:
                db.add(
                    Vehicle(
                        owner_id=created_customer.id,
                        vehicle_type=VehicleType.CAR,
                        registration_number="UP16AB1234",
                        brand="Maruti Suzuki",
                        model="Swift",
                        variant="VXI",
                        fuel_type=FuelType.PETROL,
                        average_mileage=19.5,
                        is_default=True,
                        insurance_expiry=date.today() + timedelta(days=120),
                        puc_expiry=date.today() + timedelta(days=45),
                        service_due_date=date.today() + timedelta(days=20),
                    )
                )
            db.commit()

        seed_stations(db, created_customer, created_provider_owner)
        seed_provider(db, created_provider_owner, created_provider_staff)
        seed_expenses(db, created_customer)

        print("\nDev seed complete. This is clearly-labeled development data, not real users.")
        print(f"Staff/admin password for all email-based accounts: {DEV_PASSWORD}")
        print(f"Customer OTP login phone: {SEED_USERS[0]['phone']} (OTP is printed to the API response in dev mode)")
    finally:
        db.close()


if __name__ == "__main__":
    run()
