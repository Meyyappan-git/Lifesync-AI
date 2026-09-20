import io
import pytest
from app.services.ocr_service import extract_text_from_file, parse_structured_metadata, classify_document_folder
from app.services.rag_retriever import chunk_text, TextChunk, cosine_similarity, compute_tf, tokenize


def test_ocr_text_and_metadata_extraction():
    # Test plain text / document parsing
    sample_text = (
        "OFFICIAL PASSPORT COPY\n"
        "Passport Number: Z8849102\n"
        "Name: Meyyappan KP\n"
        "Issue Date: 15/05/2022\n"
        "Expiry Date: 2032-05-15\n"
        "Country: IND"
    )
    bytes_data = sample_text.encode("utf-8")
    extracted_text = extract_text_from_file(bytes_data, "txt", "passport_copy.txt")
    assert "Passport Number" in extracted_text

    metadata = parse_structured_metadata(extracted_text, "passport_copy.txt")
    assert metadata.get("passport_number") == "Z8849102"
    assert metadata.get("expiry_date") == "2032-05-15"

    folder = classify_document_folder("passport_copy.txt", extracted_text, metadata)
    assert folder == "Travel"


def test_sliding_window_chunking():
    words = [f"word{i}" for i in range(600)]
    long_text = " ".join(words)

    chunks = chunk_text(long_text, chunk_size_words=200, overlap_words=50)
    assert len(chunks) >= 3
    # Check that overlap exists
    c1_words = chunks[0].split()
    c2_words = chunks[1].split()
    assert c1_words[-10] in c2_words


def test_rag_tf_and_cosine():
    tokens1 = tokenize("Passport renewal document valid until 2031")
    tokens2 = tokenize("Where is my passport expiry date")
    tf1 = compute_tf(tokens1)
    tf2 = compute_tf(tokens2)

    sim = cosine_similarity(tf1, tf2)
    assert sim > 0.1
