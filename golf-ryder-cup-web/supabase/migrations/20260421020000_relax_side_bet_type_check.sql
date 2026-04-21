-- side_bets.bet_type CHECK was frozen on the long-form names
-- ('closest_to_pin', 'longest_drive'), but the app's SideBetType union
-- and the sync writer both use the short codes 'ctp' and 'longdrive'.
-- Every CTP or long-drive bet upsert was 400ing silently. Accept both
-- so existing rows (if any long-form values exist) and new rows (short
-- codes) coexist without a data migration.
--
-- Applied to production via Supabase MCP on 2026-04-21.

ALTER TABLE public.side_bets
  DROP CONSTRAINT IF EXISTS side_bets_bet_type_check;

ALTER TABLE public.side_bets
  ADD CONSTRAINT side_bets_bet_type_check
  CHECK (bet_type IN (
    'skins',
    'nassau',
    'ctp',
    'closest_to_pin',
    'longdrive',
    'longest_drive',
    'custom'
  ));
