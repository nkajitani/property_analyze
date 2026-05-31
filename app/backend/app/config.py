from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    admin_token: str
    cors_origins: list[str] = ["http://localhost:3000"]
    re_info_lib_key: str = ""

    batch_zoom_level: int = 13
    batch_request_timeout_sec: int = 30
    batch_max_retries: int = 3
    batch_retry_backoff_base_sec: float = 2.0
    batch_concurrent_requests: int = 3
    default_pref_codes: list[str] = ["13", "14", "11", "12"]

    model_config = {"env_file": ".env"}


settings = Settings()
