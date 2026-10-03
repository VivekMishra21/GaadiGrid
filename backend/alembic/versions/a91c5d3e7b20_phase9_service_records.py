"""phase9_service_records

Revision ID: a91c5d3e7b20
Revises: f4ee1d8ec079
Create Date: 2026-10-03 10:00:00.000000

"""
from datetime import datetime, timezone
from typing import Sequence, Union
from zoneinfo import ZoneInfo

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a91c5d3e7b20'
down_revision: Union[str, None] = 'f4ee1d8ec079'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

IST = ZoneInfo("Asia/Kolkata")


def upgrade() -> None:
    op.create_table(
        'service_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('vehicle_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=True),
        sa.Column('expense_id', sa.Integer(), nullable=True),
        sa.Column('source', sa.String(length=10), nullable=False),
        sa.Column('service_type', sa.String(length=30), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('provider_name', sa.String(length=255), nullable=True),
        sa.Column('service_date', sa.Date(), nullable=False),
        sa.Column('odometer_km', sa.Integer(), nullable=True),
        sa.Column('amount', sa.Float(), nullable=True),
        sa.Column('invoice_number', sa.String(length=100), nullable=True),
        sa.Column('work_done', sa.String(length=1000), nullable=True),
        sa.Column('notes', sa.String(length=1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id']),
        sa.ForeignKeyConstraint(['expense_id'], ['expenses.id']),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id']),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('booking_id'),
        sa.UniqueConstraint('expense_id'),
    )
    op.create_index(op.f('ix_service_records_id'), 'service_records', ['id'], unique=False)
    op.create_index(op.f('ix_service_records_owner_id'), 'service_records', ['owner_id'], unique=False)
    op.create_index(op.f('ix_service_records_vehicle_id'), 'service_records', ['vehicle_id'], unique=False)
    op.create_index('ix_service_records_vehicle_id_service_date', 'service_records', ['vehicle_id', 'service_date'], unique=False)

    _backfill_completed_bookings()


def _backfill_completed_bookings() -> None:
    """Every booking that already completed gets the same record + expense a newly
    completed one now gets automatically — derived purely from that booking's own stored
    price, package, provider and completion time, so nothing is invented."""
    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            """
            SELECT b.id, b.customer_id, b.vehicle_id, b.price_at_booking, b.completed_at, b.scheduled_at,
                   sp.name AS package_name, sp.category AS package_category, p.business_name
            FROM bookings b
            JOIN service_packages sp ON sp.id = b.package_id
            JOIN providers p ON p.id = b.provider_id
            WHERE b.status = 'COMPLETED'
            ORDER BY b.id
            """
        )
    ).mappings().all()

    now = datetime.now(timezone.utc)
    for row in rows:
        when = row["completed_at"] or row["scheduled_at"]
        service_date = when.astimezone(IST).date()
        note = f"{row['package_name']} - {row['business_name']}"[:500]
        expense_id = bind.execute(
            sa.text(
                """
                INSERT INTO expenses (owner_id, vehicle_id, category, amount, expense_date, note, created_at, updated_at)
                VALUES (:owner, :vehicle, 'SERVICE', :amount, :day, :note, :now, :now)
                RETURNING id
                """
            ),
            {"owner": row["customer_id"], "vehicle": row["vehicle_id"], "amount": row["price_at_booking"], "day": service_date, "note": note, "now": now},
        ).scalar_one()
        bind.execute(
            sa.text(
                """
                INSERT INTO service_records (owner_id, vehicle_id, booking_id, expense_id, source, service_type, title,
                                             provider_name, service_date, amount, created_at, updated_at)
                VALUES (:owner, :vehicle, :booking, :expense, 'BOOKING', :stype, :title, :provider, :day, :amount, :now, :now)
                """
            ),
            {
                "owner": row["customer_id"], "vehicle": row["vehicle_id"], "booking": row["id"], "expense": expense_id,
                "stype": row["package_category"], "title": row["package_name"], "provider": row["business_name"],
                "day": service_date, "amount": row["price_at_booking"], "now": now,
            },
        )


def downgrade() -> None:
    # The expenses auto-created from completed bookings only exist because of their record;
    # remove them too so a downgrade/upgrade cycle can't count the same booking twice.
    # Expenses attached to manually logged records stay: they are the user's own entries.
    bind = op.get_bind()
    auto_expense_ids = [
        row[0]
        for row in bind.execute(sa.text("SELECT expense_id FROM service_records WHERE source = 'BOOKING' AND expense_id IS NOT NULL"))
    ]
    op.drop_index('ix_service_records_vehicle_id_service_date', table_name='service_records')
    op.drop_index(op.f('ix_service_records_vehicle_id'), table_name='service_records')
    op.drop_index(op.f('ix_service_records_owner_id'), table_name='service_records')
    op.drop_index(op.f('ix_service_records_id'), table_name='service_records')
    op.drop_table('service_records')
    if auto_expense_ids:
        bind.execute(sa.text("DELETE FROM expenses WHERE id = ANY(:ids)"), {"ids": auto_expense_ids})
