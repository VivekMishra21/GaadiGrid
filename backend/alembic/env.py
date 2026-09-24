from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

import app.models  # noqa: F401  (registers every table on Base.metadata)
from app.core.config import settings
from app.database.base import Base

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# The postgis/postgis Docker image ships a large set of tables owned by the postgis_tiger_geocoder
# and postgis_topology extensions (tiger geocoder lookup tables, topology.layer, etc). They live in
# the same schema as our own tables, so Alembic's autogenerate has no way to tell they're not ours —
# it will otherwise propose dropping every one of them on every `--autogenerate` run. This is a known,
# permanent characteristic of that image, not something to "fix" by migrating; we just exclude them.
_POSTGIS_EXTENSION_TABLES = {
    "spatial_ref_sys", "topology", "layer",
    "addr", "addrfeat", "bg", "county", "county_lookup", "countysub_lookup", "cousub",
    "direction_lookup", "edges", "faces", "featnames", "geocode_settings", "geocode_settings_default",
    "loader_lookuptables", "loader_platform", "loader_variables", "pagc_gaz", "pagc_lex", "pagc_rules",
    "place", "place_lookup", "secondary_unit_lookup", "state", "state_lookup", "street_type_lookup",
    "tabblock", "tabblock20", "tract", "zcta5", "zip_lookup", "zip_lookup_all", "zip_lookup_base",
    "zip_state", "zip_state_loc",
}


def include_object(object_, name, type_, reflected, compare_to):
    if type_ == "table" and reflected and name in _POSTGIS_EXTENSION_TABLES:
        return False
    return True


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, include_object=include_object)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
