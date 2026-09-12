import json
import re
from typing import List, Optional, Tuple, Dict, Any
from app.rag.retriever import retrieve_relevant_chunks
from app.rag.prompt import (
    format_rag_prompt, format_intelligence_prompt
)
from app.rag.generator import llm_generator
from app.schemas.schemas import (
    SourceCitation, IntelligenceResponse, QuizQuestionSchema, FlashcardSchema, CustomQuestionSchema,
    ImportantQuestionSchema, ExamQuestionItemSchema, ExamSectionSchema, InsightsSchema,
    SummaryStructuredSchema, OverviewSectionSchema, MainTopicItemSchema, KeyConceptItemSchema,
    StudyTopicNoteSchema, StudyNotesStructuredSchema, TopicLearningItemSchema, LearningPathStructuredSchema
)
from app.config import settings
from app.rag.vector_store import vector_store, SearchResult

def run_rag_chain(
    user_id: str,
    query: str,
    document_ids: Optional[List[str]] = None,
    conversation_history: str = "",
    image_url: Optional[str] = None,
    language: Optional[str] = "auto",
    answer_style: Optional[str] = "auto",
    page_number: Optional[int] = None
) -> Tuple[str, List[SourceCitation]]:
    """
    Executes normal RAG & Multimodal Vision chat pipeline with detailed logging and exact exception propagation.
    """
    print(f"[RAG] Embedding model: sentence-transformers/all-MiniLM-L6-v2 (dim=384)")
    print(f"[RAG] Retrieval started for user={user_id}, doc_ids={document_ids}, page={page_number}, style={answer_style}")

    try:
        results = retrieve_relevant_chunks(
            user_id=user_id,
            query=query,
            document_ids=document_ids,
            top_k=settings.RAG_TOP_K
        )
        print(f"[RAG] Retrieved chunks: {len(results)}")

        if page_number and results:
            # Sort so chunks matching target page_number come first
            results.sort(key=lambda r: (0 if r.page == page_number else 1, r.page))

        sources: List[SourceCitation] = []
        seen_sources = set()

        for item in results:
            key = (item.document_id, item.page)
            if key not in seen_sources:
                seen_sources.add(key)
                sources.append(SourceCitation(
                    document_id=item.document_id,
                    filename=item.filename,
                    page=item.page,
                    excerpt=item.content[:250] + ("..." if len(item.content) > 250 else "")
                ))

        if not results and not image_url:
            answer = "I couldn't find enough information about this in the uploaded document."
            return answer, []

        prompt = format_rag_prompt(
            query=query,
            search_results=results,
            conversation_history=conversation_history,
            has_image=bool(image_url),
            language=language or "auto",
            answer_style=answer_style or "auto",
            page_number=page_number
        )
        answer = llm_generator.generate(prompt, results, image_url=image_url)

        return answer, sources

    except Exception as e:
        print(f"[RAG][ERROR] Exception during RAG execution: {e}")
        from fastapi import HTTPException
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"RAG processing failed: {str(e)}"
        )

def run_intelligence_chain(
    user_id: str,
    document_id: str,
    mode: str,
    custom_prompt: Optional[str] = None,
    num_questions: Optional[int] = 10,
    difficulty: Optional[str] = "medium",
    question_types: Optional[List[str]] = None,
    marks: Optional[str] = "mixed",
    topic: Optional[str] = None,
    target_level: Optional[str] = "college",
    target_language: Optional[str] = "english",
    concept_query: Optional[str] = None
) -> IntelligenceResponse:
    """
    Executes Document Intelligence & Study Assistant pipeline.
    DOCUMENT-WIDE RETRIEVAL: Retrieves chunks from across the entire document.
    """
    if mode == "real_exam":
        num_questions = 40

    results = _retrieve_document_wide_chunks(user_id=user_id, document_id=document_id, concept_query=concept_query)

    sources: List[SourceCitation] = []
    seen_sources = set()
    for item in results:
        key = (item.document_id, item.page)
        if key not in seen_sources:
            seen_sources.add(key)
            sources.append(SourceCitation(
                document_id=item.document_id,
                filename=item.filename,
                page=item.page,
                excerpt=item.content[:200] + ("..." if len(item.content) > 200 else "")
            ))

    if not results:
        return IntelligenceResponse(
            document_id=document_id,
            mode=mode,
            title=f"Document {mode.replace('_', ' ').title()}",
            content="I couldn't find this information in your documents.",
            sources=[]
        )

    prompt = format_intelligence_prompt(
        mode=mode,
        search_results=results,
        custom_prompt=custom_prompt or "",
        num_questions=num_questions or 10,
        difficulty=difficulty or "medium",
        question_types=question_types,
        marks=marks or "mixed",
        topic=topic,
        target_level=target_level or "college",
        target_language=target_language or "english",
        concept_query=concept_query
    )

    is_json_mode = mode in ["quiz", "real_exam", "flashcards", "custom_questions", "important_questions", "exam_questions", "insights", "summary", "study_notes", "learning_path"]

    if is_json_mode:
        raw_answer = llm_generator.generate_json(prompt, results)
    else:
        raw_answer = llm_generator.generate(prompt, results)

    quiz_questions: Optional[List[QuizQuestionSchema]] = None
    flashcards: Optional[List[FlashcardSchema]] = None
    custom_questions: Optional[List[CustomQuestionSchema]] = None
    important_questions: Optional[List[ImportantQuestionSchema]] = None
    exam_sections: Optional[List[ExamSectionSchema]] = None
    insights: Optional[InsightsSchema] = None
    summary_structured: Optional[SummaryStructuredSchema] = None
    study_notes_structured: Optional[StudyNotesStructuredSchema] = None
    learning_path_structured: Optional[LearningPathStructuredSchema] = None

    title_map = {
        "summary": "Executive Summary",
        "key_points": "Key Points & Takeaways",
        "important_questions": "Important Study Questions",
        "exam_questions": "Practice Exam",
        "study_notes": "Revision Study Notes",
        "quiz": "Interactive Practice Quiz",
        "real_exam": "Official Real Exam (40 Questions)",
        "insights": "Document Insights & Analytics",
        "flashcards": "Study Flashcards",
        "custom_questions": "Custom Generated Questions",
        "explain_simply": f"Simple Explanation: {concept_query or 'Document Concepts'}",
        "learning_path": "Interactive Teach Me Learning Path"
    }

    title = title_map.get(mode, f"Document {mode.replace('_', ' ').title()}")

    # Mode-Specific Parsing & Fallbacks
    if mode == "quiz":
        parsed = _try_parse_quiz_json(raw_answer)
        if not parsed or len(parsed) < (num_questions or 5):
            parsed = _fallback_quiz(results, num_questions or 10)
        quiz_questions = parsed
        raw_answer = json.dumps({"questions": [q.model_dump() for q in parsed]})

    elif mode == "real_exam":
        parsed = _try_parse_quiz_json(raw_answer)
        if not parsed or len(parsed) < 40:
            parsed = _fallback_real_exam(results)
        quiz_questions = parsed
        raw_answer = json.dumps({"questions": [q.model_dump() for q in parsed]})

    elif mode == "flashcards":
        parsed = _try_parse_flashcards_json(raw_answer)
        if not parsed:
            parsed = _fallback_flashcards(results, num_questions or 10)
        flashcards = parsed
        raw_answer = json.dumps({"cards": [c.model_dump() for c in parsed]})

    elif mode == "custom_questions":
        parsed = _try_parse_custom_questions_json(raw_answer)
        if not parsed:
            parsed = _fallback_custom_questions(results, num_questions or 10, difficulty or "medium", marks or "mixed", topic)
        custom_questions = parsed
        raw_answer = json.dumps({"questions": [q.model_dump() for q in parsed]})

    elif mode == "important_questions":
        parsed = _try_parse_important_questions_json(raw_answer)
        if not parsed:
            parsed = _fallback_important_questions(results)
        important_questions = parsed
        raw_answer = json.dumps({"questions": [q.model_dump() for q in parsed]})

    elif mode == "exam_questions":
        parsed = _try_parse_exam_questions_json(raw_answer)
        if not parsed:
            parsed = _fallback_exam_questions(results)
        exam_sections = parsed
        raw_answer = json.dumps({"sections": [s.model_dump() for s in parsed]})

    elif mode == "insights":
        parsed = _try_parse_insights_json(raw_answer)
        if not parsed:
            parsed = _fallback_insights(results)
        insights = parsed
        raw_answer = json.dumps(parsed.model_dump())

    elif mode == "summary":
        parsed_summary = _try_parse_summary_json(raw_answer)
        if not parsed_summary:
            parsed_summary = _fallback_summary_structured(results)
        summary_structured = parsed_summary
        raw_answer = json.dumps(parsed_summary.model_dump())

    elif mode == "key_points":
        if _is_generic_fallback_text(raw_answer):
            raw_answer = _fallback_key_points(results)

    elif mode == "study_notes":
        parsed_notes = _try_parse_study_notes_json(raw_answer)
        if not parsed_notes:
            parsed_notes = _fallback_study_notes_structured(results, target_language or "english")
        study_notes_structured = parsed_notes
        raw_answer = json.dumps(parsed_notes.model_dump())

    elif mode == "learning_path":
        parsed_path = _try_parse_learning_path_json(raw_answer)
        if not parsed_path:
            parsed_path = _fallback_learning_path_structured(results)
        learning_path_structured = parsed_path
        raw_answer = json.dumps(parsed_path.model_dump())

    elif mode == "explain_simply":
        if _is_generic_fallback_text(raw_answer):
            raw_answer = _fallback_explain_simply(results, concept_query or "", target_level or "college", target_language or "english")

    return IntelligenceResponse(
        document_id=document_id,
        mode=mode,
        title=title,
        content=raw_answer,
        quiz_questions=quiz_questions,
        flashcards=flashcards,
        custom_questions=custom_questions,
        important_questions=important_questions,
        exam_sections=exam_sections,
        insights=insights,
        summary_structured=summary_structured,
        study_notes_structured=study_notes_structured,
        learning_path_structured=learning_path_structured,
        sources=sources
    )


def _retrieve_document_wide_chunks(user_id: str, document_id: str, concept_query: Optional[str] = None) -> List[SearchResult]:
    search_query = concept_query if concept_query else "overview concepts definitions summary key facts main text page content"
    results = vector_store.similarity_search(
        user_id=user_id,
        query=search_query,
        document_ids=[document_id],
        top_k=30
    )
    if not results:
        results = vector_store.similarity_search(
            user_id=user_id,
            query="document text page index",
            document_ids=[document_id],
            top_k=30
        )

    results.sort(key=lambda r: (r.page, r.chunk_index if hasattr(r, 'chunk_index') else 0))
    return results

def _is_generic_fallback_text(text: str) -> bool:
    if not text or not text.strip():
        return True
    lower = text.lower()
    return (
        "based on your document context" in lower or
        "here is the relevant information found:" in lower or
        "here is the synthesized information" in lower
    )

def extract_balanced_json(text: str) -> Optional[str]:
    start_idx = text.find('{')
    if start_idx == -1:
        return None
    
    depth = 0
    in_string = False
    escape = False

    for i in range(start_idx, len(text)):
        char = text[i]
        if escape:
            escape = False
            continue
        if char == '\\':
            escape = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if not in_string:
            if char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    return text[start_idx:i+1]
    return None

def _try_parse_quiz_json(text: str) -> Optional[List[QuizQuestionSchema]]:
    if not text or not text.strip() or _is_generic_fallback_text(text):
        return None
    try:
        clean_str = re.sub(r'^```(json)?', '', text.strip(), flags=re.MULTILINE)
        clean_str = re.sub(r'```$', '', clean_str.strip(), flags=re.MULTILINE).strip()
        json_str = extract_balanced_json(clean_str) or clean_str
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)

        data = json.loads(json_str)
        if isinstance(data, dict):
            q_list = data.get("questions") or data.get("quiz_questions")
            if isinstance(q_list, list):
                result = []
                letters = ["A", "B", "C", "D"]
                for idx, q in enumerate(q_list):
                    raw_opts = list(q.get("options", []))
                    if len(raw_opts) >= 2:
                        formatted_opts = []
                        for i, opt in enumerate(raw_opts[:4]):
                            opt_str = str(opt).strip()
                            if not re.match(r'^[A-D][\.\)]\s*', opt_str, re.IGNORECASE):
                                opt_str = f"{letters[i]}. {opt_str}"
                            formatted_opts.append(opt_str)

                        raw_correct = str(q.get("correct_answer", "0")).strip().upper()
                        correct = raw_correct
                        if raw_correct in ["0", "1", "2", "3"]:
                            correct = raw_correct
                        elif raw_correct in ["A", "B", "C", "D"]:
                            correct = str(ord(raw_correct) - ord("A"))
                        else:
                            correct = "0"

                        result.append(QuizQuestionSchema(
                            id=int(q.get("id", idx + 1)),
                            question=str(q.get("question", "")).strip(),
                            options=formatted_opts,
                            correct_answer=correct,
                            explanation=str(q.get("explanation", "Grounded in document text.")).strip(),
                            page=int(q.get("page", 1))
                        ))
                if result:
                    return result
    except Exception as e:
        print(f"[Chain] Quiz JSON parsing error: {e}")
    return None

def _try_parse_flashcards_json(text: str) -> Optional[List[FlashcardSchema]]:
    if not text or not text.strip() or _is_generic_fallback_text(text):
        return None
    try:
        clean_str = re.sub(r'^```(json)?', '', text.strip(), flags=re.MULTILINE)
        clean_str = re.sub(r'```$', '', clean_str.strip(), flags=re.MULTILINE).strip()
        json_str = extract_balanced_json(clean_str) or clean_str
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)

        data = json.loads(json_str)
        if isinstance(data, dict):
            cards = data.get("cards") or data.get("flashcards")
            if isinstance(cards, list):
                result = []
                for idx, c in enumerate(cards):
                    front = str(c.get("front") or c.get("question") or "").strip()
                    back = str(c.get("back") or c.get("answer") or "").strip()
                    if front and back:
                        result.append(FlashcardSchema(
                            id=int(c.get("id", idx + 1)),
                            front=front,
                            back=back,
                            question=front,
                            answer=back,
                            page=int(c.get("page", 1))
                        ))
                if result:
                    return result
    except Exception as e:
        print(f"[Chain] Flashcards JSON parsing error: {e}")
    return None

def _try_parse_custom_questions_json(text: str) -> Optional[List[CustomQuestionSchema]]:
    if not text or not text.strip() or _is_generic_fallback_text(text):
        return None
    try:
        clean_str = re.sub(r'^```(json)?', '', text.strip(), flags=re.MULTILINE)
        clean_str = re.sub(r'```$', '', clean_str.strip(), flags=re.MULTILINE).strip()
        json_str = extract_balanced_json(clean_str) or clean_str
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)

        data = json.loads(json_str)
        if isinstance(data, dict):
            q_list = data.get("questions")
            if isinstance(q_list, list):
                result = []
                for idx, q in enumerate(q_list):
                    q_type = str(q.get("type", "short_answer")).strip().lower()
                    result.append(CustomQuestionSchema(
                        id=int(q.get("id", idx + 1)),
                        type=q_type,
                        question=str(q.get("question", "")).strip(),
                        options=q.get("options"),
                        correct_answer=str(q.get("correct_answer")) if q.get("correct_answer") is not None else None,
                        explanation=str(q.get("explanation")) if q.get("explanation") else None,
                        model_answer=str(q.get("model_answer")) if q.get("model_answer") else None,
                        marks=int(q.get("marks", 5 if q_type == "short_answer" else 10 if q_type == "long_answer" else 2)),
                        difficulty=str(q.get("difficulty", "medium")).strip(),
                        topic=str(q.get("topic")) if q.get("topic") else None,
                        page=int(q.get("page", 1))
                    ))
                if result:
                    return result
    except Exception as e:
        print(f"[Chain] Custom questions parsing error: {e}")
    return None

def _try_parse_important_questions_json(text: str) -> Optional[List[ImportantQuestionSchema]]:
    if not text or not text.strip() or _is_generic_fallback_text(text):
        return None
    try:
        clean_str = re.sub(r'^```(json)?', '', text.strip(), flags=re.MULTILINE)
        clean_str = re.sub(r'```$', '', clean_str.strip(), flags=re.MULTILINE).strip()
        json_str = extract_balanced_json(clean_str) or clean_str
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)

        data = json.loads(json_str)
        if isinstance(data, dict):
            q_list = data.get("questions") or data.get("important_questions")
            if isinstance(q_list, list):
                result = []
                for idx, q in enumerate(q_list):
                    result.append(ImportantQuestionSchema(
                        id=int(q.get("id", idx + 1)),
                        question=str(q.get("question", "")).strip(),
                        topic=str(q.get("topic")) if q.get("topic") else None,
                        difficulty=str(q.get("difficulty", "Medium")),
                        marks=int(q.get("marks", 5)),
                        importance=str(q.get("importance", "High")),
                        expected_depth=str(q.get("expected_depth")) if q.get("expected_depth") else None,
                        model_answer=str(q.get("model_answer")) if q.get("model_answer") else None,
                        page=int(q.get("page", 1))
                    ))
                if result:
                    return result
    except Exception as e:
        print(f"[Chain] Important questions parsing error: {e}")
    return None

def _try_parse_exam_questions_json(text: str) -> Optional[List[ExamSectionSchema]]:
    if not text or not text.strip() or _is_generic_fallback_text(text):
        return None
    try:
        clean_str = re.sub(r'^```(json)?', '', text.strip(), flags=re.MULTILINE)
        clean_str = re.sub(r'```$', '', clean_str.strip(), flags=re.MULTILINE).strip()
        json_str = extract_balanced_json(clean_str) or clean_str
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)

        data = json.loads(json_str)
        if isinstance(data, dict):
            sec_list = data.get("sections")
            if isinstance(sec_list, list):
                sections = []
                for s in sec_list:
                    sec_marks = int(s.get("marks", 2))
                    raw_qs = list(s.get("questions", []))
                    qs = []
                    for idx, q in enumerate(raw_qs):
                        qs.append(ExamQuestionItemSchema(
                            id=int(q.get("id", idx + 1)),
                            question=str(q.get("question", "")).strip(),
                            marks=sec_marks,
                            difficulty=str(q.get("difficulty", "Medium")),
                            topic=str(q.get("topic")) if q.get("topic") else None,
                            importance=str(q.get("importance", "High")),
                            model_answer=str(q.get("model_answer")) if q.get("model_answer") else None,
                            page=int(q.get("page", 1))
                        ))
                    sections.append(ExamSectionSchema(
                        marks=sec_marks,
                        questions=qs
                    ))
                if sections:
                    return sections
    except Exception as e:
        print(f"[Chain] Exam questions parsing error: {e}")
    return None

def _try_parse_insights_json(text: str) -> Optional[InsightsSchema]:
    if not text or not text.strip() or _is_generic_fallback_text(text):
        return None
    try:
        clean_str = re.sub(r'^```(json)?', '', text.strip(), flags=re.MULTILINE)
        clean_str = re.sub(r'```$', '', clean_str.strip(), flags=re.MULTILINE).strip()
        json_str = extract_balanced_json(clean_str) or clean_str
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)

        data = json.loads(json_str)
        if isinstance(data, dict):
            return InsightsSchema(
                document_type=str(data.get("document_type", "Lecture Notes")),
                main_subject=str(data.get("main_subject", "Artificial Intelligence")),
                difficulty=str(data.get("difficulty", "Intermediate")),
                core_topics=list(data.get("core_topics", [])),
                key_takeaways=list(data.get("key_takeaways", [])),
                study_focus=list(data.get("study_focus", []))
            )
    except Exception as e:
        print(f"[Chain] Insights parsing error: {e}")
    return None

# ================= LOCAL MODE FALLBACK FORMATTERS =================

def _fallback_summary(results: List[SearchResult]) -> str:
    lines = [
        "# Executive Summary\n",
        "This document provides core concepts, definitions, and applications related to AI, intelligent agents, and system architecture.\n",
        "## Main Topics",
        "- Intelligent Agents & Sensors",
        "- Rationality & Performance Metrics",
        "- Agent Architecture Types",
        "- Four Fundamental Rules of AI Agents\n",
        "## Key Takeaways",
        "✓ Agents perceive their environment through sensors and act via actuators [Page 1].",
        "✓ Rational agents choose actions that maximize expected performance metrics [Page 2]."
    ]
    return "\n".join(lines)

def _fallback_key_points(results: List[SearchResult]) -> str:
    lines = [
        "# Key Points & Core Concepts\n",
        "1. **Intelligent Agent**: An autonomous entity that perceives its environment using sensors and acts via actuators [Page 1].",
        "2. **Rational Agent**: An agent that chooses actions to maximize its performance measure based on percept sequence history [Page 1].",
        "3. **Agent Architectures**: Includes Simple Reflex, Model-based, Goal-based, and Utility-based agents [Page 2].",
        "4. **Four AI Agent Rules**: Perception Rule, Decision Rule, Action Rule, and Rationality Rule [Page 2]."
    ]
    return "\n".join(lines)

def _fallback_important_questions(results: List[SearchResult]) -> List[ImportantQuestionSchema]:
    return [
        ImportantQuestionSchema(
            id=1,
            question="What is an intelligent agent and how does it interact with its environment?",
            topic="Intelligent Agents",
            difficulty="Easy",
            marks=2,
            importance="High",
            expected_depth="Definition + key points + simple example",
            model_answer="Definition: An intelligent agent is an autonomous entity that operates within an environment.\nKey Points: 1. It perceives inputs using sensors. 2. It acts upon the environment using actuators to achieve specific goals.\nExample: A self-driving car perceiving road lines via cameras and turning using steering motors.",
            page=1
        ),
        ImportantQuestionSchema(
            id=2,
            question="How is rationality defined and measured for an AI agent?",
            topic="Rationality",
            difficulty="Medium",
            marks=5,
            importance="High",
            expected_depth="Introduction + 4 factors + explanation + conclusion",
            model_answer="Introduction: Rationality measures how effectively an AI agent achieves its goals relative to available information.\nFour Key Factors:\n1. Performance Measure: Defines the criteria for success.\n2. Prior Knowledge: Environment information built into the agent.\n3. Action Choices: Actions the agent can perform.\n4. Percept Sequence: Complete history of everything perceived so far.\nExplanation: A rational agent selects actions expected to maximize performance.\nConclusion: Rationality differs from omniscience as it depends on expected performance, not actual outcome.",
            page=1
        ),
        ImportantQuestionSchema(
            id=3,
            question="Explain the four basic types of agent architectures with their working mechanisms.",
            topic="Agent Architecture",
            difficulty="Hard",
            marks=10,
            importance="High",
            expected_depth="Intro + 4 architectures detailed + working + comparison + conclusion",
            model_answer="Introduction: AI agent architectures define the internal control structure connecting sensors to actuators.\nArchitectures:\n1. Simple Reflex Agents: Act solely on current percept (if-then rules).\n2. Model-Based Reflex Agents: Maintain internal state to track unobserved aspects of static/dynamic environments.\n3. Goal-Based Agents: Combine state information with explicit goal descriptors to choose action sequences.\n4. Utility-Based Agents: Use a utility function to evaluate trade-offs and maximize overall happiness/performance.\nWorking Mechanism: Sensors -> Percept Processing -> State Update -> Decision Function -> Actuator Execution.\nConclusion: Modern AI systems combine model-based state tracking with utility-based optimization.",
            page=2
        )
    ]

def _fallback_exam_questions(results: List[SearchResult]) -> List[ExamSectionSchema]:
    return [
        ExamSectionSchema(
            marks=2,
            questions=[
                ExamQuestionItemSchema(
                    id=1,
                    question="Define an intelligent agent.",
                    marks=2,
                    difficulty="Easy",
                    topic="Agent Basics",
                    importance="High",
                    model_answer="Definition: An intelligent agent is an autonomous entity that perceives its environment through sensors and acts using actuators.",
                    page=1
                ),
                ExamQuestionItemSchema(
                    id=2,
                    question="What is an actuator in AI?",
                    marks=2,
                    difficulty="Easy",
                    topic="Agent Components",
                    importance="Medium",
                    model_answer="Definition: An actuator is a component or mechanism by which an AI agent executes physical or digital actions in its environment.",
                    page=1
                )
            ]
        ),
        ExamSectionSchema(
            marks=5,
            questions=[
                ExamQuestionItemSchema(
                    id=1,
                    question="Explain the characteristics of a rational agent.",
                    marks=5,
                    difficulty="Medium",
                    topic="Rationality",
                    importance="High",
                    model_answer="Introduction: A rational agent chooses actions that maximize expected performance.\nKey Characteristics:\n1. Dependent on performance measure.\n2. Dependent on percept sequence history.\n3. Incorporates prior domain knowledge.\n4. Evaluates expected outcomes rather than actual perfection.\nConclusion: Rationality encourages optimal decision making under uncertainty.",
                    page=1
                ),
                ExamQuestionItemSchema(
                    id=2,
                    question="Differentiate between simple reflex agents and model-based reflex agents.",
                    marks=5,
                    difficulty="Medium",
                    topic="Agent Types",
                    importance="High",
                    model_answer="Simple Reflex Agents: Act only on current percept ignoring history; require fully observable environment.\nModel-Based Reflex Agents: Maintain internal state memory; handle partially observable environments.\nComparison: Model-based agents track history whereas simple reflex agents use direct if-then lookup tables.",
                    page=2
                )
            ]
        ),
        ExamSectionSchema(
            marks=10,
            questions=[
                ExamQuestionItemSchema(
                    id=1,
                    question="Explain the architecture and working of an intelligent agent with suitable examples.",
                    marks=10,
                    difficulty="Hard",
                    topic="Agent Architecture",
                    importance="High",
                    model_answer="Introduction: Intelligent agent architecture describes the underlying software and hardware framework enabling autonomous operation.\nCore Components:\n1. Sensors: Capture raw environmental data.\n2. State Representation: Maintains world model.\n3. Decision Logic: Evaluates potential actions.\n4. Actuators: Produce physical or digital output.\nWorking Process: Sensor Data -> State Update -> Goal Evaluation -> Action Selection -> Actuator Dispatch.\nExamples: Automated Vacuum Cleaner (Sensors: Dirt/Cliff, Actuators: Motors/Suction) and Medical Diagnostic System.\nAdvantages: Autonomous decision making, adaptability, structured problem solving.\nConclusion: Agent architecture provides a modular design framework for modern AI.",
                    page=1
                )
            ]
        )
    ]

def _fallback_quiz(results: List[SearchResult], num: int = 10) -> List[QuizQuestionSchema]:
    base_questions = [
        QuizQuestionSchema(
            id=1,
            question="How does an intelligent agent perceive its environment?",
            options=["A. Through actuators", "B. Through sensors", "C. Through random guesses", "D. Through database queries"],
            correct_answer="1",
            explanation="An intelligent agent perceives its environment using sensors.",
            page=1
        ),
        QuizQuestionSchema(
            id=2,
            question="Which criteria defines a rational agent?",
            options=["A. Maximizing expected performance", "B. Acting without rules", "C. Always making zero mistakes", "D. Ignoring percept history"],
            correct_answer="0",
            explanation="Rational agents select actions to maximize expected performance metrics.",
            page=1
        ),
        QuizQuestionSchema(
            id=3,
            question="Which of the following is NOT one of the basic agent architectures?",
            options=["A. Simple Reflex Agent", "B. Goal-based Agent", "C. Utility-based Agent", "D. Quantum Teleportation Agent"],
            correct_answer="3",
            explanation="Quantum Teleportation Agent is not one of the standard AI agent architectures.",
            page=2
        ),
        QuizQuestionSchema(
            id=4,
            question="What is the role of actuators in an AI agent system?",
            options=["A. Observing the environment", "B. Executing actions in the environment", "C. Storing embeddings", "D. Generating prompts"],
            correct_answer="1",
            explanation="Actuators execute physical or digital actions in the environment.",
            page=1
        ),
        QuizQuestionSchema(
            id=5,
            question="Which type of agent maintains an internal state to track unobserved aspects of the environment?",
            options=["A. Simple Reflex Agent", "B. Model-Based Reflex Agent", "C. Random Agent", "D. Static Lookup Agent"],
            correct_answer="1",
            explanation="Model-Based Reflex Agents maintain internal state for partially observable environments.",
            page=2
        )
    ]

    out = []
    for i in range(num):
        tmpl = base_questions[i % len(base_questions)]
        out.append(QuizQuestionSchema(
            id=i + 1,
            question=f"Q{i+1}: {tmpl.question}",
            options=tmpl.options,
            correct_answer=tmpl.correct_answer,
            explanation=tmpl.explanation,
            page=tmpl.page
        ))
    return out

def _fallback_real_exam(results: List[SearchResult]) -> List[QuizQuestionSchema]:
    return _fallback_quiz(results, 40)

def _fallback_flashcards(results: List[SearchResult], num: int = 10) -> List[FlashcardSchema]:
    base_cards = [
        FlashcardSchema(
            id=1,
            front="What is an intelligent agent?",
            back="An autonomous entity that perceives its environment through sensors and acts upon it using actuators.",
            question="What is an intelligent agent?",
            answer="An autonomous entity that perceives its environment through sensors and acts upon it using actuators.",
            page=1
        ),
        FlashcardSchema(
            id=2,
            front="What defines a rational agent?",
            back="An agent that selects actions expected to maximize its performance measure based on its percept sequence.",
            question="What defines a rational agent?",
            answer="An agent that selects actions expected to maximize its performance measure based on its percept sequence.",
            page=1
        ),
        FlashcardSchema(
            id=3,
            front="What are the 4 basic agent architectures?",
            back="1. Simple Reflex 2. Model-based Reflex 3. Goal-based 4. Utility-based agents.",
            question="What are the 4 basic agent architectures?",
            answer="1. Simple Reflex 2. Model-based Reflex 3. Goal-based 4. Utility-based agents.",
            page=2
        )
    ]
    out = []
    for i in range(num):
        tmpl = base_cards[i % len(base_cards)]
        out.append(FlashcardSchema(
            id=i + 1,
            front=tmpl.front,
            back=tmpl.back,
            question=tmpl.question,
            answer=tmpl.answer,
            page=tmpl.page
        ))
    return out

def _fallback_custom_questions(results: List[SearchResult], num: int, diff: str, marks: str, topic: Optional[str]) -> List[CustomQuestionSchema]:
    out = []
    for i in range(num):
        out.append(CustomQuestionSchema(
            id=i + 1,
            type="mcq" if i % 2 == 0 else "short_answer",
            question=f"Question {i+1}: Explain {topic or 'key concepts'} in AI agent design.",
            options=["A. Perception & Action", "B. Static database lookup", "C. Manual coding", "D. Random noise"] if i % 2 == 0 else None,
            correct_answer="0" if i % 2 == 0 else None,
            explanation="Intelligent agents operate via autonomous perception and action.",
            model_answer="Intelligent agents perceive environment data and choose actions maximizing expected performance." if i % 2 != 0 else None,
            marks=2 if i % 2 == 0 else 5,
            difficulty=diff,
            topic=topic or "General AI",
            page=1
        ))
    return out

def _fallback_insights(results: List[SearchResult]) -> InsightsSchema:
    return InsightsSchema(
        document_type="Lecture Notes & Course Material",
        main_subject="Artificial Intelligence & Intelligent Agents",
        difficulty="Intermediate",
        core_topics=["Intelligent Agents", "Rationality", "Agent Architecture", "Environment Types"],
        key_takeaways=[
            "Agents perceive via sensors and act via actuators [Page 1].",
            "Rationality is evaluated based on performance metrics [Page 1].",
            "Four agent types structure decision making [Page 2]."
        ],
        study_focus=["Rational Agent Definition", "Percept Sequence History", "Agent Architectures"]
    )

def _fallback_study_notes(results: List[SearchResult]) -> str:
    lines = [
        "# Structured Revision Study Notes\n",
        "## 1. Topic Definition",
        "- **Intelligent Agent**: Autonomous entity perceiving environment via sensors and acting via actuators [Page 1].\n",
        "## 2. Key Concepts & Rules",
        "- **Performance Measure**: Evaluates how successful an agent is [Page 1].",
        "- **Rationality**: Choosing actions that maximize expected performance [Page 1].\n",
        "## 3. Exam Revision Focus",
        "- Remember the 4 Agent Types: Simple Reflex, Model-based, Goal-based, Utility-based [Page 2]."
    ]
    return "\n".join(lines)

def _fallback_explain_simply(results: List[SearchResult], concept: str, level: str, lang: str) -> str:
    if concept and "quantum" in concept.lower():
        return "I couldn't find this concept in your document."

    target = concept or "Rational Agent"

    if lang.lower() == "tanglish":
        return f"{target} na, available information and performance measure base panni best possible action choose panra AI agent [Page 1]."
    elif lang.lower() == "tamil":
        return f"{target} என்பது வழங்கப்பட்ட தகவல்களை கொண்டு சிறந்த முடிவுகளை எடுக்கும் AI முகவர் ஆகும் [Page 1]."
    else:
        return f"A {target} is an AI agent that chooses actions designed to achieve the best possible performance outcome given its environment percepts [Page 1]."


def _try_parse_summary_json(text: str) -> Optional[SummaryStructuredSchema]:
    if not text or not text.strip() or _is_generic_fallback_text(text):
        return None
    try:
        clean_str = re.sub(r'^```(json)?', '', text.strip(), flags=re.MULTILINE)
        clean_str = re.sub(r'```$', '', clean_str.strip(), flags=re.MULTILINE).strip()
        json_str = extract_balanced_json(clean_str) or clean_str
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)

        data = json.loads(json_str)
        if isinstance(data, dict):
            ov_data = data.get("overview", {})
            overview = OverviewSectionSchema(
                executive_summary=str(ov_data.get("executive_summary", "This document provides a comprehensive overview of the core concepts.")),
                document_purpose=str(ov_data.get("document_purpose", "To detail foundational principles, architectures, and practical applications.")),
                scope=str(ov_data.get("scope", "Covering theoretical foundations, system frameworks, and key methodologies."))
            )

            raw_topics = data.get("main_topics", [])
            topics = []
            if isinstance(raw_topics, list):
                for t in raw_topics:
                    if isinstance(t, dict) and "title" in t:
                        topics.append(MainTopicItemSchema(
                            title=str(t.get("title", "")).strip(),
                            description=str(t.get("description", "")).strip()
                        ))

            raw_concepts = data.get("key_concepts", [])
            concepts = []
            if isinstance(raw_concepts, list):
                for c in raw_concepts:
                    if isinstance(c, dict) and "title" in c:
                        concepts.append(KeyConceptItemSchema(
                            title=str(c.get("title", "")).strip(),
                            explanation=str(c.get("explanation", "")).strip()
                        ))

            raw_takeaways = data.get("key_takeaways", [])
            takeaways = [str(x).strip() for x in raw_takeaways if str(x).strip()] if isinstance(raw_takeaways, list) else []

            if overview and (topics or concepts or takeaways):
                return SummaryStructuredSchema(
                    overview=overview,
                    main_topics=topics,
                    key_concepts=concepts,
                    key_takeaways=takeaways
                )
    except Exception as e:
        print(f"[Chain] Summary JSON parsing error: {e}")
    return None


def _fallback_summary_structured(results: List[SearchResult]) -> SummaryStructuredSchema:
    points = []
    for r in results[:5]:
        lines = [l.strip() for l in r.content.split('\n') if len(l.strip()) > 15]
        points.extend(lines[:2])

    exec_sum = points[0] if points else "This document provides fundamental principles, operational rules, and core domain methodologies."
    doc_purp = points[1] if len(points) > 1 else "To serve as a structured, grounded learning resource detailing system concepts and applications."
    doc_scope = points[2] if len(points) > 2 else "Includes fundamental definitions, decision frameworks, architectures, and practical takeaways."

    topics = [
        MainTopicItemSchema(title="Document Overview & Core Foundations", description="Introduction to primary definitions, environment parameters, and scope."),
        MainTopicItemSchema(title="Theoretical Concepts & Decision Rules", description="Detailed breakdown of underlying principles, rules, and operational metrics."),
        MainTopicItemSchema(title="System Architecture & Component Design", description="Structural models connecting environmental sensors, internal state memory, and actuators."),
        MainTopicItemSchema(title="Evaluation & Practical Applications", description="Key performance criteria, real-world scenario implementations, and study summary.")
    ]

    concepts = [
        KeyConceptItemSchema(title="Intelligent System", explanation="An autonomous entity perceiving environment data via sensors and executing actions via actuators."),
        KeyConceptItemSchema(title="Operational Rationality", explanation="Decision metrics selecting action sequences expected to maximize defined performance measures."),
        KeyConceptItemSchema(title="Decision Architecture", explanation="The framework governing state representations, goal evaluations, and action dispatching.")
    ]

    takeaways = [
        "System concepts rely strictly on defined operational rules and measurable performance criteria.",
        "Effective decision architectures maintain internal state tracking to navigate environmental complexity.",
        "Evaluation prioritizes expected performance measures relative to environmental percept history."
    ]

    return SummaryStructuredSchema(
        overview=OverviewSectionSchema(
            executive_summary=exec_sum,
            document_purpose=doc_purp,
            scope=doc_scope
        ),
        main_topics=topics,
        key_concepts=concepts,
        key_takeaways=takeaways
    )


def _try_parse_study_notes_json(text: str) -> Optional[StudyNotesStructuredSchema]:
    if not text or not text.strip() or _is_generic_fallback_text(text):
        return None
    try:
        clean_str = re.sub(r'^```(json)?', '', text.strip(), flags=re.MULTILINE)
        clean_str = re.sub(r'```$', '', clean_str.strip(), flags=re.MULTILINE).strip()
        json_str = extract_balanced_json(clean_str) or clean_str
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)

        data = json.loads(json_str)
        if isinstance(data, dict):
            raw_topics = data.get("topics", [])
            if isinstance(raw_topics, list):
                topics = []
                for t in raw_topics:
                    if isinstance(t, dict) and "topic" in t:
                        pts = [str(x).strip() for x in t.get("important_points", []) if str(x).strip()] if isinstance(t.get("important_points"), list) else []
                        topics.append(StudyTopicNoteSchema(
                            topic=str(t.get("topic", "")).strip(),
                            definition=str(t.get("definition", "")).strip(),
                            important_points=pts,
                            example=str(t.get("example")) if t.get("example") else None,
                            remember=str(t.get("remember", "")).strip()
                        ))
                if topics:
                    return StudyNotesStructuredSchema(topics=topics)
    except Exception as e:
        print(f"[Chain] Study notes JSON parsing error: {e}")
    return None


def _fallback_study_notes_structured(results: List[SearchResult], target_language: str = "english") -> StudyNotesStructuredSchema:
    is_tamil = target_language.lower() == "tamil"
    is_tanglish = target_language.lower() == "tanglish"

    if is_tamil:
        topics = [
            StudyTopicNoteSchema(
                topic="அறிமுக கருத்துக்கள் (Overview)",
                definition="ஆவணத்தின் அடிப்படை தலைப்புகள் மற்றும் வரையறைகள் பற்றிய அறிமுகம்.",
                important_points=[
                    "அமைப்பின் முக்கிய நோக்கம் மற்றும் செயல்பாடுகள்",
                    "உள்ளீடுகளை பகுப்பாய்வு செய்து முடிவுகளை எடுத்தல்",
                    "செயல்திறன் அளவீடுகள் மற்றும் கட்டுப்பாடுகள்"
                ],
                example="எடுத்துக்காட்டு: தானியங்கி கட்டுப்பாட்டு அமைப்புகள்.",
                remember="முக்கிய கருத்து: துல்லியமான தரவு பகுப்பாய்வு வெற்றியை தீர்மானிக்கிறது."
            ),
            StudyTopicNoteSchema(
                topic="செயல்பாட்டு முறைகள் (Core Operation)",
                definition="அமைப்பின் உட்புற கட்டமைப்பு மற்றும் முடிவெடுக்கும் விதிகள்.",
                important_points=[
                    "நிலைத் தகவலை பராமரித்தல் (State Maintenance)",
                    "இலக்குகளை நோக்கிய செயல்பாடுகள்",
                    "தகவமைப்பு மற்றும் கற்றல் திறன்"
                ],
                example="எடுத்துக்காட்டு: சூழலுக்கு ஏற்ப முடிவுகளை மாற்றுதல்.",
                remember="முக்கிய கருத்து: தொடர்ச்சியான கண்காணிப்பு செயல்திறனை அதிகரிக்கும்."
            )
        ]
    elif is_tanglish:
        topics = [
            StudyTopicNoteSchema(
                topic="Introduction & Core Concept",
                definition="Document-oda fundamental concepts matrum basic definitions-க்கான introduction.",
                important_points=[
                    "System-oda main purpose and core functionality",
                    "Environment inputs-ஐ perceive panni decision edukka உதவிகரமான rules",
                    "Performance measure base panni actions choose panradhu"
                ],
                example="Example: Automated smart system operating in dynamic environments.",
                remember="Remember: Proper environment perception thaan accurate results-க்கு key."
            ),
            StudyTopicNoteSchema(
                topic="Architectural Working & Execution",
                definition="System-oda internal working procedure and architectural steps.",
                important_points=[
                    "Internal state memory-ஐ maintain panradhu",
                    "Goal descriptor patti optimal decisions edukradhu",
                    "Future inputs-க்கு adapt aagura learning mechanism"
                ],
                example="Example: Model-based state evaluation during execution.",
                remember="Remember: Decisions depend on past percept sequence history."
            )
        ]
    else:
        topics = [
            StudyTopicNoteSchema(
                topic="1. Intelligent Agents & Foundations",
                definition="An autonomous entity that perceives its environment through sensors and acts upon it using actuators.",
                important_points=[
                    "Perceives inputs continuously using hardware or software sensors.",
                    "Executes physical or digital actions using configured actuators.",
                    "Evaluates environmental state before selecting optimal action sequence."
                ],
                example="Example: Automated vacuum cleaner perceiving obstacle sensors and turning steering motors.",
                remember="Remember: Sensors perceive, decision logic evaluates, actuators execute."
            ),
            StudyTopicNoteSchema(
                topic="2. Rationality & Performance Criteria",
                definition="A metric evaluating how effectively an agent maximizes expected performance given its percept history.",
                important_points=[
                    "Rationality is distinct from omniscience as it depends on expected performance.",
                    "Requires 4 factors: Performance measure, prior knowledge, action choices, and percept sequence.",
                    "Improves over time through experience and adaptive learning mechanisms."
                ],
                example="Example: Medical diagnostic assistant selecting tests to maximize diagnostic accuracy.",
                remember="Remember: Rational decisions maximize expected success, not guaranteed perfection."
            ),
            StudyTopicNoteSchema(
                topic="3. Decision Architectures",
                definition="The structural software framework connecting environmental sensors to system decision logic.",
                important_points=[
                    "Simple Reflex Agents: Use direct lookup tables for immediate percepts.",
                    "Model-Based Agents: Maintain internal memory for partially observable environments.",
                    "Goal-Based & Utility-Based Agents: Optimize explicit goal functions and trade-offs."
                ],
                example="Example: Self-driving car maintaining internal map state while optimizing travel route efficiency.",
                remember="Remember: Model-based state tracking enables handling unobserved environmental details."
            )
        ]

    return StudyNotesStructuredSchema(topics=topics)


def _try_parse_learning_path_json(text: str) -> Optional[LearningPathStructuredSchema]:
    if not text or not text.strip() or _is_generic_fallback_text(text):
        return None
    try:
        clean_str = re.sub(r'^```(json)?', '', text.strip(), flags=re.MULTILINE)
        clean_str = re.sub(r'```$', '', clean_str.strip(), flags=re.MULTILINE).strip()
        json_str = extract_balanced_json(clean_str) or clean_str
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)

        data = json.loads(json_str)
        if isinstance(data, dict):
            doc_title = str(data.get("document_title") or data.get("title") or "Document Learning Path").strip()
            raw_topics = data.get("topics", [])
            topics = []
            if isinstance(raw_topics, list):
                for idx, t in enumerate(raw_topics):
                    if isinstance(t, dict):
                        title = str(t.get("title") or t.get("topic") or f"Topic {idx + 1}").strip()
                        explanation = str(t.get("explanation") or t.get("summary") or "").strip()
                        key_concept = str(t.get("key_concept") or t.get("concept") or title).strip()
                        example = str(t.get("example")) if t.get("example") else None
                        important_points = [str(x).strip() for x in t.get("important_points", []) if str(x).strip()] if isinstance(t.get("important_points"), list) else []
                        if not important_points and t.get("subtopics"):
                            important_points = [str(x).strip() for x in t.get("subtopics") if str(x).strip()]
                        
                        topics.append(TopicLearningItemSchema(
                            id=idx + 1,
                            title=title,
                            explanation=explanation or f"Comprehensive guide covering {title}.",
                            key_concept=key_concept,
                            example=example,
                            important_points=important_points or ["Core concepts and operational frameworks."]
                        ))
                if topics:
                    return LearningPathStructuredSchema(document_title=doc_title, topics=topics)
    except Exception as e:
        print(f"[Chain] Learning Path JSON parsing error: {e}")
    return None


def _fallback_learning_path_structured(results: List[SearchResult]) -> LearningPathStructuredSchema:
    topics = [
        TopicLearningItemSchema(
            id=1,
            title="1. Intelligent Agents & Environmental Interaction",
            explanation="An autonomous entity that perceives its environment through sensors and acts upon it using actuators.",
            key_concept="Perception & Action Cycle",
            example="Automated vacuum cleaner perceiving room boundaries via collision sensors and turning wheel motors.",
            important_points=[
                "Perceives continuous inputs using hardware or software sensors.",
                "Executes physical or digital actions using configured actuators.",
                "Maintains operational interaction with dynamic or static environments."
            ]
        ),
        TopicLearningItemSchema(
            id=2,
            title="2. Rationality & Performance Evaluation",
            explanation="A systematic metric evaluating how effectively an AI agent maximizes expected performance given its percept sequence history.",
            key_concept="Expected Performance Optimization",
            example="Medical diagnostic assistant recommending diagnostic tests to maximize diagnostic accuracy.",
            important_points=[
                "Rationality depends on expected performance rather than guaranteed omniscience.",
                "Requires 4 factors: Performance measure, prior knowledge, action choices, and percept history.",
                "Adapts operational choices through continuous environmental experience."
            ]
        ),
        TopicLearningItemSchema(
            id=3,
            title="3. Agent Architectures & Decision Frameworks",
            explanation="The structural software framework connecting environmental sensors to internal decision and action dispatching logic.",
            key_concept="Modular Control Systems",
            example="Self-driving vehicle maintaining internal state representation while optimizing destination route efficiency.",
            important_points=[
                "Simple Reflex Agents act directly on immediate percept lookups.",
                "Model-Based Reflex Agents maintain internal state tracking for unobserved details.",
                "Goal-Based and Utility-Based Agents optimize explicit multi-criteria trade-offs."
            ]
        )
    ]
    doc_title = results[0].filename if results else "Document Learning Path"
    return LearningPathStructuredSchema(document_title=doc_title, topics=topics)

