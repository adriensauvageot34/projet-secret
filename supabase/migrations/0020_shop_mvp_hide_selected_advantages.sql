-- Tomorrow MVP hotfix: hide selected advantages from the player shop without touching runtime instances.
update advantage_templates
set
  is_active = false,
  updated_at = timezone('utc', now())
where effect_code in (
  'free_skip',
  'cancel_skip_penalty',
  'double_next_mission_value',
  'next_correct_accusation_bonus_3',
  'unlock_slot_now'
);
