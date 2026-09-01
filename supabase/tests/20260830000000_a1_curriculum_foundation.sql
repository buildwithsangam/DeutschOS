begin;

select plan(16);

select has_table('public', 'curriculum_provenance_sources');
select has_table('public', 'curriculum_releases');
select has_table('public', 'curriculum_weeks');
select has_table('public', 'curriculum_days');
select has_table('public', 'curriculum_day_sections');
select has_table('public', 'curriculum_exercises');
select has_table('public', 'curriculum_mastery_checks');

select has_column('public', 'curriculum_days', 'objective');
select has_column('public', 'curriculum_days', 'stable_key');
select has_column('public', 'curriculum_day_sections', 'content_schema_version');
select has_column('public', 'curriculum_day_sections', 'content');
select has_column('public', 'curriculum_day_sections', 'is_required');
select has_column('public', 'curriculum_exercises', 'definition');
select has_column('public', 'curriculum_mastery_checks', 'definition');

select policies_are(
  'public',
  'curriculum_days',
  array[]::name[],
  'curriculum days deny direct browser access until a narrow policy is introduced'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.curriculum_days'::regclass),
  'curriculum days have row-level security enabled'
);

select finish();

rollback;
