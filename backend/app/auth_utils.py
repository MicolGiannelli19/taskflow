"""Password hashing.

Clerk verifies credentials now, so nothing here runs on the request path. The
one remaining caller is the seed, which hashes its demo passwords locally and
hands the digests to Clerk's user-import endpoint (`password_hasher="bcrypt"`),
so seeded accounts keep working after the migration.
"""
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
