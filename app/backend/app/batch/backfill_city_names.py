"""
既存の raw_land_prices テーブルで city_name が空のレコードを
CITY_CODE_MAP を使って補完するバックフィルスクリプト。

使い方（コンソールから）:
    from app.batch.backfill_city_names import backfill_city_names
    backfill_city_names(db)
"""
import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.batch.city_code_map import CITY_CODE_MAP

logger = logging.getLogger(__name__)


def backfill_city_names(db: Session, dry_run: bool = False) -> int:
    """
    city_name が空のレコードに CITY_CODE_MAP から名称を補完する。
    戻り値: 更新件数
    """
    updated_total = 0

    for code, name in CITY_CODE_MAP.items():
        result = db.execute(
            text(
                "SELECT COUNT(*) FROM raw_land_prices "
                "WHERE city_code = :code AND city_name = ''"
            ),
            {"code": code},
        )
        count = result.scalar() or 0
        if count == 0:
            continue

        if not dry_run:
            db.execute(
                text(
                    "UPDATE raw_land_prices SET city_name = :name "
                    "WHERE city_code = :code AND city_name = ''"
                ),
                {"name": name, "code": code},
            )
        updated_total += count
        logger.info("%s (%s): %d 件%s", name, code, count, "（dry-run）" if dry_run else " 更新")

    if not dry_run:
        db.commit()

    print(f"{'[dry-run] ' if dry_run else ''}合計 {updated_total} 件を更新しました。")
    return updated_total
