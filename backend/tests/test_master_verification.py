import pytest
import pymupdf

from app.models.models import Document, DocumentStatus
from app.rag.loader import extract_pdf_pages
from app.rag.splitter import split_pdf_pages
from app.rag.vector_store import vector_store
from app.rag.chain import run_rag_chain, run_intelligence_chain

def test_master_verification_suite(client, auth_headers, test_user, db, tmp_path):
    # 1. Create realistic AI course material PDF matching 22AI501_LM1-25-26.pdf
    pdf_path = str(tmp_path / "22AI501_LM1-25-26.pdf")
    doc_pdf = pymupdf.open()

    p1 = doc_pdf.new_page()
    p1.insert_text((50, 50), "MODULE 1: INTELLIGENT AGENTS AND AI FUNDAMENTALS\n\nPage 1\nAn intelligent agent is an autonomous entity that perceives its environment through sensors and acts upon that environment using actuators. Rational agents always choose actions that maximize expected performance metrics given their percept sequence history.")

    p2 = doc_pdf.new_page()
    p2.insert_text((50, 50), "Page 2\nThe four basic agent architectures are: 1. Simple Reflex Agents 2. Model-based Reflex Agents 3. Goal-based Agents 4. Utility-based Agents. Environment types include fully observable vs partially observable, deterministic vs stochastic, static vs dynamic, discrete vs continuous, and single-agent vs multi-agent.")

    doc_pdf.save(pdf_path)
    doc_pdf.close()

    # 2. Register Document DB record
    doc_rec = Document(
        user_id=test_user.id,
        filename="22AI501_LM1-25-26.pdf",
        original_filename="22AI501_LM1-25-26.pdf",
        file_size=2048,
        page_count=2,
        storage_path=pdf_path,
        status=DocumentStatus.READY.value
    )
    db.add(doc_rec)
    db.commit()
    db.refresh(doc_rec)

    # 3. Process & Vector Index Chunks
    pages = extract_pdf_pages(pdf_path)
    chunks = split_pdf_pages(pages, doc_rec.id, "22AI501_LM1-25-26.pdf")
    vector_store.add_chunks(test_user.id, doc_rec.id, chunks)

    # TEST 1: Normal Chat Query
    answer1, sources1 = run_rag_chain(test_user.id, "What is an intelligent agent?", document_ids=[doc_rec.id])
    assert len(answer1) > 0
    assert "agent" in answer1.lower()
    assert len(sources1) > 0

    # TEST 2: Document Summary
    res_summary = run_intelligence_chain(test_user.id, doc_rec.id, "summary")
    assert "Executive Summary" in res_summary.title
    assert len(res_summary.content) > 0

    # TEST 3: Key Points
    res_kp = run_intelligence_chain(test_user.id, doc_rec.id, "key_points")
    assert "Key Points" in res_kp.title
    assert len(res_kp.content) > 0

    # TEST 4: Important Questions (Bug 1 Fix)
    res_iq = run_intelligence_chain(test_user.id, doc_rec.id, "important_questions")
    assert "Important Study Questions" in res_iq.title
    assert res_iq.important_questions is not None or len(res_iq.content) > 0

    # TEST 5: Exam Questions (Bug 2 Fix)
    res_eq = run_intelligence_chain(test_user.id, doc_rec.id, "exam_questions")
    assert "Practice Exam" in res_eq.title
    assert res_eq.exam_sections is not None or len(res_eq.content) > 0

    # TEST 6: Practice Quiz (Bug 3 Fix)
    res_quiz = run_intelligence_chain(test_user.id, doc_rec.id, "quiz")
    assert "Practice Quiz" in res_quiz.title
    assert res_quiz.quiz_questions is not None or len(res_quiz.content) > 0

    # TEST 7: Flashcards (Bug 5 Fix)
    res_fc = run_intelligence_chain(test_user.id, doc_rec.id, "flashcards", num_questions=10, difficulty="medium")
    assert "Flashcards" in res_fc.title
    assert res_fc.flashcards is not None or len(res_fc.content) > 0

    # TEST 8: Custom Questions (Bug 6 Fix)
    res_cq = run_intelligence_chain(test_user.id, doc_rec.id, "custom_questions", num_questions=5, difficulty="medium")
    assert "Custom" in res_cq.title
    assert res_cq.custom_questions is not None or len(res_cq.content) > 0

    # TEST 9: Explain Simply (Bug 4 Fix — English, Tamil, Tanglish)
    res_es_en = run_intelligence_chain(test_user.id, doc_rec.id, "explain_simply", target_level="college", target_language="english", concept_query="Rational Agent")
    assert len(res_es_en.content) > 0

    res_es_tanglish = run_intelligence_chain(test_user.id, doc_rec.id, "explain_simply", target_level="college", target_language="tanglish", concept_query="Rational Agent")
    assert len(res_es_tanglish.content) > 0

    # TEST 10: Insights (Bug 7 Fix)
    res_insights = run_intelligence_chain(test_user.id, doc_rec.id, "insights")
    assert "Insights" in res_insights.title
    assert res_insights.insights is not None or len(res_insights.content) > 0

    # TEST 11: Non-existent concept grounding check
    res_es_ungrounded = run_intelligence_chain(test_user.id, doc_rec.id, "explain_simply", concept_query="Quantum Superposition Teleportation Protocol")
    assert "couldn't find" in res_es_ungrounded.content.lower() or "not" in res_es_ungrounded.content.lower()
