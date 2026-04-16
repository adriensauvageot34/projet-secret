import { createElementInstance, getEndsAt, getSkipAvailableAt } from "@/lib/db/mutations/element-instances";
import { getSkipUnlockTime, getEndTime, isEligibleForReserve } from "@/lib/game/engine/template-engine";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ElementInstance, ElementTemplate, Level, Participant, Session } from "@/types/domain";

type ActivationParticipant = Pick<Participant, "id" | "session_id" | "mission_slot_max" | "constraint_slot_max" | "current_level_id">;
type ActivationSession = Pick<Session, "id" | "max_active_missions" | "max_active_constraints">;
type ActivationLevel = Pick<Level, "id" | "mission_difficulty_max" | "constraint_difficulty_max">;
type ActivationTemplate = Pick<
  ElementTemplate,
  "id" | "element_type" | "difficulty" | "duration_seconds" | "skip_unlock_rule" | "proof_required" | "is_active" | "can_appear_in_reserve" | "can_be_fake"
>;
type ActiveSlotRow = { active_slot_index: number | null };

type ActivationPlanInput = {
  participant: ActivationParticipant;
  session: ActivationSession;
  template: ActivationTemplate;
  level: ActivationLevel | null;
  activeSlots: ActiveSlotRow[];
  requestedSlotIndex?: number;
  isFake: boolean;
  now: Date;
};

type ActivationPlan = {
  slotIndex: number;
  activatedAt: string;
  endsAt: string;
  skipAvailableAt: string;
  proofStatus: ElementInstance["proof_status"];
};

type ActivateElementDeps = {
  loadParticipant: (participantId: string) => Promise<ActivationParticipant | null>;
  loadSession: (sessionId: string) => Promise<ActivationSession | null>;
  loadTemplate: (templateId: string) => Promise<ActivationTemplate | null>;
  loadLevel: (levelId: string) => Promise<ActivationLevel | null>;
  listActiveSlots: (participantId: string, elementType: ElementTemplate["element_type"]) => Promise<ActiveSlotRow[]>;
  createInstance: (input: {
    participantId: string;
    sessionId: string;
    templateId: string;
    slotIndex: number;
    activatedAt: string;
    endsAt: string;
    skipAvailableAt: string;
    proofStatus: ElementInstance["proof_status"];
    isFake: boolean;
  }) => Promise<ElementInstance>;
  now: () => Date;
};

function assertEligibleTemplate(template: ActivationTemplate): void {
  if (!template.is_active) {
    throw new Error("Template is inactive");
  }

  if (!isEligibleForReserve(template)) {
    throw new Error("Template is not eligible for reserve activation");
  }
}

function assertTemplateLevelEligibility(template: ActivationTemplate, level: ActivationLevel | null): void {
  if (!level) {
    return;
  }

  if (template.element_type === "mission" && template.difficulty > level.mission_difficulty_max) {
    throw new Error("Template is not eligible for participant level");
  }

  if (template.element_type === "constraint" && template.difficulty > level.constraint_difficulty_max) {
    throw new Error("Template is not eligible for participant level");
  }
}

function computeTypeSlotLimit(
  participant: ActivationParticipant,
  session: ActivationSession,
  template: ActivationTemplate,
): number {
  if (template.element_type === "mission") {
    return Math.min(participant.mission_slot_max, session.max_active_missions);
  }

  return Math.min(participant.constraint_slot_max, session.max_active_constraints);
}

function resolveSlotIndex(activeSlots: ActiveSlotRow[], slotLimit: number, requestedSlotIndex?: number): number {
  if (slotLimit <= 0) {
    throw new Error("No active slot available for this element type");
  }

  const occupied = new Set(activeSlots.map((row) => row.active_slot_index).filter((value): value is number => value !== null));

  if (requestedSlotIndex !== undefined) {
    if (!Number.isInteger(requestedSlotIndex) || requestedSlotIndex < 0 || requestedSlotIndex >= slotLimit) {
      throw new Error(`Requested slot index ${requestedSlotIndex} is out of bounds (max ${slotLimit - 1})`);
    }
    if (occupied.has(requestedSlotIndex)) {
      throw new Error(`Requested slot ${requestedSlotIndex} is already occupied`);
    }
    return requestedSlotIndex;
  }

  for (let index = 0; index < slotLimit; index += 1) {
    if (!occupied.has(index)) {
      return index;
    }
  }

  throw new Error("No free slot available for activation");
}

export function buildActivationPlan(input: ActivationPlanInput): ActivationPlan {
  assertEligibleTemplate(input.template);
  assertTemplateLevelEligibility(input.template, input.level);

  if (input.isFake && !input.template.can_be_fake) {
    throw new Error("Template cannot be activated as fake");
  }

  const slotLimit = computeTypeSlotLimit(input.participant, input.session, input.template);
  const slotIndex = resolveSlotIndex(input.activeSlots, slotLimit, input.requestedSlotIndex);

  const activatedAt = input.now.toISOString();
  const endsAt = getEndTime(input.template, input.now).toISOString();
  const skipAvailableAt = getSkipUnlockTime(input.template, input.now).toISOString();

  return {
    slotIndex,
    activatedAt,
    endsAt,
    skipAvailableAt,
    proofStatus: input.template.proof_required ? "pending" : "not_required",
  };
}

function createDefaultDeps(): ActivateElementDeps {
  return {
    loadParticipant: async (participantId) => {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from("participants")
        .select("id, session_id, mission_slot_max, constraint_slot_max, current_level_id")
        .eq("id", participantId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to load participant for activation: ${error.message}`);
      }

      return (data as ActivationParticipant | null) ?? null;
    },
    loadSession: async (sessionId) => {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from("sessions")
        .select("id, max_active_missions, max_active_constraints")
        .eq("id", sessionId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to load session for activation: ${error.message}`);
      }

      return (data as ActivationSession | null) ?? null;
    },
    loadTemplate: async (templateId) => {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from("element_templates")
        .select("id, element_type, difficulty, duration_seconds, skip_unlock_rule, proof_required, is_active, can_appear_in_reserve, can_be_fake")
        .eq("id", templateId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to load element template for activation: ${error.message}`);
      }

      return (data as ActivationTemplate | null) ?? null;
    },
    loadLevel: async (levelId) => {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from("levels")
        .select("id, mission_difficulty_max, constraint_difficulty_max")
        .eq("id", levelId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to load level for activation: ${error.message}`);
      }

      return (data as ActivationLevel | null) ?? null;
    },
    listActiveSlots: async (participantId, elementType) => {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from("element_instances")
        .select("active_slot_index, element_templates!inner(element_type)")
        .eq("participant_id", participantId)
        .eq("state", "active")
        .eq("element_templates.element_type", elementType);

      if (error) {
        throw new Error(`Failed to load active slots for activation: ${error.message}`);
      }

      return (data as ActiveSlotRow[] | null) ?? [];
    },
    createInstance: async (input) =>
      createElementInstance({
        participantId: input.participantId,
        sessionId: input.sessionId,
        templateId: input.templateId,
        slotIndex: input.slotIndex,
        activatedAt: input.activatedAt,
        endsAt: input.endsAt,
        skipAvailableAt: input.skipAvailableAt,
        proofStatus: input.proofStatus,
        isFake: input.isFake,
      }),
    now: () => new Date(),
  };
}

export async function activateElement(
  participantId: string,
  templateId: string,
  slotIndex?: number,
  isFake = false,
  deps: ActivateElementDeps = createDefaultDeps(),
) {
  const participant = await deps.loadParticipant(participantId);
  if (!participant) {
    throw new Error("Participant not found");
  }

  const [session, template] = await Promise.all([
    deps.loadSession(participant.session_id),
    deps.loadTemplate(templateId),
  ]);

  if (!session) {
    throw new Error("Session not found for participant");
  }

  if (!template) {
    throw new Error("Element template not found");
  }

  const level = participant.current_level_id ? await deps.loadLevel(participant.current_level_id) : null;
  const activeSlots = await deps.listActiveSlots(participant.id, template.element_type);

  const plan = buildActivationPlan({
    participant,
    session,
    template,
    level,
    activeSlots,
    requestedSlotIndex: slotIndex,
    isFake,
    now: deps.now(),
  });

  const instance = await deps.createInstance({
    participantId,
    sessionId: session.id,
    templateId,
    slotIndex: plan.slotIndex,
    activatedAt: plan.activatedAt,
    endsAt: plan.endsAt,
    skipAvailableAt: plan.skipAvailableAt,
    proofStatus: plan.proofStatus,
    isFake,
  });

  return {
    instance,
    activeSlotIndex: instance.active_slot_index ?? plan.slotIndex,
    state: instance.state,
    activatedAt: instance.activated_at ?? plan.activatedAt,
    endsAt: getEndsAt(instance) ?? plan.endsAt,
    skipAvailableAt: getSkipAvailableAt(instance) ?? plan.skipAvailableAt,
  };
}
