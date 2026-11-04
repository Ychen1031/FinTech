import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Upload,
  Volume2,
  VolumeX,
  Share2,
  ShieldAlert,
  CheckSquare,
  Square,
  FileText,
  Sparkles,
  Eye,
  EyeOff,
  Users,
  MapPin,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Type,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  MessageSquareHeart
} from 'lucide-react';
import CameraModal from './components/CameraModal';
import FamilyGuardianModal from './components/FamilyGuardianModal';
import ScamQuickCheckerModal from './components/ScamQuickCheckerModal';

const API_BASE = 'http://127.0.0.1:8001';

export default function App() {
  // 步驟狀態: 1 = 01 上傳文件, 2 = 02 辨識內容, 3 = 03 導讀與行動
  const [currentStep, setCurrentStep] = useState(1);
  // 畫面 3/4/5 分頁狀態: 'guide' (白話導讀) | 'steps' (辦理步驟) | 'checklist' (應備資料)
  const [activeTab, setActiveTab] = useState('guide');

  // 大字友善字體縮放: 'normal' | 'large' | 'xlarge'
  const [fontScale, setFontScale] = useState('large');

  // 範例清單與目前解析結果
  const [samples, setSamples] = useState([]);
  const [currentDocResult, setCurrentDocResult] = useState(null);
  const [uploadingPreviewUrl, setUploadingPreviewUrl] = useState('');
  const [uploadingFilename, setUploadingFilename] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  // 圖片檢視設定：是否顯示重點與簽名紅框、是否檢視個資遮罩圖層、是否展開 OCR 原文
  const [showHighlights, setShowHighlights] = useState(true);
  const [showMaskedImage, setShowMaskedImage] = useState(false);
  const [showOcrText, setShowOcrText] = useState(false);

  // 應備資料勾選狀態
  const [checkedItems, setCheckedItems] = useState({});
  const [checklistConfirmed, setChecklistConfirmed] = useState(false);

  // 可疑通知畫面下，是否展開檢視五題詳細問答
  const [showScamDetailGuide, setShowScamDetailGuide] = useState(false);

  // 語音朗讀狀態 (Web Speech API)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechLangMode, setSpeechLangMode] = useState('mandarin'); // 'mandarin' | 'taiwanese'
  const [speechRate, setSpeechRate] = useState(0.82); // 預設慢速朗讀適合長輩

  // 家屬守護網與彈窗狀態
  const [familyDashboard, setFamilyDashboard] = useState({
    guardians: [],
    notifications: [],
    metrics: {}
  });
  const [shareSuccessBanner, setShareSuccessBanner] = useState('');
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isScamCheckerOpen, setIsScamCheckerOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const fileInputRef = useRef(null);

  // 初始載入範例清單與家屬守護看板
  useEffect(() => {
    fetchSamples();
    fetchFamilyDashboard();
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const fetchSamples = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/samples`);
      const data = await res.json();
      setSamples(data.samples || []);
    } catch (err) {
      console.error('Failed to load samples:', err);
    }
  };

  const fetchFamilyDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/family/dashboard`);
      const data = await res.json();
      setFamilyDashboard(data);
    } catch (err) {
      console.error('Failed to load family dashboard:', err);
    }
  };

  // 停止語音
  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // 播放國語或台語口語導讀
  const handleSpeak = (mode = speechLangMode) => {
    if (!currentDocResult?.analysis) return;
    if (!window.speechSynthesis) {
      alert('您的瀏覽器不支援語音合成功能');
      return;
    }

    window.speechSynthesis.cancel();
    setSpeechLangMode(mode);

    const ttsData = currentDocResult.analysis.tts || {};
    const textToRead =
      mode === 'taiwanese'
        ? ttsData.taiwanese || currentDocResult.analysis.summary_one_line
        : ttsData.mandarin || currentDocResult.analysis.summary_one_line;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'zh-TW';
    utterance.rate = speechRate;
    utterance.pitch = mode === 'taiwanese' ? 0.95 : 1.0;

    const voices = window.speechSynthesis.getVoices();
    const twVoice =
      voices.find((v) => v.lang.includes('zh-TW') && v.name.includes('Meijia')) ||
      voices.find((v) => v.lang.includes('zh-TW')) ||
      voices.find((v) => v.lang.includes('zh'));
    if (twVoice) {
      utterance.voice = twVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // 啟動步驟 02 辨識動畫並切換至步驟 03
  const runStep2Transition = (resultData, targetTab = 'guide') => {
    stopSpeaking();
    setCurrentDocResult(resultData);
    setCheckedItems({});
    setChecklistConfirmed(false);
    setShowScamDetailGuide(false);
    setShareSuccessBanner('');
    setUploadError('');
    setActiveTab(targetTab);
    setCurrentStep(2);
    setLoadingStepIndex(1);

    setTimeout(() => setLoadingStepIndex(2), 450);
    setTimeout(() => setLoadingStepIndex(3), 900);
    setTimeout(() => {
      setCurrentStep(3);
      fetchFamilyDashboard();
    }, 1350);
  };

  // 載入並分析內建範例文件
  const handleSelectSample = async (docId, simulateDark = false, directStep3 = false, targetTab = 'guide') => {
    setUploadError('');
    try {
      const res = await fetch(`${API_BASE}/api/analyze/sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: docId,
          simulate_dark: simulateDark,
          api_key: apiKey || null
        })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (directStep3) {
        stopSpeaking();
        setCurrentDocResult(data);
        setCheckedItems({});
        setChecklistConfirmed(false);
        setShowScamDetailGuide(false);
        setShareSuccessBanner('');
        setActiveTab(targetTab);
        setCurrentStep(3);
        fetchFamilyDashboard();
      } else {
        runStep2Transition(data, targetTab);
      }
    } catch (err) {
      console.error('Sample analyze failed:', err);
      setUploadError('無法連線至後端 Python 服務，請確認後端 (Port 8000) 已啟動。');
    }
  };

  // 處理實際檔案上傳（支援任意 JPG / PNG / WEBP 網路範例圖或手機照片）
  const handleFileUpload = async (file) => {
    if (!file) return;
    stopSpeaking();
    setUploadError('');

    // 1. 立即建立本地預覽圖並跳轉至步驟 02，讓使用者立刻看到自己上傳的 JPG！
    const localUrl = URL.createObjectURL(file);
    setUploadingPreviewUrl(localUrl);
    setUploadingFilename(file.name || '上傳的文件照片.jpg');
    setCurrentStep(2);
    setLoadingStepIndex(1);

    const progressTimer = setTimeout(() => setLoadingStepIndex(2), 600);

    const formData = new FormData();
    formData.append('file', file);
    if (apiKey) {
      formData.append('api_key', apiKey);
    }

    try {
      const res = await fetch(`${API_BASE}/api/analyze/upload`, {
        method: 'POST',
        body: formData
      });
      clearTimeout(progressTimer);

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `上傳解析失敗 (HTTP ${res.status})`);
      }

      const data = await res.json();
      setLoadingStepIndex(3);
      setCurrentDocResult(data);
      setCheckedItems({});
      setChecklistConfirmed(false);
      setShowScamDetailGuide(false);
      setShareSuccessBanner('');
      setActiveTab('guide');

      setTimeout(() => {
        setCurrentStep(3);
        fetchFamilyDashboard();
      }, 650);
    } catch (err) {
      clearTimeout(progressTimer);
      console.error('Upload analyze failed:', err);
      setUploadError(`照片上傳或辨識時發生錯誤：${err.message}`);
      setCurrentStep(1);
    }
  };

  // 分享給家人或請家人協助確認
  const handleNotifyFamily = async (customNote = '') => {
    if (!currentDocResult?.analysis) return;
    const { analysis } = currentDocResult;
    try {
      const res = await fetch(`${API_BASE}/api/family/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_title: analysis.doc_title,
          doc_category: analysis.doc_category,
          is_scam: analysis.is_scam,
          summary: analysis.summary_one_line,
          suspicious_demands: analysis.scam_analysis?.suspicious_demands || [],
          custom_note: customNote
        })
      });
      const data = await res.json();
      if (data.notification) {
        setShareSuccessBanner(
          analysis.is_scam
            ? `已緊急推播通知家屬（${data.notification.recipients.join('、')}）協助把關！可點右上角「家屬守護端」查看或模擬家屬回覆。`
            : `已將「${analysis.doc_title}」導讀重點與應備清單傳送給家人（${data.notification.recipients.join('、')}）！`
        );
        fetchFamilyDashboard();
      }
    } catch (err) {
      console.error('Notify family failed:', err);
    }
  };

  // 家屬回覆處理
  const handleReplyNotification = async (notifId, sender, message) => {
    try {
      await fetch(`${API_BASE}/api/family/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notif_id: notifId, sender, message })
      });
      fetchFamilyDashboard();
    } catch (err) {
      console.error('Reply failed:', err);
    }
  };

  // 新增家屬守護聯絡人
  const handleAddGuardian = async (guardianInfo) => {
    try {
      await fetch(`${API_BASE}/api/family/guardians`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guardianInfo)
      });
      fetchFamilyDashboard();
    } catch (err) {
      console.error('Add guardian failed:', err);
    }
  };

  // 切換字體大小
  const cycleFontScale = () => {
    if (fontScale === 'normal') setFontScale('large');
    else if (fontScale === 'large') setFontScale('xlarge');
    else setFontScale('normal');
  };

  const fontScaleLabel =
    fontScale === 'xlarge' ? '超大字體' : fontScale === 'large' ? '特大字體' : '標準大字';

  const analysis = currentDocResult?.analysis;
  const preprocessing = currentDocResult?.preprocessing;
  const displayImageUrl = showMaskedImage
    ? preprocessing?.masked_image_url
    : preprocessing?.enhanced_image_url || currentDocResult?.original_image_url || uploadingPreviewUrl;

  // 找出與當前文件對應的最新家屬回覆
  const matchingFamilyNotification = familyDashboard.notifications?.find(
    (n) => analysis && n.doc_title === analysis.doc_title && n.family_reply
  );

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#f3f5f4] text-slate-800 senior-scale-${fontScale}`}
    >
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3.5 shadow-sm">
        <div
          onClick={() => {
            stopSpeaking();
            setCurrentStep(1);
          }}
          className="flex cursor-pointer items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f5c5c] text-xl font-extrabold text-white shadow-sm">
            銀
          </div>
          <div>
            <span className="text-2xl font-extrabold tracking-tight text-[#16383a]">
              銀齡金融翻譯官
            </span>
            <span className="ml-3 hidden rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-[#0f5c5c] md:inline-block">
              高齡者金融文件 AI 導讀與行動指引服務
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={cycleFontScale}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 transition"
            title="點擊切換字體大小"
          >
            <Type className="h-4 w-4 text-[#0f5c5c]" />
            字級：{fontScaleLabel}
          </button>

          <button
            type="button"
            onClick={() => setIsScamCheckerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/70 px-3.5 py-2 text-sm font-bold text-[#0f5c5c] hover:bg-teal-100 transition"
          >
            <SlidersHorizontal className="h-4 w-4" />
            防詐規則庫＆AI設定
          </button>

          <button
            type="button"
            onClick={() => setIsFamilyModalOpen(true)}
            className="relative flex items-center gap-2 rounded-xl bg-[#16383a] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#0f5c5c] transition"
          >
            <Users className="h-4 w-4 text-teal-200" />
            <span>家屬守護端</span>
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-extrabold text-slate-950">
              {familyDashboard.notifications?.length || 1}
            </span>
          </button>

          <div className="hidden rounded-xl bg-[#fdf3d7] px-4 py-2 text-sm font-bold text-[#8a6116] lg:block">
            概念展示・圖片導讀
          </div>
        </div>
      </header>

      {/* Main Layout: Left Sidebar (#16383a) + Right Content Area (#f3f5f4) */}
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left Sidebar */}
        <aside className="flex w-full flex-col justify-between bg-[#16383a] p-5 text-white md:w-64 lg:w-72 shrink-0">
          <nav className="space-y-3">
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setCurrentStep(1);
              }}
              className={`flex w-full items-center gap-3.5 rounded-2xl px-4 py-4 text-left text-lg font-bold transition ${
                currentStep === 1
                  ? 'bg-[#265356] text-white shadow-inner'
                  : 'text-teal-100/75 hover:bg-white/5'
              }`}
            >
              <span className="text-base font-semibold text-teal-300">01</span>
              <span>上傳文件</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentDocResult || uploadingPreviewUrl) setCurrentStep(2);
              }}
              className={`flex w-full items-center gap-3.5 rounded-2xl px-4 py-4 text-left text-lg font-bold transition ${
                currentStep === 2
                  ? 'bg-[#265356] text-white shadow-inner'
                  : 'text-teal-100/75 hover:bg-white/5'
              }`}
            >
              <span className="text-base font-semibold text-teal-300">02</span>
              <span>辨識內容</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentDocResult) setCurrentStep(3);
                else handleSelectSample('bank_kyc', false, true, 'guide');
              }}
              className={`flex w-full items-center gap-3.5 rounded-2xl px-4 py-4 text-left text-lg font-bold transition ${
                currentStep === 3
                  ? 'bg-[#265356] text-white shadow-inner'
                  : 'text-teal-100/75 hover:bg-white/5'
              }`}
            >
              <span className="text-base font-semibold text-teal-300">03</span>
              <span>導讀與行動</span>
            </button>
          </nav>

          {/* Bottom Sidebar Controls */}
          <div className="mt-8 border-t border-teal-800/80 pt-5 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-300/80">
                操作示範（快速切換計畫書畫面）
              </p>
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    setCurrentStep(1);
                  }}
                  className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                    currentStep === 1
                      ? 'bg-teal-500/25 text-white border border-teal-400/40'
                      : 'text-teal-100/80 hover:bg-white/10'
                  }`}
                >
                  畫面 1：上傳文件首頁
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample('bank_kyc', false, false, 'guide')}
                  className="rounded-xl px-3 py-2 text-left text-sm font-medium text-teal-100/80 hover:bg-white/10 transition"
                >
                  畫面 2：辨識內容（進度展示）
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample('bank_kyc', false, true, 'guide')}
                  className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                    currentStep === 3 &&
                    currentDocResult?.document_id === 'bank_kyc' &&
                    activeTab === 'guide'
                      ? 'bg-teal-500/25 text-white border border-teal-400/40'
                      : 'text-teal-100/80 hover:bg-white/10'
                  }`}
                >
                  畫面 3：白話導讀（客戶審查）
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample('bank_kyc', false, true, 'steps')}
                  className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                    currentStep === 3 &&
                    currentDocResult?.document_id === 'bank_kyc' &&
                    activeTab === 'steps'
                      ? 'bg-teal-500/25 text-white border border-teal-400/40'
                      : 'text-teal-100/80 hover:bg-white/10'
                  }`}
                >
                  畫面 4：辦理步驟（編號指引）
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample('bank_kyc', false, true, 'checklist')}
                  className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                    currentStep === 3 &&
                    currentDocResult?.document_id === 'bank_kyc' &&
                    activeTab === 'checklist'
                      ? 'bg-teal-500/25 text-white border border-teal-400/40'
                      : 'text-teal-100/80 hover:bg-white/10'
                  }`}
                >
                  畫面 5：應備資料檢查清單
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample('scam_urgent_account', false, true, 'guide')}
                  className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                    currentStep === 3 && currentDocResult?.document_id === 'scam_urgent_account'
                      ? 'bg-rose-500/30 text-rose-100 border border-rose-400/40'
                      : 'text-amber-200/90 hover:bg-white/10'
                  }`}
                >
                  畫面 6：可疑通知警示（防詐）
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample('insurance_maturity', false, true, 'guide')}
                  className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                    currentStep === 3 && currentDocResult?.document_id === 'insurance_maturity'
                      ? 'bg-teal-500/25 text-white border border-teal-400/40'
                      : 'text-teal-100/80 hover:bg-white/10'
                  }`}
                >
                  儲蓄險保單到期通知（五題範例）
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample('credit_card_bill', false, true, 'guide')}
                  className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                    currentStep === 3 && currentDocResult?.document_id === 'credit_card_bill'
                      ? 'bg-teal-500/25 text-white border border-teal-400/40'
                      : 'text-teal-100/80 hover:bg-white/10'
                  }`}
                >
                  信用卡對帳單暨繳費通知
                </button>
              </div>
            </div>

            <div className="pt-2 text-sm text-teal-100/85 space-y-1">
              <button
                type="button"
                onClick={cycleFontScale}
                className="block font-semibold hover:text-white"
              >
                大字友善介面（目前：{fontScaleLabel}）
              </button>
              <p className="text-xs text-teal-200/70">操作示範・高齡金融防護網</p>
            </div>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="flex-1 p-6 md:p-10 lg:p-12 max-w-6xl">
          {/* 錯誤提示橫幅 */}
          {uploadError && (
            <div className="mb-6 rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 text-rose-900 font-bold flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadError('')}
                className="rounded-lg bg-rose-200 px-3 py-1 text-xs font-extrabold text-rose-900"
              >
                關閉
              </button>
            </div>
          )}

          {/* =========================================================
              STEP 01: 畫面 1 上傳文件（支援直接選取 JPG/PNG、拖曳上傳、相機拍攝）
          ========================================================= */}
          {currentStep === 1 && (
            <div className="space-y-8">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">我的文件 / 新增文件</p>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                  今天想了解哪一份文件？
                </h1>
                <p className="mt-2 text-lg md:text-xl text-slate-600">
                  拍張照片，幫您整理重點與下一步。
                </p>
              </div>

              {/* 畫面 1 核心大按鈕白色卡片（同時支援拖放 JPG 圖片） */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer?.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="rounded-3xl bg-white p-10 md:p-14 shadow-sm border-2 border-dashed border-slate-200/90 hover:border-[#0f5c5c] transition flex flex-col items-center justify-center text-center"
              >
                <div className="mb-7 flex h-24 w-28 items-center justify-center rounded-2xl bg-[#e9f2f0] text-[#16383a]">
                  <Camera className="h-12 w-12 stroke-[2.2]" />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-xl justify-center">
                  {/* 直接開啟檔案選擇器讓使用者上傳網路下載的 JPG 圖片最直覺！ */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto min-w-[280px] rounded-2xl bg-[#0f5c5c] px-10 py-5 text-xl font-bold text-white shadow-md hover:bg-[#0b4646] transition transform active:scale-98"
                  >
                    拍攝或上傳文件 (JPG / PNG)
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border-2 border-[#0f5c5c] bg-white px-7 py-4.5 text-lg font-bold text-[#0f5c5c] hover:bg-teal-50 transition"
                  >
                    <Camera className="h-5 w-5" />
                    開啟框線引導相機
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) handleFileUpload(file);
                    }}
                  />
                </div>

                <p className="mt-4 text-sm text-slate-400">
                  可直接點選上方按鈕選擇電腦中的 JPG / PNG 圖片，或將圖片直接拖曳至此區塊
                </p>
              </div>

              <p className="text-center text-lg font-medium text-slate-600">
                支援銀行通知、帳單與保險文件（內建真實繁體中文 OCR 文字辨識與個資遮罩）
              </p>

              {/* 快速體驗範例卡片區 */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#0f5c5c]" />
                    或點選下方內建模擬文件直接體驗（包含計畫書所有展示情境）：
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {samples.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSample(item.id, false, false, 'guide')}
                      className={`group flex flex-col justify-between rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                        item.is_scam
                          ? 'border-rose-200 bg-rose-50/60 hover:border-rose-400'
                          : 'border-slate-200 bg-white hover:border-[#0f5c5c]'
                      }`}
                    >
                      <div>
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${
                            item.is_scam
                              ? 'bg-rose-600 text-white'
                              : 'bg-[#e9f2f0] text-[#0f5c5c]'
                          }`}
                        >
                          {item.badge}
                        </span>
                        <h3 className="mt-3 text-lg font-extrabold text-slate-900 group-hover:text-[#0f5c5c]">
                          {item.doc_title}
                        </h3>
                        <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">
                          {item.summary_one_line}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold text-[#0f5c5c]">
                        <span>{item.doc_category}</span>
                        <span className="flex items-center gap-1">
                          立即導讀 <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              STEP 02: 畫面 2 辨識內容 (正在整理您的文件 - 即使還在背景 OCR 也會立即顯示預覽圖！)
          ========================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">我的文件 / 新增文件</p>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                  正在整理您的文件
                </h1>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
                {/* 左側：剛上傳的 JPG 文件照片與掃描特效 */}
                <div className="lg:col-span-6 relative overflow-hidden rounded-3xl bg-white p-4 shadow-sm border border-slate-200">
                  <div className="relative overflow-hidden rounded-2xl">
                    <img
                      src={displayImageUrl}
                      alt="正在辨識的文件"
                      className="w-full max-h-[540px] object-contain mx-auto"
                    />
                    <div className="pointer-events-none absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#0f5c5c] to-transparent shadow-[0_0_16px_#0f5c5c] animate-scanline" />
                  </div>
                  {uploadingFilename && (
                    <p className="mt-2 text-center text-xs text-slate-500">
                      正在辨識檔案：{uploadingFilename}
                    </p>
                  )}
                </div>

                {/* 右側：進度條與步驟說明（完全對應畫面 2） */}
                <div className="lg:col-span-6 rounded-3xl bg-white p-8 md:p-10 shadow-sm border border-slate-200 space-y-6">
                  <h2 className="text-2xl font-extrabold text-slate-900">文件辨識進度</h2>

                  <div className="space-y-5 text-lg">
                    <div className="flex items-center gap-3 font-bold text-[#0f5c5c]">
                      <CheckCircle2 className="h-6 w-6 shrink-0" />
                      <span>✓ 已載入提供的照片（完成邊緣偵測與光線校正）</span>
                    </div>

                    <div
                      className={`flex items-center gap-3 font-bold transition ${
                        loadingStepIndex >= 2 ? 'text-[#0f5c5c]' : 'text-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="h-6 w-6 shrink-0" />
                      <span>辨識文件內容（繁體中文 OCR 擷取文字與個資遮罩）</span>
                    </div>

                    <div
                      className={`flex items-center gap-3 font-medium transition ${
                        loadingStepIndex >= 3 ? 'text-[#0f5c5c] font-bold' : 'text-slate-500'
                      }`}
                    >
                      <CheckCircle2 className="h-6 w-6 shrink-0" />
                      <span>整理日期、用途与辦理資訊（含 165 防詐比對）</span>
                    </div>
                  </div>

                  {/* 深青色進度條 */}
                  <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[#0f5c5c] transition-all duration-500"
                      style={{
                        width:
                          loadingStepIndex === 1
                            ? '40%'
                            : loadingStepIndex === 2
                            ? '78%'
                            : '100%'
                      }}
                    />
                  </div>

                  {currentDocResult && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="rounded-xl bg-[#0f5c5c] px-6 py-3 text-base font-bold text-white hover:bg-[#0b4646]"
                      >
                        直接查看導讀結果 →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              STEP 03: 畫面 3 白話導讀 / 畫面 4 辦理步驟 / 畫面 5 應備資料 / 畫面 6 可疑通知警示
          ========================================================= */}
          {currentStep === 3 && analysis && (
            <div className="space-y-6">
              {/* Top Breadcrumb & Title */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">我的文件 / 文件導讀</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1
                      className={`text-3xl md:text-4xl font-extrabold tracking-tight ${
                        analysis.is_scam ? 'text-[#963b22]' : 'text-slate-900'
                      }`}
                    >
                      {analysis.is_scam
                        ? `另一情境：${analysis.doc_title}`
                        : analysis.doc_title}
                    </h1>
                    <span className="rounded-xl bg-teal-100 px-3 py-1 text-xs font-bold text-[#0f5c5c]">
                      發件單位：{analysis.issuer}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl bg-[#0f5c5c] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b4646]"
                  >
                    <Upload className="h-4 w-4" />
                    上傳另一張 JPG 照片
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopSpeaking();
                      setCurrentStep(1);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    返回首頁
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) handleFileUpload(file);
                    }}
                  />
                </div>
              </div>

              {/* 家屬已回覆安心橫幅 */}
              {matchingFamilyNotification?.family_reply && (
                <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-4 shadow-sm flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <MessageSquareHeart className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-emerald-950">
                        家人守護回覆：{matchingFamilyNotification.family_reply.sender}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">
                        （{matchingFamilyNotification.family_reply.time}）
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-emerald-900">
                      「{matchingFamilyNotification.family_reply.message}」
                    </p>
                  </div>
                </div>
              )}

              {/* 分享成功提示橫幅 */}
              {shareSuccessBanner && (
                <div className="rounded-2xl bg-teal-900 text-white p-4 shadow-md flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 font-bold">
                    <CheckCircle2 className="h-6 w-6 text-emerald-300 shrink-0" />
                    <span>{shareSuccessBanner}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFamilyModalOpen(true)}
                    className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amber-300"
                  >
                    開啟家屬守護端查看
                  </button>
                </div>
              )}

              {/* 左右雙欄主畫面 */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
                {/* 左側：文件影像與原文位置對照 (佔 5 欄) */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="overflow-hidden rounded-3xl bg-white p-4 shadow-sm border border-slate-200">
                    {/* 圖片上方工具列 */}
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setShowHighlights(!showHighlights)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          showHighlights
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {showHighlights ? '已標示簽名與期限位置' : '顯示簽名與重點位置'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowMaskedImage(!showMaskedImage)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          showMaskedImage
                            ? 'bg-[#16383a] text-white'
                            : 'bg-teal-50 text-[#0f5c5c] border border-teal-200'
                        }`}
                      >
                        {showMaskedImage ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            目前顯示：個資遮罩圖層
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            檢視雲端個資遮罩效果
                          </>
                        )}
                      </button>
                    </div>

                    {/* 圖片容器 */}
                    <div className="relative mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      <img
                        src={displayImageUrl}
                        alt={analysis.doc_title}
                        className="w-full h-auto block"
                      />

                      {/* 動態繪製原文位置與簽名紅框 */}
                      {showHighlights &&
                        (analysis.highlights || []).map((hl, index) => {
                          const isSig = hl.type === 'signature';
                          const isDanger = hl.type === 'danger';
                          return (
                            <div
                              key={index}
                              style={{
                                left: `${hl.x * 100}%`,
                                top: `${hl.y * 100}%`,
                                width: `${hl.w * 100}%`,
                                height: `${hl.h * 100}%`
                              }}
                              className={`absolute rounded-lg border-2 transition-all pointer-events-none ${
                                isDanger
                                  ? 'border-rose-600 bg-rose-500/15 shadow-[0_0_10px_rgba(225,29,72,0.4)]'
                                  : isSig
                                  ? 'border-rose-600 bg-amber-300/20 shadow-[0_0_12px_rgba(225,29,72,0.5)]'
                                  : 'border-[#0f5c5c] bg-teal-400/15'
                              }`}
                            >
                              <span
                                className={`absolute -top-6 left-0 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-extrabold text-white shadow ${
                                  isDanger || isSig ? 'bg-rose-600' : 'bg-[#0f5c5c]'
                                }`}
                              >
                                {hl.label}
                              </span>
                            </div>
                          );
                        })}
                    </div>

                    {/* 影像前處理與 OCR 原文展開按鈕 */}
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200/80 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1 font-bold text-[#0f5c5c]">
                        <span>✓ 邊緣自動校正完成</span>
                        <span>✓ 亮度：{preprocessing?.metrics?.brightness || 180}</span>
                        <button
                          type="button"
                          onClick={() => setShowOcrText(!showOcrText)}
                          className="underline text-teal-900 hover:text-teal-700"
                        >
                          {showOcrText ? '收起 OCR 辨識原文 ▲' : '檢視照片 OCR 辨識原文 ▼'}
                        </button>
                      </div>

                      {showOcrText && (
                        <div className="rounded-lg bg-white p-2.5 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                          {analysis.masked_ocr_text || analysis.raw_ocr_text || '（無文字內容）'}
                        </div>
                      )}

                      {preprocessing?.warnings?.length > 0 && (
                        <p className="text-amber-700 font-semibold">
                          💡 {preprocessing.warnings.join(' ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 右側：導讀卡片或可疑通知防詐警示卡片 (佔 7 欄) */}
                <div className="lg:col-span-7">
                  {/* =======================================================
                      情境 A：可疑通知警示（畫面 6）
                  ======================================================= */}
                  {analysis.is_scam && !showScamDetailGuide ? (
                    <div className="rounded-3xl bg-white p-7 md:p-9 shadow-sm border border-rose-200 space-y-6">
                      <div className="rounded-2xl bg-[#fdede4] px-6 py-5 text-[#963b22] border border-rose-200/80">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-8 w-8 text-[#963b22] shrink-0" />
                          <h2 className="text-2xl md:text-3xl font-extrabold">
                            {analysis.scam_analysis?.headline || '請先停下，確認後再行動'}
                          </h2>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-lg font-bold text-slate-600">可疑要求</h3>
                        <div className="space-y-3">
                          {(analysis.scam_analysis?.suspicious_demands || []).map((demand, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2.5 text-2xl font-extrabold text-[#963b22]"
                            >
                              <span>!</span>
                              <span>{demand}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {analysis.scam_analysis?.matched_rules?.length > 0 && (
                        <div className="rounded-2xl bg-rose-50/70 p-4 border border-rose-200/70 space-y-2">
                          {analysis.scam_analysis.matched_rules.map((r) => (
                            <p key={r.rule_id} className="text-base text-slate-700">
                              <strong className="text-[#963b22]">• 防詐解析：</strong>
                              {r.description}
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1.5 pt-1">
                        <p className="text-xl font-bold text-slate-800">
                          請透過銀行官方管道查證（或撥打 165 反詐騙專線）。
                        </p>
                        <p className="text-base text-slate-500">
                          {analysis.scam_analysis?.disclaimer || '提醒不代表已完成真偽判定。'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            isSpeaking && speechLangMode === 'mandarin'
                              ? stopSpeaking()
                              : handleSpeak('mandarin')
                          }
                          className="flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2.5 text-base font-bold text-amber-950 hover:bg-amber-200 border border-amber-300"
                        >
                          {isSpeaking && speechLangMode === 'mandarin' ? (
                            <VolumeX className="h-5 w-5" />
                          ) : (
                            <Volume2 className="h-5 w-5" />
                          )}
                          {isSpeaking && speechLangMode === 'mandarin'
                            ? '停止朗讀'
                            : '國語語音警示'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            isSpeaking && speechLangMode === 'taiwanese'
                              ? stopSpeaking()
                              : handleSpeak('taiwanese')
                          }
                          className="flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2.5 text-base font-bold text-amber-950 hover:bg-amber-200 border border-amber-300"
                        >
                          {isSpeaking && speechLangMode === 'taiwanese' ? (
                            <VolumeX className="h-5 w-5" />
                          ) : (
                            <Volume2 className="h-5 w-5" />
                          )}
                          {isSpeaking && speechLangMode === 'taiwanese'
                            ? '停止朗讀'
                            : '台語語音警示（母語）'}
                        </button>

                        <a
                          href="tel:165"
                          className="flex items-center gap-2 rounded-xl bg-rose-100 px-4 py-2.5 text-base font-bold text-rose-900 hover:bg-rose-200 border border-rose-300"
                        >
                          <PhoneCall className="h-5 w-5" />
                          撥打 165 專線
                        </a>
                      </div>

                      <div className="pt-2 space-y-3">
                        <button
                          type="button"
                          onClick={() => handleNotifyFamily('長輩收到可疑緊急帳戶通知，請立即協助確認！')}
                          className="w-full rounded-2xl bg-[#0f5c5c] py-5 text-xl font-bold text-white shadow-md hover:bg-[#0b4646] transition"
                        >
                          請家人協助確認
                        </button>

                        <div className="flex justify-between items-center text-sm text-slate-500 pt-1">
                          <span>系統已自動將此高風險通知推播至家屬守護端</span>
                          <button
                            type="button"
                            onClick={() => setShowScamDetailGuide(true)}
                            className="font-bold text-[#0f5c5c] underline hover:text-[#0b4646]"
                          >
                            查看五題完整拆解 →
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* =======================================================
                        情境 B：一般金融文件導讀（畫面 3、4、5）
                    ======================================================= */
                    <div className="rounded-3xl bg-white p-7 md:p-9 shadow-sm border border-slate-200 space-y-7">
                      {analysis.is_scam && (
                        <div className="flex items-center justify-between rounded-xl bg-rose-100 px-4 py-2.5 text-sm font-bold text-rose-900">
                          <span>⚠️ 此為高度可疑通知，請勿依單據指示匯款！</span>
                          <button
                            type="button"
                            onClick={() => setShowScamDetailGuide(false)}
                            className="rounded-lg bg-rose-700 px-3 py-1 text-xs text-white"
                          >
                            返回防詐警示畫面
                          </button>
                        </div>
                      )}

                      {/* 頂部三個膠囊分頁（白話導讀 / 辦理步驟 / 應備資料） */}
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveTab('guide')}
                          className={`rounded-2xl py-3.5 text-lg font-bold transition ${
                            activeTab === 'guide'
                              ? 'bg-[#0f5c5c] text-white shadow-sm'
                              : 'bg-[#eff3f2] text-slate-700 hover:bg-slate-200/80'
                          }`}
                        >
                          白話導讀
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('steps')}
                          className={`rounded-2xl py-3.5 text-lg font-bold transition ${
                            activeTab === 'steps'
                              ? 'bg-[#0f5c5c] text-white shadow-sm'
                              : 'bg-[#eff3f2] text-slate-700 hover:bg-slate-200/80'
                          }`}
                        >
                          辦理步驟
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('checklist')}
                          className={`rounded-2xl py-3.5 text-lg font-bold transition ${
                            activeTab === 'checklist'
                              ? 'bg-[#0f5c5c] text-white shadow-sm'
                              : 'bg-[#eff3f2] text-slate-700 hover:bg-slate-200/80'
                          }`}
                        >
                          應備資料
                        </button>
                      </div>

                      {/* TAB 1: 畫面 3 白話導讀 + 固定五題格式 */}
                      {activeTab === 'guide' && (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <h2 className="text-2xl font-extrabold text-slate-900">
                              這張通知在說什麼？
                            </h2>
                            <p className="text-2xl font-medium text-slate-700 leading-relaxed">
                              {analysis.summary_one_line}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-[#e9f2f0] p-6 space-y-2 border border-teal-200/60">
                            <p className="text-base font-bold text-[#0f5c5c]">下一步</p>
                            <p className="text-2xl font-extrabold text-slate-900">
                              {analysis.next_step_short}
                            </p>
                          </div>

                          <p className="text-xl font-bold text-slate-800">
                            期限：{analysis.deadline}
                          </p>

                          {/* 固定五題白話問答表 */}
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-3.5">
                            <div className="flex items-center justify-between">
                              <h3 className="text-base font-extrabold text-[#16383a] flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-[#0f5c5c]" />
                                長輩最關心的五件事（固定五題格式）：
                              </h3>
                              <span className="text-xs font-semibold text-slate-500">
                                {analysis.engine_mode === 'real_tesseract_ocr_engine'
                                  ? '✓ 已由照片真實 OCR 辨識產生'
                                  : 'AI 結構化導讀'}
                              </span>
                            </div>

                            <div className="divide-y divide-slate-200/80 text-base">
                              <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-1">
                                <span className="sm:col-span-4 font-bold text-[#0f5c5c]">
                                  ① 這張單子是什麼？
                                </span>
                                <span className="sm:col-span-8 font-medium text-slate-800">
                                  {analysis.five_questions?.what_is_it}
                                </span>
                              </div>
                              <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-1">
                                <span className="sm:col-span-4 font-bold text-[#0f5c5c]">
                                  ② 要不要處理？期限？
                                </span>
                                <span className="sm:col-span-8 font-bold text-rose-700">
                                  {analysis.five_questions?.need_action_and_deadline}
                                </span>
                              </div>
                              <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-1">
                                <span className="sm:col-span-4 font-bold text-[#0f5c5c]">
                                  ③ 要去哪裡、帶什麼？
                                </span>
                                <span className="sm:col-span-8 font-medium text-slate-800">
                                  {analysis.five_questions?.where_and_what_to_bring}
                                </span>
                              </div>
                              <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-1">
                                <span className="sm:col-span-4 font-bold text-[#0f5c5c]">
                                  ④ 哪裡要簽名？
                                </span>
                                <span className="sm:col-span-8 font-semibold text-slate-900">
                                  {analysis.five_questions?.where_to_sign}
                                </span>
                              </div>
                              <div className="pt-2.5 grid grid-cols-1 sm:grid-cols-12 gap-1">
                                <span className="sm:col-span-4 font-bold text-[#0f5c5c]">
                                  ⑤ 有什麼要注意？
                                </span>
                                <span className="sm:col-span-8 font-medium text-slate-800">
                                  {analysis.five_questions?.important_notes}
                                </span>
                              </div>
                            </div>
                          </div>

                          {isSpeaking && (
                            <div className="rounded-2xl bg-amber-50 border border-amber-300 p-4 text-base font-bold text-amber-950 flex items-start gap-3">
                              <Volume2 className="h-6 w-6 text-amber-600 shrink-0 animate-pulse mt-0.5" />
                              <div>
                                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 block mb-1">
                                  正在為您慢速朗讀（{speechLangMode === 'taiwanese' ? '台語口語導讀' : '國語導讀'}）：
                                </span>
                                <p>
                                  {speechLangMode === 'taiwanese'
                                    ? analysis.tts?.taiwanese
                                    : analysis.tts?.mandarin}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                            <button
                              type="button"
                              onClick={() =>
                                isSpeaking && speechLangMode === 'mandarin'
                                  ? stopSpeaking()
                                  : handleSpeak('mandarin')
                              }
                              className="flex items-center justify-center gap-2.5 rounded-2xl bg-[#0f5c5c] py-4.5 px-6 text-xl font-bold text-white shadow-sm hover:bg-[#0b4646] transition"
                            >
                              {isSpeaking && speechLangMode === 'mandarin' ? (
                                <>
                                  <VolumeX className="h-6 w-6" />
                                  停止語音
                                </>
                              ) : (
                                <>
                                  <Volume2 className="h-6 w-6" />
                                  聽語音（國語）
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveTab('steps')}
                              className="flex items-center justify-center gap-2 rounded-2xl bg-[#eff3f2] py-4.5 px-6 text-xl font-bold text-slate-800 hover:bg-slate-200 transition"
                            >
                              查看辦理步驟
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  isSpeaking && speechLangMode === 'taiwanese'
                                    ? stopSpeaking()
                                    : handleSpeak('taiwanese')
                                }
                                className="flex items-center gap-1.5 rounded-xl bg-amber-100/90 px-4 py-2.5 text-sm font-bold text-amber-950 hover:bg-amber-200"
                              >
                                <Volume2 className="h-4 w-4" />
                                {isSpeaking && speechLangMode === 'taiwanese'
                                  ? '停止台語朗讀'
                                  : '台語口語導讀'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setSpeechRate((r) => (r === 0.82 ? 0.65 : r === 0.65 ? 1.0 : 0.82))
                                }
                                className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                              >
                                語速：{speechRate === 0.65 ? '極慢速' : speechRate === 0.82 ? '慢速（推薦長輩）' : '標準'}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleNotifyFamily()}
                              className="flex items-center gap-2 rounded-xl border-2 border-[#0f5c5c] bg-white px-4 py-2 text-sm font-bold text-[#0f5c5c] hover:bg-teal-50"
                            >
                              <Share2 className="h-4 w-4" />
                              分享給家人
                            </button>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: 畫面 4 辦理步驟 */}
                      {activeTab === 'steps' && (
                        <div className="space-y-6">
                          <div className="space-y-6">
                            {(analysis.action_steps || []).map((step) => (
                              <div key={step.step_num} className="flex items-start gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dcf0ec] text-xl font-extrabold text-[#0f5c5c]">
                                  {step.step_num}
                                </div>
                                <div className="space-y-1">
                                  <h3 className="text-2xl font-extrabold text-slate-900">
                                    {step.title}
                                  </h3>
                                  <p className="text-xl font-medium text-slate-600">
                                    {step.detail}
                                  </p>
                                  {step.source_note && (
                                    <p className="text-xs font-semibold text-teal-800/80">
                                      📍 {step.source_note}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="rounded-2xl bg-[#e9f2f0] p-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 text-base font-bold text-[#16383a]">
                              <MapPin className="h-5 w-5 text-[#0f5c5c]" />
                              <span>需要前往附近分行或服務據點辦理嗎？</span>
                            </div>
                            <a
                              href={`https://www.google.com/maps/search/${encodeURIComponent(
                                analysis.issuer.split('（')[0] + ' 分行'
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl bg-[#0f5c5c] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b4646]"
                            >
                              開啟地圖導航前往 →
                            </a>
                          </div>

                          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-base text-slate-500">
                              資料來源：左側照片；日期需另確認
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveTab('checklist')}
                              className="rounded-xl bg-[#0f5c5c] px-5 py-2.5 text-base font-bold text-white hover:bg-[#0b4646]"
                            >
                              下一步：勾選應備資料 →
                            </button>
                          </div>
                        </div>
                      )}

                      {/* TAB 3: 畫面 5 應備資料檢查清單 */}
                      {activeTab === 'checklist' && (
                        <div className="space-y-6">
                          <h2 className="text-2xl font-extrabold text-slate-900">
                            出門前，逐項確認
                          </h2>

                          <div className="space-y-4">
                            {(analysis.checklist || []).map((item) => {
                              const isChecked = !!checkedItems[item.id];
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setCheckedItems((prev) => ({
                                      ...prev,
                                      [item.id]: !prev[item.id]
                                    }));
                                    setChecklistConfirmed(false);
                                  }}
                                  className={`flex w-full items-start gap-4 rounded-2xl border-2 p-5 text-left transition ${
                                    isChecked
                                      ? 'border-[#0f5c5c] bg-[#e9f2f0]/60'
                                      : 'border-slate-200 bg-[#f8faf9] hover:border-teal-300'
                                  }`}
                                >
                                  {isChecked ? (
                                    <CheckSquare className="h-7 w-7 text-[#0f5c5c] shrink-0 mt-0.5" />
                                  ) : (
                                    <Square className="h-7 w-7 text-slate-400 shrink-0 mt-0.5" />
                                  )}
                                  <div>
                                    <span className="text-xl font-bold text-slate-900 block">
                                      {item.label}
                                    </span>
                                    {item.hint && (
                                      <span className="text-sm text-slate-600 mt-1 block">
                                        {item.hint}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <p className="text-lg font-medium text-slate-600">
                            依身分別確認所需證明文件。
                          </p>

                          {checklistConfirmed && (
                            <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-4 text-emerald-950 font-bold flex items-center justify-between">
                              <span>
                                🎉 太棒了！您已確認所有應備資料，出門辦理不必擔心少帶東西、少跑一趟銀行！
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleNotifyFamily('我已經逐項確認好應備資料，準備出門辦理囉！')
                                }
                                className="rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs text-white shrink-0 ml-2"
                              >
                                順便通知家人
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const allChecked = {};
                              (analysis.checklist || []).forEach((i) => {
                                allChecked[i.id] = true;
                              });
                              setCheckedItems(allChecked);
                              setChecklistConfirmed(true);
                            }}
                            className="w-full rounded-2xl bg-[#0f5c5c] py-5 text-xl font-bold text-white shadow-sm hover:bg-[#0b4646] transition"
                          >
                            我已確認資料
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer Note */}
          <footer className="mt-10 pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <span>
              銀齡金融翻譯官｜高齡者金融文件 AI 導讀與行動指引服務
            </span>
            <span className="font-medium text-[#0f5c5c]">
              ● 後端 Python FastAPI 服務已連線（內建真實 Tesseract 繁中 OCR、個資遮罩與防詐比對）
            </span>
          </footer>
        </main>
      </div>

      {/* Modals */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCaptureSample={(docId, simulateDark) => handleSelectSample(docId, simulateDark, false, 'guide')}
        onUploadFile={(file) => handleFileUpload(file)}
      />

      <FamilyGuardianModal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        dashboardData={familyDashboard}
        onReplyNotification={handleReplyNotification}
        onAddGuardian={handleAddGuardian}
      />

      <ScamQuickCheckerModal
        isOpen={isScamCheckerOpen}
        onClose={() => setIsScamCheckerOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />
    </div>
  );
}
