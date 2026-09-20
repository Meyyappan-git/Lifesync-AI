import pytest
from app.services.rag.postprocess import mask_pii

def test_mask_pii():
    assert mask_pii("My SSN is 123-456-7890.") == "My SSN is XXXXXX7890."
    assert mask_pii("Card 4532 1234 5678 9012") == "Card XXXXXXXXXXXX9012"
    assert mask_pii("Passport A1234567") == "Passport A1234567" # Not long enough digits to mask with heuristic maybe, or depends on rules

def test_intent_classification():
    from app.services.rag.query_understanding import understand_query
    res = understand_query("What is the expiry date of my passport?")
    assert res.intent in ["fact_lookup", "deadline"]
    assert res.target_entity is not None

def test_text_cleaning():
    # To be implemented if document_parser is updated
    pass
