"""
SQLite 關聯式資料庫核心模組 (database.py)
資料庫路徑：backend/data/silver_finance.db
包含四張核心關聯資料表：
1. recognition_records  — 金融文件辨識與固定五題結構化導讀紀錄表
2. family_guardians     — 家屬與社區社工守護名單表
3. family_notifications — 家屬防詐推播與雙向安心回覆紀錄表
4. scam_rules           — 165 防詐關鍵字與異常要求規則庫表
"""

import os
import json
import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(DATA_DIR, "silver_finance.db")
LEGACY_JSON_PATH = os.path.join(DATA_DIR, "recognition_history.json")


def get_db_connection() -> sqlite3.Connection:
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """
    初始化 SQLite 資料表結構，並載入預設種子資料（以及平滑遷移舊版 JSON 歷史紀錄）
    """
    conn = get_db_connection()
    cur = conn.cursor()

    # 1. 文件辨識與五題結構化導讀紀錄表
    cur.execute("""
        CREATE TABLE IF NOT EXISTS recognition_records (
            record_id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_label TEXT NOT NULL,
            filename TEXT,
            document_id TEXT,
            doc_title TEXT NOT NULL,
            doc_category TEXT NOT NULL,
            issuer TEXT,
            is_scam INTEGER NOT NULL DEFAULT 0,
            summary_one_line TEXT,
            next_step_short TEXT,
            deadline TEXT,
            q1_what_is_it TEXT,
            q2_need_action TEXT,
            q3_where_and_what TEXT,
            q4_where_to_sign TEXT,
            q5_important_notes TEXT,
            action_steps_json TEXT,
            checklist_json TEXT,
            raw_ocr_text TEXT,
            masked_ocr_text TEXT,
            original_image_url TEXT,
            preprocessing_json TEXT,
            analysis_json TEXT
        )
    """)

    # 2. 家屬與社工守護名單表
    cur.execute("""
        CREATE TABLE IF NOT EXISTS family_guardians (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            relation TEXT NOT NULL,
            phone TEXT NOT NULL,
            line_bound INTEGER NOT NULL DEFAULT 1,
            auto_notify_scam INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        )
    """)

    # 3. 家屬推播與雙向回覆紀錄表
    cur.execute("""
        CREATE TABLE IF NOT EXISTS family_notifications (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            doc_title TEXT NOT NULL,
            doc_category TEXT NOT NULL,
            alert_type TEXT NOT NULL,
            is_scam INTEGER NOT NULL DEFAULT 0,
            summary TEXT,
            suspicious_demands_json TEXT,
            custom_note TEXT,
            recipients_json TEXT,
            status TEXT NOT NULL,
            reply_sender TEXT,
            reply_time TEXT,
            reply_message TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # 4. 防詐關鍵字與異常要求規則表
    cur.execute("""
        CREATE TABLE IF NOT EXISTS scam_rules (
            rule_id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            severity TEXT NOT NULL,
            keywords_json TEXT NOT NULL,
            description TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # 檢查並寫入預設家屬守護名單
    cur.execute("SELECT COUNT(*) AS cnt FROM family_guardians")
    if cur.fetchone()["cnt"] == 0:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        default_guardians = [
            ("g_son", "王小明", "長子（緊急聯絡人）", "0912-345-678", 1, 1, now_str),
            ("g_daughter", "王雅婷", "女兒（同住／鄰近家屬）", "0928-888-168", 1, 1, now_str),
            ("g_social_worker", "陳淑芬 社工師", "楠梓社區關懷據點", "07-361-5111", 1, 0, now_str),
        ]
        cur.executemany("""
            INSERT INTO family_guardians (id, name, relation, phone, line_bound, auto_notify_scam, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, default_guardians)

    # 檢查並寫入預設家屬通知示範紀錄
    cur.execute("SELECT COUNT(*) AS cnt FROM family_notifications")
    if cur.fetchone()["cnt"] == 0:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cur.execute("""
            INSERT INTO family_notifications (
                id, timestamp, doc_title, doc_category, alert_type, is_scam,
                summary, suspicious_demands_json, custom_note, recipients_json,
                status, reply_sender, reply_time, reply_message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "notif_init_1",
            "今日 10:15",
            "客戶審查權益通知",
            "銀行通知",
            "family_share",
            0,
            "銀行請長輩於 60 天內更新客戶基本資料，需準備確認書與身分證。",
            "[]",
            "長輩將文件導讀結果分享給家屬查看。",
            json.dumps(["王小明（長子）", "王雅婷（女兒）"], ensure_ascii=False),
            "已由家屬確認回覆",
            "王小明（長子）",
            "今日 10:22",
            "爸，這張是銀行例行的資料更新通知，這禮拜五早上有空我載您去分行辦，身分證先放家裡收好喔！",
            now_str
        ))

    # 檢查並寫入預設 165 防詐規則庫
    cur.execute("SELECT COUNT(*) AS cnt FROM scam_rules")
    if cur.fetchone()["cnt"] == 0:
        from scam_detector import SCAM_RULES
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for r in SCAM_RULES:
            cur.execute("""
                INSERT INTO scam_rules (rule_id, label, severity, keywords_json, description, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                r["id"],
                r["label"],
                r["severity"],
                json.dumps(r["keywords"], ensure_ascii=False),
                r["description"],
                now_str
            ))

    # 若有舊版 JSON 辨識紀錄且資料表為空，自動匯入至 SQLite
    cur.execute("SELECT COUNT(*) AS cnt FROM recognition_records")
    if cur.fetchone()["cnt"] == 0 and os.path.exists(LEGACY_JSON_PATH):
        try:
            with open(LEGACY_JSON_PATH, "r", encoding="utf-8") as f:
                old_records = json.load(f)
            if isinstance(old_records, list):
                for rec in reversed(old_records):
                    fq = rec.get("five_questions", {})
                    cur.execute("""
                        INSERT OR IGNORE INTO recognition_records (
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
                        rec.get("record_id"),
                        rec.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
                        rec.get("source_type", "upload"),
                        rec.get("source_label", "自訂上傳照片"),
                        rec.get("filename", ""),
                        rec.get("document_id", ""),
                        rec.get("doc_title", "金融文件通知"),
                        rec.get("doc_category", "銀行通知"),
                        rec.get("issuer", "金融機構"),
                        1 if rec.get("is_scam") else 0,
                        rec.get("summary_one_line", ""),
                        rec.get("next_step_short", ""),
                        rec.get("deadline", ""),
                        fq.get("what_is_it", ""),
                        fq.get("need_action_and_deadline", ""),
                        fq.get("where_and_what_to_bring", ""),
                        fq.get("where_to_sign", ""),
                        fq.get("important_notes", ""),
                        json.dumps(rec.get("action_steps", []), ensure_ascii=False),
                        json.dumps(rec.get("checklist", []), ensure_ascii=False),
                        rec.get("raw_ocr_text", ""),
                        rec.get("masked_ocr_text", ""),
                        rec.get("original_image_url", ""),
                        json.dumps(rec.get("preprocessing", {}), ensure_ascii=False),
                        json.dumps(rec.get("analysis", {}), ensure_ascii=False),
                    ))
        except Exception as e:
            print(f"Warning: Failed migrating legacy JSON history: {e}")

    conn.commit()
    conn.close()


def get_db_summary_stats() -> Dict[str, Any]:
    """
    查詢 SQLite 資料庫各資料表統計資訊與文件分類統計（供前端與專題成果展示）
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) AS cnt FROM recognition_records")
    rec_count = cur.fetchone()["cnt"]

    cur.execute("SELECT COUNT(*) AS cnt FROM family_guardians")
    guardian_count = cur.fetchone()["cnt"]

    cur.execute("SELECT COUNT(*) AS cnt FROM family_notifications")
    notif_count = cur.fetchone()["cnt"]

    cur.execute("SELECT COUNT(*) AS cnt FROM scam_rules")
    rule_count = cur.fetchone()["cnt"]

    cur.execute("""
        SELECT doc_category, COUNT(*) AS cnt
        FROM recognition_records
        GROUP BY doc_category
        ORDER BY cnt DESC
    """)
    category_breakdown = [{"category": row["doc_category"], "count": row["cnt"]} for row in cur.fetchall()]

    conn.close()

    db_size_kb = round(os.path.getsize(DB_PATH) / 1024, 1) if os.path.exists(DB_PATH) else 0

    return {
        "engine": "SQLite 3 (Relational Database)",
        "db_file": "backend/data/silver_finance.db",
        "db_size_kb": db_size_kb,
        "tables": [
            {
                "table_name": "recognition_records",
                "description": "金融文件辨識結果與固定五題結構化導讀紀錄表",
                "row_count": rec_count
            },
            {
                "table_name": "family_guardians",
                "description": "事先指定之家屬與社區社工守護名單表",
                "row_count": guardian_count
            },
            {
                "table_name": "family_notifications",
                "description": "高風險防詐即時推播與家屬雙向安心回覆紀錄表",
                "row_count": notif_count
            },
            {
                "table_name": "scam_rules",
                "description": "165 反詐騙關鍵字與異常要求規則庫表",
                "row_count": rule_count
            }
        ],
        "category_breakdown": category_breakdown
    }


# 模組載入時自動初始化 SQLite 資料庫
init_db()
