import io
import csv
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Response, Depends
from app.database import get_db, sub_scope
from app.auth import get_current_user
from app.scheduler import snapshot_rows

router = APIRouter(prefix="/api", tags=["Reports"])

@router.get("/report/daily")
def daily_report(date: Optional[str] = None, format: Optional[str] = None, user: dict = Depends(get_current_user)):
    target_date = date or datetime.now().strftime("%Y-%m-%d")
    with get_db() as c:
        sc, sp = sub_scope(user)
        subs = [dict(r) for r in c.execute(f"select s.id, s.name from subdivisions s where {sc} order by s.name", sp).fetchall()]
        
        snap_rows = c.execute(
            "select s.name subdivision, r.* from daily_reports r join subdivisions s on s.id=r.subdivision_id where report_date=? and (" + sc + ")",
            (target_date, *sp)
        ).fetchall()
        
        rows = [dict(r) for r in snap_rows] if snap_rows else snapshot_rows(c, target_date, subs)
        
        tot = {
            "subdivision": "TOTAL",
            "opening": sum(r["opening"] for r in rows),
            "burnt": sum(r["burnt"] for r in rows),
            "replaced": sum(r["replaced"] for r in rows),
            "closing": sum(r["closing"] for r in rows)
        }
        
        if format == "csv":
            o = io.StringIO()
            w = csv.writer(o)
            w.writerow(["Subdivision", "Opening Pending", "Today's Burnt", "Replaced Today", "Closing Pending"])
            for r in rows + [tot]:
                w.writerow([r["subdivision"], r["opening"], r["burnt"], r["replaced"], r["closing"]])
            csv_content = o.getvalue()
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={"Content-Disposition": f'attachment; filename="daily_report_{target_date}.csv"'}
            )
            
        return {
            "date": target_date,
            "snapshot": bool(snap_rows),
            "rows": rows,
            "total": tot
        }
