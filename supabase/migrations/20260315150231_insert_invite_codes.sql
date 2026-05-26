-- 10 invite codes for early access. Email is a placeholder (not a real address).
INSERT INTO public.waitlist (email, access_token, status, invited_at) VALUES
  ('invite-01@zenvi.internal', '8b6e6b4f-8e50-482a-89a1-8d2b78b548b2', 'invited', now()),
  ('invite-02@zenvi.internal', 'ef2cf75c-7d9a-4c28-912a-0a78dbd56b02', 'invited', now()),
  ('invite-03@zenvi.internal', 'a9b2c3d4-e5f6-47b8-a9c0-1e2f3a4b5c6d', 'invited', now()),
  ('invite-04@zenvi.internal', '9c4d28e7-5b6c-48fa-88bd-87e3d9fa0e21', 'invited', now()),
  ('invite-05@zenvi.internal', '5f2b8d0c-a9d7-4632-90b1-ce2813a48e71', 'invited', now()),
  ('invite-06@zenvi.internal', '7d3a8e9b-cf10-4286-90bd-f40b2a75dcb1', 'invited', now()),
  ('invite-07@zenvi.internal', '4b0d2e8f-7c6a-4952-b8bd-9b37a4e6012c', 'invited', now()),
  ('invite-08@zenvi.internal', '2e7b8c9d-fa0e-412f-963d-4c7b8e210a56', 'invited', now()),
  ('invite-09@zenvi.internal', 'b9e0f3d4-c5a6-4f7e-89bd-a0c1d2e3f4b5', 'invited', now()),
  ('invite-10@zenvi.internal', '1c2d3e4f-5a6b-47c8-9d0e-1a2b3c4d5e6f', 'invited', now())
ON CONFLICT (email) DO NOTHING;