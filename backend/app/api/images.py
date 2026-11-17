import base64
import binascii
import hashlib
import io
import os
from pathlib import Path
import uuid
import warnings

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import require_permission, SecurityError, utcnow
from app.db.session import get_session
from app.models.master import Item, ItemImage
from app.schemas.master import ImageInput
from app.services.master import commit, get_record, output, record_audit

router = APIRouter(prefix="/master/items", tags=["Item images"])
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 16_000_000


def storage_path(key):
    if not key or not __import__("re").fullmatch(r"[a-f0-9]{32}\.(png|jpg|webp)", key):
        raise SecurityError(503, "IMAGE_STORAGE_ERROR", "Image storage is unavailable")
    root = Path(get_settings().image_storage_dir).resolve()
    path = (root / key).resolve()
    if path.parent != root:
        raise SecurityError(503, "IMAGE_STORAGE_ERROR", "Image storage is unavailable")
    return path


def verified_image(data):
    try:
        raw = base64.b64decode(data.content_base64, validate=True)
        if len(raw) > MAX_IMAGE_BYTES:
            raise SecurityError(413, "IMAGE_TOO_LARGE", "Images must be at most 5 MiB")
        signatures = {
            "image/png": raw.startswith(b"\x89PNG\r\n\x1a\n"),
            "image/jpeg": raw.startswith(b"\xff\xd8\xff"),
            "image/webp": raw.startswith(b"RIFF") and raw[8:12] == b"WEBP",
        }
        if not signatures[data.mime_type]:
            raise ValueError()
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as image:
                if (
                    Image.MIME.get(image.format) != data.mime_type
                    or image.width * image.height > MAX_IMAGE_PIXELS
                    or getattr(image, "n_frames", 1) != 1
                ):
                    raise ValueError()
                image.verify()
            # Re-encode to remove untrusted metadata and trailing/polyglot data.
            with Image.open(io.BytesIO(raw)) as image:
                image.load()
                result = io.BytesIO()
                format = {
                    "image/png": "PNG",
                    "image/jpeg": "JPEG",
                    "image/webp": "WEBP",
                }[data.mime_type]
                mode = "RGB" if format == "JPEG" else "RGBA"
                pixels = Image.new(mode, image.size)
                pixels.paste(image.convert(mode))
                pixels.save(result, format=format)
                encoded = result.getvalue()
                if len(encoded) > MAX_IMAGE_BYTES:
                    raise SecurityError(
                        413, "IMAGE_TOO_LARGE", "Re-encoded image exceeds 5 MiB"
                    )
                return encoded, image.width, image.height
    except (
        ValueError,
        binascii.Error,
        OSError,
        UnidentifiedImageError,
        Image.DecompressionBombWarning,
        Image.DecompressionBombError,
    ):
        raise SecurityError(
            422,
            "INVALID_IMAGE",
            "Upload a valid, single-frame PNG, JPEG or WebP image of at most 16 million pixels",
        ) from None


@router.put("/{item_id}/image", response_model=dict)
def upload(
    item_id: uuid.UUID,
    data: ImageInput,
    context=Depends(require_permission("images.manage")),
    db: Session = Depends(get_session),
):
    item = get_record(db, Item, item_id)
    raw, width, height = verified_image(data)
    image = db.scalar(select(ItemImage).where(ItemImage.item_id == item_id))
    old_key = image.storage_key if image else None
    extension = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}[
        data.mime_type
    ]
    key = f"{uuid.uuid4().hex}.{extension}"
    path = storage_path(key)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("xb") as file:
            file.write(raw)
            file.flush()
            os.fsync(file.fileno())
        if image is None:
            image = ItemImage(
                id=uuid.uuid4(), item_id=item.id, created_by=context.user.id
            )
            db.add(image)
        image.storage_key, image.mime_type, image.byte_size = (
            key,
            data.mime_type,
            len(raw),
        )
        image.sha256, image.width, image.height = (
            hashlib.sha256(raw).hexdigest(),
            width,
            height,
        )
        image.updated_at = utcnow()
        record_audit(
            db,
            context,
            "images",
            item,
            "replaced" if old_key else "uploaded",
            ["image"],
        )
        db.flush()
        result = output(image)
        commit(db)
    except Exception:
        db.rollback()
        path.unlink(missing_ok=True)
        raise
    # Old immutable files are intentionally retained for crash-safe replacement
    # and concurrent downloads. Backup/retention policy governs later cleanup.
    return result


@router.get("/{item_id}/image")
def download(
    item_id: uuid.UUID,
    context=Depends(require_permission("items.read")),
    db: Session = Depends(get_session),
):
    get_record(db, Item, item_id)
    image = db.scalar(select(ItemImage).where(ItemImage.item_id == item_id))
    if image is None:
        raise SecurityError(404, "IMAGE_NOT_FOUND", "This item has no approved image")
    path = storage_path(image.storage_key)
    if not path.is_file():
        raise SecurityError(
            503, "IMAGE_STORAGE_ERROR", "The approved image is temporarily unavailable"
        )
    mime = image.mime_type
    db.commit()
    return FileResponse(
        path,
        media_type=mime,
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": "inline",
            "X-Content-Type-Options": "nosniff",
        },
    )
