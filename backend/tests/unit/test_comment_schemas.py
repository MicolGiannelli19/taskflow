"""Comment bodies: trimmed, never empty, never enormous.

`comments.content` is TEXT, so the schema is the only length limit there is.
The rule lives in a private helper, but it is tested through the two public
models — that is what a request actually hits, and it means renaming the helper
can't break these tests.
"""
import pytest
from pydantic import ValidationError

from app.schemas import CommentCreate, CommentUpdate
from app.schemas.comment import COMMENT_MAX_LENGTH

# Creating and editing a comment must follow the same rules.
COMMENT_MODELS = [CommentCreate, CommentUpdate]


@pytest.mark.parametrize("model", COMMENT_MODELS)
def test_content_is_trimmed(model):
    assert model(content="  Looks good  \n").content == "Looks good"


@pytest.mark.parametrize("model", COMMENT_MODELS)
@pytest.mark.parametrize("content", ["", "   ", "\n\t "])
def test_blank_content_is_rejected(model, content):
    with pytest.raises(ValidationError):
        model(content=content)


@pytest.mark.parametrize("model", COMMENT_MODELS)
def test_content_at_the_limit_is_accepted(model):
    # Boundary values: test *at* the limit and one past it, where off-by-one
    # mistakes (`<` vs `<=`) live.
    assert len(model(content="x" * COMMENT_MAX_LENGTH).content) == COMMENT_MAX_LENGTH


@pytest.mark.parametrize("model", COMMENT_MODELS)
def test_content_one_past_the_limit_is_rejected(model):
    with pytest.raises(ValidationError):
        model(content="x" * (COMMENT_MAX_LENGTH + 1))


@pytest.mark.parametrize("model", COMMENT_MODELS)
def test_surrounding_whitespace_does_not_count_towards_the_limit(model):
    content = "  " + "x" * COMMENT_MAX_LENGTH + "  "

    assert len(model(content=content).content) == COMMENT_MAX_LENGTH
