"""Alert state manager with transition logic."""
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

# Valid state transitions
TRANSITIONS = {
    "NOT_TRIGGERED": {
        True: ("ALERT_SENT", True),   # condition_met -> alert + transition to ALERT_SENT
        False: ("NOT_TRIGGERED", False),
    },
    "TRIGGERED": {
        True: ("ALERT_SENT", True),
        False: ("NOT_TRIGGERED", False),
    },
    "ALERT_SENT": {
        True: ("WAITING_FOR_STATE_CHANGE", False),  # Already alerted, suppress duplicate
        False: ("NOT_TRIGGERED", False),             # Condition no longer met, reset
    },
    "WAITING_FOR_STATE_CHANGE": {
        True: ("WAITING_FOR_STATE_CHANGE", False),  # Still in alert zone, no new alert
        False: ("NOT_TRIGGERED", False),             # Exited alert zone, reset
    },
    "TRIGGERED_AGAIN": {
        True: ("ALERT_SENT", True),
        False: ("NOT_TRIGGERED", False),
    },
}


def transition_alert_state(
    current_state: str,
    condition_met: bool,
    previous_price_was_not_alerting: bool = False,
) -> Tuple[str, bool]:
    """
    Perform state transition based on current condition.
    
    Special case: if we were in NOT_TRIGGERED, then went to ALERT_SENT,
    and then condition was NOT met, and now condition IS met again -> TRIGGERED_AGAIN
    
    Returns: (new_state: str, should_alert: bool)
    """
    # Handle re-trigger scenario
    if current_state == "NOT_TRIGGERED" and condition_met and previous_price_was_not_alerting:
        # This means price came back into condition after having left it
        return "ALERT_SENT", True
    
    state_transitions = TRANSITIONS.get(current_state, TRANSITIONS["NOT_TRIGGERED"])
    new_state, should_alert = state_transitions.get(condition_met, ("NOT_TRIGGERED", False))
    
    return new_state, should_alert


def get_state_badge_color(state: str) -> str:
    """Get color for UI display of alert state."""
    colors = {
        "NOT_TRIGGERED": "gray",
        "TRIGGERED": "blue",
        "ALERT_SENT": "green",
        "WAITING_FOR_STATE_CHANGE": "yellow",
        "TRIGGERED_AGAIN": "purple",
    }
    return colors.get(state, "gray")


def get_state_description(state: str) -> str:
    """Get human-readable description of alert state."""
    descriptions = {
        "NOT_TRIGGERED": "Monitoring — Condition not yet met",
        "TRIGGERED": "Condition triggered, preparing alert",
        "ALERT_SENT": "Alert sent, monitoring for next trigger",
        "WAITING_FOR_STATE_CHANGE": "Condition still active — waiting for price to exit zone before next alert",
        "TRIGGERED_AGAIN": "Condition triggered again after reset",
    }
    return descriptions.get(state, state)
