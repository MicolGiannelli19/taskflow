"""Settings read from the environment.

The origin lists decide who may present a token (`azp`) and who may call the
API from a browser (CORS). They arrive as plain strings from a deployment
dashboard, so the parsing is tested from the environment variable inward — the
way the server actually receives them.

``Settings(_env_file=None)`` builds a fresh instance that ignores the root
``.env``, so a developer's local file can't change what these tests see;
``monkeypatch.setenv`` sets a variable for one test and restores it afterwards.
"""
import pytest

from app.core.config import Settings, _split_origins

ORIGIN_FIELDS = [
    ("CORS_ALLOWED_ORIGINS", "cors_allowed_origins"),
    ("CLERK_AUTHORIZED_PARTIES", "clerk_authorized_parties"),
]


@pytest.fixture
def settings_from_env(monkeypatch):
    """Build Settings as if the process had been started with ``env`` set."""
    for env_var, _ in ORIGIN_FIELDS:
        monkeypatch.delenv(env_var, raising=False)

    def _build(**env: str) -> Settings:
        for key, value in env.items():
            monkeypatch.setenv(key, value)
        return Settings(_env_file=None)

    return _build


# ─── Through the environment ─────────────────────────────────────────────────

@pytest.mark.parametrize("env_var,field", ORIGIN_FIELDS)
def test_unset_defaults_to_the_local_frontend(settings_from_env, env_var, field):
    assert getattr(settings_from_env(), field) == ["http://localhost:5173"]


@pytest.mark.parametrize("env_var,field", ORIGIN_FIELDS)
def test_a_single_origin(settings_from_env, env_var, field):
    # The form `.env.template` suggests for a deployment.
    settings = settings_from_env(**{env_var: "https://taskflow.example"})

    assert getattr(settings, field) == ["https://taskflow.example"]


@pytest.mark.parametrize("env_var,field", ORIGIN_FIELDS)
def test_a_comma_separated_list(settings_from_env, env_var, field):
    settings = settings_from_env(**{env_var: "https://a.example, https://b.example"})

    assert getattr(settings, field) == ["https://a.example", "https://b.example"]


@pytest.mark.parametrize("env_var,field", ORIGIN_FIELDS)
def test_a_json_list(settings_from_env, env_var, field):
    settings = settings_from_env(**{env_var: '["https://a.example", "https://b.example"]'})

    assert getattr(settings, field) == ["https://a.example", "https://b.example"]


# ─── The parser on its own ───────────────────────────────────────────────────

@pytest.mark.parametrize(
    "raw,expected",
    [
        ("https://a.example", ["https://a.example"]),
        ("https://a.example,https://b.example", ["https://a.example", "https://b.example"]),
        # Dashboard-typing slop: spaces, a trailing comma, an empty entry.
        ("  https://a.example ,, https://b.example , ", ["https://a.example", "https://b.example"]),
        ("", []),
    ],
)
def test_split_origins(raw, expected):
    assert _split_origins(raw) == expected


def test_split_origins_leaves_a_list_alone():
    # Settings built in code (e.g. a test) pass a real list straight through.
    assert _split_origins(["https://a.example"]) == ["https://a.example"]
