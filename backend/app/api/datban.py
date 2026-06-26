from datetime import datetime, timedelta, timezone, date, time
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app import models
from app import schemas
from app.api.auth import get_current_admin, get_current_user
from app.api.thongbao import create_notification

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/datban", tags=["Đặt Bàn"])

from .datban_router.customer_reservations import router as customer_router
from .datban_router.admin_reservations import router as admin_router

router.include_router(admin_router)
router.include_router(customer_router)

from .datban_router.utils import *

from .datban_router.utils import _find_conflicting_reservation, _normalize_datetime
