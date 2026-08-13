"""add learner diagnostic status

Revision ID: 0003_learner_diagnostic_status
Revises: 0002_users_auth
Create Date: 2026-06-17
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0003_learner_diagnostic_status"
down_revision: str | None = "0002_users_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("learners", sa.Column("diagnostic_completed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("learners", sa.Column("diagnostic_completed_at", sa.DateTime(), nullable=True))
    # op.alter_column("learners", "diagnostic_completed", server_default=None)


def downgrade() -> None:
    op.drop_column("learners", "diagnostic_completed_at")
    op.drop_column("learners", "diagnostic_completed")
