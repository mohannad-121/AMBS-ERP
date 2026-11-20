from sqlalchemy import create_engine, pool

from alembic import context
from app.core.config import get_settings
from app.models import security  # noqa: F401
from app.models import master  # noqa: F401
from app.models import inventory  # noqa: F401
from app.models import purchasing  # noqa: F401
from app.models import sales  # noqa: F401
from app.models import routing  # noqa: F401
from app.models import packing  # noqa: F401
from app.models import import_review  # noqa: F401
from app.models import customer_import  # noqa: F401
from app.models.base import Base

# Import implemented model modules here so autogenerate sees their metadata.
target_metadata = Base.metadata

if context.is_offline_mode():
    context.configure(
        url=get_settings().database_url.render_as_string(hide_password=False),
        target_metadata=target_metadata,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()
elif context.config.attributes.get("connection") is not None:
    context.configure(
        connection=context.config.attributes["connection"],
        target_metadata=target_metadata,
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = create_engine(get_settings().database_url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()
