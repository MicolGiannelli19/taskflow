"""Security headers on API responses (spec §5).

These assert the criteria from §5.5 that can be checked without a browser: no
`unsafe-eval`, no wildcard sources, `frame-ancestors 'none'` present. The two
criteria that need a real browser — that sign-in still works under the policy,
and that an inline `<script>` pasted into a ticket description does not run —
belong to the *page* policy in `frontend/csp.ts`, and are listed as manual
steps in `backend/docs/auth.md`.
"""
import pytest

from app.security_headers import API_CSP, DOCS_CSP, policy_for


def _directives(policy: str) -> dict[str, str]:
    parsed = {}
    for directive in policy.split(";"):
        name, _, value = directive.strip().partition(" ")
        if name:
            parsed[name] = value
    return parsed


# ─── The headers really are sent ─────────────────────────────────────────────

def test_api_responses_carry_the_security_headers(unauthenticated):
    response = unauthenticated.get("/")

    assert response.headers["content-security-policy"] == API_CSP
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert response.headers["x-frame-options"] == "DENY"


def test_error_responses_carry_them_too(unauthenticated):
    """A 401 or a 404 is still a response an attacker can reach."""
    for response in (
        unauthenticated.get("/api/boards"),            # 401
        unauthenticated.get("/nope"),                  # 404
    ):
        assert "content-security-policy" in response.headers
        assert response.headers["x-content-type-options"] == "nosniff"


def test_authenticated_responses_carry_them_too(as_user, owner):
    response = as_user(owner).get("/api/auth/me")

    assert response.headers["content-security-policy"] == API_CSP


def test_the_docs_pages_get_the_looser_policy():
    assert policy_for("/docs") == DOCS_CSP
    assert policy_for("/redoc") == DOCS_CSP
    assert policy_for("/api/boards") == API_CSP
    # A path that merely starts with /docs is not the docs page.
    assert policy_for("/docsomething") == API_CSP


# ─── What the policies must never allow (§5.5) ───────────────────────────────

@pytest.mark.parametrize("policy", [API_CSP, DOCS_CSP])
def test_no_unsafe_eval_anywhere(policy):
    assert "unsafe-eval" not in policy


@pytest.mark.parametrize("policy", [API_CSP, DOCS_CSP])
def test_no_wildcard_script_or_connect_sources(policy):
    directives = _directives(policy)
    for name in ("script-src", "connect-src", "default-src"):
        assert "*" not in directives.get(name, ""), f"{name} contains a wildcard"


@pytest.mark.parametrize("policy", [API_CSP, DOCS_CSP])
def test_nothing_may_frame_this_api(policy):
    assert _directives(policy)["frame-ancestors"] == "'none'"


def test_the_api_policy_allows_nothing_at_all(unauthenticated):
    """`default-src 'none'` is the load-bearing line — keep it that way."""
    assert _directives(API_CSP)["default-src"] == "'none'"
    assert "script-src" not in API_CSP, (
        "the API policy should not need a script-src: `default-src 'none'` "
        "already covers it, and adding one can only loosen the policy"
    )


def test_unsafe_inline_is_confined_to_the_docs_pages():
    assert "unsafe-inline" not in API_CSP
    # Swagger UI and ReDoc bootstrap with an inline script; nothing else may.
    assert "unsafe-inline" in _directives(DOCS_CSP)["script-src"]
