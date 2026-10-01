"""
Product search routes — now with full match scoring & attribute extraction.
"""
from fastapi import APIRouter, Query, HTTPException
from typing import List
from app.agent.tools.product_search import search_products
from app.agent.tools.product_matcher import extract_product_attributes

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("/search")
async def search_products_endpoint(q: str = Query(..., min_length=1)):
    """
    Search products across all configured sources.
    Returns results ranked by match score with extracted attributes.
    """
    try:
        # First extract what the user is actually asking for
        query_attrs = extract_product_attributes(q)

        results = await search_products(q)

        return {
            "query": q,
            "query_attributes": {
                "brand":      query_attrs.brand,
                "model":      query_attrs.model,
                "generation": query_attrs.generation,
                "storage":    query_attrs.storage,
                "ram":        query_attrs.ram,
                "color":      query_attrs.color,
                "category":   query_attrs.category,
                "variant":    query_attrs.variant,
            },
            "results": results,
            "count": len(results),
            "has_exact_match": any(r.get("match_label") == "EXACT" for r in results),
            "has_strong_match": any(r.get("match_label") in ("EXACT", "STRONG") for r in results),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
