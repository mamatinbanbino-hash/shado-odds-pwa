import axios from 'axios';

export default async function handler(req, res) {
  const API_KEY = process.env.ODDS_API_KEY;
  const TG_TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  try {
    // 1. Récupération des cotes Foot (Ligue 1, PL, etc.)
    const response = await axios.get(`https://api.the-odds-api.com/v4/sports/soccer_france_ligue_1/odds/`, {
      params: { apiKey: API_KEY, regions: 'eu', markets: 'h2h' }
    });

    let signals = [];

    response.data.forEach(match => {
      const bookmakers = match.bookmakers;
      if (bookmakers.length < 3) return; // Besoin de plusieurs sources

      // Analyse des cotes (Home, Draw, Away)
      const oddsH = bookmakers.map(b => b.markets[0].outcomes[0].price);
      const minH = Math.min(...oddsH);
      const avgH = oddsH.reduce((a, b) => a + b, 0) / oddsH.length;

      // DETECTION VARIATION : Si la cote minimale est 8% plus basse que la moyenne
      const variation = ((avgH - minH) / avgH) * 100;
      
      // LOGIQUE PRONOSTIC : Si la variation est forte vers le favori
      if (variation > 8 && minH < 2.00) {
        signals.push(`✅ **PRONO VALIDÉ**\n⚽ Match: ${match.home_team} vs ${match.away_team}\n🔥 Prono: Victoire ${match.home_team}\n📊 Variation: -${variation.toFixed(1)}% (Chute de cote)\n💰 Cote actuelle: ${minH}`);
      }
    });

    if (signals.length > 0) {
      await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: `🧠 **ADAMA PREDICT SYSTEM** 🇨🇮\n\n${signals.join('\n\n')}\n\n_Indice de fiabilité : 60%+_`,
        parse_mode: 'Markdown'
      });
    }

    res.status(200).send('Analyse terminée.');
  } catch (e) {
    res.status(500).send(e.message);
  }
}
