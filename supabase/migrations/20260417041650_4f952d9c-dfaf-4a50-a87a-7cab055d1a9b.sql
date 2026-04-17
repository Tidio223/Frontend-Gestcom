
-- Créer le compte admin par défaut s'il n'existe pas
DO $$
DECLARE
  admin_user_id UUID;
  existing_id UUID;
BEGIN
  -- Vérifier si l'utilisateur existe déjà
  SELECT id INTO existing_id FROM auth.users WHERE email = 'admin@gestcom.com';
  
  IF existing_id IS NULL THEN
    admin_user_id := gen_random_uuid();
    
    -- Insérer dans auth.users avec mot de passe bcrypt
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      'admin@gestcom.com',
      crypt('Admin@2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"Super","last_name":"Admin"}'::jsonb,
      now(),
      now(),
      '', '', '', ''
    );
    
    -- Créer une identité email
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_user_id,
      jsonb_build_object('sub', admin_user_id::text, 'email', 'admin@gestcom.com', 'email_verified', true),
      'email',
      admin_user_id::text,
      now(),
      now(),
      now()
    );
    
    -- Le trigger handle_new_user a créé le profile et le rôle 'user'
    -- On supprime le rôle 'user' et on met 'admin'
    DELETE FROM public.user_roles WHERE user_id = admin_user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (admin_user_id, 'admin');
  ELSE
    -- S'il existe déjà, on s'assure qu'il est admin et débloqué
    DELETE FROM public.user_roles WHERE user_id = existing_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (existing_id, 'admin');
    UPDATE public.profiles SET is_blocked = false WHERE id = existing_id;
  END IF;
END $$;
