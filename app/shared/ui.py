# © 2024 Thoughtworks, Inc. | Thoughtworks Pre-Existing Intellectual Property | See License file for permissions.
from typing import List

import gradio as gr
from dotenv import load_dotenv
from shared.services.embeddings_service import EmbeddingsService
from shared.services.config_service import ConfigService
from shared.services.models_service import ModelsService
from shared.knowledge import KnowledgeBaseMarkdown
from shared.llm_config import LLMConfig
from shared.prompts import PromptList


class UI:
    def __init__(self):
        load_dotenv()

    @staticmethod
    def PATH_KNOWLEDGE() -> str:
        return "knowledge"

    def styling(self) -> tuple[gr.themes.Base, str]:
        theme = gr.themes.Base(
            radius_size="none",
            primary_hue=gr.themes.Color(
                c200="#f2617aff",  # background color primary button
                c600="#fff",  # Font color primary button
                c50="#a0a0a0",  # background color chat bubbles
                c300="#d1d5db",  # border color chat bubbles
                c500="#f2617aff",  # color of the loader
                c100="#fae8ff",
                c400="#e879f9",
                c700="#a21caf",
                c800="#86198f",
                c900="#701a75",
                c950="#f2617a",
            ),
            font=["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
            font_mono=["Consolas", "ui-monospace", "Consolas", "monospace"],
        )

        with open("resources/styles/teamai.css", "r") as file:
            css = file.read()

        return theme, css

    def ui_header(self, navigation=None):
        with gr.Row(elem_classes="header"):
            with gr.Column(elem_classes="header-title"):
                gr.Markdown(
                    """
                    # Team AI Demo
                    """
                )

            with gr.Column(elem_classes="header-logo"):
                gr.Markdown(
                    """
                    ![Team AI](../static/thoughtworks_logo.png)
                    """
                )

        if navigation:
            with gr.Row(elem_classes="header"):
                navigation_html = ""
                for item in navigation["items"]:
                    icon_html = ""
                    classes = ""
                    if item["path"] == self.PATH_KNOWLEDGE():
                        icon_html = (
                            "<img src='/static/icon_knowledge_blue.png' class='icon'>"
                        )
                        classes = "knowledge"

                    navigation_html += f"<div class='item'><a href='/{item['path']}' class='item-link {classes} {'selected' if navigation['selected'] == item['path'] else ''}'>{icon_html}{item['title']}</a></div>"
                gr.HTML(f"<div class='navigation'>{navigation_html}</div>")

    def ui_show_knowledge(self, knowledge_base_markdown: KnowledgeBaseMarkdown):
        with gr.Row():
            with gr.Column(scale=2):
                gr.Markdown("## Domain knowledge")
                for key in knowledge_base_markdown.get_all_keys():
                    gr.Textbox(
                        knowledge_base_markdown.get_content(key),
                        label=knowledge_base_markdown._base_knowledge.get(key)["title"],
                        lines=10,
                        show_copy_button=True,
                    )
            with gr.Column(scale=2):
                gr.Markdown("## Documents")
                pdf_knowledge = EmbeddingsService.get_embedded_documents()
                for knowledge in pdf_knowledge:
                    gr.Markdown(f"""
    ### {knowledge.title}

    **File:** {knowledge.source}

    **Description:** {knowledge.description}

                    """)

            with gr.Column(scale=1, elem_classes="user-help-col"):
                gr.Markdown("""
                "Team Knowledge" is maintained at a central place, and can be pulled into the prompts across the application.

                **Benefits:**
                - Users don't have to repeat over and over again for the AI what the domain or technical context is
                - Team members can benefit from the knowledge of others, in particular when they are new to the team or less experienced
                    """)

    def ui_show_about(self):
        gr.Markdown(
            """
            To learn more about how data is being processed, please refer to the 'Data processing' tab.
        """,
            elem_classes="disclaimer",
        )
        gr.Markdown(
            """
                **Team AI is a tool to help software delivery teams evaluate the value of Generative AI as an *assistant and knowledge amplifier for frequently done tasks* across their software delivery lifecycle.**

                This setup allows the use of GenAI in a way that is optimized for a particular team's or organization's needs, 
                wherever existing products are too rigid or don't exist yet. Prompts can be created and shared across the team,
                and knowledge from the organisation can be infused into the chat sessions.

                ### Benefits
                - Amplifying and scaling good prompt engineering via reusable prompts
                - Knowledge exchange via the prepared context parts of the prompts
                - Helping people with tasks they have never done before (e.g. if team members have little experience with story-writing)
                - Using GenAI for divergent thinking, brainstorming and finding gaps earlier in the delivery process
                
                ![Overview of Team AI setup](/static/teamai_overview_more_details.png)

            """,
            elem_classes="about",
        )

    def ui_show_data_processing(self):
        gr.Markdown(
            """
            ## 3rd party model services
            """
        )
        gr.Markdown(
            """
            Please be conscious of this and responsible about what data you enter when 
            you're having a chat conversation.    
            """,
            elem_classes="disclaimer",
        )
        gr.Markdown("""

            Each chat message is shared with an AI model. Depending on which "AI service and model" you indicate 
            in the UI, that's where your chat messages go (typically either a cloud service, or a model running on 
            your local machine). 
                    
            Most of the 3rd party model services have terms & conditions that say that they do NOT use your data
            to fine-tune their models in the future. However, these services do typically persist chat conversations, 
            at least temporary, so your data is stored on their servers, at least temporarily.
                    
            Therefore, please comply with your organization's data privacy and security policies when using this tool.
            In particular, you should never add any PII (personally identifiable information) 
            as part of your instructions to the AI. For all other types of data, consider the sensitivity and confidentiality 
            in the context of your particular situation, and consult your organization's data privacy policies.
            
            ## Data Collection

            The only data that gets persisted by this application itself is in the form of logs. 

            The application logs data about the following events:
            - Whenever a page is loaded, to track amount of activity
            - Whenever a chat session is being started, to track amount of activity
            - How many times a certain prompt is used, to track popularity of a prompt
            - Clicks on thumbs up and thumbs down, to track how useful the tool is for users

            User IDs from the OAuth session are included in each log entry to get an idea of how many different users are using the application.

            The application does NOT persist the contents of the chat sessions.
            """)

    def create_knowledge_pack_selector_ui(self):
        knowledge_pack = ConfigService.load_knowledge_pack()
        knowledge_packs_choices: List[tuple[str, str]] = [
            (domain.name, domain.name) for domain in knowledge_pack.domains
        ]
        knowledge_packs_selector = gr.Dropdown(
            knowledge_packs_choices,
            label="Choose knowledge context",
            interactive=True,
            elem_classes=["knowledge-pack-selector"],
        )
        return knowledge_packs_selector

    def create_llm_settings_ui(
        self, features_filter: List[str] = []
    ) -> tuple[gr.Dropdown, gr.Radio, LLMConfig]:
        available_options: List[tuple[str, str]] = _get_services(features_filter)
        default_temperature: float = _get_default_temperature()

        if len(available_options) == 0:
            raise ValueError(
                "No providers enabled, please check your environment variables"
            )

        dropdown = gr.Dropdown(
            available_options,
            label="Choose AI service and model to use",
            interactive=True,
            elem_classes=["model-settings", "model-settings-service"],
        )
        dropdown.value = available_options[0][1]

        tone_radio = gr.Slider(
            minimum=0.2,
            maximum=0.8,
            step=0.3,
            value=0.2,
            label="Temperature (More precise 0.2 - 0.8 More creative)",
            interactive=True,
            elem_classes="model-settings",
        )
        tone_radio.value = default_temperature

        if ConfigService.load_default_models().chat is not None:
            dropdown.value = ConfigService.load_default_models().chat
            dropdown.interactive = False
            dropdown.label = "Default model set in configuration"

        llmConfig = LLMConfig(dropdown.value, tone_radio.value)

        return dropdown, tone_radio, llmConfig

    def create_about_tab_for_task_area(
        self,
        category_names: str,
        category_metadata,
        all_prompt_lists: List[PromptList],
        addendum_markdown: str = "",
    ):
        prompt_lists_copy = all_prompt_lists.copy()
        prompt_list_markdown = ""
        for prompt_list in prompt_lists_copy:
            prompt_list.filter(category_names)
            prompt_list_markdown += f"\n#### {prompt_list.interaction_pattern_name}\n\n{prompt_list.render_prompts_summary_markdown()}\n"

        videos_markdown = ""
        if "videos" in category_metadata:
            videos_markdown += "\n## Demo Videos\n\n"
            videos_markdown += "\n".join(
                [
                    f"- [{item['title']}]({item['url']})"
                    for item in category_metadata["videos"]
                ]
            )
            videos_markdown += "\n\nFor more examples, check out the 'About' sections of the other task areas."

        with gr.Tab("ABOUT", elem_id="about"):
            section_title = category_metadata["title"]
            markdown = f"# {section_title}\n## Available prompts\n{prompt_list_markdown}\n{addendum_markdown}\n{videos_markdown}"
            gr.Markdown(markdown, line_breaks=True)


def _get_valid_tone_values() -> List[tuple[str, float]]:
    return [
        ("More creative (0.8)", 0.8),
        ("Balanced (0.5)", 0.5),
        ("More precise (0.2)", 0.2),
    ]


def _get_default_temperature() -> float:
    return 0.2


def _get_services(features_filter: List[str]) -> List[tuple[str, str]]:
    active_model_providers = ConfigService.load_enabled_providers()
    models = ModelsService.get_models(
        providers=active_model_providers, features=features_filter
    )
    services = [(model.name, model.id) for model in models]

    return services
