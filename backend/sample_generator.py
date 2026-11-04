"""
模擬金融文件影像與結構化導讀資料產生器 (Sample Document Image & Data Generator)
包含計畫書中所有核心情境：
1. 客戶審查權益通知（對應計畫書畫面 2、3、4、5）
2. 3 年期儲蓄險保單到期通知（對應計畫書模組二範例表格）
3. 緊急帳戶通知 - 虛構可疑通知（對應計畫書畫面 6 防詐警示）
4. 信用卡帳單暨繳款通知（對應計畫書支援文件：信用卡帳單）
5. 水電費催繳暨代扣繳通知（對應計畫書支援文件：繳費單）
6. 專員私人 LINE 高息專案邀請（對應計畫書模組三：加私人 LINE 與高報酬防詐警示）
"""

import os
import io
import base64
from typing import Dict, Any, List
from PIL import Image, ImageDraw, ImageFont


def _get_chinese_font(size: int) -> ImageFont.FreeTypeFont:
    font_candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/Supplemental/Songti.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    for path in font_candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


SAMPLE_DOCUMENTS: Dict[str, Dict[str, Any]] = {
    "bank_kyc": {
        "id": "bank_kyc",
        "name": "客戶審查權益通知（銀行通知）",
        "badge": "計畫書畫面 2~5 範例",
        "doc_title": "客戶審查權益通知",
        "doc_category": "銀行通知",
        "issuer": "中國信託商業銀行（模擬範例）",
        "is_scam": False,
        "summary_one_line": "銀行請您更新客戶基本資料，以確保帳戶正常使用。",
        "next_step_short": "填妥客戶資料確認書，備妥身分證明文件，於期限內擇一方式繳回。",
        "deadline": "通知日起 60 天內（含）",
        "raw_ocr_text": (
            "客戶審查權益通知\n"
            "親愛的客戶 王大明（身分證：A123456789） 您好：\n"
            "感謝您對中國信託商業銀行(以下稱本行)的支持與愛護，本行為保障客戶所有帳戶"
            "的交易安全，及配合洗錢防制相關法令要求，將不定期向您及法定代理人進行帳戶資"
            "料更新事宜，避免帳戶遭不當使用。\n"
            "為有效管理帳戶，請您於收受本通知之日起 60 天（含）內：\n"
            "1. 填寫隨信附上之「客戶資料確認函」並於右下角簽名或蓋原留印鑑。\n"
            "2. 將身分證明文件影本黏貼於「客戶資料確認函」：\n"
            "   (1) 本國成年人請提供身分證。\n"
            "   (2) 未滿20歲未成年人請提供戶口名簿、戶籍謄本或身分證。\n"
            "「客戶資料確認函」請以下列任一方式提供予本行：\n"
            "(1) 親至全省各分行辦理。\n"
            "(2) 電子郵件傳送至：ba.rbop@ctbcbank.com\n"
            "(3) 傳真至：02-33229308\n"
            "(4) 郵寄至：台北市信義區永吉路18號7樓 作業銀行收\n"
            "提醒您！若您於前述期限內未能提供相關文件予本行，本行將暫時停止您自動化交易及新業務申請。"
        ),
        "five_questions": {
            "what_is_it": "這是銀行寄來的「定期客戶資料更新通知」（配合洗錢防制法規的例行審查）。",
            "need_action_and_deadline": "要處理！請在收到通知日起 60 天內（含）完成資料更新。",
            "where_and_what_to_bring": "帶著「填好的客戶資料確認書」與「身分證正反面影本（或正本）」，可親自到各分行辦理，或用郵寄、傳真、電子郵件寄回。",
            "where_to_sign": "隨信附上的「客戶資料確認函」右下角簽名欄（畫面上已用紅框標出位置）。",
            "important_notes": "若超過 60 天未更新，帳戶不會被沒收，但提款卡轉帳、網銀與新業務申請會暫時停用，建議盡快辦理。"
        },
        "action_steps": [
            {
                "step_num": 1,
                "title": "確認辦理期限",
                "detail": "通知日起 60 天內（含）完成辦理，避免自動化交易（ATM／網銀）被暫停。",
                "source_note": "對應文件第 2 段：收受本通知之日起60天(含)內"
            },
            {
                "step_num": 2,
                "title": "準備應備資料並簽名",
                "detail": "填寫隨信附上的「客戶資料確認書」，黏貼身分證影本，並在右下角本人簽名。",
                "source_note": "對應文件第 2 段第 1、2 點說明"
            },
            {
                "step_num": 3,
                "title": "確認繳交方式（四選一）",
                "detail": "依通知所列方式擇一提供：① 親至各分行臨櫃辦理（最推薦長輩） ② 郵寄 ③ 傳真 ④ 電子郵件。",
                "source_note": "對應文件第 3 段繳交管道列表"
            }
        ],
        "checklist": [
            {
                "id": "chk_kyc_form",
                "label": "客戶資料確認書（已填寫並於右下角簽名）",
                "hint": "隨通知信附上的表格，若遺失可直接到分行請行員補印",
                "required": True
            },
            {
                "id": "chk_id_card",
                "label": "適用的身分證明文件（國民身分證正本／影本）",
                "hint": "本國成年人請帶身分證正本，去分行時行員可免費協助影印",
                "required": True
            },
            {
                "id": "chk_seal",
                "label": "原留印鑑與存摺（建議一併攜帶備用）",
                "hint": "臨櫃辦理時若有印鑑核對需求可當場處理，少跑一趟",
                "required": False
            }
        ],
        "highlights": [
            {"x": 0.45, "y": 0.30, "w": 0.38, "h": 0.045, "label": "辦理期限：60天（含）內", "type": "deadline"},
            {"x": 0.14, "y": 0.42, "w": 0.55, "h": 0.055, "label": "應備文件：身分證影本", "type": "document"},
            {"x": 0.62, "y": 0.78, "w": 0.28, "h": 0.09, "label": "簽名位置：確認函右下角", "type": "signature"}
        ],
        "pii_regions": [
            {"x": 0.28, "y": 0.13, "w": 0.46, "h": 0.036, "label": "客戶姓名與身分證字號已遮罩"}
        ],
        "tts_mandarin": (
            "阿公阿嬤您好，這張是銀行寄來的「客戶審查權益通知」。"
            "簡單來說，銀行請您更新客戶基本資料。"
            "您需要在收到通知 60 天以內處理。"
            "下一步請準備好「客戶資料確認書」還有您的「身分證」，"
            "在確認書右下角簽名之後，帶去附近的分行辦理就可以了。"
        ),
        "tts_taiwanese": (
            "阿公阿嬤平安，這張單仔是銀行寄來的「客戶資料更新通知」。"
            "意思就是銀行請您去更新基本資料，保護您的帳戶安全。"
            "愛處理喔！請在六十工以內辦好。"
            "您出門進前，記得帶「客戶資料確認書」閣有「身分證」，"
            "佇右下角簽一個名，直接拿去銀行分行請行員幫您辦就好囉！"
        )
    },
    "insurance_maturity": {
        "id": "insurance_maturity",
        "name": "3 年期儲蓄險保單到期通知（保險通知）",
        "badge": "計畫書模組二表格範例",
        "doc_title": "3 年期儲蓄險保單到期通知",
        "doc_category": "保險通知",
        "issuer": "富邦／國泰人壽保險公司（模擬範例）",
        "is_scam": False,
        "summary_one_line": "您的 3 年期儲蓄險即將到期，請辦理滿期金領取或續存手續。",
        "next_step_short": "帶身分證、原留印鑑與存摺，於本週五前到分行或服務櫃檯辦理。",
        "deadline": "本週五前（2026 年 11 月 6 日前）",
        "raw_ocr_text": (
            "保單滿期金領取暨到期通知書\n"
            "保單號碼：9876-543210-01   要保人：林春嬌（身分證：B223456789）\n"
            "險種名稱：鑫富利 3 年期養老儲蓄保險\n"
            "滿期日期：2026 年 11 月 6 日（本週五）   滿期給付金額：新臺幣 528,000 元整\n"
            "辦理說明：\n"
            "1. 請於滿期日（本週五）前確認滿期金撥付方式。\n"
            "2. 請攜帶本人國民身分證、原留印鑑及指定匯款銀行存摺影本至鄰近服務中心或合作銀行分行辦理。\n"
            "3. 申請書簽名欄位於第 2 頁右下角，請要保人及受益人親筆簽名。\n"
            "注意事項：超過期限未辦理領取或指定續存方案者，款項將依條款約定自動轉入利率較低的活期儲蓄帳戶計息。"
        ),
        "five_questions": {
            "what_is_it": "這是您 3 年期儲蓄險的保單到期通知（滿期金共 52 萬 8 千元）。",
            "need_action_and_deadline": "要，請在本週五前辦理。",
            "where_and_what_to_bring": "帶身分證、原留印鑑和收款存摺，到附近的分行或保險服務中心辦。",
            "where_to_sign": "第 2 頁右下角（畫面上已用紅框標出簽名位置）。",
            "important_notes": "超過期限沒辦，錢會自動轉進利率較低的活儲，建議盡快處理。"
        },
        "action_steps": [
            {
                "step_num": 1,
                "title": "確認滿期期限與金額",
                "detail": "請在本週五前辦理，本次到期可領回滿期金新臺幣 528,000 元。",
                "source_note": "對應文件：滿期日期與滿期給付金額欄"
            },
            {
                "step_num": 2,
                "title": "在右下角簽名欄親筆簽名",
                "detail": "於申請書右下角「要保人／受益人簽名處」簽名並蓋原留印鑑。",
                "source_note": "對應文件第 3 點及右下角紅框處"
            },
            {
                "step_num": 3,
                "title": "攜帶證件至鄰近分行辦理",
                "detail": "帶著身分證、原留印鑑及要把錢匯進去的銀行存摺，前往合作銀行分行辦理匯款。",
                "source_note": "對應文件辦理說明第 2 點"
            }
        ],
        "checklist": [
            {
                "id": "chk_ins_id",
                "label": "本人國民身分證正本",
                "hint": "核對要保人與受益人身分必備",
                "required": True
            },
            {
                "id": "chk_ins_seal",
                "label": "原留印鑑（開戶／投保時蓋的印章）",
                "hint": "請確認是當初辦理保單時留存的印章",
                "required": True
            },
            {
                "id": "chk_ins_book",
                "label": "本人銀行存摺（指定匯入滿期金用）",
                "hint": "滿期金會直接匯入您本人的這個銀行帳戶",
                "required": True
            },
            {
                "id": "chk_ins_form",
                "label": "到期通知書暨滿期金申請書（右下角已簽名）",
                "hint": "已在第 2 頁右下角簽名欄完成簽名",
                "required": True
            }
        ],
        "highlights": [
            {"x": 0.14, "y": 0.28, "w": 0.72, "h": 0.055, "label": "滿期日：本週五前／金額 528,000 元", "type": "deadline"},
            {"x": 0.14, "y": 0.45, "w": 0.68, "h": 0.06, "label": "應備：身分證、原留印鑑、存摺", "type": "document"},
            {"x": 0.60, "y": 0.76, "w": 0.30, "h": 0.10, "label": "簽名位置：第 2 頁右下角", "type": "signature"}
        ],
        "pii_regions": [
            {"x": 0.20, "y": 0.15, "w": 0.65, "h": 0.04, "label": "保單號碼與身分證字號已遮罩"}
        ],
        "tts_mandarin": (
            "阿公阿嬤您好，這張是您三年期儲蓄險的保單到期通知。"
            "這張單子需要處理，請在本週五前辦理。"
            "請帶著您的身分證、原留印鑑還有存摺，到附近的分行辦理。"
            "簽名位置在第二頁右下角，畫面上已經幫您框出來了。"
            "提醒您，如果超過期限沒辦，錢會自動轉進利率比較低的活儲，建議盡快處理喔！"
        ),
        "tts_taiwanese": (
            "阿公阿嬤平安，這張是您三年期儲蓄險到期的通知單。"
            "這張愛處理喔！請佇禮拜五進前去辦。"
            "出門記得帶您的身分證、原留印章閣有存摺，去附近的銀行分行辦。"
            "愛簽名的所在佇第二頁右下角，畫面頂頭已經用紅框仔幫您標起來矣。"
            "若超過時間無去辦，這筆錢會自動轉去利息較低的活期存款，建議您趁早處理喔！"
        )
    },
    "scam_urgent_account": {
        "id": "scam_urgent_account",
        "name": "緊急帳戶通知（可疑詐騙警示）",
        "badge": "計畫書畫面 6 防詐範例",
        "doc_title": "緊急帳戶通知（可疑通知）",
        "doc_category": "可疑通知",
        "issuer": "不明來源（偽冒金融機構通知）",
        "is_scam": True,
        "summary_one_line": "這份通知要求您 30 分鐘內匯款至私人指定帳戶，並要求切勿詢問銀行，屬於高度可疑詐騙訊息！",
        "next_step_short": "請先停下，不要匯款、不要提供任何資料！請立即請家人協助或撥打 165 查證。",
        "deadline": "請勿理會單據上的「30 分鐘」催促期限！",
        "raw_ocr_text": (
            "緊急帳戶通知\n"
            "立即解除帳戶限制\n"
            "您的帳戶即將被凍結！\n"
            "因系統偵測異常資金往來，請立即匯入驗證金以解除控管。\n"
            "收款帳戶：私人指定帳戶（監管專戶 012-9988-776655）\n"
            "請在 30 分鐘內完成匯款。\n"
            "切勿向銀行人員詢問，以免影響金檢程序。\n"
            "或立即加入專員私人 LINE ID: @safe_verify888 提供存摺與網銀密碼。"
        ),
        "five_questions": {
            "what_is_it": "【高風險警示】這是一份偽裝成銀行緊急通知的「可疑詐騙單據」！",
            "need_action_and_deadline": "請絕對不要匯款！單據上寫「30 分鐘內匯款」是為了製造緊張感，請勿理會。",
            "where_and_what_to_bring": "哪裡都不用去、什麼錢都不要匯！真正的銀行絕不會要您匯驗證金到私人帳戶。",
            "where_to_sign": "請勿簽名，也不要加單據上的私人 LINE 或提供密碼。",
            "important_notes": "單據要求「切勿向銀行人員詢問」是標準詐騙話術。系統已準備好幫您通知家人協助確認！"
        },
        "action_steps": [
            {
                "step_num": 1,
                "title": "立刻停止操作，切勿匯款",
                "detail": "不要前往 ATM 或銀行匯款，也不要加入通知上的私人 LINE。",
                "source_note": "防詐鐵律：銀行不會要求匯入驗證金"
            },
            {
                "step_num": 2,
                "title": "按下「請家人協助確認」",
                "detail": "系統會立即把這張可疑通知傳給您指定的子女或社工，由家人幫您把關。",
                "source_note": "家屬守護網即時連動"
            },
            {
                "step_num": 3,
                "title": "撥打 165 反詐騙專線或存摺背面官方客服",
                "detail": "若想確認帳戶是否正常，請看「自己存摺背面」的電話號碼撥打，切勿撥打可疑通知上的電話。",
                "source_note": "內政部警政署 165 防詐指引"
            }
        ],
        "checklist": [
            {
                "id": "chk_scam_stop",
                "label": "我還沒有匯款，也沒有提供密碼或驗證碼",
                "hint": "若已提供密碼或匯款，請立即撥打 165 或 110 報案圈存止付",
                "required": True
            },
            {
                "id": "chk_scam_family",
                "label": "已按下方按鈕通知家人協助確認",
                "hint": "讓子女或家屬看過最放心",
                "required": True
            }
        ],
        "highlights": [
            {"x": 0.10, "y": 0.44, "w": 0.78, "h": 0.08, "label": "可疑要求：匯入驗證金／私人指定帳戶", "type": "danger"},
            {"x": 0.10, "y": 0.60, "w": 0.65, "h": 0.07, "label": "異常催促：請在 30 分鐘內完成匯款", "type": "danger"},
            {"x": 0.10, "y": 0.71, "w": 0.68, "h": 0.07, "label": "典型詐騙話術：切勿向銀行人員詢問", "type": "danger"}
        ],
        "pii_regions": [],
        "tts_mandarin": (
            "請先停下！千萬不要操作！這張「緊急帳戶通知」非常可疑，很有可能是詐騙！"
            "它要求您匯款到私人指定帳戶，還催促您在 30 分鐘內匯款，甚至叫您不要問銀行人員。"
            "真正的銀行絕對不會這樣要求！系統已經準備好幫您通知家人，請先按「請家人協助確認」，或打 165 反詐騙專線查證！"
        ),
        "tts_taiwanese": (
            "阿公阿嬤請先停落來！千萬毋通匯款喔！"
            "這張「緊急帳戶通知」真可疑，九成九是詐騙集團騙人的！"
            "伊叫您三十分鐘內匯錢去私人帳戶，閣叫您毋通問銀行人員，真正的銀行絕對袂按呢做！"
            "請您馬上按下面「請家人協助確認」的鈕仔，抑是打一六五反詐騙電話問看覓，保護您的血汗錢！"
        )
    },
    "credit_card_bill": {
        "id": "credit_card_bill",
        "name": "信用卡對帳單暨繳款通知（信用卡帳單）",
        "badge": "常見帳單導讀",
        "doc_title": "11 月份信用卡消費對帳單",
        "doc_category": "信用卡帳單",
        "issuer": "玉山／國泰商業銀行（模擬範例）",
        "is_scam": False,
        "summary_one_line": "這是您本月份的信用卡帳單，本期應繳總金額為 6,850 元。",
        "next_step_short": "請於 11 月 20 日前，持帳單至超商、ATM 或銀行臨櫃繳納 6,850 元。",
        "deadline": "2026 年 11 月 20 日（繳款截止日）",
        "raw_ocr_text": (
            "信用卡電子／紙本綜合對帳單\n"
            "持卡人：陳金龍   卡號：4311-95**-****-8821\n"
            "帳單結帳日：2026/11/03   繳款截止日：2026/11/20\n"
            "本期應繳總金額：NT$ 6,850 元   最低應繳金額：NT$ 1,000 元\n"
            "消費明細：\n"
            "10/12 全聯福利中心 消費 NT$ 1,420\n"
            "10/19 高雄長庚紀念醫院 門診批價 NT$ 580\n"
            "10/25 中華電信電話費代繳 NT$ 650\n"
            "10/28 全國電子 暖氣機家電 NT$ 4,200\n"
            "繳款方式：可持本單條碼至四大超商（2萬元以下免手續費）、全國農業金庫或各銀行分之 ATM／臨櫃繳款。"
        ),
        "five_questions": {
            "what_is_it": "這是您 11 月份的信用卡帳單（包含全聯、長庚醫院、電話費與全國電子共 4 筆消費）。",
            "need_action_and_deadline": "要處理！請在 11 月 20 日前完成繳費，共需繳納 6,850 元。",
            "where_and_what_to_bring": "帶著這張帳單與現金 6,850 元，直接到附近的統一 7-11、全家超商或銀行櫃檯就能繳費。",
            "where_to_sign": "不用簽名！超商繳費後請記得拿回「蓋店章的收據聯」與「白色交易明細表」保存。",
            "important_notes": "建議一次繳清「本期應繳總金額 6,850 元」；如果只繳最低應繳金額 1,000 元，剩下的錢會產生較高的循環利息。"
        },
        "action_steps": [
            {
                "step_num": 1,
                "title": "核對 4 筆消費明細是否正確",
                "detail": "全聯 1,420 元、長庚醫院 580 元、電話費 650 元、全國電子 4,200 元，合計 6,850 元。",
                "source_note": "對應文件：消費明細表"
            },
            {
                "step_num": 2,
                "title": "準備現金 6,850 元與本張帳單",
                "detail": "建議繳清全額 6,850 元，避免只繳最低金額產生循環利息。",
                "source_note": "對應文件：本期應繳總金額欄"
            },
            {
                "step_num": 3,
                "title": "於 11 月 20 日前至超商或銀行繳費",
                "detail": "金額在 2 萬元以下，直接拿到巷口超商刷條碼繳費最方便，並請保留收據。",
                "source_note": "對應文件底部：超商代收條碼區"
            }
        ],
        "checklist": [
            {
                "id": "chk_cc_bill",
                "label": "本張信用卡繳費單（含下方超商條碼聯）",
                "hint": "請勿摺疊或弄髒最下方的條碼區",
                "required": True
            },
            {
                "id": "chk_cc_cash",
                "label": "繳費現金 新臺幣 6,850 元",
                "hint": "一次繳清全額免利息",
                "required": True
            }
        ],
        "highlights": [
            {"x": 0.12, "y": 0.25, "w": 0.76, "h": 0.09, "label": "截止日：11/20｜應繳總額：6,850 元", "type": "deadline"},
            {"x": 0.12, "y": 0.44, "w": 0.76, "h": 0.24, "label": "消費明細（全聯／醫院／電信／家電）", "type": "document"}
        ],
        "pii_regions": [
            {"x": 0.20, "y": 0.15, "w": 0.62, "h": 0.04, "label": "持卡人姓名與卡號已遮罩"}
        ],
        "tts_mandarin": (
            "阿公阿嬤您好，這張是您 11 月份的信用卡帳單。"
            "這個月總共刷了 4 筆，包含全聯、長庚醫院、電話費跟全國電子，總共要繳 6,850 元。"
            "請在 11 月 20 號以前，帶著這張單子跟現金 6,850 元，去附近的超商或銀行繳費就可以囉，這張單子不需要簽名。"
        ),
        "tts_taiwanese": (
            "阿公阿嬤平安，這張是您十一月的信用卡帳單。"
            "這期攏總有四筆消費，包含全聯、長庚病院、電話費閣有全國電子，總共愛繳六千八百五十箍。"
            "請佇十一月二十號進前，拿這張單仔佮六千八百五十箍現金，去巷仔口的超商刷條碼繳錢就好囉，免簽名喔！"
        )
    }
}


def render_sample_document_image(doc_id: str) -> bytes:
    """
    使用 Pillow 動態繪製高解析度、擬真的台灣金融通知書／防詐單據照片，
    讓使用者不論點擊範例或下載後重新上傳，都有真實清晰的文件影像。
    """
    width, height = 820, 1060
    # 帶有紙張質感的米白底色
    bg_color = (246, 244, 238)
    img = Image.new("RGB", (width, height), color=(218, 220, 216))
    draw = ImageDraw.Draw(img)

    # 繪製紙張陰影與紙面
    draw.rectangle([36, 36, width - 28, height - 28], fill=(185, 188, 184))
    draw.rectangle([28, 28, width - 36, height - 36], fill=bg_color, outline=(200, 198, 190), width=2)

    font_title = _get_chinese_font(30)
    font_sub = _get_chinese_font(22)
    font_body = _get_chinese_font(19)
    font_small = _get_chinese_font(16)

    if doc_id == "scam_urgent_account":
        # 畫面 6：虛構可疑通知（緊急帳戶通知）
        draw.text((80, 90), "緊急帳戶通知", fill=(35, 35, 35), font=_get_chinese_font(38))
        draw.text((80, 155), "立即解除帳戶限制", fill=(75, 75, 75), font=_get_chinese_font(26))
        draw.line([(80, 210), (width - 80, 210)], fill=(170, 170, 170), width=2)

        y = 265
        lines = [
            "您的帳戶即將被凍結！",
            "請立即匯入驗證金。",
            "收款帳戶：私人指定帳戶（012-9988-776655）",
            "請在 30 分鐘內完成匯款。",
            "切勿向銀行人員詢問。",
            "或加入專員私人 LINE: @safe_verify888 核對密碼。"
        ]
        for line in lines:
            draw.text((80, y), line, fill=(40, 40, 40), font=_get_chinese_font(25))
            y += 68

        draw.line([(80, height - 150), (width - 80, height - 150)], fill=(200, 200, 200), width=1)
        draw.text((80, height - 120), "虛構文件，僅供高齡防詐教育展示", fill=(130, 130, 130), font=font_small)

    elif doc_id == "insurance_maturity":
        # 3 年期儲蓄險保單到期通知
        draw.rectangle([60, 60, width - 60, 125], fill=(18, 72, 74))
        draw.text((85, 76), "保單滿期金領取暨到期通知書", fill=(255, 255, 255), font=font_title)

        draw.text((75, 150), "保單號碼：9876-543210-01    要保人：林春嬌（身分證：B223456789）", fill=(45, 45, 45), font=font_body)
        draw.line([(75, 190), (width - 75, 190)], fill=(190, 190, 190), width=2)

        # 重點表格框
        draw.rectangle([75, 215, width - 75, 365], fill=(235, 243, 241), outline=(15, 92, 92), width=2)
        draw.text((95, 232), "險種名稱：鑫富利 3 年期養老儲蓄保險", fill=(20, 50, 50), font=font_sub)
        draw.text((95, 275), "滿期日期：2026 年 11 月 06 日（請於本週五前辦理）", fill=(180, 45, 35), font=font_sub)
        draw.text((95, 318), "滿期給付金額：新臺幣 528,000 元整", fill=(20, 50, 50), font=font_sub)

        y = 395
        body_lines = [
            "【辦理說明與應備文件】",
            "1. 您的 3 年期儲蓄險即將滿期，請於本週五前辦理滿期金領取。",
            "2. 請攜帶本人「國民身分證」、「原留印鑑」及「銀行存摺」",
            "   至附近分行或保險服務中心櫃檯辦理。",
            "3. 請於本通知書第 2 頁右下角簽名欄親筆簽名並加蓋原留印鑑。",
            "",
            "【重要注意事項】",
            "※ 超過期限未辦理者，滿期金將自動轉入利率較低的活期儲蓄",
            "   帳戶計息，建議您盡快於期限內完成辦理。"
        ]
        for line in body_lines:
            draw.text((75, y), line, fill=(45, 45, 45), font=font_body)
            y += 38

        # 右下角簽名欄框
        draw.rectangle([485, 790, width - 75, 915], fill=(255, 252, 245), outline=(190, 60, 50), width=3)
        draw.text((505, 805), "要保人／受益人簽名處", fill=(160, 45, 35), font=font_body)
        draw.text((505, 845), "（請於此處簽名並蓋原留印鑑）", fill=(110, 110, 110), font=font_small)
        draw.text((75, 875), "第 2 頁，共 2 頁", fill=(120, 120, 120), font=font_small)

    elif doc_id == "credit_card_bill":
        # 信用卡帳單
        draw.rectangle([60, 60, width - 60, 125], fill=(22, 56, 58))
        draw.text((85, 76), "11 月份信用卡消費綜合對帳單", fill=(255, 255, 255), font=font_title)

        draw.text((75, 150), "持卡人：陳金龍先生     卡號：4311-95**-****-8821", fill=(45, 45, 45), font=font_body)
        draw.rectangle([75, 200, width - 75, 345], fill=(238, 244, 242), outline=(18, 72, 74), width=2)
        draw.text((95, 218), "繳款截止日：2026 年 11 月 20 日", fill=(185, 45, 35), font=font_sub)
        draw.text((95, 262), "本期應繳總金額：NT$ 6,850 元（建議全額繳清免循環息）", fill=(20, 50, 50), font=font_sub)
        draw.text((95, 304), "最低應繳金額：NT$ 1,000 元", fill=(90, 90, 90), font=font_body)

        draw.text((75, 375), "【本期消費明細】", fill=(22, 56, 58), font=font_sub)
        items = [
            ("2026/10/12", "全聯福利中心（生活日用品）", "NT$ 1,420"),
            ("2026/10/19", "高雄長庚紀念醫院（門診批價）", "NT$   580"),
            ("2026/10/25", "中華電信股份有限公司（電話費代繳）", "NT$   650"),
            ("2026/10/28", "全國電子（暖氣機家電分期／全額）", "NT$ 4,200"),
        ]
        y = 420
        for dt, desc, amt in items:
            draw.rectangle([75, y, width - 75, y + 48], fill=(252, 252, 250), outline=(215, 215, 210))
            draw.text((90, y + 12), f"{dt}   {desc}", fill=(45, 45, 45), font=font_body)
            draw.text((width - 210, y + 12), amt, fill=(22, 56, 58), font=font_body)
            y += 56

        draw.text((75, 675), "【繳款方式說明】", fill=(22, 56, 58), font=font_sub)
        draw.text((75, 715), "• 請於 11/20 前持本單至四大超商（7-11、全家、萊爾富、OK）或銀行臨櫃繳費。", fill=(55, 55, 55), font=font_body)
        draw.text((75, 752), "• 本單無需簽名，超商繳費後請務必索取並保留收據聯。", fill=(55, 55, 55), font=font_body)

        # 模擬超商條碼區
        draw.rectangle([75, 805, width - 75, 935], fill=(255, 255, 255), outline=(180, 180, 180), width=2)
        draw.text((95, 818), "超商代收專用條碼區（2 萬元以下免手續費）", fill=(90, 90, 90), font=font_small)
        for bx in range(100, 680, 8):
            bar_w = 2 if (bx // 8) % 3 != 0 else 4
            draw.rectangle([bx, 850, bx + bar_w, 910], fill=(30, 30, 30))

    else:
        # 預設：畫面 2~5 客戶審查權益通知 (bank_kyc)
        draw.text((width // 2 - 135, 75), "客戶審查權益通知", fill=(30, 30, 30), font=font_title)
        draw.text((75, 130), "親愛的客戶 王大明（身分證：A123456789） 您好：", fill=(45, 45, 45), font=font_body)

        y = 175
        paragraphs = [
            "    感謝您對中國信託商業銀行(以下稱本行)的支持與愛護，本行為保障客戶所有帳戶",
            "的交易安全，及配合洗錢防制相關法令要求，將不定期向您及法定代理人進行帳戶資",
            "料更新事宜，避免其他帳戶遭不當使用。",
            "",
            "為有效管理帳戶，請您於收受本通知之日起 60 天（含）內：",
            "1. 填寫隨信附上之「客戶資料確認函」。",
            "2. 將身分證明文件影本黏貼於「客戶資料確認函」：",
            "   (1) 本國成年人請提供身分證。",
            "   (2) 未滿20歲未成年人請提供戶口名簿、戶籍謄本或身分證（三擇一）。",
            "   (3) 外國人請提供護照或居留證。",
            "",
            "「客戶資料確認函」請以下列任一方式提供予本行：",
            "   (1) 親至全省各分行辦理。",
            "   (2) 電子郵件傳送至：ba.rbop@ctbcbank.com",
            "   (3) 傳真至：02-33229308",
            "   (4) 郵寄至：台北市信義區永吉路18號7樓中國信託商業銀行收",
            "",
            "本行收受上述資料後，將協助您進行資料更新。提醒您！若您於前述期限內未能提供",
            "相關文件予本行，本行將暫時停止您自動化交易及新業務申請，敬請配合辦理。",
            "",
            "謹此"
        ]
        for line in paragraphs:
            is_bold_line = "60 天（含）內" in line or "身分證明文件" in line
            color = (165, 35, 25) if "60 天（含）內" in line else (45, 45, 45)
            draw.text((75, y), line, fill=color, font=font_body)
            y += 31

        # 底部英文說明框與右側簽名確認區（對應計畫書畫面）
        draw.rectangle([240, 835, 495, 955], outline=(90, 90, 90), width=2)
        draw.text((252, 848), "英文版請掃描 QR Code 閱讀", fill=(60, 60, 60), font=font_small)
        draw.text((252, 875), "English version of the notice", fill=(80, 80, 80), font=font_small)
        draw.text((252, 902), "www.ctbcbank.com/notice", fill=(80, 80, 80), font=font_small)

        # 右下角客戶資料確認函簽名示意框
        draw.rectangle([515, 835, width - 70, 955], fill=(255, 250, 242), outline=(185, 50, 40), width=2)
        draw.text((530, 848), "【客戶資料確認函簽名位置】", fill=(165, 35, 25), font=font_small)
        draw.text((530, 882), "立確認書人簽章：___________", fill=(60, 60, 60), font=font_small)
        draw.text((530, 916), "（請於右下角親筆簽名或蓋章）", fill=(110, 110, 110), font=font_small)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def get_sample_document_with_image(doc_id: str) -> Dict[str, Any]:
    doc = SAMPLE_DOCUMENTS.get(doc_id, SAMPLE_DOCUMENTS["bank_kyc"]).copy()
    img_bytes = render_sample_document_image(doc["id"])
    b64 = base64.b64encode(img_bytes).decode("utf-8")
    doc["image_data_url"] = f"data:image/jpeg;base64,{b64}"
    doc["image_bytes"] = img_bytes
    return doc
