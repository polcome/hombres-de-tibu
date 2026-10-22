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

  async function upload(memberId: string, name: string, image: Blob) {
    const path = `${memberId}/${name}-${Date.now()}.jpg`
    check(await sb.storage.from('avatars').upload(path, image, { contentType: 'image/jpeg', upsert: true }))
    return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl
  }

  return {
    mode: 'supabase',

    async loadAll() {
      const [members, months, trainings, awards, expedients, comments, ballots, voters, cardPhotos, trainingVotes, achievements, reactions, posts] = await Promise.all([
        sb.from('members').select('id,slug,name,nickname,photo_url,is_admin,active,auth_id').order('name'),
        sb.from('months').select('*').order('id'),
        sb.from('trainings').select('*').order('date'),
        sb.from('awards').select('*'),
        sb.from('expedients').select('*').order('created_at', { ascending: false }),
        sb.from('comments').select('*').order('created_at'),
        sb.from('ballots').select('*'),
        sb.from('voters').select('*'),
        sb.from('card_photos').select('*'),
        sb.from('training_votes').select('*'),
        sb.from('achievements').select('id,member_id,kind,event,date').order('date'),
        sb.from('expedient_reactions').select('*'),
        sb.from('expedient_posts').select('day'), // RLS: només les pròpies
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
        // Si encara no s'ha executat la migració de fotos, no petem
        cardPhotos: cardPhotos.error ? [] : cardPhotos.data,
        trainingVotes: trainingVotes.error ? [] : trainingVotes.data,
        achievements: achievements.error ? [] : achievements.data,
        expedientReactions: reactions.error ? [] : reactions.data,
        myPostDays: posts.error ? [] : (posts.data as { day: string }[]).map((p) => p.day),
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

    async addTraining(t, photo) {
      let photo_url: string | undefined
      if (photo) {
        const path = `${t.member_id}/${t.date}-${Date.now()}.jpg`
        check(await sb.storage.from('proofs').upload(path, photo, { contentType: 'image/jpeg' }))
        photo_url = sb.storage.from('proofs').getPublicUrl(path).data.publicUrl
      }
      check(await sb.from('trainings').insert({ ...t, note: t.note ?? null, ...(photo_url ? { photo_url } : {}) }))
    },
    async voteTraining(trainingId, vote) {
      const me = await this.me()
      if (!me) throw new Error("Has d'iniciar sessió")
      if (vote) check(await sb.from('training_votes').upsert({ training_id: trainingId, member_id: me, vote }))
      else check(await sb.from('training_votes').delete().eq('training_id', trainingId).eq('member_id', me))
    },
    async deleteTraining(id) {
      check(await sb.from('trainings').delete().eq('id', id))
    },
    async addExpedient(e) {
      const r = await sb.rpc('post_expedient', { p_month: e.month_id, p_target: e.target_id, p_kind: e.kind, p_text: e.text, p_author: e.author })
      // Si encara no s'ha executat la migració del límit, es publica com abans
      if (r.error && /could not find the function/i.test(r.error.message)) check(await sb.from('expedients').insert(e))
      else check(r)
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
    async setPhoto(memberId, image) {
      const url = image ? await upload(memberId, 'base', image) : null
      await this.updateMember(memberId, { photo_url: url })
    },
    async setCardPhoto(memberId, cardKey, image) {
      if (!image) {
        check(await sb.from('card_photos').delete().eq('member_id', memberId).eq('card_key', cardKey))
        return
      }
      const url = await upload(memberId, cardKey.replace(/[^a-z0-9-]/gi, '_'), image)
      check(await sb.from('card_photos').upsert({ member_id: memberId, card_key: cardKey, url }))
    },
    async addAchievements(memberIds, a) {
      check(await sb.from('achievements').insert(memberIds.map((member_id) => ({ member_id, ...a }))))
    },
    async deleteAchievement(id) {
      check(await sb.from('achievements').delete().eq('id', id))
    },
    async deleteExpedient(id) {
      check(await sb.from('expedients').delete().eq('id', id))
    },
    async deleteComment(id) {
      check(await sb.from('comments').delete().eq('id', id))
    },
  }
}
