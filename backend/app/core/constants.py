class Role:
    CUSTOMER = "CUSTOMER"
    PROVIDER_OWNER = "PROVIDER_OWNER"
    PROVIDER_STAFF = "PROVIDER_STAFF"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"

    ALL = (CUSTOMER, PROVIDER_OWNER, PROVIDER_STAFF, ADMIN, SUPER_ADMIN)
    ADMIN_ROLES = (ADMIN, SUPER_ADMIN)
    PROVIDER_ROLES = (PROVIDER_OWNER, PROVIDER_STAFF)


class OtpPurpose:
    LOGIN = "login"
    SIGNUP = "signup"

    ALL = (LOGIN, SIGNUP)


class TokenType:
    ACCESS = "access"
    REFRESH = "refresh"


class ConsentType:
    TERMS_OF_SERVICE = "terms_of_service"
    PRIVACY_POLICY = "privacy_policy"

    ALL = (TERMS_OF_SERVICE, PRIVACY_POLICY)
