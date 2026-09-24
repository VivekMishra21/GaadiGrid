from app.models.provider import VerificationStatus
from app.services.provider_verification import VerificationActor, can_transition_verification


def test_owner_can_submit_from_unverified():
    assert can_transition_verification(VerificationStatus.UNVERIFIED, VerificationStatus.PENDING, VerificationActor.OWNER) is True


def test_admin_cannot_submit_on_behalf_of_owner():
    assert can_transition_verification(VerificationStatus.UNVERIFIED, VerificationStatus.PENDING, VerificationActor.ADMIN) is False


def test_admin_can_verify_a_pending_submission():
    assert can_transition_verification(VerificationStatus.PENDING, VerificationStatus.VERIFIED, VerificationActor.ADMIN) is True


def test_admin_can_reject_a_pending_submission():
    assert can_transition_verification(VerificationStatus.PENDING, VerificationStatus.REJECTED, VerificationActor.ADMIN) is True


def test_owner_cannot_self_verify():
    assert can_transition_verification(VerificationStatus.PENDING, VerificationStatus.VERIFIED, VerificationActor.OWNER) is False


def test_owner_can_resubmit_after_rejection():
    assert can_transition_verification(VerificationStatus.REJECTED, VerificationStatus.PENDING, VerificationActor.OWNER) is True


def test_cannot_submit_while_already_pending():
    assert can_transition_verification(VerificationStatus.PENDING, VerificationStatus.PENDING, VerificationActor.OWNER) is False


def test_verified_is_terminal_for_owner_resubmission():
    assert can_transition_verification(VerificationStatus.VERIFIED, VerificationStatus.PENDING, VerificationActor.OWNER) is False


def test_verified_cannot_be_rejected_directly():
    assert can_transition_verification(VerificationStatus.VERIFIED, VerificationStatus.REJECTED, VerificationActor.ADMIN) is False


def test_no_transitions_from_an_unknown_status():
    assert can_transition_verification("BOGUS", VerificationStatus.PENDING, VerificationActor.OWNER) is False
