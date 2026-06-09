declare global {   //Eva's Change: Added global declaration for SpeechRecognition
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

import EmergencyPanel from "../components/EmergencyPanel";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart, Plus, Search, Copy, Edit3, MessageCircle, Pin, Archive, Trash2, Settings, LogOut,
  Activity, AlertTriangle, Send, Mic, Paperclip, Sparkles, Sun, Moon,
  PanelLeftClose, PanelLeft, MoreHorizontal, ShieldAlert, Baby, Languages
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
import { loadChats, saveChat, deleteChat, saveUserWeek, loadUserWeek } from "@/lib/chats";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat | Maya" }, { name: "description", content: "Chat with Maya, your AI maternal companion." }] }),
  component: ChatPage,
});

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  emergency?: boolean;
  sources?: Source[];
};

type Source = {
  source: string;
  page: number;
  source_org: string;
  pub_year: number;
  score: number;
};
type Hospital = {
  name: string;
  address: string;
  contact: string;
  ambulance: string;
  lat: number;
  lng: number;
  region?: string;
};
type Chat = { id: string; title: string; messages: Msg[]; pinned?: boolean; archived?: boolean; createdAt: number };

const SUGGESTIONS = [
  "I have a headache during pregnancy",
  "Is stomach pain normal during pregnancy?",
  "What are emergency pregnancy symptoms?",
  "What should I do in week 24 of pregnancy?",
];

const EMERGENCY_KEYWORDS = ["bleeding", "heavy bleeding", "severe bleeding", "severe pain", "no movement", "blurred vision", "seizure", "chest pain", "fainting", "cant breathe", "can't breathe"];

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

const EMERGENCY_DIVISIONS = [
  "dhaka",
  "chattogram",
  "rajshahi",
  "khulna",
  "sylhet",
  "barishal",
  "rangpur",
  "mymensingh",
];

const HOSPITAL_DATABASE: Hospital[] = [
  {
    name: "Dhaka Medical College Hospital",
    address: "Shahbagh, Dhaka",
    contact: "+88 02 9665110",
    ambulance: "+88 02 9665110",
    lat: 23.7357,
    lng: 90.3939,
    region: "Dhaka Division",
  },
  {
    name: "Square Hospital",
    address: "Panthapath, Dhaka",
    contact: "+88 02 9115231",
    ambulance: "+88 02 9115231",
    lat: 23.7516,
    lng: 90.3848,
    region: "Dhaka Division",
  },
  {
    name: "Apollo Hospitals Dhaka",
    address: "Bashundhara, Dhaka",
    contact: "+88 09666778855",
    ambulance: "+88 09666778855",
    lat: 23.8088,
    lng: 90.4245,
    region: "Dhaka Division",
  },
  {
    name: "Chittagong Medical College Hospital",
    address: "Pahartali, Chattogram",
    contact: "+88 031 2517614",
    ambulance: "+88 031 2517614",
    lat: 22.3475,
    lng: 91.8116,
    region: "Chattogram Division",
  },
  {
    name: "Parkview Hospital",
    address: "Panchlaish, Chattogram",
    contact: "+88 031 2877871",
    ambulance: "+88 031 2877871",
    lat: 22.3402,
    lng: 91.8150,
    region: "Chattogram Division",
  },
  {
    name: "Sylhet MAG Osmani Medical College Hospital",
    address: "Mirboxtula, Sylhet",
    contact: "+88 0821 722740",
    ambulance: "+88 0821 722740",
    lat: 24.8949,
    lng: 91.8687,
    region: "Sylhet Division",
  },
  {
    name: "Rajshahi Medical College Hospital",
    address: "Shah Makhdum Avenue, Rajshahi",
    contact: "+88 0721 776236",
    ambulance: "+88 0721 776236",
    lat: 24.3801,
    lng: 88.6046,
    region: "Rajshahi Division",
  },
  {
    name: "Khulna Medical College Hospital",
    address: "Khulna",
    contact: "+88 041 731110",
    ambulance: "+88 041 731110",
    lat: 22.8342,
    lng: 89.5636,
    region: "Khulna Division",
  },
  {
    name: "Rangpur Medical College Hospital",
    address: "Rangpur",
    contact: "+88 0521 61025",
    ambulance: "+88 0521 61025",
    lat: 25.7439,
    lng: 89.2752,
    region: "Rangpur Division",
  },
  {
    name: "Mymensingh Medical College Hospital",
    address: "Mymensingh",
    contact: "+88 091 666391",
    ambulance: "+88 091 666391",
    lat: 24.7471,
    lng: 90.4203,
    region: "Mymensingh Division",
  },
];

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestHospitals(lat: number, lng: number, radiusKm = 15, limit = 3) {
  return HOSPITAL_DATABASE
    .map(h => ({ ...h, distance: getDistanceKm(lat, lng, h.lat, h.lng) }))
    .filter(h => h.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ distance, ...hospital }) => hospital);
}
function removeDuplicateHospitals(list: Hospital[]) {
  const seen = new Set();
  return list.filter(h => {
    const key = h.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function getTopHospitalsForRegion(region: string, limit = 3) {
  const normalized = region.toLowerCase();
  return HOSPITAL_DATABASE
    .filter(h => h.region?.toLowerCase().includes(normalized))
    .slice(0, limit);
}

// Eva's change: helper to locate emergency division from user input
function getEmergencyRegion(prompt: string) {
  const normalized = prompt.toLowerCase();
  return EMERGENCY_DIVISIONS.find(div => normalized.includes(div)) ?? null;
}

// Eva's change: helper to search hospitals by area prompt text
function getHospitalsByAreaText(prompt: string, limit = 3) {
  const normalized = prompt.toLowerCase();
  return HOSPITAL_DATABASE
    .filter(h => h.name.toLowerCase().includes(normalized)
      || h.address.toLowerCase().includes(normalized)
      || h.region?.toLowerCase().includes(normalized))
    .slice(0, limit);
}

// Eva's change: helper to build a Google Maps link for hospital cards
function getMapsLink(h: Hospital) {
  return `https://www.google.com/maps?q=${encodeURIComponent(h.name)}%20${h.lat},${h.lng}`;
}

// Eva's change: helper to detect whether the user is requesting another emergency area
function isEmergencyAreaRequest(prompt: string) {
  return /(^|\s)(yes|yeah|yep|sure|please|other area|other areas|another area|another nearby hospital|division|region|area)(\s|$)/i.test(prompt);
}

// Eva's change: format hospitals as readable chat message
function formatHospitalsMessage(hospitals: Hospital[]): string {
  hospitals = removeDuplicateHospitals(hospitals);
  console.log("HOSPITALS INPUT:", hospitals);
  if (hospitals.length === 0) return "No hospitals found in this area.";

  const hospitalList = hospitals
    .map((h, i) => {
      const mapsLink = getMapsLink(h);
      return `${i + 1}. **${h.name.trim()}**
📍 Address: ${h.address}
📞 Contact: ${h.contact}
🚑 Ambulance: ${h.ambulance}
🗺️ [Open in Maps](${mapsLink})`;
    })
    .join("\n\n");

  return `🚨 **Nearby Emergency Hospitals**\n\n${hospitalList}`;
}

// Eva's Change: Create follow-up question message about other areas
function getFollowUpMessage(step: string) {
  if (step === "nearby") {
    return "Do you want hospital locations in other areas?";
  }

  if (step === "final") {
    return "Do you need more hospitals from this area?";
  }

  return "";
}

// Eva's Change: Get division list for selection
function getDivisionList(): string[] {
  return [
    "Dhaka Division",
    "Chattogram Division",
    "Rajshahi Division",
    "Khulna Division",
    "Sylhet Division",
    "Barishal Division",
    "Rangpur Division",
    "Mymensingh Division",
  ];
}

// Eva's Change: Create division selection message
function createDivisionSelectionMessage(): string {
  return "🌍 **Select a Division:**";
}

function ChatPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [chats, setChats] = useState<Chat[]>([]);
  //Eva's Change: State for emergency handling
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // Eva's change: State for showing emergency response
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false); // Eva's change: emergency alert active
  const [emergencyFollowUp, setEmergencyFollowUp] = useState(false); // Eva's change: follow-up area selection
  const [emergencySelectedRegion, setEmergencySelectedRegion] = useState<string | null>(null); // Eva's change: selected emergency region
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null); // Eva's change: editing message
  const [editingMessageText, setEditingMessageText] = useState(""); // Eva's change: edited message draft
  // Eva's Change: Store user's geolocation coordinates for emergency hospital search
  const [userCoordinates, setUserCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [locationLoading, setLocationLoading] =
    useState(true);

  const [emergencyHospitals, setEmergencyHospitals] = useState<Hospital[]>([]);
  const [emergencyStep, setEmergencyStep] = useState<
  "idle" | "nearby" |  "division_select" | "final"
>("idle");
  // Eva's Change: follow-up conversation state
  const [awaitingDivisionSelection, setAwaitingDivisionSelection] = useState(false);

  const DEFAULT_HOSPITALS: Hospital[] = [
    {
      name: "Maya Emergency Center",
      address: "120 Wellness Blvd",
      contact: "(555) 123-4567",
      ambulance: "24/7 emergency services",
      lat: 37.7749,
      lng: -122.4194,
    },
    {
      name: "Mothercare Hospital",
      address: "45 Care St",
      contact: "(555) 987-6543",
      ambulance: "Rapid response available",
      lat: 37.7849,
      lng: -122.4094,
    },
    {
      name: "Family Health Clinic",
      address: "88 Hope Avenue",
      contact: "(555) 246-8100",
      ambulance: "Ambulance support available",
      lat: 37.7649,
      lng: -122.4294,
    },
  ];

  // Eva's Change: Load nearest hospitals using browser geolocation
  const loadEmergencyHospitals = async (): Promise<Hospital[]> => {
    return new Promise((resolve) => {

      if (!navigator.geolocation) {
        toast.error(
          "Location is not supported. Please select a division."
        );

        setAwaitingDivisionSelection(true);

        resolve([]);

        return;
      }

      navigator.geolocation.getCurrentPosition(

        async (position) => {

          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          console.log("User Location:", latitude, longitude);

          setUserCoordinates({
            lat: latitude,
            lng: longitude,
          });

          const nearest = findNearestHospitals(
            latitude,
            longitude,
            15,
            3
          );
          setEmergencyHospitals(nearest);
          setEmergencyStep("nearby");
          resolve(nearest);
        },

        (error) => {

          console.error(error);

          toast.error(
            "Location permission denied. Please select your division."
          );

          setAwaitingDivisionSelection(true);

          resolve([]);
        },

        {
          enableHighAccuracy: true,
          timeout: 10000,
        }
      );
    });
  };

  // **** Eva's change: Disabled temporary emergency trigger helper ****
  // const triggerEmergency = async () => {
  //   setShowEmergency(true);
  //   const hospitals = await loadEmergencyHospitals();
  //   setEmergencyHospitals(hospitals);
  // };

  /// **** Eva's Change: Start Voice Recognition **** ///
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
  /// **** Eva's Change: End Voice Recognition **** ///

  const [isTyping, setIsTyping] = useState(false);
  const [pregWeek, setPregWeek] = useState(24);
  const weekLoaded = useRef(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { user, logout, loading } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }

    loadUserWeek(user.uid).then(w => {
      if (w !== null) setPregWeek(w);
      weekLoaded.current = true;
    });

    loadChats(user.uid).then(loaded => {
      setChats(loaded);
    });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || !weekLoaded.current) return;  // skip until loaded
    saveUserWeek(user.uid, pregWeek);
  }, [pregWeek, user]);

  useEffect(() => {
    if (!user || chats.length === 0) return;
    chats.forEach(chat => saveChat(user!.uid, chat));
  }, [chats]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [activeId, chats, isTyping]);

  const active = useMemo(() => chats.find(c => c.id === activeId) ?? null, [chats, activeId]);

  const filtered = chats.filter(c => !c.archived && c.title.toLowerCase().includes(search.toLowerCase()));
  const pinned = filtered.filter(c => c.pinned);
  const recent = filtered.filter(c => !c.pinned);

  const newChat = () => {
    setActiveId(null); setInput("");
    setEmergencyMode(false); // Eva's change: reset emergency mode on new chat
    setShowEmergency(false);
    setEmergencyFollowUp(false);
    setEmergencySelectedRegion(null);
    setEmergencyHospitals([]);
    setEditingMessageId(null);
    setEditingMessageText("");
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;

    const chatId = activeId ?? crypto.randomUUID();
    let updated: Chat[];
    const isEditingExisting = editingMessageId && active && active.messages.some(m => m.id === editingMessageId);

  
     // Eva's Change: Properly create new chat and append messages
    if (isEditingExisting && active) {
      const index = active.messages.findIndex(
        m => m.id === editingMessageId
      );

      if (index !== -1) {
        updated = chats.map(c => {
          if (c.id !== chatId) return c;

          const editedMessages = c.messages
            .map(m =>
              m.id === editingMessageId
                ? { ...m, content }
                : m
            )
            .slice(0, index + 1);

          return {
            ...c,
            messages: editedMessages,
          };
        });
      } else {
        updated = chats;
      }
    } else {
      const existingChat = chats.find(c => c.id === chatId);

      if (existingChat) {
        updated = chats.map(c =>
          c.id === chatId
            ? {
              ...c,
              messages: [
                ...c.messages,
                {
                  id: crypto.randomUUID(),
                  role: "user",
                  content,
                },
              ],
            }
            : c
        );
      } else {
        // Eva's Change: Create brand new chat properly
        updated = [
          {
            id: chatId,
            title: content.slice(0, 40),
            messages: [
              {
                id: crypto.randomUUID(),
                role: "user",
                content,
              },
            ],
            createdAt: Date.now(),
          },
          ...chats,
        ];
      }
    }
    if (!activeId) {
      setActiveId(chatId);
    }
    setChats(updated);
    setInput("");
    setEditingMessageId(null);
    setEditingMessageText("");
    setIsTyping(true);

    // Eva's change: local emergency detection before contacting backend
    const localReply = generateReply(content);
    if (localReply.emergency) {

      const hospitals = await loadEmergencyHospitals();

      if (hospitals.length > 0) {

        setEmergencyHospitals(hospitals);

        const hospitalText =
          formatHospitalsMessage(hospitals);

        const aiMsg: Msg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: hospitalText,
          emergency: true,
        };

        setChats(prev =>
          prev.map(c =>
            c.id === chatId
              ? {
                ...c,
                messages: [
                  ...c.messages,
                  aiMsg,
                ],
              }
              : c
          )
        );

        setTimeout(() => {

          const followUp: Msg = {
            id: crypto.randomUUID(),
            role: "assistant",
            emergency: true,
            content:
              " Would you like hospitals from another division?",
            
          };

          setChats(prev =>
            prev.map(c =>
              c.id === chatId
                ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    followUp,
                  ],
                }
                : c
            )
          );

        }, 800);
      }

      else {

        const aiMsg: Msg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "         🌍 **Select a Division:**"

        };

        setChats(prev =>
          prev.map(c =>
            c.id === chatId
              ? {
                ...c,
                messages: [
                  ...c.messages,
                  aiMsg,
                ],
              }
              : c
          )
        );

        setEmergencyFollowUp(true);
      }

      setEmergencyMode(true);

      setIsTyping(false);

      return;
    }
    if (emergencyMode) {
      // Eva's Change: User wants hospitals in another area
      if (
        awaitingDivisionSelection &&
        isEmergencyAreaRequest(content)
      ) {
        const msg: Msg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "🌍 Select a Division:\n\n• Dhaka Division\n• Chattogram Division\n• Rajshahi Division\n• Khulna Division\n• Sylhet Division\n• Barishal Division\n• Rangpur Division\n• Mymensingh Division",
          emergency: true,
        };

        setChats(prev =>
          prev.map(c =>
            c.id === chatId
              ? {
                ...c,
                messages: [...c.messages, msg],
              }
              : c
          )
        );

        setAwaitingDivisionSelection(false);

        setIsTyping(false);

        return;
      }
      // Eva's Change: Region-specific hospital search
      const selectedRegion = getEmergencyRegion(content);

      if (selectedRegion) {

        const hospitals =
          getTopHospitalsForRegion(selectedRegion);

        if (hospitals.length > 0) {

          const hospitalMsg: Msg = {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              formatHospitalsMessage(hospitals),
            emergency: true,
          };

          setChats(prev =>
            prev.map(c =>
              c.id === chatId
                ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    hospitalMsg,
                  ],
                }
                : c
            )
          );

          // Eva's Change: conversational follow-up
          setTimeout(() => {

             const followUpText =
  getFollowUpMessage("final");

            const followUpMsg: Msg = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: followUpText,
              emergency: true,
            };

            setChats(prev =>
              prev.map(c =>
                c.id === chatId
                  ? {
                    ...c,
                    messages: [
                      ...c.messages,
                      followUpMsg,
                    ],
                  }
                  : c
              )
            );

          }, 700);

          setIsTyping(false);

          return;
        }
      }
      // Eva's Change: Check if user wants to see hospitals in other areas
      if (isEmergencyAreaRequest(content) && !emergencyFollowUp) {
        const divisionId = crypto.randomUUID();
        const divisionMsg: Msg = {
          id: divisionId,
          role: "assistant",
          content: createDivisionSelectionMessage(),
          emergency: true,
        };
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...c.messages, divisionMsg] } : c));
        setEmergencyFollowUp(true);
        setIsTyping(false);
        return;
      }

      // Eva's Change: Check if user selected a specific region/division
      const region = getEmergencyRegion(content);
      if (region) {
        const hospitals = getTopHospitalsForRegion(region, 3);
        if (hospitals.length > 0) {
          const aiId = crypto.randomUUID();
          const hospitalContent = formatHospitalsMessage(hospitals);
          const aiMsg: Msg = {
            id: aiId,
            role: "assistant",
            content: hospitalContent,
            emergency: true,
          };
          setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...c.messages, aiMsg] } : c));

          // Eva's Change: Send follow-up question after showing hospitals in selected area
          setTimeout(() => {

  const followUp: Msg = {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      "Would you like hospitals from another division?",
    emergency: true,
  };

  setChats(prev =>
    prev.map(c =>
      c.id === chatId
        ? {
            ...c,
            messages: [...c.messages, followUp],
          }
        : c
    )
  );

}, 1000);

          setEmergencySelectedRegion(region);
          setEmergencyHospitals(hospitals);
          setIsTyping(false);
          return;
        }
      }

      if (!emergencyFollowUp && isEmergencyAreaRequest(content)) {
        const aiId = crypto.randomUUID();
        const aiMsg: Msg = {
          id: aiId,
          role: "assistant",
          content: createDivisionSelectionMessage(),
          emergency: true,
        };
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...c.messages, aiMsg] } : c));
        setEmergencyFollowUp(true);
        setIsTyping(false);
        return;
      }
    }

    try {
      const history = (active?.messages ?? [])
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${import.meta.env.VITE_API_URL}/query/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: content, top_k: 5, history, week: pregWeek }),
      });
      // Eva's Change: Safe stream handling
      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      const aiId = crypto.randomUUID();
      const aiMsg: Msg = { id: aiId, role: "assistant", content: "" };
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...c.messages, aiMsg] } : c));

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
      toast("Something went wrong. Please try again.");
    }
  };

  // Eva's change: copy chat message text to clipboard
  const copyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied message to clipboard.");
    } catch {
      toast("Unable to copy message. Please try again.");
    }
  };

  // Eva's change: open a user message for editing via the bottom input
  const startEditMessage = (message: Msg) => {
    setEditingMessageId(message.id);
    setEditingMessageText(message.content);
    setInput(message.content);
    inputRef.current?.focus();
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingMessageText("");
    setInput("");
    inputRef.current?.focus();
  };

  // Eva's change: regenerate assistant response after a user message edit
  const regenerateAfterEdit = async (chatId: string, messageId: string, content: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    const index = chat.messages.findIndex(m => m.id === messageId);
    if (index === -1) return;

    setEditingMessageId(null);
    setEditingMessageText("");
    const trimmedContent = content.trim();
    const updatedHistory = chat.messages.slice(0, index + 1);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: updatedHistory } : c));

    const localReply = generateReply(trimmedContent);
    if (localReply.emergency) {
      const aiId = crypto.randomUUID();
      const hospitalContent = formatHospitalsMessage(DEFAULT_HOSPITALS);
      const aiMsg: Msg = {
        id: aiId,
        role: "assistant",
        content: hospitalContent,
        emergency: true,
      };
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...updatedHistory, aiMsg] } : c));
      setEmergencyMode(true);
      setEmergencyFollowUp(false);
      setEmergencySelectedRegion(null);
      await loadEmergencyHospitals().then(h => setEmergencyHospitals(h));
      setIsTyping(false);
      return;
    }

    setEmergencyMode(false);
    setEmergencyFollowUp(false);
    setEmergencySelectedRegion(null);
    setEmergencyHospitals([]);

    setIsTyping(true);
    const aiId = crypto.randomUUID();
    const aiMsg: Msg = { id: aiId, role: "assistant", content: "" };
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...updatedHistory, aiMsg] } : c));

    try {
      const history = updatedHistory.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${import.meta.env.VITE_API_URL}/query/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedContent, top_k: 5, history, week: pregWeek }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
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
            setChats(prev => prev.map(c => c.id === chatId ? {
              ...c,
              messages: c.messages.map(m => m.id === aiId ? { ...m, sources: event.content } : m),
            } : c));
          } else if (event.type === "token") {
            if (firstToken) {
              setIsTyping(false);
              firstToken = false;
            }
            setChats(prev => prev.map(c => c.id === chatId ? {
              ...c,
              messages: c.messages.map(m => m.id === aiId ? { ...m, content: m.content + event.content } : m),
            } : c));
          }
        }
      }
    } catch (e) {
      setIsTyping(false);
      toast("Something went wrong. Please try again.");
    }
  };
  const togglePin = (id: string) => setChats(c => c.map(x => x.id === id ? { ...x, pinned: !x.pinned } : x));
  const archive = (id: string) => {
    setChats(c => c.map(x => x.id === id ? { ...x, archived: true } : x));
    if (activeId === id) setActiveId(null);
    toast(tr("chat_archived_toast", lang));
  };

  const remove = (id: string) => {
    setChats(c => c.filter(x => x.id !== id));
    deleteChat(user!.uid, id);
    if (activeId === id) setActiveId(null);
    toast(tr("chat_deleted_toast", lang));
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
          <SidebarLink icon={Activity} label={tr("chat_preg_tracker", lang)}>
            <PregnancyDialog week={pregWeek} setWeek={setPregWeek} lang={lang} />
          </SidebarLink>
          {/* Eva's change: Emergency sidebar alert button */}
          <SidebarLink
            icon={ShieldAlert}
            label={tr("chat_emergency", lang)}
            badge="!"
            className={emergencyMode ? "border-red-500 bg-red-500/10 text-red-600" : undefined}
            onClick={async () => {
              const chatId = activeId ?? crypto.randomUUID();
              if (!activeId) setActiveId(chatId);

              const aiId = crypto.randomUUID();
              const hospitals = await loadEmergencyHospitals();
              const hospitalContent = formatHospitalsMessage(hospitals);
              const aiMsg: Msg = {
                id: aiId,
                role: "assistant",
                content: hospitalContent,
                emergency: true,
              };

              setChats(prev => {
                const existing = prev.find(c => c.id === chatId);
                if (existing) {
                  return prev.map(c => c.id === chatId ? { ...c, messages: [...c.messages, aiMsg] } : c);
                } else {
                  return [{ id: chatId, title: "Emergency", messages: [aiMsg], createdAt: Date.now() }, ...prev];
                }
              });

              setEmergencyMode(true);
              setEmergencyFollowUp(false);
              setEmergencySelectedRegion(null);
              setEmergencyHospitals(hospitals);
            }}
          />
        </div>

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
          <button onClick={toggle} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? tr("chat_light", lang) : tr("chat_dark", lang)}
          </button>
          <LangToggle />
          <SettingsDialog lang={lang} />
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

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {!sidebarOpen && (
          <div className="absolute top-3 left-3 z-10">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}><PanelLeft className="w-4 h-4" /></Button>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {showEmergency && <EmergencyPanel hospitals={emergencyHospitals} />}
          {!active ? (
            <Welcome onPick={send} name={user.name} lang={lang} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
              {active.messages.map(m => (
                <Bubble
                  key={m.id}
                  msg={m}
                  lang={lang}
                  emergencyStep={emergencyStep}

                  onDivisionSelect={(division) => send(division)}
                  editingMessageId={editingMessageId}
                  editText={editingMessageText}
                  setEditText={setEditingMessageText}
                  onCopy={() => copyMessage(m.content)}
                  onEdit={() => m.role === "user" && startEditMessage(m)}
                  onSaveEdit={() => {
                    if (editingMessageId === m.id) regenerateAfterEdit(active.id, m.id, editingMessageText);
                  }}
                  onCancelEdit={cancelEditMessage}
                />
              ))}
              {isTyping && <TypingBubble />}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-background/80 backdrop-blur">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] focus-within:ring-2 focus-within:ring-ring/40 transition">
              {editingMessageId && (
                <div className="border-b border-border px-4 py-3 text-sm text-muted-foreground flex items-center justify-between gap-3">
                  <span>Editing message — update text below and press send.</span>
                  <Button variant="outline" size="sm" onClick={cancelEditMessage}>Cancel</Button>
                </div>
              )}
              <Textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={tr("chat_placeholder", lang)}
                className="min-h-[60px] max-h-40 resize-none border-0 bg-transparent rounded-2xl focus-visible:ring-0 shadow-none"
              />
              <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => toast(tr("chat_attach_soon", lang))}>
                    <Paperclip className="w-4 h-4" />
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
    </div>

  );
}
function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "bn" : "en")}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm"
    >
      <Languages className="w-4 h-4" />
      {lang === "en" ? "বাংলা" : "English"}
    </button>
  );
}

function SidebarSection({ label }: { label: string }) {
  return <div className="px-3 pt-4 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>;
}

function SidebarLink({ icon: Icon, label, badge, className, onClick, children }: { icon: any; label: string; badge?: string; className?: string; onClick?: () => void; children?: React.ReactNode }) {
  if (children) {
    return <div>{children}</div>;
  }
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm ${className ?? ""}`}>
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

// Eva's change: message bubble now supports copy and inline edit actions
// Eva's Change: Component to render individual hospital card
function HospitalCard({ hospital, onMapClick }: { hospital: Hospital; onMapClick: (name: string, lat: number, lng: number) => void }) {
  const mapsLink = getMapsLink(hospital);
  return (
    <div className="border border-border rounded-lg p-4 mb-3 bg-card hover:bg-muted/50 transition">
      <h4 className="font-semibold text-sm mb-2">{hospital.name}</h4>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>📍 <span className="text-foreground">{hospital.address}</span></p>
        <p>📞 <span className="text-foreground">{hospital.contact}</span></p>
        <p>🚑 <span className="text-foreground">{hospital.ambulance}</span></p>
      </div>
      <button
        onClick={() => onMapClick(hospital.name, hospital.lat, hospital.lng)}
        className="mt-3 w-full px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition text-center"
      >
        🗺️ Open in Maps
      </button>
    </div>
  );
}

// Eva's Change: Component to render division selection buttons
function DivisionSelector({ onSelect }: { onSelect: (division: string) => void }) {
  const divisions = getDivisionList();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {divisions.map(division => (
        <button
          key={division}
          onClick={() => onSelect(division)}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary transition"
        >
          {division}
        </button>
      ))}
    </div>
  );
}

// Eva's Change: Enhanced message content renderer that handles emergency messages
function renderEmergencyContent(content: string, onDivisionSelect?: (d: string) => void) {
  if (content.includes("Select a Division")) {
    return (
      <DivisionSelector onSelect={onDivisionSelect!} />
    );
  }

  return renderMessageContent(content);
}

function renderMessageContent(content: string) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  const parts = content.split(linkRegex);

  const elements: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // normal text
    if (i % 3 === 0) {
      const boldSplit = part.split(/(\*\*([^*]+)\*\*)/g);

      boldSplit.forEach((b, j) => {
        const match = b.match(/^\*\*(.+)\*\*$/);
        if (match) {
          elements.push(<strong key={`${i}-${j}`}>{match[1]}</strong>);
        } else {
          elements.push(<span key={`${i}-${j}`}>{b}</span>);
        }
      });
    }

    // link text
    else if (i % 3 === 1) {
      const text = parts[i];
      const url = parts[i + 1];

      elements.push(
        <a
          key={`${i}-link`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {text}
        </a>
      );

      i++; // skip URL
    }
  }

  return <>{elements}</>;
}

function Bubble({ msg, lang, emergencyStep, onDivisionSelect, editingMessageId, editText, setEditText, onCopy, onEdit, onSaveEdit, onCancelEdit }: { msg: Msg; lang: "en" | "bn"; emergencyStep: "idle" | "nearby" | "division_select" | "final"; onDivisionSelect?: (division: string) => void; editingMessageId: string | null; editText: string; setEditText: (value: string) => void; onCopy: () => void; onEdit: () => void; onSaveEdit: () => void; onCancelEdit: () => void; }) {
  if (msg.role === "user") {
    const isEditing = editingMessageId === msg.id;
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-md bg-primary text-primary-foreground">
          <div className="mb-2 text-xs font-medium text-primary-foreground/80">You</div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed select-text">{msg.content}</p>
          {isEditing && <div className="mt-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] text-primary-foreground">Editing in the input below.</div>}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-primary/20">
            <button type="button" onClick={onCopy} className="rounded-md p-1 hover:bg-primary/20">
              <Copy className="w-4 h-4" />
            </button>
            <button type="button" onClick={onEdit} className="rounded-md p-1 hover:bg-primary/20">
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!msg.content) return null;

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center">
        <img src={icon} alt="Maya" className="w-8 h-8" />
      </div>
      <div className="flex-1 space-y-3">
        {msg.emergency && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-sm">{tr("chat_emg_title", lang)}</div>
              <div className="text-xs opacity-90 mt-1">{tr("chat_emg_sub", lang)}</div>
            </div>
          </div>
        )}
        <div className="flex items-start justify-between gap-3 px-4 py-3 rounded-2xl rounded-bl-md bg-card border border-border">
  <div className="min-w-0">
    
    <div className="text-sm whitespace-pre-wrap leading-relaxed">
      {renderEmergencyContent(msg.content, onDivisionSelect)}
    </div>

    {msg.emergency && (
      <div className="mt-2 text-sm text-muted-foreground">
        {getFollowUpMessage(emergencyStep)}
      </div>
    )}

  </div>

  <button
    type="button"
    onClick={onCopy}
    className="rounded-md p-1 text-muted-foreground hover:bg-muted/10"
  >
    <Copy className="w-4 h-4" />
  </button>
</div>
        {msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {msg.sources.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary">
                <span className="font-medium">{s.source_org}</span>
                <span className="text-muted-foreground">·</span>
                <span>p.{s.page}</span>
                <span className="text-muted-foreground">·</span>
                <span>{s.pub_year}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center">
        <img src={icon} alt="Maya" className="w-8 h-8" />
      </div>
      <div className="px-4 py-4 rounded-2xl rounded-bl-md bg-card border border-border flex gap-1.5">
        <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
        <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
        <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
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


function SettingsDialog({ lang }: { lang: "en" | "bn" }) {
  const items: [string, string][] = [
    [tr("settings_voice", lang), tr("settings_voice_d", lang)],
    [tr("settings_wearable", lang), tr("settings_wearable_d", lang)],
    [tr("settings_risk", lang), tr("settings_risk_d", lang)],
    [tr("settings_multi", lang), tr("settings_multi_d", lang)],
    [tr("settings_offline", lang), tr("settings_offline_d", lang)],
  ];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm">
          <Settings className="w-4 h-4" />{tr("chat_settings", lang)}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tr("settings_title", lang)}</DialogTitle>
          <DialogDescription>{tr("settings_desc", lang)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2 text-sm">
          {items.map(([title, desc]) => (
            <div key={title} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <div>
                <div className="font-medium">{title}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
              <Badge variant="secondary" className="text-xs">{tr("settings_coming", lang)}</Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
