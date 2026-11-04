import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Sparkles, AlertTriangle, CheckCircle2, RefreshCw, Upload } from 'lucide-react';

export default function CameraModal({ isOpen, onClose, onCaptureSample, onUploadFile }) {
  const videoRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [simulateLowLight, setSimulateLowLight] = useState(false);
  const [simulateBlur, setSimulateBlur] = useState(false);
  const [selectedDemoDoc, setSelectedDemoDoc] = useState('bank_kyc');

  useEffect(() => {
    let stream = null;
    if (isOpen) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          setHasCamera(true);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          setHasCamera(false);
          setCameraError('未偵測到實體相機，已自動切換為「智慧取景模擬模式」');
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCapture = () => {
    if (hasCamera && videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 800;
      canvas.height = videoRef.current.videoHeight || 1000;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
          onUploadFile(file);
          onClose();
        }
      }, 'image/jpeg', 0.9);
    } else {
      onCaptureSample(selectedDemoDoc, simulateLowLight);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-[#16383a] text-white shadow-2xl border border-teal-700/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-teal-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600/30 text-teal-200">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-wide">模組一：智慧拍照與框線引導</h3>
              <p className="text-sm text-teal-200/80">請將金融文件對準綠色框線內，系統將自動偵測邊緣與檢查光線</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-teal-900/60 p-2 text-teal-100 hover:bg-teal-800"
            aria-label="關閉視窗"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Camera Viewfinder with Alignment Frame */}
        <div className="p-6">
          <div
            className={`relative mx-auto flex h-[380px] w-full max-w-xl items-center justify-center overflow-hidden rounded-2xl bg-slate-900 border-2 ${
              simulateLowLight || simulateBlur ? 'border-amber-400' : 'border-emerald-400'
            }`}
          >
            {hasCamera ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover transition-all ${
                  simulateLowLight ? 'brightness-50' : ''
                } ${simulateBlur ? 'blur-[2.5px]' : ''}`}
              />
            ) : (
              <div
                className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900 p-6 text-center transition-all ${
                  simulateLowLight ? 'brightness-50' : ''
                } ${simulateBlur ? 'blur-[2px]' : ''}`}
              >
                <img
                  src={`http://127.0.0.1:8001/api/samples/${selectedDemoDoc}/image`}
                  alt="預覽文件"
                  className="max-h-[310px] rounded-lg shadow-lg object-contain border border-white/20"
                />
              </div>
            )}

            {/* 四角對齊框線引導 (Alignment Brackets) */}
            <div className="pointer-events-none absolute inset-6 border border-dashed border-emerald-300/50 rounded-xl">
              <div className="absolute -top-1 -left-1 h-8 w-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 h-8 w-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
            </div>

            {/* 掃描線動畫 */}
            <div className="pointer-events-none absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-scanline" />

            {/* 即時影像品質偵測橫幅 */}
            <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/75 px-4 py-2.5 text-sm backdrop-blur-md">
              {simulateBlur ? (
                <span className="flex items-center gap-2 font-semibold text-amber-300">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  偵測到手震模糊！請握穩手機重拍，避免金額與日期辨識錯誤
                </span>
              ) : simulateLowLight ? (
                <span className="flex items-center gap-2 font-semibold text-amber-300">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  光線偏暗：拍攝後系統將自動啟動「智慧補光與對比強化」
                </span>
              ) : (
                <span className="flex items-center gap-2 font-semibold text-emerald-300">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  文件邊緣已對齊・光線與對焦清晰・上傳前將自動遮罩個資
                </span>
              )}
            </div>
          </div>

          {cameraError && (
            <p className="mt-2 text-center text-xs text-teal-200/80">{cameraError}</p>
          )}

          {/* 模擬控制項（展示計畫書「風險與因應：光線不足／手震提醒與智慧補光」） */}
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-teal-900/50 p-3.5 border border-teal-700/50">
              <label className="block text-xs font-semibold text-teal-200 mb-1.5">
                選擇要對準拍攝的模擬文件：
              </label>
              <select
                value={selectedDemoDoc}
                onChange={(e) => setSelectedDemoDoc(e.target.value)}
                className="w-full rounded-xl bg-[#0e2729] px-3 py-2 text-base font-medium text-white border border-teal-600 focus:outline-none"
              >
                <option value="bank_kyc">1. 客戶審查權益通知（畫面 2~5 銀行通知）</option>
                <option value="insurance_maturity">2. 3 年期儲蓄險保單到期通知（模組二範例）</option>
                <option value="scam_urgent_account">3. 緊急帳戶通知（畫面 6 可疑詐騙警示）</option>
                <option value="credit_card_bill">4. 11 月份信用卡消費對帳單（信用卡帳單）</option>
              </select>
            </div>

            <div className="rounded-2xl bg-teal-900/50 p-3.5 border border-teal-700/50 flex flex-col justify-center gap-2">
              <span className="text-xs font-semibold text-teal-200">
                測試「影像前處理與重拍提醒」機制：
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSimulateLowLight(!simulateLowLight)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    simulateLowLight
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-teal-800/80 text-teal-100 hover:bg-teal-700'
                  }`}
                >
                  {simulateLowLight ? '✓ 模擬環境太暗（智慧補光）' : '模擬環境太暗'}
                </button>
                <button
                  type="button"
                  onClick={() => setSimulateBlur(!simulateBlur)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    simulateBlur
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-teal-800/80 text-teal-100 hover:bg-teal-700'
                  }`}
                >
                  {simulateBlur ? '⚠️ 模擬手震模糊（提示重拍）' : '模擬手震模糊'}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            {simulateBlur ? (
              <button
                type="button"
                onClick={() => setSimulateBlur(false)}
                className="flex items-center gap-2 rounded-2xl bg-amber-500 px-8 py-4 text-lg font-bold text-slate-950 shadow-lg hover:bg-amber-400"
              >
                <RefreshCw className="h-6 w-6" />
                畫面模糊，點此重新對焦拍攝
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCapture}
                className="flex items-center gap-3 rounded-2xl bg-emerald-500 px-10 py-4 text-xl font-bold text-slate-950 shadow-lg hover:bg-emerald-400 transition transform active:scale-95"
              >
                <Camera className="h-7 w-7" />
                按下快門・開始辨識文件
              </button>
            )}

            <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-teal-800/90 px-6 py-4 text-base font-semibold text-teal-50 hover:bg-teal-700 border border-teal-600">
              <Upload className="h-5 w-5" />
              從手機／電腦相簿選取照片
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) {
                    onUploadFile(file);
                    onClose();
                  }
                }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
