const OPENAI_URL = "https://api.openai.com/v1/responses";

const SYSTEM_PROMPT = `
あなたは「アート体験コンシェルジュ」です。
ユーザーと短く自然に対話し、その日の状態・興味・場所・時間に合うアート体験を提案してください。

【対話の方針】
- 日本語で、親しみやすく簡潔に話す。
- 一度に質問は原則1つだけ。
- 4〜6回程度のユーザー回答を目安に、十分な情報が集まったら3つの提案を出す。
- 固定的な性格診断はしない。「今の状態・気分」に合う提案として扱う。
- すでにユーザーが答えたことを重ねて質問しない。
- 地域が必要なときは、市区町村・駅・エリア程度を聞く。住所は不要。
- 実在施設だけでなく、自宅・街・公園などでできる小さな創作体験も候補にできる。

【実在する美術館・展覧会・ワークショップ】
- 現在の開催状況、開館情報、日程、会場など、時間とともに変わる情報を提案する場合は必ずWeb検索を使う。
- 可能な限り、施設公式サイト、主催者公式サイト、展覧会公式サイトなど一次情報を優先する。
- 開催中・開催予定であることを確認できない情報を断定しない。
- 営業時間・休館日・料金は変更される可能性があるので、必要なら「訪問前に公式情報を確認してください」と添える。
- 実在情報を使った場合は、回答本文でもどの情報を根拠にしたか分かるように書く。
- 確認できなければ「公式情報から確認できませんでした」と明示する。

【3つの提案を出すとき】
各提案を次のように整理する。
1. 体験名
2. 何をするか（2〜4文）
3. なぜ今のユーザーに合うか
4. 実在施設なら、施設名・展覧会/イベント名・開催情報
5. 所要時間の目安

3つすべてを実在施設にする必要はない。
「自分でできる体験」と「実際に訪れる体験」を混ぜるとよい。
`;

function safeMessages(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map(m => ({ role: m.role, content: m.content.slice(0, 5000) }));
}

function extractAnswerAndSources(data) {
  let answer = "";
  const sources = [];
  const seen = new Set();

  for (const item of data.output || []) {
    if (item.type === "message") {
      for (const content of item.content || []) {
        if (content.type === "output_text" && typeof content.text === "string") {
          answer += (answer ? "\n" : "") + content.text;

          for (const ann of content.annotations || []) {
            if (ann.type === "url_citation" && ann.url && !seen.has(ann.url)) {
              seen.add(ann.url);
              sources.push({
                title: ann.title || ann.url,
                url: ann.url
              });
            }
          }
        }
      }
    }

    if (item.type === "web_search_call") {
      const actionSources = item.action?.sources || [];
      for (const s of actionSources) {
        const url = s.url;
        if (url && !seen.has(url)) {
          seen.add(url);
          sources.push({
            title: s.title || url,
            url
          });
        }
      }
    }
  }

  return { answer: answer.trim(), sources };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POSTのみ利用できます。" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY がVercelに設定されていません。"
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const messages = safeMessages(body.messages);

    if (!messages.length) {
      return res.status(400).json({ error: "メッセージがありません。" });
    }

    const apiResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.6",
        reasoning: { effort: "low" },
        instructions: SYSTEM_PROMPT,
        input: messages,
        tools: [
          {
            type: "web_search",
            search_context_size: "medium"
          }
        ],
        tool_choice: "auto",
        include: ["web_search_call.action.sources"]
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("OpenAI API error:", data);
      const message =
        data?.error?.message ||
        "OpenAI APIへの接続に失敗しました。";
      return res.status(apiResponse.status).json({ error: message });
    }

    const { answer, sources } = extractAnswerAndSources(data);

    if (!answer) {
      return res.status(502).json({
        error: "OpenAIから文章の応答を取得できませんでした。"
      });
    }

    return res.status(200).json({ answer, sources });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "サーバーでエラーが発生しました。"
    });
  }
}
