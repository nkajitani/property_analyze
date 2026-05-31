from app.database import SessionLocal, init_db
from app.models.land_price import RawLandPrice
from app.models.transaction_price import RawTransactionPrice
from app.models.batch_job import BatchJob
from app.schemas.ingest import LandPriceIngestRequest, TransactionIngestRequest
from app.batch.fetch_land_prices import run_fetch_land_prices
from app.batch.fetch_transaction_prices import run_fetch_transaction_prices
from app.batch.backfill_city_names import backfill_city_names
from app.services.job_manager import job_manager

init_db()
db = SessionLocal()

print("✓ REI console ready")
print("  db, job_manager, RawLandPrice, RawTransactionPrice, BatchJob")
print("  LandPriceIngestRequest, TransactionIngestRequest")
print("  run_fetch_land_prices, run_fetch_transaction_prices")
print("  backfill_city_names(db, dry_run=False)")
