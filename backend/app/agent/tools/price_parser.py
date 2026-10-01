"""Price parser - extraction and normalization from various sources."""
import re
import logging
from typing import Optional, Any

logger = logging.getLogger(__name__)


def parse_price_from_response(data: Any) -> Optional[float]:
    """Parse price from various response formats."""
    if isinstance(data, (int, float)):
        return float(data)
    
    if isinstance(data, str):
        return _extract_price_from_string(data)
    
    if isinstance(data, dict):
        for key in ["price", "current_price", "amount", "value", "cost"]:
            if key in data and data[key] is not None:
                result = parse_price_from_response(data[key])
                if result is not None:
                    return result
    
    return None


def _extract_price_from_string(text: str) -> Optional[float]:
    """Extract numeric price from a string."""
    text = text.replace(",", "")
    
    patterns = [
        r'₹\s*(\d+(?:\.\d{1,2})?)',
        r'Rs\.?\s*(\d+(?:\.\d{1,2})?)',
        r'INR\s*(\d+(?:\.\d{1,2})?)',
        r'\$\s*(\d+(?:\.\d{1,2})?)',
        r'(\d{4,7}(?:\.\d{1,2})?)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                value = float(match.group(1))
                if 10 < value < 10_000_000:
                    if '$' in pattern:
                        value *= 83.5  # USD to INR
                    return round(value, 2)
            except ValueError:
                continue
    
    return None


def format_price_inr(price: float) -> str:
    """Format price in Indian Rupee format."""
    if price >= 100000:
        lakhs = price / 100000
        return f"₹{lakhs:.2f}L"
    return f"₹{price:,.0f}"


def validate_price_reasonability(price: float, product_name: str) -> bool:
    """Basic sanity check that price is reasonable."""
    if price <= 0:
        return False
    if price > 100_000_000:  # > 10 crore - probably an error
        return False
    return True
