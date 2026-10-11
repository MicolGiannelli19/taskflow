import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import board, ticket, member, column, user, webhook
from app.database import Base, engine
from app.seed import seed
from app.core.config import settings
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.exceptions import NotFoundError, ConflictError, ValidationError, ForbiddenError, UnauthorizedError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create any missing tables from the ORM models (models are the source of truth).
    Base.metadata.create_all(bind=engine)
    if settings.seed_on_startup:
        seed()
    yield


app = FastAPI(title="taskflow API", version="1.0.0", lifespan=lifespan)

# Security response headers (CSP, nosniff, referrer policy). Added first so it
# wraps outermost: CORS rejections and error responses get the headers too.
# The policy that protects the *app page* is not here — it ships with the HTML,
# which this API does not serve. See `app/core/security_headers.py`.
app.add_middleware(SecurityHeadersMiddleware)

# CORS middleware. Origins come from the environment so deploying does not mean
# editing this file (spec §6.1); the default is the local frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(board.router)
app.include_router(ticket.router)
app.include_router(member.router)
app.include_router(column.router)
app.include_router(user.router)
# Publicly reachable by design — authenticated by its Svix signature, not by
# a session token. See app/routers/webhook.py.
app.include_router(webhook.router)

# TODO: check the  Exeption handlers shoudl be set up here 
@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return JSONResponse(
        status_code=404,
        content={"error": "Not Found", "detail": exc.detail},
    )


@app.exception_handler(ConflictError)
async def conflict_handler(request: Request, exc: ConflictError):
    return JSONResponse(
        status_code=409,
        content={"error": "Conflict", "detail": exc.detail},
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": "Validation Error", "detail": exc.detail},
    )


@app.exception_handler(ForbiddenError)
async def forbidden_handler(request: Request, exc: ForbiddenError):
    return JSONResponse(
        status_code=403,
        content={"error": "Forbidden", "detail": exc.detail},
    )


@app.exception_handler(UnauthorizedError)
async def unauthorized_handler(request: Request, exc: UnauthorizedError):
    return JSONResponse(
        status_code=401,
        content={"error": "Unauthorized", "detail": exc.detail},
        headers={"WWW-Authenticate": "Bearer"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        exc,
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": "An unexpected error occurred."},
    )


@app.get("/")
def root():
    return {"message": "taskflow API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
