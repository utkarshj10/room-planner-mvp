from groq import Groq

from app.config import GROQ_API_KEY, GROQ_MODEL


def get_ai_advice(room_facts: dict) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not configured"
        )

    client = Groq(
        api_key=GROQ_API_KEY
    )

    prompt = f"""
You are an AI interior design advisor.

Analyze this room layout:

{room_facts}

Give practical interior-design advice based ONLY
on the information provided.

Focus on:
- furniture placement
- walking space
- room usability
- doors and windows
- furniture overlap
- accessibility
- practical arrangement

Do not invent measurements or furniture.

Return exactly these sections:

WHAT WORKS
- 2 to 4 concise points

PROBLEMS
- 0 to 4 concise points

RECOMMENDATIONS
- 2 to 5 specific actionable suggestions

Keep the answer concise.
"""

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        reasoning_effort="low",
        include_reasoning=False,
        temperature=0.3,
        max_completion_tokens=1000,
        stream=False,
    )

    message = response.choices[0].message

    if not message.content:
        raise RuntimeError(
            "Groq returned an empty response"
        )

    return message.content