from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import divergence, ingest, land_prices, transactions


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Real Estate Insight API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(land_prices.router,  prefix="/api/v1/land-prices",  tags=["land-prices"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["transactions"])
app.include_router(ingest.router,       prefix="/api/v1/ingest",       tags=["ingest"])
app.include_router(divergence.router,   prefix="/api/v1/divergence",   tags=["divergence"])


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
