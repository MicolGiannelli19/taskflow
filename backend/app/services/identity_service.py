"""Mapping Clerk accounts onto TaskFlow users.

Clerk is the authority on *who is signing in*; the `users` table stays the
authority on *who they are inside TaskFlow*. Boards, memberships, tickets and
comments all reference `users.id`, so every Clerk account needs exactly one
local row behind it.

`user_identities` is the join, using the `(provider, provider_id)` pair the
table was designed around: `provider='clerk'`, `provider_id=<clerk user id>`.
"""
import logging

from clerk_backend_api import Clerk
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import User, UserIdentity
from app.core.exceptions import UnauthorizedError

logger = logging.getLogger(__name__)

CLERK_PROVIDER = "clerk"


def _primary_email(clerk_user) -> str | None:
    """The address Clerk treats as primary, falling back to the first one."""
    addresses = clerk_user.email_addresses or []
    if not addresses:
        return None
    for address in addresses:
        if address.id == clerk_user.primary_email_address_id:
            return address.email_address
    return addresses[0].email_address


def _display_name(clerk_user) -> str | None:
    parts = [clerk_user.first_name, clerk_user.last_name]
    name = " ".join(p for p in parts if p)
    return name or None


class IdentityService:
    """Resolves a verified Clerk user ID to the local `User` behind it."""

    def __init__(self, db: Session, clerk: Clerk | None = None):
        """``clerk`` is only needed by ``resolve()``.

        The webhook path already has the profile in the signed payload, so it
        constructs this service without a client — and cannot accidentally make
        a network call while handling a delivery.
        """
        self.db = db
        self.clerk = clerk

    def resolve(self, clerk_user_id: str) -> User:
        """Return the TaskFlow user for a Clerk account, provisioning if new.

        The common case is a single indexed lookup with no network call — the
        Clerk API is only consulted the first time an account is seen.
        """
        user = self._linked_user(clerk_user_id)
        if user is not None:
            return user
        if self.clerk is None:
            raise RuntimeError("IdentityService.resolve() needs a Clerk client")
        return self._provision(clerk_user_id)

    def sync_profile(self, clerk_user_id: str, *, name: str | None,
                     avatar: str | None) -> User | None:
        """Refresh the local copy of a Clerk-owned profile field.

        Called by the `user.updated` webhook, and *only* from there. The
        difference from ``_provision``'s fill-the-blanks rule is deliberate:
        provisioning must not clobber a name the user set in TaskFlow, but an
        update event means they just changed it in Clerk, so Clerk wins.

        An empty incoming value is ignored rather than written — Clerk sending
        no name should not blank out a name other members can see.

        Returns ``None`` if the Clerk account is not linked here yet, which is
        normal: events arrive for accounts that have never called this API.
        """
        user = self._linked_user(clerk_user_id)
        if user is None:
            logger.info("Ignoring profile update for unlinked Clerk account %s", clerk_user_id)
            return None

        if name:
            user.name = name
        if avatar:
            user.avatar = avatar

        self.db.commit()
        self.db.refresh(user)
        logger.info("Synced profile for user %s from Clerk account %s", user.id, clerk_user_id)
        return user

    def unlink(self, clerk_user_id: str) -> bool:
        """Drop the Clerk link, keeping the TaskFlow profile.

        What `user.deleted` does here (spec §12, question 1). Deleting the
        `users` row would cascade through `tickets.creator_id` and
        `comments.user_id` and erase the person's contributions from boards
        other people still use. Removing only the `user_identities` row ends
        their access — nothing can authenticate to that profile any more —
        while authorship survives.

        Returns whether a link was actually removed, so a replayed event is a
        visible no-op rather than an error.
        """
        identity = (
            self.db.query(UserIdentity)
            .filter(
                UserIdentity.provider == CLERK_PROVIDER,
                UserIdentity.provider_id == clerk_user_id,
            )
            .first()
        )
        if identity is None:
            logger.info("No link to remove for Clerk account %s", clerk_user_id)
            return False

        user_id = identity.user_id
        self.db.delete(identity)
        self.db.commit()
        logger.info(
            "Unlinked Clerk account %s; TaskFlow user %s kept for authorship",
            clerk_user_id, user_id,
        )
        return True

    def _linked_user(self, clerk_user_id: str) -> User | None:
        identity = (
            self.db.query(UserIdentity)
            .filter(
                UserIdentity.provider == CLERK_PROVIDER,
                UserIdentity.provider_id == clerk_user_id,
            )
            .first()
        )
        return identity.user if identity else None

    def _provision(self, clerk_user_id: str) -> User:
        """First sight of a Clerk account: link it to a local user row.

        An existing row with the same email is adopted rather than duplicated.
        That is what carries seeded accounts across the migration — the demo
        board's owner keeps their boards, memberships and comment history when
        they first sign in through Clerk.
        """
        clerk_user = self.clerk.users.get(user_id=clerk_user_id)
        email = _primary_email(clerk_user)
        if not email:
            logger.error("Clerk user %s has no email address", clerk_user_id)
            raise UnauthorizedError("Your account has no email address")

        user = self.db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(
                email=email,
                name=_display_name(clerk_user),
                avatar=clerk_user.image_url,
            )
            self.db.add(user)
            self.db.flush()
            logger.info("Provisioned user %s for Clerk account %s", user.id, clerk_user_id)
        else:
            # Adopting a pre-Clerk row. Only fill blanks — a name the user set
            # in TaskFlow shouldn't be overwritten by a Clerk default.
            user.name = user.name or _display_name(clerk_user)
            user.avatar = user.avatar or clerk_user.image_url
            logger.info("Linked Clerk account %s to existing user %s", clerk_user_id, user.id)

        self.db.add(
            UserIdentity(
                user_id=user.id,
                provider=CLERK_PROVIDER,
                provider_id=clerk_user_id,
            )
        )

        try:
            self.db.commit()
        except IntegrityError:
            # Two first requests raced. The unique constraint on
            # (provider, provider_id) means the other one won; use its row.
            self.db.rollback()
            existing = self._linked_user(clerk_user_id)
            if existing is None:
                raise
            logger.info("Lost provisioning race for %s, using existing row", clerk_user_id)
            return existing

        self.db.refresh(user)
        return user
