"""
price_search.py — backward-compat shim.
All logic lives in product_search.py now.
"""
from app.agent.tools.product_search import (
    search_products,
    search_exact_product,
    get_current_price,
    get_demo_prices_for_task,
    simulate_price_drop,
    get_demo_current_index,
    lock_product_for_task,
    get_locked_product,
    verify_product_identity,
    _demo_price_sequences,
    _demo_price_indices,
)

__all__ = [
    "search_products",
    "search_exact_product",
    "get_current_price",
    "get_demo_prices_for_task",
    "simulate_price_drop",
    "get_demo_current_index",
    "lock_product_for_task",
    "get_locked_product",
    "verify_product_identity",
    "_demo_price_sequences",
    "_demo_price_indices",
]
