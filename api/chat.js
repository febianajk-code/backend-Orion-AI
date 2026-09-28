export default async function handler(req, res) {
    // Izinkan akses CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages } = req.body;
        if (!messages || messages.length === 0) {
            return res.status(400).json({ error: 'Messages are required' });
        }

        const lastMessage = messages[messages.length - 1].content;

        // 1. Pencarian real-time via Tavily API
        const tavilyRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: "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",
                query: lastMessage,
                search_depth: "basic",
                max_results: 3
            })
        });

        const tavilyData = await tavilyRes.json();
        let searchContext = "";
        if (tavilyData && tavilyData.results) {
            searchContext = tavilyData.results.map(r => `Sumber URL: ${r.url}\nKonten: ${r.content}`).join("\n\n");
        }

        // 2. System prompt dengan hasil pencarian
        const systemPrompt = `Kamu adalah Orion AI, asisten pintar dengan pencarian internet.
Hasil pencarian web terbaru:
${searchContext}

Aturan: Gunakan informasi di atas agar akurat, informatif, dan jangan mengarang fakta.`;

        const apiMessages = [
            { role: "system", content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content }))
        ];

        // 3. Kirim ke OpenRouter (Menggunakan API Key Terbaru)
        const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
      headers: {
                'Authorization': 'Bearer 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',
                'HTTP-Referer': 'https://orion-ai.vercel.app',
                'X-Title': 'Orion AI',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "openrouter/free",
                max_tokens: 800,
                messages: apiMessages
            })
        });

        const data = await openRouterRes.json();
        return res.status(200).json(data);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
