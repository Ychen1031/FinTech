import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, X, KeyRound, SearchCheck, AlertTriangle } from 'lucide-react';

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

  if (!isOpen) return null;

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
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#16383a] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-amber-300" />
            <div>
              <h3 className="text-xl font-bold">模組三：防詐規則庫測試與 AI 引擎設定</h3>
              <p className="text-xs text-teal-100/80">
                可即時測試詐騙關鍵字與異常要求比對規則，或設定 Gemini VLM API 金鑰
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
          {/* Scam Text Tester */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
            <h4 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <SearchCheck className="h-5 w-5 text-[#0f5c5c]" />
              即時防詐文字／簡訊規則檢測器
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
                    '親愛的客戶您好，為配合洗錢防制法令定期更新客戶資料，請於收受本通知 60 天內攜帶身分證與確認書親至本行各分行辦理。'
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

          {/* Optional Cloud VLM API Key Setting */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
            <h4 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#0f5c5c]" />
              AI 深度解析引擎設定（支援離線智慧引擎 ＋ Gemini VLM API）
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              系統已內建完整離線智慧解析與計畫書範例文件庫（免金鑰即可完整操作）。若您欲對自訂拍攝照片呼叫雲端 Google Gemini 多模態模型，可於下方輸入 API Key（照片將先完成本地個資遮罩後再傳送）：
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="選填：輸入 Gemini API Key (AIzaSy...)，未填則使用內建智慧導讀引擎"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
