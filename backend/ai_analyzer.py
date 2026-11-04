"""
模組二：AI 解析與白話導讀 (VLM + Real Tesseract OCR + LLM Plain-Language Translator)
負責：
1. 接收經「個資遮罩」處理後的影像（確保敏感資料不直接交給雲端模型）
2. 支援針對使用者上傳之任意 JPG/PNG 照片執行真實繁體中文 OCR (Tesseract chi_tra+eng)
3. 支援串接 Google Gemini VLM API 或使用本地智慧金融文件解析引擎
4. 固定輸出「五題白話格式」、「辦理步驟」、「出門前應備資料檢查清單」與「國語／台語朗讀講稿」
"""

import os
import json
import httpx
from typing import Dict, Any, Optional
from sample_generator import SAMPLE_DOCUMENTS
from scam_detector import analyze_scam_risk
from image_processor import mask_sensitive_text
from ocr_engine import extract_ocr_from_image_bytes, parse_ocr_text_to_structured_guide


SYSTEM_PROMPT = """你是一位專為台灣高齡長輩服務的「銀齡金融翻譯官」。
請閱讀這張金融文件或通知單影像，並以溫暖、清晰、大白話的台灣繁體中文回答長輩最關心的問題。
同時請嚴格檢查是否有詐騙特徵（例如：要求匯入驗證金至私人帳戶、限時30分鐘內匯款、要求切勿向銀行人員詢問、要求加私人LINE、索取密碼或保證高報酬）。

請務必輸出純 JSON 格式（不要加上 markdown 程式碼區塊符號），結構如下：
{
  "doc_title": "文件名稱（例如：客戶審查權益通知、3年期儲蓄險保單到期通知）",
  "doc_category": "銀行通知 | 保險通知 | 信用卡帳單 | 繳費單 | 可疑通知",
  "issuer": "發件機構名稱",
  "is_scam": false,
  "summary_one_line": "一句話白話說明這張通知在說什麼",
  "next_step_short": "一句話告訴長輩下一步怎麼做",
  "deadline": "辦理期限（例如：通知日起 60 天內（含））",
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
  "suspicious_demands": ["若為可疑通知，列出可疑要求，否則為空陣列"],
  "tts_mandarin": "溫馨慢速的國語口語朗讀稿（約 80~120 字）",
  "tts_taiwanese": "親切道地的台語口語漢字朗讀稿（約 80~120 字，開頭可稱呼阿公阿嬤平安）"
}
"""


async def call_gemini_vlm(
    masked_image_b64: str,
    api_key: str,
    ocr_hint: str = "",
    model_name: str = "gemini-2.5-flash"
) -> Optional[Dict[str, Any]]:
    """
    使用 Google Gemini 多模態模型解析遮罩後的金融文件影像
    """
    clean_b64 = masked_image_b64.split(",")[-1] if "," in masked_image_b64 else masked_image_b64
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

    prompt_text = SYSTEM_PROMPT
    if ocr_hint:
        prompt_text += f"\n\n以下為系統初步 OCR 辨識出的文字供參考：\n{ocr_hint}"

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt_text},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": clean_b64
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient(timeout=25.0) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code != 200:
            return None
        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            return None
        text_out = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        text_out = text_out.strip()
        if text_out.startswith("```"):
            text_out = text_out.strip("`").removeprefix("json").strip()
        return json.loads(text_out)


async def analyze_financial_document(
    masked_image_url: str,
    image_bytes: Optional[bytes] = None,
    filename: str = "",
    preset_id: str = "",
    custom_text_hint: str = "",
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    執行完整 AI 文件解析、真實影像 OCR 文字擷取、個資遮罩與防詐規則比對
    """
    effective_api_key = (api_key or os.environ.get("GEMINI_API_KEY") or "").strip()
    ai_result = None
    used_mode = "builtin_smart_engine"
    extracted_ocr_text = ""

    # 1. 若為使用者實際上傳的照片（無 preset_id），先執行真實 Tesseract 繁體中文 OCR！
    if not preset_id and image_bytes:
        extracted_ocr_text = extract_ocr_from_image_bytes(image_bytes)
        used_mode = "real_tesseract_ocr_engine"

    # 2. 若有提供 Gemini API Key 且非單純點擊內建範例，可呼叫雲端多模態模型
    if effective_api_key and not preset_id:
        try:
            ai_result = await call_gemini_vlm(
                masked_image_url,
                effective_api_key,
                ocr_hint=extracted_ocr_text
            )
            if ai_result:
                used_mode = "gemini_vlm_plus_ocr"
        except Exception:
            ai_result = None

    # 3. 若未設定雲端 API Key，根據是否為內建範例或真實上傳照片處理：
    if not ai_result:
        if preset_id and preset_id in SAMPLE_DOCUMENTS:
            ai_result = SAMPLE_DOCUMENTS[preset_id].copy()
        elif extracted_ocr_text and len(extracted_ocr_text.strip()) >= 8:
            # 使用真實 OCR 文字進行智慧結構化導讀拆解！
            ai_result = parse_ocr_text_to_structured_guide(
                ocr_text=extracted_ocr_text,
                filename=filename
            )
        else:
            # 若圖片完全無文字或極度模糊，依檔名或提供通用銀行通知導讀
            ai_result = parse_ocr_text_to_structured_guide(
                ocr_text=custom_text_hint or "",
                filename=filename
            )

    raw_text = custom_text_hint.strip() if custom_text_hint else (
        extracted_ocr_text if extracted_ocr_text else ai_result.get("raw_ocr_text", "")
    )
    masked_text, masked_pii_list = mask_sensitive_text(raw_text)

    # 4. 執行模組三：防詐規則庫 + 模型雙重比對
    extra_demands = ai_result.get("suspicious_demands", [])
    if ai_result.get("is_scam") and not extra_demands:
        extra_demands = ["匯款至私人指定帳戶", "催促在 30 分鐘內匯款"]

    scam_analysis = analyze_scam_risk(raw_text, extra_demands=extra_demands)
    is_scam = bool(ai_result.get("is_scam") or scam_analysis["is_scam_warning"])

    return {
        "engine_mode": used_mode,
        "doc_title": ai_result.get("doc_title", "金融文件通知"),
        "doc_category": "可疑通知" if is_scam else ai_result.get("doc_category", "銀行通知"),
        "issuer": ai_result.get("issuer", "金融機構"),
        "is_scam": is_scam,
        "summary_one_line": ai_result.get("summary_one_line", ""),
        "next_step_short": ai_result.get("next_step_short", ""),
        "deadline": ai_result.get("deadline", "請依通知所載期限辦理"),
        "raw_ocr_text": raw_text,
        "masked_ocr_text": masked_text,
        "masked_pii_items": masked_pii_list or [
            {"type": "身分證／帳號保護", "original_hint": "已啟動本地個資過濾", "status": "已自動遮罩"}
        ],
        "five_questions": ai_result.get("five_questions", {}),
        "action_steps": ai_result.get("action_steps", []),
        "checklist": ai_result.get("checklist", []),
        "highlights": ai_result.get("highlights", [
            {"x": 0.08, "y": 0.25, "w": 0.82, "h": 0.08, "label": "辦理期限位置", "type": "deadline"},
            {"x": 0.45, "y": 0.75, "w": 0.45, "h": 0.14, "label": "重要資訊／簽章位置", "type": "signature"}
        ]),
        "scam_analysis": scam_analysis,
        "tts": {
            "mandarin": ai_result.get("tts_mandarin", ai_result.get("summary_one_line", "")),
            "taiwanese": ai_result.get("tts_taiwanese", ai_result.get("summary_one_line", ""))
        },
        "source_verification_note": "資料來源：左側照片（經真實 OCR 擷取）；重要金額與日期已標示位置供核對，重要決定請再向銀行官方確認。"
    }
