// © 2024 Thoughtworks, Inc. | Licensed under the Apache License, Version 2.0  | See LICENSE.md file for permissions.
"use client";
import { ProChatProvider } from "@ant-design/pro-chat";
import { useEffect, useState, useRef } from "react";
import { Input, Select, Button, Tooltip, Radio, Tabs } from "antd";
import { RiQuestionLine } from "react-icons/ri";

const { TextArea } = Input;
import ChatWidget from "../app/_chat";
import DescribeImage from "../app/_image_description";
import { getPrompts, getContextSnippets, getDocuments } from "../app/_boba_api";

const PromptChat = () => {
  const chatRef = useRef();

  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setPromptSelection] = useState("");
  const [contexts, setContexts] = useState([]);
  const [selectedContext, setSelectedContext] = useState("");
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState("");

  const [promptInput, setPromptInput] = useState("");
  const [imageDescription, setImageDescription] = useState("");

  const [showChat, setShowChat] = useState(false);
  const [conversationStarted, setPromptStarted] = useState(false);
  const [chatSessionId, setChatSessionId] = useState();
  const [clipboardDrawerOpen, setClipboardDrawerOpen] = useState(false);

  useEffect(() => setShowChat(false), []);

  const submitPromptToBackend = async (messages) => {
    if (conversationStarted !== true) {
      // start a new chat session with the selected prompt

      const userInput = messages[messages.length - 1];

      const requestData = {
        userinput: userInput?.content,
        promptid: selectedPrompt.identifier,
        chatSessionId: chatSessionId,
        document: selectedDocument,
      };
      if (selectedContext !== "base") {
        requestData.context = selectedContext;
      }
      const response = await fetch("/api/prompt", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });
      setPromptStarted(true);
      setChatSessionId(response.headers.get("X-Chat-ID"));
      setShowChat(true);
      return response;
    } else {
      // continue chat session
      const lastMessage = messages[messages.length - 1];
      const response = await fetch("/api/prompt", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userinput: lastMessage?.content,
          promptid: selectedPrompt.identifier,
          chatSessionId: chatSessionId,
        }),
      });
      return response;
    }
  };

  function handlePromptSelection(value) {
    const selectedPrompt = prompts.find(
      (prompt) => prompt.identifier === value,
    );
    setPromptSelection(selectedPrompt);
  }

  const handleContextSelection = (value) => {
    setSelectedContext(value);
  };

  useEffect(() => {
    getPrompts(setPrompts);
    getContextSnippets((data) => {
      const labelValuePairs = data.map((context) => {
        if (context.context === "base") {
          return {
            label: "none",
            value: "base",
          };
        } else {
          return {
            label: context.context,
            value: context.context,
          };
        }
      });
      setContexts(labelValuePairs);
    });
    getDocuments(setDocuments);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prompt = params.get("prompt");
    if (prompt) {
      handlePromptSelection(prompt);
    }
  }, [prompts]);

  const startChat = async () => {
    if (chatRef.current) {
      // the ProChat controls the flow - let it know we have a new message,
      // the ultimate request will come back to "onSubmitPrompt" function here

      let userInput = promptInput;
      if (imageDescription && imageDescription !== "") {
        userInput += "\n\n" + imageDescription;
      }
      chatRef.current.startNewConversation(userInput);
    }
  };

  const image_description_user_input = (
    <div className="user-input">
      Include an image description
      <DescribeImage onImageDescriptionChange={setImageDescription} />
      {imageDescription && <TextArea value={imageDescription} rows={6} />}
    </div>
  );

  const document_choice_user_input = (
    <div className="user-input">
      Include a document
      <br />
      <Select
        onChange={setSelectedDocument}
        style={{ width: 300 }}
        options={documents}
        value={selectedDocument?.key}
      ></Select>
    </div>
  );

  const prompt_options = (
    <div className="prompt-chat-options-container">
      {/* <ClipboardButton toggleClipboardDrawer={setClipboardDrawerOpen} /> */}
      <div className="prompt-chat-options-section">
        <h1>{selectedPrompt?.title}</h1>
        <p>{selectedPrompt?.help_prompt_description}</p>
      </div>

      <div className="prompt-chat-options-section">
        <div>
          <h2>Your input</h2>
          <div className="user-input">{selectedPrompt?.help_user_input}</div>

          <div className="user-input">
            <TextArea
              value={promptInput}
              rows={4}
              onChange={(e, v) => {
                setPromptInput(e.target.value);
              }}
            />
          </div>
          {image_description_user_input}
        </div>
      </div>
      <div className="prompt-chat-options-section">
        <div>
          <h2>Add some context</h2>
        </div>
        <div>
          {contexts && (
            <div className="user-input">
              Include text snippets
              <br />
              <Select
                onChange={handleContextSelection}
                style={{ width: 300 }}
                options={contexts}
                value={selectedContext?.key}
                defaultValue="base"
              ></Select>
            </div>
          )}
          {documents && document_choice_user_input}
        </div>
      </div>
      <div className="prompt-chat-options-section">
        <Button type="primary" onClick={startChat} className="go-button">
          GENERATE
        </Button>
      </div>
    </div>
  );

  const plain_chat = (
    <div className="prompt-center">
      <div className="prompt-chat-options-section">
        <div>
          <div className="user-input">
            <b>Start your chat with a message:</b>
            <TextArea
              value={promptInput}
              rows={4}
              onChange={(e, v) => {
                setPromptInput(e.target.value);
              }}
            />
          </div>
          {image_description_user_input}
          {documents && document_choice_user_input}
        </div>
      </div>
      <div className="prompt-chat-options-section">
        <Button type="primary" onClick={startChat}>
          Go
        </Button>
      </div>
    </div>
  );

  const tabItems = [
    {
      key: "tab-prompts-chat",
      label: "Use existing prompts",
      children: prompt_options,
    },
    {
      key: "tab-chat",
      label: "Just chat",
      children: plain_chat,
    },
  ];

  return (
    <>
      <div className="prompt-chat-container">
        {prompt_options}

        <ProChatProvider>
          <ChatWidget
            onSubmitMessage={submitPromptToBackend}
            ref={chatRef}
            visible={showChat}
            helloMessage={"Fill in some input on the left and hit 'Generate'"}
          />
        </ProChatProvider>
      </div>
    </>
  );
};

export default PromptChat;
