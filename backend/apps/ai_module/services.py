"""AI service — rule-based summaries with optional OpenAI integration."""

import os


def generate_summary(text: str, summary_type: str = "general") -> str:
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if api_key:
        try:
            import urllib.request
            import json

            payload = json.dumps({
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": f"Summarize this {summary_type} content concisely for a robotics club."},
                    {"role": "user", "content": text[:4000]},
                ],
                "max_tokens": 300,
            }).encode()
            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=payload,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
                return data["choices"][0]["message"]["content"]
        except Exception:
            pass

    sentences = [s.strip() for s in text.replace("\n", ". ").split(".") if s.strip()]
    if len(sentences) <= 3:
        return text[:500]
    return ". ".join(sentences[:3]) + "."


def chat_response(user_message: str, context: str = "") -> str:
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if api_key:
        try:
            import urllib.request
            import json

            system = (
                "You are HumorphicOS AI Assistant for Humorphic Robotics Club. "
                "Help members with tasks, projects, meetings, and club operations."
            )
            if context:
                system += f"\nContext: {context}"
            payload = json.dumps({
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_message},
                ],
                "max_tokens": 500,
            }).encode()
            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=payload,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
                return data["choices"][0]["message"]["content"]
        except Exception:
            pass

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
        "daily updates, and club operations. Set OPENAI_API_KEY for full AI responses."
    )
