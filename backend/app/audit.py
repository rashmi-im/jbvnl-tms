import json
from app.database import now_str

def audit(c, u: dict, action: str, rec: str, prev=None, new=None, ip: str = ""):
    c.execute(
        "insert into audit_logs(at,user_id,user_name,role,action,record_id,prev,new,ip) values(?,?,?,?,?,?,?,?,?)",
        (
            now_str(),
            u and u.get("id"),
            u and u.get("name"),
            u and u.get("role"),
            action,
            rec,
            json.dumps(prev) if prev is not None else None,
            json.dumps(new) if new is not None else None,
            ip,
        ),
    )

def notify(c, uid: int, msg: str, fid: int = None):
    if uid:
        c.execute(
            "insert into notifications(user_id,msg,failure_id,created) values(?,?,?,?)",
            (uid, msg, fid, now_str()),
        )
