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
  MessageSquareHeart,
  FolderKanban,
  Clock,
  Edit3
} from 'lucide-react';
import CameraModal from './components/CameraModal';
import FamilyGuardianModal from './components/FamilyGuardianModal';
import ScamQuickCheckerModal from './components/ScamQuickCheckerModal';
import HistoryVaultView from './components/HistoryVaultModal';
import EditRecordModal from './components/EditRecordModal';

const API_BASE = 'http://127.0.0.1:8001';

export default function App() {
  // 步驟狀態: 1 = 01 上傳文件, 2 = 02 辨識內容, 3 = 03 導讀與行動, 4 = 04 辨識結果收集庫
  const [currentStep, setCurrentStep] = useState(1);
  // 畫面 3/4/5 分頁狀態: 'guide' (白話導讀) | 'steps' (辦理步驟) | 'checklist' (應備資料)
  const [activeTab, setActiveTab] = useState('guide');

  // 大字友善字體縮放: 'normal' | 'large' | 'xlarge'
  const [fontScale, setFontScale] = useState('large');

  // 範例清單、目前解析結果與歷史收集庫
  const [samples, setSamples] = useState([]);
  const [currentDocResult, setCurrentDocResult] = useState(null);
  const [historyData, setHistoryData] = useState({
    total: 0,
    upload_count: 0,
    scam_count: 0,
    normal_count: 0,
    records: []
  });

  const [uploadingPreviewUrl, setUploadingPreviewUrl] = useState('');
  const [uploadingFilename, setUploadingFilename] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [scanSessionKey, setScanSessionKey] = useState(1);
  const [scanElapsedSec, setScanElapsedSec] = useState(0);
  const [newFileBanner, setNewFileBanner] = useState('');

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
  const [editingRecord, setEditingRecord] = useState(null);
  const [apiKey, setApiKeyState] = useState(() => {
    try {
      return (
        localStorage.getItem('silver_finance_api_key') ||
        import.meta.env.VITE_GEMINI_API_KEY ||
        ''
      );
    } catch {
      return import.meta.env.VITE_GEMINI_API_KEY || '';
    }
  });

  const setApiKey = (val) => {
    setApiKeyState(val);
    try {
      localStorage.setItem('silver_finance_api_key', val || '');
    } catch {
      // ignore storage errors
    }
  };

  const fileInputRef = useRef(null);

  // 初始載入範例清單、家屬守護看板與已收集的歷史辨識紀錄
  useEffect(() => {
    fetchSamples();
    fetchFamilyDashboard();
    fetchHistory();
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

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/history`);
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  // 更新或重新解析單筆辨識紀錄（同步寫入 SQLite）
  const handleUpdateHistoryRecord = async (recordId, updates) => {
    try {
      const res = await fetch(`${API_BASE}/api/history/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        const updatedRec = data.record;
        if (updatedRec && currentDocResult?.record_id === recordId) {
          setCurrentDocResult({
            record_id: updatedRec.record_id,
            document_id: updatedRec.document_id,
            original_image_url: updatedRec.original_image_url,
            preprocessing: updatedRec.preprocessing,
            analysis: updatedRec.analysis
          });
        }
        await fetchHistory();
      }
    } catch (err) {
      console.error('Failed to update history record:', err);
    }
  };

  // 刪除單筆辨識紀錄
  const handleDeleteHistoryRecord = async (recordId) => {
    try {
      await fetch(`${API_BASE}/api/history/${recordId}`, { method: 'DELETE' });
      fetchHistory();
    } catch (err) {
      console.error('Failed to delete history record:', err);
    }
  };

  // 清空全部辨識紀錄
  const handleClearAllHistory = async () => {
    try {
      await fetch(`${API_BASE}/api/history`, { method: 'DELETE' });
      fetchHistory();
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  // 從收集庫點選任一筆紀錄，直接載入至步驟 03 完整導讀畫面
  const handleOpenRecordInStep3 = (rec) => {
    stopSpeaking();
    setCurrentDocResult({
      record_id: rec.record_id,
      document_id: rec.document_id,
      original_image_url: rec.original_image_url,
      preprocessing: rec.preprocessing,
      analysis: rec.analysis
    });
    setCheckedItems({});
    setChecklistConfirmed(false);
    setShowScamDetailGuide(false);
    setShareSuccessBanner('');
    setActiveTab('guide');
    setCurrentStep(3);
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
    const docName = resultData?.analysis?.doc_title || '金融範例文件';
    setCurrentDocResult(resultData);
    setUploadingFilename(`${docName}.jpg`);
    setScanSessionKey((k) => k + 1);
    setScanElapsedSec(0);
    setNewFileBanner(`🎉 已切換至文件：「${docName}」`);
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
      setScanSessionKey((k) => k + 1);
      setCurrentStep(3);
      fetchFamilyDashboard();
      fetchHistory();
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
        fetchHistory();
      } else {
        runStep2Transition(data, targetTab);
      }
    } catch (err) {
      console.error('Sample analyze failed:', err);
      setUploadError('無法連線至後端 Python 服務，請確認後端 (Port 8001) 已啟動。');
    }
  };

  // 將檔案轉為 Base64 Data URL 供瀏覽器端直連雲端 VLM 使用
  const fileToDataUrl = (fileObj) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileObj);
    });

  // 瀏覽器端直接呼叫 OpenAI GPT-4o Vision 或 Google Gemini 2.5 Flash（避免本地後端沙盒阻擋外網連線，並回報額度狀態）
  const callCloudVlmFromBrowser = async (fileObj, rawKey) => {
    const cleanKey = (rawKey || '').trim();
    if (!cleanKey) return { vlmJson: null, mode: '', warning: '' };

    const promptText = `你是一位專為台灣高齡長輩服務的「銀齡金融翻譯官」。
請閱讀這張金融文件或通知單影像，並以溫暖、清晰、大白話的台灣繁體中文回答長輩最關心的問題。
同時請嚴格檢查是否有詐騙特徵（例如：要求匯入驗證金至私人帳戶、限時30分鐘內匯款、要求切勿向銀行人員詢問、要求加私人LINE、索取密碼或保證高報酬）。
請務必輸出純 JSON 格式（不要加上 markdown 程式碼區塊符號），結構如下：
{
  "doc_title": "文件名稱（例如：客戶資料確認函、輕鬆還款方案通知函）",
  "doc_category": "銀行通知 | 保險通知 | 信用卡帳單 | 繳費單 | 可疑通知",
  "issuer": "發件機構名稱",
  "is_scam": false,
  "summary_one_line": "一句話白話說明這張通知在說什麼",
  "next_step_short": "一句話告訴長輩下一步怎麼做",
  "deadline": "辦理期限",
  "raw_ocr_text": "從圖片擷取出的主要文字內容",
  "five_questions": {
    "what_is_it": "1. 這張單子是什麼？",
    "need_action_and_deadline": "2. 要不要處理？期限到哪天？",
    "where_and_what_to_bring": "3. 要去哪裡、帶什麼？",
    "where_to_sign": "4. 哪裡要簽名？",
    "important_notes": "5. 有什麼要注意？"
  },
  "action_steps": [
    {"step_num": 1, "title": "步驟標題", "detail": "步驟白話說明", "source_note": "對應文件位置說明"}
  ],
  "checklist": [
    {"id": "chk_1", "label": "應備資料名稱", "hint": "貼心提醒", "required": true}
  ],
  "highlights": [
    {"x": 0.08, "y": 0.40, "w": 0.84, "h": 0.13, "label": "重點期限：（填入圖片上實際日期或辦理期限文字摘要）", "type": "deadline"},
    {"x": 0.05, "y": 0.65, "w": 0.68, "h": 0.14, "label": "應備資料／辦理位置：（填入圖片上實際應備證件、勾選項目或簽名位置文字摘要）", "type": "signature"}
  ],
  "suspicious_demands": [],
  "tts_mandarin": "溫馨慢速的國語口語朗讀稿（約 80~120 字）",
  "tts_taiwanese": "親切道地的台語口語漢字朗讀稿（約 80~120 字，開頭可稱呼阿公阿嬤平安）"
}
請注意：highlights 中的 x, y, w, h 為 0.0~1.0 的圖片相對座標（左上角為 0,0），請精準框出圖片中「辦理期限／重要日期段落」與「應備資料／簽章／聯絡方式段落」的真實位置與對應說明文字！`;

    try {
      const dataUrl = await fileToDataUrl(fileObj);
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const mimeType = fileObj.type || 'image/jpeg';

      if (cleanKey.startsWith('sk-')) {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cleanKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: promptText },
                  { type: 'image_url', image_url: { url: dataUrl } }
                ]
              }
            ]
          })
        });

        if (!resp.ok) {
          const errJson = await resp.json().catch(() => ({}));
          const errCode = errJson?.error?.code || '';
          const errMsg = errJson?.error?.message || `HTTP ${resp.status}`;
          if (resp.status === 429 || errCode === 'insufficient_quota') {
            return {
              vlmJson: null,
              mode: '',
              warning:
                'OpenAI API 回報額度不足 (insufficient_quota)：新申請的 OpenAI API Key 需先至 platform.openai.com → Settings → Billing 儲值 API 點數（與 ChatGPT Plus 訂閱分開計費），系統已自動切換為「本地強化版繁中金融 OCR 引擎」完成解析。'
            };
          }
          return {
            vlmJson: null,
            mode: '',
            warning: `OpenAI API 呼叫未通過 (${errCode || resp.status}: ${errMsg.slice(0, 80)})，已自動切換為本地繁中金融 OCR 引擎完成解析。`
          };
        }

        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content?.trim() || '';
        if (content) {
          return { vlmJson: content, mode: 'openai_chatgpt_vlm', warning: '' };
        }
      } else {
        const geminiPayload = JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                { inline_data: { mime_type: mimeType, data: base64Data } }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        });

        const fetchWithTimeout = async (url, timeoutMs = 25000) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          try {
            return await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: geminiPayload,
              signal: controller.signal
            });
          } finally {
            clearTimeout(timer);
          }
        };

        const urlsToTry = [
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(cleanKey)}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent?key=${encodeURIComponent(cleanKey)}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${encodeURIComponent(cleanKey)}`
        ];

        const results = await Promise.all(
          urlsToTry.map(async (url) => {
            try {
              const resp = await fetchWithTimeout(url, 25000);
              if (resp.ok) {
                const data = await resp.json();
                let content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
                if (content.startsWith('```')) {
                  content = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
                }
                if (content) return { ok: true, content };
              }
              const errJson = await resp.json().catch(() => ({}));
              return { ok: false, err: errJson?.error?.message || `HTTP ${resp.status}` };
            } catch (e) {
              return { ok: false, err: e.name === 'AbortError' ? '連線逾時 (25秒)' : e.message };
            }
          })
        );

        const win = results.find((r) => r.ok && r.content);
        if (win) {
          return { vlmJson: win.content, mode: 'gemini_vlm_plus_ocr', warning: '' };
        }

        const lastErrMsg =
          results[0]?.err || results.find((r) => r.err)?.err || '無法連線';
        return {
          vlmJson: null,
          mode: '',
          warning: `Google Gemini API 呼叫未通過 (${lastErrMsg.slice(0, 120)})，已自動切換為本地繁中金融 OCR 引擎完成解析。`
        };
      }
    } catch (e) {
      return {
        vlmJson: null,
        mode: '',
        warning: `雲端 API 連線異常 (${e.message || 'Network Error'})，已自動切換為本地繁中金融 OCR 引擎完成解析。`
      };
    }
    return { vlmJson: null, mode: '', warning: '' };
  };

  // 處理實際檔案上傳（支援任意 JPG / PNG / WEBP 網路範例圖或手機照片）
  const handleFileUpload = async (file) => {
    if (!file) return;
    stopSpeaking();
    setUploadError('');

    const fname = file.name || '上傳的文件照片.jpg';
    const localUrl = URL.createObjectURL(file);

    // 立即清空上一張圖檔的辨識結果，確保畫面切換為最新上傳的預覽圖並觸發轉場動畫
    setCurrentDocResult(null);
    setShowMaskedImage(false);
    setUploadingPreviewUrl(localUrl);
    setUploadingFilename(fname);
    setScanSessionKey((k) => k + 1);
    setScanElapsedSec(0);
    setNewFileBanner('');
    setCurrentStep(2);
    setLoadingStepIndex(1);

    const progressTimer = setTimeout(() => setLoadingStepIndex(2), 650);
    const startTs = Date.now();
    const elapsedInterval = setInterval(() => {
      setScanElapsedSec(Math.floor((Date.now() - startTs) / 1000));
    }, 1000);

    const formData = new FormData();
    formData.append('file', file);
    if (apiKey) {
      formData.append('api_key', apiKey);
      const { vlmJson, mode, warning } = await callCloudVlmFromBrowser(file, apiKey);
      if (vlmJson) {
        formData.append('client_vlm_json', vlmJson);
        formData.append('client_vlm_mode', mode);
      }
      if (warning) {
        formData.append('vlm_warning', warning);
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/analyze/upload`, {
        method: 'POST',
        body: formData
      });
      clearTimeout(progressTimer);
      clearInterval(elapsedInterval);

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
      setNewFileBanner(`🎉 已成功切換並完成新圖檔辨識：「${fname}」`);

      setTimeout(() => {
        setScanSessionKey((k) => k + 1);
        setCurrentStep(3);
        fetchFamilyDashboard();
        fetchHistory();
      }, 650);
    } catch (err) {
      clearTimeout(progressTimer);
      clearInterval(elapsedInterval);
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
          {/* 辨識結果收集庫按鈕 */}
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              fetchHistory();
              setCurrentStep(4);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition ${
              currentStep === 4
                ? 'bg-[#0f5c5c] text-white'
                : 'border border-teal-300 bg-[#e9f2f0] text-[#16383a] hover:bg-teal-100'
            }`}
          >
            <FolderKanban className="h-4 w-4 text-[#0f5c5c]" />
            <span>辨識結果收集庫</span>
            <span className="rounded-full bg-[#0f5c5c] px-2 py-0.5 text-xs font-extrabold text-white">
              {historyData.total || 0}
            </span>
          </button>

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

            {/* 新增步驟 04：已收集的辨識結果庫 */}
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                fetchHistory();
                setCurrentStep(4);
              }}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-lg font-bold transition ${
                currentStep === 4
                  ? 'bg-[#265356] text-white shadow-inner'
                  : 'text-teal-100/75 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span className="text-base font-semibold text-amber-300">04</span>
                <span>辨識結果庫</span>
              </div>
              <span className="rounded-full bg-teal-900/90 px-2.5 py-0.5 text-xs font-extrabold text-amber-300 border border-teal-600">
                {historyData.total || 0} 筆
              </span>
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

          {/* 隱藏的全域檔案上傳 Input */}
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

          {/* =========================================================
              STEP 01: 畫面 1 上傳文件
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

              {/* 畫面 1 核心大按鈕白色卡片 */}
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
                </div>

                <p className="mt-4 text-sm text-slate-400">
                  可直接點選上方按鈕選擇電腦中的 JPG / PNG 圖片，或將圖片直接拖曳至此區塊
                </p>
              </div>

              <p className="text-center text-lg font-medium text-slate-600">
                支援銀行通知、帳單與保險文件（辨識完畢將自動收集至「04 辨識結果庫」方便隨時查看）
              </p>

              {/* 最近已收集的辨識紀錄快覽區（若有紀錄直接顯示於首頁下方！） */}
              {historyData.records?.length > 0 && (
                <div className="rounded-3xl bg-white p-6 shadow-sm border border-teal-200/80 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-extrabold text-[#16383a] flex items-center gap-2">
                      <FolderKanban className="h-5 w-5 text-[#0f5c5c]" />
                      最近收集的辨識結果（已存 {historyData.total} 筆）：
                    </h2>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="flex items-center gap-1 rounded-xl bg-[#e9f2f0] px-4 py-2 text-sm font-bold text-[#0f5c5c] hover:bg-teal-100"
                    >
                      查看全部收集紀錄與匯出報表 <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {historyData.records.slice(0, 3).map((rec) => (
                      <div
                        key={rec.record_id}
                        onClick={() => handleOpenRecordInStep3(rec)}
                        className="group flex cursor-pointer items-center gap-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 hover:border-[#0f5c5c] hover:bg-white transition"
                      >
                        <img
                          src={rec.original_image_url}
                          alt={rec.doc_title}
                          className="h-16 w-14 shrink-0 rounded-xl object-cover border border-slate-200 bg-white"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                                rec.source_type === 'upload'
                                  ? 'bg-[#0f5c5c] text-white'
                                  : 'bg-teal-100 text-[#0f5c5c]'
                              }`}
                            >
                              {rec.source_type === 'upload' ? '自訂上傳' : '範例'}
                            </span>
                            <span className="truncate text-xs text-slate-400">
                              {rec.created_at.split(' ')[1]}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-base font-extrabold text-slate-900 group-hover:text-[#0f5c5c]">
                            {rec.doc_title}
                          </p>
                          <p className="truncate text-xs text-slate-600">{rec.summary_one_line}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
              STEP 02: 畫面 2 辨識內容
          ========================================================= */}
          {currentStep === 2 && (
            <div key={`step2-${scanSessionKey}`} className="space-y-6 animate-step-enter">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">我的文件 / 新增文件</p>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                    正在整理您的新文件
                  </h1>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-[#0f5c5c] px-4 py-2.5 text-sm font-bold text-white shadow-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-300 animate-ping" />
                  <span>🆕 新圖檔載入掃描中：{uploadingFilename || '範例文件'}</span>
                  {scanElapsedSec > 0 && (
                    <span className="ml-1 rounded-lg bg-white/15 px-2.5 py-0.5 text-xs font-mono">
                      {scanElapsedSec} 秒
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
                <div className="lg:col-span-6 relative overflow-hidden rounded-3xl bg-white p-4 shadow-md border-2 border-[#0f5c5c]/30">
                  <div className="mb-2.5 flex items-center justify-between px-1">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1 text-xs font-extrabold text-[#0f5c5c] border border-teal-200">
                      📸 已切換為最新上傳圖檔預覽
                    </span>
                    {uploadingFilename && (
                      <span className="text-xs font-bold text-slate-500 truncate max-w-[220px]">
                        {uploadingFilename}
                      </span>
                    )}
                  </div>
                  <div className="relative overflow-hidden rounded-2xl bg-slate-900/5">
                    <img
                      key={displayImageUrl}
                      src={displayImageUrl}
                      alt="正在辨識的文件"
                      className="w-full max-h-[540px] object-contain mx-auto animate-image-reveal"
                    />
                    <div className="pointer-events-none absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_20px_#0f5c5c] animate-scanline" />
                  </div>
                  {uploadingFilename && (
                    <p className="mt-2.5 text-center text-xs font-bold text-[#0f5c5c]">
                      🔍 AI 視覺模型正在逐行掃描「{uploadingFilename}」...
                    </p>
                  )}
                </div>

                <div className="lg:col-span-6 rounded-3xl bg-white p-8 md:p-10 shadow-sm border border-slate-200 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-extrabold text-slate-900">新圖檔辨識進度</h2>
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-extrabold text-[#0f5c5c]">
                      步驟 {loadingStepIndex} / 3
                    </span>
                  </div>

                  <div className="space-y-5 text-lg">
                    <div className="flex items-center gap-3 font-bold text-[#0f5c5c]">
                      <CheckCircle2 className="h-6 w-6 shrink-0" />
                      <span>✓ 已切換載入新照片（完成邊緣偵測、去陰影與細字筆畫增強）</span>
                    </div>

                    <div
                      className={`flex items-center gap-3 font-bold transition ${
                        loadingStepIndex >= 2 ? 'text-[#0f5c5c]' : 'text-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="h-6 w-6 shrink-0" />
                      <span>
                        {apiKey
                          ? '✨ 雲端 AI 視覺模型看圖解析中（同時擷取全文、重點座標與防詐審查）'
                          : '⚙️ 本地多通道繁中金融 OCR 解析中（搭配個資不落地自動遮罩）'}
                      </span>
                    </div>

                    <div
                      className={`flex items-center gap-3 font-medium transition ${
                        loadingStepIndex >= 3 ? 'text-[#0f5c5c] font-bold' : 'text-slate-500'
                      }`}
                    >
                      <CheckCircle2 className="h-6 w-6 shrink-0" />
                      <span>生成固定五題白話導讀並寫入 SQLite 結構化資料庫 (`silver_finance.db`)</span>
                    </div>
                  </div>

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
              STEP 03: 畫面 3 / 4 / 5 / 6 導讀與行動
          ========================================================= */}
          {currentStep === 3 && analysis && (
            <div key={`step3-${scanSessionKey}`} className="space-y-6 animate-step-enter">
              {/* 新圖檔辨識完成轉場提示橫幅 */}
              {newFileBanner && (
                <div className="rounded-2xl bg-[#0f5c5c] text-white px-5 py-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 font-extrabold text-base">
                    <CheckCircle2 className="h-5 w-5 text-amber-300 shrink-0" />
                    <span>{newFileBanner}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewFileBanner('')}
                    className="rounded-lg bg-white/15 px-3 py-1 text-xs font-bold text-white hover:bg-white/25"
                  >
                    知道了
                  </button>
                </div>
              )}

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
                    <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      已自動收集至辨識結果庫
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {currentDocResult?.record_id && (
                    <button
                      type="button"
                      onClick={() => setEditingRecord(currentDocResult)}
                      className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-950 hover:bg-amber-100 transition"
                    >
                      <Edit3 className="h-4 w-4 text-amber-700" />
                      修正辨識結果
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      stopSpeaking();
                      fetchHistory();
                      setCurrentStep(4);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-[#0f5c5c] bg-[#e9f2f0] px-4 py-2.5 text-sm font-bold text-[#0f5c5c] hover:bg-teal-100"
                  >
                    <FolderKanban className="h-4 w-4" />
                    查看已收集結果 ({historyData.total || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl bg-[#0f5c5c] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b4646]"
                  >
                    <Upload className="h-4 w-4" />
                    繼續上傳下一張 JPG
                  </button>
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

                    <div className="relative mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      <img
                        key={displayImageUrl}
                        src={displayImageUrl}
                        alt={analysis.doc_title}
                        className="w-full h-auto block animate-image-reveal"
                      />

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

                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-3.5">
                            <div className="flex items-center justify-between">
                              <h3 className="text-base font-extrabold text-[#16383a] flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-[#0f5c5c]" />
                                長輩最關心的五件事（固定五題格式）：
                              </h3>
                              <span className="text-xs font-semibold text-slate-500">
                                {analysis.engine_mode === 'openai_chatgpt_vlm'
                                  ? '🤖 OpenAI ChatGPT (GPT-4o Vision) 辨識'
                                  : analysis.engine_mode === 'gemini_vlm_plus_ocr'
                                  ? '✨ Gemini 2.5 VLM 多模態視覺辨識'
                                  : analysis.engine_mode === 'real_tesseract_ocr_engine'
                                  ? '✓ 多通道 AI OCR ＋ 金融專有名詞糾錯引擎'
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

          {/* =========================================================
              STEP 04: 辨識結果收集庫（我的文件）
          ========================================================= */}
          {currentStep === 4 && (
            <HistoryVaultView
              historyData={historyData}
              apiBase={API_BASE}
              onOpenRecordInStep3={handleOpenRecordInStep3}
              onEditRecord={(rec) => setEditingRecord(rec)}
              onDeleteRecord={handleDeleteHistoryRecord}
              onClearAll={handleClearAllHistory}
              onUploadNewClick={() => {
                setCurrentStep(1);
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
            />
          )}

          {/* Footer Note */}
          <footer className="mt-10 pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <span>
              銀齡金融翻譯官｜高齡者金融文件 AI 導讀與行動指引服務
            </span>
            <span className="font-medium text-[#0f5c5c]">
              ● 後端 FastAPI + SQLite 已連線（內建多通道金融詞典 OCR、Gemini 2.5 VLM、ChatGPT GPT-4o Vision 與 165 防詐比對）
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

      <EditRecordModal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        recordData={editingRecord}
        onSaveRecord={handleUpdateHistoryRecord}
      />
    </div>
  );
}
