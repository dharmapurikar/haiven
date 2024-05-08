import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { fetchSSE } from "../app/_fetch_sse";
import { Drawer, Card, Space, Spin, Button, Radio, Input } from "antd";
const { TextArea } = Input;
import ScenariosPlot from "./_plot";
import ChatExploration from "./_chat_exploration";
import { parse } from "best-effort-json-parser";
import { AiOutlineBorderInner, AiOutlineGroup } from "react-icons/ai";

const SelectedItemsMenu = ({
  selections,
  items,
  onClickBrainstormStrategies,
  onClickCreateStoryboard,
}) => {
  return (
    <div className="selected-items-menu">
      <span>
        {selections.length} of {items.length} scenarios selected:
      </span>
      &nbsp;
      <Space wrap>
        <Button type="primary" onClick={onClickBrainstormStrategies}>
          Brainstorm strategies and questions
        </Button>
        {selections.length == 1 && (
          <Button type="primary" onClick={onClickCreateStoryboard}>
            Create a storyboard for this scenario
          </Button>
        )}
      </Space>
    </div>
  );
};

let ctrl;

const Home = () => {
  const [scenarios, setScenarios] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [selections, setSelections] = useState([]);
  const [displayMode, setDisplayMode] = useState("grid");
  const [promptDataFlow, setPromptDataFlow] = useState("");
  const [promptUserBase, setPromptUserBase] = useState("");
  const [promptAssets, setPromptAssets] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("Explore scenario");
  const [chatContext, setChatContext] = useState({});
  const [savedIdeas, setSavedIdeas] = useState([]);
  const router = useRouter();

  function abortLoad() {
    ctrl && ctrl.abort();
    setLoading(false);
  }

  const onExplore = (id) => {
    setDrawerTitle("Explore scenario: " + scenarios[id].title);
    setChatContext({
      id: id,
      originalPrompt: promptDataFlow,
      type: "scenario",
      ...scenarios[id],
    });
    setDrawerOpen(true);
  };

  const onSave = async (id) => {
    const scenario = scenarios[id];
    const body = scenario;
    body.prompt = promptDataFlow;
    body.type = "scenario";
    const resp = await fetch("/api/save-idea", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    setSavedIdeas([...savedIdeas, id]);
    console.log("Saved idea", data);
  };

  const onClickBrainstormStrategies = () => {
    const scenariosParams = selections.map((selectedIndex) => {
      // console.log("i", selectedIndex);
      const scenario = scenarios[selectedIndex];
      // console.log("s", scenario);
      return (
        "scenarios=" +
        encodeURIComponent(scenario.title + ": " + scenario.summary)
      );
    });
    const url =
      "/strategies?strategic_prompt=" +
      encodeURIComponent(promptDataFlow) +
      "&" +
      scenariosParams.join("&");
    window.open(url, "_blank", "noreferrer");
  };

  const onClickCreateStoryboard = () => {
    const scenario = scenarios[selections[0]];
    const url =
      "/storyboard?prompt=" +
      encodeURIComponent(scenario.title + ": " + scenario.summary);
    window.open(url, "_blank", "noreferrer");
  };

  const onSelectDisplayMode = (event) => {
    setDisplayMode(event.target.value);
  };

  const onScenarioSelectChanged = (index) => {
    return (event) => {
      console.log("event for " + index, event);
      console.log(
        (event.target.checked ? "selected" : "deselected") + " scenario",
        scenarios[index],
      );
      if (event.target.checked && selections.indexOf(index) == -1)
        setSelections([...selections, index]);
      else setSelections(selections.filter((s) => s != index));
    };
  };

  const onSubmitPrompt = (event) => {
    abortLoad();
    ctrl = new AbortController();
    setLoading(true);
    setSelections([]);

    const uri =
      "/api/threat-modelling" +
      "?dataFlow=" +
      encodeURIComponent(promptDataFlow);
    +"?assets=" +
      encodeURIComponent(promptAssets) +
      "?userBase=" +
      encodeURIComponent(promptUserBase);

    let ms = "";
    let output = [];

    fetchSSE({
      url: uri,
      onData: (event, sse) => {
        const data = JSON.parse(event.data);
        ms += data.data;
        try {
          output = parse(ms || "[]");
        } catch (error) {
          console.log("error", error);
        }
        if (Array.isArray(output)) {
          setScenarios(output);
        } else {
          console.log("response is not parseable into an array");
        }
      },
      onStop: () => {
        setLoading(false);
        abortLoad();
      },
    });
  };

  const query = router.query;
  const params = query;
  const initialStrategicPrompt = params.strategic_prompt;
  // const promptRef = useRef();
  const [initialLoadDone, setInitialLoad] = useState(false);

  useEffect(() => {
    if (!initialStrategicPrompt) return;
    if (!router.isReady) return;
    if (initialLoadDone) return;
    setPromptDataFlow(initialStrategicPrompt);
    setInitialLoad(true);
  });

  return (
    <>
      <Drawer
        title={drawerTitle}
        mask={false}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <ChatExploration context={chatContext} />
      </Drawer>
      <div id="canvas">
        <div id="prompt-center">
          <b style={{ fontSize: 20, display: "inline-block" }}>
            Threat Modelling
          </b>
          &nbsp;
          <Radio.Group
            onChange={onSelectDisplayMode}
            defaultValue="grid"
            style={{ float: "right" }}
          >
            <Radio.Button value="grid">
              <AiOutlineGroup
                style={{
                  display: "inline-block",
                  verticalAlign: "middle",
                  height: 14,
                }}
              />{" "}
              Cards
            </Radio.Button>
            <Radio.Button value="plot">
              <AiOutlineBorderInner
                style={{
                  display: "inline-block",
                  verticalAlign: "middle",
                  height: 14,
                }}
              />{" "}
              Matrix
            </Radio.Button>
          </Radio.Group>
          <br />
          <br />
          <div className="scenario-inputs">
            <div className="scenario-input">
              <label>Users</label>{" "}
              <Input
                placeholder="Describe the user base, e.g. if it's B2C, B2B, internal, ..."
                value={promptUserBase}
                onChange={(e, v) => {
                  setPromptUserBase(e.target.value);
                }}
              />
            </div>
            <div className="scenario-input">
              <label>Assets</label>{" "}
              <Input
                placeholder="Describe any important assets that need to be protected"
                value={promptAssets}
                onChange={(e, v) => {
                  setPromptAssets(e.target.value);
                }}
              />
            </div>
            <div className="scenario-input">
              <label>Data flow</label>
              <TextArea
                placeholder="Describe how data flows through your system"
                value={promptDataFlow}
                onChange={(e, v) => {
                  setPromptDataFlow(e.target.value);
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
          {selections.length > 0 && (
            <SelectedItemsMenu
              selections={selections}
              items={scenarios}
              onClickBrainstormStrategies={onClickBrainstormStrategies}
              onClickCreateStoryboard={onClickCreateStoryboard}
            />
          )}
        </div>

        <div className={"scenarios-collection " + displayMode + "-display"}>
          {scenarios.map((scenario, i) => {
            return (
              <Card
                key={i}
                className="scenario"
                title={<>{scenario.title}</>}
                actions={[
                  <input
                    key={"cb" + i}
                    type="checkbox"
                    className="select-scenario"
                    onChange={onScenarioSelectChanged(i)}
                  />,
                  <Button
                    type="link"
                    key="explore"
                    onClick={() => onExplore(i)}
                  >
                    Explore
                  </Button>,
                  <>
                    {savedIdeas.includes(i) && (
                      <Button
                        type="link"
                        key="saved"
                        onClick={() => onSave(i)}
                        style={{ padding: 0 }}
                      >
                        Saved
                      </Button>
                    )}
                    {!savedIdeas.includes(i) && (
                      <Button
                        type="link"
                        key="save"
                        onClick={() => onSave(i)}
                        style={{ padding: 0 }}
                      >
                        Save
                      </Button>
                    )}
                  </>,
                ]}
              >
                <div className="scenario-card-content">
                  {scenario.category && (
                    <div className="card-prop stackable">
                      <div className="card-prop-name">Category</div>
                      <div className="card-prop-value">{scenario.category}</div>
                    </div>
                  )}
                  <div className="card-prop-name">Description</div>
                  <div className="scenario-summary">{scenario.summary}</div>
                  {scenario.probability && (
                    <div className="card-prop stackable">
                      <div className="card-prop-name">Probability</div>
                      <div className="card-prop-value">
                        {scenario.probability}
                      </div>
                    </div>
                  )}
                  {scenario.impact && (
                    <div className="card-prop stackable">
                      <div className="card-prop-name">Potential impact</div>
                      <div className="card-prop-value">{scenario.impact}</div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <div
          className="scenarios-plot-container"
          style={{ display: displayMode == "plot" ? "block" : "none" }}
        >
          <ScenariosPlot
            scenarios={scenarios}
            visible={displayMode == "plot"}
          />
        </div>
      </div>
    </>
  );
};

export default Home;
