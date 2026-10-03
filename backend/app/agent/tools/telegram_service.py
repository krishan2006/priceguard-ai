"""
Telegram Bot Notification Service for PriceGuard AI.

Supports:
1. Live price drop alerts broadcast to Telegram.
2. Auto-discovery of subscriber chat_ids via getUpdates (/start).
3. Periodic server heartbeat messages ('Hello server running - I am working').
"""
import os
import json
import logging
from typing import Set, Optional, Dict, Any
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# File to persist discovered subscriber chat IDs
if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
    SUBSCRIBERS_FILE = "/tmp/telegram_subscribers.json"
else:
    SUBSCRIBERS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "..", "telegram_subscribers.json")
_subscribers: Set[str] = set()

def _load_subscribers() -> Set[str]:
    global _subscribers
    if _subscribers:
        return _subscribers
    
    # 1. Environment variable default
    env_chat = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if env_chat:
        _subscribers.add(env_chat)
        
    # 2. Stored file
    if os.path.exists(SUBSCRIBERS_FILE):
        try:
            with open(SUBSCRIBERS_FILE, "r") as f:
                data = json.load(f)
                _subscribers.update(str(cid) for cid in data)
        except Exception as e:
            logger.warning(f"Could not load telegram subscribers file: {e}")
            
    return _subscribers


def _save_subscribers():
    try:
        with open(SUBSCRIBERS_FILE, "w") as f:
            json.dump(list(_subscribers), f)
    except Exception as e:
        logger.warning(f"Could not save telegram subscribers file: {e}")


def register_subscriber(chat_id: str) -> bool:
    """Manually register a chat ID to the subscribers list."""
    subs = _load_subscribers()
    cid = str(chat_id).strip()
    if cid:
        subs.add(cid)
        _save_subscribers()
        return True
    return False


def get_bot_token() -> str:
    return os.getenv("TELEGRAM_BOT_TOKEN", "").strip()


async def validate_telegram_bot() -> Dict[str, Any]:
    """Test connection to Telegram Bot API."""
    token = get_bot_token()
    if not token:
        return {"connected": False, "error": "TELEGRAM_BOT_TOKEN not configured"}
    
    url = f"https://api.telegram.org/bot{token}/getMe"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            data = resp.json()
            if resp.status_code == 200 and data.get("ok"):
                bot_info = data.get("result", {})
                logger.info(f"✅ Telegram bot connected: @{bot_info.get('username')}")
                return {
                    "connected": True,
                    "bot_name": bot_info.get("first_name"),
                    "username": bot_info.get("username"),
                    "bot_id": bot_info.get("id"),
                }
            return {"connected": False, "error": data.get("description", "Unknown error")}
    except Exception as e:
        return {"connected": False, "error": str(e)}


_last_update_id: int = 0


async def sync_telegram_subscribers() -> int:
    """
    Poll getUpdates to automatically capture chat_ids from any user
    who messaged or started the bot (@Ai_pricing_detectionbot).
    Sends an automated welcome/server running message to new subscribers
    and replies to commands like /start, /status, /check, etc.
    """
    global _last_update_id
    token = get_bot_token()
    if not token:
        return 0

    subs = _load_subscribers()
    url = f"https://api.telegram.org/bot{token}/getUpdates"
    params = {"timeout": 3}
    if _last_update_id > 0:
        params["offset"] = _last_update_id + 1

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                return len(subs)
            data = resp.json()
            updates = data.get("result", [])
            for upd in updates:
                uid = upd.get("update_id")
                if uid and uid > _last_update_id:
                    _last_update_id = uid

                # Extract chat from various Telegram update types
                msg = (
                    upd.get("message")
                    or upd.get("edited_message")
                    or upd.get("channel_post")
                    or upd.get("my_chat_member")
                    or upd.get("chat_member")
                    or (upd.get("callback_query", {}).get("message"))
                    or {}
                )
                chat = msg.get("chat", {})
                cid = str(chat.get("id", ""))
                user_text = (msg.get("text") or "").strip()
                sender_name = chat.get("first_name") or chat.get("username") or "User"

                if cid:
                    is_new = cid not in subs
                    if is_new:
                        subs.add(cid)
                        _save_subscribers()
                        logger.info(f"🎉 New Telegram subscriber registered: {cid} ({sender_name})")

                    # Reply with welcome or status message
                    if is_new or user_text:
                        welcome_msg = (
                            f"🤖 *PriceGuard AI Agent — Online*\n\n"
                            f"Hello {sender_name}! Server is running and actively monitoring prices.\n\n"
                            f"⚡ *Bot Status:* Connected & Working\n"
                            f"📊 *Auto-Alerts:* Enabled\n"
                            f"🕒 *Heartbeats:* Every 10 min\n\n"
                            f"_You will receive live price drops, target alerts, and product insights here._"
                        )
                        await send_telegram_raw(cid, welcome_msg)
    except Exception as e:
        logger.debug(f"Telegram getUpdates sync: {e}")

    return len(subs)


async def send_telegram_raw(chat_id: str, text: str) -> bool:
    """Send raw message to a specific Telegram chat_id."""
    token = get_bot_token()
    if not token:
        return False
    
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                url,
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "Markdown",
                },
            )
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"Failed to send Telegram message to {chat_id}: {e}")
        return False


async def broadcast_telegram_message(text: str) -> int:
    """Broadcast text message to all known Telegram subscribers."""
    # First sync any recent /start messages
    await sync_telegram_subscribers()
    subs = _load_subscribers()
    if not subs:
        logger.info("Telegram: No subscriber chat_ids found yet. Send /start to the bot to subscribe.")
        return 0

    sent_count = 0
    for cid in list(subs):
        success = await send_telegram_raw(cid, text)
        if success:
            sent_count += 1
    return sent_count


async def send_telegram_alert(
    product_name: str,
    current_price: float,
    target_price: Optional[float],
    price_change_pct: float,
    agent_reason: str,
    source: str = "PriceGuard Agent",
) -> int:
    """Send formatted price drop alert to Telegram."""
    target_str = f"₹{target_price:,.0f}" if target_price else "N/A"
    change_str = f"{price_change_pct:+.1f}%" if price_change_pct != 0 else "Condition satisfied"

    msg = (
        "🚨 *PRICEGUARD AI — PRICE DROP ALERT!*\n\n"
        f"📦 *Product:* {product_name}\n"
        f"💰 *Current Price:* ₹{current_price:,.0f}\n"
        f"🎯 *Target Price:* {target_str}\n"
        f"📉 *Change:* {change_str}\n"
        f"🌐 *Source:* {source}\n\n"
        f"🧠 *AI Reasoning:*\n{agent_reason}\n\n"
        "⚡ _Autonomous Price Monitoring System_"
    )
    return await broadcast_telegram_message(msg)


async def send_telegram_heartbeat(active_count: int = 1) -> int:
    """Send periodic 'hello server running / I am working' heartbeat."""
    msg = (
        "🟢 *PriceGuard AI — System Status*\n\n"
        "Hello! Server running and actively monitoring prices.\n"
        f"📊 *Active Monitors:* {active_count}\n"
        "⚡ *Status:* All systems autonomous & healthy.\n"
        "🕒 *Heartbeat:* I am working."
    )
    return await broadcast_telegram_message(msg)
