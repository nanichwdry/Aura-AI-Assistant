import { parseIntent } from './intent_parser.js';
import { tools } from './tool_registry.js';
import { getSession, updateSession } from './session_memory.js';
import { createPlan } from './planner.js';
import { executeLoop } from './agent_loop.js';
import { getProfile, logAction, applyPersonalization } from './preference_engine.js';
import { determinePersona } from './persona_engine.js';
import { buildSystemPrompt, formatResponse } from './response_policy.js';

export async function executeAgent(message, sessionId = 'default', userId = 'default') {
  const session = getSession(sessionId);
  const profile = getProfile(userId);
  
  try {
    // 1. Determine persona mode
    const persona = await determinePersona({
      text: message,
      userProfile: profile,
      session
    });

    // 2. Create execution plan
    const availableTools = Object.keys(tools);
    const plan = await createPlan(message, availableTools);
    
    // 3. Check if clarification needed
    if (plan.needsClarification) {
      return {
        success: true,
        type: 'clarification',
        reasoning: 'Need more information to proceed',
        data: { question: plan.clarificationQuestion },
        confidence: 0.5,
        persona
      };
    }
    
    // 4. Execute multi-step plan
    const execution = await executeLoop(plan, sessionId);
    
    // 5. Apply personalization
    const personalization = execution.results.length > 0
      ? applyPersonalization(userId, plan.steps[0].tool, plan.steps[0].input, execution.results[0].result)
      : { applied: false, basedOn: [] };
    
    // 6. Log actions for learning
    plan.steps.forEach(step => {
      logAction(userId, `${step.tool}_use`, step.input);
    });
    
    // 7. Update session with persona
    updateSession(sessionId, {
      lastIntent: plan.goal,
      lastEntities: {},
      lastToolResults: execution.results,
      lastMode: persona.mode,
      greeted: true
    });
    
    // 8. Return structured response with persona
    return {
      success: true,
      type: determineType(plan.steps),
      goal: plan.goal,
      stepsExecuted: execution.stepsExecuted,
      finalRecommendation: execution.finalRecommendation,
      reasoningSummary: buildReasoningSummary(plan, execution),
      confidence: execution.finalRecommendation.confidence || 0.8,
      personalizationApplied: personalization.applied,
      basedOn: personalization.basedOn,
      personalizationMessage: personalization.message,
      persona
    };
    
  } catch (error) {
    return {
      success: false,
      type: 'error',
      reasoning: `Agent execution failed: ${error.message}`,
      data: null,
      confidence: 0
    };
  }
}

export function getPersonaSystemPrompt(persona, session) {
  return buildSystemPrompt({ ...persona, session });
}

export function formatPersonaResponse(response, persona) {
  return formatResponse(response, persona);
}

function determineType(steps) {
  if (steps.length > 1) return 'multi_step';
  const actionTools = ['route_planner', 'code_editor', 'notepad', 'sketchpad'];
  const analysisTools = ['code_analyzer', 'deal_finder'];
  
  const firstTool = steps[0]?.tool;
  if (actionTools.includes(firstTool)) return 'action';
  if (analysisTools.includes(firstTool)) return 'analysis';
  return 'information';
}

function buildReasoningSummary(plan, execution) {
  const successCount = execution.stepsExecuted.filter(s => s.status === 'success').length;
  return `Goal: ${plan.goal}. Executed ${successCount}/${plan.steps.length} steps successfully. ${execution.finalRecommendation.summary}`;
}
