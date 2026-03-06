import { useState, useRef, useEffect, useCallback } from "react";

// ── Constants ────────────────────────────────────────────────────────
const CHAR_NAMES = ["林靜儀","謝思涵","陳宥霖","謝思語","葉若晴","吳建廷","蕭凱翔","許雅芳","段師傅","孟芸蓁"];
const TIME_MAX         = 20;
const TIME_RECOVER_CAP = 14;
const SAVE_KEY         = "ghost-gun-save-v1";

// ── Storage helpers ──────────────────────────────────────────────────
const saveGame = async (data) => {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
};
const loadGame = async () => {
  try {
    const r = localStorage.getItem(SAVE_KEY);
    return r ? JSON.parse(r) : null;
  } catch { return null; }
};
const clearSave = async () => {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
};

// ── Name highlight ───────────────────────────────────────────────────
function NarrativeText({ text, playerName }) {
  const allNames = playerName ? [playerName, ...CHAR_NAMES] : CHAR_NAMES;
  const escaped  = allNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern  = new RegExp(`(${escaped.join("|")})`, "g");
  const parts    = text.split(pattern);
  return (
    <div style={{ fontSize: 14, lineHeight: 2.1, color: "#bca878", whiteSpace: "pre-wrap" }}>
      {parts.map((p, i) =>
        allNames.includes(p)
          ? <span key={i} style={{ color: "#c8a855", fontWeight: "bold" }}>{p}</span>
          : <span key={i}>{p}</span>
      )}
    </div>
  );
}

// ── Strip chapter markers ────────────────────────────────────────────
const stripMarkers = (text) =>
  text
    .replace(/^(Prologue|Epilogue|Chapter\s*\d+[^\n]*)\n?/gim, "")
    .replace(/^第[一二三四五六七八九十\d]+[幕章起][^\n]*\n?/gim, "")
    .replace(/^={3,}\s*\n?/gm, "")
    .replace(/^\s*\n/gm, "\n")
    .trim();

// ── State prompt builder ─────────────────────────────────────────────
const buildStatePrompt = (state) => {
  if (!state) return "";
  return `
【當前局面狀態——每次回應必須反映以下限制】
身份：${state.identity}
知情者：${state.aware.length > 0 ? state.aware.join("、") : "無"}
限制：${state.restrictions.length > 0 ? state.restrictions.join("；") : "無"}
局面：${state.situation}
`;
};

// ── System prompt ────────────────────────────────────────────────────
const buildSystemPrompt = (playerName, state) => `你是《Ghost Gun》互動推理小說的遊戲主持人（GM）。玩家扮演便衣警員【${playerName}】，從婚禮彩排晚宴開始，逐步揭開一連串槍擊命案的真相。
${state ? buildStatePrompt(state) : ""}
【故事場景——必須嚴格遵守】
所有事件發生在謝思涵位於山區的私人莊園宅邸，包含：宴會廳、廚房（有後門通往戶外）、地下室酒窖、二樓新娘房、各樓走廊。任何場景描述都不得偏離這棟宅邸的範圍。

【角色名單】
- ${playerName}：便衣男警員，玩家，以新郎「童年好友」伴郎身份臥底
- 林靜儀：便衣女警員，以造型師團隊成員身份臥底，第三伴娘
- 謝思涵：知名女演員，新娘，【最終揭露：本案真正主謀】
- 陳宥霖：新興餐飲創業家，新郎，【揭露：以為自己是主謀，實為謝思涵設計殺害的目標】
- 謝思語：謝思涵的妹妹兼經紀人，首席伴娘，【揭露：整起事件的幕後設計者，戲劇系編劇背景】
- 葉若晴：女演員，謝思涵的演藝圈好友，第二伴娘，【揭露：第一起槍擊的執行者，曾被吳建廷潛規則】
- 吳建廷：知名導演，首席伴郎，介紹謝思涵與陳宥霖認識，【命運：第一起槍擊死者】
- 蕭凱翔：陳宥霖的創業夥伴，第二伴郎
- 許雅芳：謝思涵的御用造型師，第三伴娘（被迫下海）
- 段師傅：婚宴主廚，脾氣不好
- 孟芸蓁：謝思涵的前經紀人，被踢走後窮困潦倒（背景人物，不在現場）

【完整劇情資料庫——僅供GM參考，依進度逐步揭露】

關鍵事件：
【彩排晚宴】陳宥霖打開 something blue 禮物盒，發現槍與恐嚇卡片，謝思語臨場掩蓋。
【第一起槍擊】葉若晴在廚房用消音槍近距離殺死吳建廷，預先佈置彈頭彈殼與時鐘製造假現場，謝思語到場後播放錄音槍聲＋尖叫演戲。謝思語的禮物卡片事先告知吳建廷去廚房與葉若晴碰面。
【第二起槍擊】陳宥霖用消音槍在地窖打傷謝思語小腿，用紅酒洗去火藥痕跡，槍藏在謝思語禮服下，製造陳宥霖的不在場假象。
【第三起槍擊】謝思涵用消音槍（沙發抱枕輔助）在新娘房擊斃陳宥霖，抱枕丟入壁爐、佈置彈殼彈頭、抓陳宥霖死手開一槍留硝煙、自傷偽造打鬥現場。

核心詭計：多個現場的彈殼彈頭均出自同一把槍（鞋盒中那把，事先在射擊場取得），製造「三案一槍」的假推理陷阱。實際上兇手共使用了四把不同的槍。錄音播放偽造槍聲製造假案發時間。

真正幕後：謝思語同時向謝思涵謊稱「陳宥霖要背叛你」、向陳宥霖謊稱「謝思涵要利用你」，讓兩人互相設局、自己全程不沾血。謝思語的動機：謝思涵以斷絕金錢脅迫她輟學當經紀人、毀掉戲劇夢，又踢走對她有恩的孟芸蓁。

${playerName}最終揭破關鍵：陳宥霖非慣用手指甲縫內應有謝思涵頭皮組織與護髮品殘留——若沒有，則謝思涵說謊。

Epilogue謎團：陳宥霖的背叛究竟是謝思語捏造的，還是真實的？永遠沒有答案。

【GM行為準則】
1. 依劇情進度說話，玩家還沒到的部分不主動揭露
2. 每次回應結尾提供3～4個行動選項：
[CHOICES]
1. 選項文字
2. 選項文字
3. 選項文字
[/CHOICES]
3. 玩家可以自由輸入選項以外的行動，合理回應
4. 敘事風格：沉穩、懸疑，偶爾有${playerName}的內心獨白
5. 玩家蒐集足夠線索、做出正確推理指控時，才進入下一段揭露
6. 推理有誤要在劇情邏輯範圍內反駁
7. 開場直接進入故事，不要出現 Prologue / Chapter / 第幾幕 等標題，所有角色使用真實姓名
8. 線索清單規則——每次回應必須同時回傳兩組標籤：
   【關鍵線索 [CLUES]】直接影響推理、可用於指控的確鑿發現，例如：物證、矛盾供詞、被識破的謊言。通常不超過6條。
[CLUES]
- 關鍵線索
[/CLUES]
   【一般觀察 [NOTES]】現場氛圍、角色行為、值得留意但尚未確認的細節。通常不超過6條。
[NOTES]
- 一般觀察
[/NOTES]
   兩組標籤都必須附上，若該類別目前沒有內容則留空標籤（不要寫「暫無」或任何佔位文字，直接留白即可）。每次更新時刪除已過時的條目。
   分類的三條核心原則：
   ① 線索只記錄「玩家親眼看見或親耳聽到的事實」，不記錄推論。錯誤示範：「陳宥霖知道卡片含義但不說」（這是推論）。正確示範：「陳宥霖看到卡片後神情大變，沉默不語」（這是觀察）。
   ② 玩家自己造成的行動後果不是線索，不得記入任何欄位。例如「玩家身份已暴露」是玩家行動的結果，不是調查發現，不應出現在線索欄。
   ③ 指向即將發生或剛發生的重大事件的線索（例如異常聲響、可疑移動），應歸入關鍵線索，不是一般觀察。
   特別注意：遊戲開場的第一次回應，[CLUES] 和 [NOTES] 都應該是空的，因為玩家還沒有進行任何調查行動。
9. 全程繁體中文，角色一律用真實姓名
10. 絕對不要出現章節編號、幕次標題或分隔線符號（=====）
11. 節奏控制（極為重要，這是最高優先級的規則）：
    嚴格定義：每次回應最多只能包含以下其中「一項」，選一項就停下來等玩家行動：
    • 一句角色對話或一個角色的單一反應
    • 玩家行動的直接結果（不含連鎖反應）
    • 一個環境細節的描述
    • 一個新角色進入場景
    違禁範例（以下都是一次回應不能做的事）：
    ✗ 角色說話 → 然後走去另一個房間
    ✗ 玩家進門 → 然後另一個角色做出反應 → 然後第三個人插話
    ✗ 描述環境 → 然後觸發新事件
    GM 自我檢查：寫完回應後，數一數「發生了幾件事」。如果超過一件，刪到只剩一件。
    玩家的每一個行動，都應該換來一個直接回應，而不是一連串連鎖事件。
    【身份暴露後的敘事規則】若當前狀態顯示身份已暴露：
    - 所有知情者對玩家保持防備，不主動透露資訊，回答問題時謹慎、簡短
    - 玩家試圖以「朋友」或「賓客」身份套話時，對方應有明顯的戒心反應
    - 某些角色（尤其謝思涵、謝思語）會主動迴避玩家，或把玩家的問題轉為反問
    - 若狀態限制欄已記錄封閉的調查路徑，遇到相關場景時必須在敘事中反映這條路已經走不通
12. 【時間壓力評分】每次回應必須附上時間消耗標籤，根據玩家行動的有效性評分：
    - 2 = 浪費時間或有害行動：錯誤指控、重複詢問已知資訊、在錯誤地點耗時、暴露臥底身份
    - 1 = 中性行動：閒聊、觀望、低效但無害的探索
    - 0 = 有效推進調查：詢問關鍵證人、檢查重要現場、做出有根據的推理
    - -1 = 關鍵突破：發現重要線索、正確識破某人的謊言、找到決定性證據
    格式（每次回應都必須附上，放在所有其他標籤之後）：
[TIME]n[/TIME]
    其中 n 為 -1、0、1 或 2
    【身份暴露後的評分懲罰】若當前狀態顯示身份已暴露，所有評分往上調一級：
    - 原本 0 的有效行動變成 1（因為對方有防備，效率降低）
    - 原本 1 的中性行動變成 2（時間成本更高）
    - 原本 -1 的關鍵突破維持 -1 不變（真正的突破仍然有價值）
    - 最高仍上限為 2
13. 【失敗結局觸發】在以下情況主動宣告失敗，在敘事中描述後果，然後附上失敗標籤：
    - 玩家在線索明顯不足時貿然指控錯誤的人，導致真兇有時間銷毀證據 → [FAIL]wrong_accusation[/FAIL]
    注意：時間耗盡的失敗由前端觸發，GM不需要處理
14. 【失敗回應的特殊規則】當玩家做出錯誤指控、觸發 [FAIL] 時：
    - [CLUES] 和 [NOTES] 標籤內容必須與上一次回應完全相同，不得新增任何條目
    - 錯誤指控的內容與後果絕對不能作為線索或觀察記錄
    - 時間評分固定為 [TIME]2[/TIME]
15. 【局面狀態更新】每次回應必須附上當前局面狀態，格式如下：
[STATE]
身份：臥底中／已暴露
知情者：（知道玩家真實身份的角色，逗號分隔，初始為「無」）
限制：（玩家因行動後果而永久失去的調查路徑，例如「無法以友人身份套話」，初始為「無」）
局面：（一句話描述當前最關鍵的局面變化，初始為「彩排晚宴剛開始」）
[/STATE]
    規則：
    - 每次回應都必須附上，即使狀態沒有變化也要原樣重複
    - 玩家亮出警徽或被識破後，立刻將身份改為「已暴露」並填入知情者
    - 限制一旦寫入就永久保留，不得刪除
    - 局面每次更新為最新的一句話摘要
    注意：[STATE] 放在所有其他標籤之後，[TIME] 之前
    【角色死亡的狀態記錄】若玩家殺死某個角色，立刻在限制欄記錄「[角色名]已死，相關調查路徑永久關閉」，並在局面欄反映。
16. 【玩家動手殺人的處理規則】
    玩家持有警察配槍，技術上有能力對任何人動手。GM 不得在敘事上阻止這個行動，但必須按以下邏輯處理後果：
    ① 殺死無辜者（蕭凱翔、許雅芳、段師傅、林靜儀等與案件無直接關係者）
       → 在敘事中描述後果，然後附上 [FAIL]killed_innocent[/FAIL]，時間評分 [TIME]2[/TIME]
    ② 殺死關鍵證人（葉若晴、謝思語、謝思涵、陳宥霖、吳建廷）
       → 在敘事中描述後果，附上 [FAIL]killed_witness[/FAIL]，並在 [STATE] 限制欄記錄該角色已死及關閉的調查路徑
    ③ 殺死已確認的兇手（在玩家掌握足夠證據後才適用）
       → 附上 [FAIL]killed_culprit[/FAIL]，敘事描述灰色結局：真相無法在法庭上成立
    所有殺人行動時間評分一律 [TIME]2[/TIME]`;

// ── Parse GM response ────────────────────────────────────────────────
const parseResponse = (rawText) => {
  let text = rawText;
  if (text.includes("[CHOICES]") && !text.includes("[/CHOICES]")) text = text.replace(/\[CHOICES\][\s\S]*$/, "");
  if (text.includes("[CLUES]")   && !text.includes("[/CLUES]"))   text = text.replace(/\[CLUES\][\s\S]*$/, "");
  if (text.includes("[NOTES]")   && !text.includes("[/NOTES]"))   text = text.replace(/\[NOTES\][\s\S]*$/, "");
  if (text.includes("[STATE]")   && !text.includes("[/STATE]"))   text = text.replace(/\[STATE\][\s\S]*$/, "");
  if (text.includes("[TIME]")    && !text.includes("[/TIME]"))     text = text.replace(/\[TIME\][\s\S]*$/, "");

  const choicesMatch = text.match(/\[CHOICES\]([\s\S]*?)\[\/CHOICES\]/);
  const cluesMatch   = text.match(/\[CLUES\]([\s\S]*?)\[\/CLUES\]/);
  const notesMatch   = text.match(/\[NOTES\]([\s\S]*?)\[\/NOTES\]/);
  const stateMatch   = text.match(/\[STATE\]([\s\S]*?)\[\/STATE\]/);
  const timeMatch    = text.match(/\[TIME\](-?\d+)\[\/TIME\]/);
  const failMatch    = text.match(/\[FAIL\](\w+)\[\/FAIL\]/);

  let narrative = text
    .replace(/\[CHOICES\][\s\S]*?\[\/CHOICES\]/g, "")
    .replace(/\[CLUES\][\s\S]*?\[\/CLUES\]/g, "")
    .replace(/\[NOTES\][\s\S]*?\[\/NOTES\]/g, "")
    .replace(/\[STATE\][\s\S]*?\[\/STATE\]/g, "")
    .replace(/\[TIME\]-?\d+\[\/TIME\]/g, "")
    .replace(/\[FAIL\]\w+\[\/FAIL\]/g, "")
    .trim();
  narrative = stripMarkers(narrative);

  let parsedState = null;
  if (stateMatch) {
    const raw = stateMatch[1];
    const get = (key) => { const m = raw.match(new RegExp(`${key}：(.+)`)); return m ? m[1].trim() : null; };
    const identity     = get("身份") || "臥底中";
    const awareRaw     = get("知情者") || "無";
    const aware        = awareRaw === "無" ? [] : awareRaw.split(/[，,、]/).map(s => s.trim()).filter(Boolean);
    const restrictRaw  = get("限制") || "無";
    const restrictions = restrictRaw === "無" ? [] : restrictRaw.split(/[；;]/).map(s => s.trim()).filter(Boolean);
    const situation    = get("局面") || "";
    parsedState = { identity, aware, restrictions, situation };
  }

  const PLACEHOLDERS = ["暫無","無","（暫無）","（無）","none","n/a"];
  const filterItems = (arr) => arr.filter(l => l && !PLACEHOLDERS.includes(l.trim()));

  const choices = choicesMatch ? choicesMatch[1].split("\n").map(l => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean) : [];
  const clues   = cluesMatch   ? filterItems(cluesMatch[1].split("\n").map(l => l.replace(/^-\s*/, "").trim())) : [];
  const notes   = notesMatch   ? filterItems(notesMatch[1].split("\n").map(l => l.replace(/^-\s*/, "").trim())) : [];
  const timeCost = timeMatch ? parseInt(timeMatch[1], 10) : 1;
  const failType = failMatch ? failMatch[1] : null;

  return { narrative, choices, clues, notes, timeCost, failType, parsedState };
};

// ── Time status ──────────────────────────────────────────────────────
const TIME_STATUS = (t) => {
  if (t > 15) return { label: "從容",   color: "#4a8a4a", glow: "rgba(74,138,74,0.15)"  };
  if (t > 10) return { label: "警覺",   color: "#7a8a3a", glow: "rgba(122,138,58,0.15)" };
  if (t > 5)  return { label: "緊迫",   color: "#9a6a20", glow: "rgba(154,106,32,0.2)"  };
  if (t > 2)  return { label: "危急",   color: "#9a3a20", glow: "rgba(154,58,32,0.25)"  };
  return             { label: "命懸一線", color: "#aa2020", glow: "rgba(170,32,32,0.35)" };
};

function TimePressure({ timeLeft }) {
  const s = TIME_STATUS(timeLeft);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 16px" }}>
      <span style={{ fontSize: 9, letterSpacing: "0.3em", color: "#6a5030", textTransform: "uppercase" }}>時間壓力</span>
      <span style={{ fontSize: 9, letterSpacing: "0.12em", color: s.color, textShadow: `0 0 8px ${s.glow}`, transition: "color 0.6s, text-shadow 0.6s" }}>{s.label}</span>
    </div>
  );
}

// ── Endings ──────────────────────────────────────────────────────────
const ENDINGS = {
  time_up:          { title: "時間耗盡",  body: "莊園的大門在黎明前悄悄打開了。\n\n當你意識到的時候，關鍵證據已經消失，目擊者的陳述開始出現矛盾。案件懸而未決，真兇在黑暗中安然離去。\n\n有些案子，不是沒有答案——只是答案來不及被找到。" },
  wrong_accusation: { title: "指控失誤",  body: "你的指控在宴會廳炸開了。\n\n那個人的眼神先是驚愕，然後是憤怒——因為他們是無辜的。騷動之中，真正的兇手趁亂行動，銷毀了你唯一的機會。\n\n案件最終以「匿名恐嚇者在逃」結案。謝思語端著一杯紅酒，對著你微微一笑。" },
  killed_innocent:  { title: "警察濫權",  body: "槍響之後，莊園陷入了另一種寂靜。\n\n你擊倒的那個人，與這起案件毫無關係。\n\n調查局在四十八小時內介入。你的配槍被沒收，警徽被收回。原本你來這裡是為了揭開真相——最後，你成了另一起案件的主角。\n\n謝思語的律師在庭上念出你的檔案，語氣平靜得像在讀天氣預報。" },
  killed_witness:   { title: "真相已死",  body: "那個人知道的事，現在永遠不會有人知道了。\n\n你或許有你的理由。但理由無法讓死者開口，也無法在法庭上替你辯護。\n\n案件在技術上繼續偵查，但那條最關鍵的線索鏈已經斷了。真兇站在你面前，微笑著，因為她知道你再也無法拼出完整的圖。\n\n有時候，子彈解決不了問題——它只是把問題變得更難解決。" },
  killed_culprit:   { title: "法外之刑",  body: "你知道她做了什麼。\n\n但知道，和能夠證明，是兩件完全不同的事。\n\n沒有口供，沒有完整的證據鏈，只有一具屍體和一個你無法在法庭上說清楚的故事。案件以「身份不明的攻擊者」結案，你的報告被壓在檔案室最深處。\n\n謝思涵在葬禮上哭得很傷心。沒有人知道那是真心，還是她最後一場演出。" },
};

function GameOverScreen({ type, onRestart }) {
  const e = ENDINGS[type] || ENDINGS.time_up;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center", overflowY: "auto" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.4em", color: "#5a2020", textTransform: "uppercase", marginBottom: 20 }}>案件終結</div>
      <div style={{ fontSize: 20, color: "#a84040", letterSpacing: "0.06em", marginBottom: 28, fontStyle: "italic" }}>{e.title}</div>
      <div style={{ width: 32, height: 1, background: "rgba(168,64,64,0.3)", marginBottom: 28 }} />
      <div style={{ fontSize: 14, color: "#7a5040", lineHeight: 2.2, whiteSpace: "pre-wrap", maxWidth: 460, marginBottom: 44, textAlign: "left" }}>{e.body}</div>
      <button onClick={onRestart} style={{ background: "transparent", border: "1px solid rgba(180,140,60,0.3)", color: "#8a6a30", padding: "11px 32px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", letterSpacing: "0.25em", textTransform: "uppercase" }}
        onMouseEnter={e => { e.target.style.borderColor="rgba(180,140,60,0.6)"; e.target.style.color="#c8a855"; }}
        onMouseLeave={e => { e.target.style.borderColor="rgba(180,140,60,0.3)"; e.target.style.color="#8a6a30"; }}>
        重新開始
      </button>
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────
function ConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#0e0b06", border: "1px solid rgba(180,140,60,0.2)", padding: "32px 28px", maxWidth: 320, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#7a6040", lineHeight: 2, marginBottom: 28 }}>放棄目前的進度，重新開始？<br /><span style={{ fontSize: 11, color: "#6a4820" }}>此操作無法還原</span></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ background: "transparent", border: "1px solid rgba(180,140,60,0.15)", color: "#7a5828", padding: "9px 22px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", letterSpacing: "0.1em" }}>取消</button>
          <button onClick={onConfirm} style={{ background: "rgba(80,20,20,0.3)", border: "1px solid rgba(168,64,64,0.3)", color: "#a84040", padding: "9px 22px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", letterSpacing: "0.1em" }}>重新開始</button>
        </div>
      </div>
    </div>
  );
}

// ── Typewriter ────────────────────────────────────────────────────────
function TypewriterBlock({ text, playerName, onDone, scrollRef }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone]           = useState(false);
  const idxRef    = useRef(0);
  const timerRef  = useRef(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    setDisplayed(""); setDone(false); idxRef.current = 0;
    clearInterval(timerRef.current);
    if (!text) { setDone(true); onDoneRef.current?.(); return; }
    timerRef.current = setInterval(() => {
      idxRef.current++;
      setDisplayed(text.slice(0, idxRef.current));
      if (scrollRef?.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      if (idxRef.current >= text.length) { clearInterval(timerRef.current); setDone(true); onDoneRef.current?.(); }
    }, 18);
    return () => clearInterval(timerRef.current);
  }, [text]);

  const allNames = playerName ? [playerName, ...CHAR_NAMES] : CHAR_NAMES;
  const escaped  = allNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts    = displayed.split(new RegExp(`(${escaped.join("|")})`, "g"));
  return (
    <div style={{ fontSize: 14, lineHeight: 2.1, color: "#bca878", whiteSpace: "pre-wrap" }}>
      {parts.map((p, i) => allNames.includes(p) ? <span key={i} style={{ color: "#c8a855", fontWeight: "bold" }}>{p}</span> : <span key={i}>{p}</span>)}
      {!done && <span style={{ animation: "blink 0.7s step-end infinite", opacity: 0.5 }}>▌</span>}
    </div>
  );
}

// ── Loading indicator ─────────────────────────────────────────────────
const LOADING_PHRASES = ["夜風穿過走廊⋯⋯","壁爐的柴火劈啪作響⋯⋯","遠處傳來玻璃碰撞的聲音⋯⋯","某個角落有人輕聲交談⋯⋯","莊園陷入一片靜默⋯⋯","燭光搖曳不定⋯⋯","有什麼東西被悄悄移動了⋯⋯","樓梯上傳來腳步聲⋯⋯"];
function LoadingIndicator() {
  const [idx, setIdx]   = useState(0);
  const [fade, setFade] = useState(true);
  useEffect(() => {
    const t = setInterval(() => { setFade(false); setTimeout(() => { setIdx(i => (i+1) % LOADING_PHRASES.length); setFade(true); }, 400); }, 2600);
    return () => clearInterval(t);
  }, []);
  return <div style={{ padding: "14px 0", fontSize: 13, color: "#7a5828", fontStyle: "italic", letterSpacing: "0.04em", transition: "opacity 0.4s", opacity: fade ? 1 : 0 }}>{LOADING_PHRASES[idx]}</div>;
}

// ── Name entry ────────────────────────────────────────────────────────
function NameEntry({ onStart }) {
  const [name, setName] = useState("");
  const inputRef        = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.45em", color: "#6a5030", textTransform: "uppercase", marginBottom: 40 }}>互動推理小說 · Ghost Gun</div>
      <div style={{ fontSize: 15, color: "#7a6040", lineHeight: 2.6, marginBottom: 40, textAlign: "center" }}>
        婚禮前夕<br />有些秘密，從一開始就不打算被發現
      </div>
      <div style={{ width: 32, height: 1, background: "rgba(180,140,60,0.18)", marginBottom: 36 }} />
      <div style={{ fontSize: 12, color: "#7a5828", marginBottom: 18, letterSpacing: "0.06em" }}>請輸入你的姓名</div>
      <div style={{ display: "flex", width: "100%", maxWidth: 280 }}>
        <input
          ref={inputRef} value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && e.preventDefault()}
          placeholder="姓名" maxLength={10}
          style={{ flex: 1, background: "rgba(16,10,4,0.7)", border: "1px solid rgba(180,140,60,0.25)", borderRight: "none", color: "#d4c5a9", padding: "11px 16px", fontSize: 16, fontFamily: "inherit", outline: "none", letterSpacing: "0.1em" }}
          onFocus={e => e.target.style.borderColor="rgba(180,140,60,0.52)"}
          onBlur={e => e.target.style.borderColor="rgba(180,140,60,0.25)"}
        />
        <button onClick={() => name.trim() && onStart(name.trim())} style={{ background: name.trim() ? "rgba(90,60,20,0.38)" : "rgba(20,14,5,0.4)", border: "1px solid rgba(180,140,60,0.25)", color: name.trim() ? "#c8a855" : "#2e2008", padding: "11px 18px", fontSize: 13, cursor: name.trim() ? "pointer" : "default", fontFamily: "inherit", letterSpacing: "0.15em" }}>確認</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────
const EMPTY_STATE = () => ({
  playerName:  null,
  messages:    [],
  displayMsgs: [],
  choices:     [],
  clues:       [],
  notes:       [],
  timeLeft:    TIME_MAX,
  gameOver:    null,
  gameState:   null,
});

export default function GhostGunGame() {
  const [playerName,   setPlayerName]   = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [displayMsgs,  setDisplayMsgs]  = useState([]);
  const [choices,      setChoices]      = useState([]);
  const [clues,        setClues]        = useState([]);
  const [notes,        setNotes]        = useState([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [typingDone,   setTypingDone]   = useState(true);
  const [showClues,    setShowClues]    = useState(false);
  const [timeLeft,     setTimeLeft]     = useState(TIME_MAX);
  const [gameOver,     setGameOver]     = useState(null);
  const [gameState,    setGameState]    = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const logRef = useRef(null);

  // ── Load saved game on mount ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      const saved = await loadGame();
      if (saved?.playerName) {
        setPlayerName(saved.playerName);
        setMessages(saved.messages || []);
        setDisplayMsgs((saved.displayMsgs || []).map(m => ({ ...m, typing: false })));
        setChoices(saved.choices || []);
        setClues(saved.clues || []);
        setNotes(saved.notes || []);
        setTimeLeft(saved.timeLeft ?? TIME_MAX);
        setGameOver(saved.gameOver || null);
        setGameState(saved.gameState || null);
      }
      setStorageReady(true);
    })();
  }, []);

  // ── Auto-save on state changes ───────────────────────────────────
  useEffect(() => {
    if (!storageReady || !playerName) return;
    saveGame({ playerName, messages, displayMsgs: displayMsgs.map(m => ({ ...m, typing: false })), choices, clues, notes, timeLeft, gameOver, gameState });
  }, [playerName, messages, clues, notes, timeLeft, gameOver, gameState]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [displayMsgs, loading]);

  const applyTimeCost = useCallback((cost) => {
    setTimeLeft(prev => cost < 0 ? Math.min(prev - cost, TIME_RECOVER_CAP) : Math.max(prev - cost, 0));
  }, []);

  useEffect(() => {
    if (playerName && timeLeft <= 0 && !gameOver) setGameOver("time_up");
  }, [timeLeft, playerName, gameOver]);

  const callGM = async (msgs, name, state) => {
    setLoading(true); setTypingDone(false); setChoices([]);
    try {
      const res  = await fetch("/api/gm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1024, system: buildSystemPrompt(name || playerName, state !== undefined ? state : gameState), messages: msgs }) });
      let data;
      try { data = await res.json(); } catch (e) { throw new Error(`JSON parse failed (HTTP ${res.status}): ${e.message}`); }
      if (!res.ok || data.error) {
        const errMsg = data.error?.message || data.error?.type || `HTTP ${res.status}`;
        throw new Error(errMsg);
      }
      const raw = data.content?.[0]?.text;
      if (!raw) throw new Error(`No content in response. Keys: ${Object.keys(data).join(",")}`);
      const { narrative, choices: nc, clues: nl, notes: nn, timeCost, failType, parsedState } = parseResponse(raw);
      const newMsgs = [...msgs, { role: "assistant", content: raw }];
      setMessages(newMsgs);
      setDisplayMsgs(prev => [...prev, { role: "assistant", content: narrative, typing: true }]);
      setChoices(nc);
      if (!failType) {
        if (nl.length > 0) setClues(nl);
        if (nn.length > 0) setNotes(nn);
        if (parsedState) {
          setGameState(prev => !prev ? parsedState : { identity: parsedState.identity, aware: parsedState.aware, restrictions: [...new Set([...prev.restrictions, ...parsedState.restrictions])], situation: parsedState.situation });
        }
      }
      if (msgs.length > 1) applyTimeCost(failType ? 2 : timeCost);
      if (failType) setGameOver(failType);
    } catch (err) {
      const msg = err?.message || String(err) || "未知錯誤";
      setDisplayMsgs(prev => [...prev, { role: "assistant", content: `【系統錯誤：${msg}】`, typing: false }]);
      setTypingDone(true);
    }
    setLoading(false);
  };

  const handleTypingDone = useCallback(() => {
    setTypingDone(true);
    setDisplayMsgs(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, typing: false } : m));
  }, []);

  const startGame = async (name) => {
    setPlayerName(name); setTimeLeft(TIME_MAX); setGameOver(null);
    setClues([]); setNotes([]); setGameState(null);
    const init = [{ role: "user", content: "開始遊戲" }];
    setMessages(init); setDisplayMsgs([]);
    await callGM(init, name, null);
  };

  const doRestart = async () => {
    await clearSave();
    setConfirmReset(false);
    setPlayerName(null); setMessages([]); setDisplayMsgs([]); setChoices([]);
    setClues([]); setNotes([]); setGameState(null);
    setTimeLeft(TIME_MAX); setGameOver(null); setTypingDone(true); setInput("");
  };

  const sendAction = async (action) => {
    if (loading || !typingDone || gameOver) return;
    const newMsgs = [...messages, { role: "user", content: action }];
    setMessages(newMsgs);
    setDisplayMsgs(prev => [...prev, { role: "user", content: action, typing: false }]);
    setChoices([]);
    await callGM(newMsgs, undefined, gameState);
  };

  const handleSubmit = () => {
    if (!input.trim() || loading || !typingDone || gameOver) return;
    sendAction(input.trim()); setInput("");
  };

  const canInteract = !loading && typingDone && !gameOver;

  if (!storageReady) return <div style={{ minHeight: "100vh", background: "#09090b" }} />;

  return (
    <div style={{ height: "100dvh", background: "#09090b", color: "#d4c5a9", fontFamily: "'Georgia','Noto Serif TC',serif", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "radial-gradient(ellipse at 25% 40%, rgba(80,55,15,0.07) 0%, transparent 55%)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 720, padding: "16px 16px 10px", borderBottom: "1px solid rgba(180,140,60,0.12)", position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.4em", color: "#6a5030", textTransform: "uppercase", marginBottom: 2 }}>互動推理小說</div>
          <div style={{ fontSize: 20, letterSpacing: "0.08em", color: "#c8a855", fontStyle: "italic" }}>Ghost Gun</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {playerName && <div style={{ fontSize: 10, color: "#7a5a28", letterSpacing: "0.04em" }}>警員　{playerName}</div>}
          {playerName && (
            <button onClick={() => setShowClues(s => !s)} style={{ background: "transparent", border: "1px solid rgba(180,140,60,0.2)", color: "#5a4018", padding: "5px 10px", cursor: "pointer", fontSize: 10, letterSpacing: "0.08em", fontFamily: "inherit" }}
              onMouseEnter={e => e.target.style.borderColor="rgba(180,140,60,0.48)"}
              onMouseLeave={e => e.target.style.borderColor="rgba(180,140,60,0.2)"}>
              {showClues ? "收起線索" : "線索"}
            </button>
          )}
          {playerName && !gameOver && (
            <button onClick={() => setConfirmReset(true)} style={{ background: "transparent", border: "1px solid rgba(180,60,60,0.15)", color: "#7a3828", padding: "5px 10px", cursor: "pointer", fontSize: 10, letterSpacing: "0.08em", fontFamily: "inherit" }}
              onMouseEnter={e => { e.target.style.borderColor="rgba(180,60,60,0.4)"; e.target.style.color="#a84040"; }}
              onMouseLeave={e => { e.target.style.borderColor="rgba(180,60,60,0.15)"; e.target.style.color="#7a3828"; }}>
              重開
            </button>
          )}
        </div>
      </div>

      {/* Time pressure */}
      {playerName && !gameOver && (
        <div style={{ width: "100%", maxWidth: 720, position: "relative", zIndex: 1, flexShrink: 0 }}>
          <TimePressure timeLeft={timeLeft} />
        </div>
      )}

      {/* Clues panel */}
      {showClues && playerName && (
        <div style={{ width: "100%", maxWidth: 720, zIndex: 1, background: "rgba(8,5,1,0.98)", borderBottom: "1px solid rgba(180,140,60,0.1)", padding: "12px 16px", flexShrink: 0, maxHeight: "30vh", overflowY: "auto" }}>
          {clues.length === 0 && notes.length === 0 && <div style={{ fontSize: 12, color: "#6a4820", fontStyle: "italic" }}>尚無線索</div>}
          {clues.length > 0 && <>
            <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "#7a5828", marginBottom: 8, textTransform: "uppercase" }}>關鍵線索</div>
            {clues.map((c, i) => <div key={i} style={{ fontSize: 13, color: "#c8a855", marginBottom: 5, paddingLeft: 10, borderLeft: "1px solid rgba(200,168,85,0.35)", lineHeight: 1.7 }}>{c}</div>)}
          </>}
          {notes.length > 0 && <>
            <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "#6a5025", marginBottom: 8, marginTop: clues.length > 0 ? 12 : 0, textTransform: "uppercase" }}>一般觀察</div>
            {notes.map((n, i) => <div key={i} style={{ fontSize: 13, color: "#706040", marginBottom: 4, paddingLeft: 10, borderLeft: "1px solid rgba(180,140,60,0.15)", lineHeight: 1.7 }}>{n}</div>)}
          </>}
        </div>
      )}

      {/* Body */}
      <div style={{ width: "100%", maxWidth: 720, flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1, overflow: "hidden" }}>
        {!playerName ? <NameEntry onStart={startGame} /> : gameOver ? <GameOverScreen type={gameOver} onRestart={doRestart} /> : (
          <>
            {/* Log */}
            <div ref={logRef} style={{ flex: 1, overflowY: "auto", padding: "18px 16px 0", WebkitOverflowScrolling: "touch" }}>
              {displayMsgs.map((m, i) => (
                <div key={i} style={{ marginBottom: 20 }}>
                  {m.role === "user" ? (
                    <div style={{ textAlign: "right" }}>
                      <span style={{ display: "inline-block", background: "rgba(55,36,8,0.2)", border: "1px solid rgba(180,140,60,0.13)", color: "#7a5a20", fontSize: 13, padding: "7px 12px", lineHeight: 1.7, maxWidth: "82%", textAlign: "left" }}>{m.content}</span>
                    </div>
                  ) : m.typing ? (
                    <TypewriterBlock text={m.content} playerName={playerName} onDone={handleTypingDone} scrollRef={logRef} />
                  ) : (
                    <NarrativeText text={m.content} playerName={playerName} />
                  )}
                </div>
              ))}
              {loading && <LoadingIndicator />}
            </div>

            {/* Choices */}
            <div style={{ padding: "12px 16px 0", borderTop: "1px solid rgba(180,140,60,0.07)", flexShrink: 0 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "#6a5030", textTransform: "uppercase", marginBottom: 8 }}>行動選項</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, minHeight: 86 }}>
                {canInteract && choices.length > 0 ? choices.map((c, i) => (
                  <button key={i} onClick={() => sendAction(c)} style={{ background: "rgba(20,13,4,0.6)", border: "1px solid rgba(180,140,60,0.18)", color: "#705828", textAlign: "left", padding: "10px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", lineHeight: 1.6, borderRadius: 2, display: "flex", alignItems: "flex-start", minHeight: 44 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(180,140,60,0.44)"; e.currentTarget.style.color="#c8a855"; e.currentTarget.style.background="rgba(60,40,8,0.35)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(180,140,60,0.18)"; e.currentTarget.style.color="#705828"; e.currentTarget.style.background="rgba(20,13,4,0.6)"; }}>
                    <span style={{ color: "#6a4820", fontSize: 11, flexShrink: 0, width: 16, paddingTop: 2 }}>›</span>
                    <span style={{ flex: 1 }}>{c}</span>
                  </button>
                )) : Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ background: "rgba(12,8,2,0.4)", border: "1px solid rgba(180,140,60,0.07)", borderRadius: 2, height: 42 }} />
                ))}
              </div>
            </div>

            {/* Free input */}
            <div style={{ padding: "8px 16px 16px", display: "flex", gap: 8, flexShrink: 0 }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && e.preventDefault()}
                placeholder={canInteract ? "或自行輸入行動⋯⋯" : "⋯⋯"}
                disabled={!canInteract}
                style={{ flex: 1, background: "rgba(8,5,1,0.7)", border: "1px solid rgba(180,140,60,0.14)", color: canInteract ? "#c8b890" : "#2e2208", padding: "10px 12px", fontSize: 16, fontFamily: "inherit", outline: "none" }}
                onFocus={e => e.target.style.borderColor="rgba(180,140,60,0.4)"}
                onBlur={e => e.target.style.borderColor="rgba(180,140,60,0.14)"}
              />
              <button onClick={handleSubmit} disabled={!canInteract || !input.trim()} style={{ background: "rgba(60,38,8,0.3)", border: "1px solid rgba(180,140,60,0.2)", color: "#c8a855", padding: "10px 16px", cursor: "pointer", fontSize: 13, fontFamily: "inherit", letterSpacing: "0.1em", opacity: !canInteract || !input.trim() ? 0.22 : 1, minHeight: 44 }}>行動</button>
            </div>
          </>
        )}
      </div>

      {confirmReset && <ConfirmDialog onConfirm={doRestart} onCancel={() => setConfirmReset(false)} />}

      <style>{`
        @keyframes blink { 0%,100%{opacity:0} 50%{opacity:0.6} }
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(180,140,60,.12)}
        *{box-sizing:border-box; -webkit-tap-highlight-color:transparent}
      `}</style>
    </div>
  );
}
