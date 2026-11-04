import React, { useState } from 'react';
import {
  Users,
  X,
  ShieldAlert,
  CheckCircle2,
  Send,
  UserPlus,
  MessageSquareHeart,
  Phone,
  BellRing,
  BarChart3
} from 'lucide-react';

export default function FamilyGuardianModal({
  isOpen,
  onClose,
  dashboardData,
  onReplyNotification,
  onAddGuardian
}) {
  const [replyTextMap, setReplyTextMap] = useState({});
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!isOpen) return null;

  const guardians = dashboardData?.guardians || [];
  const notifications = dashboardData?.notifications || [];
  const metrics = dashboardData?.metrics || {};

  const handleQuickReply = (notifId, presetMessage) => {
    onReplyNotification(notifId, '王小明（長子）', presetMessage);
  };

  const handleCustomReply = (notifId) => {
    const text = (replyTextMap[notifId] || '').trim();
    if (!text) return;
    onReplyNotification(notifId, '王小明（長子）', text);
    setReplyTextMap((prev) => ({ ...prev, [notifId]: '' }));
  };

  const handleCreateGuardian = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newRelation.trim()) return;
    onAddGuardian({
      name: newName.trim(),
      relation: newRelation.trim(),
      phone: newPhone.trim() || '0911-000-123',
      auto_notify_scam: true
    });
    setNewName('');
    setNewRelation('');
    setNewPhone('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
        {/* Top Header */}
        <div className="flex items-center justify-between bg-[#16383a] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-200">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">模組四：家屬守護網（雙向互動與防詐把關看板）</h3>
                <span className="rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-semibold text-amber-200 border border-amber-300/30">
                  鐵三角防護：長輩操作・AI解讀・家人把關
                </span>
              </div>
              <p className="text-sm text-teal-100/80 mt-0.5">
                遇到高風險可疑通知時系統自動即時推播家屬；一般文件亦可一鍵傳送並接收家人安心回覆
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f6f8f7]">
          {/* Section 8 Metrics Summary Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <BarChart3 className="h-4 w-4 text-[#0f5c5c]" />
                累計文件導讀人次
              </div>
              <p className="mt-1 text-2xl font-extrabold text-[#16383a]">
                {metrics.total_scans || 42} <span className="text-sm font-normal text-slate-500">次</span>
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-rose-200/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                高風險防詐預警攔截
              </div>
              <p className="mt-1 text-2xl font-extrabold text-rose-700">
                {metrics.scam_blocked || 9} <span className="text-sm font-normal text-rose-600">件</span>
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <BellRing className="h-4 w-4 text-amber-600" />
                家屬守護推播通知
              </div>
              <p className="mt-1 text-2xl font-extrabold text-[#16383a]">
                {metrics.family_notifications_sent || 18} <span className="text-sm font-normal text-slate-500">則</span>
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                模擬文件導讀正確率
              </div>
              <p className="mt-1 text-2xl font-extrabold text-emerald-700">
                {metrics.accuracy_rate || '98.5%'}
              </p>
            </div>
          </div>

          {/* Guardians List */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="text-lg font-bold text-slate-800">已綁定之家屬與社區社工守護名單</h4>
                <p className="text-sm text-slate-500">當長輩拍到疑似詐騙文件時，系統會自動發送緊急通知給勾選「防詐即時推播」的聯絡人</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 rounded-xl bg-[#0f5c5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b4646]"
              >
                <UserPlus className="h-4 w-4" />
                新增守護家屬／社工
              </button>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleCreateGuardian}
                className="mb-4 grid grid-cols-1 gap-3 rounded-xl bg-[#e9f2f0] p-4 sm:grid-cols-4"
              >
                <input
                  type="text"
                  placeholder="姓名（如：王建民）"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="rounded-lg border border-teal-300 px-3 py-2 text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="稱謂（如：次子／社工）"
                  value={newRelation}
                  onChange={(e) => setNewRelation(e.target.value)}
                  className="rounded-lg border border-teal-300 px-3 py-2 text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="聯絡電話（如：0912-000-111）"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="rounded-lg border border-teal-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#0f5c5c] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b4646]"
                >
                  確認加入守護網
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {guardians.map((g) => (
                <div
                  key={g.id}
                  className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{g.name}</span>
                      <span className="rounded-md bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900">
                        {g.relation}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Phone className="h-3.5 w-3.5" /> {g.phone}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        ● LINE 推播已連線
                      </span>
                      {g.auto_notify_scam && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                          防詐自動通知
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Notifications Feed & Simulated Family Reply */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-slate-800">
              家屬端即時收到的通知與雙向回覆（可在此模擬家屬回覆長輩）
            </h4>

            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`rounded-2xl border p-5 shadow-sm transition ${
                  notif.is_scam
                    ? 'border-rose-300 bg-rose-50/70'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {notif.is_scam ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white">
                        <ShieldAlert className="h-4 w-4" />
                        高風險可疑文件警報
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f5c5c] px-3 py-1 text-xs font-bold text-white">
                        一般文件協助確認
                      </span>
                    )}
                    <span className="text-lg font-bold text-slate-900">{notif.doc_title}</span>
                    <span className="text-xs text-slate-500">{notif.timestamp}</span>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-900 border border-teal-200">
                    狀態：{notif.status}
                  </span>
                </div>

                <p className="mt-2.5 text-base text-slate-700 font-medium">{notif.summary}</p>

                {notif.suspicious_demands?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {notif.suspicious_demands.map((d, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-200"
                      >
                        ! 可疑要求：{d}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 text-xs text-slate-500">
                  已推播對象：{(notif.recipients || []).join('、')}
                </div>

                {/* Family Reply Display or Action */}
                {notif.family_reply ? (
                  <div className="mt-4 rounded-xl bg-emerald-50 p-4 border border-emerald-200">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                      <MessageSquareHeart className="h-4 w-4 text-emerald-700" />
                      {notif.family_reply.sender} 已回覆長輩（{notif.family_reply.time}）：
                    </div>
                    <p className="mt-1 text-base font-semibold text-emerald-950">
                      「{notif.family_reply.message}」
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-200">
                    <p className="text-xs font-bold text-slate-600 mb-2">
                      💡 模擬家屬端手機收到 LINE 推播後，點選快速回覆給長輩（長輩主畫面會立即顯示）：
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {notif.is_scam ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickReply(
                                notif.id,
                                '爸／媽！這張「緊急帳戶通知」是詐騙！千萬不要去匯款，我現在馬上打電話給您！'
                              )
                            }
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                          >
                            一鍵回覆：「這是詐騙！千萬別匯款，我馬上打給您」
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickReply(
                                notif.id,
                                '我已經幫您打 165 反詐騙專線確認過了，銀行不會要求匯驗證金，請直接把單子收起來不用理它！'
                              )
                            }
                            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                          >
                            一鍵回覆：「已幫您問過 165，請勿理會這張單子」
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickReply(
                                notif.id,
                                '爸／媽，我有收到您傳來的通知單了！這週五早上有空我載您去銀行分行辦理，請放心！'
                              )
                            }
                            className="rounded-lg bg-[#0f5c5c] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0b4646]"
                          >
                            一鍵回覆：「我有看到了，這週五我載您去分行辦！」
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickReply(
                                notif.id,
                                '資料確認書跟身分證先幫我放在客廳桌上，我下班回家幫您檢查簽名位置喔！'
                              )
                            }
                            className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800"
                          >
                            一鍵回覆：「我下班回家幫您看簽名位置喔！」
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="或輸入自訂家屬叮嚀訊息..."
                        value={replyTextMap[notif.id] || ''}
                        onChange={(e) =>
                          setReplyTextMap((prev) => ({ ...prev, [notif.id]: e.target.value }))
                        }
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleCustomReply(notif.id)}
                        className="flex items-center gap-1 rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
                      >
                        <Send className="h-3.5 w-3.5" />
                        傳送回覆
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
