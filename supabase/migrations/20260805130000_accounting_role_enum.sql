-- Add accounting to user_role enum (must commit before use)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'accounting';
