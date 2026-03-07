"""add traveler profile fields

Revision ID: 20260305_0001
Revises: 20260303_0001
Create Date: 2026-03-05 00:00:00

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "20260305_0001"
down_revision: Union[str, None] = "20260303_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user", sa.Column("passport_nationality", sa.String(length=80), nullable=True))
    op.add_column("user", sa.Column("home_city", sa.String(length=100), nullable=True))
    op.add_column("user", sa.Column("has_schengen_visa", sa.Boolean(), nullable=True))
    op.add_column("user", sa.Column("has_us_visa", sa.Boolean(), nullable=True))
    op.add_column("user", sa.Column("travel_style", sa.String(length=20), nullable=True))
    op.add_column("user", sa.Column("budget_eur", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "budget_eur")
    op.drop_column("user", "travel_style")
    op.drop_column("user", "has_us_visa")
    op.drop_column("user", "has_schengen_visa")
    op.drop_column("user", "home_city")
    op.drop_column("user", "passport_nationality")
