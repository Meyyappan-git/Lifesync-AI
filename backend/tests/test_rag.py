import pytest
from app.services.rag.postprocess import mask_pii

def test_mask_pii():
    assert mask_pii("My SSN is 123-456-7890.") == "My SSN is XXX-XXX-7890."
    assert mask_pii("Card 4532 1234 5678 9012") == "Card XXXX XXXX XXXX 9012"
    assert mask_pii("Passport A1234567") == "Passport A1234567"


def test_intent_classification():
    from app.services.rag.query_understanding import understand_query
    res = understand_query("What is the expiry date of my passport?")
    assert res.intent in ["fact_lookup", "deadline"]
    assert hasattr(res, "target_entity")

def test_text_cleaning():
    pass

