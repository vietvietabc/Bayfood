from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.api.auth import get_current_user
from app.db.database import get_db

router = APIRouter(prefix="/api/thongbao", tags=["Thông Báo"])


def _get_user_role_name(db: Session, user: models.NguoiDung) -> str | None:
    if user.id_vaiTro is None:
        return None

    role = db.query(models.VaiTro).filter(models.VaiTro.id_vaiTro == user.id_vaiTro).first()
    return role.tenVaiTro if role else None


def create_notification(
    db: Session,
    *,
    id_nguoiDung: int | None = None,
    vaiTroNhan: str | None = None,
    tieuDe: str,
    noiDung: str,
    lienKet: str | None = None,
) -> models.ThongBao:
    notification = models.ThongBao(
        id_nguoiDung=id_nguoiDung,
        vaiTroNhan=vaiTroNhan,
        tieuDe=tieuDe,
        noiDung=noiDung,
        lienKet=lienKet,
        daDoc=False,
    )
    db.add(notification)
    db.flush()
    return notification


@router.get("/me", response_model=list[schemas.ThongBaoResponse])
def get_my_notifications(db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    role_name = _get_user_role_name(db, current_user)

    return (
        db.query(models.ThongBao)
        .filter(
            (models.ThongBao.id_nguoiDung == current_user.id_nguoiDung)
            | (models.ThongBao.vaiTroNhan == role_name)
        )
        .order_by(models.ThongBao.thoiGianTao.desc())
        .all()
    )


@router.get("/me/unread-count")
def get_my_unread_count(db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    role_name = _get_user_role_name(db, current_user)

    count = (
        db.query(models.ThongBao)
        .filter(
            ((models.ThongBao.id_nguoiDung == current_user.id_nguoiDung) | (models.ThongBao.vaiTroNhan == role_name)),
            models.ThongBao.daDoc.is_(False),
        )
        .count()
    )
    return {"count": count}


@router.put("/{id_thongBao}/read", response_model=schemas.ThongBaoResponse)
def mark_notification_read(id_thongBao: int, db: Session = Depends(get_db), current_user: models.NguoiDung = Depends(get_current_user)):
    role_name = _get_user_role_name(db, current_user)

    notification = (
        db.query(models.ThongBao)
        .filter(
            models.ThongBao.id_thongBao == id_thongBao,
            (
                (models.ThongBao.id_nguoiDung == current_user.id_nguoiDung)
                | (models.ThongBao.vaiTroNhan == role_name)
            ),
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")

    notification.daDoc = True
    db.commit()
    db.refresh(notification)
    return notification