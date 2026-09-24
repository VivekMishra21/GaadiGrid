from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def record_audit_event(
    db: Session,
    action: str,
    actor_user_id: int | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    context: dict | None = None,
    ip_address: str | None = None,
) -> None:
    """context must never contain passwords, OTPs, tokens, or other secrets."""
    db.add(
        AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            context=context,
            ip_address=ip_address,
        )
    )
    db.commit()
