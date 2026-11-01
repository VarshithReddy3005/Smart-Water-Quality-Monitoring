from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Header, Security
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.core.security import verify_password
from app.models.user import User, UserRole
from app.models.device import Device
from app.schemas.auth import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")
    return user

def require_role(allowed_roles: list[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker

require_admin = require_role([UserRole.ADMINISTRATOR])
require_operator = require_role([UserRole.ADMINISTRATOR, UserRole.OPERATOR])

def verify_device_token(
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    db: Session = Depends(get_db)
) -> Optional[Device]:
    """Authenticates physical IoT hardware via X-Device-Token header."""
    if not x_device_token:
        return None
    
    devices = db.query(Device).filter(Device.api_key_hash.isnot(None)).all()
    for dev in devices:
        if verify_password(x_device_token, dev.api_key_hash):
            return dev
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Device Authentication Token")
