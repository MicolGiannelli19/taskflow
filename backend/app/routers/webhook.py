"""Clerk webhooks.

This route is unlike every other one in the app, and the difference is worth
being explicit about:

- It is **publicly reachable** and does **not** use `get_current_user`. Clerk is
  not a signed-in user; there is no session token on a webhook delivery.
- Its authentication *is* the **signature on the request body**. Clerk signs
  deliveries with Svix (`svix-id`, `svix-timestamp`, `svix-signature`). An
  endpoint that writes to `users` without checking that signature is an open
  write endpoint — anyone who learns the URL could rename anybody. Verification
  is not a nice-to-have here; it is the whole security model.
- The signature covers the **exact bytes** of the body, so the raw body is read
  and verified *before* anything parses it.

Why it exists: Clerk owns name and avatar, and `IdentityService` copies them
only on first sight of an account. Without this, a user who renames themselves
in `<UserProfile />` keeps the old name everywhere other members look.
"""
import json
import logging

from fastapi import APIRouter, Depends, Header, Request, Response
from sqlalchemy.orm import Session
from svix.webhooks import Webhook, WebhookVerificationError

from app.core.config import settings
from app.database import get_db
from app.services import IdentityService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

# Events we act on. Everything else Clerk sends is acknowledged and ignored —
# including `user.created`: `IdentityService` already provisions lazily on the
# account's first authenticated request, so handling it here would only make a
# user exist locally slightly earlier, at the cost of a second code path that
# can create rows (spec §12, question 2).
HANDLED = {"user.updated", "user.deleted"}


async def raw_body(request: Request) -> bytes:
    """The unmodified request body.

    An async dependency feeding a sync endpoint: the body is awaited on the
    event loop, then the handler's database work runs in the threadpool, the
    same as every other route in this app.
    """
    return await request.body()


def _display_name(data: dict) -> str | None:
    parts = [data.get("first_name"), data.get("last_name")]
    return " ".join(p for p in parts if p) or None


@router.post("/clerk", include_in_schema=False)
def clerk_webhook(
    body: bytes = Depends(raw_body),
    svix_id: str = Header(default=""),
    svix_timestamp: str = Header(default=""),
    svix_signature: str = Header(default=""),
    db: Session = Depends(get_db),
) -> Response:
    """Receive a Clerk event and apply it to the local `users` row."""
    if not settings.clerk_webhook_signing_secret:
        # Fail closed. Accepting unverified deliveries because the secret is
        # missing would be strictly worse than rejecting them: a 503 makes
        # Clerk retry, and the misconfiguration shows up in the logs.
        logger.error(
            "CLERK_WEBHOOK_SIGNING_SECRET is not set; refusing webhook delivery"
        )
        return Response(status_code=503)

    try:
        Webhook(settings.clerk_webhook_signing_secret).verify(
            body,
            {
                "svix-id": svix_id,
                "svix-timestamp": svix_timestamp,
                "svix-signature": svix_signature,
            },
        )
    except WebhookVerificationError as exc:
        # Nothing has been parsed or written at this point, and nothing will be.
        logger.warning("Rejected webhook %s: %s", svix_id or "<no id>", exc)
        return Response(status_code=400)
    except Exception as exc:
        # A malformed header never reaches the signature comparison: svix
        # base64-decodes it first, and raises `binascii.Error` on garbage.
        # Anything that is not a clean verification is a rejection, so the
        # catch is deliberately broad — the alternative is a 500 (and a stack
        # trace in the logs) for anyone who posts nonsense at this URL.
        logger.warning(
            "Rejected malformed webhook %s: %s: %s",
            svix_id or "<no id>", type(exc).__name__, exc,
        )
        return Response(status_code=400)

    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        # Signed but not JSON: a 400 tells Clerk not to keep retrying it.
        logger.warning("Webhook %s carried a signed but unparseable body", svix_id)
        return Response(status_code=400)

    event_type = event.get("type")
    data = event.get("data") or {}
    clerk_user_id = data.get("id")

    if event_type not in HANDLED or not clerk_user_id:
        # 2xx: acknowledged and deliberately ignored. A non-2xx would put Clerk
        # into a retry loop over an event we are never going to act on.
        logger.debug("Ignoring webhook event %s (%s)", event_type, svix_id)
        return Response(status_code=204)

    identities = IdentityService(db)

    # Both branches are idempotent, which is what makes at-least-once delivery
    # safe: the update writes the event's own state rather than a delta, and
    # unlinking something already unlinked is a no-op.
    if event_type == "user.updated":
        # Name and avatar only. Email is deliberately not synced: it is unique
        # in `users` and is the key `_provision` adopts rows by, so writing it
        # from an event can collide with another row. Changing a primary email
        # in Clerk therefore still leaves the local address stale — a known
        # limitation, recorded in `docs/backend/auth.md`.
        identities.sync_profile(
            clerk_user_id,
            name=_display_name(data),
            avatar=data.get("image_url"),
        )
    elif event_type == "user.deleted":
        identities.unlink(clerk_user_id)

    logger.info("Applied %s for Clerk account %s (%s)", event_type, clerk_user_id, svix_id)
    return Response(status_code=204)
