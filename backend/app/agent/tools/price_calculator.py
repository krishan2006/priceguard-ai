"""Price calculation and comparison tools."""
import logging
from typing import Optional, Dict, Any, Tuple

logger = logging.getLogger(__name__)

MEANINGFUL_CHANGE_THRESHOLD = 0.5  # 0.5% change is meaningful


def normalize_price(price: Any) -> Optional[float]:
    """Normalize price to a float value."""
    if price is None:
        return None
    try:
        if isinstance(price, str):
            price = price.replace("₹", "").replace("Rs.", "").replace(",", "").strip()
        return round(float(price), 2)
    except (ValueError, TypeError):
        logger.warning(f"Could not normalize price: {price}")
        return None


def calculate_discount(original_price: float, current_price: float) -> float:
    """Calculate discount percentage from original to current price."""
    if original_price <= 0:
        return 0.0
    discount = ((original_price - current_price) / original_price) * 100
    return round(discount, 2)


def calculate_price_change(current_price: float, previous_price: Optional[float]) -> Tuple[float, float]:
    """Calculate absolute and percentage price change."""
    if previous_price is None or previous_price == 0:
        return 0.0, 0.0
    change = current_price - previous_price
    change_pct = (change / previous_price) * 100
    return round(change, 2), round(change_pct, 2)


def compare_price_condition(
    current_price: float,
    condition: str,
    target_price: Optional[float] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    discount_threshold: Optional[float] = None,
    price_drop_percent: Optional[float] = None,
    original_price: Optional[float] = None,
    previous_price: Optional[float] = None,
) -> Tuple[bool, str, str]:
    """
    Compare current price against user condition.
    Returns: (condition_met: bool, action: str, description: str)
    """
    try:
        if condition == "price_below_target":
            if target_price is None:
                return False, "NO_ALERT", "No target price set"
            if current_price <= target_price:
                return True, "PRICE_BELOW_THRESHOLD", f"Price ₹{current_price:,.0f} is at or below target ₹{target_price:,.0f}"
            return False, "PRICE_ABOVE_TARGET", f"Price ₹{current_price:,.0f} is above target ₹{target_price:,.0f}"

        elif condition == "price_reaches_target":
            if target_price is None:
                return False, "NO_ALERT", "No target price set"
            tolerance = target_price * 0.01  # 1% tolerance
            if abs(current_price - target_price) <= tolerance:
                return True, "PRICE_WITHIN_RANGE", f"Price ₹{current_price:,.0f} has reached target ₹{target_price:,.0f}"
            if current_price < target_price:
                return True, "PRICE_BELOW_THRESHOLD", f"Price ₹{current_price:,.0f} is below target ₹{target_price:,.0f}"
            return False, "PRICE_ABOVE_TARGET", f"Price ₹{current_price:,.0f} is above target ₹{target_price:,.0f}"

        elif condition == "price_in_range":
            if min_price is None or max_price is None:
                return False, "NO_ALERT", "No price range set"
            if min_price <= current_price <= max_price:
                return True, "PRICE_WITHIN_RANGE", f"Price ₹{current_price:,.0f} is within range ₹{min_price:,.0f} - ₹{max_price:,.0f}"
            if current_price < min_price:
                return False, "PRICE_BELOW_THRESHOLD", f"Price ₹{current_price:,.0f} is below minimum ₹{min_price:,.0f}"
            return False, "PRICE_ABOVE_TARGET", f"Price ₹{current_price:,.0f} is above maximum ₹{max_price:,.0f}"

        elif condition == "discount_reaches_percent":
            if discount_threshold is None or original_price is None:
                return False, "NO_ALERT", "No discount threshold or original price set"
            current_discount = calculate_discount(original_price, current_price)
            if current_discount >= discount_threshold:
                return True, "PRICE_BELOW_THRESHOLD", f"Discount {current_discount:.1f}% has reached threshold {discount_threshold:.1f}%"
            return False, "PRICE_ABOVE_TARGET", f"Discount {current_discount:.1f}% has not reached threshold {discount_threshold:.1f}%"

        elif condition == "price_drops_by_percent":
            if price_drop_percent is None or previous_price is None:
                return False, "NO_ALERT", "No drop percentage or previous price set"
            _, change_pct = calculate_price_change(current_price, previous_price)
            actual_drop = -change_pct  # Make positive for drops
            if actual_drop >= price_drop_percent:
                return True, "PRICE_BELOW_THRESHOLD", f"Price dropped {actual_drop:.1f}% which meets threshold {price_drop_percent:.1f}%"
            return False, "NO_ALERT", f"Price drop {actual_drop:.1f}% hasn't reached threshold {price_drop_percent:.1f}%"

        return False, "NO_ALERT", f"Unknown condition: {condition}"

    except Exception as e:
        logger.error(f"Error comparing price condition: {e}")
        return False, "NO_ALERT", f"Comparison error: {str(e)}"


def detect_meaningful_change(current_price: float, previous_price: Optional[float]) -> bool:
    """Check if price has changed meaningfully (above threshold)."""
    if previous_price is None:
        return True  # First price is always meaningful
    if previous_price == 0:
        return current_price != 0
    _, change_pct = calculate_price_change(current_price, previous_price)
    return abs(change_pct) >= MEANINGFUL_CHANGE_THRESHOLD


def check_duplicate_alert(
    alert_state: str,
    condition_met: bool,
) -> Tuple[bool, str]:
    """
    Implement state transition logic to prevent duplicate alerts.
    Returns: (should_send_alert: bool, new_state: str)
    
    States:
      NOT_TRIGGERED → when condition is met → TRIGGERED → ALERT_SENT
      ALERT_SENT → when condition still met → WAITING_FOR_STATE_CHANGE (no alert)
      WAITING_FOR_STATE_CHANGE → when condition not met → NOT_TRIGGERED
      NOT_TRIGGERED → when condition met again → TRIGGERED_AGAIN → ALERT_SENT
    """
    if alert_state == "NOT_TRIGGERED":
        if condition_met:
            return True, "ALERT_SENT"
        return False, "NOT_TRIGGERED"

    elif alert_state == "TRIGGERED":
        if condition_met:
            return True, "ALERT_SENT"
        return False, "NOT_TRIGGERED"

    elif alert_state == "ALERT_SENT":
        if condition_met:
            return False, "WAITING_FOR_STATE_CHANGE"
        return False, "NOT_TRIGGERED"

    elif alert_state == "WAITING_FOR_STATE_CHANGE":
        if condition_met:
            return False, "WAITING_FOR_STATE_CHANGE"
        return False, "NOT_TRIGGERED"

    elif alert_state == "NOT_TRIGGERED":
        if condition_met:
            return True, "ALERT_SENT"
        return False, "NOT_TRIGGERED"

    # Default recovery
    if condition_met:
        return True, "ALERT_SENT"
    return False, "NOT_TRIGGERED"


def get_stats_description(action: str, current_price: float, target_price: Optional[float] = None) -> str:
    """Get human-readable description for an action."""
    descriptions = {
        "ALERT": f"Price alert triggered at ₹{current_price:,.0f}",
        "NO_ALERT": f"No alert needed at ₹{current_price:,.0f}",
        "PRICE_UNCHANGED": f"Price unchanged at ₹{current_price:,.0f}",
        "PRICE_ABOVE_TARGET": f"Price ₹{current_price:,.0f} above target ₹{target_price:,.0f}" if target_price else f"Price above target",
        "PRICE_WITHIN_RANGE": f"Price ₹{current_price:,.0f} within acceptable range",
        "PRICE_BELOW_THRESHOLD": f"Price ₹{current_price:,.0f} below threshold",
        "SOURCE_UNAVAILABLE": "Price source unavailable",
    }
    return descriptions.get(action, f"Action: {action}")
