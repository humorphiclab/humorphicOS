"""AI service — rule-based summaries with optional OpenAI integration."""

import os


def generate_summary(text: str, summary_type: str = "general") -> str:
    api_key = (os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY", "")).strip()
    if api_key:
        try:
            import urllib.request
            import json

            payload = json.dumps({
                "systemInstruction": {
                    "role": "system",
                    "parts": [{"text": f"Summarize this {summary_type} content concisely for a robotics club."}]
                },
                "contents": [
                    {"role": "user", "parts": [{"text": text[:4000]}]}
                ],
                "generationConfig": {"maxOutputTokens": 300}
            }).encode()

            req = urllib.request.Request(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={api_key}",
                data=payload,
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            print(f"Gemini API HTTP Error (Summary): {e.code} - {error_body}")
        except Exception as e:
            print(f"Gemini API Error (Summary): {e}")

    sentences = [s.strip() for s in text.replace("\n", ". ").split(".") if s.strip()]
    if len(sentences) <= 3:
        return text[:500]
    return ". ".join(sentences[:3]) + "."


def chat_response(user_message: str, context: str = "") -> str:
    api_key = (os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY", "")).strip()
    if api_key:
        try:
            import urllib.request
            import json

            system = (
                "You are HumorphicOS AI Assistant, the official AI for the Humorphic Robotics Club. "
                "Your purpose is to help members navigate their tasks, projects, meetings, and club operations within the HumorphicOS platform. "
                "CRITICAL GUARDRAIL: You must ONLY answer questions related to the Humorphic Robotics Club, robotics, engineering, or the user's workload within the HumorphicOS platform. "
                "If a user asks about anything unrelated (such as general knowledge, politics, cooking, etc.), you MUST politely decline and remind them you are strictly a club management assistant."
            )
            if context:
                system += f"\n\nLIVE USER CONTEXT:\n{context}"
                
            payload = json.dumps({
                "systemInstruction": {
                    "role": "system",
                    "parts": [{"text": system}]
                },
                "contents": [
                    {"role": "user", "parts": [{"text": user_message}]}
                ],
                "generationConfig": {"maxOutputTokens": 500}
            }).encode()
            
            req = urllib.request.Request(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={api_key}",
                data=payload,
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            print(f"Gemini API HTTP Error (Chat): {e.code} - {error_body}")
        except Exception as e:
            print(f"Gemini API Error (Chat): {e}")

    msg = user_message.lower()
    if "task" in msg:
        return "Check your Tasks page for assigned work. Team leads can assign tasks via the Tasks module."
    if "meeting" in msg:
        return "View upcoming meetings on the Meetings page. Meeting links and agendas are listed there."
    if "update" in msg or "daily" in msg:
        return "Submit your daily work update on the Daily Updates page before end of day."
    if "project" in msg:
        return "Browse active projects on the Projects page to see progress and milestones."
    return (
        "I'm HumorphicOS AI Assistant. I can help with tasks, projects, meetings, "
        "daily updates, and club operations. Set GEMINI_API_KEY for full AI responses."
    )
