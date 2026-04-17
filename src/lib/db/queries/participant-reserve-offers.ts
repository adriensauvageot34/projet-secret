import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ParticipantReserveOffer, ParticipantReserveOfferWithTemplate } from "@/types/domain";

export async function listVisibleReserveOffersByParticipant(participantId: string): Promise<ParticipantReserveOfferWithTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("participant_reserve_offers")
    .select(`
      id,
      session_id,
      participant_id,
      element_template_id,
      offered_at,
      revoked_at,
      replaced_by_offer_id,
      created_at,
      updated_at,
      element_templates!inner(
        id,
        name,
        code,
        element_type,
        difficulty,
        duration_seconds,
        validation_mode
      )
    `)
    .eq("participant_id", participantId)
    .is("revoked_at", null)
    .order("offered_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list visible reserve offers by participant: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const template = Array.isArray(row.element_templates) ? row.element_templates[0] : row.element_templates;

    return {
      id: row.id as string,
      session_id: row.session_id as string,
      participant_id: row.participant_id as string,
      element_template_id: row.element_template_id as string,
      offered_at: row.offered_at as string,
      revoked_at: (row.revoked_at as string | null) ?? null,
      replaced_by_offer_id: (row.replaced_by_offer_id as string | null) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      template: {
        id: template.id as string,
        name: template.name as string,
        code: template.code as string,
        element_type: template.element_type as "mission" | "constraint",
        difficulty: template.difficulty as number,
        duration_seconds: template.duration_seconds as number,
        validation_mode: template.validation_mode as "auto" | "proof" | "gm",
      },
    };
  });
}

export async function listVisibleReserveOffersByParticipantInSession(
  participantId: string,
  sessionId: string,
): Promise<ParticipantReserveOfferWithTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("participant_reserve_offers")
    .select(`
      id,
      session_id,
      participant_id,
      element_template_id,
      offered_at,
      revoked_at,
      replaced_by_offer_id,
      created_at,
      updated_at,
      element_templates!inner(
        id,
        name,
        code,
        element_type,
        difficulty,
        duration_seconds,
        validation_mode
      )
    `)
    .eq("participant_id", participantId)
    .eq("session_id", sessionId)
    .is("revoked_at", null)
    .order("offered_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list visible reserve offers by participant in session: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const template = Array.isArray(row.element_templates) ? row.element_templates[0] : row.element_templates;

    return {
      id: row.id as string,
      session_id: row.session_id as string,
      participant_id: row.participant_id as string,
      element_template_id: row.element_template_id as string,
      offered_at: row.offered_at as string,
      revoked_at: (row.revoked_at as string | null) ?? null,
      replaced_by_offer_id: (row.replaced_by_offer_id as string | null) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      template: {
        id: template.id as string,
        name: template.name as string,
        code: template.code as string,
        element_type: template.element_type as "mission" | "constraint",
        difficulty: template.difficulty as number,
        duration_seconds: template.duration_seconds as number,
        validation_mode: template.validation_mode as "auto" | "proof" | "gm",
      },
    };
  });
}

export async function listVisibleReserveOffersBySession(sessionId: string): Promise<ParticipantReserveOffer[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("participant_reserve_offers")
    .select("*")
    .eq("session_id", sessionId)
    .is("revoked_at", null);

  if (error) {
    throw new Error(`Failed to list visible reserve offers by session: ${error.message}`);
  }

  return (data as ParticipantReserveOffer[] | null) ?? [];
}

export async function getVisibleReserveOfferById(offerId: string): Promise<ParticipantReserveOffer | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("participant_reserve_offers")
    .select("*")
    .eq("id", offerId)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get visible reserve offer: ${error.message}`);
  }

  return (data as ParticipantReserveOffer | null) ?? null;
}

export async function getVisibleReserveOfferByIdForParticipantSession(
  offerId: string,
  participantId: string,
  sessionId: string,
): Promise<ParticipantReserveOffer | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("participant_reserve_offers")
    .select("*")
    .eq("id", offerId)
    .eq("participant_id", participantId)
    .eq("session_id", sessionId)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get visible reserve offer for participant session: ${error.message}`);
  }

  return (data as ParticipantReserveOffer | null) ?? null;
}

export async function getReserveOfferById(offerId: string): Promise<ParticipantReserveOffer | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("participant_reserve_offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get reserve offer: ${error.message}`);
  }

  return (data as ParticipantReserveOffer | null) ?? null;
}

export async function getLatestRevokedReserveOfferForTemplate(
  participantId: string,
  sessionId: string,
  templateId: string,
): Promise<ParticipantReserveOffer | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("participant_reserve_offers")
    .select("*")
    .eq("participant_id", participantId)
    .eq("session_id", sessionId)
    .eq("element_template_id", templateId)
    .not("revoked_at", "is", null)
    .is("replaced_by_offer_id", null)
    .order("revoked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get latest revoked reserve offer by template: ${error.message}`);
  }

  return (data as ParticipantReserveOffer | null) ?? null;
}
