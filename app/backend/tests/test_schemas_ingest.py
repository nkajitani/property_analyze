"""
BE-SCH-01〜15: schemas/ingest.py バリデーション
"""
from datetime import datetime

import pytest
from pydantic import ValidationError

from app.schemas.ingest import LandPriceIngestRequest, TransactionIngestRequest

_CURRENT_YEAR = datetime.now().year


class TestLandPriceIngestRequest:
    def test_be_sch_01_normal(self):
        r = LandPriceIngestRequest(year_from=2020, year_to=2024)
        assert r.year_from == 2020

    def test_be_sch_02_year_from_min(self):
        """year_from=2000 は通過"""
        r = LandPriceIngestRequest(year_from=2000, year_to=2024)
        assert r.year_from == 2000

    def test_be_sch_03_year_from_under_min(self):
        """year_from=1999 → ValueError"""
        with pytest.raises(ValidationError):
            LandPriceIngestRequest(year_from=1999, year_to=2024)

    def test_be_sch_04_year_to_max(self):
        """year_to=現在年+1 は通過"""
        r = LandPriceIngestRequest(year_from=2020, year_to=_CURRENT_YEAR + 1)
        assert r.year_to == _CURRENT_YEAR + 1

    def test_be_sch_05_year_to_over_max(self):
        """year_to=現在年+2 → ValueError"""
        with pytest.raises(ValidationError):
            LandPriceIngestRequest(year_from=2020, year_to=_CURRENT_YEAR + 2)

    def test_be_sch_06_year_order(self):
        """year_from > year_to → ValueError"""
        with pytest.raises(ValidationError):
            LandPriceIngestRequest(year_from=2024, year_to=2020)

    def test_be_sch_07_same_year(self):
        """year_from == year_to は通過"""
        r = LandPriceIngestRequest(year_from=2023, year_to=2023)
        assert r.year_from == r.year_to

    def test_be_sch_08_pref_codes_valid(self):
        """pref_codes 正常"""
        r = LandPriceIngestRequest(year_from=2020, year_to=2024, pref_codes=["13", "14"])
        assert r.pref_codes == ["13", "14"]

    def test_be_sch_09_pref_codes_invalid(self):
        """pref_codes 不正コード → ValueError"""
        with pytest.raises(ValidationError):
            LandPriceIngestRequest(year_from=2020, year_to=2024, pref_codes=["99"])

    def test_be_sch_10_pref_codes_mixed(self):
        """pref_codes 混在 → ValueError"""
        with pytest.raises(ValidationError):
            LandPriceIngestRequest(year_from=2020, year_to=2024, pref_codes=["13", "99"])


class TestTransactionIngestRequest:
    def test_be_sch_11_quarter_from_min(self):
        """quarter_from=1 は通過"""
        r = TransactionIngestRequest(year_from=2020, year_to=2024, quarter_from=1, quarter_to=4)
        assert r.quarter_from == 1

    def test_be_sch_12_quarter_from_zero(self):
        """quarter_from=0 → ValueError"""
        with pytest.raises(ValidationError):
            TransactionIngestRequest(year_from=2020, year_to=2024, quarter_from=0, quarter_to=4)

    def test_be_sch_13_quarter_to_max(self):
        """quarter_to=4 は通過"""
        r = TransactionIngestRequest(year_from=2020, year_to=2024, quarter_from=1, quarter_to=4)
        assert r.quarter_to == 4

    def test_be_sch_14_quarter_to_over(self):
        """quarter_to=5 → ValueError"""
        with pytest.raises(ValidationError):
            TransactionIngestRequest(year_from=2020, year_to=2024, quarter_from=1, quarter_to=5)

    def test_be_sch_15_quarter_order(self):
        """quarter_from > quarter_to → ValueError"""
        with pytest.raises(ValidationError):
            TransactionIngestRequest(year_from=2020, year_to=2024, quarter_from=3, quarter_to=1)
