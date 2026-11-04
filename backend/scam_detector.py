"""
模組三：防詐警示 (Scam Detection & Risk Assessment Engine)
內建詐騙關鍵字與異常要求比對規則，例如：
- 要求加私人 LINE
- 提供密碼或驗證碼
- 匯款到非金融機構/私人指定帳戶
- 催促限時匯款（如 30 分鐘內）
- 要求切勿向銀行人員或警察詢問
- 保證高報酬、穩賺不賠
"""

from typing import List, Dict, Any
import re


SCAM_RULES = [
    {
        "id": "private_account_transfer",
        "label": "匯款至私人指定帳戶或安全帳戶",
        "severity": "high",
        "keywords": [
            "私人指定帳戶", "指定帳戶", "驗證金", "安全帳戶", "監管帳戶",
            "保證金", "解除帳戶限制", "解除凍結", "匯入驗證"
        ],
        "description": "正式銀行或政府機關絕對不會要求民眾匯款至「私人帳戶」或繳交「驗證金／保證金」來解除帳戶凍結。"
    },
    {
        "id": "urgent_time_pressure",
        "label": "催促在極短時間內（如 30 分鐘內）完成匯款或操作",
        "severity": "high",
        "keywords": [
            "30分鐘內", "30 分鐘內", "立即匯入", "立即匯款", "限時匯款",
            "帳戶即將被凍結", "立即解除", "逾時將凍結", "兩小時內"
        ],
        "description": "詐騙集團常利用「帳戶即將凍結、限時30分鐘內處理」製造恐慌，讓長輩來不及向家人或銀行查證。"
    },
    {
        "id": "secrecy_demand",
        "label": "要求切勿向銀行人員、警方或家人詢問",
        "severity": "high",
        "keywords": [
            "切勿向銀行人員詢問", "請勿告知銀行", "偵查不公開", "不可告知他人",
            "勿向行員提及", "保密協議", "請勿向他人透露"
        ],
        "description": "要求「不要問銀行行員」是極典型的詐騙話術，目的是避開銀行臨櫃關懷提問與攔阻。"
    },
    {
        "id": "private_line_contact",
        "label": "要求加入私人 LINE 帳號或投資群組並提供金融資料",
        "severity": "high",
        "keywords": [
            "私人LINE", "私人 LINE", "加LINE", "加 LINE", "LINE ID",
            "專員LINE", "理財群組", "飆股群組", "老師帶單", "點擊連結加入"
        ],
        "description": "銀行不會要求客戶加入行員「私人 LINE」辦理帳戶審查或提供存摺、密碼等金融資料。"
    },
    {
        "id": "password_or_otp_request",
        "label": "索取網銀密碼、提款卡密碼或簡訊驗證碼 (OTP)",
        "severity": "high",
        "keywords": [
            "網銀密碼", "提款卡密碼", "驗證碼", "OTP", "安全碼",
            "提供密碼", "交付存摺與印章", "寄出提款卡"
        ],
        "description": "銀行人員在任何情況下都不會向您索取密碼、簡訊驗證碼，也不會派員到府收走您的存摺與提款卡。"
    },
    {
        "id": "high_return_guarantee",
        "label": "宣稱保證高報酬、穩賺不賠或內線抽籤",
        "severity": "high",
        "keywords": [
            "保證獲利", "穩賺不賠", "高報酬", "月息10%", "保本高息",
            "內線消息", "抽中股票", "保證翻倍", "零風險高收益"
        ],
        "description": "依警政署 165 統計，假投資詐騙占全國詐騙財損一半以上，凡標榜「穩賺不賠、保證高報酬」皆為高度可疑訊息。"
    }
]


def analyze_scam_risk(text: str, extra_demands: List[str] = None) -> Dict[str, Any]:
    """
    對文件文字內容進行防詐規則比對與風險評估
    """
    normalized_text = text or ""
    matched_rules = []
    suspicious_demands = []

    for rule in SCAM_RULES:
        matched_kw = [kw for kw in rule["keywords"] if kw.lower() in normalized_text.lower()]
        if matched_kw:
            matched_rules.append({
                "rule_id": rule["id"],
                "label": rule["label"],
                "severity": rule["severity"],
                "matched_keywords": matched_kw,
                "description": rule["description"]
            })
            suspicious_demands.append(rule["label"])

    if extra_demands:
        for demand in extra_demands:
            if demand not in suspicious_demands:
                suspicious_demands.append(demand)

    is_scam_warning = len(matched_rules) > 0 or bool(extra_demands)
    risk_level = "high" if is_scam_warning else "low"

    return {
        "is_scam_warning": is_scam_warning,
        "risk_level": risk_level,
        "headline": "請先停下，確認後再行動" if is_scam_warning else "未偵測到明顯詐騙話術，仍請留意官方管道核對",
        "suspicious_demands": suspicious_demands,
        "matched_rules": matched_rules,
        "official_advice": "請透過銀行官方管道查證，或撥打 165 反詐騙專線確認。",
        "disclaimer": "提醒不代表已完成真偽判定。重要決定請務必向銀行官方客服或家人再次確認。",
        "emergency_contacts": [
            {"name": "內政部警政署反詐騙專線", "phone": "165", "note": "24小時全年無休免費諮詢"},
            {"name": "銀行官方客服專線", "phone": "請撥打信用卡或存摺背面官方電話", "note": "切勿撥打可疑通知單上的私人電話"}
        ]
    }
