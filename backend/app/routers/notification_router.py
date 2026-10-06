from fastapi import APIRouter, Depends
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(tags=["Notifications"])

@router.get("/notifications")
def get_notifications(user: dict = Depends(get_current_user)):
    with get_db() as c:
        return [dict(r) for r in c.execute("select * from notifications where user_id=? order by id desc limit 50", (user["id"],))]

@router.post("/notifications")
def mark_read(user: dict = Depends(get_current_user)):
    with get_db() as c:
        c.execute("update notifications set is_read=1 where user_id=?", (user["id"],))
        return {"ok": 1}
