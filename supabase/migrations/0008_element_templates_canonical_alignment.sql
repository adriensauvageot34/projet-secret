alter table element_templates
  rename column points to base_points;

alter table element_templates
  rename column player_description to player_display_text;

alter table element_templates
  add column if not exists duration_seconds integer,
  add column if not exists skip_unlock_rule text,
  add column if not exists ui_tag_1 text,
  add column if not exists ui_tag_2 text,
  add column if not exists success_button_label text,
  add column if not exists failure_button_label text;

update element_templates
set
  duration_seconds = coalesce(duration_seconds, duration_minutes * 60),
  skip_unlock_rule = coalesce(
    skip_unlock_rule,
    case
      when skip_unlock_minutes * 2 >= duration_minutes then 'one_half'
      else 'one_third'
    end
  ),
  ui_tag_1 = coalesce(ui_tag_1, nullif(ui_tags[1], ''), ''),
  ui_tag_2 = coalesce(ui_tag_2, nullif(ui_tags[2], ''), ''),
  success_button_label = coalesce(success_button_label, 'Réussi'),
  failure_button_label = coalesce(failure_button_label, case when element_type = 'constraint' then 'Cassée' else 'Raté' end)
where duration_seconds is null
   or skip_unlock_rule is null
   or ui_tag_1 is null
   or ui_tag_2 is null
   or success_button_label is null
   or failure_button_label is null;

alter table element_templates
  alter column duration_seconds set not null,
  alter column skip_unlock_rule set not null,
  alter column ui_tag_1 set not null,
  alter column ui_tag_2 set not null,
  alter column success_button_label set not null,
  alter column failure_button_label set not null;

alter table element_templates
  drop constraint if exists element_templates_values_check;

alter table element_templates
  add constraint element_templates_skip_unlock_rule_check
  check (skip_unlock_rule in ('one_third', 'one_half')),
  add constraint element_templates_values_check
  check (
    difficulty >= 1
    and base_points >= 0
    and duration_seconds > 0
  );

alter table element_templates
  drop column if exists duration_minutes,
  drop column if exists skip_unlock_minutes,
  drop column if exists short_label,
  drop column if exists ui_tags;
