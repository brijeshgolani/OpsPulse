import unittest
from unittest.mock import patch

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langgraph.checkpoint.memory import MemorySaver

from app.agent.graph import build_sre_graph


class RepeatingToolModel:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.calls = 0

    def bind_tools(self, _tools):
        return self

    def invoke(self, _messages):
        self.calls += 1
        return next(self.responses)


class AgentIterationLimitTests(unittest.TestCase):
    def _tool_call(self, call_id):
        return AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "fetch_service_logs",
                    "args": {"service_name": "checkout-service"},
                    "id": call_id,
                    "type": "tool_call",
                }
            ],
        )

    def _run_graph(self, model):
        with patch("app.agent.graph.ChatGroq", return_value=model):
            graph = build_sre_graph(max_agent_iterations=2)
            return graph.invoke(
                {
                    "messages": [HumanMessage(content="Investigate the checkout alert")],
                    "incident_id": "test-incident",
                    "agent_iterations": 0,
                },
                config={"configurable": {"thread_id": "test-incident"}},
            )

    def test_finalizes_after_repeated_tool_requests(self):
        model = RepeatingToolModel(
            [
                self._tool_call("call-1"),
                self._tool_call("call-2"),
                AIMessage(content="Logs and the latest commit identify a token regression."),
            ]
        )

        result = self._run_graph(model)

        self.assertEqual(model.calls, 3)
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["agent_iterations"], 2)
        self.assertEqual(
            result["messages"][-1].content,
            "Logs and the latest commit identify a token regression.",
        )
        self.assertEqual(
            sum(isinstance(message, ToolMessage) for message in result["messages"]),
            1,
        )

    def test_allows_agent_to_finish_after_tool_result(self):
        model = RepeatingToolModel(
            [
                self._tool_call("call-1"),
                AIMessage(content="The logs point to an authorization regression."),
            ]
        )

        result = self._run_graph(model)

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["agent_iterations"], 2)
        self.assertEqual(
            result["messages"][-1].content,
            "The logs point to an authorization regression.",
        )

    def test_iteration_limit_resets_for_each_checkpointed_turn(self):
        model = RepeatingToolModel(
            [
                self._tool_call("call-1"),
                AIMessage(content="First turn summary."),
                self._tool_call("call-2"),
                AIMessage(content="Second turn summary."),
            ]
        )

        with patch("app.agent.graph.ChatGroq", return_value=model):
            graph = build_sre_graph(
                checkpointer=MemorySaver(),
                max_agent_iterations=2,
            )
            config = {"configurable": {"thread_id": "multi-turn-incident"}}
            first = graph.invoke(
                {
                    "messages": [HumanMessage(content="Inspect the logs")],
                    "incident_id": "multi-turn-incident",
                    "agent_iterations": 0,
                },
                config=config,
            )
            second = graph.invoke(
                {
                    "messages": [HumanMessage(content="Now check the related code")],
                    "incident_id": "multi-turn-incident",
                    "agent_iterations": 0,
                },
                config=config,
            )

        self.assertEqual(first["agent_iterations"], 2)
        self.assertEqual(second["agent_iterations"], 2)
        self.assertEqual(second["status"], "completed")
        self.assertEqual(model.calls, 4)


if __name__ == "__main__":
    unittest.main()
