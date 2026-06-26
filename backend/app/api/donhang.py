from decimal import Decimal
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app import models, schemas
from app.api.auth import get_current_admin, get_current_user
from app.db.database import get_db


router = APIRouter(prefix="/api/donhang", tags=["Đơn Hàng"])

from .donhang_router.customer_orders import router as customer_router
from .donhang_router.admin_orders import router as admin_router
from .donhang_router.waiter_orders import router as waiter_router
from .donhang_router.kitchen_orders import router as kitchen_router

router.include_router(customer_router)
router.include_router(admin_router)
router.include_router(waiter_router)
router.include_router(kitchen_router)
