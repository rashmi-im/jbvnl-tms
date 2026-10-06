from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List

class LoginRequest(BaseModel):
    emp_id: str
    password: str

class FailureCreateRequest(BaseModel):
    transformer_id: int
    failed_at: Optional[str] = None
    village: Optional[str] = None
    capacity: Optional[str] = None
    ttype: Optional[str] = None
    failure_type: Optional[str] = None
    consumers: Optional[int] = None
    replacement_required: Optional[Any] = 1
    before_photo_data: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    remarks: Optional[str] = None

class FailureUpdateRequest(BaseModel):
    failed_at: Optional[str] = None
    village: Optional[str] = None
    capacity: Optional[str] = None
    ttype: Optional[str] = None
    failure_type: Optional[str] = None
    consumers: Optional[int] = None
    replacement_required: Optional[Any] = None
    before_photo_data: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    remarks: Optional[str] = None

class ReviewRequest(BaseModel):
    action: str  # "approve" or "return"
    reason: Optional[str] = None

class DelayUpdateRequest(BaseModel):
    delay_reason: str
    material_shortage: Optional[bool] = False
    under_repair: Optional[bool] = False

class ReplacementRequest(BaseModel):
    submit: Optional[bool] = False
    repl_at: Optional[str] = None
    new_dtr: Optional[str] = None
    new_cap: Optional[str] = None
    old_status: Optional[str] = None
    after_photo_data: Optional[str] = None
    repl_remarks: Optional[str] = None
    restoration: Optional[str] = None

class AdminAddRequest(BaseModel):
    name: Optional[str] = None
    emp_id: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    circle_id: Optional[int] = None
    division_id: Optional[int] = None
    subdivision_id: Optional[int] = None
    section_id: Optional[int] = None
    ae_id: Optional[int] = None
    kind: Optional[str] = None
    value: Optional[str] = None
    code: Optional[str] = None
    dtr_no: Optional[str] = None
    capacity: Optional[str] = None
    ttype: Optional[str] = None
    feeder_id: Optional[int] = None
    pss_id: Optional[int] = None
    village: Optional[str] = None
    location: Optional[str] = None
    active: Optional[int] = 1
