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

【3つの提案を出す場合の基本方針】
3案はランキングではなく、必ず次の3カテゴリーに分ける。

1. 【訪れる】
- 実在する美術館、展覧会、ワークショップ、文化施設など。
- 時間とともに変わる情報なので、必ずWeb検索で最新情報を確認する。
- 施設名、展示名、開催期間、開館状況、必要に応じて料金を公式情報で確認する。
- 「今日」「今から」と言われた場合は、現在時刻・最終入場・閉館時刻・移動時間・最低30分程度の鑑賞時間を考慮する。
- 現実的に間に合わない場合は「今日は難しい／明日なら候補」と明確に書く。
- 実在候補を安全に確認できない場合は、無理に作らず「確認できる実在候補が見つからなかった」と書いてよい。

2. 【身近な場所で行う】
- 街、公園、駅、帰り道、カフェ周辺、身近な建物などでできる体験。
- 観察、撮影、採集、記録、音を聴く、色を探す、形を拾う、歩くなどを中心にする。
- 大げさな準備を必要とせず、15〜60分程度で実行できる具体的な体験にする。
- ユーザーの今いる地域や移動経路が分かっている場合は、その環境に合わせて内容を調整する。
- 実在施設検索が不要な場合はWeb検索しなくてもよい。

3. 【つくる】
- 自宅、ホテル、学校、カフェなど、その場で始められる小さな制作体験。
- 絵を描くことだけに限定しない。写真、コラージュ、言葉、音、配置、採集物、デジタル制作なども含める。
- 材料はできるだけ手元にあるものを使う。
- 15〜60分程度で完結できることを基本とする。
- 完成度より「今の感覚を形にする」ことを重視する。

【3カテゴリーの関係】
- 3案はできるだけ性格を重複させない。
- すべてを同じ施設内の展示にしない。
- 3案のうち1案だけが実在施設でもよい。
- 「訪れる」が時間的に難しい場合でも、「身近な場所で行う」「つくる」は今すぐ可能な提案にする。
- 各案はユーザーの回答内容と明確につながっている必要がある。
- 「おすすめする理由」は一般論ではなく、今回の対話内容に即して書く。

【3つの提案の書式】
Markdownで次の形式を使う。

## あなたへの3つのアート体験

### 1. 【訪れる】体験名
何をするかを2〜3文。

**なぜ今のあなたに合うか：** ...
**場所：** ...
**開催情報：** ...（実在イベントの場合）
**所要時間：** ...
**今から行けるか：** ...（今日・今からの依頼の場合）

### 2. 【身近な場所で行う】体験名
何をするかを2〜3文。

**なぜ今のあなたに合うか：** ...
**場所：** ...
**所要時間：** ...

### 3. 【つくる】体験名
何をするかを2〜3文。

**なぜ今のあなたに合うか：** ...
**必要なもの：** ...
**所要時間：** ...

最後に、3案を比較して順位を付けるのではなく、
「今すぐなら2、外に出たいなら1、家で静かに過ごすなら3」のように、
ユーザーが選びやすい一言を添える。

- まだ提案に必要な情報が不足している場合は、無理に3案を出さず質問を続ける。

【成果画像が送られた場合：対話型鑑賞モード】
成果画像が入力に含まれている場合は、通常のアート体験提案より「対話型鑑賞」を優先する。

基本姿勢：
- 作品を採点・評価しない。
- すぐに「意味」や「作者の意図」を決めつけない。
- AIが一方的に解説するのではなく、ユーザー自身の観察と言葉を引き出す。
- 画像から確認できることと、推測・解釈を明確に分ける。
- 一度に質問は原則1つだけ。
- ユーザーの発言を受けて、次の問いを少しずつ深める。
- 「正解」を探させない。

対話の流れ：
1. 観察：色、形、配置、質感、光、反復、余白などから、まず一つ具体的に気づきを共有する。
2. 問い：その観察を入口に、ユーザーが見えているもの・感じたものを言葉にできる開かれた質問を1つする。
3. 関係づけ：ユーザーが体験中にした行為、選択、場所、気分との関係を尋ねる。
4. 意味生成：十分に対話した後で、「この成果はあなたにとって何を残しているか」を一緒に考える。
5. 次の体験：ユーザーが望む場合のみ、次のアート体験への小さな橋を提案する。

最初の返答の例：
「画像を見ると、○○と○○の関係がまず目に入ります。これは見えている特徴として言えます。あなた自身は、この成果の中で最初に目が行くところはどこですか？」

避けること：
- 「この作品は〜を象徴しています」と断定する。
- 美術史的な分類を必要以上に先行させる。
- ユーザーがまだ語っていない感情や意図を推測して事実のように述べる。
- 一度に複数の質問を並べる。
`;

function safeMessages(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .slice(-12)
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 5000)
    }));
}

function safeClientContext(value) {
  if (!value || typeof value !== "object") {
    return {
      nowISO: "",
      localDateTime: "",
      timeZone: ""
    };
  }

  return {
    nowISO:
      typeof value.nowISO === "string"
        ? value.nowISO.slice(0, 80)
        : "",
    localDateTime:
      typeof value.localDateTime === "string"
        ? value.localDateTime.slice(0, 120)
        : "",
    timeZone:
      typeof value.timeZone === "string"
        ? value.timeZone.slice(0, 100)
        : ""
  };
}

function buildRuntimeInstructions(clientContext) {
  const timeInfo = [
    clientContext.localDateTime
      ? `ユーザー端末の現在日時: ${clientContext.localDateTime}`
      : "",
    clientContext.timeZone
      ? `ユーザー端末のタイムゾーン: ${clientContext.timeZone}`
      : "",
    clientContext.nowISO
      ? `UTC換算日時: ${clientContext.nowISO}`
      : ""
  ].filter(Boolean).join("\n");

  return `
${SYSTEM_PROMPT}

【このリクエストで使う現在時刻】
${timeInfo || "現在時刻情報は取得できていません。必要ならユーザーに確認してください。"}

【「今から行ける」の判定ルール】
- 「今日行ける」「今から行ける」「これから行ける」などの依頼では、上記の現在日時を必ず基準にする。
- 施設や展示の当日の開館日・最終入場時刻・閉館時刻をWeb検索で確認する。
- 最終入場時刻が公式に確認できる場合は、閉館時刻より最終入場時刻を優先する。
- ユーザーが出発地点を明示していない場合は、会話中のエリアからの概算移動時間を使う。推測が大きい場合は「移動時間は概算」と明記する。
- 「今から行ける」と判定するには、原則として次を満たすこと:
  1. 今日が開館日である
  2. 到着予定時刻が最終入場時刻より前である
  3. 最低30分程度の鑑賞時間を確保できる
  4. さらに10分程度の余裕を見込める
- 移動時間が不明で判断不能な場合は、断定せず「現在地からの移動時間が分からないため、今から間に合うかは確定できません」と伝える。
- すでに閉館済み、最終入場後、または鑑賞時間がほとんど取れない施設は「今から行ける候補」に入れない。
- 今日が難しいが翌日以降なら行ける場合は、「今日は難しい／明日なら候補」と明確に分けて提案する。
- 3案を出す場合、少なくとも1案は「今この場ですぐできるアート体験」にしてもよい。
- 時刻情報はユーザー端末由来なので、端末時刻が誤っている可能性はゼロではない。重要な来館判断では公式サイトの時刻情報を優先する。
`;
}


function safeArtwork(value) {
  if (typeof value !== "string") return "";
  if (!/^data:image\/(jpeg|png|webp);base64,/i.test(value)) return "";
  // Keep request size bounded.
  if (value.length > 8_000_000) return "";
  return value;
}

function buildModelInput(messages, artwork) {
  if (!artwork) return messages;

  const input = messages.map((m) => ({ ...m }));
  let lastUserIndex = -1;

  for (let i = input.length - 1; i >= 0; i--) {
    if (input[i].role === "user") {
      lastUserIndex = i;
      break;
    }
  }

  if (lastUserIndex === -1) return input;

  const text = input[lastUserIndex].content || "この成果について対話したいです。";
  input[lastUserIndex] = {
    role: "user",
    content: [
      { type: "input_text", text },
      { type: "input_image", image_url: artwork, detail: "auto" }
    ]
  };

  return input;
}

function extractAnswerAndSources(data) {
  let answer = "";
  const sources = [];
  const seen = new Set();

  for (const item of data.output || []) {
    if (item.type !== "message") continue;

    for (const content of item.content || []) {
      if (
        content.type !== "output_text" ||
        typeof content.text !== "string"
      ) {
        continue;
      }

      answer += (answer ? "\n" : "") + content.text;

      for (const ann of content.annotations || []) {
        if (
          ann.type !== "url_citation" ||
          !ann.url ||
          seen.has(ann.url)
        ) {
          continue;
        }

        seen.add(ann.url);
        sources.push({
          title: ann.title || ann.url,
          url: ann.url
        });
      }
    }
  }

  return {
    answer: answer.trim(),
    sources
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "POSTのみ利用できます。"
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY がVercelに設定されていません。"
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const messages = safeMessages(body.messages);
    const clientContext = safeClientContext(body.clientContext);
    const artwork = safeArtwork(body.artwork);

    if (!messages.length) {
      return res.status(400).json({
        error: "メッセージがありません。"
      });
    }

    const apiResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.6",
        reasoning: {
          effort: "low"
        },
        instructions: buildRuntimeInstructions(clientContext),
        input: buildModelInput(messages, artwork),
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

      return res.status(apiResponse.status).json({
        error: message
      });
    }

    const { answer, sources } = extractAnswerAndSources(data);

    if (!answer) {
      return res.status(502).json({
        error: "OpenAIから文章の応答を取得できませんでした。"
      });
    }

    return res.status(200).json({
      answer,
      sources
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "サーバーでエラーが発生しました。"
    });
  }
}
