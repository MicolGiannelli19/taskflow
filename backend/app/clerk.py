"""Shared Clerk Backend API client.

One client for the process. It is created lazily so importing the app (tests,
`python -m app.seed`) doesn't require a key to be configured.
"""
import logging
from functools import lru_cache

from clerk_backend_api import Clerk

from app.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_clerk() -> Clerk:
    if not settings.clerk_secret_key:
        raise RuntimeError(
            "CLERK_SECRET_KEY is not set. Run `npx clerk@latest auth login` and "
            "`npx clerk@latest env pull` to obtain keys, then put the secret key "
            "in the backend environment."
        )
    return Clerk(bearer_auth=settings.clerk_secret_key)


def clerk_is_configured() -> bool:
    return bool(settings.clerk_secret_key)
