"""Auth routes — register / login (OAuth2 password flow) / me / refresh / logout.

Bootstrap rule: the very first registered user becomes `admin`, the rest
`viewer`. Set a strong `SECRET_KEY` in production.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    revoke_user_tokens,
    rotate_refresh_token,
    verify_password,
)
from app.database import get_db
from app.models.user import User

router = APIRouter()


class RegisterBody(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshBody(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool


@router.post("/auth/register", response_model=UserOut, status_code=201)
def register(body: RegisterBody, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    role = "admin" if db.query(User).count() == 0 else "viewer"
    user = User(username=body.username, hashed_password=hash_password(body.password), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut(id=user.id, username=user.username, role=user.role, is_active=user.is_active)


@router.post("/auth/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is disabled")
    return TokenOut(
        access_token=create_access_token(user.username),
        refresh_token=create_refresh_token(user.username, db),
    )


@router.post("/auth/refresh", response_model=TokenOut)
def refresh(body: RefreshBody, db: Session = Depends(get_db)):
    access, new_refresh = rotate_refresh_token(body.refresh_token, db)
    return TokenOut(access_token=access, refresh_token=new_refresh)


@router.post("/auth/logout")
def logout(body: RefreshBody, db: Session = Depends(get_db)):
    from jose import JWTError, jwt

    from app.core.config import get_settings

    try:
        username = jwt.decode(
            body.refresh_token,
            get_settings().secret_key,
            algorithms=[get_settings().auth_algorithm],
        ).get("sub")
    except JWTError:
        username = None
    if username:
        revoke_user_tokens(username, db)
    return {"status": "logged out"}


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(id=user.id, username=user.username, role=user.role, is_active=user.is_active)
