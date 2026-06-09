 //chat.ts
import { getDatabase, ref, set, get, remove, update } from "firebase/database";
import { app } from "@/lib/firebase";

const db = getDatabase(app);

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  emergency?: boolean;
  sources?: any[];
  reportId?: string;
};

export type Chat = {
  id: string;
  title: string;
  messages: Msg[];
  pinned?: boolean;
  archived?: boolean;
  createdAt: number;
  reportId?: string;    
  extractedText?: string; 
};

export type Report = {
  id: string;
  fileName: string;
  uploadedAt: string;
  week: number;
  summary: string;
};
export type HealthProfile = {
  onboardingComplete: boolean;
  age: number;
  heightCm: number;
  weightKg: number;
  bloodType: string | null;
  conditions: string[];
  //supplements: string[];
  isFirstPregnancy: boolean;
  previousLosses: boolean | null;
  previousCount: number;
  twinsOrMultiple: boolean | null;
  weeksAtOnboarding: number;
  onboardingDate: string;
  dueDate: string;
  lastNotificationDate?: string;

  notifications?: {
    medication?: boolean;
    appointment?: boolean;
  };
};

export type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration?: string | null;
  instructions?: string | null;
  source: "manual" | "prescription" | "onboarding";
  reportId?: string;
  addedAt: string;
  isDefault?: boolean;
};
export type KickLog = {
  timestamp: string;
  count: number;
};

export async function saveHealthProfile(uid: string, health: HealthProfile): Promise<void> {
  // Get current weight before overwriting
  const current = await get(ref(db, `users/${uid}/profile/health/weightKg`));
  const oldWeight = current.exists() ? current.val() : null;
  
  await set(ref(db, `users/${uid}/profile/health`), health);
  
  // Only add weight history if weight actually changed and we have a due date
  if (health.weightKg && health.dueDate && health.weightKg !== oldWeight) {
    const daysLeft = Math.ceil((new Date(health.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const week = Math.min(40, Math.max(1, 40 - Math.floor(daysLeft / 7)));
    
    const id = Date.now().toString();
    await set(ref(db, `users/${uid}/weightHistory/${id}`), {
      id,
      weight: health.weightKg,
      week,
      date: new Date().toISOString(),
      source: oldWeight === null ? "onboarding" : "manual"
    });
  }
}

export async function seedOnboardingWeight(uid: string, health: HealthProfile): Promise<void> {
  if (!health.weightKg || !health.dueDate) return;
  
  const snapshot = await get(ref(db, `users/${uid}/weightHistory`));
  if (snapshot.exists()) return; // already seeded
  
  const daysLeft = Math.ceil((new Date(health.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const week = Math.min(40, Math.max(1, 40 - Math.floor(daysLeft / 7)));
  
  const id = Date.now().toString();
  await set(ref(db, `users/${uid}/weightHistory/${id}`), {
    id,
    weight: health.weightKg,
    week,
    date: health.onboardingDate || new Date().toISOString(),
    source: "onboarding"
  });
}



export async function loadHealthProfile(uid: string): Promise<HealthProfile | null> {
  const snapshot = await get(ref(db, `users/${uid}/profile/health`));
  return snapshot.exists() ? snapshot.val() : null;
}

export async function checkOnboarding(uid: string): Promise<boolean> {
  const snapshot = await get(ref(db, `users/${uid}/profile/health/onboardingComplete`));
  return snapshot.exists() ? snapshot.val() === true : false;
}
export async function loadChats(uid: string): Promise<Chat[]> {
  const snapshot = await get(ref(db, `users/${uid}/chats`));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.values(data) as Chat[];
}

export async function saveChat(uid: string, chat: Chat): Promise<void> {
  await set(ref(db, `users/${uid}/chats/${chat.id}`), chat);
}

export async function deleteChat(uid: string, chatId: string): Promise<void> {
  await remove(ref(db, `users/${uid}/chats/${chatId}`));
}

export async function saveUserProfile(uid: string, name: string, email: string): Promise<void> {
  await update(ref(db, `users/${uid}/profile`), { name, email, uid }); // earlier it was calling set which overwrote the entire profile, now we use update to only change name and email
}
export async function saveUserWeek(uid: string, week: number): Promise<void> {
  await set(ref(db, `users/${uid}/profile/pregnancyWeek`), week);
}

export async function loadUserWeek(uid: string): Promise<number | null> {
  const snapshot = await get(ref(db, `users/${uid}/profile/pregnancyWeek`));
  return snapshot.exists() ? snapshot.val() : null;
}

export async function saveReport(uid: string, report: Report): Promise<void> {
  await update(ref(db, `users/${uid}/reports/${report.id}`), report);
}

export async function loadReports(uid: string): Promise<Report[]> {
  const snapshot = await get(ref(db, `users/${uid}/reports`));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.values(data) as Report[];
}

export async function deleteReport(uid: string, reportId: string): Promise<void> {
  await remove(ref(db, `users/${uid}/reports/${reportId}`));
}
export async function loadMedications(uid: string): Promise<Medication[]> {
  const snapshot = await get(ref(db, `users/${uid}/medications`));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.values(data) as Medication[];
}

export async function saveMedication(uid: string, med: Medication): Promise<void> {
  await set(ref(db, `users/${uid}/medications/${med.id}`), med);
}

export async function deleteMedication(uid: string, medId: string): Promise<void> {
  await remove(ref(db, `users/${uid}/medications/${medId}`));
}

export async function loadKicks(uid: string): Promise<KickLog[]> {
  const snapshot = await get(ref(db, `users/${uid}/kicks`));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.values(data) as KickLog[];
}

export async function saveKick(uid: string, kick: KickLog): Promise<void> {
  await set(ref(db, `users/${uid}/kicks/${kick.timestamp}`), kick);
}
// ── LAB VALUES ──────────────────────────────────────────────────

export type LabValueType = 
  | "weight" 
  | "bp_systolic" 
  | "bp_diastolic" 
  | "hb" 
  | "glucose" 
  | "tsh" 
  | "ferritin" 
  | "urine_protein";

export type LabValue = {
  id: string;
  reportId: string;
  type: LabValueType;
  value: number | string;
  unit: string;
  reportRange?: string | null;
  date: string;
  extractedAt: string;
};

export async function loadLabValues(uid: string): Promise<LabValue[]> {
  const snapshot = await get(ref(db, `users/${uid}/labValues`));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return (Object.values(data) as LabValue[]).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// ── WEIGHT HISTORY ──────────────────────────────────────────────

export type WeightEntry = {
  id: string;
  weight: number;
  week: number;
  date: string;
  source: "onboarding" | "manual" | "report";
  reportId?: string;
};

export async function loadWeightHistory(uid: string): Promise<WeightEntry[]> {
  const snapshot = await get(ref(db, `users/${uid}/weightHistory`));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return (Object.values(data) as WeightEntry[]).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export async function addWeightEntry(uid: string, entry: Omit<WeightEntry, "id">): Promise<void> {
  const id = Date.now().toString();
  await set(ref(db, `users/${uid}/weightHistory/${id}`), { ...entry, id });
  await update(ref(db, `users/${uid}/profile/health`), {
    weightKg: entry.weight,
    lastWeightUpdate: entry.date
  });
}

// ── APPOINTMENTS ────────────────────────────────────────────────

export type AppointmentType = 
  | "dating_scan" 
  | "anomaly_scan" 
  | "gtt" 
  | "gbs" 
  | "routine_checkup" 
  | "custom";

export type Appointment = {
  id: string;
  type: AppointmentType;
  title: string;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
  reminderDays: number[];
  status: "upcoming" | "completed" | "missed" | "dismissed";
  weekSuggested?: number;
  createdAt: string;
};

export const APPOINTMENT_TITLES: Record<AppointmentType, string> = {
  dating_scan: "Dating/Viability Scan",
  anomaly_scan: "Anomaly Scan",
  gtt: "Glucose Tolerance Test",
  gbs: "Group B Strep Swab",
  routine_checkup: "Routine Prenatal Checkup",
  custom: "Custom Appointment"
};

export const SUGGESTED_APPOINTMENTS: { type: AppointmentType; weekMin: number; weekMax: number }[] = [
  { type: "dating_scan", weekMin: 8, weekMax: 14 },
  { type: "anomaly_scan", weekMin: 18, weekMax: 22 },
  { type: "gtt", weekMin: 24, weekMax: 28 },
  { type: "gbs", weekMin: 35, weekMax: 37 },
];

export async function loadAppointments(uid: string): Promise<Appointment[]> {
  const snapshot = await get(ref(db, `users/${uid}/appointments`));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return (Object.values(data) as Appointment[]).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export async function saveAppointment(uid: string, appt: Omit<Appointment, "id" | "createdAt">): Promise<void> {
  const id = Date.now().toString();
  await set(ref(db, `users/${uid}/appointments/${id}`), { ...appt, id, createdAt: new Date().toISOString() });
}

export async function updateAppointment(uid: string, id: string, updates: Partial<Appointment>): Promise<void> {
  await update(ref(db, `users/${uid}/appointments/${id}`), updates);
}

export async function deleteAppointment(uid: string, id: string): Promise<void> {
  await remove(ref(db, `users/${uid}/appointments/${id}`));
}


export function getSuggestedAppointments(currentWeek: number, existingAppointments: Appointment[]): Appointment[] {
  const suggestions: Appointment[] = [];
  for (const sug of SUGGESTED_APPOINTMENTS) {
    if (currentWeek >= sug.weekMin && currentWeek <= sug.weekMax) {
      // If ANY appointment of this type exists (upcoming, completed, or dismissed), don't suggest
      const alreadyExists = existingAppointments.some(
        a => a.type === sug.type
      );
      if (!alreadyExists) {
        suggestions.push({
          id: `suggested_${sug.type}`,
          type: sug.type,
          title: APPOINTMENT_TITLES[sug.type],
          date: "",
          reminderDays: [7, 1], // default reminders 1 week and 1 day before
          status: "upcoming",
          weekSuggested: currentWeek,
          createdAt: new Date().toISOString()
        } as Appointment);
      }
    }
  }
  return suggestions;
}