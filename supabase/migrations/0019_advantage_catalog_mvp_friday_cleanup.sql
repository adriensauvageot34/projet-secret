-- Friday MVP catalog cleanup: keep only the selected effect codes active in shop.
update advantage_templates
set
  is_active = case
    when effect_code in (
      'targeted_person_hint',
      'reveal_exact_mission_5m',
      'reveal_exact_constraint_5m',
      'force_public_hint_reveal',
      'freeze_timer_60s',
      'halve_slot_cooldown',
      'unlock_slot_now',
      'accelerate_slot_unlock',
      'shorten_own_constraint_timer',
      'reduce_other_mission_timer',
      'double_other_constraint_timer',
      'free_skip',
      'cancel_skip_penalty',
      'next_correct_accusation_bonus_3',
      'double_next_mission_value'
    ) then true
    else false
  end,
  updated_at = timezone('utc', now());
