from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _split_origins(value):
    """Accept `a, b` as well as `["a", "b"]` for list-valued settings.

    Deployment platforms hand you plain strings, and a comma-separated list is
    far easier to get right in a dashboard field than JSON.
    """
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("["):
            return value  # leave JSON for pydantic to parse
        return [part.strip() for part in stripped.split(",") if part.strip()]
    return value


class Settings(BaseSettings):
    database_url: str = "postgresql://user:password@localhost/taskflow_db"
    seed_on_startup: bool = True
    # Password the demo users are created with in Clerk. Deliberately not a
    # literal in the code: the repo is public, and a committed password is a
    # leaked one. Unset means the demo users get no Clerk account (see seed.py).
    seed_password: str = ""

    # Clerk owns authentication. The secret key verifies session tokens and
    # calls the Clerk Backend API; it must never reach the browser.
    clerk_secret_key: str = ""
    # Origins allowed to present a token to this API. Clerk checks the token's
    # `azp` claim against this, which is what stops a token minted for another
    # site being replayed here.
    #
    # The default is local development only. Deploying means setting
    # CLERK_AUTHORIZED_PARTIES to the production frontend origin — and never to
    # `*`, which would throw the replay protection away (spec §6.1).
    clerk_authorized_parties: list[str] = ["http://localhost:5173"]

    # Shared secret Clerk signs webhook bodies with (Svix). Without it the
    # webhook endpoint refuses every delivery, which is the safe default: an
    # unverified webhook is an open write endpoint onto the `users` table.
    clerk_webhook_signing_secret: str = ""

    # Browser origins allowed to call this API. Same story as the `azp` list:
    # environment-driven, so deploying is configuration rather than a code edit.
    cors_allowed_origins: list[str] = ["http://localhost:5173"]

    @field_validator("clerk_authorized_parties", "cors_allowed_origins", mode="before")
    @classmethod
    def _allow_comma_separated(cls, value):
        return _split_origins(value)

    # `extra="ignore"` because the shared .env carries keys this service doesn't
    # read (frontend and tooling settings). Without it, pydantic-settings
    # rejects the whole file and the app won't start outside Docker.
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")


settings = Settings()
