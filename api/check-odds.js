import axios from 'axios';

export default async function handler(req, res) {
  const API_KEY = process.env.ODDS_API_KEY;
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  const sports = ['basketball_nba', 'soccer_france_ligue_1'];

  try {
    let allAlerts = [];

    for (const sport of sports) {
      const response = await axios.get(`https://api.the-odds-api.com/v4/sports/${sport}/odds/`, {
        params: { apiKey: API_KEY, regions: 'eu', markets: 'h2h' }
      });

      response.data.forEach(match => {
        const bookmakers = match.bookmakers;
        if (bookmakers.length < 2) return;

        const odds = bookmakers.map(b => b.markets[0].outcomes[0].price);
        const maxOdd = Math.max(...odds);
        const avgOdd = odds.reduce((a, b) => a + b, 0) / odds.length;

        // Détection de faille (Cote 10% au dessus de la moyenne)
        if (maxOdd > avgOdd * 1.10) {
          allAlerts.push(`🎯 **Opportunité ${sport === 'basketball_nba' ? 'NBA' : 'Ligue 1'}**\n⚽ Match: ${match.home_team} vs ${match.away_team}\n📈 Cote Max: ${maxOdd}\n📊 Moyenne: ${avgOdd.toFixed(2)}`);
        }
      });
    }

    if (allAlerts.length > 0) {
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: `🛡️ **SHADO SCANNER REPORT** 🇨🇮\n\n${allAlerts.join('\n\n')}\n\n*Dédicace à NDIAYE ADAMA TECHN*`,
        parse_mode: 'Markdown'
      });
    }

    res.status(200).send('Scan terminé avec succès.');
  } catch (error) {
    res.status(500).send('Erreur scan: ' + error.message);
  }
}
