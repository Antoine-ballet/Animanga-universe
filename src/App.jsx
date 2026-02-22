import { useState, useEffect, useRef } from "react"
import { db } from "./firebase.js"
import {
  ref, push, onValue, off, serverTimestamp, query, limitToLast
} from "firebase/database"

// ─── DONNÉES ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "news",    icon: "⚡", label: "Actus"      },
  { id: "explore", icon: "🔍", label: "Explorer"   },
  { id: "discuss", icon: "👥", label: "Communauté" },
  { id: "shop",    icon: "🛒", label: "Shop"       },
]

const ROOMS = [
  { id: "general",         label: "💬 Général",   desc: "Parle de tout !" },
  { id: "anime",           label: "🎬 Anime",      desc: "Actus & discussions anime" },
  { id: "manga",           label: "📚 Manga",      desc: "Chapitres, sorties, théories" },
  { id: "spoilers",        label: "⚠️ Spoilers",   desc: "Zone libre — attention !" },
  { id: "recommandations", label: "⭐ Reco",        desc: "Conseils & découvertes" },
]

const AVATARS = ["🐉","⚔️","🌸","👁️","🔥","☠️","🌙","⚡","🌊","🗡️","🎭","🦊"]

const NEWS = [
  { id:1, category:"ANIME",  tag:"DISPO",   title:"Baki-Dou : Le Samouraï Invincible disponible sur Netflix",           desc:"La suite tant attendue de la saga Baki arrive le 26 février 2026 en exclusivité Netflix. 13 épisodes où Miyamoto Musashi est ressuscité pour affronter Baki Hanma dans une arène à 364m sous Tokyo.", img:"⚔️", color:"#ff4757", time:"Aujourd'hui", hot:true,  source:"Manga-News",         url:"https://www.manga-news.com/index.php/actus/2026/01/30/BAKI-DOU-:-Le-samourai-invincible-arrive-sur-Netflix-le-mois-prochain" },
  { id:2, category:"ANIME",  tag:"VF",      title:"One Punch Man S3 — 12 épisodes doublés VF sur Crunchyroll",           desc:"Crunchyroll a mis en ligne l'intégralité de la saison 3 doublée en français. La partie 2 est confirmée pour 2027.",                                                                               img:"👊", color:"#ffa502", time:"Il y a 4j",    hot:true,  source:"AnimOtaku",           url:"https://animotaku.fr/actualite/anime-one-punch-man-saison-3-vf-crunchyroll/" },
  { id:3, category:"ANIME",  tag:"TRAILER", title:"Sound! Euphonium — The Final Movie Part 1 : trailer principal",        desc:"Kyoto Animation dévoile le trailer du film final. Sortie le 24 avril 2026 dans 200 salles au Japon, avec le thème ToCoda par TRUE.",                                                          img:"🎺", color:"#5352ed", time:"Il y a 1j",    hot:false, source:"Anime News Network", url:"https://www.animenewsnetwork.com/news/2026-02-21/sound-euphonium-the-final-movie-part-1-anime-film-main-trailer-highlights-new-scenes/.234404" },
  { id:4, category:"ANIME",  tag:"ANNONCE", title:"ufotable annonce le film Mahōtsukai no Yoru (Witch on the Holy Night)", desc:"ufotable confirme l'adaptation du visual novel de Type-Moon. Des projets Demon Slayer et Tales of sont aussi mis en avant.",                                                                   img:"🔮", color:"#2ed573", time:"Il y a 1j",    hot:true,  source:"Anime News Network", url:"https://www.animenewsnetwork.com/" },
  { id:5, category:"MANGA",  tag:"RECORD",  title:"Ichi the Witch (Ki-oon) : lancement record, anime annoncé",            desc:"Sorti en France en 2025, Ichi the Witch dépasse toutes les attentes. Une adaptation anime par Cygames Pictures est en production.",                                                         img:"🧙", color:"#00d2d3", time:"Il y a 2j",    hot:false, source:"Manga-News",         url:"https://www.manga-news.com/" },
  { id:6, category:"ANIME",  tag:"DATE",    title:"The Villager of Level 999 : sortie Juillet 2026 sur Crunchyroll",      desc:"L'anime de LV999 no Murabito est prévu pour juillet 2026. Studio Brains Base. En France, le manga est chez Mana Books.",                                                                   img:"🏰", color:"#ff6b81", time:"Il y a 2j",    hot:false, source:"Adala-News",         url:"https://adala-news.fr/2026/02/lanime-the-villager-of-level-999-en-trailer/" },
  { id:7, category:"ANIME",  tag:"STAFF",   title:"Toaru Anbu no Item : staff révélé, anime 2026 chez J.C. Staff",        desc:"Le spinoff A Certain Magical Index dévoile son staff avec Tatsuyuki Nagai à la réalisation. Événement à AnimeJapan le 28 mars.",                                                        img:"⚡", color:"#eccc68", time:"Aujourd'hui",  hot:false, source:"Anime News Network", url:"https://www.animenewsnetwork.com/news/2026-02-22/toaru-anbu-no-item-tv-anime-unveils-main-staff-2026-debut/.234442" },
]

const EXPLORE_ITEMS = [
  { id:1, title:"Frieren",         type:"Manga/Anime",  score:9.4, genre:"Fantasy",    img:"🧝", trending:true  },
  { id:2, title:"Vinland Saga S3", type:"Anime",        score:9.1, genre:"Historique", img:"⚔️", trending:true  },
  { id:3, title:"Dungeon Meshi",   type:"Anime",        score:8.9, genre:"Aventure",   img:"🍖", trending:false },
  { id:4, title:"Solo Leveling",   type:"Manhwa/Anime", score:8.7, genre:"Action",     img:"💎", trending:true  },
  { id:5, title:"Chainsaw Man",    type:"Manga",        score:9.0, genre:"Dark",       img:"⛓️", trending:false },
  { id:6, title:"Oshi no Ko S2",   type:"Anime",        score:8.8, genre:"Drama",      img:"⭐", trending:true  },
]

const SHOP_ITEMS = [
  { id:1, name:"Figurine Gojo Satoru Premium — JJK",  price:"89,99€", store:"AmiAmi",          url:"https://www.amiami.com",                                                                        img:"👁️", badge:"EXCLU",  sponsored:false },
  { id:2, name:"Coffret Blu-ray Demon Slayer S1+S2",   price:"129€",   store:"Amazon FR",        url:"https://www.amazon.fr/s?k=demon+slayer+blu-ray",                                                img:"🗡️", badge:"PROMO",  sponsored:true  },
  { id:3, name:"Manga One Piece Tome 109",              price:"7,20€",  store:"Fnac",             url:"https://www.fnac.com/SearchResult/ResultList.aspx?Search=one+piece+manga",                       img:"📚", badge:"NEUF",   sponsored:false },
  { id:4, name:"T-Shirt Naruto Akatsuki",               price:"34,99€", store:"Crunchyroll Shop", url:"https://store.crunchyroll.com",                                                                 img:"🎽", badge:"LIMITÉ", sponsored:false },
  { id:5, name:"Pop! Vinyl Luffy Gear 5",               price:"18,99€", store:"Micromania",       url:"https://www.micromania.fr/recherche?q=luffy",                                                   img:"🌀", badge:"HOT",    sponsored:true  },
  { id:6, name:"Artbook Demon Slayer Officiel",          price:"42€",    store:"Amazon FR",        url:"https://www.amazon.fr/s?k=demon+slayer+artbook",                                                img:"🎨", badge:"RARE",   sponsored:false },
]

const ADS = [
  { id:"a1", label:"Crunchyroll Premium",  sub:"1 mois offert · Anime illimité en HD",      cta:"Essayer gratis",    color:"#f47521", bg:"rgba(244,117,33,.08)", url:"https://www.crunchyroll.com/premium",                                                                icon:"🎬" },
  { id:"a2", label:"Amazon Prime Vidéo",   sub:"Vinland Saga, Tokyo Ghoul, Conan…",         cta:"Voir le catalogue", color:"#ff9900", bg:"rgba(255,153,0,.08)",  url:"https://www.amazon.fr/gp/video/storefront/?contentType=tv&contentId=anime",                      icon:"📺" },
  { id:"a3", label:"AmiAmi — Figurines",   sub:"Livraison France · Code ANIMANGA10 = -10%", cta:"Voir les offres",   color:"#00a8ff", bg:"rgba(0,168,255,.08)",  url:"https://www.amiami.com",                                                                           icon:"🏪" },
  { id:"a4", label:"Manga-News Premium",   sub:"Articles en avant-première + sans pub",     cta:"S'abonner",         color:"#2ed573", bg:"rgba(46,213,115,.08)", url:"https://www.manga-news.com",                                                                       icon:"📰" },
]

// ─── UTILS ───────────────────────────────────────────────────────────────────

const fmt = (ts) => {
  if (!ts) return ""
  const d = Date.now() - ts
  if (d < 60000)    return "À l'instant"
  if (d < 3600000)  return `Il y a ${Math.floor(d/60000)}min`
  if (d < 86400000) return `Il y a ${Math.floor(d/3600000)}h`
  return `Il y a ${Math.floor(d/86400000)}j`
}

const uid = () => Math.random().toString(36).slice(2,10)

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────

export default function App() {
  const [activeTab,     setActiveTab]     = useState("news")
  const [selectedNews,  setSelectedNews]  = useState(null)
  const [exploreFilter, setExploreFilter] = useState("all")

  // Communauté
  const [currentRoom,  setCurrentRoom]  = useState("general")
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput,    setChatInput]    = useState("")
  const [sending,      setSending]      = useState(false)
  const [username,     setUsername]     = useState("")
  const [avatar,       setAvatar]       = useState(AVATARS[0])
  const [setupDone,    setSetupDone]    = useState(false)
  const [setupName,    setSetupName]    = useState("")
  const [setupAvatar,  setSetupAvatar]  = useState(AVATARS[0])
  const [myId]                          = useState(() => {
    const saved = localStorage.getItem("animanga_uid")
    if (saved) return saved
    const id = uid()
    localStorage.setItem("animanga_uid", id)
    return id
  })

  const messagesEndRef = useRef(null)
  const listenerRef    = useRef(null)

  // Charger profil depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem("animanga_profile")
    if (saved) {
      const p = JSON.parse(saved)
      setUsername(p.name)
      setAvatar(p.avatar)
      setSetupDone(true)
    }
  }, [])

  // Écouter les messages Firebase en temps réel
  useEffect(() => {
    if (listenerRef.current) off(listenerRef.current)
    const roomRef = query(ref(db, `rooms/${currentRoom}`), limitToLast(60))
    listenerRef.current = roomRef
    onValue(roomRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) { setChatMessages([]); return }
      const msgs = Object.entries(data).map(([key, val]) => ({ key, ...val }))
      setChatMessages(msgs)
    })
    return () => off(roomRef)
  }, [currentRoom])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const saveProfile = async () => {
    const name = setupName.trim() || "Otaku#" + myId.slice(0,4)
    const profile = { name, avatar: setupAvatar }
    localStorage.setItem("animanga_profile", JSON.stringify(profile))
    setUsername(name)
    setAvatar(setupAvatar)
    setSetupDone(true)
    // Message de bienvenue
    await sendToFirebase(name, setupAvatar, `👋 ${name} a rejoint la communauté !`, true)
  }

  const sendToFirebase = async (user, ava, text, system = false) => {
    try {
      await push(ref(db, `rooms/${currentRoom}`), {
        user, avatar: ava, text: text.trim(),
        ts: serverTimestamp(), system, authorId: myId
      })
    } catch (e) {
      console.error("Erreur Firebase:", e)
    }
  }

  const sendChat = async () => {
    if (!chatInput.trim() || sending) return
    const text = chatInput.trim()
    setChatInput("")
    setSending(true)
    await sendToFirebase(username, avatar, text)
    setSending(false)
  }

  // ── Composants ─────────────────────────────────────────────────────────────

  const AdBanner = ({ ad }) => (
    <a href={ad.url} target="_blank" rel="noopener noreferrer"
      style={{ ...S.adBanner, background: ad.bg, borderColor: ad.color+"44", textDecoration:"none" }}>
      <div style={S.adSponsored}>SPONSORISÉ</div>
      <div style={S.adInner}>
        <span style={{ ...S.adIcon, background: ad.color+"22", color: ad.color }}>{ad.icon}</span>
        <div style={S.adBody}>
          <div style={{ ...S.adLabel, color: ad.color }}>{ad.label}</div>
          <div style={S.adSub}>{ad.sub}</div>
        </div>
        <div style={{ ...S.adCta, background: ad.color }}>{ad.cta} →</div>
      </div>
    </a>
  )

  const SetupScreen = () => (
    <div style={S.setupOverlay}>
      <div style={S.setupCard}>
        <div style={S.setupEmoji}>🎌</div>
        <div style={S.setupTitle}>Rejoins la communauté</div>
        <div style={S.setupSub}>Choisis ton avatar et ton pseudo</div>
        <div style={S.avatarGrid}>
          {AVATARS.map(a => (
            <button key={a}
              style={{ ...S.avatarBtn, ...(setupAvatar===a ? S.avatarActive : {}) }}
              onClick={() => setSetupAvatar(a)}>
              {a}
            </button>
          ))}
        </div>
        <input
          style={S.setupInput}
          placeholder="Ton pseudo (ex: NarutoFan92)"
          value={setupName}
          onChange={e => setSetupName(e.target.value)}
          onKeyDown={e => e.key==="Enter" && saveProfile()}
          maxLength={20}
        />
        <button style={S.setupBtn} onClick={saveProfile}>
          Entrer dans la communauté 🚀
        </button>
        <div style={S.setupNote}>
          Tes messages sont visibles par tous les membres.
        </div>
      </div>
    </div>
  )

  const filteredExplore = exploreFilter === "trending"
    ? EXPLORE_ITEMS.filter(i => i.trending)
    : EXPLORE_ITEMS

  const room = ROOMS.find(r => r.id === currentRoom)

  // ── Rendu ───────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      <div style={S.bg1}/><div style={S.bg2}/>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div style={S.hLeft}>
          <span style={S.logo}>鬼</span>
          <div>
            <div style={S.appName}>ANIMANGA</div>
            <div style={S.appSub}>Universe</div>
          </div>
        </div>
        <div style={S.hRight}>
          <div style={S.liveTag}>● LIVE</div>
          {setupDone && (
            <div style={S.userBadge}>
              {avatar}<span style={S.uname}>{username}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={S.content}>

        {/* ════ ACTUS ════ */}
        {activeTab === "news" && (
          <div style={S.tab}>
            <AdBanner ad={ADS[0]} />
            <div style={{ height:14 }}/>
            <div style={S.secTitle}><span>⚡</span> Dernières Actualités</div>
            <div style={S.sourcesBar}>
              {["Anime News Network","Manga-News","Adala-News","AnimOtaku"].map(s => (
                <span key={s} style={S.srcChip}>{s}</span>
              ))}
            </div>

            <div style={S.newsGrid}>
              {NEWS.map((item, idx) => (
                <div key={item.id}>
                  <div
                    style={{ ...S.newsCard, borderLeft:`3px solid ${item.color}` }}
                    onClick={() => setSelectedNews(selectedNews?.id===item.id ? null : item)}
                  >
                    <div style={S.newsTop}>
                      <div style={{ ...S.newsEmoji, background:item.color+"1a" }}>{item.img}</div>
                      <div style={S.newsBody}>
                        <div style={S.newsMeta}>
                          <span style={{ ...S.newsCat, color:item.color }}>{item.category}</span>
                          <span style={{ ...S.newsTag, background:item.color }}>{item.tag}</span>
                          {item.hot && <span>🔥</span>}
                          <span style={S.newsSource}>via {item.source}</span>
                        </div>
                        <div style={S.newsTitle}>{item.title}</div>
                        <div style={S.newsTime}>{item.time}</div>
                      </div>
                    </div>
                    {selectedNews?.id===item.id && (
                      <div style={S.expanded}>
                        <p style={S.newsDesc}>{item.desc}</p>
                        <div style={S.newsActions}>
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            style={S.srcBtn} onClick={e=>e.stopPropagation()}>
                            🔗 Lire sur {item.source}
                          </a>
                          <button style={S.discBtn} onClick={e=>{
                            e.stopPropagation()
                            setChatInput(`Qu'est-ce que vous pensez de : ${item.title} ?`)
                            setActiveTab("discuss")
                          }}>👥 En discuter</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {idx === 2 && <div style={{ marginTop:10 }}><AdBanner ad={ADS[2]} /></div>}
                </div>
              ))}
            </div>

            <div style={{ marginTop:14 }}><AdBanner ad={ADS[1]} /></div>
            <div style={S.premiumBox}>
              <div style={S.premiumTitle}>💎 Sans pub ? Passe en Premium</div>
              <div style={S.premiumDesc}>Navigation sans bannières, articles en avant-première et badge exclusif dans la communauté.</div>
              <button style={S.premiumBtn}>Voir les offres Premium →</button>
            </div>
          </div>
        )}

        {/* ════ EXPLORER ════ */}
        {activeTab === "explore" && (
          <div style={S.tab}>
            <AdBanner ad={ADS[3]} />
            <div style={{ height:14 }}/>
            <div style={S.secTitle}><span>🔍</span> Explorer</div>
            <div style={S.filterRow}>
              {["all","trending"].map(f => (
                <button key={f}
                  style={{ ...S.filterBtn, ...(exploreFilter===f ? S.filterActive : {}) }}
                  onClick={() => setExploreFilter(f)}>
                  {f==="all" ? "Tous" : "🔥 Tendances"}
                </button>
              ))}
            </div>
            <div style={S.exploreGrid}>
              {filteredExplore.map(item => (
                <div key={item.id} style={S.exploreCard}>
                  <div style={S.exploreEmoji}>{item.img}</div>
                  {item.trending && <div style={S.trendBadge}>TRENDING</div>}
                  <div style={S.exploreTitle}>{item.title}</div>
                  <div style={S.exploreType}>{item.type}</div>
                  <div style={S.exploreRow}>
                    <span style={S.genre}>{item.genre}</span>
                    <span style={S.score}>★ {item.score}</span>
                  </div>
                  <button style={S.exploreBtn} onClick={() => {
                    setChatInput(`Quelqu'un a regardé/lu ${item.title} ? C'est bien ?`)
                    setActiveTab("discuss")
                  }}>En discuter 👥</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ COMMUNAUTÉ ════ */}
        {activeTab === "discuss" && (
          !setupDone ? <SetupScreen /> : (
            <div style={S.chatWrap}>
              {/* Salons */}
              <div style={S.roomsBar}>
                {ROOMS.map(r => (
                  <button key={r.id}
                    style={{ ...S.roomBtn, ...(currentRoom===r.id ? S.roomActive : {}) }}
                    onClick={() => setCurrentRoom(r.id)}>
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Header salon */}
              <div style={S.roomHeader}>
                <div>
                  <div style={S.roomName}>{room?.label}</div>
                  <div style={S.roomDesc}>{room?.desc}</div>
                </div>
                <div style={S.onlineTag}>👥 En direct</div>
              </div>

              {/* Messages */}
              <div style={S.msgList}>
                {chatMessages.length===0 && (
                  <div style={S.emptyRoom}>
                    <div style={{ fontSize:40, marginBottom:8 }}>🌸</div>
                    <div style={{ color:"#555", fontSize:12 }}>Sois le premier à parler ici !</div>
                  </div>
                )}
                {chatMessages.map(msg => {
                  const isMe = msg.authorId === myId
                  if (msg.system) return (
                    <div key={msg.key} style={S.sysMsg}>{msg.text}</div>
                  )
                  return (
                    <div key={msg.key} style={{ ...S.msgRow, ...(isMe ? S.msgRowMe : {}) }}>
                      {!isMe && <span style={S.msgAva}>{msg.avatar}</span>}
                      <div style={{ ...S.bubble, ...(isMe ? S.bubbleMe : S.bubbleOther) }}>
                        {!isMe && <div style={S.msgUser}>{msg.user}</div>}
                        <div style={S.msgTxt}>{msg.text}</div>
                        <div style={S.msgTime}>{fmt(msg.ts)}</div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef}/>
              </div>

              {/* Bannière pub discrète dans le chat */}
              <div style={S.chatAdStrip}>
                <a href={ADS[0].url} target="_blank" rel="noopener noreferrer" style={S.chatAdLink}>
                  🎬 <span style={{ color:ADS[0].color, fontWeight:700 }}>Crunchyroll Premium</span>
                  &nbsp;· 1 mois offert
                  <span style={S.chatAdCta}>Essayer →</span>
                </a>
              </div>

              {/* Input */}
              <div style={S.inputRow}>
                <span style={S.myAva}>{avatar}</span>
                <input
                  style={S.chatInput}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && sendChat()}
                  placeholder={`Message dans ${room?.label}…`}
                  maxLength={300}
                />
                <button style={S.sendBtn} onClick={sendChat} disabled={sending}>➤</button>
              </div>
            </div>
          )
        )}

        {/* ════ SHOP ════ */}
        {activeTab === "shop" && (
          <div style={S.tab}>
            <AdBanner ad={ADS[2]} />
            <div style={{ height:14 }}/>
            <div style={S.secTitle}><span>🛒</span> Boutique</div>
            <div style={S.affiliateNote}>
              🤝 Les produits <span style={{ color:"#ffd32a" }}>PARTENAIRE</span> génèrent une commission
              qui finance l'app gratuitement.
            </div>
            <div style={S.shopGrid}>
              {SHOP_ITEMS.map(item => (
                <div key={item.id} style={{ ...S.shopCard, ...(item.sponsored ? S.shopSponsored : {}) }}>
                  {item.sponsored && <div style={S.sponsoTag}>PARTENAIRE</div>}
                  <div style={S.shopTop}>
                    <div style={S.shopEmoji}>{item.img}</div>
                    <div style={S.shopInfo}>
                      <span style={S.shopBadge}>{item.badge}</span>
                      <div style={S.shopName}>{item.name}</div>
                      <div style={S.shopStore}>via {item.store}</div>
                    </div>
                    <div style={S.shopPrice}>{item.price}</div>
                  </div>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" style={S.shopLink}>
                    Voir le produit →
                  </a>
                </div>
              ))}
            </div>
            <div style={{ marginTop:14 }}><AdBanner ad={ADS[0]} /></div>
            <div style={{ ...S.premiumBox, marginTop:14 }}>
              <div style={S.premiumTitle}>💰 Modèle 100% gratuit</div>
              <div style={S.premiumDesc}>
                Cette app est gratuite et le restera. Elle se finance via les liens affiliés
                Amazon/Fnac (commission 3-5%), les bannières partenaires, et un Premium optionnel
                sans obligation.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={S.bottomNav}>
        {TABS.map(tab => (
          <button key={tab.id}
            style={{ ...S.navBtn, ...(activeTab===tab.id ? S.navActive : {}) }}
            onClick={() => setActiveTab(tab.id)}>
            <span style={S.navIcon}>{tab.icon}</span>
            <span style={S.navLabel}>{tab.label}</span>
            {activeTab===tab.id && <div style={S.navDot}/>}
          </button>
        ))}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Noto+Sans+JP:wght@400;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#ff4757; border-radius:2px; }
        @keyframes pulse  { 0%,100%{opacity:1;} 50%{opacity:.4;} }
        @keyframes float  { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-20px);} }
        @keyframes float2 { 0%,100%{transform:translateY(0);} 50%{transform:translateY(30px);} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
        @keyframes slideUp{ from{opacity:0;transform:translateY(24px);} to{opacity:1;transform:translateY(0);} }
      `}</style>
    </div>
  )
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  root:{ width:"100%", maxWidth:430, minHeight:"100vh", margin:"0 auto", background:"#08080e", display:"flex", flexDirection:"column", fontFamily:"'Noto Sans JP',sans-serif", color:"#e8e8f0", position:"relative", overflow:"hidden" },
  bg1:{ position:"fixed", top:-80, right:-80, width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,71,87,.13)0%,transparent 70%)", pointerEvents:"none", animation:"float 8s ease-in-out infinite", zIndex:0 },
  bg2:{ position:"fixed", bottom:80, left:-80, width:240, height:240, borderRadius:"50%", background:"radial-gradient(circle,rgba(83,82,237,.1)0%,transparent 70%)", pointerEvents:"none", animation:"float2 10s ease-in-out infinite", zIndex:0 },

  header:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 16px", background:"rgba(8,8,14,.97)", borderBottom:"1px solid rgba(255,71,87,.18)", position:"sticky", top:0, zIndex:100, backdropFilter:"blur(10px)" },
  hLeft:{ display:"flex", alignItems:"center", gap:10 },
  logo:{ fontSize:30, fontWeight:700, background:"linear-gradient(135deg,#ff4757,#ff6b81)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", fontFamily:"serif", lineHeight:1 },
  appName:{ fontFamily:"'Rajdhani',sans-serif", fontSize:19, fontWeight:700, letterSpacing:3, color:"#fff" },
  appSub:{ fontSize:9, color:"#ff4757", letterSpacing:4, textTransform:"uppercase" },
  hRight:{ display:"flex", alignItems:"center", gap:8 },
  liveTag:{ fontSize:10, fontWeight:700, color:"#ff4757", letterSpacing:1, animation:"pulse 2s ease-in-out infinite" },
  userBadge:{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,255,255,.06)", padding:"4px 9px", borderRadius:20, fontSize:16 },
  uname:{ color:"#aaa", fontSize:11, maxWidth:72, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },

  content:{ flex:1, overflowY:"auto", overflowX:"hidden", paddingBottom:74, position:"relative", zIndex:1 },
  tab:{ padding:"14px", animation:"fadeIn .3s ease" },
  secTitle:{ fontFamily:"'Rajdhani',sans-serif", fontSize:17, fontWeight:700, letterSpacing:2, marginBottom:12, color:"#fff", textTransform:"uppercase", display:"flex", alignItems:"center", gap:8 },

  sourcesBar:{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12, marginTop:-4 },
  srcChip:{ fontSize:9, fontWeight:700, color:"#555", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", padding:"3px 8px", borderRadius:10 },

  newsGrid:{ display:"flex", flexDirection:"column", gap:10 },
  newsCard:{ background:"rgba(255,255,255,.04)", borderRadius:12, padding:12, cursor:"pointer", border:"1px solid rgba(255,255,255,.06)", transition:"all .2s" },
  newsTop:{ display:"flex", gap:10, alignItems:"flex-start" },
  newsEmoji:{ width:46, height:46, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 },
  newsBody:{ flex:1 },
  newsMeta:{ display:"flex", alignItems:"center", gap:5, marginBottom:4, flexWrap:"wrap" },
  newsCat:{ fontSize:9, fontWeight:700, letterSpacing:1 },
  newsTag:{ fontSize:8, fontWeight:700, padding:"2px 5px", borderRadius:3, color:"#000" },
  newsSource:{ fontSize:9, color:"#555", marginLeft:"auto", fontStyle:"italic" },
  newsTitle:{ fontSize:12, fontWeight:700, lineHeight:1.4, color:"#f0f0f8", marginBottom:3 },
  newsTime:{ fontSize:9, color:"#555" },
  expanded:{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,255,255,.05)", animation:"fadeIn .2s ease" },
  newsDesc:{ fontSize:12, color:"#999", lineHeight:1.6, marginBottom:10 },
  newsActions:{ display:"flex", gap:8, flexWrap:"wrap" },
  srcBtn:{ display:"inline-block", background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)", borderRadius:8, color:"#ccc", padding:"6px 12px", fontSize:11, fontWeight:600, cursor:"pointer", textDecoration:"none" },
  discBtn:{ background:"linear-gradient(135deg,#5352ed,#3742fa)", border:"none", borderRadius:8, color:"#fff", padding:"6px 12px", fontSize:11, fontWeight:700, cursor:"pointer" },

  premiumBox:{ background:"rgba(255,211,42,.05)", border:"1px solid rgba(255,211,42,.18)", borderRadius:12, padding:14, marginTop:14 },
  premiumTitle:{ fontSize:13, fontWeight:700, color:"#ffd32a", marginBottom:5 },
  premiumDesc:{ fontSize:11, color:"#888", lineHeight:1.5, marginBottom:10 },
  premiumBtn:{ background:"linear-gradient(135deg,#ffd32a,#ffa502)", border:"none", borderRadius:8, color:"#000", padding:"8px 16px", fontSize:12, fontWeight:800, cursor:"pointer" },

  adBanner:{ display:"block", borderRadius:12, border:"1px solid", padding:"10px 12px", position:"relative", overflow:"hidden" },
  adSponsored:{ position:"absolute", top:5, right:8, fontSize:8, color:"#555", letterSpacing:.5 },
  adInner:{ display:"flex", alignItems:"center", gap:10 },
  adIcon:{ width:36, height:36, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, flexShrink:0 },
  adBody:{ flex:1 },
  adLabel:{ fontSize:12, fontWeight:700 },
  adSub:{ fontSize:10, color:"#777", marginTop:1 },
  adCta:{ flexShrink:0, fontSize:9, fontWeight:800, color:"#000", padding:"5px 9px", borderRadius:6, whiteSpace:"nowrap" },

  filterRow:{ display:"flex", gap:8, marginBottom:14 },
  filterBtn:{ padding:"6px 16px", borderRadius:20, border:"1px solid rgba(255,255,255,.1)", background:"transparent", color:"#666", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .2s" },
  filterActive:{ background:"#ff4757", borderColor:"#ff4757", color:"#fff" },
  exploreGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  exploreCard:{ background:"rgba(255,255,255,.04)", borderRadius:13, padding:12, border:"1px solid rgba(255,255,255,.06)", position:"relative", overflow:"hidden", display:"flex", flexDirection:"column", gap:5 },
  exploreEmoji:{ fontSize:28, lineHeight:1 },
  trendBadge:{ position:"absolute", top:8, right:8, fontSize:7, fontWeight:800, color:"#ff4757", background:"rgba(255,71,87,.14)", padding:"2px 5px", borderRadius:3 },
  exploreTitle:{ fontSize:13, fontWeight:700, color:"#fff", lineHeight:1.3 },
  exploreType:{ fontSize:9, color:"#5352ed", fontWeight:600 },
  exploreRow:{ display:"flex", justifyContent:"space-between", alignItems:"center" },
  genre:{ fontSize:9, color:"#777", background:"rgba(255,255,255,.06)", padding:"2px 7px", borderRadius:8 },
  score:{ fontSize:12, fontWeight:700, color:"#ffd32a" },
  exploreBtn:{ marginTop:4, background:"rgba(83,82,237,.16)", border:"1px solid rgba(83,82,237,.32)", borderRadius:7, color:"#a29bfe", padding:"5px 8px", fontSize:10, fontWeight:600, cursor:"pointer", width:"100%" },

  chatWrap:{ display:"flex", flexDirection:"column", height:"calc(100vh - 128px)", animation:"fadeIn .3s ease" },
  roomsBar:{ display:"flex", overflowX:"auto", gap:6, padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,.05)", scrollbarWidth:"none" },
  roomBtn:{ flexShrink:0, padding:"6px 12px", borderRadius:20, border:"1px solid rgba(255,255,255,.08)", background:"transparent", color:"#555", fontSize:11, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", transition:"all .2s" },
  roomActive:{ background:"rgba(255,71,87,.14)", borderColor:"rgba(255,71,87,.38)", color:"#ff4757" },
  roomHeader:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 14px", borderBottom:"1px solid rgba(255,255,255,.04)" },
  roomName:{ fontSize:13, fontWeight:700, color:"#fff" },
  roomDesc:{ fontSize:10, color:"#555" },
  onlineTag:{ fontSize:10, color:"#2ed573", background:"rgba(46,213,115,.1)", padding:"3px 8px", borderRadius:10 },
  msgList:{ flex:1, overflowY:"auto", padding:"12px", display:"flex", flexDirection:"column", gap:8 },
  emptyRoom:{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40 },
  sysMsg:{ fontSize:11, color:"#555", background:"rgba(255,255,255,.03)", padding:"4px 12px", borderRadius:12, textAlign:"center", alignSelf:"center" },
  msgRow:{ display:"flex", gap:8, alignItems:"flex-end" },
  msgRowMe:{ flexDirection:"row-reverse" },
  msgAva:{ fontSize:21, flexShrink:0, marginBottom:2 },
  bubble:{ padding:"8px 11px", borderRadius:14, maxWidth:"78%" },
  bubbleMe:{ background:"linear-gradient(135deg,#ff4757,#ff6b81)", borderBottomRightRadius:4 },
  bubbleOther:{ background:"rgba(255,255,255,.07)", borderBottomLeftRadius:4 },
  msgUser:{ fontSize:10, fontWeight:700, color:"#a29bfe", marginBottom:2 },
  msgTxt:{ fontSize:12, lineHeight:1.5, color:"#f0f0f8", wordBreak:"break-word" },
  msgTime:{ fontSize:9, color:"rgba(255,255,255,.3)", marginTop:3, textAlign:"right" },
  chatAdStrip:{ padding:"6px 14px", borderTop:"1px solid rgba(255,255,255,.04)", background:"rgba(255,255,255,.02)" },
  chatAdLink:{ display:"flex", alignItems:"center", gap:6, textDecoration:"none", fontSize:11, color:"#666" },
  chatAdCta:{ marginLeft:"auto", color:"#f47521", fontWeight:700, fontSize:11 },
  inputRow:{ display:"flex", gap:8, padding:"10px 12px", borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(8,8,14,.98)" },
  myAva:{ fontSize:22, flexShrink:0, display:"flex", alignItems:"center" },
  chatInput:{ flex:1, background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", borderRadius:12, padding:"9px 13px", color:"#fff", fontSize:12, outline:"none", fontFamily:"inherit" },
  sendBtn:{ background:"linear-gradient(135deg,#ff4757,#ff6b81)", border:"none", borderRadius:12, width:42, height:42, color:"#fff", fontSize:17, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" },

  setupOverlay:{ position:"absolute", inset:0, background:"rgba(8,8,14,.97)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, animation:"fadeIn .3s ease" },
  setupCard:{ background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.09)", borderRadius:20, padding:"26px 20px", maxWidth:310, width:"100%", margin:"0 16px", animation:"slideUp .4s ease", textAlign:"center" },
  setupEmoji:{ fontSize:40, marginBottom:8 },
  setupTitle:{ fontFamily:"'Rajdhani',sans-serif", fontSize:22, fontWeight:700, color:"#fff", marginBottom:4 },
  setupSub:{ fontSize:12, color:"#666", marginBottom:18 },
  avatarGrid:{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:7, marginBottom:18 },
  avatarBtn:{ fontSize:22, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:"7px 5px", cursor:"pointer", transition:"all .2s" },
  avatarActive:{ background:"rgba(255,71,87,.2)", border:"1px solid rgba(255,71,87,.5)" },
  setupInput:{ width:"100%", background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", borderRadius:12, padding:"11px 13px", color:"#fff", fontSize:13, outline:"none", fontFamily:"inherit", marginBottom:13, textAlign:"left" },
  setupBtn:{ width:"100%", background:"linear-gradient(135deg,#ff4757,#ff6b81)", border:"none", borderRadius:12, color:"#fff", padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer" },
  setupNote:{ fontSize:10, color:"#555", marginTop:12, lineHeight:1.4 },

  affiliateNote:{ fontSize:11, color:"#888", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:8, padding:"8px 12px", marginBottom:12, lineHeight:1.5 },
  shopGrid:{ display:"flex", flexDirection:"column", gap:10 },
  shopCard:{ background:"rgba(255,255,255,.04)", borderRadius:12, padding:12, border:"1px solid rgba(255,255,255,.06)", position:"relative" },
  shopSponsored:{ border:"1px solid rgba(255,211,42,.22)", background:"rgba(255,211,42,.025)" },
  sponsoTag:{ position:"absolute", top:8, right:8, fontSize:8, fontWeight:800, color:"#ffd32a", background:"rgba(255,211,42,.12)", padding:"2px 6px", borderRadius:4 },
  shopTop:{ display:"flex", alignItems:"center", gap:10, marginBottom:10 },
  shopEmoji:{ fontSize:26, flexShrink:0 },
  shopInfo:{ flex:1 },
  shopBadge:{ fontSize:8, fontWeight:800, color:"#ff4757", background:"rgba(255,71,87,.12)", padding:"2px 6px", borderRadius:4 },
  shopName:{ fontSize:12, fontWeight:700, color:"#f0f0f8", marginTop:3, lineHeight:1.3 },
  shopStore:{ fontSize:10, color:"#666", marginTop:2 },
  shopPrice:{ fontSize:17, fontWeight:800, color:"#ff4757", fontFamily:"'Rajdhani',sans-serif", flexShrink:0 },
  shopLink:{ display:"block", textAlign:"center", background:"rgba(255,211,42,.07)", border:"1px solid rgba(255,211,42,.22)", borderRadius:8, color:"#ffd32a", padding:"7px", fontSize:11, fontWeight:700, textDecoration:"none" },

  bottomNav:{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, display:"flex", background:"rgba(8,8,14,.97)", borderTop:"1px solid rgba(255,71,87,.16)", backdropFilter:"blur(20px)", zIndex:100 },
  navBtn:{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"9px 4px 10px", background:"transparent", border:"none", cursor:"pointer", color:"#3a3a4a", position:"relative", transition:"color .2s" },
  navActive:{ color:"#ff4757" },
  navIcon:{ fontSize:19 },
  navLabel:{ fontSize:9, fontWeight:600, letterSpacing:.3 },
  navDot:{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:20, height:2, background:"linear-gradient(90deg,#ff4757,#ff6b81)", borderRadius:1 },
}
