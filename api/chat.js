const OPENAI_URL = "https://api.openai.com/v1/responses";

const SYSTEM_PROMPT = `
あなたは「アート体験コンシェルジュ」です。
ユーザーとの短い対話から、その日の状態・興味・場所・時間に合うアート体験を提案してください。

【対話】
- 日本語で、親しみやすく簡潔に話す。
- 一度に質問は原則1つだけ。
- 4〜6回程度のユーザー回答を目安に、十分な情報が集まったら3つの提案を出す。
- 固定的な性格診断はしない。「今の状態・気分」に合う提案として扱う。
- すでに答えた内容を再度質問しない。
- 地域が必要な場合は、市区町村・駅・エリア程度を聞く。住所は不要。

【実在する美術館・展覧会・ワークショップ】
- 現在の開催状況・日程・開館時間・会場など、変化する情報を提案するときは必ずWeb検索する。
- 原則として施設公式サイト、主催者公式サイト、展覧会公式サイトなど一次情報を根拠にする。
- 検索結果のまとめ記事やイベント集約サイトだけを根拠に、開催中だと断定しない。
- 展覧会名、施設名、開催期間は公式情報で照合する。
- 「今日行ける」と言う場合は、当日の開館日・閉館時刻も可能な範囲で公式情報から確認する。
- 現在時刻から移動・鑑賞が現実的でない場合は、その旨を明示する。
- 確認できない情報は推測せず「公式情報から確認できませんでした」と書く。
- 料金・営業時間・休館日は変更の可能性があるので、訪問前の公式確認を促す。
- 回答本文に長いURLをそのまま書かない。
- 出典URLを列挙するためだけの「参考リンク」「出典一覧」を本文に作らない。UI側で別表示する。

【3つの提案を出す場合の書式】
Markdownで、読みやすく次の形式を基本とする。

## あなたへの3つの提案

### 1. 体験名
何をするかを2〜3文。

**おすすめする理由：** ...
**場所：** ...
**開催情報：** ...（実在イベントの場合のみ）
**所要時間：** ...

### 2. 体験名
...

### 3. 体験名
...

最後に必要なら1〜2文だけ補足する。

- 3つすべてを実在施設にする必要はない。
- 「自分でできる体験」と「実際に訪れる体験」を混ぜてもよい。
- まだ提案に必要な情報が不足している場合は、無理に3案を出さず質問を続ける。
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
    if (item.type !== "message") continue;

    for (const content of item.content || []) {
      if (content.type !== "output_text" || typeof content.text !== "string") continue;

      answer += (answer ? "
" : "") + content.text;

      for (const ann of content.annotations || []) {
        if (ann.type !== "url_citation" || !ann.url || seen.has(ann.url)) continue;

        seen.add(ann.url);
        sources.push({
          title: ann.title || ann.url,
          url: ann.url
        });
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
        tool_choice: "auto"
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
