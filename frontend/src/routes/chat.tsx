// chat.tsx
declare global {   //Eva's Change: Added global declaration for SpeechRecognition
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
import { EmergencyMap } from "@/components/EmergencyMap";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart, Plus, Search, MessageCircle, Pin, Archive, Trash2, Settings, LogOut,
  Activity, AlertTriangle, Send, Mic, Paperclip, Sparkles, Sun, Moon, ChevronRight, ArrowLeft, Bell,
  PanelLeftClose, PanelLeft, MoreHorizontal, ShieldAlert, Baby, Languages, Copy, Check, ThumbsUp, ThumbsDown, Pill, FileText, X, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import icon from "@/assets/icon.svg";
import { useLang } from "@/contexts/lang-context";
import { tr } from "@/i18n/translations";
import { loadChats, saveChat, deleteChat, saveUserWeek, loadUserWeek, loadReports, saveReport, deleteReport, loadHealthProfile, saveHealthProfile, loadMedications, loadAppointments, type Appointment, type Report, type HealthProfile, getSuggestedAppointments } from "@/lib/chats";
import ReactMarkdown from "react-markdown";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { checkOnboarding } from "@/lib/chats";
import { SettingsDialog } from "@/components/SettingsDialog";
import { PregnancyTracker, type PanelType } from "@/components/PregnancyTracker";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat | Maya" }, { name: "description", content: "Chat with Maya, your AI maternal companion." }] }),
  component: ChatPage,
});


type Source = {
  source: string;
  page: number;
  source_org: string;
  pub_year: number;
  score: number;
};
type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  emergency?: boolean;
  sources?: Source[];
  attachedFile?: string;
  feedback?: "up" | "down" | null;
};

type Chat = {
  id: string;
  title: string;
  messages: Msg[];
  pinned?: boolean;
  archived?: boolean;
  createdAt: number;
  reportId?: string;
  extractedText?: string;
};
const SUGGESTIONS = [
  "I have a headache during pregnancy",
  "Is stomach pain normal during pregnancy?",
  "What are emergency pregnancy symptoms?",
  "What should I do in week 24 of pregnancy?",
];

const EMERGENCY_KEYWORDS = ["bleeding", "severe pain", "no movement", "blurred vision", "seizure", "chest pain", "fainting", "cant breathe", "can't breathe"];

function generateReply(prompt: string): { text: string; emergency: boolean } {
  const p = prompt.toLowerCase();
  const emergency = EMERGENCY_KEYWORDS.some(k => p.includes(k));
  if (emergency) {
    return {
      emergency: true,
      text: "I'm noticing some symptoms that may need urgent care. Please contact your doctor or local emergency services immediately. While you wait: stay calm, sit or lie on your left side, and have someone with you if possible.\n\nThis is not a substitute for professional medical advice."
    };
  }
  if (p.includes("headache")) return { emergency: false, text: "Headaches in pregnancy are common, especially in the first and third trimesters — usually due to hormone changes, fatigue, or dehydration. 💧\n\nGentle steps: rest in a dim room, drink water, eat a small snack, and try a cool compress.\n\nIf the headache is severe, sudden, or paired with blurred vision or swelling, contact your doctor right away." };
  if (p.includes("stomach") || p.includes("cramp")) return { emergency: false, text: "Mild stomach discomfort and round ligament tension are common as your body changes. Try resting on your side, sipping water, and eating smaller meals. 🌿\n\nReach out to your provider if pain is sharp, persistent, or comes with bleeding." };
  if (p.includes("week 24") || p.includes("24 week")) return { emergency: false, text: "Week 24 is a beautiful milestone — your baby is about the size of a corn cob 🌽 and starting to recognize sounds.\n\nThis week, focus on: hydration, gentle movement, prenatal vitamins, and your glucose screening if scheduled. You're doing great." };
  if (p.includes("emergency")) return { emergency: false, text: "Seek immediate care if you experience: heavy bleeding, severe abdominal pain, sudden swelling, severe headache with vision changes, decreased baby movement, fever above 38°C, or trouble breathing.\n\nWhen in doubt, always call your provider." };
  return { emergency: false, text: "Thank you for sharing. I'm here to support you through your pregnancy journey. Could you tell me a little more — for example, your pregnancy week or what you're feeling? 💕\n\nRemember: I'm an AI companion and not a replacement for your care team." };
}

function ChatPage() {
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pregWeek, setPregWeek] = useState(24);
  const weekLoaded = useRef(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user, logout, loading } = useAuth();
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [filesExpanded, setFilesExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notification, setNotification] = useState<{ message: string; icon: React.ReactNode } | null>(null);


  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerTab, setTrackerTab] = useState<PanelType>("overview");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
 const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast("Voice input not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript;
      setInput(text);

    };

    recognition.start();
  };
  // useEffect(() => {
  //   if (typeof window === "undefined") return;
  //   if (loading) return;
  //   if (!user) { navigate({ to: "/login" }); return; }

  //   loadUserWeek(user.uid).then(w => {
  //     if (w !== null) setPregWeek(w);
  //     weekLoaded.current = true;
  //   });

  //   loadChats(user.uid).then(loaded => {
  //     setChats(loaded);
  //   });

  //   loadReports(user.uid).then(loaded => {
  //     setReports(loaded);
  //   });
  // }, [user, loading, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    const run = async () => {
      const profile = await loadHealthProfile(user.uid);
      const loadedAppointments = await loadAppointments(user.uid);
      setAppointments(loadedAppointments);
      // Auto-calculate week from due date
      if (profile?.dueDate) {
        const daysLeft = Math.ceil((new Date(profile.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const autoWeek = Math.min(40, Math.max(1, 40 - Math.floor(daysLeft / 7)));
        setPregWeek(autoWeek);
        await saveUserWeek(user.uid, autoWeek);
      } else {
        const w = await loadUserWeek(user.uid);
        if (w !== null) setPregWeek(w);
      }
      weekLoaded.current = true;

      const onboarded = await checkOnboarding(user.uid);
      setShowOnboarding(!onboarded);

      const loadedChats = await loadChats(user.uid);
      setChats(loadedChats);

      const loadedReports = await loadReports(user.uid);
      setReports(loadedReports);
    };

    run();
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    loadHealthProfile(user.uid).then(p => setProfile(p));
  }, [user]);


  useEffect(() => {
    if (!user || !profile) return;

    const today = new Date().toISOString().split("T")[0];
    if (profile.lastNotificationDate === today) return;

    let cancelled = false;

    const runNotification = async () => {
      let message = "";
      let icon: React.ReactNode = null;

      const meds = await loadMedications(user.uid);
      if (cancelled) return;

      const medEnabled = profile?.notifications?.medication !== false;
      if (meds.length > 0 && medEnabled) {
        const dayIndex = new Date().getDay();
        const todayMed = meds[dayIndex % meds.length];
        message = `Good morning, ${user.name.split(" ")[0]}! Don't forget your ${todayMed.name} ${todayMed.frequency}.`;
        icon = <Pill className="w-4 h-4" />;
      } else {
        const lastReport = reports[0];
        if (lastReport) {
          const daysSince = Math.floor((Date.now() - new Date(lastReport.uploadedAt).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince > 14) {
            message = "It's been 2 weeks since your last checkup. Consider uploading your latest report.";
            icon = <FileText className="w-4 h-4" />;
          }
        }
      }

      if (!message) {
        message = `Welcome back, ${user.name.split(" ")[0]}! You're at week ${pregWeek}. Ask Maya anything.`;
        icon = <Baby className="w-4 h-4" />;
      }

      if (cancelled) return;

      setNotification({ message, icon });

      const updatedProfile = { ...profile, lastNotificationDate: today };
      setProfile(updatedProfile);
      saveHealthProfile(user.uid, updatedProfile).catch(() => { });

      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    };

    const cleanupPromise = runNotification();

    return () => {
      cancelled = true;
    };
  }, [user, profile, reports, pregWeek]);


  useEffect(() => {
    if (!user || chats.length === 0) return;
    chats.forEach(chat => saveChat(user!.uid, chat));
  }, [chats]);


  const active = useMemo(() => chats.find(c => c.id === activeId) ?? null, [chats, activeId]);
  const activeMessages = active?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeId, activeMessages.length, isTyping]); // the chat scrolls to bottm only when a new message is added or when a new chat is opened, not on every keystroke
  const filtered = chats
    .filter(c => !c.archived && c.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.createdAt - a.createdAt);
  const pinned = filtered.filter(c => c.pinned);
  const recent = filtered.filter(c => !c.pinned);

  const newChat = () => { setActiveId(null); setInput(""); };
  const handleFeedback = (chatId: string, msgId: string, feedback: "up" | "down" | null) => {
    setChats(prev => prev.map(chat => {
      if (chat.id !== chatId) return chat;
      return {
        ...chat,
        messages: chat.messages.map(msg =>
          msg.id === msgId ? { ...msg, feedback } : msg
        )
      };
    }));
  };
  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;

    const userMsg: Msg = pendingFile?.name
      ? { id: crypto.randomUUID(), role: "user", content, attachedFile: pendingFile.name }
      : { id: crypto.randomUUID(), role: "user", content };

    let chatId = activeId;
    let updated: Chat[];
    let uploadedReportId: string | null = active?.reportId ?? null;

    if (!chatId) {
      const id = crypto.randomUUID();
      chatId = id;
      updated = [{
        id,
        title: content.slice(0, 40), // ← title is user's message, not filename
        messages: [userMsg],
        createdAt: Date.now(),
      }, ...chats];
    } else {
      updated = chats.map(c =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, userMsg], createdAt: Date.now() } // bump createdAt
          : c
      );
    }

    setChats(updated);
    setActiveId(chatId);
    setInput("");
    setPendingFile(null); // clear attachment
    setIsTyping(true);

    try {
      // if there's a pending file, upload it first before querying
      if (pendingFile && !uploadedReportId) {
        const token = await import("firebase/auth").then(m =>
          m.getAuth().currentUser?.getIdToken()
        );
        if (!token) throw new Error("Not authenticated");

        const formData = new FormData();
        formData.append("file", pendingFile);
        formData.append("uid", user!.uid);
        formData.append("week", String(pregWeek));
        formData.append("token", token);

        const uploadRes = await fetch(`${import.meta.env.VITE_API_URL}/upload-report`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.detail ?? "Upload failed");
        }

        const uploadData = await uploadRes.json();
        uploadedReportId = uploadData.reportId;

        // save report to Firebase + local state
        const report: Report = {
          id: uploadData.reportId,
          fileName: pendingFile.name,
          uploadedAt: new Date().toISOString(),
          week: pregWeek,
          summary: uploadData.summary,
        };
        if (user) await saveReport(user.uid, report);
        setReports(prev => [report, ...prev]);

        // update chat with reportId
        setChats(prev => prev.map(c =>
          c.id === chatId ? { ...c, reportId: uploadedReportId! } : c
        ));
      }

      const currentChat = updated.find(c => c.id === chatId);
      const history = (currentChat?.messages ?? [])
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const isReportChat = !!uploadedReportId;
      const token = await import("firebase/auth")
        .then(m =>
          m.getAuth().currentUser?.getIdToken()
        );
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/${isReportChat ? "query-report" : "query/stream"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isReportChat
              ? {
                question: content,
                reportId: uploadedReportId,
                uid: user!.uid,
                week: pregWeek,
                history,
                token,
                userName: user!.name,
              }
              : { question: content, top_k: 5, history, week: pregWeek, uid: user!.uid, token }
          ),
        }
      );

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      const aiId = crypto.randomUUID();
      const aiMsg: Msg = { id: aiId, role: "assistant", content: "" };
      setChats(prev => prev.map(c =>
        c.id === chatId ? { ...c, messages: [...c.messages, aiMsg] } : c
      ));

      let buffer = "";
      let firstToken = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value);
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const event = JSON.parse(line.slice(6));

          if (event.type === "sources") {
            setChats(prev => prev.map(c =>
              c.id === chatId ? {
                ...c,
                messages: c.messages.map(m =>
                  m.id === aiId ? { ...m, sources: event.content } : m
                )
              } : c
            ));
          } else if (event.type === "emergency") {
    setChats(prev => prev.map(c =>
        c.id === chatId ? {
            ...c,
            messages: c.messages.map(m =>
                m.id === aiId ? { ...m, emergency: true } : m
            )
        } : c
    ));
  } else if (event.type === "token") {
            if (firstToken) {
              setIsTyping(false);
              firstToken = false;
            }
            setChats(prev => prev.map(c =>
              c.id === chatId ? {
                ...c,
                messages: c.messages.map(m =>
                  m.id === aiId ? { ...m, content: m.content + event.content } : m
                )
              } : c
            ));
          }
          
        }
      }
    } catch (e) {
      setIsTyping(false);
      const errorMsg: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I couldn't process your file. Please try again or make sure it's a valid PDF under 3MB.",
      };
      setChats(prev => prev.map(c =>
        c.id === chatId ? { ...c, messages: [...c.messages, errorMsg] } : c
      ));

      toast("Something went wrong. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (file.size > 3 * 1024 * 1024) {
        toast("File too large. Please upload a PDF under 3MB.");
        return;
      }

      // just store it — don't upload yet
      setPendingFile(file);
    };

    input.click();
  };
  const openReportChat = (report: Report) => {
    // check if a chat for this report already exists
    const existing = chats.find(c => c.reportId === report.id);
    if (existing) {
      setActiveId(existing.id);
      return;
    }

    // create new chat with stored summary as first message
    const chatId = crypto.randomUUID();
    const chat: Chat = {
      id: chatId,
      title: `${report.fileName}`,
      createdAt: Date.now(),
      reportId: report.id,
      messages: [{
        id: crypto.randomUUID(),
        role: "assistant",
        content: report.summary, // stored summary, no new LLM call
      }],
    };

    setChats(prev => [chat, ...prev]);
    setActiveId(chatId);
  };

  const togglePin = (id: string) => setChats(c => c.map(x => x.id === id ? { ...x, pinned: !x.pinned } : x));
  const archive = (id: string) => {
    setChats(c => c.map(x => x.id === id ? { ...x, archived: true } : x));
    if (activeId === id) setActiveId(null);
    toast(tr("chat_archived_toast", lang));
  };

  const remove = async (id: string) => {
    const chatToDelete = chats.find(c => c.id === id);
    setChats(c => c.filter(x => x.id !== id)); // optimistic
    if (activeId === id) setActiveId(null);

    try {
      await deleteChat(user!.uid, id);
      toast(tr("chat_deleted_toast", lang));
    } catch (e) {
      // rollback on failure
      if (chatToDelete) setChats(prev => [chatToDelete, ...prev]);
      toast("Failed to delete chat. Please try again.");
    }
  };
  const handleLogout = () => { logout(); navigate({ to: "/" }); };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!user) return null;

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-300 overflow-hidden bg-sidebar border-r border-sidebar-border flex flex-col`}>
        <div className="p-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center text-primary-foreground">
              <img src={icon} alt="Maya icon" className="w-8 h-8" />
            </span>

          </Link>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}><PanelLeftClose className="w-4 h-4" /></Button>
        </div>

        <div className="px-3">
          <Button onClick={newChat} className="w-full justify-start rounded-xl h-10" variant="default">
            <Plus className="w-4 h-4 mr-2" />{tr("chat_new", lang)}
          </Button>
        </div>

        <div className="px-3 mt-3 relative">
          <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)} placeholder={tr("chat_search_ph", lang)}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-sidebar-accent text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <div className="px-3 mt-4 space-y-1">
          {/* <SidebarLink icon={Activity} label={tr("chat_preg_tracker", lang)}> */}

          <PregnancyTracker
            week={pregWeek}
            setWeek={(w) => {
              setPregWeek(w);
              if (user) saveUserWeek(user.uid, w);
            }}
            lang={lang}
            user={user}
            defaultTab={trackerTab}
            open={trackerOpen}
            onOpenChange={setTrackerOpen}
            trigger={
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm">
                <Activity className="w-4 h-4" />
                <span className="flex-1 text-left">{tr("chat_preg_tracker", lang)}</span>
                <span className="text-xs text-muted-foreground">W{pregWeek}</span>
              </button>
            }
          />

          {/* Appointment reminder */}
          <AppointmentReminder
            appointments={appointments}
            week={pregWeek}
            uid={user.uid}
            lang={lang}
            enabled={profile?.notifications?.appointment !== false}
            onClick={() => {
              setTrackerTab("appointments");
              setTrackerOpen(true);
            }}
          />
        </div>
        {/* Files section */}
        {reports.length > 0 && (
          <div className="px-2 mt-2">
            <button
              onClick={() => setFilesExpanded(!filesExpanded)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm"
            >
              <FileText className="ml-1 w-4 h-4" />
              <span className="flex-1 text-left">Files ({reports.length})</span>
              <span className="text-xs text-muted-foreground">{filesExpanded ? "▲" : "▼"}</span>
            </button>

            {filesExpanded && (
              <div className="mt-1 space-y-1 px-1">
                {reports.map(report => (
                  <div
                    key={report.id}
                    className="group flex items-center gap-1 rounded-lg pr-1 hover:bg-sidebar-accent/60 cursor-pointer"
                    onClick={() => openReportChat(report)}
                  >
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 text-sm min-w-0">
                      <span className="truncate text-xs">{report.fileName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">W{report.week}</span>
                      {/* Optional: show report type icon */}
                      {report.summary?.includes("prescribed") && (
                        <Pill className="w-3 h-3 text-primary" />
                      )}
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const reportToDelete = report;
                        setReports(prev => prev.filter(r => r.id !== report.id)); // optimistic

                        // Also remove associated chat if exists
                        const associatedChat = chats.find(c => c.reportId === report.id);
                        if (associatedChat) {
                          setChats(prev => prev.filter(c => c.id !== associatedChat.id));
                          if (activeId === associatedChat.id) setActiveId(null);
                        }

                        try {
                          if (user) {
                            await deleteReport(user.uid, report.id);
                            if (associatedChat) await deleteChat(user.uid, associatedChat.id);
                          }
                        } catch (e) {
                          // rollback
                          setReports(prev => [reportToDelete, ...prev]);
                          if (associatedChat) setChats(prev => [associatedChat, ...prev]);
                          toast("Failed to delete report. Please try again.");
                        }
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-2 mt-4">
          {pinned.length > 0 && <SidebarSection label={tr("chat_pinned", lang)} />}
          {pinned.map(c => <ChatItem key={c.id} chat={c} active={c.id === activeId} onSelect={() => setActiveId(c.id)} onPin={() => togglePin(c.id)} onArchive={() => archive(c.id)} onDelete={() => remove(c.id)} lang={lang} />)}
          {recent.length > 0 && <SidebarSection label={tr("chat_recent", lang)} />}
          {recent.map(c => <ChatItem key={c.id} chat={c} active={c.id === activeId} onSelect={() => setActiveId(c.id)} onPin={() => togglePin(c.id)} onArchive={() => archive(c.id)} onDelete={() => remove(c.id)} lang={lang} />)}
          {filtered.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8 px-3">
              {tr("chat_no_chats", lang)}
            </div>
          )}
        </div>

        <div className="border-t border-sidebar-border p-3 space-y-1">
          <SettingsDialog lang={lang} user={user} onLangChange={() => setLang(lang === "en" ? "bn" : "en")} />
          <button onClick={() => setLogoutOpen(true)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm">
            <LogOut className="w-4 h-4" />{tr("chat_logout", lang)}
          </button>

          <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>{tr("chat_logout_title", lang)}</DialogTitle>
                <DialogDescription>{tr("chat_logout_desc", lang)}</DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 mt-2">
                <Button variant="outline" onClick={() => setLogoutOpen(false)}>
                  {tr("chat_logout_cancel", lang)}
                </Button>
                <Button variant="destructive" onClick={() => { setLogoutOpen(false); handleLogout(); }}>
                  {tr("chat_logout_confirm", lang)}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="flex items-center gap-3 px-3 py-2 mt-2 rounded-lg bg-sidebar-accent">
            <div className="w-8 h-8 rounded-full bg-pink/50 flex items-center justify-center text-pink-foreground text-sm font-medium">{user.name[0].toUpperCase()}</div>
            <div className="text-xs">
              <div className="font-medium truncate max-w-[140px]">{user.name}</div>
              <div className="text-muted-foreground truncate max-w-[140px]">{user.email}</div>
            </div>
          </div>
        </div>
      </aside>
      {/* Notification banner */}
      {notification && (
        <div className="fixed top-4 left-[60%] -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary/15 border border-primary/20 text-sm shadow-lg backdrop-blur-sm">
            <span className="text-primary">{notification.icon}</span>
            <span className="text-foreground font-medium">{notification.message}</span>
          </div>
        </div>
      )}
      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {!sidebarOpen && (
          <div className="absolute top-3 left-3 z-10">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}><PanelLeft className="w-4 h-4" /></Button>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!active ? <Welcome onPick={send} name={user.name} lang={lang} /> : (
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
              {active.messages.map(m => (
                <Bubble
                  key={m.id}
                  msg={m}
                  lang={lang}
                  onFeedback={(msgId, feedback) => handleFeedback(active.id, msgId, feedback)}
                />
              ))}
              {isTyping && <TypingBubble isReport={!!pendingFile || !!active?.reportId} />}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-background/80 backdrop-blur">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] focus-within:ring-2 focus-within:ring-ring/40 transition">

              {/* Attachment chip — only shows when file is selected */}
              {pendingFile && (
                <div className="flex items-center gap-2 px-3 pt-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary max-w-xs">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{pendingFile.name}</span>
                    <button
                      onClick={() => setPendingFile(null)}
                      className="ml-1 hover:text-destructive transition-colors shrink-0"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={pendingFile ? "Ask anything about your report..." : tr("chat_placeholder", lang)}
                className="min-h-[60px] max-h-40 resize-none border-0 bg-transparent rounded-2xl focus-visible:ring-0 shadow-none"
              />

              <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg"
                    onClick={handleFileUpload}
                    disabled={isUploading}
                  >
                    <Paperclip className={`w-4 h-4 ${isUploading ? "animate-pulse" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-lg" onClick={startVoice}>
                    <Mic className="w-4 h-4" />
                  </Button>
                </div>
                <Button onClick={() => send()} disabled={!input.trim()} size="icon" className="rounded-lg">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              {tr("chat_disclaimer", lang)}
            </p>

          </div>
        </div>
      </main>
      <div className={`fixed inset-0 z-50 transition-opacity duration-500 ${showOnboarding ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {showOnboarding && (
          <OnboardingFlow
            user={user}
            onComplete={() => setShowOnboarding(false)}
          />
        )}
      </div>
    </div>
  );
}


function SidebarSection({ label }: { label: string }) {
  return <div className="px-3 pt-4 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>;
}

function SidebarLink({ icon: Icon, label, badge, children }: { icon: any; label: string; badge?: string; children?: React.ReactNode }) {
  if (children) {
    return <div>{children}</div>;
  }
  return (
    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm">
      <Icon className="w-4 h-4" />
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className="w-5 h-5 rounded-full bg-warning/20 text-warning-foreground text-[10px] flex items-center justify-center">{badge}</span>}
    </button>
  );
}

function ChatItem({ chat, active, onSelect, onPin, onArchive, onDelete, lang }: {
  chat: Chat; active: boolean; onSelect: () => void; onPin: () => void; onArchive: () => void; onDelete: () => void; lang: "en" | "bn";
}) {
  return (
    <div className={`group flex items-center gap-1 rounded-lg pr-1 ${active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"}`}>
      <button onClick={onSelect} className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-left min-w-0">
        <MessageCircle className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{chat.title}</span>
        {chat.pinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background/50"><MoreHorizontal className="w-3.5 h-3.5" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onPin}><Pin className="w-3.5 h-3.5 mr-2" />{chat.pinned ? tr("chat_unpin", lang) : tr("chat_pin", lang)}</DropdownMenuItem>
          <DropdownMenuItem onClick={onArchive}><Archive className="w-3.5 h-3.5 mr-2" />{tr("chat_archive", lang)}</DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" />{tr("chat_delete", lang)}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Welcome({ onPick, name, lang }: {
  onPick: (s: string) => void; name: string; lang: "en" | "bn"
}) {
  const suggestions = [
    tr("chat_sug1", lang),
    tr("chat_sug2", lang),
    tr("chat_sug3", lang),
    tr("chat_sug4", lang),
  ];
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-12">
      <div className="w-25 h-25 rounded-xl shrink-0 flex items-center justify-center">
        <img src={icon} alt="Maya" className="w-16 h-16" />
      </div>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
        {tr("chat_hello", lang)} {name}, {tr("chat_feeling", lang)}
      </h1>
      <p className="mt-3 text-muted-foreground text-center max-w-lg">
        {tr("chat_welcome_p", lang)}
      </p>
      <div className="mt-8 grid sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {suggestions.map(s => (
          <button key={s} onClick={() => onPick(s)}
            className="text-left p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-accent/40 transition text-sm">
            <Sparkles className="w-4 h-4 text-primary mb-2" />{s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ msg, lang, onFeedback }: { msg: Msg; lang: "en" | "bn"; onFeedback?: (msgId: string, feedback: "up" | "down" | null) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: "up" | "down") => {
    if (!onFeedback) return;
    const newFeedback = msg.feedback === type ? null : type;
    onFeedback(msg.id, newFeedback);
  };

  if (msg.role === "user") {
    return (
      <div className="flex flex-col items-end gap-2">
        {msg.attachedFile && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-xs text-primary">
            <FileText className="w-3.5 h-3.5" />
            <span>{msg.attachedFile}</span>
          </div>
        )}
        <div className="flex justify-end w-full">
          <div className="px-4 py-3 rounded-2xl rounded-br-md bg-primary text-primary-foreground max-w-[720px]">
            <div className="text-sm leading-relaxed whitespace-normal break-words">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!msg.content) return null;

  const uniqueSources = msg.sources
    ? msg.sources.filter((s, idx, arr) =>
      arr.findIndex(t => t.source_org === s.source_org && t.pub_year === s.pub_year) === idx
    )
    : [];

  const showBoth = msg.feedback === null || msg.feedback === undefined;

  return (
    <div className="flex gap-3 max-w-none group">
      <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-1">
        <img src={icon} alt="Maya" className="w-8 h-8" />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        {/* {msg.emergency && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-sm">{tr("chat_emg_title", lang)}</div>
              <div className="text-xs opacity-90 mt-1">{tr("chat_emg_sub", lang)}</div>
            </div>
          </div>
        )} */}
        {msg.emergency && <EmergencyMap />}
        <div className="py-2 text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>

        {/* Sources + Feedback bar — aligned in one row */}
        {(uniqueSources.length > 0 || onFeedback) && (
          <div className="flex items-center justify-between gap-4">
            {/* Sources */}
            {uniqueSources.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {uniqueSources.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] text-primary">
                    <span className="font-medium">{s.source_org}</span>
                    <span className="text-muted-foreground">·</span>
                    {s.pub_year && s.pub_year !== -1 && (
                      <>
                        <span>{s.pub_year}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Feedback buttons */}
            {onFeedback && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {(showBoth || msg.feedback === "up") && (
                  <button
                    onClick={() => handleFeedback("up")}
                    className={`p-1.5 rounded-md transition-colors ${msg.feedback === "up"
                        ? "text-white"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    title="Helpful"
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${msg.feedback === "up" ? "fill-current" : ""}`} />
                  </button>
                )}

                {(showBoth || msg.feedback === "down") && (
                  <button
                    onClick={() => handleFeedback("down")}
                    className={`p-1.5 rounded-md transition-colors ${msg.feedback === "down"
                        ? "text-white"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    title="Not helpful"
                  >
                    <ThumbsDown className={`w-3.5 h-3.5 ${msg.feedback === "down" ? "fill-current" : ""}`} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingBubble({ isReport = false }: { isReport?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center">
        <img src={icon} alt="Maya" className="w-8 h-8" />
      </div>
      <div className="px-4 py-4 rounded-2xl rounded-bl-md bg-card border border-border flex flex-col gap-2">
        {isReport && (
          <p className="text-xs text-muted-foreground">
            Reading your report...
          </p>
        )}
        <div className="flex gap-1.5">
          <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
          <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
          <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function PregnancyDialog({ week, setWeek, lang }: {
  week: number; setWeek: (n: number) => void; lang: "en" | "bn"
}) {
  const milestones: Record<number, string> = {
    12: tr("pdlg_m12", lang),
    20: tr("pdlg_m20", lang),
    24: tr("pdlg_m24", lang),
    28: tr("pdlg_m28", lang),
    36: tr("pdlg_m36", lang),
    40: tr("pdlg_m40", lang),
  };
  const next = Object.keys(milestones).map(Number).find(w => w >= week) ?? 40;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm">
          <Activity className="w-4 h-4" />
          <span className="flex-1 text-left">{tr("pdlg_title", lang)}</span>
          <span className="text-xs text-muted-foreground">W{week}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Baby className="w-5 h-5 text-primary" />{tr("pdlg_title", lang)}
          </DialogTitle>
          <DialogDescription>{tr("pdlg_desc", lang)}</DialogDescription>
        </DialogHeader>
        <Card className="p-5 rounded-2xl border-border/60 mt-2">
          <div className="text-sm text-muted-foreground">{tr("pdlg_current_week", lang)}</div>
          <div className="text-4xl font-semibold mt-1">
            {week} <span className="text-base text-muted-foreground font-normal">{tr("pdlg_of40", lang)}</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-[image:var(--gradient-primary)] rounded-full transition-all" style={{ width: `${(week / 40) * 100}%` }} />
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            {tr("pdlg_next", lang)} <span className="text-foreground font-medium">{tr("pdlg_week", lang)} {next} — {milestones[next]}</span>
          </div>
        </Card>
        <div className="flex items-center gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={() => setWeek(Math.max(1, week - 1))}>−</Button>
          <input type="range" min={1} max={40} value={week} onChange={e => setWeek(Number(e.target.value))} className="flex-1 accent-[var(--primary)]" />
          <Button variant="outline" size="sm" onClick={() => setWeek(Math.min(40, week + 1))}>+</Button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[12, 20, 24, 28, 32, 40].map(w => (
            <button key={w} onClick={() => setWeek(w)} className={`text-xs py-2 rounded-lg border ${week === w ? "border-primary bg-primary/10" : "border-border hover:bg-accent/40"}`}>
              {tr("pdlg_week", lang)} {w}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AppointmentReminder({
  appointments,
  week,
  uid,
  lang,
  onClick,
  enabled = true
}: {
  appointments: Appointment[];
  week: number;
  uid: string;
  lang: "en" | "bn";
  onClick: () => void;
  enabled?: boolean;
}) {
  if (!enabled) return null;


  const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const upcoming = appointments
    .filter(a => a.status === "upcoming" && a.date >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const next = upcoming[0];
  if (!next) return null;

  const days = Math.ceil((new Date(next.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Color based on urgency
  const isUrgent = days <= 1;
  const isSoon = days <= 3;

  return (
    <button
      onClick={onClick}
      className={`
        mx-3 flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left
        transition-colors cursor-pointer
        ${isUrgent
          ? "bg-red-500/10 hover:bg-red-500/15 text-red-400"
          : isSoon
            ? "bg-amber-500/10 hover:bg-amber-500/15 text-amber-400"
            : "bg-primary/10 hover:bg-primary/15 text-primary/80"
        }
      `}
    >
      <Calendar className="w-3 h-3 shrink-0" />
      <span className="text-[11px] font-medium truncate flex-1">
        {next.title}
      </span>
      <span className="text-[10px] shrink-0 opacity-70">
        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
      </span>
      <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />
    </button>
  );
}