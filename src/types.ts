export type MonthStatus = 'active' | 'voting' | 'closed'
export type AwardType = 'mvp' | 'anti'
export type TrainingKind = 'gym' | 'fora'

export interface Member {
  id: string
  slug: string
  name: string
  nickname: string | null
  photo_url: string | null
  is_admin: boolean
  active: boolean
  auth_id?: string | null
}

export interface Month {
  id: string // 'YYYY-MM'
  status: MonthStatus
  deadline: string | null
  acta: string | null
}

export interface Training {
  id: string
  member_id: string
  date: string // 'YYYY-MM-DD'
  kind: TrainingKind
  count: number
  baseline: boolean
  note: string | null
  photo_url?: string | null
  created_at?: string
}

export interface TrainingVote {
  training_id: string
  member_id: string
  vote: 'ok' | 'fake'
}

export interface Award {
  id: string
  month_id: string
  type: AwardType
  member_id: string
  votes: number | null
}

export interface Expedient {
  id: string
  month_id: string
  target_id: string
  kind: 'merit' | 'falta'
  text: string
  author: string | null
  reactions: Record<string, number>
  created_at: string
}

export interface Comment {
  id: string
  expedient_id: string
  author: string | null
  text: string
  created_at: string
}

export interface Ballot {
  id: string
  month_id: string
  mvp_id: string
  mvp_reason: string
  anti_id: string
  anti_reason: string
  annulled: boolean
}

export interface Voter {
  month_id: string
  member_id: string
}

export interface CardPhoto {
  member_id: string
  card_key: string // `${defId}:${mes o any}`
  url: string
}

export type AchievementKind = 'ascens' | 'mitja' | 'marato' | 'hyrox'

/** Èxit esportiu assignat per l'admin (carta manual) */
export interface Achievement {
  id: string
  member_id: string
  kind: AchievementKind
  event: string // ex: "Mitja Marató de Barcelona"
  date: string // 'YYYY-MM-DD'
}

export interface DB {
  members: Member[]
  months: Month[]
  trainings: Training[]
  awards: Award[]
  expedients: Expedient[]
  comments: Comment[]
  ballots: Ballot[]
  voters: Voter[]
  cardPhotos: CardPhoto[]
  trainingVotes: TrainingVote[]
  achievements: Achievement[]
}

export const EMOJIS = ['😂', '🔥', '💀', '👏', '🤡'] as const
