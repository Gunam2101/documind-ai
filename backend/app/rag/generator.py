from typing import List, Generator, Optional
import json
from fastapi import HTTPException, status
from app.config import settings
from app.rag.vector_store import SearchResult


class LLMGenerator:

    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        raw_model = getattr(settings, "GROQ_CHAT_MODEL", "llama-3.3-70b-versatile")
        if not raw_model or "openai" in raw_model.lower() or "gpt" in raw_model.lower():
            self.model = "llama-3.3-70b-versatile"
        else:
            self.model = raw_model

        self._groq_client = None

        if self.api_key and len(self.api_key.strip()) > 5:
            try:
                from groq import Groq

                self._groq_client = Groq(
                    api_key=self.api_key
                )

                print(
                    f"[LLMGenerator] Groq initialized successfully with model: {self.model}"
                )

            except Exception as e:
                print(
                    f"[LLMGenerator][ERROR] Groq initialization failed: {e}"
                )
                self._groq_client = None

    def generate(
        self,
        prompt: str,
        search_results: List[SearchResult],
        image_url: Optional[str] = None
    ) -> str:
        models_to_try = []
        if image_url:
            models_to_try = [
                "llama-3.2-90b-vision-preview",
                "llama-3.2-11b-vision-instruct",
                "llama-3.2-90b-vision-instruct"
            ]
        else:
            models_to_try = [self.model, "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "mixtral-8x7b-32768"]
            seen = set()
            models_to_try = [m for m in models_to_try if not (m in seen or seen.add(m))]

        print(f"[LLM] Generation started (candidates: {models_to_try})")

        if self._groq_client:
            last_err = None
            is_rate_limit = False
            for model_name in models_to_try:
                try:
                    if image_url:
                        content_payload = [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": image_url}}
                        ]
                    else:
                        content_payload = prompt

                    response = self._groq_client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {
                                "role": "user",
                                "content": content_payload
                            }
                        ],
                        temperature=0.2,
                        max_tokens=3500
                    )

                    answer = response.choices[0].message.content
                    if answer:
                        print(f"[LLM] Generation completed successfully with model '{model_name}' ({len(answer)} chars)")
                        return answer.strip()

                except Exception as e:
                    err_msg = str(e)
                    err_lower = err_msg.lower()
                    print(f"[LLM][WARN] Groq model '{model_name}' failed: {err_msg}")
                    last_err = e
                    if "429" in err_lower or "rate limit" in err_lower or "rate_limit" in err_lower:
                        is_rate_limit = True
                        break
                    elif "401" in err_lower or "403" in err_lower or "authentication" in err_lower:
                        break

            if is_rate_limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Your AI provider rate limit has been reached. Please try again later."
                )

            print(f"[LLM][WARN] All Groq model attempts failed ({last_err}), using local fallback synthesis.")
            fallback_answer = self._local_fallback_answer(prompt, search_results)
            if fallback_answer:
                return fallback_answer

            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service temporarily unavailable: {last_err}"
            )

        # Local fallback if client is not configured
        return self._local_fallback_answer(prompt, search_results)

    def generate_json(
        self,
        prompt: str,
        search_results: List[SearchResult]
    ) -> str:
        models_to_try = [self.model, "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "mixtral-8x7b-32768"]
        seen = set()
        models_to_try = [m for m in models_to_try if not (m in seen or seen.add(m))]

        if self._groq_client:
            for model_name in models_to_try:
                try:
                    response = self._groq_client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {
                                "role": "system",
                                "content": "You are a JSON-only API. You MUST output strictly valid JSON matching the requested schema. Do not wrap in markdown quotes or commentary."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.2,
                        max_tokens=4096
                    )

                    answer = response.choices[0].message.content
                    if answer:
                        return answer.strip()

                except Exception as e:
                    print(f"[LLM][ERROR] Groq JSON API call failed for model '{model_name}': {e}")
                    if "429" in str(e) or "rate limit" in str(e).lower():
                        break

        return self.generate(prompt, search_results)

    def generate_stream(
        self,
        prompt: str,
        search_results: List[SearchResult],
        image_url: Optional[str] = None
    ) -> Generator[str, None, None]:
        models_to_try = []
        if image_url:
            models_to_try = ["llama-3.2-90b-vision-preview", "llama-3.2-11b-vision-instruct", "llama-3.2-90b-vision-instruct"]
        else:
            models_to_try = [self.model, "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "mixtral-8x7b-32768"]
            seen = set()
            models_to_try = [m for m in models_to_try if not (m in seen or seen.add(m))]

        if self._groq_client:
            for model_name in models_to_try:
                try:
                    if image_url:
                        content_payload = [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": image_url}}
                        ]
                    else:
                        content_payload = prompt

                    stream = self._groq_client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {
                                "role": "user",
                                "content": content_payload
                            }
                        ],
                        temperature=0.2,
                        max_tokens=2500,
                        stream=True
                    )

                    yielded = False
                    for chunk in stream:
                        if not chunk.choices:
                            continue
                        delta = chunk.choices[0].delta.content
                        if delta:
                            yielded = True
                            yield delta
                    if yielded:
                        return

                except Exception as e:
                    print(f"[LLM][ERROR] Groq streaming failed for model '{model_name}': {e}")
                    err_msg = str(e).lower()
                    if "429" in err_msg or "rate limit" in err_msg:
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Your AI provider rate limit has been reached. Please try again later."
                        )

        full_text = self._local_fallback_answer(prompt, search_results)
        words = full_text.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")

    def _local_fallback_answer(
        self,
        prompt: str,
        search_results: List[SearchResult]
    ) -> str:
        if not search_results:
            return "I couldn't find this information in your documents."

        seen_sentences = set()
        clean_points = []

        for res in search_results[:6]:
            content = res.content.strip()
            lines = [line.strip() for line in content.split("\n") if len(line.strip()) > 10]
            for line in lines:
                if line.lower() not in seen_sentences:
                    seen_sentences.add(line.lower())
                    clean_points.append((res.page, line))
                    if len(clean_points) >= 6:
                        break
            if len(clean_points) >= 6:
                break

        if not clean_points:
            return "I couldn't find this information in your documents."

        res_lines = ["Here is the synthesized information from your document:\n"]
        for page, point in clean_points:
            res_lines.append(f"- {point} [Page {page}]")

        return "\n".join(res_lines)


llm_generator = LLMGenerator()