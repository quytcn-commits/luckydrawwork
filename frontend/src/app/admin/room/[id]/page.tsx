"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { joinRoom } from "@/lib/socket";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import * as XLSX from "xlsx";

const statusLabels: Record<string, string> = {
  open: "Đang mở đăng ký",
  closed: "Đã đóng đăng ký",
  drawing: "Đang quay thưởng",
  finished: "Đã hoàn thành",
};

const statusColors: Record<string, string> = {
  open: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  closed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  drawing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  finished: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

type ViewType = "participants" | "qr" | "draw" | "results" | "settings";

export default function RoomDetailPage() {
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [drawResults, setDrawResults] = useState<any[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<any>(null);
  const [currentPrizeName, setCurrentPrizeName] = useState("");
  const [completedRoundPrize, setCompletedRoundPrize] = useState<any>(null);
  const [roundTransitioning, setRoundTransitioning] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<ViewType>("participants");
  const [uploading, setUploading] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const kvInputRef = useRef<HTMLInputElement>(null);

  const loadRoom = useCallback(async () => {
    try {
      const data = await api.getRoom(roomId);
      setRoom(data);
      setParticipants(data.participants || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, [roomId]);

  useEffect(() => { loadRoom(); }, [loadRoom]);

  useEffect(() => {
    if (!room) return;
    const socket = joinRoom(room.code);
    socket.on("participantJoined", (participant: any) => {
      setParticipants((prev) => [participant, ...prev]);
    });
    return () => { socket.off("participantJoined"); };
  }, [room?.code]);

  async function handleCloseRegistration() {
    if (!confirm("Bạn có chắc muốn đóng đăng ký?")) return;
    try {
      const updated = await api.closeRegistration(roomId);
      setRoom(updated);
    } catch (err: any) { setError(err.message); }
  }

  async function handleStartDraw() {
    try {
      const updated = await api.startDraw(roomId);
      setRoom(updated);
      setView("draw");
    } catch (err: any) { setError(err.message); }
  }

  async function handleDrawPrize(prizeId: string, prizeName: string) {
    setSpinning(true);
    setCurrentWinner(null);
    setCurrentPrizeName(prizeName);

    const eligible = participants.filter((p) => !p.isWinner);
    let spinCount = 0;
    const spinInterval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * eligible.length);
      setCurrentWinner(eligible[randomIdx]);
      spinCount++;
      if (spinCount > 25) clearInterval(spinInterval);
    }, 80);

    try {
      const result = await api.drawPrize(roomId, prizeId);
      setTimeout(() => {
        clearInterval(spinInterval);
        setCurrentWinner(result.winner);
        setSpinning(false);

        // Update prize state with partial draw progress
        const updatedPrize = { drawn: result.prize.drawn, winnerIds: result.prize.winnerIds };
        setRoom((prev: any) => ({
          ...prev,
          prizes: prev.prizes.map((p: any) =>
            p.id === prizeId ? { ...p, ...updatedPrize } : p
          ),
        }));

        // Mark participant as winner with prizeId
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === result.winner.id ? { ...p, isWinner: true, prizeId } : p
          )
        );

        // Show round transition if prize is fully drawn (but NOT the last prize — let admin manually proceed)
        if (result.prize.drawn) {
          const hasMorePrizes = room.prizes.some((p: any) =>
            p.id !== prizeId && !(p.drawn || (p.winnerIds?.length || 0) >= (p.winnerCount || 1))
          );
          if (hasMorePrizes) {
            setRoundTransitioning(true);
            setTimeout(() => {
              setCompletedRoundPrize({ id: prizeId, name: prizeName });
              setCurrentWinner(null);
              setRoundTransitioning(false);
            }, 3000);
          }
        }
      }, 2500);
    } catch (err: any) {
      clearInterval(spinInterval);
      setSpinning(false);
      setError(err.message);
    }
  }

  async function loadResults() {
    try {
      const data = await api.getResults(roomId);
      setDrawResults(data);
      setView("results");
    } catch (err: any) { setError(err.message); }
  }

  // === FILE UPLOAD ===
  async function handleFileUpload(file: File, field: "logoUrl" | "kvImageUrl") {
    setUploading(true);
    try {
      const result = await api.uploadFile(file);
      const fileUrl = api.getFileUrl(result.url);
      await api.updateRoom(roomId, { [field]: fileUrl });
      setRoom((prev: any) => ({ ...prev, [field]: fileUrl }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  // === THEME SAVE ===
  async function handleSaveTheme(theme: any) {
    setSavingTheme(true);
    try {
      await api.updateRoom(roomId, { theme });
      setRoom((prev: any) => ({ ...prev, theme }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingTheme(false);
    }
  }

  // === EXPORT EXCEL ===
  function exportParticipantsExcel() {
    const data = participants.map((p, i) => {
      const row: any = { "STT": participants.length - i, "Họ tên": p.displayName };
      room.formFields?.forEach((f: any) => {
        row[f.label] = p.data?.[f.name] || "";
      });
      row["Trạng thái"] = p.isWinner ? "Trúng thưởng" : "Tham gia";
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Người tham gia");
    XLSX.writeFile(wb, `${room.eventName}_participants.xlsx`);
  }

  function exportResultsExcel() {
    if (drawResults.length === 0) return;
    const data: any[] = [];
    drawResults.forEach((result) => {
      result.winners.forEach((w: any) => {
        const row: any = {
          "Giải thưởng": result.prize.name,
          "Họ tên": w.displayName,
        };
        Object.entries(w.data || {}).forEach(([key, val]) => {
          row[key] = String(val);
        });
        data.push(row);
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kết quả");
    XLSX.writeFile(wb, `${room.eventName}_results.xlsx`);
  }

  if (!room) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400">Đang tải...</span>
        </div>
      </div>
    );
  }

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${room.code}`
    : `https://luckydraw.work/join/${room.code}`;
  const sortedPrizes = [...(room.prizes || [])].sort((a: any, b: any) => b.order - a.order);
  const eligibleCount = participants.filter((p) => !p.isWinner).length;

  const tabItems: { key: ViewType; label: string; count?: number }[] = [
    { key: "participants", label: "Người tham gia", count: participants.length },
    { key: "qr", label: "Mã QR" },
    { key: "draw", label: "Quay thưởng" },
    { key: "results", label: "Kết quả" },
    { key: "settings", label: "Cài đặt" },
  ];

  return (
    <div className="min-h-screen gradient-bg text-white">
      {/* Hidden file inputs */}
      <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "logoUrl")} />
      <input ref={kvInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "kvImageUrl")} />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors flex-shrink-0 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="font-bold truncate text-sm sm:text-base">{room.eventName}</h1>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium border ${statusColors[room.status]}`}>
                  {statusLabels[room.status]}
                </span>
                <span className="font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px] sm:text-xs">
                  {room.code}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {room.status === "open" && (
              <button onClick={handleCloseRegistration}
                className="px-2.5 sm:px-4 py-2 rounded-xl bg-amber-500/15 text-amber-400 text-xs sm:text-sm hover:bg-amber-500/25 transition-colors border border-amber-500/20">
                <span className="hidden sm:inline">Đóng đăng ký</span>
                <span className="sm:hidden">Đóng</span>
              </button>
            )}
            {(room.status === "closed" || room.status === "open") && (
              <button onClick={handleStartDraw} className="btn-primary text-xs sm:text-sm !px-3 sm:!px-5 !py-2">
                <span className="hidden sm:inline">Bắt đầu quay</span>
                <span className="sm:hidden">Quay</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/15 text-red-400 px-4 py-2.5 text-sm text-center border-b border-red-500/20">
          {error}
          <button onClick={() => setError("")} className="ml-3 text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-white/10 px-4 sm:px-6 overflow-x-auto">
        <div className="flex gap-0 max-w-7xl mx-auto">
          {tabItems.map((tab) => (
            <button key={tab.key}
              onClick={() => { if (tab.key === "results") loadResults(); else setView(tab.key); }}
              className={`px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium transition-all relative whitespace-nowrap ${
                view === tab.key ? "text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                  view === tab.key ? "bg-indigo-500/30 text-indigo-300" : "bg-white/5 text-slate-500"
                }`}>{tab.count}</span>
              )}
              {view === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 gradient-primary rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto">

        {/* ===== PARTICIPANTS ===== */}
        {view === "participants" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">Realtime</span>
              </div>
              <button onClick={exportParticipantsExcel}
                className="px-3 sm:px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs sm:text-sm hover:bg-emerald-500/25 transition-colors border border-emerald-500/20">
                📥 Xuất Excel
              </button>
            </div>

            <div className="card overflow-hidden !p-0">
              <div className="max-h-[65vh] overflow-y-auto">
                {participants.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-4">📋</div>
                    <p className="text-slate-400 mb-2">Chưa có người tham gia</p>
                    <p className="text-xs text-slate-600">Chia sẻ mã QR để bắt đầu nhận đăng ký</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="sm:hidden divide-y divide-white/5">
                      {participants.map((p, i) => (
                        <div key={p.id} className="px-4 py-3 hover:bg-white/5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{p.displayName}</span>
                            <span className="text-[10px] text-slate-600">#{participants.length - i}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                            {room.formFields?.slice(1).map((f: any) => (
                              <span key={f.name}>{p.data?.[f.name]}</span>
                            ))}
                            {p.isWinner && <span className="text-amber-400 font-medium ml-auto">🏆 Trúng</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop table */}
                    <table className="w-full hidden sm:table">
                      <thead className="bg-white/5 sticky top-0">
                        <tr>
                          <th className="px-5 py-2.5 text-left text-xs text-slate-500 font-medium w-12">#</th>
                          <th className="px-5 py-2.5 text-left text-xs text-slate-500 font-medium">Họ tên</th>
                          {room.formFields?.slice(1).map((f: any) => (
                            <th key={f.name} className="px-5 py-2.5 text-left text-xs text-slate-500 font-medium">{f.label}</th>
                          ))}
                          <th className="px-5 py-2.5 text-left text-xs text-slate-500 font-medium w-28">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map((p, i) => (
                          <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                            <td className="px-5 py-2.5 text-sm text-slate-600">{participants.length - i}</td>
                            <td className="px-5 py-2.5 text-sm font-medium">{p.displayName}</td>
                            {room.formFields?.slice(1).map((f: any) => (
                              <td key={f.name} className="px-5 py-2.5 text-sm text-slate-300">{p.data?.[f.name] || "—"}</td>
                            ))}
                            <td className="px-5 py-2.5">
                              {p.isWinner ? (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md">🏆 Trúng</span>
                              ) : (
                                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">Đủ điều kiện</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== QR VIEW ===== */}
        {view === "qr" && (
          <div className="flex flex-col items-center justify-center py-6 sm:py-12">
            <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/20 max-w-sm w-full">
              {room.logoUrl && (
                <img src={room.logoUrl} alt="Logo" className="h-10 sm:h-12 mx-auto mb-4 object-contain" />
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-1">{room.eventName}</h2>
              <p className="text-slate-500 text-center text-sm mb-6">{room.roomName}</p>
              <div className="flex justify-center">
                <QRCodeSVG value={joinUrl} size={220} level="H" marginSize={2} className="mx-auto" />
              </div>
              <div className="mt-6 text-center">
                <p className="font-mono text-2xl font-bold text-indigo-600 tracking-widest">{room.code}</p>
                <p className="text-slate-400 text-xs mt-2">Quét mã QR hoặc truy cập link bên dưới</p>
                <p className="text-indigo-600 text-xs mt-1 font-mono break-all">{joinUrl}</p>
              </div>
            </div>
            <div className="mt-6 sm:mt-8 card text-center px-8 py-5">
              <p className="text-4xl sm:text-5xl font-bold text-indigo-400">{participants.length}</p>
              <p className="text-sm text-slate-400 mt-1">người đã tham gia</p>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">Cập nhật realtime</span>
              </div>
            </div>
          </div>
        )}

        {/* ===== DRAW VIEW ===== */}
        {view === "draw" && (() => {
          // Find current prize: first unfinished prize sorted by order DESC (giải 3 → 2 → 1)
          const currentPrize = sortedPrizes.find((p: any) => !(p.drawn || (p.winnerIds?.length || 0) >= (p.winnerCount || 1)));
          const allDone = !currentPrize;
          // Completed prizes (drawn before current)
          const completedPrizes = sortedPrizes.filter((p: any) => p.drawn || (p.winnerIds?.length || 0) >= (p.winnerCount || 1));

          const drawnCount = currentPrize ? (currentPrize.winnerIds?.length || 0) : 0;
          const totalCount = currentPrize ? (currentPrize.winnerCount || 1) : 0;

          return (
          <div className="max-w-2xl mx-auto py-4 sm:py-8">
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {sortedPrizes.map((p: any, i: number) => {
                const done = p.drawn || (p.winnerIds?.length || 0) >= (p.winnerCount || 1);
                const isCurrent = currentPrize?.id === p.id;
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      done ? "bg-emerald-500/30 text-emerald-400" : isCurrent ? "bg-indigo-500/30 text-indigo-400 ring-2 ring-indigo-400/50" : "bg-white/5 text-slate-600"
                    }`}>{done ? "✓" : p.order}</div>
                    {i < sortedPrizes.length - 1 && <div className={`w-6 sm:w-10 h-0.5 ${done ? "bg-emerald-500/40" : "bg-white/10"}`} />}
                  </div>
                );
              })}
            </div>

            {completedRoundPrize ? (
              <div className="text-center animate-fade-in-up">
                <div className="card py-8 mb-6">
                  <div className="text-5xl mb-4">🎊</div>
                  <h3 className="text-2xl font-bold mb-2">Hoàn thành {completedRoundPrize.name}!</h3>
                  <p className="text-slate-400 text-sm mb-6">Danh sách người trúng giải:</p>
                  <div className="space-y-2 max-w-sm mx-auto mb-6">
                    {participants.filter((p) => p.isWinner && p.prizeId === completedRoundPrize.id).map((w, i) => (
                      <div key={w.id} className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="w-8 h-8 rounded-full gradient-gold flex items-center justify-center text-sm font-bold text-slate-900 flex-shrink-0">{i + 1}</div>
                        <div className="min-w-0 text-left">
                          <p className="font-semibold text-sm text-amber-400 truncate">{w.displayName}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {Object.values(w.data || {}).map((v) => String(v)).join(" · ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {currentPrize && !allDone ? (
                  <button
                    onClick={() => { setCompletedRoundPrize(null); setCurrentWinner(null); }}
                    className="btn-primary !py-4 !px-10 text-lg animate-pulse"
                  >
                    ▶ Bắt đầu quay {currentPrize.name}
                  </button>
                ) : (
                  <button onClick={() => { setCompletedRoundPrize(null); loadResults(); }} className="btn-primary !py-4 !px-10 text-lg">
                    🏆 Xem tổng kết quả
                  </button>
                )}
              </div>
            ) : (allDone && !currentWinner) ? (
              <div className="text-center card py-10">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold mb-2">Đã quay xong tất cả giải!</h3>
                <p className="text-slate-400 mb-4">{room.eventName}</p>
                <button onClick={loadResults} className="btn-primary">Xem kết quả</button>
              </div>
            ) : (
              <>
                {/* Current prize header */}
                {currentPrize && (
                <div className="text-center mb-6 sm:mb-8">
                  <p className="text-indigo-400 text-sm font-medium mb-1">
                    Vòng {completedPrizes.length + 1}/{sortedPrizes.length}
                  </p>
                  <h2 className="text-2xl sm:text-4xl font-bold mb-2">🎰 {currentPrize.name}</h2>
                  <p className="text-slate-400 text-sm sm:text-base">
                    {totalCount} người trúng · Còn <strong className="text-white">{eligibleCount}</strong> người trong danh sách
                  </p>
                  {drawnCount > 0 && (
                    <div className="flex items-center justify-center gap-3 mt-3">
                      <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(drawnCount / totalCount) * 100}%` }} />
                      </div>
                      <span className="text-amber-400 text-sm font-medium">{drawnCount}/{totalCount}</span>
                    </div>
                  )}
                </div>
                )}

                {/* Spin display */}
                {currentWinner && (
                  <div className={`text-center mb-6 sm:mb-8 p-6 sm:p-10 rounded-2xl border transition-all duration-500 ${
                    spinning ? "glass border-white/10" : "bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-amber-500/20 border-amber-500/30 animate-winner-glow"
                  }`}>
                    {!spinning && currentPrizeName && (
                      <p className="text-amber-400/80 text-sm font-medium mb-2 animate-fade-in">{currentPrizeName}</p>
                    )}
                    <p className={`text-3xl sm:text-5xl font-bold mb-3 transition-all duration-300 ${spinning ? "text-white/80" : "text-amber-400"}`}>
                      {spinning ? (
                        <span>{currentWinner.displayName || currentWinner.data?.fullName}</span>
                      ) : (
                        <span className="animate-fade-in-up inline-block">🏆 {currentWinner.displayName || currentWinner.data?.fullName}</span>
                      )}
                    </p>
                    {!spinning && currentWinner.data && (
                      <div className="text-slate-300 animate-fade-in-up text-sm sm:text-base">
                        {Object.entries(currentWinner.data).map(([key, val]) => (
                          <span key={key} className="mx-2">{String(val)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Last prize done — manual button to view results */}
                {allDone && !spinning && currentWinner && (
                  <div className="text-center mb-8 animate-fade-in-up">
                    <button
                      onClick={() => { setCurrentWinner(null); loadResults(); }}
                      className="btn-primary !py-4 !px-10 text-lg"
                    >
                      🏆 Xem tổng kết quả
                    </button>
                  </div>
                )}

                {/* Draw button */}
                {currentPrize && (
                <div className="text-center mb-8">
                  <button
                    onClick={() => handleDrawPrize(currentPrize.id, currentPrize.name)}
                    disabled={spinning || roundTransitioning}
                    className="btn-primary !py-4 !px-10 text-lg disabled:opacity-50"
                  >
                    {spinning ? "Đang quay..." : `🎲 Quay lượt ${drawnCount + 1}/${totalCount}`}
                  </button>
                </div>
                )}

                {/* Winners already drawn in this round */}
                {currentPrize && drawnCount > 0 && (
                  <div className="card mb-6">
                    <h4 className="text-sm font-medium text-slate-400 mb-3">Người đã trúng {currentPrize.name}:</h4>
                    <div className="space-y-2">
                      {participants.filter((p) => p.isWinner && p.prizeId === currentPrize.id).map((w, i) => (
                        <div key={w.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/5">
                          <div className="w-8 h-8 rounded-full gradient-gold flex items-center justify-center text-sm font-bold text-slate-900 flex-shrink-0">{i + 1}</div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{w.displayName}</p>
                            <p className="text-xs text-slate-400 truncate">
                              {Object.values(w.data || {}).map((v) => String(v)).join(" · ")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Completed rounds summary */}
            {completedPrizes.length > 0 && !allDone && (
              <div className="mt-6 space-y-3">
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đã quay xong</h4>
                {completedPrizes.map((prize: any) => (
                  <div key={prize.id} className="flex items-center gap-3 p-3 rounded-xl glass opacity-60">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400 flex-shrink-0">✓</div>
                    <span className="text-sm">{prize.name}</span>
                    <span className="text-xs text-slate-500 ml-auto">{prize.winnerIds?.length || 0} người trúng</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          );
        })()}

        {/* ===== RESULTS VIEW ===== */}
        {view === "results" && (
          <div className="max-w-2xl mx-auto py-4 sm:py-8">
            <div className="flex items-center justify-between mb-6 sm:mb-10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">🏆 Kết quả</h2>
                <p className="text-slate-400 text-sm">{room.eventName}</p>
              </div>
              {drawResults.length > 0 && (
                <button onClick={exportResultsExcel}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs sm:text-sm hover:bg-emerald-500/25 transition-colors border border-emerald-500/20">
                  📥 Xuất Excel
                </button>
              )}
            </div>

            {drawResults.length === 0 ? (
              <div className="text-center py-12 card">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-slate-400">Chưa có kết quả quay thưởng</p>
              </div>
            ) : (
              <div className="space-y-4">
                {drawResults.map((result, i) => (
                  <div key={i} className="card animate-fade-in-up" style={{ animationDelay: `${i * 150}ms` }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-lg">🏆</div>
                      <h3 className="text-lg sm:text-xl font-bold text-amber-400">{result.prize.name}</h3>
                    </div>
                    <div className="space-y-2">
                      {result.winners.map((w: any) => (
                        <div key={w.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/5">
                          <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center text-sm font-bold text-slate-900 flex-shrink-0">W</div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm sm:text-base truncate">{w.displayName}</p>
                            <p className="text-xs sm:text-sm text-slate-400 truncate">
                              {Object.values(w.data || {}).map((v) => String(v)).join(" · ")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== SETTINGS VIEW ===== */}
        {view === "settings" && (
          <div className="max-w-2xl mx-auto py-4 sm:py-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold">⚙️ Cài đặt & Thương hiệu</h2>

            {/* Logo & KV upload */}
            <div className="card">
              <h3 className="font-semibold mb-4">Hình ảnh thương hiệu</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Logo */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Logo sự kiện</label>
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all min-h-[120px] flex flex-col items-center justify-center"
                  >
                    {room.logoUrl ? (
                      <img src={room.logoUrl} alt="Logo" className="max-h-16 object-contain mb-2" />
                    ) : (
                      <div className="text-3xl mb-2">🖼️</div>
                    )}
                    <p className="text-xs text-slate-400">{uploading ? "Đang tải lên..." : "Bấm để upload logo"}</p>
                  </div>
                </div>

                {/* KV */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Ảnh KV sự kiện</label>
                  <div
                    onClick={() => kvInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all min-h-[120px] flex flex-col items-center justify-center"
                  >
                    {room.kvImageUrl ? (
                      <img src={room.kvImageUrl} alt="KV" className="max-h-16 object-contain mb-2" />
                    ) : (
                      <div className="text-3xl mb-2">🎨</div>
                    )}
                    <p className="text-xs text-slate-400">{uploading ? "Đang tải lên..." : "Bấm để upload ảnh KV"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Theme colors */}
            <div className="card">
              <h3 className="font-semibold mb-4">Tuỳ chỉnh màu sắc</h3>
              <ThemeEditor
                theme={room.theme || {}}
                onSave={handleSaveTheme}
                saving={savingTheme}
              />
            </div>

            {/* Room info */}
            <div className="card">
              <h3 className="font-semibold mb-4">Thông tin phòng</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Mã phòng</span>
                  <span className="font-mono text-indigo-400">{room.code}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Trạng thái</span>
                  <span>{statusLabels[room.status]}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Người tạo</span>
                  <span>{room.createdBy}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Người tham gia</span>
                  <span>{participants.length}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Link tham gia</span>
                  <span className="font-mono text-xs text-indigo-400 break-all text-right max-w-[200px]">{joinUrl}</span>
                </div>
              </div>
            </div>

            {/* Reset draws */}
            <div className="card border-amber-500/20">
              <h3 className="font-semibold mb-2 text-amber-400">Reset lượt quay</h3>
              <p className="text-xs text-slate-400 mb-4">
                Xóa kết quả quay thưởng, giữ nguyên danh sách người tham gia. Dùng khi muốn quay lại từ đầu.
              </p>
              <button
                onClick={async () => {
                  if (!confirm("⚠️ Bạn có chắc muốn RESET lượt quay?\n\nKết quả quay thưởng sẽ bị xóa.\nDanh sách người tham gia được giữ nguyên.")) return;
                  try {
                    const updated = await api.resetDraws(roomId);
                    setRoom(updated);
                    setParticipants(updated.participants || []);
                    setDrawResults([]);
                    setCurrentWinner(null);
                    setCompletedRoundPrize(null);
                    setRoundTransitioning(false);
                    setView("draw");
                  } catch (err: any) { setError(err.message); }
                }}
                className="px-4 py-2 rounded-xl bg-amber-500/15 text-amber-400 text-sm hover:bg-amber-500/25 transition-colors border border-amber-500/20"
              >
                🎲 Reset lượt quay
              </button>
            </div>

            {/* Reset room */}
            <div className="card border-red-500/20">
              <h3 className="font-semibold mb-2 text-red-400">Reset phòng</h3>
              <p className="text-xs text-slate-400 mb-4">
                Xóa toàn bộ người tham gia và kết quả quay thưởng. Giữ nguyên mã phòng, QR, link và cấu hình giải thưởng.
              </p>
              <button
                onClick={async () => {
                  if (!confirm("⚠️ Bạn có chắc muốn RESET phòng?\n\nTất cả người tham gia và kết quả quay thưởng sẽ bị xóa.\nMã phòng, QR và cấu hình giải thưởng sẽ được giữ nguyên.")) return;
                  try {
                    const updated = await api.resetRoom(roomId);
                    setRoom(updated);
                    setParticipants(updated.participants || []);
                    setDrawResults([]);
                    setCurrentWinner(null);
                    setCompletedRoundPrize(null);
                    setRoundTransitioning(false);
                  } catch (err: any) { setError(err.message); }
                }}
                className="px-4 py-2 rounded-xl bg-red-500/15 text-red-400 text-sm hover:bg-red-500/25 transition-colors border border-red-500/20"
              >
                🔄 Reset phòng
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// === Theme Editor Component ===
function ThemeEditor({ theme, onSave, saving }: { theme: any; onSave: (t: any) => void; saving: boolean }) {
  const [primary, setPrimary] = useState(theme.primaryColor || "#6366f1");
  const [secondary, setSecondary] = useState(theme.secondaryColor || "#8b5cf6");
  const [button, setButton] = useState(theme.buttonColor || "#6366f1");
  const [text, setText] = useState(theme.textColor || "#ffffff");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Màu chính</label>
          <div className="flex items-center gap-2">
            <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent" />
            <input type="text" value={primary} onChange={(e) => setPrimary(e.target.value)} className="input-field !py-2 text-xs font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Màu phụ</label>
          <div className="flex items-center gap-2">
            <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent" />
            <input type="text" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="input-field !py-2 text-xs font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Màu nút</label>
          <div className="flex items-center gap-2">
            <input type="color" value={button} onChange={(e) => setButton(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent" />
            <input type="text" value={button} onChange={(e) => setButton(e.target.value)} className="input-field !py-2 text-xs font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Màu chữ</label>
          <div className="flex items-center gap-2">
            <input type="color" value={text} onChange={(e) => setText(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent" />
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} className="input-field !py-2 text-xs font-mono" />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl p-4 border border-white/10" style={{ backgroundColor: primary + "20" }}>
        <p className="text-xs text-slate-400 mb-2">Xem trước:</p>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: button, color: text }}>
            Nút mẫu
          </button>
          <span style={{ color: primary }} className="text-sm font-semibold">Văn bản chính</span>
          <span style={{ color: secondary }} className="text-sm">Văn bản phụ</span>
        </div>
      </div>

      <button
        onClick={() => onSave({ primaryColor: primary, secondaryColor: secondary, buttonColor: button, textColor: text })}
        disabled={saving}
        className="btn-primary text-sm disabled:opacity-50"
      >
        {saving ? "Đang lưu..." : "💾 Lưu cài đặt màu"}
      </button>
    </div>
  );
}
