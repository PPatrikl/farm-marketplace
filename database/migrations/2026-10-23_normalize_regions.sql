-- Migration: normalize region values in farms and forest_listings
-- Date: 2026-10-23
-- Applied to Supabase: yes (SQL Editor, 2026-10-23)
--
-- Why: the region column contained a mix of formats:
--   readable names ('Uusimaa'), form codes ('keski-suomi'),
--   wrong capitalisation ('Pohjois-pohjanmaa').
--   The same region could appear in two spellings, and codes showed
--   on the pages as-is (e.g. "Jyväskylä, keski-suomi").
--
-- Fix: every code / spelling variant -> the official Finnish name.
-- From now on the form (RegionSelect in sharedFormFields.tsx) saves the
-- Finnish name too, so new rows stay consistent.
-- Empty regions are left as they are.

-- 1) farms
with regions(code, name) as (values
  ('ahvenanmaa','Ahvenanmaa'), ('etela-karjala','Etelä-Karjala'), ('etela-pohjanmaa','Etelä-Pohjanmaa'),
  ('etela-savo','Etelä-Savo'), ('kainuu','Kainuu'), ('kanta-hame','Kanta-Häme'),
  ('keski-pohjanmaa','Keski-Pohjanmaa'), ('keski-suomi','Keski-Suomi'), ('kymenlaakso','Kymenlaakso'),
  ('lappi','Lappi'), ('pirkanmaa','Pirkanmaa'), ('pohjanmaa','Pohjanmaa'),
  ('pohjois-karjala','Pohjois-Karjala'), ('pohjois-pohjanmaa','Pohjois-Pohjanmaa'), ('pohjois-savo','Pohjois-Savo'),
  ('paijat-hame','Päijät-Häme'), ('satakunta','Satakunta'), ('uusimaa','Uusimaa'), ('varsinais-suomi','Varsinais-Suomi')
)
update farms f
set region = r.name
from regions r
where lower(f.region) = r.code or lower(f.region) = lower(r.name);

-- 2) forest_listings
with regions(code, name) as (values
  ('ahvenanmaa','Ahvenanmaa'), ('etela-karjala','Etelä-Karjala'), ('etela-pohjanmaa','Etelä-Pohjanmaa'),
  ('etela-savo','Etelä-Savo'), ('kainuu','Kainuu'), ('kanta-hame','Kanta-Häme'),
  ('keski-pohjanmaa','Keski-Pohjanmaa'), ('keski-suomi','Keski-Suomi'), ('kymenlaakso','Kymenlaakso'),
  ('lappi','Lappi'), ('pirkanmaa','Pirkanmaa'), ('pohjanmaa','Pohjanmaa'),
  ('pohjois-karjala','Pohjois-Karjala'), ('pohjois-pohjanmaa','Pohjois-Pohjanmaa'), ('pohjois-savo','Pohjois-Savo'),
  ('paijat-hame','Päijät-Häme'), ('satakunta','Satakunta'), ('uusimaa','Uusimaa'), ('varsinais-suomi','Varsinais-Suomi')
)
update forest_listings f
set region = r.name
from regions r
where lower(f.region) = r.code or lower(f.region) = lower(r.name);