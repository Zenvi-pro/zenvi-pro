-- 10 invite codes for early access. Email is a placeholder (not a real address).
INSERT INTO public.waitlist (email, access_token, status, invited_at) VALUES
  ('invite-01@zenvi.internal', '9413478a-23ce-4d65-954d-7baea4df1f64', 'invited', now()),
  ('invite-02@zenvi.internal', '8b1158a5-7bb7-4976-8cca-8046af8b7b50', 'invited', now()),
  ('invite-03@zenvi.internal', 'cc9ef45f-94b7-4ed1-9b2e-a6361e08a256', 'invited', now()),
  ('invite-04@zenvi.internal', 'e56ced0a-2f28-4bb3-b8ac-e5a3516daf97', 'invited', now()),
  ('invite-05@zenvi.internal', '23d5fab5-6777-4126-b80d-dcb3c894000f', 'invited', now()),
  ('invite-06@zenvi.internal', '61be0fd1-3ce4-448a-8862-261da8b7912d', 'invited', now()),
  ('invite-07@zenvi.internal', '2f18064f-7998-4ab2-a128-67ae9e51c4ff', 'invited', now()),
  ('invite-08@zenvi.internal', 'ef0070c3-b5d4-48fa-9c26-6ac6fc7ad395', 'invited', now()),
  ('invite-09@zenvi.internal', '374b8dc5-dd77-4a26-b491-cf283f4be272', 'invited', now()),
  ('invite-10@zenvi.internal', '380ddb3a-95ab-4df5-acd1-9e58768be4ed', 'invited', now())
ON CONFLICT (email) DO NOTHING;