# © 2024 Thoughtworks, Inc. | Thoughtworks Pre-Existing Intellectual Property | See License file for permissions.
from typing import Optional

from fastapi import Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from shared.chats import JSONChat, StreamingChat

from app.shared.llm_config import LLMConfig


def get_requirements_prompt(user_input):
    return f"""
You are a member of a software engineering team and are assisting me in requirements analysis.

# TASK
        In Agile, an epic is a large user story that encompasses several smaller, related user stories. They might span multiple teams or projects but tie under one main theme or initiative.

Please break down the epic provided by the user to produce multiple user stories, each with a clear name and concise description.

------

When breaking down an epic, consider the following strategies:

- Storytelling Approach: Visualize the epic's journey from start to finish. What are the main events or sequences?

- Workflow Breakdown: List the specific tasks or activities that need to be completed. Example: For a product launch epic, you might have design, prototyping, manufacturing, marketing, and distribution.

- Role-Based Breakdown: Identify the stakeholders or roles involved.
Allocate tasks or stories based on their expertise or responsibility within the epic.

- Timeline-Based Breakdown: Divide the epic into phases or milestones.
Prioritize user stories for each sprint duration, tackling high-priority items first.

- Data Boundaries: Separate the epic based on varying data or information needs. Example: One story might tackle displaying company stats, while another handles company contacts.

- Operational Boundaries: Determine the epic's core functionality or minimum viable feature. Sequentially add slices of extended functionality.

- Cross-cutting Concerns: Recognize overarching attributes required for every feature. Separate out concerns such as security, validation, and exception handling.

# CONTEXT
Here is the epic description:

{user_input}

# INSTRUCTIONS
You will create at least 5 user story suggestions, start with the most essential ones. If you have more ideas, give me up to 10 user stories.

You will respond with only a valid JSON array of story objects. Each story object will have the following schema:
    "title": <string>,
    "summary": <string>,

    """


def get_explore_prompt(context, user_input):
    return f"""
You are a member of a software engineering team and are assisting me in requirements analysis.

# TASK
        In Agile software development, a user story is a brief, simple description of a feature told from the perspective of the person who desires the new capability, usually a user or customer of the system.

Please, further explore the given user story.

------

When refining a user story consider the following questions when relevant:

- What is the user's desired outcome?
- What is the user's success criteria?
- What are the pre-requisites?
- How it can be tested?
- What are the security aspects to consider?
- What are the performance aspects to consider?
- What are the localization aspects to consider?

# CONTEXT
Here is the user story description:

{context}

# INSTRUCTIONS

{user_input}
    """


class ExploreRequirementRequest(BaseModel):
    input: str
    context: str
    chatSessionId: Optional[str] = None


def enable_requirements(app, chat_session_memory, chat_fn):
    @app.get("/api/requirements")
    def requirements(request: Request):
        input = request.query_params.get("input")

        json_chat = JSONChat()  # LLMConfig("mock", 0.5))
        return StreamingResponse(
            json_chat.run(get_requirements_prompt(input)),
            media_type="text/event-stream",
            headers={
                "Connection": "keep-alive",
                "Content-Encoding": "none",  # Necessary for the stream to work across the Next rewrite
            },
        )

    @app.post("/api/requirements/explore")
    def chat(explore_request: ExploreRequirementRequest):
        print(
            f"@debug POST /api/requirements/explore: explore_request={explore_request}"
        )
        chat_session_key_value, chat_session = chat_session_memory.get_or_create_chat(
            lambda: StreamingChat(
                llm_config=LLMConfig("azure-gpt35", 0.5), stream_in_chunks=True
            ),
            explore_request.chatSessionId,
            "chat",
            "birgitta",
        )

        rendered_prompt = get_explore_prompt(
            explore_request.context, explore_request.input
        )

        return StreamingResponse(
            chat_fn(rendered_prompt, chat_session),
            media_type="text/event-stream",
            headers={
                "Connection": "keep-alive",
                "Content-Encoding": "none",
                "Access-Control-Expose-Headers": "X-Chat-ID",
                "X-Chat-ID": chat_session_key_value,
            },
        )
