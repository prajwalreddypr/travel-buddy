"""initial schema

Revision ID: 20260301_0001
Revises:
Create Date: 2026-03-01 13:30:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260301_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "citystats",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("city", sa.String(), nullable=False),
        sa.Column("country", sa.String(), nullable=False),
        sa.Column("avg_accommodation_per_night", sa.Float(), nullable=False),
        sa.Column("avg_food_per_day", sa.Float(), nullable=False),
        sa.Column("avg_misc_per_day", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_citystats_city"), "citystats", ["city"], unique=False)

    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_email"), "user", ["email"], unique=True)

    op.create_table(
        "savedtrip",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("origin", sa.String(), nullable=False),
        sa.Column("destination", sa.String(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("travelers", sa.Integer(), nullable=False),
        sa.Column("transport_type", sa.String(), nullable=False),
        sa.Column("breakdown_json", sa.String(), nullable=False),
        sa.Column("total", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_savedtrip_user_id"), "savedtrip", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_savedtrip_user_id"), table_name="savedtrip")
    op.drop_table("savedtrip")
    op.drop_index(op.f("ix_user_email"), table_name="user")
    op.drop_table("user")
    op.drop_index(op.f("ix_citystats_city"), table_name="citystats")
    op.drop_table("citystats")
