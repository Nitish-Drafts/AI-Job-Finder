"""Add job fields

Revision ID: 002_add_job_fields
Revises: 001_initial
Create Date: 2026-08-30 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_add_job_fields'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to jobs table
    op.add_column('jobs', sa.Column('source', sa.String(length=100), nullable=True))
    op.add_column('jobs', sa.Column('salary', sa.JSON(), nullable=True))
    op.add_column('jobs', sa.Column('skills', sa.JSON(), nullable=True))
    op.add_column('jobs', sa.Column('employment_type', sa.String(length=50), nullable=False, server_default='Full-time'))
    
    # Create index on source column
    op.create_index(op.f('ix_jobs_source'), 'jobs', ['source'], unique=False)


def downgrade() -> None:
    # Drop index and columns
    op.drop_index(op.f('ix_jobs_source'), table_name='jobs')
    op.drop_column('jobs', 'employment_type')
    op.drop_column('jobs', 'skills')
    op.drop_column('jobs', 'salary')
    op.drop_column('jobs', 'source')
