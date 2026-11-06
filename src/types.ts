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
  /** Superadmin (el Come). No surt enlloc de la UI, només obre el registre d'activitat */
  is_owner?: boolean
}

/** Una línia del registre d'activitat (només la veu el superadmin) */
export interface AuditEntry {
  id: number
  at: string
  actor_id: string | null
  anonymous: boolean
  tbl: string
  op: 'INSERT' | 'UPDATE' | 'DELETE'
  row_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
}

export interface Month {
  id: string // 'YYYY-MM'
  status: MonthStatus
  deadline: string | null
  acta: string | null
  /** Estil que ha fet servir la IA per a l'acta (per no repetir-lo) */
  acta_style?: string | null
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
  /** Té foto adjunta (es baixa a part, amb `expedientPhoto`) */
  has_photo?: boolean
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

/** Una reacció per usuari i expedient */
export interface ExpedientReaction {
  expedient_id: string
  member_id: string
  emoji: string
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
  expedientReactions: ExpedientReaction[]
  /** Dies (YYYY-MM-DD) en què l'usuari amb sessió ha publicat expedients (un per publicació) */
  myPostDays: string[]
  /** Fotos de prova que l'usuari ja ha obert (ids d'entreno) */
  myTrainingViews: string[]
}

export const EMOJIS = ['😂', '🔥', '💀', '👏', '🤡'] as const
