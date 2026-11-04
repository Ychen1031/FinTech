import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles, Edit3, FileText, CheckCircle2 } from 'lucide-react';

export default function EditRecordModal({
  isOpen,
  onClose,
  recordData,
  onSaveRecord
}) {
  const [docTitle, setDocTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [docCategory, setDocCategory] = useState('銀行通知');
  const [deadline, setDeadline] = useState('');
  const [summaryOneLine, setSummaryOneLine] = useState('');
  const [nextStepShort, setNextStepShort] = useState('');
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');
  const [q4, setQ4] = useState('');
  const [q5, setQ5] = useState('');
  const [rawOcrText, setRawOcrText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recordData) return;
    const analysis = recordData.analysis || recordData;
    const fq = analysis.five_questions || recordData.five_questions || {};

    setDocTitle(analysis.doc_title || recordData.doc_title || '');
    setIssuer(analysis.issuer || recordData.issuer || '');
    setDocCategory(analysis.doc_category || recordData.doc_category || '銀行通知');
    setDeadline(analysis.deadline || recordData.deadline || '');
    setSummaryOneLine(analysis.summary_one_line || recordData.summary_one_line || '');
    setNextStepShort(analysis.next_step_short || recordData.next_step_short || '');
    setQ1(fq.what_is_it || '');
    setQ2(fq.need_action_and_deadline || '');
    setQ3(fq.where_and_what_to_bring || '');
    setQ4(fq.where_to_sign || '');
    setQ5(fq.important_notes || '');
    setRawOcrText(
      analysis.raw_ocr_text ||
        recordData.raw_ocr_text ||
        analysis.masked_ocr_text ||
        recordData.masked_ocr_text ||
        ''
    );
  }, [recordData, isOpen]);

  if (!isOpen || !recordData) return null;

  const recordId = recordData.record_id;

  const handleManualSave = async (e) => {
    e.preventDefault();
    if (!recordId) return;
    setSaving(true);
    try {
      await onSaveRecord(recordId, {
        doc_title: docTitle,
        issuer,
        doc_category: docCategory,
        deadline,
        summary_one_line: summaryOneLine,
        next_step_short: nextStepShort,
        raw_ocr_text: rawOcrText,
        five_questions: {
          what_is_it: q1,
          need_action_and_deadline: q2,
          where_and_what_to_bring: q3,
          where_to_sign: q4,
          important_notes: q5
        },
        reparse_from_ocr: false
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleReparseFromOcr = async () => {
    if (!recordId) return;
    setSaving(true);
    try {
      await onSaveRecord(recordId, {
        raw_ocr_text: rawOcrText,
        reparse_from_ocr: true
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#16383a] px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <Edit3 className="h-6 w-6 text-amber-300" />
            <div>
              <h2 className="text-xl font-extrabold">人工修正與重新解析辨識結果</h2>
              <p className="text-xs text-teal-100/80">
                儲存後將同步更新畫面與後端 SQLite 資料庫 (`recognition_records`)，並自動重新合成國／台語語音講稿
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleManualSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: 修正 OCR 原文並一鍵重新生成 */}
          <div className="rounded-2xl border-2 border-teal-200 bg-[#e9f2f0]/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#0f5c5c]" />
                <h3 className="text-base font-extrabold text-[#16383a]">
                  方法 A：修正照片 OCR 辨識原文，讓系統自動重新生成導讀
                </h3>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={handleReparseFromOcr}
                className="flex items-center gap-1.5 rounded-xl bg-[#0f5c5c] px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#0b4646] disabled:opacity-50 transition"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                依修改後的 OCR 原文重新生成白話導讀
              </button>
            </div>
            <p className="text-xs text-slate-600">
              若翻拍照片上有花邊、浮水印或底線導致部分文字漏讀（例如日期或關鍵字），可直接在此修改原文並點選右上角重新生成：
            </p>
            <textarea
              rows={4}
              value={rawOcrText}
              onChange={(e) => setRawOcrText(e.target.value)}
              placeholder="請輸入或修正照片上的文字內容..."
              className="w-full rounded-xl border border-teal-300 bg-white p-3 text-sm font-mono text-slate-800 focus:border-[#0f5c5c] focus:outline-none"
            />
          </div>

          {/* Section 2: 直接修改導讀欄位 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <Edit3 className="h-5 w-5 text-[#0f5c5c]" />
              <h3 className="text-base font-extrabold text-slate-900">
                方法 B：直接手動修改導讀標題、期限與五題問答
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  文件標題 (`doc_title`)
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-[#0f5c5c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  發件機構 (`issuer`)
                </label>
                <input
                  type="text"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-[#0f5c5c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  文件分類 (`doc_category`)
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-[#0f5c5c] focus:outline-none bg-white"
                >
                  <option value="銀行通知">銀行通知</option>
                  <option value="保險通知">保險通知</option>
                  <option value="信用卡帳單">信用卡帳單</option>
                  <option value="繳費通知單">繳費通知單</option>
                  <option value="可疑通知（防詐警示）">可疑通知（防詐警示）</option>
                  <option value="一般金融文件">一般金融文件</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-rose-700 mb-1">
                  辦理／繳費期限 (`deadline`)
                </label>
                <input
                  type="text"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="例如：10 月 28 日前"
                  className="w-full rounded-xl border border-rose-300 bg-rose-50/40 px-3.5 py-2.5 text-sm font-bold text-rose-900 focus:border-rose-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  這張通知在說什麼？（一句話白話總結）
                </label>
                <input
                  type="text"
                  value={summaryOneLine}
                  onChange={(e) => setSummaryOneLine(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#0f5c5c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#0f5c5c] mb-1">
                  下一步行動指引 (`next_step_short`)
                </label>
                <input
                  type="text"
                  value={nextStepShort}
                  onChange={(e) => setNextStepShort(e.target.value)}
                  className="w-full rounded-xl border border-teal-300 bg-teal-50/40 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-[#0f5c5c] focus:outline-none"
                />
              </div>
            </div>

            {/* 五題問答區 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#16383a]">
                長輩最關心的五件事（固定五題格式）
              </h4>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#0f5c5c] mb-1">
                    ① 這張單子是什麼？
                  </label>
                  <input
                    type="text"
                    value={q1}
                    onChange={(e) => setQ1(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0f5c5c] mb-1">
                    ② 要不要處理？期限是什麼時候？
                  </label>
                  <input
                    type="text"
                    value={q2}
                    onChange={(e) => setQ2(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0f5c5c] mb-1">
                    ③ 要去哪裡、帶什麼？
                  </label>
                  <input
                    type="text"
                    value={q3}
                    onChange={(e) => setQ3(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0f5c5c] mb-1">
                    ④ 哪裡要簽名？
                  </label>
                  <input
                    type="text"
                    value={q4}
                    onChange={(e) => setQ4(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0f5c5c] mb-1">
                    ⑤ 有什麼要注意？
                  </label>
                  <input
                    type="text"
                    value={q5}
                    onChange={(e) => setQ5(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#0f5c5c] px-6 py-2.5 text-sm font-extrabold text-white shadow-md hover:bg-[#0b4646] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? '儲存更新中...' : '儲存人工修改（寫入 SQLite）'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
