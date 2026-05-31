from datetime import datetime

from pydantic import BaseModel, field_validator, model_validator

ALLOWED_PREF_CODES = {"11", "12", "13", "14"}
_CURRENT_YEAR = datetime.now().year


class LandPriceIngestRequest(BaseModel):
    year_from: int
    year_to: int
    pref_codes: list[str] = ["13", "14", "11", "12"]
    dry_run: bool = False

    @field_validator("year_from", "year_to")
    @classmethod
    def validate_year_range(cls, v: int) -> int:
        if not (2000 <= v <= _CURRENT_YEAR + 1):
            raise ValueError(f"year は 2000〜{_CURRENT_YEAR + 1} の範囲で指定してください")
        return v

    @model_validator(mode="after")
    def validate_year_order(self) -> "LandPriceIngestRequest":
        if self.year_from > self.year_to:
            raise ValueError("year_from は year_to 以下にしてください")
        return self

    @field_validator("pref_codes")
    @classmethod
    def validate_pref_codes(cls, v: list[str]) -> list[str]:
        invalid = set(v) - ALLOWED_PREF_CODES
        if invalid:
            raise ValueError(f"無効な都道府県コード: {invalid}")
        return v


class TransactionIngestRequest(LandPriceIngestRequest):
    quarter_from: int = 1
    quarter_to: int = 4

    @field_validator("quarter_from", "quarter_to")
    @classmethod
    def validate_quarter(cls, v: int) -> int:
        if not (1 <= v <= 4):
            raise ValueError("quarter は 1〜4 で指定してください")
        return v

    @model_validator(mode="after")
    def validate_quarter_order(self) -> "TransactionIngestRequest":
        if self.quarter_from > self.quarter_to:
            raise ValueError("quarter_from は quarter_to 以下にしてください")
        return self


class JobStatusResponse(BaseModel):
    job_id: str
    job_type: str
    status: str
    progress: dict | None
    started_at: str | None
    finished_at: str | None
    error_message: str | None
