"""
JBVNL Security Module
Provides HTTP Security Headers, Rate Limiting, Input Sanitization,
and Attack Mitigation Middleware for FastAPI Backend.
"""
import time
import re
import html
import os
from collections import defaultdict
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# In-memory IP Rate Limiter store
IP_REQUESTS = defaultdict(list)
LOGIN_ATTEMPTS = defaultdict(list)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware enforcing industry-standard security headers to prevent:
    - Clickjacking (X-Frame-Options)
    - MIME Sniffing (X-Content-Type-Options)
    - Cross-Site Scripting / XSS (X-XSS-Protection & Content-Security-Policy)
    - Information Disclosure (Server Hiding & Referrer-Policy)
    - Man-In-The-Middle Attacks (Strict-Transport-Security)
    """
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Security Headers
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        # Content Security Policy (CSP)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: blob: https:; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "connect-src 'self' http: https:;"
        )

        # Enforce HSTS when HTTPS is enabled
        if request.url.scheme == "https" or os.environ.get("TMS_HTTPS"):
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # Remove sensitive server header
        if "Server" in response.headers:
            del response.headers["Server"]

        return response


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Rate Limiting Middleware protecting against DDoS and Brute Force Attacks.
    - Global API Rate Limit: 120 requests / minute per IP
    - Sensitive Auth Limit: 10 attempts / 15 minutes per IP
    """
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()

        # Clean old timestamps (older than 60s for general, 900s for auth)
        IP_REQUESTS[client_ip] = [t for t in IP_REQUESTS[client_ip] if now - t < 60]
        
        # Check global limit (120 req / min)
        if len(IP_REQUESTS[client_ip]) > 120:
            return Response(
                content='{"detail": "Rate limit exceeded. Too many requests. Please wait a minute."}',
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                media_type="application/json"
            )
        
        IP_REQUESTS[client_ip].append(now)

        # Specific login brute-force check for /api/login
        if request.url.path == "/api/login" and request.method == "POST":
            LOGIN_ATTEMPTS[client_ip] = [t for t in LOGIN_ATTEMPTS[client_ip] if now - t < 900]
            if len(LOGIN_ATTEMPTS[client_ip]) >= 10:
                return Response(
                    content='{"detail": "Too many failed login attempts. Account locked for 15 minutes."}',
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    media_type="application/json"
                )
            LOGIN_ATTEMPTS[client_ip].append(now)

        response = await call_next(request)
        return response


def sanitize_input(text: str) -> str:
    """
    Sanitizes text inputs to prevent XSS (Cross-Site Scripting) attacks.
    Escapes HTML tags and special control characters.
    """
    if not isinstance(text, str):
        return text
    # Escape HTML special characters
    clean = html.escape(text.strip())
    # Remove script tags or dangerous javascript protocol strings
    clean = re.sub(r"(?i)<script.*?>.*?</script>", "", clean)
    clean = re.sub(r"(?i)javascript:", "", clean)
    return clean


def safe_file_path(base_dir: str, filename: str) -> str:
    """
    Prevents Path Traversal (e.g. '../../etc/passwd') attacks when reading/writing files.
    """
    # Remove directory separators
    clean_name = os.path.basename(filename)
    full_path = os.path.abspath(os.path.join(base_dir, clean_name))
    
    # Ensure target path stays strictly inside base_dir
    if not full_path.startswith(os.path.abspath(base_dir)):
        raise HTTPException(status_code=400, detail="Invalid file path detected.")
        
    return full_path
