// api/news.js — Fonction Vercel serverless
// Cette fonction tourne côté serveur, la clé API est donc sécurisée

export default async function handler(req, res) {
  // Autoriser les requêtes depuis ton site
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: "Clé API manquante dans les variables d'environnement Vercel" })
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric"
  })

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `Tu es un agrégateur d'actualités anime et manga.
Aujourd'hui nous sommes le ${today}.
Cherche les 8 dernières actualités anime/manga sur le web.
Sources à consulter : animenewsnetwork.com, manga-news.com, adala-news.fr, animotaku.fr, crunchyroll.com.
Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après, sans balises markdown.
Format exact :
[
  {
    "id": 1,
    "category": "ANIME" ou "MANGA" ou "INDUSTRIE",
    "tag": "NOUVEAU" ou "TRAILER" ou "DATE" ou "VF" ou "ANNONCE" ou "DISPO" ou "RECORD" ou "STAFF" ou "FIN",
    "title": "titre court de l'actu",
    "desc": "description de 2-3 phrases",
    "img": "un emoji pertinent",
    "color": "une couleur hex parmi #ff4757 #ffa502 #5352ed #2ed573 #00d2d3 #ff6b81 #eccc68",
    "time": "Aujourd'hui" ou "Il y a Xh" ou "Il y a Xj",
    "hot": true ou false,
    "source": "nom de la source",
    "url": "URL exacte de l'article"
  }
]`,
        messages: [{
          role: "user",
          content: "Cherche les 8 dernières actualités anime et manga du moment et retourne uniquement le JSON."
        }]
      })
    })

    const data = await response.json()

    // Extraire le texte JSON de la réponse
    let text = ""
    if (data.content) {
      for (const block of data.content) {
        if (block.type === "text") text += block.text
      }
    }

    // Nettoyer et parser
    const clean = text.replace(/```json|```/g, "").trim()
    const news = JSON.parse(clean)

    return res.status(200).json({ news, updatedAt: Date.now() })

  } catch (error) {
    console.error("Erreur API news:", error)
    return res.status(500).json({ error: error.message })
  }
}
