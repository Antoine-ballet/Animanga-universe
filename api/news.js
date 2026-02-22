// api/news.js — Fonction Vercel serverless pour les actualités

// News de secours si l'API ne répond pas
const FALLBACK_NEWS = [
  { id:1, category:"ANIME", tag:"DISPO",   title:"Baki-Dou : Le Samouraï Invincible sur Netflix",          desc:"La suite de la saga Baki est disponible sur Netflix. 13 épisodes où Miyamoto Musashi est ressuscité pour affronter Baki Hanma dans une arène à 364m sous Tokyo.", img:"⚔️", color:"#ff4757", time:"Récent", hot:true,  source:"Manga-News",        url:"https://www.manga-news.com" },
  { id:2, category:"ANIME", tag:"VF",      title:"One Punch Man S3 — VF disponible sur Crunchyroll",        desc:"Les 12 épisodes de la saison 3 sont doublés en français sur Crunchyroll. La partie 2 est confirmée pour 2027.",                                                  img:"👊", color:"#ffa502", time:"Récent", hot:true,  source:"AnimOtaku",         url:"https://animotaku.fr" },
  { id:3, category:"ANIME", tag:"TRAILER", title:"Sound! Euphonium — The Final Movie : trailer dévoilé",    desc:"Kyoto Animation dévoile le trailer du film final. Sortie le 24 avril 2026 dans 200 salles au Japon.",                                                         img:"🎺", color:"#5352ed", time:"Récent", hot:false, source:"Anime News Network", url:"https://www.animenewsnetwork.com" },
  { id:4, category:"ANIME", tag:"ANNONCE", title:"ufotable annonce le film Mahōtsukai no Yoru",              desc:"ufotable confirme l'adaptation du visual novel de Type-Moon. Des projets Demon Slayer et Tales of sont aussi annoncés.",                                       img:"🔮", color:"#2ed573", time:"Récent", hot:true,  source:"Anime News Network", url:"https://www.animenewsnetwork.com" },
  { id:5, category:"MANGA", tag:"RECORD",  title:"Ichi the Witch (Ki-oon) : lancement record en France",    desc:"Sorti en France en 2025, Ichi the Witch dépasse toutes les attentes. Une adaptation anime par Cygames Pictures est en production.",                            img:"🧙", color:"#00d2d3", time:"Récent", hot:false, source:"Manga-News",        url:"https://www.manga-news.com" },
  { id:6, category:"ANIME", tag:"DATE",    title:"The Villager of Level 999 : sortie Juillet 2026",          desc:"L'anime de LV999 no Murabito arrive en juillet 2026 sur Crunchyroll. Studio Brains Base aux commandes.",                                                       img:"🏰", color:"#ff6b81", time:"Récent", hot:false, source:"Adala-News",        url:"https://adala-news.fr" },
  { id:7, category:"ANIME", tag:"STAFF",   title:"Toaru Anbu no Item : staff révélé pour 2026",              desc:"Le spinoff A Certain Magical Index dévoile son staff avec Tatsuyuki Nagai à la réalisation chez J.C. Staff.",                                               img:"⚡", color:"#eccc68", time:"Récent", hot:false, source:"Anime News Network", url:"https://www.animenewsnetwork.com" },
  { id:8, category:"MANGA", tag:"NOUVEAU", title:"Retrouvez toutes les actus sur Anime News Network",        desc:"Pour les dernières informations anime et manga en temps réel, consultez directement les sources officielles.",                                                  img:"📰", color:"#a29bfe", time:"Récent", hot:false, source:"Anime News Network", url:"https://www.animenewsnetwork.com" },
]

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()

  const apiKey = process.env.ANTHROPIC_API_KEY

  // Pas de clé API → retourner les news de secours
  if (!apiKey) {
    console.log("Pas de clé API — utilisation des news de secours")
    return res.status(200).json({ news: FALLBACK_NEWS, updatedAt: Date.now(), source: "fallback" })
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric"
  })

  try {
    console.log("Appel API Anthropic pour les news...")

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `Tu es un agrégateur d'actualités anime et manga. Aujourd'hui : ${today}.
Cherche les dernières actualités anime/manga et réponds UNIQUEMENT avec un tableau JSON valide.
Aucun texte avant ou après. Aucune balise markdown. Juste le JSON pur.
Exemple de format :
[{"id":1,"category":"ANIME","tag":"NOUVEAU","title":"titre","desc":"description","img":"🎬","color":"#ff4757","time":"Aujourd'hui","hot":true,"source":"Anime News Network","url":"https://www.animenewsnetwork.com"}]`,
        messages: [{
          role: "user",
          content: "Cherche 8 actualités récentes anime et manga. Retourne uniquement le tableau JSON, rien d'autre."
        }]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error("Erreur API HTTP:", response.status, errText)
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log("Réponse API reçue, nombre de blocs:", data.content?.length)

    // Extraire tout le texte de la réponse
    let text = ""
    if (data.content) {
      for (const block of data.content) {
        if (block.type === "text") text += block.text
      }
    }

    console.log("Texte extrait (100 premiers chars):", text.slice(0, 100))

    if (!text.trim()) {
      throw new Error("Réponse vide de l'API")
    }

    // Nettoyer le JSON — enlever tout ce qui n'est pas entre [ et ]
    const start = text.indexOf("[")
    const end   = text.lastIndexOf("]")

    if (start === -1 || end === -1) {
      console.error("Pas de tableau JSON trouvé dans:", text.slice(0, 200))
      throw new Error("Pas de JSON valide dans la réponse")
    }

    const jsonStr = text.slice(start, end + 1)
    const parsed  = JSON.parse(jsonStr)

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("JSON vide ou invalide")
    }

    console.log("News chargées avec succès:", parsed.length, "articles")
    return res.status(200).json({ news: parsed, updatedAt: Date.now(), source: "api" })

  } catch (error) {
    console.error("Erreur lors du chargement des news:", error.message)
    // En cas d'erreur → retourner les news de secours plutôt qu'une erreur
    return res.status(200).json({
      news: FALLBACK_NEWS,
      updatedAt: Date.now(),
      source: "fallback",
      warning: error.message
    })
  }
}
