"""
辨識結果收集與歷史紀錄管理模組 (Recognition History & Document Vault)
負責：
1. 自動將每一次拍照／上傳 JPG 或範例測試的完整辨識結果持久化儲存至 backend/data/history.json
2. 支援查詢、篩選、單筆重新載入導讀、單筆刪除與全部清空
3. 支援一鍵匯出 CSV (含 UTF-8 BOM，Excel 可直接開啟不亂碼) 與 JSON 報表，方便專題成果統計與人工比對
"""

import os
import json
import csv
import io
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional


DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
HISTORY_FILE = os.path.join(DATA_DIR, "recognition_history.json")


class RecognitionHistoryStore:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        self.records: List[Dict[str, Any]] = self._load_from_disk()

    def _load_from_disk(self) -> List[Dict[str, Any]]:
        if os.path.exists(HISTORY_FILE):
            try:
                with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return data
            except Exception:
                pass
        return []

    def _save_to_disk(self) -> None:
        try:
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(self.records, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Warning: Failed to save history to disk: {e}")

    def add_record(
        self,
        source_type: str,
        filename: str,
        document_id: str,
        original_image_url: str,
        preprocessing: Dict[str, Any],
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        新增一筆辨識結果紀錄並寫入硬碟
        """
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        record = {
            "record_id": f"rec_{uuid.uuid4().hex[:8]}",
            "created_at": now_str,
            "source_type": source_type,  # "upload" | "sample"
            "source_label": "自訂上傳照片" if source_type == "upload" else "內建範例文件",
            "filename": filename,
            "document_id": document_id,
            "doc_title": analysis.get("doc_title", "未命名文件"),
            "doc_category": analysis.get("doc_category", "銀行通知"),
            "issuer": analysis.get("issuer", "金融機構"),
            "is_scam": bool(analysis.get("is_scam", False)),
            "summary_one_line": analysis.get("summary_one_line", ""),
            "next_step_short": analysis.get("next_step_short", ""),
            "deadline": analysis.get("deadline", ""),
            "five_questions": analysis.get("five_questions", {}),
            "action_steps": analysis.get("action_steps", []),
            "checklist": analysis.get("checklist", []),
            "raw_ocr_text": analysis.get("raw_ocr_text", ""),
            "masked_ocr_text": analysis.get("masked_ocr_text", ""),
            "original_image_url": original_image_url,
            "preprocessing": preprocessing,
            "analysis": analysis
        }
        self.records.insert(0, record)
        # 保留最近 100 筆完整紀錄避免檔案過大
        if len(self.records) > 100:
            self.records = self.records[:100]
        self._save_to_disk()
        return record

    def list_records(self) -> List[Dict[str, Any]]:
        """
        回傳所有收集的辨識紀錄清單
        """
        return self.records

    def get_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        for r in self.records:
            if r["record_id"] == record_id:
                return r
        return None

    def delete_record(self, record_id: str) -> bool:
        before_len = len(self.records)
        self.records = [r for r in self.records if r["record_id"] != record_id]
        if len(self.records) < before_len:
            self._save_to_disk()
            return True
        return False

    def clear_all(self) -> None:
        self.records = []
        self._save_to_disk()

    def export_csv_bytes(self) -> bytes:
        """
        匯出為 UTF-8 with BOM 的 CSV 檔案，Excel 直接開啟不會亂碼
        """
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "紀錄ID",
            "辨識時間",
            "來源類型",
            "檔案名稱",
            "文件標題",
            "文件分類",
            "發件機構",
            "防詐狀態",
            "一句話白話導讀",
            "下一步行動",
            "辦理期限",
            "1.這張單子是什麼",
            "2.要不要處理與期限",
            "3.要去哪裡與帶什麼",
            "4.哪裡要簽名",
            "5.注意事項",
            "OCR辨識原文摘要"
        ])
        for r in self.records:
            fq = r.get("five_questions", {})
            writer.writerow([
                r.get("record_id", ""),
                r.get("created_at", ""),
                r.get("source_label", ""),
                r.get("filename", ""),
                r.get("doc_title", ""),
                r.get("doc_category", ""),
                r.get("issuer", ""),
                "高風險可疑通知" if r.get("is_scam") else "正常金融文件",
                r.get("summary_one_line", ""),
                r.get("next_step_short", ""),
                r.get("deadline", ""),
                fq.get("what_is_it", ""),
                fq.get("need_action_and_deadline", ""),
                fq.get("where_and_what_to_bring", ""),
                fq.get("where_to_sign", ""),
                fq.get("important_notes", ""),
                (r.get("masked_ocr_text") or r.get("raw_ocr_text") or "").replace("\n", " ")[:300]
            ])
        return output.getvalue().encode("utf-8-sig")


history_store = RecognitionHistoryStore()
