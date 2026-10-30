import { useState } from 'react'
import { useStore } from '../store'
import {
  ACHIEVEMENT_FOR_BONUS,
  CARD_DEFS,
  cardKey,
  displayName,
  photoFor,
  rating,
  unlockedCards,
  TIERS,
  type Rating,
  type Tier,
} from '../logic/stats'
import type { AchievementKind, Member } from '../types'

const TIER_ICON: Record<Tier, string> = { bronze: '🥉', silver: '🥈', silvershiny: '✨🥈', gold: '🥇', goldshiny: '✨🥇' }

// Carta "misteriosa" per ensenyar el disseny de les que ningú té
const MYSTERY: Member = { id: 'mystery', slug: 'mystery', name: '???', nickname: null, photo_url: null, is_admin: false, active: true }
const MYSTERY_RATING: Rating = { overall: 0, ent: 0, fora: 0, mvp: 0, com: 0, con: 0, tier: 'bronze' }
import { FifaCard } from '../components/FifaCard'
import { CardZoom, unlockProps } from '../components/CardZoom'
import { Section } from '../components/ui'

export default function Cards() {
  const { db } = useStore()
  const [tab, setTab] = useState<'squad' | 'collection' | 'how'>('squad')
  const unlocks = unlockedCards(db)
  const squad = db.members
    .filter((m) => m.active)
    .map((m) => ({ m, r: rating(db, m.id) }))
    .sort((a, b) => b.r.overall - a.r.overall)

  return (
    <div className="stack">
      <div className="tabs">
        <button className={tab === 'squad' ? 'on' : ''} onClick={() => setTab('squad')}>
          Carta base
        </button>
        <button className={tab === 'collection' ? 'on' : ''} onClick={() => setTab('collection')}>
          Col·lecció ({new Set(unlocks.map((u) => u.def.id)).size}/{CARD_DEFS.length})
        </button>
        <button className={tab === 'how' ? 'on' : ''} onClick={() => setTab('how')}>
          Com funciona
        </button>
      </div>

      {tab === 'squad' && (
        <div className="stack">
          <p className="muted small center">La carta base de cadascú amb els valors d'avui. Toca-la per veure-la en gran.</p>
          <div className="cards-row mini">
            {squad.map(({ m, r }) => {
              const card = { member: m, rating: r, variant: r.tier, photo: photoFor(db, m) }
              return (
                <CardZoom key={m.id} card={card}>
                  <FifaCard {...card} size="xs" />
                </CardZoom>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'collection' && (
        <div className="stack">
          <p className="muted small center">Toca una carta per veure-la en gran.</p>
          {[
            { title: '⚙️ Automàtiques', sub: "Es desbloquegen soles quan es compleix el repte.", defs: CARD_DEFS.filter((d) => d.auto && !d.level) },
            { title: '🏅 Èxits esportius', sub: "Manuals: l'admin les dona a qui ho aconsegueix. Sumen entrenos fora virtuals a FOR durant l'any de l'èxit.", defs: CARD_DEFS.filter((d) => !d.auto) },
          ].map((group) => (
            <div key={group.title} className="stack">
              <div className="group-head">
                <h2>{group.title}</h2>
                <p className="muted small">{group.sub}</p>
              </div>
              {group.defs.map((def) => {
                const tiers = CARD_DEFS.filter((d) => d.id === def.id || (def.family && d.family === def.family && d.level))
                return (
                  <Section
                    key={def.id}
                    title={
                      <>
                        {def.emoji} {def.name} <span className={`rarity rarity-${def.rarity}`}>{def.rarity}</span>
                      </>
                    }
                  >
                    <p className="muted small">
                      {def.how} {def.boost !== 0 && <b>({def.boost > 0 ? '+' : ''}{def.boost} a la mitjana)</b>}
                      {!def.auto && <b> (+{ACHIEVEMENT_FOR_BONUS[def.id.replace('exit-', '') as AchievementKind]} entrenos fora per a FOR)</b>}
                    </p>
                    {tiers.length > 1 && (
                      <div className="level-rules small">
                        {tiers
                          .filter((t) => t.level)
                          .map((t) => (
                            <div key={t.id} className={`level-rule level-${t.level}`}>
                              <b>{t.level === 'plus' ? '★ PLUS' : '🔥 ULTRA'}</b> {t.how}
                              {t.boost !== 0 && ` (${t.boost > 0 ? '+' : ''}${t.boost})`}
                            </div>
                          ))}
                      </div>
                    )}
                    <div className="cards-row mini">
                      {tiers.flatMap((t) => {
                        const got = unlocks.filter((u) => u.def.id === t.id)
                        if (got.length === 0)
                          return [
                            <div key={t.id} className="locked-preview">
                              <FifaCard
                                member={MYSTERY}
                                rating={MYSTERY_RATING}
                                variant={t.variant}
                                level={t.level}
                                title={t.name}
                                emoji={t.emoji}
                                size="xs"
                                photo={null}
                              />
                              <span className="locked-badge">🔒 {t.level ? t.level.toUpperCase() : "Ningú l'ha aconseguit"}</span>
                            </div>,
                          ]
                        return got.map((u) => (
                          <CardZoom key={cardKey(u) + u.memberId} card={unlockProps(db, u)} def={t} photoKey={cardKey(u)}>
                            <FifaCard {...unlockProps(db, u)} size="xs" />
                          </CardZoom>
                        ))
                      })}
                    </div>
                  </Section>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {tab === 'how' && (
        <div className="stack how-page">
          <Section title="📅 Tot és per any natural">
            <p>
              Totes les estadístiques es calculen <b>de l'1 de gener al 31 de desembre</b>. El dia 1 de gener tothom torna a començar de zero: entrenos, MVPs,
              antis, constància i èxits. Les cartes especials que ja tens es queden a l'àlbum per sempre.
            </p>
            <p className="muted small">Cada estadística va de 20 a 99 i s'arrodoneix a l'enter.</p>
          </Section>

          <Section title="💪 ENT · Entrenos al gym (35%)">
            <pre className="formula">ENT = 40 + entrenos de gym de l'any ÷ 4</pre>
            <ul className="how">
              <li>
                Es va <b>omplint durant tot l'any</b>, com una barra de progrés: cada entreno de gym suma +0,25. Un mes fort (24 entrenos) suma uns +6.
              </li>
              <li>
                El 99 arriba amb <b>236 entrenos de gym</b> a l'any (uns 20 al mes de gener a desembre). Per tenir-la alta cal ser constant, no fer un mes bèstia.
              </li>
              <li>Inclou el recompte inicial i tot el que s'apunta a l'app. L'1 de gener torna a 40.</li>
            </ul>
          </Section>

          <Section title="🏃 FOR · Entrenos fora del gym (10%)">
            <pre className="formula">FOR = 35 + (entrenos fora de l'any + entrenos d'èxits) ÷ 3</pre>
            <ul className="how">
              <li>També s'omple durant l'any: el 99 arriba amb 192 entrenos fora.</li>
              <li>
                Cada èxit esportiu de l'any compta com a entrenos fora <b>virtuals</b> (només per al càlcul, al recompte d'entrenos no hi surten): Ascens +
                {ACHIEVEMENT_FOR_BONUS.ascens}, Mitja +{ACHIEVEMENT_FOR_BONUS.mitja}, Hyrox +{ACHIEVEMENT_FOR_BONUS.hyrox}, Marató +{ACHIEVEMENT_FOR_BONUS.marato}.
                Se sumen entre ells.
              </li>
              <li>Exemple: 100 entrenos fora + una marató = 125 per al càlcul → FOR = 35 + 125 ÷ 3 = 77.</li>
            </ul>
          </Section>

          <Section title="🏆 MVP · Palmarès de l'any (20%)">
            <pre className="formula">MVP = 63 + 9 × MVPs de l'any</pre>
            <table className="table small center-cells">
              <tbody>
                <tr>
                  <th>MVPs</th>
                  <td>0</td>
                  <td>1</td>
                  <td>2</td>
                  <td>3</td>
                  <td>4+</td>
                </tr>
                <tr>
                  <th>MVP</th>
                  <td>63</td>
                  <td>72</td>
                  <td>81</td>
                  <td>90</td>
                  <td>99</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="😇 COM · Comportament (20%)">
            <pre className="formula">COM = 88 − 13 × antis de l'any</pre>
            <table className="table small center-cells">
              <tbody>
                <tr>
                  <th>Antis</th>
                  <td>0</td>
                  <td>1</td>
                  <td>2</td>
                  <td>3</td>
                  <td>4</td>
                  <td>5+</td>
                </tr>
                <tr>
                  <th>COM</th>
                  <td>88</td>
                  <td>75</td>
                  <td>62</td>
                  <td>49</td>
                  <td>36</td>
                  <td>20</td>
                </tr>
              </tbody>
            </table>
            <p className="muted small">Sense cap anti el màxim és 88: ningú és perfecte.</p>
          </Section>

          <Section title="📈 CON · Constància (15%)">
            <pre className="formula">CON = 40 + 59 × (½ · bones ÷ totals + ½ · bones ÷ 52)</pre>
            <ul className="how">
              <li>
                <b>Setmana bona:</b> de dilluns a diumenge amb <b>3 entrenos al gym o més</b> (els de fora no compten).
              </li>
              <li>
                <b>Setmanes totals:</b> les setmanes senceres de l'any (des que es fa servir l'app). La setmana en curs no compta fins que acaba.
              </li>
              <li>
                <b>Meitat percentatge, meitat acumulat:</b> la primera part premia no fallar setmanes; la segona creix igual amb cada setmana bona i arriba al
                màxim amb 52. Així un 2/2 val menys que un 15/15, i un 53/53 arriba a 99.
              </li>
              <li>Sense cap setmana sencera encara: 70.</li>
            </ul>
            <table className="table small center-cells">
              <tbody>
                <tr>
                  <th>Bones/totals</th>
                  <td>2/2</td>
                  <td>15/15</td>
                  <td>26/26</td>
                  <td>26/52</td>
                  <td>40/52</td>
                  <td>52/52</td>
                </tr>
                <tr>
                  <th>CON</th>
                  <td>71</td>
                  <td>78</td>
                  <td>84</td>
                  <td>70</td>
                  <td>85</td>
                  <td>99</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="⭐ Mitjana total">
            <pre className="formula">MITJANA = 0,35·ENT + 0,15·CON + 0,20·MVP + 0,20·COM + 0,10·FOR</pre>
            <p className="muted small">El gym (ENT + CON) pesa el 50%.</p>
            <ul className="how">
              {[...TIERS].reverse().map(([t, min], i, arr) => (
                <li key={t}>
                  {TIER_ICON[t]} {TIERS.find(([x]) => x === t)![2]}:{' '}
                  {i === 0 ? `menys de ${arr[1][1]}` : i === arr.length - 1 ? `${min} o més` : `de ${min} a ${arr[i + 1][1] - 1}`}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="🃏 Cartes especials">
            <pre className="formula">Carta especial = valors a final del mes de la carta + bonus de la carta</pre>
            <ul className="how">
              <li>
                El bonus depèn de la carta (TOTM +3, Icona +6, Pilota d'Or +12, Anti-MVP −3…) i és el que puja (o baixa) la mitjana d'aquella carta.
                Sempre entre 1 i 99.
              </li>
              <li>
                El bonus es reparteix entre les stats: el <b>60%</b> va a la stat relacionada amb la carta (o <b>30% + 30%</b> si en té dues) i un{' '}
                <b>10%</b> a cada una de les altres, ajustat perquè la mitjana pugi just el bonus. Exemple: la TOTM puja sobretot MVP; GymRat, ENT; IronMan, ENT i
                CON.
              </li>
              <li>La carta base no canvia mai: sempre reflecteix la realitat.</li>
              <li>
                Excepció: els <b>èxits esportius</b> tenen la seva carta amb bonus (Ascens i Mitja +3, Hyrox +4, Marató +6) i, a més, sumen entrenos fora virtuals
                que sí que pugen FOR a la carta base.
              </li>
              <li>Les cartes anuals i les d'abans que hi hagi dades a l'app fan servir la valoració d'avui.</li>
            </ul>
          </Section>

          <p className="muted small center">Líder actual: {squad[0] ? `${displayName(squad[0].m)} (${squad[0].r.overall})` : '-'}</p>
        </div>
      )}
    </div>
  )
}
