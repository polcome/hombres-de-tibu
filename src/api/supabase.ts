import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Api } from './types'
import type { DB } from '../types'

const EMAIL_DOMAIN = 'hombresdetibu.app'
const email = (slug: string) => `${slug.trim().toLowerCase()}@${EMAIL_DOMAIN}`

function check<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data
}

export function createSupabaseApi(url: string, key: string): Api {
  const sb: SupabaseClient = createClient(url, key)

  return {
    mode: 'supabase',

    async loadAll() {
      const [members, months, trainings, awards, expedients, comments, ballots, voters] = await Promise.all([
        sb.from('members').select('id,slug,name,nickname,photo_url,is_admin,active,auth_id').order('name'),
        sb.from('months').select('*').order('id'),
        sb.from('trainings').select('id,member_id,date,kind,count,baseline,note').order('date'),
        sb.from('awards').select('*'),
        sb.from('expedients').select('*').order('created_at', { ascending: false }),
        sb.from('comments').select('*').order('created_at'),
        sb.from('ballots').select('*'),
        sb.from('voters').select('*'),
      ])
      return {
        members: check(members),
        months: check(months),
        trainings: check(trainings),
        awards: check(awards),
        expedients: check(expedients),
        comments: check(comments),
        ballots: check(ballots),
        voters: check(voters),
      } as DB
    },

    async me() {
      const { data } = await sb.auth.getSession()
      const uid = data.session?.user.id
      if (!uid) return null
      const r = await sb.from('members').select('id').eq('auth_id', uid).maybeSingle()
      return r.data?.id ?? null
    },

    async login(slug, password) {
      const { error } = await sb.auth.signInWithPassword({ email: email(slug), password })
      if (error) throw new Error('Usuari o contrasenya incorrectes')
    },

    async activate(slug, code, password) {
      const { error } = await sb.auth.signUp({
        email: email(slug),
        password,
        options: { data: { slug: slug.trim().toLowerCase(), code: code.trim().toUpperCase() } },
      })
      if (error) {
        if (/database error/i.test(error.message)) throw new Error('Codi d\'activació incorrecte o compte ja activat')
        if (/signups? .*disabled/i.test(error.message))
          throw new Error('Els registres estan desactivats a Supabase (Authentication → Sign In / Providers → Email). Avisa l\'admin.')
        if (/already registered/i.test(error.message)) throw new Error('Aquest compte ja està activat: ves a "Entrar"')
        throw new Error(error.message)
      }
      // Si la confirmació d'email està desactivada, ja tenim sessió
      const { data } = await sb.auth.getSession()
      if (!data.session) await this.login(slug, password)
    },

    async logout() {
      await sb.auth.signOut()
    },

    async addTraining(t) {
      check(await sb.from('trainings').insert({ ...t, note: t.note ?? null }))
    },
    async deleteTraining(id) {
      check(await sb.from('trainings').delete().eq('id', id))
    },
    async addExpedient(e) {
      check(await sb.from('expedients').insert(e))
    },
    async addComment(c) {
      check(await sb.from('comments').insert(c))
    },
    async react(expedientId, emoji) {
      check(await sb.rpc('react', { p_expedient: expedientId, p_emoji: emoji }))
    },
    async castVote(monthId, mvpId, mvpReason, antiId, antiReason) {
      check(
        await sb.rpc('cast_vote', {
          p_month: monthId,
          p_mvp: mvpId,
          p_mvp_reason: mvpReason,
          p_anti: antiId,
          p_anti_reason: antiReason,
        }),
      )
    },

    async upsertMonth(m) {
      check(await sb.from('months').upsert(m))
    },
    async closeMonth(id) {
      check(await sb.rpc('close_month', { p_month: id }))
    },
    async setBallotAnnulled(id, annulled) {
      check(await sb.from('ballots').update({ annulled }).eq('id', id))
    },
    async deleteVoter(monthId, memberId) {
      check(await sb.from('voters').delete().eq('month_id', monthId).eq('member_id', memberId))
    },
    async addAward(a) {
      check(await sb.from('awards').insert(a))
    },
    async deleteAward(id) {
      check(await sb.from('awards').delete().eq('id', id))
    },
    async addMember(m) {
      check(await sb.from('members').insert(m))
    },
    async updateMember(id, patch) {
      check(await sb.from('members').update(patch).eq('id', id))
    },
    async inviteCodes() {
      const rows = check(await sb.from('member_secrets').select('*')) as { member_id: string; invite_code: string }[]
      return Object.fromEntries(rows.map((r) => [r.member_id, r.invite_code]))
    },
    async resetMember(id) {
      return check(await sb.rpc('admin_reset_member', { p_member: id })) as string
    },
    async uploadPhoto(memberId, file) {
      const path = `${memberId}-${Date.now()}.${file.name.split('.').pop() || 'jpg'}`
      check(await sb.storage.from('avatars').upload(path, file, { upsert: true }))
      const url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl
      await this.updateMember(memberId, { photo_url: url })
      return url
    },
    async deleteExpedient(id) {
      check(await sb.from('expedients').delete().eq('id', id))
    },
    async deleteComment(id) {
      check(await sb.from('comments').delete().eq('id', id))
    },
  }
}
