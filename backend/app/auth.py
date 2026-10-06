import time
import re
import secrets
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, Depends, status
from app.database import get_db, parse_dt, vpw, hpw, now_str

FAILS_LOG = {}

def check_login_rate_limit(emp_id: str):
    tries = [t for t in FAILS_LOG.get(emp_id, []) if time.time() - t < 900]
    if len(tries) >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Try again in 15 minutes."
        )
    return tries

def record_failed_login(emp_id: str, tries: list):
    FAILS_LOG[emp_id] = tries + [time.time()]

def get_current_user(request: Request):
    sid = request.cookies.get("sid")
    if not sid:
        # Check Authorization header as fallback
        auth_hdr = request.headers.get("Authorization", "")
        if auth_hdr.startswith("Bearer "):
            sid = auth_hdr.split(" ", 1)[1]
            
    if not sid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login required")
        
    with get_db() as c:
        row = c.execute(
            "select u.*, s.created from sessions s join users u on u.id=s.user_id where token=? and u.active=1",
            (sid,)
        ).fetchone()
        
        if not row or (datetime.now() - parse_dt(row["created"])) > timedelta(hours=12):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid")
            
        return dict(row)

def need_roles(*allowed_roles):
    def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: your role ({user['role']}) cannot perform this action"
            )
        return user
    return role_checker
