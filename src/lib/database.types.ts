/**
 * Tipos do schema Postgres (espelham /supabase/migrations).
 * Mantidos à mão para não depender do CLI do Supabase logado.
 */

/** Mapa de virtude → valor, ex.: `{ disciplina: 2, foco: 1 }`. Chaves são
 * os códigos canônicos de VIRTUE_CODES (src/features/gamification/engine). */
export type VirtueMap = Record<string, number>

export type ProfileRow = {
  id: string
  username: string | null
  avatar_url: string | null
  xp: number
  coins: number
  forca: number
  vitalidade: number
  foco: number
  carisma: number
  disciplina: number
  sabedoria: number
  streak_count: number
  longest_streak: number
  last_activity_date: string | null
  leaderboard_opt_in: boolean
  trello_token: string | null
  trello_member_id: string | null
  ai_api_key: string | null
  created_at: string
  updated_at: string
}

export type BoardConfigRow = {
  id: string
  user_id: string
  trello_board_id: string
  board_name: string
  done_list_id: string | null
  xp_multiplier: number
  active: boolean
  trello_webhook_id: string | null
  created_at: string
}

export type ActivitySource = 'trello' | 'manual'

export type ActivityRow = {
  id: string
  user_id: string
  source: ActivitySource
  trello_action_id: string | null
  mission_id: string | null
  trello_board_id: string | null
  card_id: string
  card_name: string
  type: string
  xp_awarded: number
  coins_awarded: number
  virtue_deltas: VirtueMap
  occurred_on: string
  created_at: string
}

export type AchievementRow = {
  code: string
  name: string
  description: string
  icon: string
  xp_reward: number
}

export type UserAchievementRow = {
  user_id: string
  achievement_code: string
  unlocked_at: string
}

export type MissionStatus = 'pending' | 'completed' | 'archived'
export type MissionRecurrence = 'none' | 'daily' | 'weekly'

export type MissionRow = {
  id: string
  user_id: string
  title: string
  description: string | null
  virtue_weights: VirtueMap
  xp_base: number
  coin_base: number
  recurrence: MissionRecurrence
  due_at: string | null
  status: MissionStatus
  completed_at: string | null
  created_at: string
}

export type RewardRow = {
  id: string
  user_id: string
  title: string
  description: string | null
  cost_coins: number
  active: boolean
  created_at: string
}

export type RewardRedemptionRow = {
  id: string
  user_id: string
  reward_id: string
  coins_spent: number
  redeemed_at: string
}

export type ItemRarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'mitico'
export type SpecialMissionStatus = 'active' | 'completed' | 'expired'

export type CollectionItemRow = {
  code: string
  name: string
  description: string
  icon: string
  rarity: ItemRarity
  xp_reward: number
}

export type UserItemRow = {
  user_id: string
  item_code: string
  unlocked_at: string
}

export type SpecialMissionRow = {
  id: string
  user_id: string
  item_code: string
  goal_count: number
  expires_at: string
  status: SpecialMissionStatus
  created_at: string
}

export type LeaderboardEntry = {
  user_id: string
  username: string | null
  avatar_url: string | null
  xp: number
  rnk: number
}

type Table<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type Fn<Args, Returns> = {
  Args: Args
  Returns: Returns
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        Pick<ProfileRow, 'id'> & Partial<Omit<ProfileRow, 'id'>>,
        // xp/coins/virtudes/streak são travados por GRANT no banco — só
        // estas colunas aceitam update() direto do client.
        Partial<
          Pick<
            ProfileRow,
            | 'username'
            | 'avatar_url'
            | 'leaderboard_opt_in'
            | 'trello_token'
            | 'trello_member_id'
            | 'ai_api_key'
          >
        >
      >
      boards_config: Table<
        BoardConfigRow,
        Omit<
          BoardConfigRow,
          'id' | 'created_at' | 'xp_multiplier' | 'active' | 'trello_webhook_id'
        > &
          Partial<Pick<BoardConfigRow, 'id' | 'xp_multiplier' | 'active' | 'trello_webhook_id'>>,
        Partial<Omit<BoardConfigRow, 'id' | 'user_id' | 'created_at'>>
      >
      activities: Table<
        ActivityRow,
        Record<string, never>, // insert só via RPC record_activity
        Record<string, never> // auditoria imutável — sem update
      >
      achievements: Table<AchievementRow, AchievementRow, Partial<AchievementRow>>
      user_achievements: Table<
        UserAchievementRow,
        Omit<UserAchievementRow, 'unlocked_at'>,
        Record<string, never> // desbloqueio é permanente — sem update
      >
      missions: Table<
        MissionRow,
        Omit<MissionRow, 'id' | 'created_at' | 'status' | 'completed_at'> &
          Partial<Pick<MissionRow, 'id' | 'status' | 'completed_at'>>,
        Partial<Omit<MissionRow, 'id' | 'user_id' | 'created_at'>>
      >
      rewards: Table<
        RewardRow,
        Omit<RewardRow, 'id' | 'created_at' | 'active'> & Partial<Pick<RewardRow, 'id' | 'active'>>,
        Partial<Omit<RewardRow, 'id' | 'user_id' | 'created_at'>>
      >
      reward_redemptions: Table<
        RewardRedemptionRow,
        Record<string, never>, // insert só via RPC redeem_reward
        Record<string, never> // ledger imutável — sem update
      >
      collection_items: Table<CollectionItemRow, CollectionItemRow, Partial<CollectionItemRow>>
      user_items: Table<
        UserItemRow,
        Record<string, never>, // insert só via RPC sync_special_missions
        Record<string, never>
      >
      special_missions: Table<
        SpecialMissionRow,
        Record<string, never>, // gerida pelo RPC sync_special_missions
        Record<string, never>
      >
    }
    Views: Record<string, never>
    Functions: {
      record_activity: Fn<
        {
          p_source: ActivitySource
          p_trello_action_id: string | null
          p_mission_id: string | null
          p_trello_board_id: string | null
          p_card_id: string
          p_card_name: string
          p_type: string
          p_xp: number
          p_coins: number
          p_virtue_deltas: VirtueMap
        },
        ActivityRow | null
      >
      redeem_reward: Fn<{ p_reward_id: string }, RewardRedemptionRow>
      get_leaderboard: Fn<{ p_limit?: number; p_offset?: number }, LeaderboardEntry[]>
      get_my_rank: Fn<Record<string, never>, number>
      sync_achievements: Fn<Record<string, never>, string[]>
      sync_special_missions: Fn<Record<string, never>, string[]>
    }
    Enums: {
      activity_source: ActivitySource
      mission_status: MissionStatus
      mission_recurrence: MissionRecurrence
      item_rarity: ItemRarity
      special_mission_status: SpecialMissionStatus
    }
    CompositeTypes: Record<string, never>
  }
}
