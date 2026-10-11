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


def test_classifier_avoids_substring_collisions():
    # 1. 'dl' in 'idle' or 'download' or 'guideline' should NOT classify as Vehicle
    text = "Guidelines for team work and idle time reduction during software project sprints."
    meta = parse_structured_metadata(text, "workplace_guidelines.txt")
    folder = classify_document_folder("workplace_guidelines.txt", text, meta)
    assert folder != "Vehicle"
    assert folder in ["Employment", "Education", "General", "Finance"]

    # 2. 'car' in 'care' (healthcare) should classify as Health, NOT Vehicle
    care_text = "Primary health care patient checkup at St Jude Hospital clinic. Doctor prescription dosage."
    care_meta = parse_structured_metadata(care_text, "health_care_plan.txt")
    care_folder = classify_document_folder("health_care_plan.txt", care_text, care_meta)
    assert care_folder == "Health"

    # 3. 'car' in 'credit card' or 'debit card' should classify as Finance, NOT Vehicle
    card_text = "Monthly credit card account statement for Bank of India. Transaction summary and balance."
    card_meta = parse_structured_metadata(card_text, "card_statement.txt")
    card_folder = classify_document_folder("card_statement.txt", card_text, card_meta)
    assert card_folder == "Finance"


def test_classifier_resolves_custom_user_folders_with_synonyms():
    # User has custom folders with human names
    user_folders = [
        "Medical Records",
        "Passports & Visas",
        "Car Docs & RC",
        "Tax Invoices",
        "Work Contracts",
        "College Degrees"
    ]

    # Health -> Medical Records
    health_text = "Hospital discharge summary. Patient diagnosis report and prescription medicine."
    h_meta = parse_structured_metadata(health_text, "hospital_bill.pdf")
    h_folder = classify_document_folder("hospital_bill.pdf", health_text, h_meta, user_folders)
    assert h_folder == "Medical Records"

    # Travel -> Passports & Visas
    travel_text = "Flight ticket booking confirmation PNR AB9812. Terminal 3 boarding pass."
    t_meta = parse_structured_metadata(travel_text, "flight_ticket.pdf")
    t_folder = classify_document_folder("flight_ticket.pdf", travel_text, t_meta, user_folders)
    assert t_folder == "Passports & Visas"

    # Vehicle -> Car Docs & RC
    veh_text = "Vehicle registration certificate RC book. Motor driving license copy."
    v_meta = parse_structured_metadata(veh_text, "vehicle_rc.pdf")
    v_folder = classify_document_folder("vehicle_rc.pdf", veh_text, v_meta, user_folders)
    assert v_folder == "Car Docs & RC"

    # Finance -> Tax Invoices
    fin_text = "Income tax return ITR filing acknowledgement and bank statement."
    f_meta = parse_structured_metadata(fin_text, "itr_2025.pdf")
    f_folder = classify_document_folder("itr_2025.pdf", fin_text, f_meta, user_folders)
    assert f_folder == "Tax Invoices"

