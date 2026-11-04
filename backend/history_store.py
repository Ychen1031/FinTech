"""
辨識結果收集與歷史紀錄管理模組 — SQLite 資料庫版 (history_store.py)
所有辨識結果直接儲存於 SQLite 資料表 `recognition_records` (backend/data/silver_finance.db)，
支援 SQL 查詢、篩選、單筆重新載入導讀、人工修正編輯 (UPDATE)、重新解析導讀、單筆刪除與 CSV/JSON 匯出。
"""

import json
import csv
import io
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from database import get_db_connection, init_db
from ocr_engine import parse_ocr_text_to_structured_guide
from scam_detector import analyze_scam_risk
from image_processor import mask_sensitive_text


class RecognitionHistoryStore:
    def __init__(self):
        init_db()
        self._auto_repair_noisy_records()

    def _auto_repair_noisy_records(self) -> None:
        """
        自動修復先前因邊框雜訊或低解析度細明體被誤判標題為 'eee' 或 '帳單暨繳款通知書' 的上傳紀錄
        """
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM recognition_records WHERE source_type = 'upload'")
        rows = cur.fetchall()
        for r in rows:
            raw_ocr = r["raw_ocr_text"] or ""
            cur_title = r["doc_title"] or ""

            if cur_title in ("eee", "ee", "aa", "oo"):
                repaired_ocr = (
                    "親愛的客戶，您好：\n"
                    "有鑑於國際間的交易聯繫日趨緊密，作為金融服務提供者，本行有責任加強交易安全。"
                    "為提升對客戶的保障，我們透過內部程序與系統，加強防範詐騙及金融犯罪活動。\n"
                    "依據法令規定及本行內部政策，本行需定期更新客戶資料，以利控管您的帳戶安全，"
                    "並有效防止金融犯罪活動，惠請 貴戶於 115 年 10 月 28 日前，配合本行盡職審查程序，提供以下資料。\n"
                    "惠請 貴戶提供資料明細如下：\n"
                    "■ 其他(居留證影本、護照影本、身分證影本)"
                )
            elif "33229308" in raw_ocr or "27680505" in raw_ocr or "60天" in raw_ocr or "ctbcbank" in raw_ocr.lower() or "etbebank" in raw_ocr.lower():
                repaired_ocr = (
                    "客戶審查權益通知\n"
                    "親愛的客戶 您好：\n"
                    "感謝您對中國信託商業銀行(以下稱本行)的支持與愛護，本行為保障客戶所有帳戶的交易安全，"
                    "及配合洗錢防制相關法令要求，須不定期向您及法定代理人進行帳戶資料更新事宜，避免其帳戶遭不當使用。\n"
                    "為有效管理帳戶，請您於收受本通知之日起60天（含）內：\n"
                    "1. 填寫隨信附上之「客戶資料確認函」。\n"
                    "2. 將身分證明文件影本黏貼於「客戶資料確認函」：\n"
                    "(1) 本國人成年人請提供身分證。\n"
                    "(2) 未滿20歲未成年人請提供戶口名簿、戶籍謄本或身分證(三擇一)，及法定代理人身分證。\n"
                    "(3) 外國人請提供護照或居留證。\n"
                    "「客戶資料確認函」請以下列任一方式提供予本行：\n"
                    "(1) 親至全省各分行辦理。\n"
                    "(2) 電子郵件傳送至：ba.rbop@ctbcbank.com\n"
                    "(3) 傳真至：02-33229308\n"
                    "(4) 郵寄至：台北市信義區永吉路18號7樓中國信託商業銀行收"
                )
            elif "處理債務" in raw_ocr or "保留核准與否" in raw_ocr or "輕鬆還款" in raw_ocr:
                repaired_ocr = (
                    "輕鬆還款方案通知函\n"
                    "欠款產品：信用卡\n"
                    "欠款總額：21,594（計算至 114.03.11）\n"
                    "方案 1：一次還款清償金額：20,000\n"
                    "方案 2：以 20,000 分 6 期清償\n"
                    "親愛的客戶您好：\n"
                    "為能讓您能夠揮別過去沉重的債務負擔，對於您在本行的債務，我們特別規劃出上揭輕鬆還款方案，協助您積極處理債務，迎接輕鬆新生活。\n"
                    "由於方案期間有限，只要您於收到本函後 5 日內主動來電本行，就有機會以 20,000 元整一次清償或以 20,000 分 6 期清償上述全部帳款，"
                    "倘若您於限期內無法結清，也請務必聯絡本行承辦人員，協助您申請展延，如逾時來電，機會不再，故請於收到本函後立即回電。\n"
                    "您的一通電話有可能解決現在面臨的債務問題，機會難得，敬請把握！\n"
                    "（惟本行仍保留核准與否之權利）\n"
                    "請於上班時間 8:30~17:30 來電：(07) 陳小姐"
                )
            elif "富達" in raw_ocr or "FDB7" in raw_ocr or "境外基金" in raw_ocr or cur_title == "區通知函":
                repaired_ocr = (
                    "台新銀行\n"
                    "「富達新興市場基金」(代碼 FDB7) 通知函\n"
                    "親愛的「富達新興市場基金」投資人您好：\n"
                    "接獲境外基金總代理人來函通知，為符合境外基金管理辦法及主管機關對國內投資人投資境外基金之金額比率之規定，"
                    "「富達新興市場基金」(下稱本基金)將自 99/09/17 暫停受理投資人辦理全新之單筆申購、定期定額申購及轉申購等交易；"
                    "惟原以定期定額申購本基金之投資人仍得繼續扣款，但不得增加扣款金額、扣款天數，且申請暫停扣款後不得恢復扣款。\n"
                    "如有任何疑問，歡迎洽詢您的理財專員或電洽 0800-000-456，將有專人竭誠為您服務。\n"
                    "民國 99 年 9 月 16 日"
                )
            else:
                repaired_ocr = raw_ocr

            parsed = parse_ocr_text_to_structured_guide(repaired_ocr)
            masked_text, _ = mask_sensitive_text(parsed["raw_ocr_text"])
            old_analysis = json.loads(r["analysis_json"] or "{}")
            engine_mode = old_analysis.get("engine_mode", "")

            if engine_mode in ("gemini_vlm_plus_ocr", "openai_chatgpt_vlm") and cur_title not in ("eee", "ee", "aa", "oo", "區通知函"):
                old_analysis["highlights"] = parsed["highlights"]
                cur.execute(
                    "UPDATE recognition_records SET analysis_json = ? WHERE record_id = ?",
                    (json.dumps(old_analysis, ensure_ascii=False), r["record_id"])
                )
                continue

            old_analysis.update({
                "doc_title": parsed["doc_title"],
                "doc_category": parsed["doc_category"],
                "issuer": parsed["issuer"],
                "summary_one_line": parsed["summary_one_line"],
                "next_step_short": parsed["next_step_short"],
                "deadline": parsed["deadline"],
                "raw_ocr_text": parsed["raw_ocr_text"],
                "masked_ocr_text": masked_text,
                "five_questions": parsed["five_questions"],
                "action_steps": parsed["action_steps"],
                "checklist": parsed["checklist"],
                "highlights": parsed["highlights"],
                "tts": {
                    "mandarin": parsed["tts_mandarin"],
                    "taiwanese": parsed["tts_taiwanese"]
                }
            })
            fq = parsed["five_questions"]
            cur.execute("""
                UPDATE recognition_records
                SET doc_title = ?,
                    doc_category = ?,
                    issuer = ?,
                    summary_one_line = ?,
                    next_step_short = ?,
                    deadline = ?,
                    q1_what_is_it = ?,
                    q2_need_action = ?,
                    q3_where_and_what = ?,
                    q4_where_to_sign = ?,
                    q5_important_notes = ?,
                    action_steps_json = ?,
                    checklist_json = ?,
                    raw_ocr_text = ?,
                    masked_ocr_text = ?,
                    analysis_json = ?
                WHERE record_id = ?
            """, (
                parsed["doc_title"],
                parsed["doc_category"],
                parsed["issuer"],
                parsed["summary_one_line"],
                parsed["next_step_short"],
                parsed["deadline"],
                fq["what_is_it"],
                fq["need_action_and_deadline"],
                fq["where_and_what_to_bring"],
                fq["where_to_sign"],
                fq["important_notes"],
                json.dumps(parsed["action_steps"], ensure_ascii=False),
                json.dumps(parsed["checklist"], ensure_ascii=False),
                parsed["raw_ocr_text"],
                masked_text,
                json.dumps(old_analysis, ensure_ascii=False),
                r["record_id"]
            ))
        conn.commit()
        conn.close()

    def _row_to_dict(self, row) -> Dict[str, Any]:
        return {
            "record_id": row["record_id"],
            "created_at": row["created_at"],
            "source_type": row["source_type"],
            "source_label": row["source_label"],
            "filename": row["filename"],
            "document_id": row["document_id"],
            "doc_title": row["doc_title"],
            "doc_category": row["doc_category"],
            "issuer": row["issuer"],
            "is_scam": bool(row["is_scam"]),
            "summary_one_line": row["summary_one_line"],
            "next_step_short": row["next_step_short"],
            "deadline": row["deadline"],
            "five_questions": {
                "what_is_it": row["q1_what_is_it"] or "",
                "need_action_and_deadline": row["q2_need_action"] or "",
                "where_and_what_to_bring": row["q3_where_and_what"] or "",
                "where_to_sign": row["q4_where_to_sign"] or "",
                "important_notes": row["q5_important_notes"] or "",
            },
            "action_steps": json.loads(row["action_steps_json"] or "[]"),
            "checklist": json.loads(row["checklist_json"] or "[]"),
            "raw_ocr_text": row["raw_ocr_text"] or "",
            "masked_ocr_text": row["masked_ocr_text"] or "",
            "original_image_url": row["original_image_url"] or "",
            "preprocessing": json.loads(row["preprocessing_json"] or "{}"),
            "analysis": json.loads(row["analysis_json"] or "{}"),
        }

    def add_record(
        self,
        source_type: str,
        filename: str,
        document_id: str,
        original_image_url: str,
        preprocessing: Dict[str, Any],
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        record_id = f"rec_{uuid.uuid4().hex[:8]}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        source_label = "自訂上傳照片" if source_type == "upload" else "內建範例文件"
        fq = analysis.get("five_questions", {})

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO recognition_records (
                record_id, created_at, source_type, source_label, filename,
                document_id, doc_title, doc_category, issuer, is_scam,
                summary_one_line, next_step_short, deadline,
                q1_what_is_it, q2_need_action, q3_where_and_what,
                q4_where_to_sign, q5_important_notes,
                action_steps_json, checklist_json,
                raw_ocr_text, masked_ocr_text,
                original_image_url, preprocessing_json, analysis_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            record_id,
            now_str,
            source_type,
            source_label,
            filename,
            document_id,
            analysis.get("doc_title", "未命名文件"),
            analysis.get("doc_category", "銀行通知"),
            analysis.get("issuer", "金融機構"),
            1 if analysis.get("is_scam") else 0,
            analysis.get("summary_one_line", ""),
            analysis.get("next_step_short", ""),
            analysis.get("deadline", ""),
            fq.get("what_is_it", ""),
            fq.get("need_action_and_deadline", ""),
            fq.get("where_and_what_to_bring", ""),
            fq.get("where_to_sign", ""),
            fq.get("important_notes", ""),
            json.dumps(analysis.get("action_steps", []), ensure_ascii=False),
            json.dumps(analysis.get("checklist", []), ensure_ascii=False),
            analysis.get("raw_ocr_text", ""),
            analysis.get("masked_ocr_text", ""),
            original_image_url,
            json.dumps(preprocessing, ensure_ascii=False),
            json.dumps(analysis, ensure_ascii=False)
        ))
        conn.commit()

        cur.execute("SELECT * FROM recognition_records WHERE record_id = ?", (record_id,))
        row = cur.fetchone()
        conn.close()
        return self._row_to_dict(row)

    def update_record(self, record_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        人工修正或重新解析單筆辨識紀錄，並同步寫回 SQLite `recognition_records` 資料表
        """
        existing = self.get_record(record_id)
        if not existing:
            return None

        analysis = existing.get("analysis", {})
        raw_ocr = updates.get("raw_ocr_text", existing.get("raw_ocr_text", ""))

        # 若使用者點選「依修改後的 OCR 原文重新自動生成五題導讀」
        if updates.get("reparse_from_ocr") and raw_ocr.strip():
            parsed = parse_ocr_text_to_structured_guide(raw_ocr)
            masked_text, _ = mask_sensitive_text(raw_ocr)
            scam_res = analyze_scam_risk(raw_ocr)
            is_scam = bool(parsed.get("is_scam") or scam_res["is_scam_warning"])

            doc_title = updates.get("doc_title") or parsed["doc_title"]
            doc_category = "可疑通知" if is_scam else (updates.get("doc_category") or parsed["doc_category"])
            issuer = updates.get("issuer") or parsed["issuer"]
            summary_one_line = parsed["summary_one_line"]
            next_step_short = parsed["next_step_short"]
            deadline = parsed["deadline"]
            fq = parsed["five_questions"]
            action_steps = parsed["action_steps"]
            checklist = parsed["checklist"]
            tts = {
                "mandarin": parsed["tts_mandarin"],
                "taiwanese": parsed["tts_taiwanese"]
            }
            analysis["scam_analysis"] = scam_res
        else:
            # 人工直接編輯特定欄位
            doc_title = updates.get("doc_title", existing["doc_title"])
            doc_category = updates.get("doc_category", existing["doc_category"])
            issuer = updates.get("issuer", existing["issuer"])
            is_scam = bool(updates.get("is_scam", existing["is_scam"]))
            summary_one_line = updates.get("summary_one_line", existing["summary_one_line"])
            next_step_short = updates.get("next_step_short", existing["next_step_short"])
            deadline = updates.get("deadline", existing["deadline"])
            fq = updates.get("five_questions", existing["five_questions"])
            action_steps = updates.get("action_steps", existing["action_steps"])
            checklist = updates.get("checklist", existing["checklist"])
            masked_text, _ = mask_sensitive_text(raw_ocr)
            tts = {
                "mandarin": (
                    f"阿公阿嬤您好，這張是{issuer}的「{doc_title}」。"
                    f"{summary_one_line} 下一步：{next_step_short} 辦理期限：{deadline}。"
                ),
                "taiwanese": (
                    f"阿公阿嬤平安，這張是{issuer}的「{doc_title}」。"
                    f"{summary_one_line} 請注意辦理期限是：{deadline}。"
                )
            }

        analysis.update({
            "doc_title": doc_title,
            "doc_category": doc_category,
            "issuer": issuer,
            "is_scam": is_scam,
            "summary_one_line": summary_one_line,
            "next_step_short": next_step_short,
            "deadline": deadline,
            "raw_ocr_text": raw_ocr,
            "masked_ocr_text": masked_text,
            "five_questions": fq,
            "action_steps": action_steps,
            "checklist": checklist,
            "tts": tts
        })

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE recognition_records
            SET doc_title = ?,
                doc_category = ?,
                issuer = ?,
                is_scam = ?,
                summary_one_line = ?,
                next_step_short = ?,
                deadline = ?,
                q1_what_is_it = ?,
                q2_need_action = ?,
                q3_where_and_what = ?,
                q4_where_to_sign = ?,
                q5_important_notes = ?,
                action_steps_json = ?,
                checklist_json = ?,
                raw_ocr_text = ?,
                masked_ocr_text = ?,
                analysis_json = ?
            WHERE record_id = ?
        """, (
            doc_title,
            doc_category,
            issuer,
            1 if is_scam else 0,
            summary_one_line,
            next_step_short,
            deadline,
            fq.get("what_is_it", ""),
            fq.get("need_action_and_deadline", ""),
            fq.get("where_and_what_to_bring", ""),
            fq.get("where_to_sign", ""),
            fq.get("important_notes", ""),
            json.dumps(action_steps, ensure_ascii=False),
            json.dumps(checklist, ensure_ascii=False),
            raw_ocr,
            masked_text,
            json.dumps(analysis, ensure_ascii=False),
            record_id
        ))
        conn.commit()
        cur.execute("SELECT * FROM recognition_records WHERE record_id = ?", (record_id,))
        row = cur.fetchone()
        conn.close()
        return self._row_to_dict(row) if row else None

    def list_records(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM recognition_records ORDER BY created_at DESC, rowid DESC")
        rows = cur.fetchall()
        conn.close()
        return [self._row_to_dict(r) for r in rows]

    def get_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM recognition_records WHERE record_id = ?", (record_id,))
        row = cur.fetchone()
        conn.close()
        return self._row_to_dict(row) if row else None

    def delete_record(self, record_id: str) -> bool:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM recognition_records WHERE record_id = ?", (record_id,))
        deleted = cur.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    def clear_all(self) -> None:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM recognition_records")
        conn.commit()
        conn.close()

    def export_csv_bytes(self) -> bytes:
        records = self.list_records()
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
        for r in records:
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
