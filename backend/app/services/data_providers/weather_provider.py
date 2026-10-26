"""WeatherProvider stub — Phase 2 plugs real API (OpenWeather, etc.)."""
from __future__ import annotations

import hashlib
import random
from app.core.enums import DataSourceType
from app.services.data_providers.base import DataProvider, ProviderQuery, ProviderResult


class WeatherProvider(DataProvider):
    @property
    def source_type(self) -> DataSourceType:
        return DataSourceType.WEATHER

    def fetch(self, query: ProviderQuery) -> ProviderResult:
        seed = int(hashlib.sha256(query.administrative_unit_id.encode()).hexdigest()[:8], 16)
        rng = random.Random(seed)
        return ProviderResult(
            source=DataSourceType.WEATHER,
            dataset="WEATHER/MOCK",
            data={
                "temperature_c": round(rng.uniform(22, 34), 1),
                "humidity_pct": round(rng.uniform(55, 95), 1),
                "rainfall_mm": round(rng.uniform(0, 80), 1),
                "period": f"{query.start_date} → {query.end_date}",
            },
            metadata={"provider": "mock", "note": "Phase 2: replace with real weather API"},
        )
