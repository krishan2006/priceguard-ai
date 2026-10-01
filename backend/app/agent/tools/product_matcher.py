"""
Product Attribute Extraction & Fuzzy Matching Engine.

Extracts brand, model, storage, RAM, color, variant from raw strings.
Computes a weighted match score [0-1] between a user query and a candidate product.
"""

import re
import logging
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Tuple

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# KNOWN ENTITY DICTIONARIES
# ─────────────────────────────────────────────────────────────

BRANDS: Dict[str, List[str]] = {
    "apple":    ["apple", "iphone", "ipad", "macbook", "imac", "ipod", "airpods", "apple watch"],
    "samsung":  ["samsung", "galaxy"],
    "google":   ["google", "pixel"],
    "oneplus":  ["oneplus", "one plus"],
    "xiaomi":   ["xiaomi", "redmi", "poco", "mi "],
    "realme":   ["realme"],
    "oppo":     ["oppo"],
    "vivo":     ["vivo"],
    "motorola": ["motorola", "moto "],
    "nokia":    ["nokia"],
    "sony":     ["sony", "xperia", "wh-", "wf-", "wh1000"],
    "hp":       ["hp ", "hewlett", "victus", "omen", "envy", "pavilion", "spectre"],
    "dell":     ["dell", "inspiron", "xps", "latitude", "vostro", "alienware"],
    "lenovo":   ["lenovo", "thinkpad", "ideapad", "legion", "yoga"],
    "asus":     ["asus", "rog ", "tuf ", "zenbook", "vivobook"],
    "acer":     ["acer", "nitro", "aspire", "predator", "swift"],
    "msi":      ["msi "],
    "lg":       ["lg "],
    "bosch":    ["bosch"],
    "dyson":    ["dyson"],
    "nike":     ["nike", "air max", "air force", "jordan"],
    "adidas":   ["adidas", "ultraboost", "superstar"],
    "boat":     ["boat "],
    "jbl":      ["jbl "],
    "bose":     ["bose "],
    "sennheiser":["sennheiser"],
    "nothing":  ["nothing phone"],
}

STORAGE_PATTERN = re.compile(
    r'\b(\d+)\s*(GB|TB|MB)\b', re.IGNORECASE
)
RAM_PATTERN = re.compile(
    r'\b(\d+)\s*GB\s*RAM\b|\bRAM\s*(\d+)\s*GB\b|\b(\d+)\s*GB\s*/\s*(\d+)\s*GB\b',
    re.IGNORECASE,
)
COLOR_KEYWORDS = [
    "black", "white", "silver", "gold", "blue", "red", "green", "purple",
    "pink", "yellow", "orange", "grey", "gray", "rose", "midnight",
    "starlight", "graphite", "titanium", "natural", "space", "coral",
    "lavender", "cream", "brown", "beige", "phantom",
]
GENERATION_PATTERN = re.compile(
    r'\b(pro\s*max|pro|plus|ultra|lite|mini|max|air|se|fe|neo|note|fold|flip|edge)\b',
    re.IGNORECASE,
)


# ─────────────────────────────────────────────────────────────
# DATA CLASSES
# ─────────────────────────────────────────────────────────────

@dataclass
class ProductAttributes:
    raw: str = ""
    normalized: str = ""
    brand: Optional[str] = None
    model: Optional[str] = None
    generation: Optional[str] = None        # Pro, Max, Ultra, Lite …
    storage: Optional[str] = None           # "128GB", "512GB", "1TB"
    ram: Optional[str] = None               # "16GB RAM"
    color: Optional[str] = None
    size: Optional[str] = None              # shoe size, screen size
    variant: Optional[str] = None           # combined model+generation
    category: Optional[str] = None
    extra_tokens: List[str] = field(default_factory=list)

    def summary(self) -> str:
        parts = [p for p in [
            self.brand, self.model, self.generation,
            self.storage, self.ram, self.color
        ] if p]
        return " ".join(parts) if parts else self.normalized


@dataclass
class MatchResult:
    product: dict
    attributes: ProductAttributes
    score: float
    score_breakdown: Dict[str, float]
    match_label: str         # EXACT / STRONG / POSSIBLE / WEAK
    is_recommended: bool


# ─────────────────────────────────────────────────────────────
# NORMALISATION HELPERS
# ─────────────────────────────────────────────────────────────

def _normalize_text(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _tokenize(text: str) -> List[str]:
    return _normalize_text(text).split()


def _token_overlap_ratio(a: str, b: str) -> float:
    """Jaccard-style token overlap between two strings."""
    ta = set(_tokenize(a))
    tb = set(_tokenize(b))
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def _substring_score(needle: str, haystack: str) -> float:
    """Returns 1.0 if needle tokens are all inside haystack tokens."""
    needle_tokens = set(_tokenize(needle))
    hay_tokens = set(_tokenize(haystack))
    if not needle_tokens:
        return 0.0
    matched = needle_tokens & hay_tokens
    return len(matched) / len(needle_tokens)


# ─────────────────────────────────────────────────────────────
# ATTRIBUTE EXTRACTION
# ─────────────────────────────────────────────────────────────

def extract_product_attributes(text: str) -> ProductAttributes:
    """
    Extract structured attributes from a raw product name or search query.
    """
    raw = text.strip()
    norm = _normalize_text(raw)
    attrs = ProductAttributes(raw=raw, normalized=norm)

    # 1. Brand detection
    for brand, aliases in BRANDS.items():
        for alias in aliases:
            if alias in norm:
                attrs.brand = brand
                break
        if attrs.brand:
            break

    # 2. Storage (prefer value adjacent to SSD/HDD, skip RAM values)
    storage_matches = STORAGE_PATTERN.findall(norm)
    if storage_matches:
        # First pass: look for explicit SSD/HDD/NVMe storage
        ssd_pattern = re.compile(
            r'\b(\d+)\s*(GB|TB)\s*(?:ssd|hdd|nvme|emmc|ufs|rom|storage)\b', re.IGNORECASE
        )
        ssd_match = ssd_pattern.search(norm)
        if ssd_match:
            attrs.storage = f"{ssd_match.group(1)}{ssd_match.group(2).upper()}"
        else:
            # Second pass: pick first GB/TB value NOT immediately followed or preceded by "ram"
            for val, unit in storage_matches:
                candidate = f"{val}{unit.upper()}"
                pos = norm.find(val)
                context_before = norm[max(0, pos - 5): pos]
                context_after = norm[pos + len(val): pos + len(val) + 8]
                if "ram" not in context_before and "ram" not in context_after:
                    attrs.storage = candidate
                    break
            # If still not found, take last match (larger value usually = storage)
            if not attrs.storage and storage_matches:
                attrs.storage = f"{storage_matches[-1][0]}{storage_matches[-1][1].upper()}"

    # 3. RAM
    ram_match = RAM_PATTERN.search(raw)
    if ram_match:
        groups = [g for g in ram_match.groups() if g]
        if groups:
            attrs.ram = f"{groups[-1]}GB RAM"

    # 4. Color
    for color in COLOR_KEYWORDS:
        if re.search(r'\b' + color + r'\b', norm):
            attrs.color = color.capitalize()
            break

    # 5. Generation/variant keywords (Pro Max > Pro > Max > Ultra …)
    gen_priority = [
        "pro max", "pro", "ultra", "plus", "max", "lite", "mini",
        "air", "se", "fe", "neo", "note", "fold", "flip", "edge",
    ]
    for gen in gen_priority:
        if re.search(r'\b' + re.escape(gen) + r'\b', norm):
            attrs.generation = gen.title()
            break

    # 6. Model (hard — heuristic: remove brand tokens, gen, storage, color,
    #    what remains is model + model number)
    working = norm
    if attrs.brand:
        for alias in BRANDS[attrs.brand]:
            working = working.replace(alias, " ")
    if attrs.generation:
        working = re.sub(r'\b' + re.escape(attrs.generation.lower()) + r'\b', " ", working)
    if attrs.storage:
        working = re.sub(r'\b' + re.escape(attrs.storage.lower()) + r'\b', " ", working, flags=re.IGNORECASE)
    if attrs.color:
        working = re.sub(r'\b' + attrs.color.lower() + r'\b', " ", working)
    working = re.sub(r'\b(ram|gb|tb|mb|ssd|hdd|nvme|display|screen|inch)\b', " ", working)
    working = re.sub(r'\s+', " ", working).strip()
    # Remaining meaningful tokens → model
    tokens = [t for t in working.split() if len(t) > 1]
    if tokens:
        attrs.model = " ".join(tokens)

    # 7. Variant = model + generation combined
    parts = [p for p in [attrs.model, attrs.generation] if p]
    attrs.variant = " ".join(parts) if parts else attrs.model

    # 8. Category inference
    norm_full = norm
    if any(k in norm_full for k in ["phone", "iphone", "galaxy", "pixel", "oneplus", "redmi", "poco"]):
        attrs.category = "smartphone"
    elif any(k in norm_full for k in ["laptop", "notebook", "macbook", "thinkpad", "victus", "omen", "legion"]):
        attrs.category = "laptop"
    elif any(k in norm_full for k in ["airpods", "earbuds", "headphone", "wh-", "wf-", "buds"]):
        attrs.category = "audio"
    elif any(k in norm_full for k in ["ipad", "tab", "tablet"]):
        attrs.category = "tablet"
    elif any(k in norm_full for k in ["watch", "band", "smartwatch"]):
        attrs.category = "wearable"
    elif any(k in norm_full for k in ["shoe", "sneaker", "boot", "air max", "ultraboost"]):
        attrs.category = "footwear"

    return attrs


# ─────────────────────────────────────────────────────────────
# MATCH SCORE CALCULATION
# ─────────────────────────────────────────────────────────────

# Weights must sum to 1.0
WEIGHT_BRAND    = 0.20
WEIGHT_MODEL    = 0.30
WEIGHT_VARIANT  = 0.15
WEIGHT_STORAGE  = 0.12
WEIGHT_RAM      = 0.08
WEIGHT_COLOR    = 0.05
WEIGHT_CATEGORY = 0.05
WEIGHT_FALLBACK = 0.05   # raw string overlap fallback


def calculate_match_score(
    query_attrs: ProductAttributes,
    candidate: dict,
) -> Tuple[float, Dict[str, float]]:
    """
    Calculate weighted similarity score between user query and candidate product.

    Returns (total_score, breakdown_dict).
    """
    cand_text = " ".join(filter(None, [
        candidate.get("name", ""),
        candidate.get("brand", ""),
        candidate.get("category", ""),
        candidate.get("description", ""),
    ]))
    cand_attrs = extract_product_attributes(cand_text)
    breakdown: Dict[str, float] = {}

    # Brand
    if query_attrs.brand and cand_attrs.brand:
        breakdown["brand"] = 1.0 if query_attrs.brand == cand_attrs.brand else 0.0
    elif query_attrs.brand:
        # Check raw text of candidate
        if query_attrs.brand in _normalize_text(cand_text):
            breakdown["brand"] = 0.8
        else:
            breakdown["brand"] = 0.0
    else:
        breakdown["brand"] = 0.5  # unknown brand — neutral

    # Model (token overlap between query model and candidate name)
    if query_attrs.model:
        breakdown["model"] = _substring_score(query_attrs.model, cand_text)
    else:
        # Full normalized query overlap with candidate name
        breakdown["model"] = _token_overlap_ratio(query_attrs.normalized, candidate.get("name", ""))

    # Variant / generation
    if query_attrs.generation:
        cand_norm = _normalize_text(candidate.get("name", ""))
        if query_attrs.generation.lower() in cand_norm:
            breakdown["variant"] = 1.0
        else:
            # Penalize if candidate has a DIFFERENT generation
            other_gens = [g for g in ["pro max", "pro", "ultra", "plus", "lite", "mini", "se"]
                          if g != query_attrs.generation.lower() and g in cand_norm]
            breakdown["variant"] = 0.0 if other_gens else 0.4
    else:
        breakdown["variant"] = 0.6  # no generation specified — don't penalize

    # Storage
    if query_attrs.storage:
        cand_name_norm = _normalize_text(candidate.get("name", "") + " " + candidate.get("description", ""))
        if query_attrs.storage.lower() in cand_name_norm:
            breakdown["storage"] = 1.0
        else:
            # Check if a DIFFERENT storage variant is present — penalize
            other_storages = STORAGE_PATTERN.findall(cand_name_norm)
            breakdown["storage"] = 0.0 if other_storages else 0.5
    else:
        breakdown["storage"] = 0.6

    # RAM
    if query_attrs.ram:
        cand_norm = _normalize_text(candidate.get("name", "") + " " + candidate.get("description", ""))
        breakdown["ram"] = 1.0 if query_attrs.ram.lower().replace(" ram", "") in cand_norm else 0.3
    else:
        breakdown["ram"] = 0.6

    # Color
    if query_attrs.color:
        cand_norm = _normalize_text(candidate.get("name", "") + " " + candidate.get("description", ""))
        if query_attrs.color.lower() in cand_norm:
            breakdown["color"] = 1.0
        else:
            # No color info in candidate — mildly penalize
            breakdown["color"] = 0.4
    else:
        breakdown["color"] = 0.6

    # Category
    if query_attrs.category and cand_attrs.category:
        breakdown["category"] = 1.0 if query_attrs.category == cand_attrs.category else 0.0
    else:
        breakdown["category"] = 0.5

    # Fallback raw overlap
    breakdown["fallback"] = _token_overlap_ratio(query_attrs.normalized, _normalize_text(candidate.get("name", "")))

    # Weighted sum
    total = (
        breakdown["brand"]    * WEIGHT_BRAND +
        breakdown["model"]    * WEIGHT_MODEL +
        breakdown["variant"]  * WEIGHT_VARIANT +
        breakdown["storage"]  * WEIGHT_STORAGE +
        breakdown["ram"]      * WEIGHT_RAM +
        breakdown["color"]    * WEIGHT_COLOR +
        breakdown["category"] * WEIGHT_CATEGORY +
        breakdown["fallback"] * WEIGHT_FALLBACK
    )
    return round(min(total, 1.0), 4), breakdown


def _score_to_label(score: float) -> str:
    if score >= 0.90:
        return "EXACT"
    if score >= 0.75:
        return "STRONG"
    if score >= 0.60:
        return "POSSIBLE"
    return "WEAK"


def rank_product_matches(
    query: str,
    candidates: List[dict],
    top_n: int = 10,
) -> List[MatchResult]:
    """
    Rank all candidate products against the user query.

    Returns list of MatchResult sorted by score descending.
    """
    query_attrs = extract_product_attributes(query)
    results: List[MatchResult] = []

    for cand in candidates:
        score, breakdown = calculate_match_score(query_attrs, cand)
        label = _score_to_label(score)
        results.append(MatchResult(
            product=cand,
            attributes=extract_product_attributes(
                " ".join(filter(None, [cand.get("name", ""), cand.get("brand", "")]))
            ),
            score=score,
            score_breakdown=breakdown,
            match_label=label,
            is_recommended=(label in ("EXACT", "STRONG")),
        ))

    results.sort(key=lambda r: r.score, reverse=True)
    return results[:top_n]


def find_best_match(query: str, candidates: List[dict]) -> Optional[MatchResult]:
    """Return the single best match if score >= 0.60, else None."""
    ranked = rank_product_matches(query, candidates, top_n=1)
    if ranked and ranked[0].score >= 0.60:
        return ranked[0]
    return None
