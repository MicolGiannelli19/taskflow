from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from app.database import get_db
from app.models import User
from app.config import settings
import os

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# Mock user ID - you can change this to match your test user
MOCK_USER_ID = "550e8400-e29b-41d4-a716-446655440000"

# Check if we're in development mode
USE_MOCK_AUTH = os.getenv("USE_MOCK_AUTH", "true").lower() == "true"

async def get_current_user(
    token: str = Depends(oauth2_scheme) if not USE_MOCK_AUTH else None,
    db: Session = Depends(get_db)
):
    """
    Get current user - uses mock user in development mode
    """
    if USE_MOCK_AUTH:
        # Development mode - return mock user
        user = db.query(User).filter(User.id == MOCK_USER_ID).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Mock user not found. Please run the setup script."
            )
        return user
    
    # Production mode - validate JWT token
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user
