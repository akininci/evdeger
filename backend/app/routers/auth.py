"""
EvDeğer — Kimlik Doğrulama API Endpoint'leri
Kullanıcı kaydı, giriş ve JWT token yönetimi.
"""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import User

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/auth", tags=["Kimlik Doğrulama"])

# Şifre hash'leme
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# --- Request/Response Modelleri ---

class RegisterRequest(BaseModel):
    """Kayıt isteği."""
    email: EmailStr
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    """Giriş isteği."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT token yanıtı."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"


class UserResponse(BaseModel):
    """Kullanıcı bilgi yanıtı."""
    id: int
    email: str
    name: str | None = None
    created_at: datetime
    search_count: int


# --- Yardımcı Fonksiyonlar ---

def _hash_password(password: str) -> str:
    """Şifreyi bcrypt ile hash'ler."""
    return pwd_context.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    """Şifreyi doğrular."""
    return pwd_context.verify(plain, hashed)


def _create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """JWT access token oluşturur."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# --- Endpoint'ler ---

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Kullanıcı Kaydı",
    description="""
    Yeni kullanıcı kaydı oluşturur.
    
    **Kurallar:**
    - Email benzersiz olmalı
    - Şifre en az 6 karakter
    - Başarılı kayıtta JWT token döner
    """,
)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Yeni kullanıcı kaydı — email + şifre ile."""

    # Şifre validasyonu
    if len(request.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Şifre en az 6 karakter olmalıdır.",
        )

    # Email kontrolü
    stmt = select(User).where(func.lower(User.email) == request.email.lower())
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu email adresi zaten kayıtlı.",
        )

    # Kullanıcı oluştur
    user = User(
        email=request.email.lower(),
        hashed_password=_hash_password(request.password),
        name=request.name,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Token oluştur
    token = _create_access_token({"sub": str(user.id), "email": user.email})
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    logger.info(f"Yeni kullanıcı kaydı: {user.email} (ID: {user.id})")

    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            created_at=user.created_at,
            search_count=user.search_count,
        ),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Kullanıcı Girişi",
    description="Email ve şifre ile giriş yapar. Başarılıysa JWT token döner.",
)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Kullanıcı girişi — email + şifre doğrulaması."""

    # Kullanıcıyı bul
    stmt = select(User).where(func.lower(User.email) == request.email.lower())
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not _verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email veya şifre hatalı.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesabınız devre dışı bırakılmış.",
        )

    # Son giriş güncelle
    user.last_login = datetime.now(timezone.utc)
    await db.flush()

    # Token oluştur
    token = _create_access_token({"sub": str(user.id), "email": user.email})
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    logger.info(f"Kullanıcı girişi: {user.email}")

    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            created_at=user.created_at,
            search_count=user.search_count,
        ),
    )
