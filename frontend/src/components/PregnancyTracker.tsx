"use client";

import { useEffect, useState } from "react";
import { Baby, Heart, Activity, Calendar, Scale, FlaskConical, ChevronRight, Plus, Check, X, MapPin, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { 
  loadHealthProfile, 
  loadLabValues, 
  loadWeightHistory, 
    loadAppointments,
  saveAppointment,
  updateAppointment,
  getSuggestedAppointments,
  type HealthProfile, 
  type LabValue,
  type WeightEntry,
  type Appointment,
  APPOINTMENT_TITLES
} from "@/lib/chats";
import { tr } from "@/i18n/translations";

export type TrackerProps = {
  week: number;
  setWeek: (w: number) => void;
  lang: "en" | "bn";
  user: { uid: string; name: string };
  defaultTab?: PanelType;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  trigger?: React.ReactNode;  // ← ADD
};

export type PanelType = "overview" | "health" | "appointments";

// ── BABY SIZE DATA WITH CUTE ICONS ──────────────────────────────

type SizeInfo = {
  size: string;
  highlight: string;
  icon: string; // Emoji or lucide icon name
  iconType: "emoji" | "lucide";
  color: string; // Tailwind color class for the background
};

const WEEKLY_INFO: Record<number, SizeInfo> = {
  4:  { size: "Poppy seed", highlight: "Amniotic sac forming", icon: "✨", iconType: "emoji", color: "bg-yellow-100 text-yellow-700" },
  5:  { size: "Sesame seed", highlight: "Brain & spinal cord forming", icon: "✨", iconType: "emoji", color: "bg-yellow-100 text-yellow-700" },
  6:  { size: "Pea", highlight: "Heartbeat may be detectable", icon: "🟢", iconType: "emoji", color: "bg-green-100 text-green-700" },
  7:  { size: "Grape", highlight: "Take your folic acid", icon: "🍇", iconType: "emoji", color: "bg-purple-100 text-purple-700" },
  8:  { size: "Raspberry", highlight: "Now called a 'foetus'", icon: "🍓", iconType: "emoji", color: "bg-red-100 text-red-700" },
  9:  { size: "Strawberry", highlight: "Genitals forming", icon: "🍓", iconType: "emoji", color: "bg-red-100 text-red-700" },
  10: { size: "Apricot", highlight: "Heart beating 180bpm", icon: "🍑", iconType: "emoji", color: "bg-orange-100 text-orange-700" },
  11: { size: "Fig", highlight: "Fingernails forming", icon: "🫐", iconType: "emoji", color: "bg-indigo-100 text-indigo-700" },
  12: { size: "Plum", highlight: "Heartbeat detectable on scan", icon: "🍑", iconType: "emoji", color: "bg-purple-100 text-purple-700" },
  13: { size: "Peach", highlight: "Sucking thumb, developing reflex", icon: "🍑", iconType: "emoji", color: "bg-orange-100 text-orange-700" },
  14: { size: "Kiwi", highlight: "Having first wee", icon: "🥝", iconType: "emoji", color: "bg-green-100 text-green-700" },
  15: { size: "Apple", highlight: "Baby can hear your voice", icon: "🍎", iconType: "emoji", color: "bg-red-100 text-red-700" },
  16: { size: "Avocado", highlight: "Pulling faces, moving arms", icon: "🥑", iconType: "emoji", color: "bg-green-100 text-green-700" },
  17: { size: "Pomegranate", highlight: "Fingerprints forming", icon: "🍎", iconType: "emoji", color: "bg-red-100 text-red-700" },
  18: { size: "Bell pepper", highlight: "Swallowing & sucking reflexes", icon: "🫑", iconType: "emoji", color: "bg-green-100 text-green-700" },
  19: { size: "Tomato", highlight: "Adult teeth growing", icon: "🍅", iconType: "emoji", color: "bg-red-100 text-red-700" },
  20: { size: "Banana", highlight: "You may feel kicking now", icon: "🍌", iconType: "emoji", color: "bg-yellow-100 text-yellow-700" },
  21: { size: "Carrot", highlight: "Sing to your bump — baby can hear", icon: "🥕", iconType: "emoji", color: "bg-orange-100 text-orange-700" },
  22: { size: "Sweet potato", highlight: "Lungs developing", icon: "🍠", iconType: "emoji", color: "bg-orange-100 text-orange-700" },
  23: { size: "Mango", highlight: "Learn your baby's kick rhythms", icon: "🥭", iconType: "emoji", color: "bg-yellow-100 text-yellow-700" },
  24: { size: "Corn on the cob", highlight: "Viable if born now", icon: "🌽", iconType: "emoji", color: "bg-yellow-100 text-yellow-700" },
  25: { size: "Courgette", highlight: "Jumping at loud noises", icon: "🥒", iconType: "emoji", color: "bg-green-100 text-green-700" },
  26: { size: "Cucumber", highlight: "Eyes opening, learning to blink", icon: "🥒", iconType: "emoji", color: "bg-green-100 text-green-700" },
  27: { size: "Cauliflower", highlight: "Lungs capable of breathing", icon: "⚪", iconType: "emoji", color: "bg-gray-100 text-gray-700" },
  28: { size: "Aubergine", highlight: "Heart rate ~140bpm", icon: "🍆", iconType: "emoji", color: "bg-purple-100 text-purple-700" },
  29: { size: "Butternut squash", highlight: "Perfectly formed, maturing", icon: "🎃", iconType: "emoji", color: "bg-orange-100 text-orange-700" },
  30: { size: "Cabbage", highlight: "Eyes can focus on your face", icon: "🥬", iconType: "emoji", color: "bg-green-100 text-green-700" },
  31: { size: "Coconut", highlight: "Recognising voices outside", icon: "🥥", iconType: "emoji", color: "bg-stone-100 text-stone-700" },
  32: { size: "Celery", highlight: "Putting on weight", icon: "🥬", iconType: "emoji", color: "bg-green-100 text-green-700" },
  33: { size: "Pineapple", highlight: "Brain fully developed", icon: "🍍", iconType: "emoji", color: "bg-yellow-100 text-yellow-700" },
  34: { size: "Cantaloupe melon", highlight: "Getting cramped, less space", icon: "🍈", iconType: "emoji", color: "bg-green-100 text-green-700" },
  35: { size: "Honeydew melon", highlight: "If movements stop, call doctor", icon: "🍈", iconType: "emoji", color: "bg-green-100 text-green-700" },
  36: { size: "Romaine lettuce", highlight: "Lungs mature, ready to suck", icon: "🥬", iconType: "emoji", color: "bg-green-100 text-green-700" },
  37: { size: "Leek", highlight: "Trying facial expressions", icon: "🥬", iconType: "emoji", color: "bg-green-100 text-green-700" },
  38: { size: "Rhubarb", highlight: "Storing first poo (meconium)", icon: "🥬", iconType: "emoji", color: "bg-red-100 text-red-700" },
  39: { size: "Watermelon", highlight: "Skin more solid, ready", icon: "🍉", iconType: "emoji", color: "bg-red-100 text-red-700" },
  40: { size: "Pumpkin", highlight: "Movements must not stop", icon: "🎃", iconType: "emoji", color: "bg-orange-100 text-orange-700" },
  41: { size: "Pumpkin", highlight: "Overdue — skin may be red", icon: "🎃", iconType: "emoji", color: "bg-orange-100 text-orange-700" },
};

function getWeeklyInfo(week: number): SizeInfo {
  const weeks = Object.keys(WEEKLY_INFO).map(Number).sort((a, b) => b - a);
  const matched = weeks.find(w => week >= w) || 4;
  return WEEKLY_INFO[matched];
}

// ── BABY SIZE ICON COMPONENT ───────────────────────────────────

function BabySizeIcon({ week, className = "" }: { week: number; className?: string }) {
  const info = getWeeklyInfo(week);
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <div className={`w-16 h-16 rounded-2xl ${info.color} flex items-center justify-center text-3xl shadow-sm ring-1 ring-black/5`}>
        {info.icon}
      </div>
    </div>
  );
}

function calcDaysLeft(dueDate: string): number {
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function calcTrimester(week: number): string {
  if (week <= 12) return "First trimester";
  if (week <= 27) return "Second trimester";
  return "Third trimester";
}

function calcBMI(heightCm: number, weightKg: number): number {
  return Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10;
}

function bmiStatus(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Underweight", color: "text-yellow-500" };
  if (bmi < 25) return { label: "Normal", color: "text-green-500" };
  if (bmi < 30) return { label: "Overweight", color: "text-orange-500" };
  return { label: "Obese", color: "text-red-500" };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function calcWeekFromDate(date: string, dueDate: string): number {
  const d = new Date(date);
  const due = new Date(dueDate);
  const daysLeft = Math.ceil((due.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(40, Math.max(1, 40 - Math.floor(daysLeft / 7)));
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const SIDEBAR_ITEMS: { id: PanelType; icon: React.ElementType; label: string }[] = [
  { id: "overview", icon: Activity, label: "Overview" },
  { id: "health", icon: Heart, label: "Health" },
  { id: "appointments", icon: Calendar, label: "Appointments" },
];

// ── OVERVIEW PANEL ──────────────────────────────────────────────

function OverviewPanel({ week, profile, weightHistory, labValues }: {
  week: number;
  profile: HealthProfile | null;
  weightHistory: WeightEntry[];
  labValues: LabValue[];
}) {
  const info = getWeeklyInfo(week);
  const trimester = calcTrimester(week);
  const daysLeft = profile?.dueDate ? calcDaysLeft(profile.dueDate) : null;
  const progress = Math.min(100, (week / 40) * 100);

  const latestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : profile?.weightKg;
  const bmi = profile?.heightCm && latestWeight 
    ? calcBMI(profile.heightCm, latestWeight) 
    : null;
  const latestHb = labValues.find(v => v.type === "hb");

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Overview</h3>
      
      {/* Progress Card with Cute Icon */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Week {week} of 40</div>
            <div className="text-2xl font-semibold mt-1">{trimester}</div>
          </div>
          <BabySizeIcon week={week} />
        </div>

        <div className="flex items-center gap-3">
          <Baby className="w-5 h-5 text-primary" />
          <div className="text-sm">
            Baby is about the size of a <span className="font-semibold text-primary">{info.size}</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground italic bg-muted/50 rounded-lg px-3 py-2">
          "{info.highlight}"
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500" 
            style={{ width: `${progress}%` }} 
          />
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{daysLeft ? `${daysLeft} days left` : "Due date not set"}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>

      {/* Quick Stats */}
      {profile && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted/40 p-3 text-center">
            <Scale className="w-4 h-4 mx-auto mb-1 text-primary" />
            <div className="text-lg font-semibold">{latestWeight || "—"}</div>
            <div className="text-xs text-muted-foreground">kg</div>
          </div>
          <div className="rounded-xl bg-muted/40 p-3 text-center">
           
            <div className="text-xs text-muted-foreground mb-0.5">BMI</div>
            <div className={`text-lg font-semibold ${bmi ? bmiStatus(bmi).color : ""}`}>
              {bmi || "—"}
            </div>
            {bmi && <div className="text-[10px] text-muted-foreground">{bmiStatus(bmi).label}</div>}
          </div>
          <div className="rounded-xl bg-muted/40 p-3 text-center">
            <FlaskConical className="w-4 h-4 mx-auto mb-1 text-primary" />
            <div className="text-lg font-semibold">{latestHb ? `${latestHb.value}` : "—"}</div>
            <div className="text-xs text-muted-foreground">Hb</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HEALTH PANEL ──────────────────────────────────────────────

function HealthPanel({ profile, weightHistory, labValues, week }: {
  profile: HealthProfile | null;
  weightHistory: WeightEntry[];
  labValues: LabValue[];
  week: number;
}) {
  const bmi = profile?.heightCm && profile?.weightKg 
    ? calcBMI(profile.heightCm, profile.weightKg) 
    : null;

  const weightHistoryWithWeek = profile?.dueDate 
    ? weightHistory.map(e => ({
        ...e,
        week: calcWeekFromDate(e.date, profile.dueDate)
      }))
    : weightHistory.map(e => ({ ...e, week }));

  const TYPE_LABELS: Record<string, string> = {
    weight: "Weight",
    // bp_systolic: "BP (Systolic)",
    // bp_diastolic: "BP (Diastolic)",
    hb: "Haemoglobin",
    glucose: "Fasting Glucose",
    tsh: "TSH",
    ferritin: "Serum Ferritin",
    urine_protein: "Urine Protein"
  };
  const latestByType = Object.values(
  labValues.reduce((acc, val) => {
    if (!acc[val.type] || new Date(val.date) > new Date(acc[val.type].date)) {
      acc[val.type] = val;
    }
    return acc;
  }, {} as Record<string, LabValue>)
).filter(v => v.type !== "weight")
 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Health</h3>

      {/* Health Snapshot */}
      {profile && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Heart className="w-4 h-4 text-primary" />
            Health Snapshot
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">BMI</div>
              <div className={`text-lg font-semibold ${bmi ? bmiStatus(bmi).color : ""}`}>
                {bmi || "—"}
              </div>
              {bmi && <div className="text-xs text-muted-foreground">{bmiStatus(bmi).label}</div>}
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Weight</div>
              <div className="text-lg font-semibold">{profile.weightKg || "—"} kg</div>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Blood Type</div>
              <div className="text-lg font-semibold">{profile.bloodType || "—"}</div>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Due Date</div>
              <div className="text-sm font-semibold">{profile.dueDate ? formatDate(profile.dueDate) : "—"}</div>
            </div>
          </div>

          {profile.conditions && profile.conditions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.conditions.map(c => (
                <Badge key={c} variant="secondary" className="text-xs">
                  {c === "diabetes" ? "Gestational diabetes" :
                   c === "hypertension" ? "High blood pressure" :
                   c === "thyroid" ? "Thyroid disorder" :
                   c === "anaemia" ? "Anaemia" : c}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weight Chart */}
      {weightHistory.length > 1 ? (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Scale className="w-4 h-4 text-primary" />
            Weight Gain
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightHistoryWithWeek} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 220 / 0.15)" />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 11 }} 
                  tickFormatter={(w) => `W${w}`}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value} kg`, "Weight"]}
                  labelFormatter={(w: number) => `Week ${w}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="oklch(0.5 0.15 220)" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Starting weight</div>
              <div className="font-semibold">{weightHistory[0]?.weight} kg</div>
              <div className="text-xs text-muted-foreground">Week {weightHistory[0]?.week}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Current</div>
              <div className="font-semibold">{profile?.weightKg} kg</div>
              <div className="text-xs text-muted-foreground">Week {week}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Scale className="w-4 h-4 text-primary" />
            Weight Gain
          </div>
          <p className="text-sm text-muted-foreground">
            {weightHistory.length === 1 
              ? `One weight recorded: ${weightHistory[0].weight} kg at week ${weightHistory[0].week}. Update your weight in settings or upload a report to see a chart.`
              : "No weight data yet. Update your weight in settings or upload a report."}
          </p>
        </div>
      )}

      {/* Lab Results */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FlaskConical className="w-4 h-4 text-primary" />
          Lab Results
        </div>
        {labValues.length > 0 ? (
          <div className="space-y-3">
            {latestByType.map((val) => (
              <div key={val.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <div className="text-sm font-medium">{TYPE_LABELS[val.type] || val.type}</div>
                  {val.reportRange && (
                    <div className="text-xs text-muted-foreground">Range: {val.reportRange}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {val.type === "urine_protein" ? val.value : `${val.value} ${val.unit}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(val.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No lab values yet. Upload a medical report to see results.</p>
        )}
      </div>
    </div>
  );
}

// ── APPOINTMENTS PANEL ────────────────────────────────────────

function AppointmentsPanel({ appointments, suggestions, week, uid, onUpdate }: {
  appointments: Appointment[];
  suggestions: Appointment[];
  week: number;
  uid: string;
  onUpdate: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("routine_checkup");
  const [customTitle, setCustomTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [dismissedLocally, setDismissedLocally] = useState<string[]>([]);

  const now = new Date().toISOString().split("T")[0];
  const allUpcoming = appointments.filter(a => a.status === "upcoming");
  const trulyUpcoming = allUpcoming.filter(a => a.date >= now);
  const missed = allUpcoming.filter(a => a.date < now);
  const completed = appointments.filter(a => a.status === "completed");
  const visibleSuggestions = suggestions.filter(s => !dismissedLocally.includes(s.id));

  const handleDismiss = async (sug: Appointment) => {
    setDismissedLocally(prev => [...prev, sug.id]);
    await saveAppointment(uid, {
      ...sug,
      status: "dismissed",
      date: new Date().toISOString(),
    });
    onUpdate();
  };

  const handleAdd = async () => {
  if (!date) return;
  const title = selectedType === "custom" ? customTitle : APPOINTMENT_TITLES[selectedType as keyof typeof APPOINTMENT_TITLES];
  if (!title) return;

  await saveAppointment(uid, {
    type: selectedType as any,
    title,
    date,
    time: time || "",
    location: location || "",
    reminderDays: [7, 1],
    status: "upcoming",
  });

  setShowAdd(false);
  setCustomTitle("");
  setDate("");
  setTime("");
  setLocation("");
  onUpdate();
};

  const handleComplete = async (id: string) => {
    await updateAppointment(uid, id, { status: "completed" });
    onUpdate();
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Appointments</h3>

      {/* Add Button */}
      <Button onClick={() => setShowAdd(true)} className="w-full">
        <Plus className="w-4 h-4 mr-2" /> Add Appointment
      </Button>

      {/* Add Dialog */}
      {showAdd && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Add Appointment</div>
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Type</Label>
              <select 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="routine_checkup">Routine Prenatal Checkup</option>
                <option value="dating_scan">Dating/Viability Scan</option>
                <option value="anomaly_scan">Anomaly Scan</option>
                <option value="gtt">Glucose Tolerance Test</option>
                <option value="gbs">Group B Strep Swab</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {selectedType === "custom" && (
              <div className="space-y-2">
                <Label className="text-xs">Title</Label>
                <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="e.g., Dental checkup" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Time (optional)</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Location (optional)</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., City Hospital" />
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={!date}>
              Save Appointment
            </Button>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {visibleSuggestions.map((sug) => (
        <div key={sug.id} className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
          <div className="text-sm font-medium">{sug.title}</div>
          <div className="text-xs text-muted-foreground">Recommended at {sug.weekSuggested} weeks</div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => {
              setSelectedType(sug.type);
              setShowAdd(true);
            }}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDismiss(sug)}>
              <X className="w-3 h-3 mr-1" /> Dismiss
            </Button>
          </div>
        </div>
      ))}

      {/* Upcoming */}
      {trulyUpcoming.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium">Upcoming</div>
          {trulyUpcoming.map((a) => (
            <div key={a.id} className="rounded-xl bg-muted/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{a.title}</div>
                <Button variant="ghost" size="sm" className="h-7" onClick={() => handleComplete(a.id)}>
                  <Check className="w-3 h-3 mr-1" /> Done
                </Button>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(a.date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                </span>
                {a.time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {a.time}
                  </span>
                )}
              </div>
              {a.location && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {a.location}
                </span>
              )}
              <div className="text-xs font-medium">
                {daysUntil(a.date) > 0 
                  ? `In ${daysUntil(a.date)} days` 
                  : daysUntil(a.date) === 0 
                    ? "Today" 
                    : "Overdue"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Missed */}
      {missed.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-red-400">Missed</div>
          {missed.map((a) => (
            <div key={a.id} className="rounded-xl bg-red-500/5 border border-red-500/10 p-4 space-y-2 opacity-70">
              <div className="flex items-center justify-between">
                <div className="font-medium text-red-300">{a.title}</div>
                <Button variant="ghost" size="sm" className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleComplete(a.id)}>
                  <Check className="w-3 h-3 mr-1" /> Mark Done
                </Button>
              </div>
              <div className="flex items-center gap-4 text-sm text-red-300/60">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(a.date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                </span>
                {a.time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {a.time}
                  </span>
                )}
              </div>
              {a.location && (
                <span className="flex items-center gap-1 text-sm text-red-300/60">
                  <MapPin className="w-3 h-3" />
                  {a.location}
                </span>
              )}
              <div className="text-xs font-medium text-red-400/60">
                {Math.abs(daysUntil(a.date))} days overdue
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">Completed</div>
          {completed.slice(0, 3).map((a) => (
            <div key={a.id} className="rounded-xl bg-muted/20 p-3 flex items-center justify-between opacity-60">
              <div className="text-sm">{a.title}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
          ))}
        </div>
      )}

      {!suggestions.length && !trulyUpcoming.length && !missed.length && !completed.length && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No appointments yet. Add one or upload a report.
        </p>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────

export function PregnancyTracker({ week, setWeek, lang, user, defaultTab, open, onOpenChange, trigger 
}: TrackerProps) {
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [labValues, setLabValues] = useState<LabValue[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activePanel, setActivePanel] = useState<PanelType>(defaultTab || "overview");


  useEffect(() => {
    if (defaultTab) setActivePanel(defaultTab);
  }, [defaultTab]);
  const loadData = async () => {
    if (!user) return;

    const [p, lv, wh, appts] = await Promise.all([
      loadHealthProfile(user.uid),
      loadLabValues(user.uid),
      loadWeightHistory(user.uid),
      loadAppointments(user.uid)
    ]);

    setProfile(p);
    setLabValues(lv);
    setWeightHistory(wh);
    setAppointments(appts);
  };

  useEffect(() => {
    if (open) loadData();
  }, [open, user]);

  const suggestions = getSuggestedAppointments(week, appointments);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {/* <DialogTrigger asChild>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm">
          <Activity className="w-4 h-4" />
          <span className="flex-1 text-left">{tr("pdlg_title", lang)}</span>
          <span className="text-xs text-muted-foreground">W{week}</span>
        </button>
      </DialogTrigger> */}

      <DialogContent className="w-[680px] max-w-[90vw] h-[560px] max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              Tracker
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-[180px] border-r border-border gap-2 bg-muted/30 flex flex-col pt-3 shrink-0">
            <nav className="flex-1 p-2 space-y-1">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activePanel === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePanel(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {item.id === "appointments" && appointments.filter(a => a.status === "upcoming").length > 0 && (
                      <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                        {appointments.filter(a => a.status === "upcoming").length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-border text-xs text-muted-foreground">
              Week {week} of 40
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activePanel === "overview" && (
              <OverviewPanel 
                week={week} 
                profile={profile} 
                weightHistory={weightHistory}
                labValues={labValues}
              />
            )}
            {activePanel === "health" && (
              <HealthPanel 
                profile={profile}
                weightHistory={weightHistory}
                labValues={labValues}
                week={week}
              />
            )}
            {activePanel === "appointments" && (
              <AppointmentsPanel 
                appointments={appointments}
                suggestions={suggestions}
                week={week}
                uid={user.uid}
                onUpdate={loadData}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}