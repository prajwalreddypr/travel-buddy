from typing import Any


class BaseProvider:
    async def get_price(self, origin: str, destination: str, start_date: Any, end_date: Any, travelers: int):
        raise NotImplementedError()
