import { useState, useEffect, useRef, useCallback } from "react"
import { db } from "./firebase.js"
import { ref, push, onValue, off, serverTimestamp, query, limitToLast } from "firebase/database"

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "news",    icon: "⚡", label: "Actus"       },
  { id: "explore", icon: "🔍", label: "Explorer"    },
  { id: "discuss", icon: "👥", label: "Communauté"  },
  { id: "shop",    icon: "🛒", label: "Shop"        },
]

const ROOMS = [
  { id: "general",         label: "💬 Général",  desc: "Parle de tout !"              },
  { id: "anime",           label: "🎬 Anime",     desc: "Actus & discussions anime"    },
  { id: "manga",           label: "📚 Manga",     desc: "Chapitres, sorties, théories" },
  { id: "spoilers",        label: "⚠️ Spoilers",  desc: "Zone libre — attention !"     },
  { id: "recommandations", label: "⭐ Reco",       desc: "Conseils & découvertes"       },
]

const AVATARS = ["🐉","⚔️","🌸","👁️","🔥","☠️","🌙","⚡","🌊","🗡️","🎭","🦊"]

const COLORS = ["#ff4757","#ffa502","#5352ed","#2ed573","#00d2d3","#ff6b81","#eccc68","#a29bfe","#fd79a8","#55efc4"]

const EXPLORE_ITEMS = [
  { id:1, title:"Frieren",         type:"Manga/Anime",  score:9.4, genre:"Fantasy",    img:"🧝", trending:true  },
  { id:2, title:"Vinland Saga S3", type:"Anime",        score:9.1, genre:"Historique", img:"⚔️", trending:true  },
  { id:3, title:"Dungeon Meshi",   type:"Anime",        score:8.9, genre:"Aventure",   img:"🍖", trending:false },
  { id:4, title:"Solo Leveling",   type:"Manhwa/Anime", score:8.7, genre:"Action",     img:"💎", trending:true  },
  { id:5, title:"Chainsaw Man",    type:"Manga",        score:9.0, genre:"Dark",       img:"⛓️", trending:false },
  { id:6, title:"Oshi no Ko S2",   type:"Anime",        score:8.8, genre:"Drama",      img:"⭐", trending:true  },
]

const SHOP_ITEMS = [
  { id:1, name:"Figurine Gojo Satoru Premium",    price:"89,99€", store:"AmiAmi",          url:"https://www.amiami.com",                                                          img:"👁️", badge:"EXCLU",  sponsored:false },
  { id:2, name:"Coffret Blu-ray Demon Slayer S1+S2", price:"129€", store:"Amazon FR",       url:"https://www.amazon.fr/s?k=demon+slayer+blu-ray",                                  img:"🗡️", badge:"PROMO",  sponsored:true  },
  { id:3, name:"Manga One Piece Tome 109",          price:"7,20€", store:"Fnac",            url:"https://www.fnac.com/SearchResult/ResultList.aspx?Search=one+piece+manga",         img:"📚", badge:"NEUF",   sponsored:false },
  { id:4, name:"T-Shirt Naruto Akatsuki",           price:"34,99€", store:"Crunchyroll",    url:"https://store.crunchyroll.com",                                                    img:"🎽", badge:"LIMITÉ", sponsored:false },
  { id:5, name:"Pop! Vinyl Luffy Gear 5",           price:"18,99€", store:"Micromania",     url:"https://www.micromania.fr/recherche?q=luffy",                                      img:"🌀", badge:"HOT",    sponsored:true  },
  { id:6, name:"Artbook Demon Slayer Officiel",      price:"42€",   store:"Amazon FR",      url:"https://www.amazon.fr/s?k=demon+slayer+artbook",                                   img:"🎨", badge:"RARE",   sponsored:false },
]

const ADS = [
  { id:"a1", label:"Crunchyroll Premium",  sub:"1 mois offert · Anime illimité en HD",      cta:"Essayer gratis",    color:"#f47521", bg:"rgba(244,117,33,.08)", url:"https://www.crunchyroll.com/premium",  icon:"🎬" },
  { id:"a2", label:"Amazon Prime Vidéo",   sub:"Vinland Saga, Tokyo Ghoul, Conan…",         cta:"Voir le catalogue", color:"#ff9900", bg:"rgba(255,153,0,.08)",  url:"https://www.amazon.fr/gp/video/storefront/?contentType=tv&contentId=anime", icon:"📺" },
  { id:"a3", label:"AmiAmi — Figurines",   sub:"Livraison France · Code ANIMANGA10 = -10%", cta:"Voir les offres",   color:"#00a8ff", bg:"rgba(0,168,255,.08)",  url:"https://www.amiami.com",               icon:"🏪" },
  { id:"a4", label:"Manga-News Premium",   sub:"Articles en avant-première + sans pub",     cta:"S'abonner",         color:"#2ed573", bg:"rgba(46,213,115,.08)", url:"https://www.manga-news.com",           icon:"📰" },
]

const NEWS_CACHE_KEY = "animanga_news_cache"
const NEWS_CACHE_TTL = 60 * 60 * 1000 // 1 heure

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

const useWindowSize = () => {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [])
  return width
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────

export default function App() {
  const windowWidth  = useWindowSize()
  const isDesktop    = windowWidth >= 768

  const [activeTab,      setActiveTab]      = useState("news")
  const [selectedNews,   setSelectedNews]   = useState(null)
  const [exploreFilter,  setExploreFilter]  = useState("all")

  // News automatiques
  const [news,           setNews]           = useState([])
  const [newsLoading,    setNewsLoading]    = useState(false)
  const [newsError,      setNewsError]      = useState(null)
  const [lastUpdate,     setLastUpdate]     = useState(null)

  // Communauté
  const [currentRoom,  setCurrentRoom]   = useState("general")
  const [chatMessages, setChatMessages]  = useState([])
  const [chatInput,    setChatInput]     = useState("")
  const [sending,      setSending]       = useState(false)
  const [username,     setUsername]      = useState("")
  const [avatar,       setAvatar]        = useState(AVATARS[0])
  const [setupDone,    setSetupDone]     = useState(false)
  const [setupName,    setSetupName]     = useState("")
  const [setupAvatar,  setSetupAvatar]   = useState(AVATARS[0])
  const [myId]                           = useState(() => {
    const s = localStorage.getItem("animanga_uid")
    if (s) return s
    const id = uid()
    localStorage.setItem("animanga_uid", id)
    return id
  })

  const messagesEndRef = useRef(null)
  const listenerRef    = useRef(null)

  // ── Chargement profil ────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("animanga_profile")
    if (saved) {
      const p = JSON.parse(saved)
      setUsername(p.name); setAvatar(p.avatar); setSetupDone(true)
    }
  }, [])

  // ── Actualités automatiques ──────────────────────────────────────────────
  const fetchNews = useCallback(async (force = false) => {
    // Vérifier le cache d'abord
    if (!force) {
      try {
        const cached = localStorage.getItem(NEWS_CACHE_KEY)
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < NEWS_CACHE_TTL && data.length > 0) {
            setNews(data)
            setLastUpdate(new Date(timestamp))
            return
          }
        }
      } catch {}
    }

    setNewsLoading(true)
    setNewsError(null)

    try {
      // Appel à notre fonction Vercel serverless (clé API sécurisée côté serveur)
      const response = await fetch("/api/news")

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      const parsed = result.news

      if (Array.isArray(parsed) && parsed.length > 0) {
        setNews(parsed)
        setLastUpdate(new Date(result.updatedAt))
        localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({
          data: parsed,
          timestamp: result.updatedAt
        }))
      }
    } catch (e) {
      console.error("Erreur chargement news:", e)
      setNewsError("Impossible de charger les actualités. Réessaie dans quelques instants.")
      // Utiliser le cache expiré en cas d'erreur
      try {
        const cached = localStorage.getItem(NEWS_CACHE_KEY)
        if (cached) {
          const { data } = JSON.parse(cached)
          if (data.length > 0) setNews(data)
        }
      } catch {}
    }

    setNewsLoading(false)
  }, [])

  useEffect(() => { fetchNews() }, [fetchNews])

  // Rafraîchir les news toutes les heures
  useEffect(() => {
    const interval = setInterval(() => fetchNews(true), NEWS_CACHE_TTL)
    return () => clearInterval(interval)
  }, [fetchNews])

  // ── Firebase chat ────────────────────────────────────────────────────────
  useEffect(() => {
    if (listenerRef.current) off(listenerRef.current)
    const roomRef = query(ref(db, `rooms/${currentRoom}`), limitToLast(60))
    listenerRef.current = roomRef
    onValue(roomRef, (snap) => {
      const d = snap.val()
      setChatMessages(d ? Object.entries(d).map(([k,v]) => ({ key:k, ...v })) : [])
    })
    return () => off(roomRef)
  }, [currentRoom])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const saveProfile = async () => {
    const name = setupName.trim() || "Otaku#" + myId.slice(0,4)
    localStorage.setItem("animanga_profile", JSON.stringify({ name, avatar: setupAvatar }))
    setUsername(name); setAvatar(setupAvatar); setSetupDone(true)
    await sendToFirebase(name, setupAvatar, `👋 ${name} a rejoint la communauté !`, true)
  }

  const sendToFirebase = async (user, ava, text, system = false) => {
    try {
      await push(ref(db, `rooms/${currentRoom}`), {
        user, avatar: ava, text: text.trim(), ts: serverTimestamp(), system, authorId: myId
      })
    } catch (e) { console.error(e) }
  }

  const sendChat = async () => {
    if (!chatInput.trim() || sending) return
    const text = chatInput.trim()
    setChatInput(""); setSending(true)
    await sendToFirebase(username, avatar, text)
    setSending(false)
  }

  // ── Sous-composants ──────────────────────────────────────────────────────

  const AdBanner = ({ ad }) => (
    <a href={ad.url} target="_blank" rel="noopener noreferrer"
      style={{ ...S.adBanner, background:ad.bg, borderColor:ad.color+"44", textDecoration:"none" }}>
      <div style={S.adSponsored}>SPONSORISÉ</div>
      <div style={S.adInner}>
        <span style={{ ...S.adIcon, background:ad.color+"22", color:ad.color }}>{ad.icon}</span>
        <div style={S.adBody}>
          <div style={{ ...S.adLabel, color:ad.color }}>{ad.label}</div>
          <div style={S.adSub}>{ad.sub}</div>
        </div>
        <div style={{ ...S.adCta, background:ad.color }}>{ad.cta} →</div>
      </div>
    </a>
  )

  const NewsSection = () => (
    <div style={S.tab}>
      {/* Top Ad */}
      <AdBanner ad={ADS[0]} />
      <div style={{ height:16 }}/>

      {/* Header actus */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={S.secTitle}><span>⚡</span> Dernières Actualités</div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {lastUpdate && (
            <span style={{ fontSize:10, color:"#555" }}>
              Mis à jour {fmt(lastUpdate.getTime())}
            </span>
          )}
          <button
            style={S.refreshBtn}
            onClick={() => fetchNews(true)}
            disabled={newsLoading}
            title="Rafraîchir les actualités"
          >
            {newsLoading ? "⏳" : "🔄"}
          </button>
        </div>
      </div>

      <div style={S.sourcesBar}>
        {["Anime News Network","Manga-News","Adala-News","AnimOtaku"].map(s => (
          <span key={s} style={S.srcChip}>{s}</span>
        ))}
      </div>

      {/* État de chargement */}
      {newsLoading && news.length === 0 && (
        <div style={S.loadingBox}>
          <div style={S.loadingSpinner}>⏳</div>
          <div style={S.loadingText}>Recherche des dernières actualités en temps réel…</div>
          <div style={S.loadingSubtext}>Scan de Anime News Network, Manga-News, Adala-News…</div>
        </div>
      )}

      {/* Erreur */}
      {newsError && news.length === 0 && (
        <div style={S.errorBox}>
          <div style={{ fontSize:32, marginBottom:8 }}>😕</div>
          <div style={{ color:"#ff4757", fontSize:13, marginBottom:8 }}>{newsError}</div>
          <button style={S.retryBtn} onClick={() => fetchNews(true)}>Réessayer</button>
        </div>
      )}

      {/* Grille d'actualités — 1 colonne sur mobile, 2 sur desktop */}
      {news.length > 0 && (
        <div style={{ ...S.newsGrid, ...(isDesktop ? S.newsGridDesktop : {}) }}>
          {news.map((item, idx) => (
            <div key={item.id}>
              <div
                style={{ ...S.newsCard, borderLeft:`3px solid ${item.color || "#ff4757"}` }}
                onClick={() => setSelectedNews(selectedNews?.id===item.id ? null : item)}
              >
                <div style={S.newsTop}>
                  <div style={{ ...S.newsEmoji, background:(item.color||"#ff4757")+"1a" }}>{item.img}</div>
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
      )}

      <div style={{ marginTop:14 }}><AdBanner ad={ADS[1]} /></div>
      <div style={S.premiumBox}>
        <div style={S.premiumTitle}>💎 Sans pub ? Passe en Premium</div>
        <div style={S.premiumDesc}>Navigation sans bannières, articles en avant-première et badge exclusif dans la communauté.</div>
        <button style={S.premiumBtn}>Voir les offres →</button>
      </div>
    </div>
  )

  const ExploreSection = () => {
    const filtered = exploreFilter === "trending" ? EXPLORE_ITEMS.filter(i=>i.trending) : EXPLORE_ITEMS
    return (
      <div style={S.tab}>
        <AdBanner ad={ADS[3]} />
        <div style={{ height:16 }}/>
        <div style={S.secTitle}><span>🔍</span> Explorer</div>
        <div style={S.filterRow}>
          {["all","trending"].map(f => (
            <button key={f}
              style={{ ...S.filterBtn, ...(exploreFilter===f?S.filterActive:{}) }}
              onClick={()=>setExploreFilter(f)}>
              {f==="all"?"Tous":"🔥 Tendances"}
            </button>
          ))}
        </div>
        <div style={{ ...S.exploreGrid, ...(isDesktop?S.exploreGridDesktop:{}) }}>
          {filtered.map(item => (
            <div key={item.id} style={S.exploreCard}>
              <div style={S.exploreEmoji}>{item.img}</div>
              {item.trending && <div style={S.trendBadge}>TRENDING</div>}
              <div style={S.exploreTitle}>{item.title}</div>
              <div style={S.exploreType}>{item.type}</div>
              <div style={S.exploreRow}>
                <span style={S.genre}>{item.genre}</span>
                <span style={S.score}>★ {item.score}</span>
              </div>
              <button style={S.exploreBtn} onClick={()=>{
                setChatInput(`Quelqu'un a regardé/lu ${item.title} ? C'est bien ?`)
                setActiveTab("discuss")
              }}>En discuter 👥</button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const SetupScreen = () => (
    <div style={S.setupOverlay}>
      <div style={S.setupCard}>
        <div style={S.setupEmoji}>🎌</div>
        <div style={S.setupTitle}>Rejoins la communauté</div>
        <div style={S.setupSub}>Choisis ton avatar et ton pseudo</div>
        <div style={S.avatarGrid}>
          {AVATARS.map(a => (
            <button key={a}
              style={{ ...S.avatarBtn, ...(setupAvatar===a?S.avatarActive:{}) }}
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
        <div style={S.setupNote}>Tes messages sont visibles par tous les membres.</div>
      </div>
    </div>
  )

  const CommunitySection = () => {
    if (!setupDone) return <SetupScreen />
    const room = ROOMS.find(r => r.id === currentRoom)
    return (
      <div style={{ ...S.chatWrap, height: isDesktop ? "calc(100vh - 80px)" : "calc(100vh - 128px)" }}>
        <div style={S.roomsBar}>
          {ROOMS.map(r => (
            <button key={r.id}
              style={{ ...S.roomBtn, ...(currentRoom===r.id?S.roomActive:{}) }}
              onClick={() => setCurrentRoom(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <div style={S.roomHeader}>
          <div>
            <div style={S.roomName}>{room?.label}</div>
            <div style={S.roomDesc}>{room?.desc}</div>
          </div>
          <div style={S.onlineTag}>👥 En direct</div>
        </div>
        <div style={S.msgList}>
          {chatMessages.length===0 && (
            <div style={S.emptyRoom}>
              <div style={{ fontSize:40, marginBottom:8 }}>🌸</div>
              <div style={{ color:"#555", fontSize:12 }}>Sois le premier à parler ici !</div>
            </div>
          )}
          {chatMessages.map(msg => {
            const isMe = msg.authorId === myId
            if (msg.system) return <div key={msg.key} style={S.sysMsg}>{msg.text}</div>
            return (
              <div key={msg.key} style={{ ...S.msgRow, ...(isMe?S.msgRowMe:{}) }}>
                {!isMe && <span style={S.msgAva}>{msg.avatar}</span>}
                <div style={{ ...S.bubble, ...(isMe?S.bubbleMe:S.bubbleOther) }}>
                  {!isMe && <div style={S.msgUser}>{msg.user}</div>}
                  <div style={S.msgTxt}>{msg.text}</div>
                  <div style={S.msgTime}>{fmt(msg.ts)}</div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef}/>
        </div>
        <div style={S.chatAdStrip}>
          <a href={ADS[0].url} target="_blank" rel="noopener noreferrer" style={S.chatAdLink}>
            🎬 <span style={{ color:ADS[0].color, fontWeight:700 }}>Crunchyroll Premium</span>
            &nbsp;· 1 mois offert
            <span style={S.chatAdCta}>Essayer →</span>
          </a>
        </div>
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
  }

  const ShopSection = () => (
    <div style={S.tab}>
      <AdBanner ad={ADS[2]} />
      <div style={{ height:16 }}/>
      <div style={S.secTitle}><span>🛒</span> Boutique</div>
      <div style={S.affiliateNote}>
        🤝 Les produits <span style={{ color:"#ffd32a" }}>PARTENAIRE</span> génèrent une commission qui finance l'app gratuitement.
      </div>
      <div style={{ ...S.shopGrid, ...(isDesktop?S.shopGridDesktop:{}) }}>
        {SHOP_ITEMS.map(item => (
          <div key={item.id} style={{ ...S.shopCard, ...(item.sponsored?S.shopSponsored:{}) }}>
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
    </div>
  )

  const renderContent = () => {
    switch(activeTab) {
      case "news":    return <NewsSection />
      case "explore": return <ExploreSection />
      case "discuss": return <CommunitySection />
      case "shop":    return <ShopSection />
      default:        return <NewsSection />
    }
  }

  // ── RENDU ────────────────────────────────────────────────────────────────
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

        {/* Navigation desktop dans le header */}
        {isDesktop && (
          <div style={S.headerNav}>
            {TABS.map(tab => (
              <button key={tab.id}
                style={{ ...S.headerNavBtn, ...(activeTab===tab.id?S.headerNavBtnActive:{}) }}
                onClick={() => setActiveTab(tab.id)}>
                {tab.icon} {tab.label}
                {activeTab===tab.id && <div style={S.headerNavDot}/>}
              </button>
            ))}
          </div>
        )}

        <div style={S.hRight}>
          <div style={S.liveTag}>● LIVE</div>
          {setupDone && (
            <div style={S.userBadge}>
              {avatar}<span style={S.uname}>{username}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── LAYOUT PRINCIPAL ── */}
      <div style={{ ...S.mainLayout, ...(isDesktop?S.mainLayoutDesktop:{}) }}>

        {/* Sidebar desktop */}
        {isDesktop && (
          <aside style={S.sidebar}>
            <div style={S.sidebarTitle}>Navigation</div>
            {TABS.map(tab => (
              <button key={tab.id}
                style={{ ...S.sideNavBtn, ...(activeTab===tab.id?S.sideNavBtnActive:{}) }}
                onClick={() => setActiveTab(tab.id)}>
                <span style={{ fontSize:20 }}>{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab===tab.id && <div style={S.sideNavIndicator}/>}
              </button>
            ))}

            <div style={S.sidebarDivider}/>
            <div style={S.sidebarTitle}>Salons</div>
            {ROOMS.map(r => (
              <button key={r.id}
                style={{ ...S.sideNavBtn, ...(activeTab==="discuss"&&currentRoom===r.id?S.sideNavBtnActive:{}) }}
                onClick={() => { setCurrentRoom(r.id); setActiveTab("discuss") }}>
                <span style={{ fontSize:16 }}>{r.label.split(" ")[0]}</span>
                <span style={{ fontSize:12 }}>{r.label.split(" ").slice(1).join(" ")}</span>
              </button>
            ))}

            <div style={S.sidebarDivider}/>
            <div style={S.sideAdBox}>
              <AdBanner ad={ADS[3]} />
            </div>
          </aside>
        )}

        {/* Contenu principal */}
        <main style={{ ...S.mainContent, ...(isDesktop?S.mainContentDesktop:{}) }}>
          {renderContent()}
        </main>
      </div>

      {/* ── BOTTOM NAV (mobile uniquement) ── */}
      {!isDesktop && (
        <div style={S.bottomNav}>
          {TABS.map(tab => (
            <button key={tab.id}
              style={{ ...S.navBtn, ...(activeTab===tab.id?S.navActive:{}) }}
              onClick={() => setActiveTab(tab.id)}>
              <span style={S.navIcon}>{tab.icon}</span>
              <span style={S.navLabel}>{tab.label}</span>
              {activeTab===tab.id && <div style={S.navDot}/>}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Noto+Sans+JP:wght@400;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:#ff4757; border-radius:2px; }
        @keyframes pulse  { 0%,100%{opacity:1;} 50%{opacity:.4;} }
        @keyframes float  { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-20px);} }
        @keyframes float2 { 0%,100%{transform:translateY(0);} 50%{transform:translateY(30px);} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
        @keyframes slideUp{ from{opacity:0;transform:translateY(24px);} to{opacity:1;transform:translateY(0);} }
        @keyframes spin   { to{transform:rotate(360deg);} }
      `}</style>
    </div>
  )
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  root:{ width:"100%", minHeight:"100vh", background:"#08080e", display:"flex", flexDirection:"column", fontFamily:"'Noto Sans JP',sans-serif", color:"#e8e8f0", position:"relative", overflow:"hidden" },
  bg1:{ position:"fixed", top:-80, right:-80, width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,71,87,.12)0%,transparent 70%)", pointerEvents:"none", animation:"float 8s ease-in-out infinite", zIndex:0 },
  bg2:{ position:"fixed", bottom:80, left:-80, width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle,rgba(83,82,237,.1)0%,transparent 70%)", pointerEvents:"none", animation:"float2 10s ease-in-out infinite", zIndex:0 },

  // Header
  header:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", background:"rgba(8,8,14,.97)", borderBottom:"1px solid rgba(255,71,87,.18)", position:"sticky", top:0, zIndex:100, backdropFilter:"blur(10px)", gap:16 },
  hLeft:{ display:"flex", alignItems:"center", gap:10, flexShrink:0 },
  logo:{ fontSize:30, fontWeight:700, background:"linear-gradient(135deg,#ff4757,#ff6b81)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", fontFamily:"serif", lineHeight:1 },
  appName:{ fontFamily:"'Rajdhani',sans-serif", fontSize:19, fontWeight:700, letterSpacing:3, color:"#fff" },
  appSub:{ fontSize:9, color:"#ff4757", letterSpacing:4, textTransform:"uppercase" },
  hRight:{ display:"flex", alignItems:"center", gap:8, flexShrink:0 },
  liveTag:{ fontSize:10, fontWeight:700, color:"#ff4757", letterSpacing:1, animation:"pulse 2s ease-in-out infinite" },
  userBadge:{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,255,255,.06)", padding:"4px 9px", borderRadius:20, fontSize:16 },
  uname:{ color:"#aaa", fontSize:11, maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },

  // Desktop header nav
  headerNav:{ display:"flex", gap:4, flex:1, justifyContent:"center" },
  headerNavBtn:{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"transparent", border:"none", color:"#555", fontSize:13, fontWeight:600, cursor:"pointer", borderRadius:10, transition:"all .2s", position:"relative" },
  headerNavBtnActive:{ color:"#ff4757", background:"rgba(255,71,87,.1)" },
  headerNavDot:{ position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)", width:16, height:2, background:"#ff4757", borderRadius:1 },

  // Layout
  mainLayout:{ display:"flex", flex:1, position:"relative", zIndex:1 },
  mainLayoutDesktop:{ flexDirection:"row" },

  // Sidebar desktop
  sidebar:{ width:220, flexShrink:0, background:"rgba(255,255,255,.02)", borderRight:"1px solid rgba(255,255,255,.06)", padding:"20px 12px", display:"flex", flexDirection:"column", gap:4, height:"calc(100vh - 61px)", position:"sticky", top:61, overflowY:"auto" },
  sidebarTitle:{ fontSize:10, fontWeight:700, color:"#444", letterSpacing:2, textTransform:"uppercase", padding:"4px 10px", marginTop:4 },
  sidebarDivider:{ height:1, background:"rgba(255,255,255,.06)", margin:"8px 0" },
  sideNavBtn:{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"transparent", border:"none", color:"#555", fontSize:13, fontWeight:600, cursor:"pointer", borderRadius:10, transition:"all .2s", textAlign:"left", width:"100%", position:"relative" },
  sideNavBtnActive:{ color:"#ff4757", background:"rgba(255,71,87,.1)" },
  sideNavIndicator:{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:3, height:20, background:"#ff4757", borderRadius:2 },
  sideAdBox:{ marginTop:"auto", paddingTop:12 },

  // Content
  mainContent:{ flex:1, overflowY:"auto", paddingBottom:74 },
  mainContentDesktop:{ paddingBottom:0 },
  tab:{ padding:"20px", animation:"fadeIn .3s ease", maxWidth:900, margin:"0 auto", width:"100%" },

  secTitle:{ fontFamily:"'Rajdhani',sans-serif", fontSize:17, fontWeight:700, letterSpacing:2, marginBottom:12, color:"#fff", textTransform:"uppercase", display:"flex", alignItems:"center", gap:8 },

  // Refresh button
  refreshBtn:{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, color:"#888", padding:"4px 8px", fontSize:14, cursor:"pointer", transition:"all .2s" },

  // Loading
  loadingBox:{ display:"flex", flexDirection:"column", alignItems:"center", padding:"40px 20px", gap:12 },
  loadingSpinner:{ fontSize:36, animation:"spin 2s linear infinite" },
  loadingText:{ fontSize:13, color:"#ccc", textAlign:"center" },
  loadingSubtext:{ fontSize:11, color:"#555", textAlign:"center" },

  // Error
  errorBox:{ display:"flex", flexDirection:"column", alignItems:"center", padding:"30px 20px", gap:8 },
  retryBtn:{ background:"rgba(255,71,87,.2)", border:"1px solid rgba(255,71,87,.4)", borderRadius:8, color:"#ff4757", padding:"8px 20px", fontSize:12, fontWeight:700, cursor:"pointer" },

  // Sources
  sourcesBar:{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14, marginTop:-4 },
  srcChip:{ fontSize:9, fontWeight:700, color:"#555", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", padding:"3px 8px", borderRadius:10 },

  // News grids
  newsGrid:{ display:"flex", flexDirection:"column", gap:10 },
  newsGridDesktop:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  newsCard:{ background:"rgba(255,255,255,.04)", borderRadius:12, padding:14, cursor:"pointer", border:"1px solid rgba(255,255,255,.06)", transition:"background .2s" },
  newsTop:{ display:"flex", gap:10, alignItems:"flex-start" },
  newsEmoji:{ width:48, height:48, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 },
  newsBody:{ flex:1 },
  newsMeta:{ display:"flex", alignItems:"center", gap:5, marginBottom:4, flexWrap:"wrap" },
  newsCat:{ fontSize:9, fontWeight:700, letterSpacing:1 },
  newsTag:{ fontSize:8, fontWeight:700, padding:"2px 5px", borderRadius:3, color:"#000" },
  newsSource:{ fontSize:9, color:"#555", marginLeft:"auto", fontStyle:"italic" },
  newsTitle:{ fontSize:13, fontWeight:700, lineHeight:1.4, color:"#f0f0f8", marginBottom:3 },
  newsTime:{ fontSize:9, color:"#555" },
  expanded:{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,255,255,.05)", animation:"fadeIn .2s ease" },
  newsDesc:{ fontSize:12, color:"#999", lineHeight:1.6, marginBottom:10 },
  newsActions:{ display:"flex", gap:8, flexWrap:"wrap" },
  srcBtn:{ display:"inline-block", background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)", borderRadius:8, color:"#ccc", padding:"6px 12px", fontSize:11, fontWeight:600, cursor:"pointer", textDecoration:"none" },
  discBtn:{ background:"linear-gradient(135deg,#5352ed,#3742fa)", border:"none", borderRadius:8, color:"#fff", padding:"6px 12px", fontSize:11, fontWeight:700, cursor:"pointer" },

  premiumBox:{ background:"rgba(255,211,42,.05)", border:"1px solid rgba(255,211,42,.18)", borderRadius:12, padding:16, marginTop:16 },
  premiumTitle:{ fontSize:13, fontWeight:700, color:"#ffd32a", marginBottom:5 },
  premiumDesc:{ fontSize:11, color:"#888", lineHeight:1.5, marginBottom:10 },
  premiumBtn:{ background:"linear-gradient(135deg,#ffd32a,#ffa502)", border:"none", borderRadius:8, color:"#000", padding:"8px 18px", fontSize:12, fontWeight:800, cursor:"pointer" },

  // Ads
  adBanner:{ display:"block", borderRadius:12, border:"1px solid", padding:"10px 14px", position:"relative", overflow:"hidden" },
  adSponsored:{ position:"absolute", top:5, right:8, fontSize:8, color:"#555" },
  adInner:{ display:"flex", alignItems:"center", gap:12 },
  adIcon:{ width:38, height:38, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 },
  adBody:{ flex:1 },
  adLabel:{ fontSize:13, fontWeight:700 },
  adSub:{ fontSize:10, color:"#777", marginTop:1 },
  adCta:{ flexShrink:0, fontSize:10, fontWeight:800, color:"#000", padding:"6px 10px", borderRadius:6, whiteSpace:"nowrap" },

  // Explore
  filterRow:{ display:"flex", gap:8, marginBottom:14 },
  filterBtn:{ padding:"7px 18px", borderRadius:20, border:"1px solid rgba(255,255,255,.1)", background:"transparent", color:"#666", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .2s" },
  filterActive:{ background:"#ff4757", borderColor:"#ff4757", color:"#fff" },
  exploreGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  exploreGridDesktop:{ gridTemplateColumns:"repeat(3,1fr)" },
  exploreCard:{ background:"rgba(255,255,255,.04)", borderRadius:13, padding:14, border:"1px solid rgba(255,255,255,.06)", position:"relative", overflow:"hidden", display:"flex", flexDirection:"column", gap:6 },
  exploreEmoji:{ fontSize:30, lineHeight:1 },
  trendBadge:{ position:"absolute", top:8, right:8, fontSize:7, fontWeight:800, color:"#ff4757", background:"rgba(255,71,87,.14)", padding:"2px 5px", borderRadius:3 },
  exploreTitle:{ fontSize:14, fontWeight:700, color:"#fff", lineHeight:1.3 },
  exploreType:{ fontSize:9, color:"#5352ed", fontWeight:600 },
  exploreRow:{ display:"flex", justifyContent:"space-between", alignItems:"center" },
  genre:{ fontSize:9, color:"#777", background:"rgba(255,255,255,.06)", padding:"2px 7px", borderRadius:8 },
  score:{ fontSize:12, fontWeight:700, color:"#ffd32a" },
  exploreBtn:{ marginTop:4, background:"rgba(83,82,237,.16)", border:"1px solid rgba(83,82,237,.32)", borderRadius:7, color:"#a29bfe", padding:"6px 8px", fontSize:10, fontWeight:600, cursor:"pointer", width:"100%" },

  // Chat
  chatWrap:{ display:"flex", flexDirection:"column", animation:"fadeIn .3s ease" },
  roomsBar:{ display:"flex", overflowX:"auto", gap:6, padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.05)", scrollbarWidth:"none" },
  roomBtn:{ flexShrink:0, padding:"7px 14px", borderRadius:20, border:"1px solid rgba(255,255,255,.08)", background:"transparent", color:"#555", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", transition:"all .2s" },
  roomActive:{ background:"rgba(255,71,87,.14)", borderColor:"rgba(255,71,87,.38)", color:"#ff4757" },
  roomHeader:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,.04)" },
  roomName:{ fontSize:14, fontWeight:700, color:"#fff" },
  roomDesc:{ fontSize:10, color:"#555" },
  onlineTag:{ fontSize:10, color:"#2ed573", background:"rgba(46,213,115,.1)", padding:"3px 8px", borderRadius:10 },
  msgList:{ flex:1, overflowY:"auto", padding:"14px 16px", display:"flex", flexDirection:"column", gap:8 },
  emptyRoom:{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40 },
  sysMsg:{ fontSize:11, color:"#555", background:"rgba(255,255,255,.03)", padding:"4px 12px", borderRadius:12, textAlign:"center", alignSelf:"center" },
  msgRow:{ display:"flex", gap:8, alignItems:"flex-end" },
  msgRowMe:{ flexDirection:"row-reverse" },
  msgAva:{ fontSize:22, flexShrink:0, marginBottom:2 },
  bubble:{ padding:"9px 13px", borderRadius:14, maxWidth:"72%" },
  bubbleMe:{ background:"linear-gradient(135deg,#ff4757,#ff6b81)", borderBottomRightRadius:4 },
  bubbleOther:{ background:"rgba(255,255,255,.07)", borderBottomLeftRadius:4 },
  msgUser:{ fontSize:10, fontWeight:700, color:"#a29bfe", marginBottom:2 },
  msgTxt:{ fontSize:13, lineHeight:1.5, color:"#f0f0f8", wordBreak:"break-word" },
  msgTime:{ fontSize:9, color:"rgba(255,255,255,.3)", marginTop:3, textAlign:"right" },
  chatAdStrip:{ padding:"7px 16px", borderTop:"1px solid rgba(255,255,255,.04)", background:"rgba(255,255,255,.02)" },
  chatAdLink:{ display:"flex", alignItems:"center", gap:6, textDecoration:"none", fontSize:11, color:"#666" },
  chatAdCta:{ marginLeft:"auto", color:"#f47521", fontWeight:700, fontSize:11 },
  inputRow:{ display:"flex", gap:8, padding:"10px 14px", borderTop:"1px solid rgba(255,255,255,.06)", background:"rgba(8,8,14,.98)" },
  myAva:{ fontSize:22, flexShrink:0, display:"flex", alignItems:"center" },
  chatInput:{ flex:1, background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", borderRadius:12, padding:"10px 14px", color:"#fff", fontSize:13, outline:"none", fontFamily:"inherit" },
  sendBtn:{ background:"linear-gradient(135deg,#ff4757,#ff6b81)", border:"none", borderRadius:12, width:44, height:44, color:"#fff", fontSize:18, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" },

  // Setup
  setupOverlay:{ position:"fixed", inset:0, background:"rgba(8,8,14,.97)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, animation:"fadeIn .3s ease" },
  setupCard:{ background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.09)", borderRadius:20, padding:"28px 22px", maxWidth:340, width:"90%", animation:"slideUp .4s ease", textAlign:"center" },
  setupEmoji:{ fontSize:40, marginBottom:8 },
  setupTitle:{ fontFamily:"'Rajdhani',sans-serif", fontSize:24, fontWeight:700, color:"#fff", marginBottom:4 },
  setupSub:{ fontSize:12, color:"#666", marginBottom:18 },
  avatarGrid:{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8, marginBottom:18 },
  avatarBtn:{ fontSize:24, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:"8px 5px", cursor:"pointer", transition:"all .2s" },
  avatarActive:{ background:"rgba(255,71,87,.2)", border:"1px solid rgba(255,71,87,.5)" },
  setupInput:{ width:"100%", background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", borderRadius:12, padding:"12px 14px", color:"#fff", fontSize:13, outline:"none", fontFamily:"inherit", marginBottom:14, textAlign:"left" },
  setupBtn:{ width:"100%", background:"linear-gradient(135deg,#ff4757,#ff6b81)", border:"none", borderRadius:12, color:"#fff", padding:"13px", fontSize:14, fontWeight:700, cursor:"pointer" },
  setupNote:{ fontSize:10, color:"#555", marginTop:12, lineHeight:1.4 },

  // Shop
  affiliateNote:{ fontSize:11, color:"#888", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:8, padding:"8px 12px", marginBottom:14, lineHeight:1.5 },
  shopGrid:{ display:"flex", flexDirection:"column", gap:12 },
  shopGridDesktop:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, flexDirection:"unset" },
  shopCard:{ background:"rgba(255,255,255,.04)", borderRadius:12, padding:14, border:"1px solid rgba(255,255,255,.06)", position:"relative" },
  shopSponsored:{ border:"1px solid rgba(255,211,42,.22)", background:"rgba(255,211,42,.025)" },
  sponsoTag:{ position:"absolute", top:8, right:8, fontSize:8, fontWeight:800, color:"#ffd32a", background:"rgba(255,211,42,.12)", padding:"2px 6px", borderRadius:4 },
  shopTop:{ display:"flex", alignItems:"center", gap:12, marginBottom:10 },
  shopEmoji:{ fontSize:28, flexShrink:0 },
  shopInfo:{ flex:1 },
  shopBadge:{ fontSize:8, fontWeight:800, color:"#ff4757", background:"rgba(255,71,87,.12)", padding:"2px 6px", borderRadius:4 },
  shopName:{ fontSize:12, fontWeight:700, color:"#f0f0f8", marginTop:3, lineHeight:1.3 },
  shopStore:{ fontSize:10, color:"#666", marginTop:2 },
  shopPrice:{ fontSize:18, fontWeight:800, color:"#ff4757", fontFamily:"'Rajdhani',sans-serif", flexShrink:0 },
  shopLink:{ display:"block", textAlign:"center", background:"rgba(255,211,42,.07)", border:"1px solid rgba(255,211,42,.22)", borderRadius:8, color:"#ffd32a", padding:"8px", fontSize:11, fontWeight:700, textDecoration:"none" },

  // Bottom nav (mobile)
  bottomNav:{ position:"fixed", bottom:0, left:0, right:0, display:"flex", background:"rgba(8,8,14,.97)", borderTop:"1px solid rgba(255,71,87,.16)", backdropFilter:"blur(20px)", zIndex:100 },
  navBtn:{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"9px 4px 10px", background:"transparent", border:"none", cursor:"pointer", color:"#3a3a4a", position:"relative", transition:"color .2s" },
  navActive:{ color:"#ff4757" },
  navIcon:{ fontSize:20 },
  navLabel:{ fontSize:9, fontWeight:600, letterSpacing:.3 },
  navDot:{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:20, height:2, background:"linear-gradient(90deg,#ff4757,#ff6b81)", borderRadius:1 },
}
