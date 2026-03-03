"""add user profile fields

Revision ID: 20260303_0001
Revises: 20260301_0001
Create Date: 2026-03-03 00:00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260303_0001"
down_revision: Union[str, None] = "20260301_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user", sa.Column("full_name", sa.String(length=120), nullable=True))
    op.add_column("user", sa.Column("phone", sa.String(length=30), nullable=True))
    op.add_column("user", sa.Column("address", sa.String(length=300), nullable=True))
    op.add_column("user", sa.Column("countries_visited", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "countries_visited")
    op.drop_column("user", "address")
    op.drop_column("user", "phone")
    op.drop_column("user", "full_name")
