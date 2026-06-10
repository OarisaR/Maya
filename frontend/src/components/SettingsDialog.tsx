// components/SettingsDialog.tsx
import { useEffect, useState } from "react";
import {
    Heart, Activity, Sun, Moon, Languages, Bell, Settings,
    User, FileHeart, Palette, Globe, BellRing, Baby, Plus, X, Pill
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { loadHealthProfile, saveHealthProfile, type HealthProfile } from "@/lib/chats";
import { tr } from "@/i18n/translations";
import { loadMedications, saveMedication, deleteMedication, type Medication } from "@/lib/chats";

type SettingsDialogProps = {
    lang: "en" | "bn";
    user: { uid: string; name: string; email: string };
    onLangChange: () => void;
};

type ViewType = "profile" | "health" | "theme" | "language" | "notifications";

export function SettingsDialog({ lang, user, onLangChange }: SettingsDialogProps) {
    const { theme, toggle: toggleTheme } = useTheme();
    const [activeView, setActiveView] = useState<ViewType>("profile");
    const [profile, setProfile] = useState<HealthProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [showAddMed, setShowAddMed] = useState(false);
    const [newMed, setNewMed] = useState({ name: "", dosage: "", frequency: "" });

    useEffect(() => {
        if ((activeView !== "health" && activeView !== "profile") || !user) return;
        setLoading(true);

        Promise.all([
            loadHealthProfile(user.uid),
            loadMedications(user.uid)
        ])
            .then(([p, meds]) => {
                setProfile(p);
                setMedications(meds);
            })
            .finally(() => setLoading(false));
    }, [activeView, user]);

    const handleSaveHealth = async () => {
        if (!profile || !user) return;
        setSaving(true);
        await saveHealthProfile(user.uid, profile);
        setSaving(false);
        toast(tr("settings_health_updated", lang));
    };

    const updateField = <K extends keyof HealthProfile>(key: K, value: HealthProfile[K]) => {
        setProfile(prev => prev ? { ...prev, [key]: value } : null);
    };

    const calcWeek = (dueDate: string) => {
        if (!dueDate) return null;
        const daysLeft = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const week = 40 - Math.floor(daysLeft / 7);
        return Math.min(40, Math.max(1, week));
    };

    const handleAddMed = async () => {
        if (!newMed.name || !user) return;
        const med: Medication = {
            id: crypto.randomUUID(),
            name: newMed.name,
            dosage: newMed.dosage,
            frequency: newMed.frequency,
            source: "manual",
            addedAt: new Date().toISOString(),
        };
        await saveMedication(user.uid, med);
        setMedications(prev => [...prev, med]);
        setNewMed({ name: "", dosage: "", frequency: "" });
        setShowAddMed(false);
    };

    const handleDeleteMed = async (medId: string) => {
        if (!user) return;
        await deleteMedication(user.uid, medId);
        setMedications(prev => prev.filter(m => m.id !== medId));
    };

    const trimester = (week: number) => {
        if (week <= 12) return tr("settings_trimester_1", lang);
        if (week <= 27) return tr("settings_trimester_2", lang);
        return tr("settings_trimester_3", lang);
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    };

    function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
        return (
            <button
                onClick={onChange}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 ${checked ? "bg-primary" : "bg-muted"}`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`}
                />
            </button>
        );
    }

    const menuItems: { id: ViewType; icon: React.ElementType; label: string }[] = [
        { id: "profile",       icon: User,    label: tr("settings_profile", lang) },
        { id: "health",        icon: FileHeart, label: tr("settings_health", lang) },
        { id: "theme",         icon: Palette, label: tr("settings_theme", lang) },
        { id: "language",      icon: Globe,   label: tr("settings_language", lang) },
        { id: "notifications", icon: BellRing, label: tr("settings_notifications", lang) },
    ];

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm">
                    <Settings className="w-4 h-4" />{tr("chat_settings", lang)}
                </button>
            </DialogTrigger>
            <DialogContent className="w-[680px] max-w-[90vw] h-[560px] max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border shrink-0">
                    <DialogTitle className="text-lg font-semibold">{tr("settings_title", lang)}</DialogTitle>
                </div>

                {/* Body: sidebar + content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar */}
                    <div className="w-[180px] border-r border-border gap-2 bg-muted/30 flex flex-col pt-3 shrink-0">
                        {menuItems.map(item => {
                            const Icon = item.icon;
                            const isActive = activeView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveView(item.id)}
                                    className={`flex items-center gap-4 px-4 py-2.5 mx-2 rounded-lg text-sm transition ${isActive
                                        ? "bg-primary/10 text-primary font-medium"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Content Area */}
                    <div className="flex-1 overflow-y-auto p-6">

                        {/* ── PROFILE ── */}
                        {activeView === "profile" && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold">{tr("settings_profile", lang)}</h3>

                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-xl font-semibold text-primary">
                                        {user.name[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-base">{user.name}</div>
                                        <div className="text-sm text-muted-foreground">{user.email}</div>
                                    </div>
                                </div>

                                {profile?.dueDate && (
                                    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Baby className="w-4 h-4 text-primary" />
                                            {tr("settings_pregnancy_journey", lang)}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-0.5">{tr("settings_current_week", lang)}</div>
                                                <div className="font-semibold text-base">
                                                    {tr("settings_week_label", lang).replace("{week}", String(calcWeek(profile.dueDate)))}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-0.5">{tr("settings_trimester", lang)}</div>
                                                <div className="font-semibold text-base">{trimester(calcWeek(profile.dueDate) || 1)}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-0.5">{tr("settings_due_date", lang)}</div>
                                                <div className="font-semibold">{formatDate(profile.dueDate)}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-0.5">{tr("settings_member_since", lang)}</div>
                                                <div className="font-semibold">{profile.onboardingDate ? formatDate(profile.onboardingDate) : "—"}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!profile?.dueDate && (
                                    <div className="text-sm text-muted-foreground">
                                        {tr("settings_complete_onboarding", lang)}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── HEALTH ── */}
                        {activeView === "health" && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold">{tr("settings_health", lang)}</h3>

                                {loading ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">{tr("settings_loading", lang)}</div>
                                ) : !profile ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                        {tr("settings_no_profile", lang)}
                                    </div>
                                ) : (
                                    <>
                                        {/* Age / Height / Weight row */}
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground block">{tr("settings_age", lang)}</label>
                                                <input
                                                    type="number"
                                                    min={10} max={60}
                                                    value={profile.age || ""}
                                                    onChange={e => updateField("age", Number(e.target.value))}
                                                    className="w-full h-9 px-3 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground block">{tr("settings_height_cm", lang)}</label>
                                                <input
                                                    type="number"
                                                    value={profile.heightCm || ""}
                                                    onChange={e => updateField("heightCm", Number(e.target.value))}
                                                    className="w-full h-9 px-3 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground block">{tr("settings_weight_kg", lang)}</label>
                                                <input
                                                    type="number"
                                                    value={profile.weightKg || ""}
                                                    onChange={e => updateField("weightKg", Number(e.target.value))}
                                                    className="w-full h-9 px-3 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Due Date */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground block">{tr("settings_due_date_label", lang)}</label>
                                            <input
                                                type="date"
                                                value={profile.dueDate || ""}
                                                onChange={e => updateField("dueDate", e.target.value)}
                                                className="w-full h-9 px-3 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 text-sm"
                                            />
                                            {profile.dueDate && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {tr("settings_week_of_40", lang).replace("{week}", String(calcWeek(profile.dueDate)))}
                                                </p>
                                            )}
                                        </div>

                                        {/* Blood Type */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground block">{tr("settings_blood_type", lang)}</label>
                                            <select
                                                value={profile.bloodType || ""}
                                                onChange={e => updateField("bloodType", e.target.value || null)}
                                                className="w-full h-9 px-3 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 appearance-none cursor-pointer text-sm"
                                            >
                                                <option value="">{tr("settings_blood_type_select", lang)}</option>
                                                {["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"].map(bt => (
                                                    <option key={bt} value={bt}>{bt}</option>
                                                ))}
                                                <option value="I don't know">{tr("settings_blood_type_unknown", lang)}</option>
                                            </select>
                                        </div>

                                        {/* First Pregnancy */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground block">{tr("settings_first_pregnancy", lang)}</label>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => updateField("isFirstPregnancy", true)}
                                                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${profile.isFirstPregnancy ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent/40"}`}
                                                >
                                                    {tr("settings_yes", lang)}
                                                </button>
                                                <button
                                                    onClick={() => updateField("isFirstPregnancy", false)}
                                                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${!profile.isFirstPregnancy ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent/40"}`}
                                                >
                                                    {tr("settings_no", lang)}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Previous losses */}
                                        {!profile.isFirstPregnancy && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground block">{tr("settings_previous_losses", lang)}</label>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => updateField("previousLosses", true)}
                                                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${profile.previousLosses ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent/40"}`}
                                                    >
                                                        {tr("settings_yes", lang)}
                                                    </button>
                                                    <button
                                                        onClick={() => updateField("previousLosses", false)}
                                                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${profile.previousLosses === false ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent/40"}`}
                                                    >
                                                        {tr("settings_no", lang)}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Conditions */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-medium text-muted-foreground block">{tr("settings_conditions", lang)}</label>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { id: "diabetes",     label: tr("settings_cond_diabetes", lang) },
                                                    { id: "hypertension", label: tr("settings_cond_hypertension", lang) },
                                                    { id: "thyroid",      label: tr("settings_cond_thyroid", lang) },
                                                    { id: "anaemia",      label: tr("settings_cond_anaemia", lang) },
                                                ].map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => {
                                                            const currentConditions = profile.conditions || [];
                                                            const updated = currentConditions.includes(c.id)
                                                                ? currentConditions.filter(x => x !== c.id)
                                                                : [...currentConditions, c.id];
                                                            updateField("conditions", updated);
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg border text-sm transition ${(profile.conditions || []).includes(c.id) ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent/40"}`}
                                                    >
                                                        {c.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Medications */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-medium text-muted-foreground block">{tr("settings_medications", lang)}</label>

                                            {medications.length === 0 ? (
                                                <div className="text-sm text-muted-foreground py-2">{tr("settings_no_medications", lang)}</div>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {medications.map(med => (
                                                        <div key={med.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-card">
                                                            <div>
                                                                <div className="text-sm font-medium">{med.name}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {med.dosage} · {med.frequency}
                                                                    {med.source === "prescription" && (
                                                                        <span className="ml-1 text-primary">· {tr("settings_from_prescription", lang)}</span>
                                                                    )}
                                                                    {med.source === "onboarding" && (
                                                                        <span className="ml-1 text-muted-foreground">· {tr("settings_default", lang)}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {med.source !== "prescription" && (
                                                                <button
                                                                    onClick={() => handleDeleteMed(med.id)}
                                                                    className="p-1 rounded hover:bg-destructive/10 text-destructive"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {showAddMed ? (
                                                <div className="space-y-2 p-3 rounded-lg border border-border bg-card">
                                                    <input
                                                        placeholder={tr("settings_med_name_ph", lang)}
                                                        value={newMed.name}
                                                        onChange={e => setNewMed({ ...newMed, name: e.target.value })}
                                                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
                                                    />
                                                    <input
                                                        placeholder={tr("settings_med_dosage_ph", lang)}
                                                        value={newMed.dosage}
                                                        onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
                                                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
                                                    />
                                                    <input
                                                        placeholder={tr("settings_med_freq_ph", lang)}
                                                        value={newMed.frequency}
                                                        onChange={e => setNewMed({ ...newMed, frequency: e.target.value })}
                                                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={handleAddMed} className="flex-1 rounded-lg">{tr("settings_add_med", lang)}</Button>
                                                        <Button size="sm" variant="outline" onClick={() => setShowAddMed(false)} className="flex-1 rounded-lg">{tr("settings_cancel", lang)}</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Button variant="outline" size="sm" onClick={() => setShowAddMed(true)} className="w-full rounded-lg">
                                                    <Plus className="w-4 h-4 mr-1" /> {tr("settings_add_medication", lang)}
                                                </Button>
                                            )}
                                        </div>

                                        {/* Twins */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground block">{tr("settings_twins", lang)}</label>
                                            <select
                                                value={profile.twinsOrMultiple === null ? "notsure" : profile.twinsOrMultiple ? "yes" : "no"}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    updateField("twinsOrMultiple", val === "notsure" ? null : val === "yes");
                                                }}
                                                className="w-full h-9 px-3 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 appearance-none cursor-pointer text-sm"
                                            >
                                                <option value="yes">{tr("settings_twins_yes", lang)}</option>
                                                <option value="no">{tr("settings_twins_no", lang)}</option>
                                                <option value="notsure">{tr("settings_twins_notsure", lang)}</option>
                                            </select>
                                        </div>

                                        <Button onClick={handleSaveHealth} disabled={saving} className="w-full rounded-lg h-10 mt-2">
                                            {saving ? tr("settings_saving", lang) : tr("settings_save_changes", lang)}
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── THEME ── */}
                        {activeView === "theme" && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold">{tr("settings_theme", lang)}</h3>
                                <div className="flex items-center justify-between py-3 border-b border-border">
                                    <div>
                                        <div className="font-medium text-sm">{tr("settings_dark_mode", lang)}</div>
                                        <div className="text-xs text-muted-foreground">{tr("settings_dark_mode_desc", lang)}</div>
                                    </div>
                                    <ToggleSwitch checked={theme === "dark"} onChange={toggleTheme} />
                                </div>
                            </div>
                        )}

                        {/* ── LANGUAGE ── */}
                        {activeView === "language" && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold">{tr("settings_language", lang)}</h3>
                                <div className="flex items-center justify-between py-3 border-b border-border">
                                    <div>
                                        <div className="font-medium text-sm">{tr("settings_lang_bengali", lang)}</div>
                                        <div className="text-xs text-muted-foreground">{tr("settings_lang_bengali_desc", lang)}</div>
                                    </div>
                                    <ToggleSwitch checked={lang === "bn"} onChange={onLangChange} />
                                </div>
                            </div>
                        )}

                        {/* ── NOTIFICATIONS ── */}
                        {activeView === "notifications" && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold">{tr("settings_notifications", lang)}</h3>
                                <div className="space-y-4">
                                    {[
                                        {
                                            id: "medication",
                                            label: tr("settings_notif_medication", lang),
                                            desc: tr("settings_notif_medication_d", lang),
                                            checked: profile?.notifications?.medication ?? true
                                        },
                                        {
                                            id: "appointment",
                                            label: tr("settings_notif_appointment", lang),
                                            desc: tr("settings_notif_appointment_d", lang),
                                            checked: profile?.notifications?.appointment ?? true
                                        },
                                    ].map(item => (
                                        <div key={item.id} className="flex items-center justify-between py-3 border-b border-border">
                                            <div>
                                                <div className="font-medium text-sm">{item.label}</div>
                                                <div className="text-xs text-muted-foreground">{item.desc}</div>
                                            </div>
                                            <ToggleSwitch
                                                checked={item.checked}
                                                onChange={() => {
                                                    const current = profile?.notifications || { medication: true, appointment: true };
                                                    updateField("notifications", {
                                                        ...current,
                                                        [item.id]: !current[item.id as keyof typeof current]
                                                    });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    onClick={handleSaveHealth}
                                    disabled={saving}
                                    className="w-full rounded-lg h-10 mt-2"
                                >
                                    {saving ? tr("settings_saving", lang) : tr("settings_save_changes", lang)}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}