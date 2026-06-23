-- =========================================
-- PEPE CLAIM - Schéma initial Supabase
-- =========================================

create extension if not exists "pgcrypto";

-- =========================================
-- TABLE: users
-- =========================================
create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    telegram_id bigint unique not null,
    username text,

    balance numeric(14,2) not null default 0,

    -- Système de claims (4 toutes les 15min, max 52/jour)
    claims_today integer not null default 0,
    claims_available integer not null default 4,
    last_claim timestamptz,
    last_recharge timestamptz not null default now(),

    -- Daily bonus
    last_bonus timestamptz,

    -- Parrainage
    referrer_id uuid references users(id) on delete set null,
    level1_count integer not null default 0,
    level2_count integer not null default 0,
    level3_count integer not null default 0,

    created_at timestamptz not null default now()
);

create index if not exists idx_users_telegram_id on users(telegram_id);
create index if not exists idx_users_referrer_id on users(referrer_id);

-- =========================================
-- TABLE: claim_history
-- =========================================
create table if not exists claim_history (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    reward numeric(14,2) not null,
    ad_network text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_claim_history_user_id on claim_history(user_id);

-- =========================================
-- TABLE: bonus_history
-- =========================================
create table if not exists bonus_history (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    reward numeric(14,2) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_bonus_history_user_id on bonus_history(user_id);

-- =========================================
-- TABLE: referral_earnings
-- =========================================
create table if not exists referral_earnings (
    id uuid primary key default gen_random_uuid(),
    from_user uuid not null references users(id) on delete cascade,
    to_user uuid not null references users(id) on delete cascade,
    level integer not null check (level in (1,2,3)),
    reward numeric(14,2) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_referral_earnings_to_user on referral_earnings(to_user);
create index if not exists idx_referral_earnings_from_user on referral_earnings(from_user);

-- =========================================
-- TABLE: withdrawals
-- =========================================
create table if not exists withdrawals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    wallet text not null,
    amount numeric(14,2) not null,
    status text not null default 'pending' check (status in ('pending','approved','rejected')),
    faucetpay_response jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_withdrawals_user_id on withdrawals(user_id);
create index if not exists idx_withdrawals_status on withdrawals(status);

-- =========================================
-- TABLE: games
-- =========================================
create table if not exists games (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    game_type text not null check (game_type in ('coinflip','dice','lucky_number','slots')),
    bet_amount numeric(14,2) not null,
    result text not null,
    win_amount numeric(14,2) not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_games_user_id on games(user_id);

-- =========================================
-- FIN DU SCHEMA
-- =========================================