"""
Dual AI Reasoning Engine using Google Gemini API + Groq (Llama 3/Qwen) with Consensus & Fallback.
"""
import os
import json
import logging
import asyncio
from typing import Optional, Dict, Any, List
import httpx
from dotenv import load_dotenv

load_dotenv()

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
    """Build structured prompt for LLM reasoning."""
    condition_labels = {
        "price_below_target": "Price falls below target",
        "price_reaches_target": "Price reaches target",
        "price_in_range": "Price enters acceptable range",
        "discount_reaches_percent": "Discount reaches threshold",
        "price_drops_by_percent": "Price drops by percentage",
    }
    condition_label = condition_labels.get(condition, condition)

    prev_str = f"₹{previous_price:,.0f}" if previous_price else "N/A"
    curr_str = f"₹{current_price:,.0f}"
    target_str = f"₹{target_price:,.0f}" if target_price else "N/A"

    return f"""You are an autonomous AI price monitoring agent. Analyze this price monitoring situation and return a JSON decision.

Product: {product_name}
Previous Price: {prev_str}
Current Price: {curr_str}
Target Price: {target_str}
Price Change: {price_change_pct:+.2f}%
Monitoring Condition: {condition_label}
Previous Alert State: {alert_state}
Condition Met (Programmatic): {condition_met}
Programmatic Decision: {programmatic_action}

Based on this analysis, return ONLY a JSON object with these fields:
{{
  "decision": "ALERT" or "NO_ALERT",
  "reason": "clear, concise explanation of the decision",
  "confidence": 0.0-1.0,
  "recommended_action": "SEND_NOTIFICATION" or "NO_ACTION"
}}

Rules:
- If condition_met is True and alert_state is NOT_TRIGGERED: decision = ALERT
- If condition_met is True and alert_state is ALERT_SENT: decision = NO_ALERT (anti-duplicate protection)
- If condition_met is False: decision = NO_ALERT
- confidence should reflect certainty level (0.85 - 0.99)
- reason should be human-readable and professional

Return ONLY the valid JSON, no markdown formatting."""


def _deterministic_reasoning(
    condition_met: bool,
    alert_state: str,
    programmatic_action: str,
    programmatic_reason: str,
    current_price: float,
    target_price: Optional[float],
    price_change_pct: float,
) -> Dict[str, Any]:
    """Fallback deterministic reasoning when external LLM APIs are offline."""
    if not condition_met:
        return {
            "decision": "NO_ALERT",
            "reason": programmatic_reason,
            "confidence": 0.95,
            "recommended_action": "NO_ACTION",
            "model": "Deterministic Rule Engine",
        }

    if alert_state in ("ALERT_SENT", "WAITING_FOR_STATE_CHANGE"):
        return {
            "decision": "NO_ALERT",
            "reason": "Condition is met but alert was already dispatched. Waiting for state reset before alerting again.",
            "confidence": 0.99,
            "recommended_action": "NO_ACTION",
            "model": "Deterministic Rule Engine",
        }

    price_str = f"₹{current_price:,.0f}"
    target_str = f"₹{target_price:,.0f}" if target_price else "target"
    change_str = f"{price_change_pct:+.1f}%" if price_change_pct != 0 else "target met"

    reason = f"Current price {price_str} satisfies condition (Target: {target_str}). Price change: {change_str}."
    return {
        "decision": "ALERT",
        "reason": reason,
        "confidence": 0.97,
        "recommended_action": "SEND_NOTIFICATION",
        "model": "Deterministic Rule Engine",
    }


async def _call_groq(api_key: str, **kwargs) -> Optional[Dict[str, Any]]:
    """Call Groq API (High-speed Qwen/Llama) for price reasoning."""
    prompt = _build_reasoning_prompt(**kwargs)
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "qwen/qwen3.8-27b",
        "messages": [
            {
                "role": "system",
                "content": "You are a professional price monitoring agent. Output valid JSON only with keys: decision, reason, confidence, recommended_action.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 256,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                result = json.loads(content)
                result["model"] = "Groq Qwen 27B"
                return result
    except Exception as e:
        logger.warning(f"Groq API call failed: {e}")
    return None


async def _call_gemini(api_key: str, **kwargs) -> Optional[Dict[str, Any]]:
    """Call Google Gemini API for price reasoning."""
    prompt = _build_reasoning_prompt(**kwargs)
    models = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-pro-latest"]

    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 256,
                "responseMimeType": "application/json",
            },
        }
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    result = json.loads(text)
                    result["model"] = f"Google Gemini ({model})"
                    return result
        except Exception:
            continue
    return None


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
    Run Dual AI Reasoning (Groq + Gemini) with consensus validation
    and deterministic fallback.
    """
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()

    kwargs = {
        "product_name": product_name,
        "current_price": current_price,
        "previous_price": previous_price,
        "target_price": target_price,
        "condition": condition,
        "price_change_pct": price_change_pct,
        "alert_state": alert_state,
        "condition_met": condition_met,
        "programmatic_action": programmatic_action,
        "programmatic_reason": programmatic_reason,
    }

    tasks = []
    if groq_key:
        tasks.append(_call_groq(groq_key, **kwargs))
    if gemini_key:
        tasks.append(_call_gemini(gemini_key, **kwargs))

    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        valid_results = [r for r in results if isinstance(r, dict) and r.get("decision")]

        # Case 1: Both LLMs succeeded -> Compute Consensus
        if len(valid_results) >= 2:
            r1, r2 = valid_results[0], valid_results[1]
            agree = r1.get("decision") == r2.get("decision")
            consensus_decision = r1.get("decision") if agree else programmatic_action
            consensus_confidence = 0.99 if agree else max(r1.get("confidence", 0.9), r2.get("confidence", 0.9))

            logger.info(f"🧠 Dual AI Consensus ({r1.get('model')} + {r2.get('model')}): {consensus_decision} (Agreement: {agree})")
            return {
                "decision": consensus_decision,
                "reason": r1.get("reason") or r2.get("reason"),
                "confidence": consensus_confidence,
                "recommended_action": "SEND_NOTIFICATION" if consensus_decision == "ALERT" else "NO_ACTION",
                "model": "Dual AI Consensus (Groq + Gemini)",
                "consensus_agreement": agree,
            }

        # Case 2: One LLM succeeded
        if len(valid_results) == 1:
            single = valid_results[0]
            logger.info(f"🧠 Single AI Reasoning ({single.get('model')}): {single.get('decision')}")
            return single

    # Case 3: Fallback to deterministic rules
    result = _deterministic_reasoning(
        condition_met=condition_met,
        alert_state=alert_state,
        programmatic_action=programmatic_action,
        programmatic_reason=programmatic_reason,
        current_price=current_price,
        target_price=target_price,
        price_change_pct=price_change_pct,
    )
    logger.info(f"⚙️ Deterministic Fallback: {result.get('decision')}")
    return result
