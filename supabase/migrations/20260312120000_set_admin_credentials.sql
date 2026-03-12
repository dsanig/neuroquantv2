-- Ensure development admin credentials are consistent.
-- Email: admin@admin.com
-- Password: adminadmin
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Reuse an existing admin user if present.
  SELECT id
    INTO target_user_id
  FROM auth.users
  WHERE email IN ('admin@admin.com', 'admin@neuroquant.io')
  ORDER BY CASE WHEN email = 'admin@admin.com' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  IF target_user_id IS NULL THEN
    target_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      target_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@admin.com',
      crypt('adminadmin', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );
  ELSE
    UPDATE auth.users
    SET
      email = 'admin@admin.com',
      encrypted_password = crypt('adminadmin', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb,
      updated_at = now()
    WHERE id = target_user_id;
  END IF;

  -- Keep identity table in sync for email/password sign-in.
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    target_user_id,
    'admin@admin.com',
    format('{"sub":"%s","email":"%s"}', target_user_id, 'admin@admin.com')::jsonb,
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  -- Prevent duplicate stale email account from remaining as the intended admin.
  DELETE FROM auth.users
  WHERE email = 'admin@neuroquant.io' AND id <> target_user_id;
END;
$$;
