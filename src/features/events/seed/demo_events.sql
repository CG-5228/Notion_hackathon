-- SYNTHETIC DEMO EVENTS — clearly labelled, no prefilled RSVPs.
-- Run after 0002 against a demo/dev database only. RSVP counts start at 0;
-- use test accounts clicking "I'm Going" to show counts changing.
insert into public.events (title, description, category, starts_at, ends_at, venue_public,
  event_kind, visibility, source_url, review_status, is_demo)
values
 ('[DEMO] Student Hackathon: AI for Student Life',
  'SYNTHETIC demo event. 24-hour build sprint for student teams.', 'hackathon',
  now() + interval '7 days', now() + interval '8 days', 'Main campus library foyer (public)',
  'curated_public', 'public', 'https://example.org/demo-hackathon', 'curated', true),
 ('[DEMO] Grocery run near campus',
  'SYNTHETIC demo activity. Split a trip to the supermarket beside the main gate.', 'groceries',
  now() + interval '2 days', now() + interval '2 days 1 hour', 'Supermarket entrance by the main campus gate',
  'student_created', 'public', null, 'student_posted', true),
 ('[DEMO] Cinema evening',
  'SYNTHETIC demo event. Evening screening at a city-centre cinema.', 'cinema',
  now() + interval '4 days', now() + interval '4 days 3 hours', 'City-centre cinema lobby',
  'curated_public', 'public', 'https://example.org/demo-cinema', 'curated', true);
