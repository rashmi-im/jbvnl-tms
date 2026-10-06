from datetime import datetime
from typing import Optional
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends
from app.database import get_db, sub_scope
from app.auth import get_current_user
from app.routers.failure_router import fetch

router = APIRouter(tags=["Dashboard"])

@router.get("/dashboard")
def dashboard(date: Optional[str] = None, user: dict = Depends(get_current_user)):
    target_date = date or datetime.now().strftime("%Y-%m-%d")
    with get_db() as c:
        rows = fetch(c, user)
        sc, sp = sub_scope(user)
        subs_rows = c.execute(f"select s.id, s.name from subdivisions s where {sc}", sp).fetchall()
        subs = {r["id"]: {"id": r["id"], "name": r["name"], "burnt_today": 0, "pending_ae": 0, "open": 0} for r in subs_rows}
        
        kpis = {
            "reported": 0,
            "pending_ae": 0,
            "under_process": 0,
            "replaced": 0,
            "pending": 0,
            "p24": 0,
            "p48": 0,
            "shortage": 0,
            "repl_verification": 0
        }
        wf = {}
        
        for r in rows:
            wf_st = r["wf_status"]
            wf[wf_st] = wf.get(wf_st, 0) + 1
            s = subs.get(r["subdivision_id"])
            ts = r["transformer_status"]
            
            if r["failed_at"][:10] == target_date and wf_st != "draft":
                kpis["reported"] += 1
            if wf_st == "approved" and r["failed_at"][:10] == target_date and s:
                s["burnt_today"] += 1
            if wf_st == "pending_ae":
                kpis["pending_ae"] += 1
                if s:
                    s["pending_ae"] += 1
            if r["repl_status"] == "pending_ae":
                kpis["repl_verification"] += 1
            if ts == "Replaced":
                if (r["repl_approved_at"] or "")[:10] == target_date:
                    kpis["replaced"] += 1
            elif ts:
                if s:
                    s["open"] += 1
                k_map = {
                    "Under Process": "under_process",
                    "Pending": "pending",
                    "Pending >24 Hours": "p24",
                    "Pending >48 Hours": "p48",
                    "Material Shortage": "shortage"
                }
                key = k_map.get(ts)
                if key:
                    kpis[key] += 1
                    
        sorted_subs = sorted(subs.values(), key=lambda x: x["name"])

        # Fetch all JE and AE officers directory & stats
        officers_query = """
            select u.id, u.name, u.emp_id, u.role, u.mobile, u.email,
                   s.name subdivision_name, sc.name section_name,
                   ae.name reporting_ae_name
            from users u
            left join subdivisions s on s.id=u.subdivision_id
            left join sections sc on sc.id=u.section_id
            left join users ae on ae.id=u.ae_id
            where u.active=1 and u.role in ('JE', 'AE')
            order by u.role, u.name
        """
        officers = []
        for o in c.execute(officers_query).fetchall():
            od = dict(o)
            uid = od["id"]
            if od["role"] == "JE":
                od["total_reported"] = c.execute("select count(*) from failures where je_id=?", (uid,)).fetchone()[0]
                od["pending_ae"] = c.execute("select count(*) from failures where je_id=? and (wf_status='pending_ae' or repl_status='pending_ae')", (uid,)).fetchone()[0]
                od["approved"] = c.execute("select count(*) from failures where je_id=? and wf_status='approved'", (uid,)).fetchone()[0]
                od["replaced"] = c.execute("select count(*) from failures where je_id=? and repl_status='approved'", (uid,)).fetchone()[0]
            elif od["role"] == "AE":
                od["assigned_jes"] = c.execute("select count(*) from users where ae_id=? and active=1", (uid,)).fetchone()[0]
                od["pending_review"] = c.execute("select count(*) from failures where ae_id=? and (wf_status='pending_ae' or repl_status='pending_ae')", (uid,)).fetchone()[0]
                od["approved_total"] = c.execute("select count(*) from failures where ae_id=? and wf_status='approved'", (uid,)).fetchone()[0]
            officers.append(od)

        return {
            "date": target_date,
            "kpis": kpis,
            "workflow_counts": wf,
            "subdivisions": sorted_subs,
            "officers": officers
        }
