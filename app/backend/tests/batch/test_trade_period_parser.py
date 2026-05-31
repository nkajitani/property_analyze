"""
BATCH-PERIOD-01〜07: trade_period 抽出テスト（batch/base.py の parse_transaction_feature 経由）
"""
import re


# batch/base.py と同一の正規表現
_TRADE_PERIOD_RE = re.compile(r"(\d{4})年第([1-4])四半期")


def _parse_trade_period(trade_period: str):
    """trade_period 文字列から (year, quarter) を返す。不正な場合は None"""
    m = _TRADE_PERIOD_RE.search(str(trade_period))
    if not m:
        return None
    year, quarter = int(m.group(1)), int(m.group(2))
    return year, quarter


class TestTradePeriodParser:
    def test_batch_period_01_q1(self):
        """BATCH-PERIOD-01: 2024年第1四半期"""
        result = _parse_trade_period("2024年第1四半期")
        assert result == (2024, 1)

    def test_batch_period_02_q4(self):
        """BATCH-PERIOD-02: 2022年第4四半期"""
        result = _parse_trade_period("2022年第4四半期")
        assert result == (2022, 4)

    def test_batch_period_03_year_only(self):
        """BATCH-PERIOD-03: 2024年 → None"""
        result = _parse_trade_period("2024年")
        assert result is None

    def test_batch_period_04_empty(self):
        """BATCH-PERIOD-04: 空文字 → None"""
        result = _parse_trade_period("")
        assert result is None

    def test_batch_period_05_english(self):
        """BATCH-PERIOD-05: 2024Q1（英語フォーマット）→ None"""
        result = _parse_trade_period("2024Q1")
        assert result is None

    def test_batch_period_06_quarter_zero(self):
        """BATCH-PERIOD-06: 第0四半期 → None（正規表現が [1-4] のみ許可）"""
        result = _parse_trade_period("2024年第0四半期")
        assert result is None

    def test_batch_period_07_quarter_five(self):
        """BATCH-PERIOD-07: 第5四半期 → None（正規表現が [1-4] のみ許可）"""
        result = _parse_trade_period("2024年第5四半期")
        assert result is None
