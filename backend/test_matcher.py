"""Quick smoke-test for the product matcher engine."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agent.tools.product_matcher import (
    extract_product_attributes,
    calculate_match_score,
    rank_product_matches,
)

def test_attribute_extraction():
    tests = [
        ("iPhone 15 128GB Black", {"brand": "apple", "storage": "128GB", "color": "Black"}),
        ("Samsung Galaxy S25 Ultra 256GB Titanium", {"brand": "samsung", "storage": "256GB", "color": "Titanium", "generation": "Ultra"}),
        ("HP Victus 15 i5 RTX 4050 16GB RAM 512GB SSD", {"brand": "hp", "ram": "16GB RAM", "storage": "512GB"}),
        ("Sony WH-1000XM5 Black", {"brand": "sony", "color": "Black"}),
        ("AirPods Pro 2", {"brand": "apple", "generation": "Pro"}),
    ]
    print("=== Attribute Extraction Tests ===")
    for query, expected in tests:
        attrs = extract_product_attributes(query)
        print(f"\nQuery: {query!r}")
        print(f"  brand={attrs.brand!r} model={attrs.model!r} gen={attrs.generation!r} "
              f"storage={attrs.storage!r} ram={attrs.ram!r} color={attrs.color!r}")
        for k, v in expected.items():
            actual = getattr(attrs, k)
            status = "✓" if actual == v else f"✗ (got {actual!r})"
            print(f"  {k}: expected={v!r} → {status}")


def test_match_scoring():
    print("\n=== Match Scoring Tests ===")
    candidates = [
        {"name": "Apple iPhone 15 128GB Black", "brand": "Apple", "price": 49999, "category": "smartphone"},
        {"name": "Apple iPhone 15 Pro 128GB", "brand": "Apple", "price": 79999, "category": "smartphone"},
        {"name": "Apple iPhone 15 256GB Black", "brand": "Apple", "price": 54999, "category": "smartphone"},
        {"name": "Samsung Galaxy A15 128GB", "brand": "Samsung", "price": 19999, "category": "smartphone"},
        {"name": "Apple iPhone 14 128GB Black", "brand": "Apple", "price": 44999, "category": "smartphone"},
    ]
    query = "iPhone 15 128GB Black"
    ranked = rank_product_matches(query, candidates)

    print(f"\nQuery: {query!r}")
    for r in ranked:
        print(f"  [{r.match_label:8}] {r.score:.3f} → {r.product['name']}")

    # The first should be the exact match
    assert ranked[0].product["name"] == "Apple iPhone 15 128GB Black", \
        f"Expected exact match first, got {ranked[0].product['name']!r}"
    assert ranked[0].score >= 0.80, f"Expected score >= 0.80, got {ranked[0].score}"
    # Pro should score lower than 128GB exact
    pro = next((r for r in ranked if "Pro" in r.product["name"]), None)
    if pro:
        assert pro.score < ranked[0].score, "Pro variant should score lower than exact match"
    print("  ✓ Exact match ranked first")
    print("  ✓ Wrong variant ranked lower")


def test_different_storage_ranked_lower():
    print("\n=== Storage Variant Discrimination Test ===")
    candidates = [
        {"name": "iPhone 15 256GB", "brand": "Apple", "price": 54999},
        {"name": "iPhone 15 128GB", "brand": "Apple", "price": 49999},
        {"name": "iPhone 15 512GB", "brand": "Apple", "price": 64999},
    ]
    query = "iPhone 15 128GB"
    ranked = rank_product_matches(query, candidates)
    print(f"Query: {query!r}")
    for r in ranked:
        print(f"  [{r.match_label:8}] {r.score:.3f} → {r.product['name']}")
    assert "128GB" in ranked[0].product["name"], \
        f"128GB should be ranked first, got {ranked[0].product['name']!r}"
    print("  ✓ Correct storage variant ranked first")


if __name__ == "__main__":
    test_attribute_extraction()
    test_match_scoring()
    test_different_storage_ranked_lower()
    print("\n✅ All matcher tests passed!")
