import React, { useState } from "react";
import { useRouter } from "next/router";
import { fetchSSE2 } from "../app/_fetch_sse";
import { Card, Spin, Button, Input } from "antd";
const { TextArea } = Input;
import { parse } from "best-effort-json-parser";
import ReactMarkdown from "react-markdown";

let ctrl;

const Home = () => {
  const [questions, setQuestions] = useState([]);
  const [selections, setSelections] = useState([]);
  const [storyScenarios, setStoryScenarios] = useState();
  const [isLoading, setLoading] = useState(false);
  const [promptInput, setPromptInput] = useState("");
  const [currentSSE, setCurrentSSE] = useState(null);
  const [chatSessionId, setChatSessionId] = useState();
  const router = useRouter();

  function abortLoad() {
    ctrl && ctrl.abort();
    setLoading(false);
    if (currentSSE && currentSSE.readyState == 1) {
      currentSSE.close();
      setCurrentSSE(null);
    }
  }

  const onQuestionSelectionChanged = (index) => {
    return (event) => {
      if (event.target.checked && selections.indexOf(index) == -1)
        setSelections([...selections, index]);
      else setSelections(selections.filter((s) => s != index));
    };
  };

  const onSubmitPrompt = (event) => {
    abortLoad();
    ctrl = new AbortController();
    setLoading(true);

    const uri = "/api/story-validation/questions";

    let ms = "";
    let output = [];

    fetchSSE2(
      () => {
        const response = fetch(uri, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: promptInput,
          }),
        });

        return response;
      },
      {
        json: true,
        onErrorHandle: () => {
          setLoading(false);
          abortLoad();
        },
        onMessageHandle: (data, response) => {
          if (!chatSessionId) {
            setChatSessionId(response.headers.get("X-Chat-ID"));
          }
          try {
            ms += data.data;

            try {
              output = parse(ms || "[]");
            } catch (error) {
              console.log("error", error);
            }
            if (Array.isArray(output)) {
              setQuestions(output);
            } else {
              console.log("response is not parseable into an array");
            }
          } catch (error) {
            console.log("error", error, "data received", "'" + data + "'");
          }
        },
        onAbort: () => {
          setLoading(false);
          abortLoad();
        },
        onFinish: () => {
          setLoading(false);
          abortLoad();
        },
      },
    );
  };

  const onGenerateScenarios = (event) => {
    abortLoad();
    ctrl = new AbortController();
    setLoading(true);

    const selectedClarifications = selections.map((selectedIndex) => {
      const scenario = questions[selectedIndex];
      return {
        question: scenario.question,
        answer: scenario.answer,
      };
    });
    console.log(selectedClarifications);

    const uri = "/api/story-validation/scenarios";

    let ms = "";

    fetchSSE2(
      () => {
        console.log(promptInput);
        const response = fetch(uri, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: promptInput,
            chat_session_id: chatSessionId,
            answers: selectedClarifications,
          }),
        });

        return response;
      },
      {
        onErrorHandle: () => {
          setLoading(false);
          abortLoad();
        },
        onMessageHandle: (data) => {
          try {
            ms += data;

            setStoryScenarios(ms);
          } catch (error) {
            console.log("error", error, "data received", "'" + data + "'");
          }
        },
        onAbort: () => {
          setLoading(false);
          abortLoad();
        },
        onFinish: () => {
          setLoading(false);
          abortLoad();
        },
      },
    );
  };

  const copyScenarios = () => {
    navigator.clipboard.writeText(storyScenarios);
  };

  return (
    <>
      <div id="canvas">
        <div id="prompt-center">
          <h2>Validate and refine a user story</h2>
          <h3>Step 1: Discover gaps in your story</h3>
          <div className="scenario-inputs">
            <div className="scenario-input">
              <label>High level requirements</label>
              <TextArea
                placeholder="What do you have so far?"
                value={promptInput}
                onChange={(e, v) => {
                  setPromptInput(e.target.value);
                }}
                rows={5}
              />
            </div>
            <Button type="primary" onClick={onSubmitPrompt}>
              Go
            </Button>
          </div>
          &nbsp;
          {isLoading && (
            <div style={{ marginTop: 10 }}>
              <Spin />
              <div style={{ marginLeft: 105, display: "inline-block" }}>
                &nbsp;
              </div>

              <Button type="primary" danger onClick={abortLoad}>
                Stop
              </Button>
            </div>
          )}
        </div>

        <div className={"scenarios-collection cards-display"}>
          {questions.map((question, i) => {
            return (
              <Card
                key={i}
                className="scenario"
                title={<>{question.question}</>}
                actions={[
                  <input
                    key={"cb" + i}
                    type="checkbox"
                    className="select-scenario"
                    onChange={onQuestionSelectionChanged(i)}
                  />,
                ]}
              >
                <div className="q-a-card-content">
                  {question.question && (
                    <div className="card-prop stackable">
                      <div className="card-prop-name">Suggested answer</div>
                      <div>
                        <TextArea
                          className="answer-overwrite"
                          value={question.answer}
                          onChange={(e) => {
                            const updatedQuestions = [...questions];
                            updatedQuestions[i].answer = e.target.value;
                            setQuestions(updatedQuestions);
                          }}
                          rows={8}
                        ></TextArea>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {questions.length > 0 && (
          <div className="generate-instructions">
            <h3>Step 2: Generate scenarios</h3>
            Go through the questions, select the ones that are relevant and
            refine the answers.
            <br />
            Once you're happy with the selected answers, you can generate
            given/when/then scenarios for this story <br />
            <Button type="primary" onClick={onGenerateScenarios}>
              Generate
            </Button>
          </div>
        )}
        {storyScenarios && (
          <div className="generated-text-results">
            <Button type="primary" onClick={copyScenarios}>
              Copy
            </Button>
            <ReactMarkdown>{storyScenarios}</ReactMarkdown>
          </div>
        )}
      </div>
    </>
  );
};

export default Home;
