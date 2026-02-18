import { tools } from "./tool_registry.js";
import { getSession, updateSession } from "./session_memory.js";
import { createPlan } from "./planner.js";
import { executeLoop } from "./agent_loop.js";
import { getProfile, logAction, applyPersonalization } from "./preference_engine.js";
import { determinePersona } from "./persona_engine.js";
import { buildSystemPrompt, formatResponse } from "./response_policy.js";

export async function executeAgent(message, sessionId = "default", userId = "default") {
  const session = getSession(sessionId);
  const profile = getProfile(userId);

  try {
    // 1) Persona
    const persona = await determinePersona({ text: message, userProfile: profile, session });

    // 2) Plan
    const availableTools = Object.keys(tools);
    const plan = await createPlan(message, availableTools);

    // 3) Clarification (persona-aware)
    if (plan.needsClarification) {
      const payload = {
        success: true,
        type: "clarification",
        goal: plan.goal,
        data: { question: plan.clarificationQuestion },
        confidence: 0.5,
        persona
      };

      // Do not force greeted here; only mark greeted once when you actually greet elsewhere
      updateSession(sessionId, { lastMode: persona.mode });

      return {
        ...payload,
        message: formatResponse(payload, persona),
        systemPrompt: buildSystemPrompt({ ...persona, session })
      };
    }

    // 4) Execute
    const execution = await executeLoop(plan, sessionId);

    // 5) Personalization (guard against empty)
    const personalization =
      execution.results?.length > 0
        ? applyPersonalization(userId, plan.steps[0].tool, plan.steps[0].input, execution.results[0].result)
        : { applied: false, basedOn: [], message: null };

    // 6) Log actions with outcome (do not learn from failures later)
    (execution.stepsExecuted || []).forEach((s, idx) => {
      const step = plan.steps[idx];
      if (!step) return;

      logAction(userId, {
        event_type: "tool_run",
        tool: step.tool,
        intent: plan.goal,
        entities_json: step.input,
        status: s.status || "success",
        confidence: s.confidence ?? 0.8,
        source: "text",
        latency_ms: s.latency_ms ?? null
      });
    });

    // 7) Update session (do NOT force greeted=true every turn)
    updateSession(sessionId, {
      lastIntent: plan.goal,
      lastEntities: {},
      lastToolResults: execution.results,
      lastMode: persona.mode
    });

    // 8) Build human message
    const responsePayload = {
      success: true,
      type: determineType(plan.steps),
      goal: plan.goal,
      stepsExecuted: execution.stepsExecuted,
      finalRecommendation: execution.finalRecommendation,
      reasoningSummary: buildReasoningSummary(plan, execution),
      confidence: execution.finalRecommendation?.confidence ?? 0.8,
      personalizationApplied: personalization.applied,
      basedOn: personalization.basedOn,
      personalizationMessage: personalization.message,
      persona
    };

    return {
      ...responsePayload,
      message: formatResponse(responsePayload, persona),
      systemPrompt: buildSystemPrompt({ ...persona, session })
    };
  } catch (error) {
    const payload = {
      success: false,
      type: "error",
      reasoning: `Agent execution failed: ${error.message}`,
      confidence: 0,
      persona: { mode: "anchor" } // safest fallback tone
    };

    return {
      ...payload,
      message: formatResponse(payload, payload.persona)
    };
  }
}

function determineType(steps) {
  if (!steps || steps.length > 1) return "multi_step";
  const actionTools = ["route_planner", "code_editor", "notepad", "sketchpad"];
  const analysisTools = ["code_analyzer", "deal_finder"];

  const firstTool = steps[0]?.tool;
  if (actionTools.includes(firstTool)) return "action";
  if (analysisTools.includes(firstTool)) return "analysis";
  return "information";
}

function buildReasoningSummary(plan, execution) {
  const successCount = (execution.stepsExecuted || []).filter((s) => s.status === "success").length;
  const total = plan.steps?.length ?? 0;
  const summary = execution.finalRecommendation?.summary || "";
  return `Goal: ${plan.goal}. Executed ${successCount}/${total} steps. ${summary}`.trim();
}
