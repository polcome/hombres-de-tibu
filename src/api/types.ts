import type { AchievementKind, AwardType, DB, Expedient, Member, Month, Training } from '../types'

export interface Api {
  mode: 'supabase' | 'demo'
  loadAll(): Promise<DB>
  /** id del membre amb sessió iniciada, o null */
  me(): Promise<string | null>
  login(slug: string, password: string): Promise<void>
  activate(slug: string, code: string, password: string): Promise<void>
  logout(): Promise<void>

  addTraining(
    t: Omit<Training, 'id' | 'baseline' | 'note' | 'photo_url' | 'created_at'> & { note?: string | null; baseline?: boolean },
    photo?: Blob | null,
  ): Promise<void>
  /** Validar (ok) o marcar com a dubtós (fake) l'entreno d'un altre; null treu el vot */
  voteTraining(trainingId: string, vote: 'ok' | 'fake' | null): Promise<void>
  deleteTraining(id: string): Promise<void>
  addExpedient(e: Pick<Expedient, 'month_id' | 'target_id' | 'kind' | 'text' | 'author'>): Promise<void>
  addComment(c: { expedient_id: string; author: string | null; text: string }): Promise<void>
  react(expedientId: string, emoji: string): Promise<void>
  castVote(monthId: string, mvpId: string, mvpReason: string, antiId: string, antiReason: string): Promise<void>

  // Admin
  upsertMonth(m: Partial<Month> & { id: string }): Promise<void>
  closeMonth(id: string): Promise<void>
  /** Esborra el vot d'algú (votant i papereta) perquè torni a votar */
  removeVote(monthId: string, memberId: string): Promise<void>
  /** Per a cada votant del mes: té la papereta guardada? (sense dir quina) */
  voteCheck(monthId: string): Promise<Record<string, boolean>>
  addAward(a: { month_id: string; type: AwardType; member_id: string; votes: number | null }): Promise<void>
  deleteAward(id: string): Promise<void>
  addMember(m: { slug: string; name: string }): Promise<void>
  updateMember(id: string, patch: Partial<Member>): Promise<void>
  inviteCodes(): Promise<Record<string, string>>
  resetMember(id: string): Promise<string>
  /** Puja la foto base (blob) o la treu (null) */
  setPhoto(memberId: string, image: Blob | null): Promise<void>
  /** Foto d'una carta especial concreta; null la treu */
  setCardPhoto(memberId: string, cardKey: string, image: Blob | null): Promise<void>
  /** Assigna el mateix èxit esportiu a diversos membres */
  addAchievements(memberIds: string[], a: { kind: AchievementKind; event: string; date: string }): Promise<void>
  deleteAchievement(id: string): Promise<void>
  deleteExpedient(id: string): Promise<void>
  deleteComment(id: string): Promise<void>
}
