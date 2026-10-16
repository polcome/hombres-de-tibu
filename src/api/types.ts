import type { AwardType, DB, Expedient, Member, Month, Training } from '../types'

export interface Api {
  mode: 'supabase' | 'demo'
  loadAll(): Promise<DB>
  /** id del membre amb sessió iniciada, o null */
  me(): Promise<string | null>
  login(slug: string, password: string): Promise<void>
  activate(slug: string, code: string, password: string): Promise<void>
  logout(): Promise<void>

  addTraining(t: Omit<Training, 'id' | 'baseline' | 'note'> & { note?: string | null; baseline?: boolean }): Promise<void>
  deleteTraining(id: string): Promise<void>
  addExpedient(e: Pick<Expedient, 'month_id' | 'target_id' | 'kind' | 'text' | 'author'>): Promise<void>
  addComment(c: { expedient_id: string; author: string | null; text: string }): Promise<void>
  react(expedientId: string, emoji: string): Promise<void>
  castVote(monthId: string, mvpId: string, mvpReason: string, antiId: string, antiReason: string): Promise<void>

  // Admin
  upsertMonth(m: Partial<Month> & { id: string }): Promise<void>
  closeMonth(id: string): Promise<void>
  setBallotAnnulled(id: string, annulled: boolean): Promise<void>
  deleteVoter(monthId: string, memberId: string): Promise<void>
  addAward(a: { month_id: string; type: AwardType; member_id: string; votes: number | null }): Promise<void>
  deleteAward(id: string): Promise<void>
  addMember(m: { slug: string; name: string }): Promise<void>
  updateMember(id: string, patch: Partial<Member>): Promise<void>
  inviteCodes(): Promise<Record<string, string>>
  resetMember(id: string): Promise<string>
  uploadPhoto(memberId: string, file: File): Promise<string>
  deleteExpedient(id: string): Promise<void>
  deleteComment(id: string): Promise<void>
}
