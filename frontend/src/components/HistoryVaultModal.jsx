import React, { useState } from 'react';
import {
  FolderKanban,
  Search,
  Download,
  Trash2,
  Eye,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  Sparkles
} from 'lucide-react';

export default function HistoryVaultView({
  historyData,
  apiBase,
  onOpenRecordInStep3,
  onDeleteRecord,
  onClearAll,
  onUploadNewClick
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'upload' | 'scam' | 'normal'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const records = historyData?.records || [];

  const filteredRecords = records.filter((rec) => {
    if (filterType === 'upload' && rec.source_type !== 'upload') return false;
    if (filterType === 'scam' && !rec.is_scam) return false;
    if (filterType === 'normal' && rec.is_scam) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchTitle = (rec.doc_title || '').toLowerCase().includes(q);
      const matchIssuer = (rec.issuer || '').toLowerCase().includes(q);
      const matchSummary = (rec.summary_one_line || '').toLowerCase().includes(q);
      const matchOcr = (rec.raw_ocr_text || '').toLowerCase().includes(q);
      const matchFile = (rec.filename || '').toLowerCase().includes(q);
      return matchTitle || matchIssuer || matchSummary || matchOcr || matchFile;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">我的文件 / 辨識結果收集庫</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 flex items-center gap-3">
            <FolderKanban className="h-9 w-9 text-[#0f5c5c]" />
            <span>已收集的辨識結果（共 {historyData?.total || 0} 筆）</span>
          </h1>
          <p className="mt-1 text-base text-slate-600">
            系統會自動保存每一次上傳照片或測試範例的辨識結果，方便您隨時回顧、比對或匯出報表。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`${apiBase}/api/history/export/csv`}
            download="銀齡金融翻譯官_辨識結果彙整.csv"
            className="flex items-center gap-2 rounded-xl bg-[#0f5c5c] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0b4646] transition"
          >
            <Download className="h-4 w-4" />
            匯出 CSV 報表 (Excel 可開)
          </a>

          <a
            href={`${apiBase}/api/history/export/json`}
            download="銀齡金融翻譯官_辨識結果彙整.json"
            className="flex items-center gap-2 rounded-xl border border-[#0f5c5c] bg-white px-4 py-2.5 text-sm font-bold text-[#0f5c5c] hover:bg-teal-50 transition"
          >
            <Download className="h-4 w-4" />
            匯出 JSON
          </a>

          {records.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('確定要清空所有已收集的辨識紀錄嗎？')) {
                  onClearAll();
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 transition"
            >
              <Trash2 className="h-4 w-4" />
              清空全部
            </button>
          )}
        </div>
      </div>

      {/* Summary Filter Pills & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              filterType === 'all'
                ? 'bg-[#16383a] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            全部紀錄 ({historyData?.total || 0})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('upload')}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              filterType === 'upload'
                ? 'bg-[#0f5c5c] text-white'
                : 'bg-teal-50 text-[#0f5c5c] hover:bg-teal-100'
            }`}
          >
            📸 自訂上傳照片 ({historyData?.upload_count || 0})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('normal')}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              filterType === 'normal'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            ✓ 一般金融文件 ({historyData?.normal_count || 0})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('scam')}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              filterType === 'scam'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            ⚠️ 可疑防詐警示 ({historyData?.scam_count || 0})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋銀行、標題或內文關鍵字..."
            className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2 text-sm focus:border-[#0f5c5c] focus:outline-none"
          />
        </div>
      </div>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-sm border border-slate-200 space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e9f2f0] text-[#0f5c5c]">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">目前尚無符合條件的辨識紀錄</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            只要您上傳任何銀行通知 JPG 照片或點選範例文件進行辨識，系統就會自動將結果收集在這裡！
          </p>
          <button
            type="button"
            onClick={onUploadNewClick}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#0f5c5c] px-6 py-3 text-base font-bold text-white hover:bg-[#0b4646]"
          >
            <UploadCloud className="h-5 w-5" />
            前往上傳文件照片
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((rec) => {
            const isExpanded = expandedId === rec.record_id;
            const fq = rec.five_questions || {};

            return (
              <div
                key={rec.record_id}
                className={`overflow-hidden rounded-3xl bg-white shadow-sm border transition ${
                  rec.is_scam
                    ? 'border-rose-300 hover:border-rose-400'
                    : 'border-slate-200 hover:border-[#0f5c5c]'
                }`}
              >
                {/* Card Main Row */}
                <div className="p-6 flex flex-col md:flex-row gap-6 items-start">
                  {/* Left Thumbnail */}
                  <div
                    onClick={() => onOpenRecordInStep3(rec)}
                    className="group relative h-40 w-full md:w-36 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={rec.original_image_url}
                      alt={rec.doc_title}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 rounded-lg bg-black/75 px-2.5 py-1 text-xs font-bold text-white">
                        點擊開啟導讀
                      </span>
                    </div>
                  </div>

                  {/* Center Summary Info */}
                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {rec.source_type === 'upload' ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-[#0f5c5c] px-2.5 py-1 text-xs font-bold text-white">
                            <UploadCloud className="h-3.5 w-3.5" />
                            自訂上傳：{rec.filename}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-bold text-[#0f5c5c] border border-teal-200">
                            <Sparkles className="h-3.5 w-3.5" />
                            範例測試
                          </span>
                        )}

                        {rec.is_scam ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            可疑防詐警示
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {rec.doc_category}
                          </span>
                        )}

                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          發件單位：{rec.issuer}
                        </span>
                      </div>

                      <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        {rec.created_at}
                      </span>
                    </div>

                    <h3 className="text-2xl font-extrabold text-slate-900">
                      {rec.doc_title}
                    </h3>

                    <p className="text-lg font-medium text-slate-700">
                      {rec.summary_one_line}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-sm">
                      <span className="font-bold text-[#0f5c5c]">
                        👉 下一步：{rec.next_step_short}
                      </span>
                      <span className="font-bold text-rose-700">
                        ⏰ 期限：{rec.deadline}
                      </span>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenRecordInStep3(rec)}
                          className="flex items-center gap-1.5 rounded-xl bg-[#0f5c5c] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b4646] transition"
                        >
                          <Eye className="h-4 w-4" />
                          開啟完整導讀與語音畫面
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : rec.record_id)}
                          className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 transition"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              收起五題明細與 OCR 原文
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              展開五題問答與 OCR 原文
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteRecord(rec.record_id)}
                        className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                        刪除此筆
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Detail Drawer: 5 Questions + Checklist + Raw OCR */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/80 p-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-7 space-y-3">
                      <h4 className="text-sm font-extrabold text-[#16383a] uppercase tracking-wider">
                        固定五題白話導讀紀錄
                      </h4>
                      <div className="rounded-2xl bg-white p-4 border border-slate-200 divide-y divide-slate-100 text-sm">
                        <div className="py-2 grid grid-cols-1 sm:grid-cols-12 gap-1">
                          <span className="sm:col-span-4 font-bold text-[#0f5c5c]">① 這是什麼？</span>
                          <span className="sm:col-span-8 text-slate-800">{fq.what_is_it}</span>
                        </div>
                        <div className="py-2 grid grid-cols-1 sm:grid-cols-12 gap-1">
                          <span className="sm:col-span-4 font-bold text-[#0f5c5c]">② 要處理嗎？期限？</span>
                          <span className="sm:col-span-8 font-bold text-rose-700">{fq.need_action_and_deadline}</span>
                        </div>
                        <div className="py-2 grid grid-cols-1 sm:grid-cols-12 gap-1">
                          <span className="sm:col-span-4 font-bold text-[#0f5c5c]">③ 去哪裡、帶什麼？</span>
                          <span className="sm:col-span-8 text-slate-800">{fq.where_and_what_to_bring}</span>
                        </div>
                        <div className="py-2 grid grid-cols-1 sm:grid-cols-12 gap-1">
                          <span className="sm:col-span-4 font-bold text-[#0f5c5c]">④ 哪裡要簽名？</span>
                          <span className="sm:col-span-8 text-slate-800">{fq.where_to_sign}</span>
                        </div>
                        <div className="pt-2 grid grid-cols-1 sm:grid-cols-12 gap-1">
                          <span className="sm:col-span-4 font-bold text-[#0f5c5c]">⑤ 注意事項：</span>
                          <span className="sm:col-span-8 text-slate-800">{fq.important_notes}</span>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 space-y-3">
                      <h4 className="text-sm font-extrabold text-[#16383a] uppercase tracking-wider">
                        照片 OCR 辨識出的原文內容（已遮罩個資）
                      </h4>
                      <div className="rounded-2xl bg-white p-4 border border-slate-200 text-xs text-slate-700 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto">
                        {rec.masked_ocr_text || rec.raw_ocr_text || '（無文字紀錄）'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
