"""
Home for AI — Database Connection

Async SQLAlchemy setup supporting both SQLite (development) and
PostgreSQL (production) via the DATABASE_URL environment variable.

Development:  sqlite+aiosqlite:///./home_for_ai.db
Production:   postgresql+asyncpg://user:pass@host/dbname
"""

from __future__ import annotations

import logging
import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL", "sqlite+aiosqlite:///./home_for_ai.db"
)

# SQLite-specific connect args
_connect_args: dict = {}
if DATABASE_URL.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("ENVIRONMENT", "development") == "development",
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all ORM models."""


async def init_db() -> None:
    """
    Create all database tables. Called once at startup.
    In production, prefer Alembic migrations over this.
    """
    from db.models import User, Trade, Portfolio, AgentSkillLog, CopyTradeConfig, UserSetting  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialised.")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency: yield an async database session per request.

    Usage:
        @router.get("/example")
        async def example(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
