import secrets
import os
from fastapi import APIRouter, Response, Request, HTTPException, Depends, status
from app.models import LoginRequest
from app.database import get_db, vpw, now_str
from app.auth import get_current_user, check_login_rate_limit, record_failed_login
from app.audit import audit

router = APIRouter(tags=["Auth"])

@router.post("/login")
def login(req_data: LoginRequest, request: Request, response: Response):
    emp_id = req_data.emp_id.strip()
    tries = check_login_rate_limit(emp_id)
    ip = request.client.host if request.client else ""
    
    with get_db() as c:
        u = c.execute("select * from users where emp_id=? and active=1", (emp_id,)).fetchone()
        if not u or not vpw(req_data.password, u["pw"]):
            record_failed_login(emp_id, tries)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
            
        tok = secrets.token_hex(24)
        c.execute("insert into sessions values(?,?,?,?)", (tok, u["id"], now_str(), ip))
        audit(c, dict(u), "LOGIN", None, None, None, ip)
        
        is_secure = os.environ.get("TMS_HTTPS") != "0"
        response.set_cookie(
            key="sid",
            value=tok,
            httponly=True,
            samesite="none" if is_secure else "lax",
            path="/",
            max_age=43200,
            secure=is_secure
        )
        return {"ok": 1, "token": tok, "user": {k: u[k] for k in ("id", "name", "emp_id", "role", "subdivision_id")}}

@router.post("/logout")
def logout(response: Response, user: dict = Depends(get_current_user)):
    with get_db() as c:
        c.execute("delete from sessions where user_id=?", (user["id"],))
    response.delete_cookie(key="sid", path="/")
    return {"ok": 1}

@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return {k: user[k] for k in ("id", "name", "emp_id", "role", "subdivision_id", "section_id", "division_id", "circle_id")}
