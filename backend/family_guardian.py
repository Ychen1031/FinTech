"""
模組四：語音朗讀與家屬守護網 (Family Guardian & Notification System)
負責：
1. 管理事先指定的家屬或社區關懷據點社工名單
2. 遇到高風險／疑似詐騙文件時，自動即時推播警報給家屬（「鐵三角防護：長輩操作、AI解讀、家人把關」）
3. 一般文件提供長輩「分享給家人」一鍵傳送導讀摘要與應備清單
4. 支援家屬端即時回覆確認訊息，讓長輩在畫面上直接看到家人的安心叮嚀
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid


class FamilyGuardianStore:
    def __init__(self):
        self.guardians: List[Dict[str, Any]] = [
            {
                "id": "g_son",
                "name": "王小明",
                "relation": "長子（緊急聯絡人）",
                "phone": "0912-345-678",
                "line_bound": True,
                "auto_notify_scam": True
            },
            {
                "id": "g_daughter",
                "name": "王雅婷",
                "relation": "女兒（同住／鄰近家屬）",
                "phone": "0928-888-168",
                "line_bound": True,
                "auto_notify_scam": True
            },
            {
                "id": "g_social_worker",
                "name": "陳淑芬 社工師",
                "relation": "楠梓社區關懷據點",
                "phone": "07-361-5111",
                "line_bound": True,
                "auto_notify_scam": False
            }
        ]

        self.notifications: List[Dict[str, Any]] = [
            {
                "id": "notif_init_1",
                "timestamp": "今日 10:15",
                "doc_title": "客戶審查權益通知",
                "doc_category": "銀行通知",
                "alert_type": "family_share",
                "is_scam": False,
                "summary": "銀行請長輩於 60 天內更新客戶基本資料，需準備確認書與身分證。",
                "recipients": ["王小明（長子）", "王雅婷（女兒）"],
                "status": "已由家屬確認回覆",
                "family_reply": {
                    "sender": "王小明（長子）",
                    "time": "今日 10:22",
                    "message": "爸，這張是銀行例行的資料更新通知，這禮拜五早上有空我載您去分行辦，身分證先放家裡收好喔！"
                }
            }
        ]

    def get_guardians(self) -> List[Dict[str, Any]]:
        return self.guardians

    def add_guardian(self, name: str, relation: str, phone: str, auto_notify_scam: bool = True) -> Dict[str, Any]:
        new_g = {
            "id": f"g_{uuid.uuid4().hex[:6]}",
            "name": name,
            "relation": relation,
            "phone": phone,
            "line_bound": True,
            "auto_notify_scam": auto_notify_scam
        }
        self.guardians.append(new_g)
        return new_g

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
        now_str = datetime.now().strftime("今日 %H:%M")
        recipients = [
            f"{g['name']}（{g['relation'].split('（')[0]}）"
            for g in self.guardians
            if (is_scam and g.get("auto_notify_scam")) or not is_scam
        ]
        if not recipients and self.guardians:
            recipients = [f"{self.guardians[0]['name']}（{self.guardians[0]['relation']}）"]

        default_reply = None
        status = "已推播至家屬 LINE 與守護端"
        if is_scam:
            status = "高風險警報已即時推播家屬"

        notif = {
            "id": f"notif_{uuid.uuid4().hex[:8]}",
            "timestamp": now_str,
            "doc_title": doc_title,
            "doc_category": doc_category,
            "alert_type": "scam_emergency" if is_scam else alert_type,
            "is_scam": is_scam,
            "summary": summary,
            "suspicious_demands": suspicious_demands or [],
            "custom_note": custom_note,
            "recipients": recipients,
            "status": status,
            "family_reply": default_reply
        }
        self.notifications.insert(0, notif)
        return notif

    def reply_to_notification(self, notif_id: str, sender: str, message: str) -> Optional[Dict[str, Any]]:
        now_str = datetime.now().strftime("今日 %H:%M")
        for n in self.notifications:
            if n["id"] == notif_id:
                n["status"] = "已由家屬確認回覆"
                n["family_reply"] = {
                    "sender": sender,
                    "time": now_str,
                    "message": message
                }
                return n
        return None


guardian_store = FamilyGuardianStore()
