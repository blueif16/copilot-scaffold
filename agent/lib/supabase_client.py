"""
Supabase client for FastAPI backend.

Uses service role key for elevated permissions (bypasses RLS).
NEVER expose this client to frontend code.
"""

import os
from typing import Optional
from supabase import Client, create_client


def get_supabase_client() -> Client:
    """
    Create and return a Supabase client using the service role key.

    The service role key bypasses Row Level Security (RLS) policies,
    allowing the backend to perform administrative operations.

    Returns:
        Client: Configured Supabase client with service role permissions

    Raises:
        ValueError: If required environment variables are not set
    """
    url: Optional[str] = os.environ.get("SUPABASE_URL")
    service_role_key: Optional[str] = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url:
        raise ValueError(
            "SUPABASE_URL environment variable is not set. "
            "Please configure it in your .env file."
        )

    if not service_role_key:
        raise ValueError(
            "SUPABASE_SERVICE_ROLE_KEY environment variable is not set. "
            "Please configure it in your .env file. "
            "WARNING: Never use the anon key for backend operations."
        )

    return create_client(url, service_role_key)
