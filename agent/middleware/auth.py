"""
Authentication middleware for FastAPI backend.

Provides JWT token verification using Supabase auth.
"""

from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..lib.supabase_client import get_supabase_client


security = HTTPBearer(auto_error=False)


async def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify a JWT token from Supabase.

    Args:
        token: JWT token string from Authorization header

    Returns:
        Dict containing user data from the token

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        supabase = get_supabase_client()

        # Verify the token with Supabase auth
        response = supabase.auth.get_user(token)

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {
            "id": response.user.id,
            "email": response.user.email,
            "user_metadata": response.user.user_metadata,
        }

    except Exception as e:
        # Handle Supabase auth errors
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_user_from_token(token: str) -> Dict[str, Any]:
    """
    Get user data including profile from a JWT token.

    Args:
        token: JWT token string from Authorization header

    Returns:
        Dict containing:
            - id: User UUID
            - email: User email
            - role: User role from profiles table ('student' or 'teacher')
            - display_name: Display name from profile
            - avatar_url: Avatar URL from profile

    Raises:
        HTTPException: If token is invalid, expired, or profile not found
    """
    # First verify the token
    user_data = await verify_token(token)
    user_id = user_data["id"]

    try:
        supabase = get_supabase_client()

        # Fetch profile data (service role bypasses RLS)
        response = supabase.table("profiles").select("*").eq("id", user_id).execute()

        if not response.data or len(response.data) == 0:
            # Profile doesn't exist yet - return basic user data with default role
            return {
                "id": user_id,
                "email": user_data["email"],
                "role": "student",  # Default role
                "display_name": None,
                "avatar_url": None,
            }

        profile = response.data[0]

        return {
            "id": user_id,
            "email": user_data["email"],
            "role": profile.get("role", "student"),
            "display_name": profile.get("display_name"),
            "avatar_url": profile.get("avatar_url"),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user profile: {str(e)}",
        )


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
