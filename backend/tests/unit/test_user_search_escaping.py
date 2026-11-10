"""LIKE escaping for the user search.

`UserService.search` wraps the query in `%…%` and hands it to `ILIKE`. In a
LIKE pattern `%` means "anything" and `_` means "any one character", so an
unescaped search for `%` would match — and list — every user. This is the
search box's equivalent of injection: user input being read as pattern syntax.

The helper is private, but it is tested directly: its job is a small set of
character rules, and pinning each one here is far cheaper than proving them
through a database query. Whether ILIKE *honours* the escapes is a question for
the service-layer tests.
"""
import pytest

from app.services.user_service import _escape_like


@pytest.mark.parametrize(
    "raw,escaped",
    [
        ("alice", "alice"),
        ("%", r"\%"),
        ("_", r"\_"),
        ("100%_done", r"100\%\_done"),
    ],
)
def test_wildcards_are_escaped(raw, escaped):
    assert _escape_like(raw) == escaped


def test_the_escape_character_itself_is_escaped_first():
    r"""A literal backslash becomes `\\`, and is not doubled again afterwards.

    Order matters: escaping `%` first and backslashes second would turn `\%`
    into `\\%` — an escaped backslash followed by a live wildcard.
    """
    assert _escape_like("a\\b") == r"a\\b"
    assert _escape_like("\\%") == r"\\\%"
