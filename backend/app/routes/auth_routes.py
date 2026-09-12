from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime

from app.database import get_db
from app.models.models import User, PasswordResetToken, EmailVerificationToken
from app.schemas.schemas import (
    UserCreate, UserLogin, UserResponse, TokenResponse, RefreshTokenRequest,
    ForgotPasswordRequest, ResetPasswordRequest, EmailVerifyRequest
)
from app.auth.security import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    decode_token, generate_random_token, hash_token
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered."
        )

    hashed_pwd = hash_password(user_data.password)
    user = User(
        name=user_data.name.strip(),
        email=user_data.email.lower().strip(),
        password_hash=hashed_pwd,
        is_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create verification token
    raw_token = generate_random_token()
    token_rec = EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
    )
    db.add(token_rec)
    db.commit()

    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email.lower()).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh_access_token(refresh_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = decode_token(refresh_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token."
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    access_token = create_access_token(data={"sub": user.id})
    new_refresh_token = create_refresh_token(data={"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.post("/logout")
def logout():
    return {"message": "Successfully logged out."}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if user:
        raw_token = generate_random_token()
        reset_rec = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
        )
        db.add(reset_rec)
        db.commit()

    return {"message": "If an account with that email exists, password reset instructions have been created."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    h_token = hash_token(req.token)
    reset_rec = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == h_token,
        PasswordResetToken.used == False
    ).first()

    if not reset_rec:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token.")

    user = db.query(User).filter(User.id == reset_rec.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found.")

    user.password_hash = hash_password(req.new_password)
    reset_rec.used = True
    db.commit()

    return {"message": "Password has been successfully reset."}

@router.post("/verify-email")
def verify_email(req: EmailVerifyRequest, db: Session = Depends(get_db)):
    h_token = hash_token(req.token)
    token_rec = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == h_token,
        EmailVerificationToken.used == False
    ).first()

    if not token_rec:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token.")

    user = db.query(User).filter(User.id == token_rec.user_id).first()
    if user:
        user.is_verified = True
        token_rec.used = True
        db.commit()

    return {"message": "Email successfully verified."}
