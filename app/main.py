# © 2024 Thoughtworks, Inc. | Thoughtworks Pre-Existing Intellectual Property | See License file for permissions.

import os

import uvicorn
from dotenv import load_dotenv
from shared.app import App
from shared.chats import ServerChatSessionMemory
from shared.content_manager import ContentManager
from shared.event_handler import EventHandler
from shared.logger import TeamAILogger
from shared.navigation import NavigationManager
from shared.prompts_factory import PromptsFactory
from shared.services.config_service import ConfigService
from shared.ui import UI
from shared.ui_factory import UIFactory


def create_server():
    load_dotenv()
    os.environ["GRADIO_ANALYTICS_ENABLED"] = "false"
    DEFAULT_CONFIG_PATH = "config.yaml"

    knowledge_pack_path = ConfigService.load_knowledge_pack_path(DEFAULT_CONFIG_PATH)
    content_manager = ContentManager(
        knowledge_pack_path=knowledge_pack_path, config_path=DEFAULT_CONFIG_PATH
    )

    ui_factory = UIFactory(
        ui=UI(),
        prompts_factory=PromptsFactory(knowledge_pack_path),
        navigation_manager=NavigationManager(),
        event_handler=EventHandler(TeamAILogger),
        prompts_parent_dir=knowledge_pack_path,
        content_manager=content_manager,
        chat_session_memory=ServerChatSessionMemory(),
    )

    TeamAILogger.get().logger.info("Starting Haiven...")
    app = App(content_manager=content_manager, ui_factory=ui_factory)
    return app.launch_via_fastapi_wrapper()


def main():
    server = create_server()
    uvicorn.run(server, host="0.0.0.0", port=8080, forwarded_allow_ips="*")


if __name__ == "__main__":
    main()
