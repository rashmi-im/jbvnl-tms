import re
import os
import secrets
import base64
import sqlite3
from typing import Optional
from datetime import datetime
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Request, HTTPException, Depends, Query
# pyrefly: ignore [missing-import]
from fastapi.responses import FileResponse
from app.models import FailureCreateRequest, FailureUpdateRequest, ReviewRequest, DelayUpdateRequest, ReplacementRequest
from app.database import get_db, f_scope, tstatus, parse_dt, now_str
from app.auth import get_current_user, need_roles
from app.audit import audit, notify
from app.config import UPLOADS_DIR

router = APIRouter(prefix="/api", tags=["Failures"])

EDIT_FIELDS = ["failed_at", "village", "capacity", "ttype", "failure_type", "consumers", "replacement_required", "lat", "lng", "remarks"]
REPLACEMENT_FIELDS = ["repl_at", "new_dtr", "new_cap", "old_status", "repl_remarks", "restoration"]

BASE_QUERY = """select f.*, t.code tcode, s.name subdivision, sc.name section, fd.name feeder, p.name pss, j.name je, a.name ae
 from failures f join transformers t on t.id=f.transformer_id join subdivisions s on s.id=f.subdivision_id
 join sections sc on sc.id=f.section_id left join feeders fd on fd.id=f.feeder_id left join pss p on p.id=f.pss_id
 join users j on j.id=f.je_id left join users a on a.id=f.ae_id where """

def save_photo(data: str) -> str:
    m = re.match(r"^data:image/(jpeg|png);base64,(.+)$", data or "", re.S)
    if not m:
        raise HTTPException(status_code=422, detail="Photo must be a JPEG or PNG image")
    raw = base64.b64decode(m.group(2))
    if len(raw) > 6_000_000:
        raise HTTPException(status_code=422, detail="Photo too large (max 6 MB)")
    if not (raw[:3] == b"\xff\xd8\xff" or raw[:8] == b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(status_code=422, detail="Invalid image file format")
    name = secrets.token_hex(16) + (".jpg" if m.group(1) == "jpeg" else ".png")
    with open(os.path.join(UPLOADS_DIR, name), "wb") as f:
        f.write(raw)
    return name

def fetch(c, u: dict, extra="1=1", ep=()):
    sc, sp = f_scope(u)
    out = []
    for r in c.execute(BASE_QUERY + f"({sc}) and ({extra}) order by f.failed_at desc", [*sp, *ep]):
        d = dict(r)
        d["transformer_status"] = tstatus(d)
        d["hours"] = round((datetime.now() - parse_dt(d["failed_at"])).total_seconds() / 3600, 1)
        out.append(d)
    return out

def one(c, u: dict, fid: int):
    r = fetch(c, u, "f.id=?", (fid,))
    if not r:
        raise HTTPException(status_code=404, detail="Record not found or access denied")
    return r[0]

def lookup_ok(c, kind: str, v: str):
    if not c.execute("select 1 from lookups where kind=? and value=?", (kind, v)).fetchone():
        raise HTTPException(status_code=422, detail=f"Invalid {kind}: {v}")

@router.get("/failures")
def list_failures(
    q: Optional[str] = None,
    wf: Optional[str] = None,
    ts: Optional[str] = None,
    sub: Optional[str] = None,
    repl: Optional[str] = None,
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    user: dict = Depends(get_current_user),
):
    with get_db() as c:
        rows = fetch(c, user)
        s_query = (q or "").lower().strip()
        out = []
        for r in rows:
            if s_query and s_query not in " ".join(str(r.get(k) or "") for k in ("tcode", "rec_id", "village", "feeder", "pss", "new_dtr")).lower():
                continue
            if wf and r["wf_status"] != wf:
                continue
            if ts and r["transformer_status"] != ts:
                continue
            if sub and str(r["subdivision_id"]) != sub:
                continue
            if repl and r["repl_status"] != repl:
                continue
            if from_date and r["failed_at"][:10] < from_date:
                continue
            if to_date and r["failed_at"][:10] > to_date:
                continue
            out.append(r)
        return out

@router.get("/failures/{fid}")
def failure_detail(fid: int, user: dict = Depends(get_current_user)):
    with get_db() as c:
        f = one(c, user, fid)
        org_row = c.execute(
            "select ci.name circle, d.name division from subdivisions s join divisions d on d.id=s.division_id join circles ci on ci.id=d.circle_id where s.id=?",
            (f["subdivision_id"],)
        ).fetchone()
        f["org"] = dict(org_row) if org_row else {"circle": "", "division": ""}
        f["audit"] = [
            dict(r) for r in c.execute("select at,user_name,role,action,prev,new from audit_logs where record_id=? order by id", (f["rec_id"],))
        ]
        return f

@router.post("/failures")
def create_failure(b: FailureCreateRequest, request: Request, user: dict = Depends(need_roles("JE"))):
    ip = request.client.host if request.client else ""
    with get_db() as c:
        t = c.execute("select * from transformers where id=? and active=1", (b.transformer_id,)).fetchone()
        if not t:
            raise HTTPException(status_code=404, detail="Transformer not found in master data")
        if t["section_id"] != user["section_id"]:
            raise HTTPException(status_code=403, detail="Access denied: transformer is outside your assigned section")
            
        d = c.execute("select * from failures where transformer_id=? and repl_status!='approved'", (t["id"],)).fetchone()
        if d:
            raise HTTPException(
                status_code=409,
                detail=f"ACTIVE FAILURE ALREADY EXISTS. Transformer {t['code']}, failure {d['failed_at']}, current status {tstatus(dict(d)) or d['wf_status']} (record {d['rec_id']}). Review the existing record before creating another failure."
            )
            
        sec = c.execute("select * from sections where id=?", (t["section_id"],)).fetchone()
        ae_user = c.execute("select ae_id from users where id=?", (user["id"],)).fetchone()
        ae_id = ae_user["ae_id"] if ae_user else None
        
        failed_at = b.failed_at or now_str()
        parse_dt(failed_at)
        
        village = b.village or t["village"]
        capacity = b.capacity or t["capacity"]
        ttype = b.ttype or t["ttype"]
        repl_req = 1 if b.replacement_required in (None, True, 1, "Yes") else 0
        bp = save_photo(b.before_photo_data) if b.before_photo_data else None
        
        try:
            cur = c.execute(
                """insert into failures(rec_id,transformer_id,entered_at,failed_at,subdivision_id,section_id,feeder_id,pss_id,village,capacity,ttype,
                  failure_type,consumers,je_id,ae_id,replacement_required,before_photo,lat,lng,remarks) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (secrets.token_hex(6), t["id"], now_str(), failed_at, sec["subdivision_id"], sec["id"], t["feeder_id"], t["pss_id"], village, capacity,
                 ttype, b.failure_type, b.consumers, user["id"], ae_id, repl_req, bp, b.lat, b.lng, b.remarks)
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="ACTIVE FAILURE ALREADY EXISTS for this transformer")
            
        rid = f"TRF-{datetime.now().year}-{cur.lastrowid:06d}"
        c.execute("update failures set rec_id=? where id=?", (rid, cur.lastrowid))
        audit(c, user, "CREATE", rid, None, b.model_dump(exclude_none=True), ip)
        return {"id": cur.lastrowid, "rec_id": rid}

@router.put("/failures/{fid}")
def edit_failure(fid: int, b: FailureUpdateRequest, request: Request, user: dict = Depends(need_roles("JE"))):
    ip = request.client.host if request.client else ""
    with get_db() as c:
        f = one(c, user, fid)
        if f["wf_status"] not in ("draft", "returned"):
            raise HTTPException(status_code=403, detail="Approved or pending records cannot be edited (use the correction workflow)")
            
        b_dict = b.model_dump(exclude_unset=True)
        sets = {k: b_dict[k] for k in EDIT_FIELDS if k in b_dict}
        if "failed_at" in sets and sets["failed_at"]:
            parse_dt(sets["failed_at"])
        if b_dict.get("before_photo_data"):
            sets["before_photo"] = save_photo(b_dict["before_photo_data"])
            
        if sets:
            c.execute("update failures set " + ",".join(k + "=?" for k in sets) + " where id=?", [*sets.values(), fid])
            audit(c, user, "EDIT", f["rec_id"], {k: f.get(k) for k in sets if k != "before_photo"}, {k: v for k, v in sets.items()}, ip)
        return {"ok": 1}

@router.post("/failures/{fid}/submit")
def submit_failure(fid: int, request: Request, user: dict = Depends(need_roles("JE"))):
    ip = request.client.host if request.client else ""
    with get_db() as c:
        f = one(c, user, fid)
        if f["wf_status"] not in ("draft", "returned"):
            raise HTTPException(status_code=409, detail="Record already submitted")
            
        req_fields = {
            "feeder_id": "Feeder", "pss_id": "PSS", "village": "Village", "capacity": "Capacity",
            "ttype": "Transformer type", "failure_type": "Failure type", "consumers": "Consumers affected",
            "failed_at": "Failure date/time", "before_photo": "Before-replacement photograph"
        }
        miss = [n for k, n in req_fields.items() if f[k] in (None, "")]
        if miss:
            raise HTTPException(status_code=422, detail="Cannot submit: " + ", ".join(miss) + " required.")
            
        lookup_ok(c, "capacity", f["capacity"])
        lookup_ok(c, "failure_type", f["failure_type"])
        
        c.execute("update failures set wf_status='pending_ae', submitted_at=?, return_reason=null where id=?", (now_str(), fid))
        c.execute("insert into approval_history(failure_id,kind,action,by_user,at) values(?,?,?,?,?)", (fid, "failure", "submit", user["id"], now_str()))
        audit(c, user, "SUBMIT", f["rec_id"], {"wf_status": f["wf_status"]}, {"wf_status": "pending_ae"}, ip)
        notify(c, f["ae_id"], f"New transformer failure {f['tcode']} requires your approval.", fid)
        return {"ok": 1}

@router.post("/failures/{fid}/review")
def review_failure(fid: int, b: ReviewRequest, request: Request, user: dict = Depends(need_roles("AE", "ADMIN"))):
    ip = request.client.host if request.client else ""
    with get_db() as c:
        f = one(c, user, fid)
        if user["role"] == "AE" and f["ae_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied: only the assigned AE can approve this record")
        if f["je_id"] == user["id"]:
            raise HTTPException(status_code=403, detail="You cannot approve your own record")
            
        if f["wf_status"] != "pending_ae":
            raise HTTPException(status_code=409, detail="Record is not pending AE approval")
            
        act = b.action
        reason = (b.reason or "").strip()
        if act == "approve":
            c.execute("update failures set wf_status='approved', approved_at=? where id=?", (now_str(), fid))
            new_st, msg = "approved", f"Transformer {f['tcode']} has been approved."
        elif act == "return":
            if not reason:
                raise HTTPException(status_code=422, detail="A return reason is required")
            c.execute("update failures set wf_status='returned', return_reason=? where id=?", (reason, fid))
            new_st, msg = "returned", f"Transformer {f['tcode']} has been returned for correction: {reason}"
        else:
            raise HTTPException(status_code=400, detail="action must be approve or return")
            
        c.execute("insert into approval_history(failure_id,kind,action,by_user,at,reason) values(?,?,?,?,?,?)", (fid, "failure", act, user["id"], now_str(), reason))
        audit(c, user, act.upper(), f["rec_id"], {"wf_status": "pending_ae"}, {"wf_status": new_st, "reason": reason}, ip)
        notify(c, f["je_id"], msg, fid)
        return {"ok": 1}

@router.post("/failures/{fid}/delay")
def update_delay(fid: int, b: DelayUpdateRequest, request: Request, user: dict = Depends(need_roles("JE"))):
    ip = request.client.host if request.client else ""
    with get_db() as c:
        f = one(c, user, fid)
        if f["wf_status"] != "approved" or f["repl_status"] == "approved":
            raise HTTPException(status_code=409, detail="Only open, approved failures can be updated")
        why = b.delay_reason.strip()
        if not why:
            raise HTTPException(status_code=422, detail="Reason for delay is mandatory")
        ms, ur = int(bool(b.material_shortage)), int(bool(b.under_repair))
        c.execute("update failures set material_shortage=?, under_repair=?, delay_reason=? where id=?", (ms, ur, why, fid))
        audit(c, user, "DELAY_UPDATE", f["rec_id"], {"ms": f["material_shortage"], "reason": f["delay_reason"]}, {"ms": ms, "ur": ur, "reason": why}, ip)
        return {"ok": 1}

@router.post("/failures/{fid}/replacement")
def submit_replacement(fid: int, b: ReplacementRequest, request: Request, user: dict = Depends(need_roles("JE"))):
    ip = request.client.host if request.client else ""
    with get_db() as c:
        f = one(c, user, fid)
        if f["wf_status"] != "approved":
            raise HTTPException(status_code=409, detail="Failure must be AE-approved before replacement details")
        if f["repl_status"] not in ("none", "draft", "returned"):
            raise HTTPException(status_code=409, detail="Replacement already submitted/approved")
            
        b_dict = b.model_dump(exclude_unset=True)
        sets = {k: b_dict[k] for k in REPLACEMENT_FIELDS if k in b_dict and b_dict[k] is not None}
        if b_dict.get("after_photo_data"):
            sets["after_photo"] = save_photo(b_dict["after_photo_data"])
        if sets.get("old_status") and sets["old_status"] not in ("Burnt", "Repairable", "Returned"):
            raise HTTPException(status_code=422, detail="Invalid old DTR status")
            
        merged = {**f, **sets}
        if b.submit:
            reqs = (("repl_at", "Replacement date/time"), ("new_dtr", "New DTR number"), ("new_cap", "New capacity"),
                    ("old_status", "Old DTR status"), ("after_photo", "After-replacement photograph"))
            miss = [n for k, n in reqs if not merged.get(k)]
            if miss:
                raise HTTPException(status_code=422, detail="Cannot complete: " + ", ".join(miss) + " required.")
            sets["repl_status"] = "pending_ae"
            sets["restoration"] = merged.get("restoration") or "Completed"
        elif f["repl_status"] == "none":
            sets["repl_status"] = "draft"
            
        if sets:
            c.execute("update failures set " + ",".join(k + "=?" for k in sets) + " where id=?", [*sets.values(), fid])
            
        if b.submit:
            c.execute("insert into approval_history(failure_id,kind,action,by_user,at) values(?,?,?,?,?)", (fid, "replacement", "submit", user["id"], now_str()))
            notify(c, f["ae_id"], f"Replacement for {f['tcode']} awaits your verification.", fid)
            
        audit(c, user, "REPLACEMENT_SUBMIT" if b.submit else "REPLACEMENT_SAVE", f["rec_id"], None, {k: v for k, v in sets.items() if k != "after_photo"}, ip)
        return {"ok": 1}

@router.post("/failures/{fid}/replacement/review")
def review_replacement(fid: int, b: ReviewRequest, request: Request, user: dict = Depends(need_roles("AE", "ADMIN"))):
    ip = request.client.host if request.client else ""
    with get_db() as c:
        f = one(c, user, fid)
        if user["role"] == "AE" and f["ae_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied: only the assigned AE can approve this record")
        if f["repl_status"] != "pending_ae":
            raise HTTPException(status_code=409, detail="Replacement is not pending verification")
            
        act = b.action
        reason = (b.reason or "").strip()
        if act == "approve":
            if not f["new_dtr"]:
                raise HTTPException(status_code=422, detail="Cannot approve: New DTR number is missing.")
            c.execute("update failures set repl_status='approved', repl_approved_at=? where id=?", (now_str(), fid))
            msg = f"Replacement of {f['tcode']} approved; status Replaced."
        elif act == "return":
            if not reason:
                raise HTTPException(status_code=422, detail="A return reason is required")
            c.execute("update failures set repl_status='returned', repl_return_reason=? where id=?", (reason, fid))
            msg = f"Replacement of {f['tcode']} returned: {reason}"
        else:
            raise HTTPException(status_code=400, detail="action must be approve or return")
            
        c.execute("insert into approval_history(failure_id,kind,action,by_user,at,reason) values(?,?,?,?,?,?)", (fid, "replacement", act, user["id"], now_str(), reason))
        audit(c, user, "REPL_" + act.upper(), f["rec_id"], {"repl_status": "pending_ae"}, {"reason": reason}, ip)
        notify(c, f["je_id"], msg, fid)
        return {"ok": 1}

@router.get("/photo/{filename}")
def get_photo(filename: str, user: dict = Depends(get_current_user)):
    if not re.fullmatch(r"[0-9a-f]{32}\.(?:jpg|png)", filename):
        raise HTTPException(status_code=400, detail="Invalid photo filename")
    with get_db() as c:
        sc, sp = f_scope(user)
        if not c.execute(f"select 1 from failures f where (before_photo=? or after_photo=?) and ({sc})", (filename, filename, *sp)).fetchone():
            raise HTTPException(status_code=403, detail="Access denied")
    photo_path = os.path.join(UPLOADS_DIR, filename)
    if not os.path.exists(photo_path):
        raise HTTPException(status_code=404, detail="Photo file not found")
    media_type = "image/jpeg" if filename.endswith(".jpg") else "image/png"
    return FileResponse(photo_path, media_type=media_type)
