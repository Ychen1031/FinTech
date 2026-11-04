import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  X,
  KeyRound,
  SearchCheck,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Cpu,
  Sparkles,
  Bot
} from 'lucide-react';

export default function ScamQuickCheckerModal({
  isOpen,
  onClose,
  apiKey,
  setApiKey
}) {
  const [testText, setTestText] = useState(
    '【緊急帳戶通知】您的銀行帳戶因異常交易即將被凍結！請於 30 分鐘內匯入驗證金 50,000 元至私人指定帳戶，切勿向銀行人員詢問，或立即加專員私人 LINE ID 領取解除碼。'
  );
  const [checkResult, setCheckResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showKeyText, setShowKeyText] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState(null);

  if (!isOpen) return null;

  const isOpenAiKey = (apiKey || '').trim().startsWith('sk-');
  const isGeminiKey = (apiKey || '').trim().length > 0 && !isOpenAiKey;

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 5000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const handleTestApiKey = async () => {
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey) {
      setKeyTestStatus({
        ok: false,
        msg: '目前未輸入雲端 API Key，系統預設使用「本地多通道金融詞典 OCR 引擎」。'
      });
      return;
    }
    setTestingKey(true);
    setKeyTestStatus(null);
    try {
      if (cleanKey.startsWith('sk-')) {
        const resp = await fetchWithTimeout(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cleanKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              max_tokens: 5,
              messages: [{ role: 'user', content: 'OK' }]
            })
          },
          6000
        );
        if (resp.ok) {
          setKeyTestStatus({
            ok: true,
            msg: '✅ OpenAI ChatGPT API Key 連線成功！上傳照片時將自動使用 GPT-4o Vision 進行多模態視覺解析。'
          });
        } else {
          const errJson = await resp.json().catch(() => ({}));
          const errCode = errJson?.error?.code || resp.status;
          const errMsg = errJson?.error?.message || '';
          setKeyTestStatus({
            ok: false,
            msg: `❌ OpenAI API 測試未通過 (${errCode})：${errMsg}`
          });
        }
      } else {
        // 針對 Google Gemini (AIzaSy...) 或 Vertex AI Express (AQ...) 平行快速檢測（限時 5 秒內完成）
        const bodyPayload = JSON.stringify({
          contents: [{ parts: [{ text: 'OK' }] }],
          generationConfig: { maxOutputTokens: 5 }
        });

        const testTargets = [
          {
            model: 'gemini-3-flash-preview',
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(cleanKey)}`
          },
          {
            model: 'gemini-3.1-flash-lite-preview',
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${encodeURIComponent(cleanKey)}`
          }
        ];

        const results = await Promise.all(
          testTargets.map(async (t) => {
            try {
              const r = await fetchWithTimeout(
                t.url,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: bodyPayload
                },
                5000
              );
              if (r.ok) {
                return { ok: true, model: t.model };
              }
              const errJson = await r.json().catch(() => ({}));
              return {
                ok: false,
                model: t.model,
                err: errJson?.error?.message || `HTTP ${r.status}`
              };
            } catch (err) {
              return {
                ok: false,
                model: t.model,
                err: err.name === 'AbortError' ? '連線逾時 (5秒)' : err.message
              };
            }
          })
        );

        const successItem = results.find((r) => r.ok);
        if (successItem) {
          setKeyTestStatus({
            ok: true,
            msg: `✅ 金鑰驗證成功！已自動啟用免費模型「${successItem.model}」進行直接看圖解析。`
          });
        } else {
          const allErrors = results.map((r) => r.err).filter(Boolean);
          const enableUrlMatch = allErrors
            .join(' ')
            .match(/https:\/\/console\.developers\.google\.com\/apis\/api\/aiplatform\.googleapis\.com\/overview\?project=\d+/);
          const billingErr = allErrors.find((e) => e.includes('requires billing'));
          const firstMeaningfulErr =
            billingErr ||
            results.find((r) => r.err && !r.err.includes('連線逾時'))?.err ||
            results[0]?.err ||
            '無法連線';
          setKeyTestStatus({
            ok: false,
            msg: `⚠️ Google API 回覆：${firstMeaningfulErr}`,
            enableUrl: enableUrlMatch ? enableUrlMatch[0] : null
          });
        }
      }
    } catch (e) {
      setKeyTestStatus({
        ok: false,
        msg: `❌ 網路連線失敗：${e.message || 'Unknown Error'}`
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleRunCheck = async () => {
    if (!testText.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch('http://127.0.0.1:8001/api/scam-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testText })
      });
      const data = await resp.json();
      setCheckResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#16383a] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-amber-300" />
            <div>
              <h3 className="text-xl font-bold">
                防詐規則庫測試 ＆ AI 辨識引擎設定
              </h3>
              <p className="text-xs text-teal-100/80">
                支援本地多通道金融詞典 OCR、Google Gemini VLM、OpenAI ChatGPT (GPT-4o Vision) 與 165 防詐規則庫
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f6f8f7]">
          {/* Section 1: 系統支援之三種 AI 辨識引擎 */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-teal-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-base font-extrabold text-[#16383a] flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#0f5c5c]" />
                系統支援之 AI 視覺與文件辨識引擎（本地 OCR ＋ Gemini ＋ ChatGPT）
              </h4>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-[#0f5c5c] border border-teal-200">
                依輸入之 API Key 自動識別切換 Gemini 或 ChatGPT
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
              {/* Mode 1: Local Multi-Pass + Lexicon */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white">
                    <Cpu className="h-3.5 w-3.5 shrink-0" />
                    本地多通道 OCR
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    {!apiKey ? '預設運作中' : '自動備援'}
                  </span>
                </div>
                <h5 className="text-sm font-extrabold text-slate-900">
                  多通道前處理 ＋ 金融糾錯詞庫
                </h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  結合「小圖 Gamma 筆畫加粗」、「155 閾值去浮水印二值化」與「台灣金融專有名詞 N-gram 模糊糾錯字典」，免填 API Key 即可離線運作，並支援前台 <strong>「✏️ 人工修正與重新解析」</strong>。
                </p>
              </div>

              {/* Mode 2: Cloud Gemini VLM */}
              <div
                className={`rounded-2xl p-4 space-y-2.5 transition ${
                  isGeminiKey
                    ? 'border-2 border-[#0f5c5c] bg-teal-50/80 shadow-xs'
                    : 'border border-teal-200 bg-[#e9f2f0]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#0f5c5c] px-2.5 py-1 text-xs font-bold text-white">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                    Google Gemini VLM
                  </span>
                  <span className="text-[11px] font-extrabold text-[#0f5c5c]">
                    {isGeminiKey ? '● 已啟用 Gemini' : '支援 AIzaSy... / AQ... 金鑰'}
                  </span>
                </div>
                <h5 className="text-sm font-extrabold text-slate-900">
                  Google Gemini 2.5 / 3.0 VLM
                </h5>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>免除傳統 OCR 切字誤差！</strong>直接將去識別化後的整張影像輸入 Google 多模態視覺模型（自動匹配 `gemini-2.5-flash-lite` / `gemini-3-flash-preview`），一步產出五題白話問答與台語講稿。
                </p>
              </div>

              {/* Mode 3: OpenAI ChatGPT (GPT-4o Vision) */}
              <div
                className={`rounded-2xl p-4 space-y-2.5 transition ${
                  isOpenAiKey
                    ? 'border-2 border-indigo-600 bg-indigo-50/80 shadow-xs'
                    : 'border border-indigo-200 bg-indigo-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-700 px-2.5 py-1 text-xs font-bold text-white">
                    <Bot className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                    OpenAI ChatGPT
                  </span>
                  <span className="text-[11px] font-extrabold text-indigo-800">
                    {isOpenAiKey ? '● 已啟用 ChatGPT' : '支援 sk-... 金鑰'}
                  </span>
                </div>
                <h5 className="text-sm font-extrabold text-slate-900">
                  ChatGPT (GPT-4o Vision)
                </h5>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>高精準度多模態視覺理解！</strong>透過 OpenAI `gpt-4o` 視覺模型直接看圖解析複雜金融單據、手寫批註與勾選框，自動輸出結構化 JSON 白話導讀與防詐風險評估。
                </p>
              </div>
            </div>

            {/* API Key Input inside Architecture Card */}
            <div className="pt-2 border-t border-slate-200/80 space-y-2">
              <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-4 w-4 text-[#0f5c5c]" />
                  切換啟用「Google Gemini」或「OpenAI ChatGPT (GPT-4o)」直接看圖辨識（已自動記憶於瀏覽器）：
                </span>
                <button
                  type="button"
                  onClick={() => setShowKeyText((v) => !v)}
                  className="text-xs font-bold text-[#0f5c5c] hover:underline"
                >
                  {showKeyText ? '🙈 隱藏金鑰' : '👁️ 顯示金鑰'}
                </button>
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  type={showKeyText ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setKeyTestStatus(null);
                  }}
                  placeholder="輸入 Gemini API Key (AIzaSy... / AQ...) 或 ChatGPT OpenAI Key (sk-...)"
                  className="flex-1 min-w-[240px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-[#0f5c5c] focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestApiKey}
                  disabled={testingKey}
                  className="rounded-xl bg-[#0f5c5c] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0b4646] transition shrink-0"
                >
                  {testingKey ? '測試連線中...' : '🔌 測試 API Key 連線'}
                </button>
              </div>
              {keyTestStatus && (
                <div
                  className={`rounded-xl px-3.5 py-2.5 text-xs font-bold border space-y-2 ${
                    keyTestStatus.ok
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div>{keyTestStatus.msg}</div>
                  {keyTestStatus.enableUrl && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={keyTestStatus.enableUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f5c5c] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0b4646]"
                      >
                        👉 點此前往 Google Cloud 按下「啟用 (Enable)」即可開通此 AQ. 金鑰 ↗
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Scam Text Tester */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
            <h4 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <SearchCheck className="h-5 w-5 text-[#0f5c5c]" />
              模組三：即時防詐文字／簡訊規則檢測器（對應 SQLite `scam_rules` 資料表）
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              長輩若收到可疑簡訊、LINE 訊息或紙本通知，系統會比對「私人 LINE、驗證碼、私人指定帳戶、限時 30 分鐘、切勿問行員、保證高報酬」等六大高風險規則：
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() =>
                  setTestText(
                    '【緊急帳戶通知】您的帳戶即將被凍結！請在 30 分鐘內完成匯款至私人指定帳戶繳交驗證金，切勿向銀行人員詢問。'
                  )
                }
                className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 border border-rose-200 hover:bg-rose-100"
              >
                範例 A：假冒銀行凍結帳戶
              </button>
              <button
                type="button"
                onClick={() =>
                  setTestText(
                    '【VIP 理財專案】張老師內線佈局，保證獲利、穩賺不賠，月息 15% 高報酬！請立即點擊連結加入私人 LINE 群組並提供網銀密碼。'
                  )
                }
                className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200 hover:bg-amber-100"
              >
                範例 B：假投資加私人 LINE 詐騙
              </button>
              <button
                type="button"
                onClick={() =>
                  setTestText(
                    '親愛的客戶您好，為配合洗錢防制法令定期更新客戶資料，請於收受本通知 60 天內攜帶身分證與客戶資料確認函親至本行各分行辦理。'
                  )
                }
                className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              >
                範例 C：正常銀行客戶審查通知
              </button>
            </div>

            <textarea
              rows={3}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-800 focus:border-[#0f5c5c] focus:outline-none"
              placeholder="請貼上要檢測的通知單或簡訊內容..."
            />

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleRunCheck}
                disabled={loading}
                className="rounded-xl bg-[#0f5c5c] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0b4646]"
              >
                {loading ? '正在比對防詐規則庫...' : '立即執行防詐風險檢測'}
              </button>
            </div>

            {checkResult && (
              <div
                className={`mt-4 rounded-xl p-4 border ${
                  checkResult.is_scam_warning
                    ? 'bg-[#fdede4] border-rose-300 text-[#963b22]'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-base">
                  {checkResult.is_scam_warning ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-rose-600" />
                      <span>【高風險警示】{checkResult.headline}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      <span>【低風險】{checkResult.headline}</span>
                    </>
                  )}
                </div>

                {checkResult.matched_rules?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {checkResult.matched_rules.map((r) => (
                      <div key={r.rule_id} className="rounded-lg bg-white/80 p-3 border border-rose-200">
                        <p className="font-bold text-sm text-rose-800">! 命中規則：{r.label}</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          觸發關鍵字：{r.matched_keywords.join('、')}
                        </p>
                        <p className="text-xs text-slate-700 mt-1">{r.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
