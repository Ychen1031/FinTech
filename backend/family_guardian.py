"""
模組四：語音朗讀與家屬守護網 — SQLite 資料庫版 (family_guardian.py)
所有家屬／社工守護名單與推播回覆紀錄直接儲存於 SQLite：
- `family_guardians` 資料表
- `family_notifications` 資料表
"""

import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from database import get_db_connection, init_db


class FamilyGuardianStore:
    def __init__(self):
        init_db()

    def _notif_row_to_dict(self, row) -> Dict[str, Any]:
        reply = None
        if row["reply_message"]:
            reply = {
                "sender": row["reply_sender"] or "家屬",
                "time": row["reply_time"] or "",
                "message": row["reply_message"]
            }
        return {
            "id": row["id"],
            "timestamp": row["timestamp"],
            "doc_title": row["doc_title"],
            "doc_category": row["doc_category"],
            "alert_type": row["alert_type"],
            "is_scam": bool(row["is_scam"]),
            "summary": row["summary"] or "",
            "suspicious_demands": json.loads(row["suspicious_demands_json"] or "[]"),
            "custom_note": row["custom_note"] or "",
            "recipients": json.loads(row["recipients_json"] or "[]"),
            "status": row["status"],
            "family_reply": reply
        }

    def get_guardians(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM family_guardians ORDER BY rowid ASC")
        rows = cur.fetchall()
        conn.close()
        return [
            {
                "id": r["id"],
                "name": r["name"],
                "relation": r["relation"],
                "phone": r["phone"],
                "line_bound": bool(r["line_bound"]),
                "auto_notify_scam": bool(r["auto_notify_scam"])
            }
            for r in rows
        ]

    @property
    def notifications(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM family_notifications ORDER BY rowid DESC")
        rows = cur.fetchall()
        conn.close()
        return [self._notif_row_to_dict(r) for r in rows]

    def add_guardian(self, name: str, relation: str, phone: str, auto_notify_scam: bool = True) -> Dict[str, Any]:
        gid = f"g_{uuid.uuid4().hex[:6]}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO family_guardians (id, name, relation, phone, line_bound, auto_notify_scam, created_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
        """, (gid, name, relation, phone, 1 if auto_notify_scam else 0, now_str))
        conn.commit()
        conn.close()
        return {
            "id": gid,
            "name": name,
            "relation": relation,
            "phone": phone,
            "line_bound": True,
            "auto_notify_scam": auto_notify_scam
        }

    def send_notification(
        self,
        doc_title: str,
        doc_category: str,
        is_scam: bool,
        summary: str,
        alert_type: str = "family_share",
        suspicious_demands: Optional[List[str]] = None,
        custom_note: str = ""
    ) -> Dict[str, Any]:
        now_time = datetime.now().strftime("今日 %H:%M")
        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        guardians = self.get_guardians()

        recipients = [
            f"{g['name']}（{g['relation'].split('（')[0]}）"
            for g in guardians
            if (is_scam and g.get("auto_notify_scam")) or not is_scam
        ]
        if not recipients and guardians:
            recipients = [f"{guardians[0]['name']}（{guardians[0]['relation']}）"]

        status = "高風險警報已即時推播家屬" if is_scam else "已推播至家屬 LINE 與守護端"
        notif_id = f"notif_{uuid.uuid4().hex[:8]}"
        effective_alert_type = "scam_emergency" if is_scam else alert_type

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO family_notifications (
                id, timestamp, doc_title, doc_category, alert_type, is_scam,
                summary, suspicious_demands_json, custom_note, recipients_json,
                status, reply_sender, reply_time, reply_message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)
        """, (
            notif_id,
            now_time,
            doc_title,
            doc_category,
            effective_alert_type,
            1 if is_scam else 0,
            summary,
            json.dumps(suspicious_demands or [], ensure_ascii=False),
            custom_note,
            json.dumps(recipients, ensure_ascii=False),
            status,
            created_at
        ))
        conn.commit()

        cur.execute("SELECT * FROM family_notifications WHERE id = ?", (notif_id,))
        row = cur.fetchone()
        conn.close()
        return self._notif_row_to_dict(row)

    def reply_to_notification(self, notif_id: str, sender: str, message: str) -> Optional[Dict[str, Any]]:
        now_time = datetime.now().strftime("今日 %H:%M")
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE family_notifications
            SET status = '已由家屬確認回覆',
                reply_sender = ?,
                reply_time = ?,
                reply_message = ?
            WHERE id = ?
        """, (sender, now_time, message, notif_id))
        conn.commit()

        cur.execute("SELECT * FROM family_notifications WHERE id = ?", (notif_id,))
        row = cur.fetchone()
        conn.close()
        return self._notif_row_to_dict(row) if row else None


guardian_store = FamilyGuardianStore()
