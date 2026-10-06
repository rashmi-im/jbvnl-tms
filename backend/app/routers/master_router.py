# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Depends, Request
from app.models import AdminAddRequest
from app.database import get_db, sub_scope, hpw
from app.auth import get_current_user, need_roles
from app.audit import audit

router = APIRouter(prefix="/api", tags=["Master"])

ADMIN_ENT = {
    "circles": ["name"],
    "divisions": ["name", "circle_id"],
    "subdivisions": ["name", "division_id"],
    "sections": ["name", "subdivision_id"],
    "feeders": ["name", "section_id"],
    "pss": ["name", "section_id"],
    "lookups": ["kind", "value"],
    "transformers": ["code", "dtr_no", "capacity", "ttype", "section_id", "feeder_id", "pss_id", "village", "location", "active"]
}

@router.get("/master")
def master_data(user: dict = Depends(get_current_user)):
    with get_db() as c:
        g = lambda sql, p=(): [dict(r) for r in c.execute(sql, p)]
        sc, sp = sub_scope(user)
        
        data = {
            "lookups": g("select kind,value from lookups"),
            "subdivisions": g(f"select s.id,s.name,s.division_id from subdivisions s where {sc} order by name", sp),
            "sections": g("select id, name, subdivision_id from sections order by name"),
            "transformers": g(
                "select id,code,capacity,ttype,village,section_id from transformers where active=1 and (?='ADMIN' or section_id=?) order by code",
                (user["role"], user.get("section_id"))
            )
        }
        
        if user["role"] == "ADMIN":
            data["circles"] = g("select id, name from circles order by name")
            data["divisions"] = g("select id, name, circle_id from divisions order by name")
            data["aes"] = g("select id, name, emp_id, subdivision_id from users where role='AE' and active=1 order by name")
            data["users"] = g("select id, name, emp_id, role, circle_id, division_id, subdivision_id, section_id from users where active=1 order by name")
            
        return data

@router.post("/admin/{ent}")
def admin_add(ent: str, b: AdminAddRequest, request: Request, user: dict = Depends(need_roles("ADMIN"))):
    ip = request.client.host if request.client else ""
    b_dict = b.model_dump(exclude_none=True)
    with get_db() as c:
        if ent == "users":
            if b.role not in ("JE", "AE", "DIVISION", "CIRCLE", "ADMIN") or len(b.password or "") < 8:
                raise HTTPException(status_code=422, detail="Valid role and password (8+ chars) required")
            cols = ["name", "emp_id", "mobile", "email", "role", "circle_id", "division_id", "subdivision_id", "section_id", "ae_id"]
            vals = [b_dict.get(k) for k in cols] + [hpw(b.password)]
            cur = c.execute(f"insert into users({','.join(cols)},pw) values({','.join('?'*len(cols))},?)", vals)
        elif ent in ADMIN_ENT:
            cols = [k for k in ADMIN_ENT[ent] if k in b_dict]
            cur = c.execute(f"insert into {ent}({','.join(cols)}) values({','.join('?'*len(cols))})", [b_dict[k] for k in cols])
        else:
            raise HTTPException(status_code=404, detail="Unknown entity")
            
        audit(c, user, "MASTER_ADD", f"{ent}:{cur.lastrowid}", None, {k: v for k, v in b_dict.items() if k != "password"}, ip)
        return {"id": cur.lastrowid}
