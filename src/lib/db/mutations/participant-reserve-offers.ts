import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ParticipantReserveOffer } from "@/types/domain";
import type { ParticipantReserveOfferInsert } from "@/types/database";

function assertSingleRow<T>(data: T | null, error: { message: string; code?: string } | null, context: string): T {
  if (error || !data) {
    throw new Error(`${context}: ${error?.message ?? "not found"}`);
  }

  return data;
}

export async function createReserveOffer(input: ParticipantReserveOfferInsert): Promise<ParticipantReserveOffer> {
  const supabase = createServerSupabaseClient();
  const payload = {
    session_id: input.session_id,
    participant_id: input.participant_id,
    element_template_id: input.element_template_id,
    offered_at: input.offered_at,
  };

  const { data, error } = await supabase
    .from("participant_reserve_offers")
    .insert(payload)
    .select("*")
    .single();

  return assertSingleRow(data as ParticipantReserveOffer | null, error, "Failed to create reserve offer");
}

export async function revokeReserveOffer(
  offerId: string,
  options?: { revokedAt?: string; replacedByOfferId?: string | null },
): Promise<ParticipantReserveOffer> {
  const supabase = createServerSupabaseClient();

  const updatePayload: { revoked_at: string; replaced_by_offer_id?: string | null } = {
    revoked_at: options?.revokedAt ?? new Date().toISOString(),
  };

  if (options?.replacedByOfferId !== undefined) {
    updatePayload.replaced_by_offer_id = options.replacedByOfferId;
  }

  const { data, error } = await supabase
    .from("participant_reserve_offers")
    .update(updatePayload)
    .eq("id", offerId)
    .is("revoked_at", null)
    .select("*")
    .single();

  return assertSingleRow(data as ParticipantReserveOffer | null, error, "Failed to revoke reserve offer");
}

export async function attachReplacementToReserveOffer(
  offerId: string,
  replacementOfferId: string,
): Promise<ParticipantReserveOffer> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("participant_reserve_offers")
    .update({ replaced_by_offer_id: replacementOfferId })
    .eq("id", offerId)
    .is("replaced_by_offer_id", null)
    .select("*")
    .single();

  return assertSingleRow(data as ParticipantReserveOffer | null, error, "Failed to attach replacement reserve offer");
}
