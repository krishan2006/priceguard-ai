"""
AI Reasoning Engine using Google Gemini API with deterministic fallback.
"""
import os
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


def _build_reasoning_prompt(
    product_name: str,
    current_price: float,
    previous_price: Optional[float],
    target_price: Optional[float],
    condition: str,
    price_change_pct: float,
    alert_state: str,
    condition_met: bool,
    programmatic_action: str,
    programmatic_reason: str,
) -> str:
    """Build structured prompt for Gemini reasoning."""
    condition_labels = {
        "price_below_target": "Price falls below target",
        "price_reaches_target": "Price reaches target",
        "price_in_range": "Price enters acceptable range",
        "discount_reaches_percent": "Discount reaches threshold",
        "price_drops_by_percent": "Price drops by percentage",
    }
    condition_label = condition_labels.get(condition, condition)

    return f"""You are an AI price monitoring agent. Analyze this price monitoring situation and return a JSON decision.

Product: {product_name}
Previous Price: ₹{previous_price:,.0f if previous_price else "N/A"}
Current Price: ₹{current_price:,.0f}
Target Price: ₹{target_price:,.0f if target_price else "N/A"}
Price Change: {price_change_pct:+.2f}%
Monitoring Condition: {condition_label}
Previous Alert State: {alert_state}
Condition Met (Programmatic): {condition_met}
Programmatic Decision: {programmatic_action}

Based on this analysis, return ONLY a JSON object with these fields:
{{
  "decision": "ALERT" or "NO_ALERT",
  "reason": "brief explanation",
  "confidence": 0.0-1.0,
  "recommended_action": "SEND_NOTIFICATION" or "NO_ACTION"
}}

Rules:
- If condition_met is True and alert_state is NOT_TRIGGERED: decision = ALERT
- If condition_met is True and alert_state is ALERT_SENT: decision = NO_ALERT (duplicate prevention)
- If condition_met is False: decision = NO_ALERT
- confidence should reflect certainty level
- reason should be human-readable for the end user

Return ONLY the JSON, no markdown, no explanation."""


def _deterministic_reasoning(
    condition_met: bool,
    alert_state: str,
    programmatic_action: str,
    programmatic_reason: str,
    current_price: float,
    target_price: Optional[float],
    price_change_pct: float,
) -> Dict[str, Any]:
    """Fallback deterministic reasoning when Gemini is unavailable."""
    
    if not condition_met:
        return {
            "decision": "NO_ALERT",
            "reason": programmatic_reason,
            "confidence": 0.95,
            "recommended_action": "NO_ACTION",
        }
    
    if alert_state in ("ALERT_SENT", "WAITING_FOR_STATE_CHANGE"):
        return {
            "decision": "NO_ALERT",
            "reason": f"Condition is still met but alert already sent. Waiting for price to change before alerting again.",
            "confidence": 0.99,
            "recommended_action": "NO_ACTION",
        }
    
    # Condition met and not duplicate
    price_str = f"₹{current_price:,.0f}"
    target_str = f"₹{target_price:,.0f}" if target_price else "target"
    change_str = f"{price_change_pct:+.1f}%" if price_change_pct != 0 else "unchanged"
    
    reason = f"Current price {price_str} satisfies the monitoring condition. Price change: {change_str}."
    if target_price and current_price <= target_price:
        reason = f"Price {price_str} is at or below your target {target_str}. Price change: {change_str}."
    
    return {
        "decision": "ALERT",
        "reason": reason,
        "confidence": 0.97,
        "recommended_action": "SEND_NOTIFICATION",
    }


async def run_ai_reasoning(
    product_name: str,
    current_price: float,
    previous_price: Optional[float],
    target_price: Optional[float],
    condition: str,
    price_change_pct: float,
    alert_state: str,
    condition_met: bool,
    programmatic_action: str,
    programmatic_reason: str,
) -> Dict[str, Any]:
    """
    Run AI reasoning using Gemini API with deterministic fallback.
    """
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    
    if gemini_key:
        try:
            result = await _call_gemini(
                api_key=gemini_key,
                product_name=product_name,
                current_price=current_price,
                previous_price=previous_price,
                target_price=target_price,
                condition=condition,
                price_change_pct=price_change_pct,
                alert_state=alert_state,
                condition_met=condition_met,
                programmatic_action=programmatic_action,
                programmatic_reason=programmatic_reason,
            )
            if result:
                logger.info(f"Gemini reasoning: {result.get('decision')} (confidence: {result.get('confidence')})")
                return result
        except Exception as e:
            logger.warning(f"Gemini API error, using deterministic fallback: {e}")
    
    # Deterministic fallback
    result = _deterministic_reasoning(
        condition_met=condition_met,
        alert_state=alert_state,
        programmatic_action=programmatic_action,
        programmatic_reason=programmatic_reason,
        current_price=current_price,
        target_price=target_price,
        price_change_pct=price_change_pct,
    )
    logger.info(f"Deterministic reasoning: {result.get('decision')}")
    return result


async def _call_gemini(
    api_key: str,
    **kwargs,
) -> Optional[Dict[str, Any]]:
    """Call Gemini API for reasoning."""
    import httpx
    
    prompt = _build_reasoning_prompt(**kwargs)
    
    # Use gemini-1.5-flash (free tier, fast)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 256,
            "responseMimeType": "application/json",
        },
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
    
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    
    # Clean up response
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    
    result = json.loads(text)
    
    # Validate required fields
    required = {"decision", "reason", "confidence", "recommended_action"}
    if not required.issubset(result.keys()):
        raise ValueError(f"Gemini response missing fields: {required - result.keys()}")
    
    return result
