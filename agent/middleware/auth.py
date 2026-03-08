"""
Authentication middleware for FastAPI backend.

Provides JWT token verification using local PyJWT verification.
"""

import os
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from ..lib.supabase_client import get_supabase_client


security = HTTPBearer(auto_error=False)


async def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify a JWT token from Supabase using local JWT verification.

    Args:
        token: JWT token string from Authorization header

    Returns:
        Dict containing user data from the token

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        # Get JWT secret from environment
        jwt_secret = os.environ.get("JWT_SECRET")
        if not jwt_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="JWT_SECRET not configured",
            )

        # Verify and decode the token locally
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_aud": True}
        )

        # Extract user data from JWT payload
        user_id = payload.get("sub")
        email = payload.get("email")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {
            "id": user_id,
            "email": email,
            "user_metadata": payload.get("user_metadata", {}),
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_user_from_token(token: str) -> Dict[str, Any]:
    """
    Get user data from a JWT token.

    Args:
        token: JWT token string from Authorization header

    Returns:
        Dict containing:
            - id: User UUID
            - email: User email
            - role: User role (default 'student')

    Raises:
        HTTPException: If token is invalid or expired
    """
    # Verify the token and extract user data
    user_data = await verify_token(token)

    # Return user data from JWT payload
    # Role defaults to 'student' - can be extended to fetch from database if needed
    return {
        "id": user_data["id"],
        "email": user_data["email"],
        "role": "student",  # Default role from JWT
    }


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency for optional authentication.

    Use this as a dependency in route handlers to get the current user.
    Returns None if no token is provided (allows unauthenticated access).

    Example:
        @app.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            if not user:
                raise HTTPException(status_code=401, detail="Authentication required")
            return {"user_id": user["id"], "role": user["role"]}

    Args:
        credentials: HTTP Bearer token from Authorization header

    Returns:
        User data dict if authenticated, None if no token provided

    Raises:
        HTTPException: If token is provided but invalid
    """
    if not credentials:
        return None

    return await get_user_from_token(credentials.credentials)
