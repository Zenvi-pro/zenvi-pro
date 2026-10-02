-- ============================================================================
-- A user may edit how their profile looks, not who it bills
-- ============================================================================
-- "Users can update own profile" covers every column, but stripe_customer_id
-- and email are maintained by the server (the Stripe webhook and the signup
-- trigger) and are not the user's to set. Updates are narrowed to the display
-- and preference columns; the server roles are unaffected.
--
-- APPLY ONLY AFTER the create-checkout-session edge function from this same
-- change is deployed. The old version saves a new customer id with the user's
-- own session; with this migration that write is refused, and every checkout
-- attempt before the first completed one would create a fresh Stripe customer.
-- ============================================================================

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles FROM anon, authenticated;

GRANT UPDATE (full_name, avatar_url, preferred_currency, billing_country)
  ON public.profiles TO authenticated;
