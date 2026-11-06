import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Api } from './types'
import { forgetOwn, newOwn, ownToken } from '../logic/own'
import { blobToDataUrl } from '../logic/image'
import type { AuditEntry, DB } from '../types'

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
    check(await sb.storage.from('avatars').upload(path, image, { contentType: 'image/jpeg' }))
    return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl
  }

  return {
    mode: 'supabase',

    async loadAll() {
      const [members, months, trainings, awards, expedients, comments, ballots, voters, cardPhotos, trainingVotes, achievements, reactions, posts, views] = await Promise.all([
        sb.from('members').select('*').order('name'),
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
        sb.from('training_views').select('training_id'), // RLS: només les pròpies
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
        myTrainingViews: views.error ? [] : (views.data as { training_id: string }[]).map((v) => v.training_id),
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
      const rows = check(await sb.from('trainings').delete().eq('id', id).select('id'))
      if (!rows?.length) throw new Error("No s'ha pogut treure l'entreno (només pots treure els teus)")
    },
    async addExpedient(e, photo) {
      const { id, hash } = await newOwn()
      const args = { p_month: e.month_id, p_target: e.target_id, p_kind: e.kind, p_text: e.text, p_author: e.author }
      const p_photo = photo ? await blobToDataUrl(photo) : null
      let r = await sb.rpc('post_expedient', { ...args, p_id: id, p_token_hash: hash, ...(p_photo ? { p_photo } : {}) })
      if (r.error?.code === 'PGRST202') {
        // Sense la migració de les fotos del dossier no es pot adjuntar foto
        if (p_photo) {
          forgetOwn(id)
          throw new Error('Encara no es poden adjuntar fotos (falta executar la migració migracio-fotos-dossier.sql)')
        }
        // Sense la migració d'esborrar el propi, es publica com abans (i no es podrà esborrar)
        forgetOwn(id)
        r = await sb.rpc('post_expedient', args)
      }
      check(r)
    },
    async expedientPhoto(id) {
      const { data } = await sb.from('expedient_photos').select('data').eq('expedient_id', id).maybeSingle()
      return (data as { data: string } | null)?.data ?? null
    },
    async addComment(c) {
      const { id, hash } = await newOwn()
      const r = await sb.from('comments').insert({ ...c, id, delete_token: hash })
      if (r.error && /delete_token/.test(r.error.message)) {
        forgetOwn(id)
        check(await sb.from('comments').insert(c))
      } else check(r)
    },
    async react(expedientId, emoji) {
      check(await sb.rpc('react', { p_expedient: expedientId, p_emoji: emoji }))
    },
    async auditLog(limit = 300) {
      const { data, error } = await sb.from('audit_log').select('*').order('at', { ascending: false }).limit(limit)
      if (error) throw new Error(error.code === '42P01' ? "Falta executar la migració del registre (migracio-registre.sql)" : error.message)
      return data as AuditEntry[]
    },
    async markTrainingSeen(id) {
      const me = await this.me()
      if (!me) return
      // Si la migració encara no s'ha executat, no peta: queda només al mòbil
      await sb.from('training_views').upsert({ training_id: id, member_id: me }, { onConflict: 'training_id,member_id', ignoreDuplicates: true })
    },
    async seenCards() {
      const me = await this.me()
      if (!me) return null
      // Si la migració encara no s'ha executat, no hi ha sobres (no peta res)
      const { data, error } = await sb.from('seen_cards').select('card_key').eq('member_id', me)
      return error ? null : (data as { card_key: string }[]).map((r) => r.card_key)
    },
    async markCardsSeen(keys) {
      const me = await this.me()
      if (!me || !keys.length) return
      await sb.from('seen_cards').upsert(
        keys.map((card_key) => ({ member_id: me, card_key })),
        { onConflict: 'member_id,card_key', ignoreDuplicates: true },
      )
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
      const r = await sb.from('months').upsert(m)
      // Si la migració de l'estil de l'acta encara no s'ha executat, es desa sense
      if (r.error && 'acta_style' in m && /acta_style/.test(r.error.message)) {
        const { acta_style: _, ...rest } = m
        check(await sb.from('months').upsert(rest))
      } else check(r)
    },
    async closeMonth(id) {
      check(await sb.rpc('close_month', { p_month: id }))
    },
    async aiActa(prompt) {
      const { data, error } = await sb.functions.invoke('acta-ia', { body: { prompt } })
      if (error) {
        // L'error de la funció (o de Supabase) ve dins la resposta: el mostrem tal qual per poder-lo diagnosticar
        const res = (error as { context?: unknown }).context
        if (!(res instanceof Response)) throw new Error(`No s'ha pogut contactar amb la funció acta-ia: ${error.message}`)
        const raw = await res.text().catch(() => '')
        let msg = raw
        try {
          const body = JSON.parse(raw)
          msg = body.error ?? body.message ?? body.msg ?? raw
        } catch {
          // no és JSON
        }
        throw new Error(`Error ${res.status} de la funció acta-ia: ${msg || error.message}`)
      }
      return (data as { text: string }).text
    },
    async removeVote(monthId, memberId) {
      const { error } = await sb.rpc('admin_remove_vote', { p_month: monthId, p_member: memberId })
      // Sense la migració del vot secret només es pot esborrar el votant (la papereta es queda)
      if (error?.code === 'PGRST202') check(await sb.from('voters').delete().eq('month_id', monthId).eq('member_id', memberId))
      else if (error) throw new Error(error.message)
    },
    async voteCheck(monthId) {
      const { data, error } = await sb.rpc('vote_check', { p_month: monthId })
      if (error) return {}
      return Object.fromEntries((data as { member_id: string; ok: boolean }[]).map((r) => [r.member_id, r.ok]))
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
      const { error } = await sb.rpc('set_member_photo', { p_member: memberId, p_url: url })
      // Si la migració de la foto pròpia encara no s'ha executat, els admins ho poden fer com abans
      if (error?.code === 'PGRST202') await this.updateMember(memberId, { photo_url: url })
      else if (error) throw new Error(error.message)
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
      const token = ownToken(id)
      if (token) check(await sb.rpc('delete_own_expedient', { p_id: id, p_token: token }))
      else if (!check(await sb.from('expedients').delete().eq('id', id).select('id'))?.length) throw new Error('Només el pots esborrar si és teu')
      forgetOwn(id)
    },
    async deleteComment(id) {
      const token = ownToken(id)
      if (token) check(await sb.rpc('delete_own_comment', { p_id: id, p_token: token }))
      else if (!check(await sb.from('comments').delete().eq('id', id).select('id'))?.length) throw new Error('Només el pots esborrar si és teu')
      forgetOwn(id)
    },
  }
}
