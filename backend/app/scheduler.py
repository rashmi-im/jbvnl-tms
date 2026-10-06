import time
import threading
from datetime import datetime, timedelta
from app.database import get_db, parse_dt, now_str
from app.audit import notify

def snapshot_rows(c, d: str, subs: list):
    s0 = d + " 00:00:00"
    s1 = (parse_dt(d + " 00:00:00") + timedelta(days=1)).strftime("%Y-%m-%d 00:00:00")
    out = []
    for s in subs:
        q = lambda w, p: c.execute(
            "select count(*) from failures where subdivision_id=? and wf_status='approved' and " + w,
            (s["id"], *p),
        ).fetchone()[0]
        op = q("failed_at<? and (repl_approved_at is null or repl_approved_at>=?)", (s0, s0))
        bu = q("failed_at>=? and failed_at<?", (s0, s1))
        re_ = q("repl_approved_at>=? and repl_approved_at<?", (s0, s1))
        out.append({
            "subdivision_id": s["id"],
            "subdivision": s["name"],
            "opening": op,
            "burnt": bu,
            "replaced": re_,
            "closing": op + bu - re_,
        })
    return out

def run_snapshot(c, d: str):
    subs = c.execute("select id, name from subdivisions").fetchall()
    for r in snapshot_rows(c, d, subs):
        c.execute(
            "insert or ignore into daily_reports values(?,?,?,?,?,?,?)",
            (d, r["subdivision_id"], r["opening"], r["burnt"], r["replaced"], r["closing"], now_str()),
        )

def escalate(c):
    for f in c.execute(
        "select f.*, t.code tcode, s.division_id from failures f join transformers t on t.id=f.transformer_id join subdivisions s on s.id=f.subdivision_id where wf_status='approved' and repl_status!='approved'"
    ):
        h = (datetime.now() - parse_dt(f["failed_at"])).total_seconds() / 3600
        if h > 24 and not f["n24"]:
            for uid in (f["je_id"], f["ae_id"]):
                notify(c, uid, f"{f['tcode']} pending more than 24 hours", f["id"])
            c.execute("update failures set n24=1 where id=?", (f["id"],))
        if h > 48 and not f["n48"]:
            div_users = [
                r[0] for r in c.execute(
                    "select id from users where active=1 and ((role='DIVISION' and division_id=?) or (role='CIRCLE' and circle_id=(select circle_id from divisions where id=?)))",
                    (f["division_id"], f["division_id"]),
                )
            ]
            for uid in [f["je_id"], f["ae_id"]] + div_users:
                notify(c, uid, f"ESCALATION: {f['tcode']} pending more than 48 hours", f["id"])
            c.execute("update failures set n48=1 where id=?", (f["id"],))

def scheduler_loop():
    while True:
        try:
            with get_db() as c:
                n = datetime.now()
                escalate(c)
                if n.hour >= 9:
                    run_snapshot(c, n.strftime("%Y-%m-%d"))
        except Exception as e:
            print("Scheduler error:", e)
        time.sleep(30)

def start_scheduler():
    t = threading.Thread(target=scheduler_loop, daemon=True)
    t.start()
