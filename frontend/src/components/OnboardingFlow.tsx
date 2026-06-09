import { useEffect, useRef, useState } from "react";
import { Baby, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveHealthProfile, saveUserWeek, saveMedication, type HealthProfile, type Medication, seedOnboardingWeight } from "@/lib/chats";
import icon from "@/assets/icon.svg";

type Props = {
  user: { uid: string; name: string };
  onComplete: () => void;
};

type Direction = "forward" | "backward";

const CONDITIONS = [
  { id: "diabetes", label: "Gestational diabetes" },
  { id: "hypertension", label: "High blood pressure" },
  { id: "thyroid", label: "Thyroid disorder" },
  { id: "anaemia", label: "Anaemia" },
  { id: "none", label: "None of the above" },
];

const SUPPLEMENTS = [
  { id: "folicAcid", label: "Folic acid" },
  { id: "iron", label: "Iron" },
  { id: "calcium", label: "Calcium" },
  { id: "vitaminD", label: "Vitamin D" },
  { id: "none", label: "None" },
];

const BLOOD_TYPES = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−", "I don't know"];

function calcDueDate(week: number): string {
  const today = new Date();
  const daysLeft = (40 - week) * 7;
  const due = new Date(today.getTime() + daysLeft * 86400000);
  return due.toISOString().split("T")[0];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export function OnboardingFlow({ user, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<Direction>("forward");
  const [visible, setVisible] = useState(true);
  const [saving, setSaving] = useState(false);

  // form state
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [twins, setTwins] = useState<"yes" | "no" | "notsure" | null>(null);
  const [week, setWeek] = useState<number>(20);
  const [dueDate, setDueDate] = useState<string>("");
  const [dueDateConfirmed, setDueDateConfirmed] = useState(false);
  const [isFirst, setIsFirst] = useState<boolean | null>(null);
  const [prevLosses, setPrevLosses] = useState<boolean | null>(null);
  const [prevCount, setPrevCount] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [supplements, setSupplements] = useState<string[]>([]);
  const [bloodType, setBloodType] = useState<string | null>(null);

  // welcome typing effect
  const firstName = user.name.split(" ")[0];

  const welcomeWords = `Hi ${firstName}. I'm Maya. Let's get to know you a little.`.split(" ");
  const [visibleWords, setVisibleWords] = useState(0);

  useEffect(() => {
    if (step !== 0) return;
    if (visibleWords >= welcomeWords.length) return;

    const wordDelay = 180; // ms between each word fading in
    const t = setTimeout(() => setVisibleWords(v => v + 1), wordDelay);
    return () => clearTimeout(t);
  }, [step, visibleWords, welcomeWords.length]);

  const isWelcomeComplete = visibleWords >= welcomeWords.length;

  // auto-calculate due date when week changes
  useEffect(() => {
    setDueDate(calcDueDate(week));
    setDueDateConfirmed(false);
  }, [week]);

  // input auto-focus
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      (inputRef.current as HTMLInputElement | null)?.focus();
    }, 320);
    return () => clearTimeout(t);
  }, [step]);

  const TOTAL_STEPS = 10;

  const goTo = (next: number, dir: Direction) => {
    setDirection(dir);
    setVisible(false);
    setTimeout(() => {
      setStep(next);
      setVisible(true);
    }, 220);
  };

  const next = () => goTo(step + 1, "forward");
  const back = () => { if (step > 1) goTo(step - 1, "backward"); };

  const toggleList = (
    val: string,
    list: string[],
    setList: (v: string[]) => void,
    exclusive = "none"
  ) => {
    if (val === exclusive) {
      setList([exclusive]);
    } else {
      const without = list.filter(x => x !== exclusive);
      setList(without.includes(val) ? without.filter(x => x !== val) : [...without, val]);
    }
  };

  const canProceed = (): boolean => {
    if (step === 1) return age.trim() !== "" && Number(age) > 10 && Number(age) < 60;
    if (step === 2) return heightCm.trim() !== "" && weightKg.trim() !== "";
    if (step === 3) return twins !== null;
    if (step === 4) return dueDateConfirmed;
    if (step === 5) return isFirst !== null && (isFirst || prevLosses !== null);
    if (step === 6) return conditions.length > 0;
    if (step === 7) return supplements.length > 0;
    if (step === 8) return bloodType !== null;
    return true;
  };

  const handleSave = async () => {
    setSaving(true);

    // Save health profile WITHOUT supplements
    const health: HealthProfile = {
      onboardingComplete: true,
      age: Number(age),
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      bloodType: bloodType === "I don't know" ? null : bloodType,
      conditions: conditions.filter(c => c !== "none"),
      // REMOVED: supplements — now saved as medications
      isFirstPregnancy: isFirst ?? true,
      previousLosses: isFirst ? false : prevLosses,
      previousCount: isFirst ? 0 : Number(prevCount || 0),
      twinsOrMultiple: twins === "yes" ? true : twins === "no" ? false : null,
      weeksAtOnboarding: week,
      onboardingDate: new Date().toISOString(),
      dueDate,
    };

    await saveHealthProfile(user.uid, health);
    await seedOnboardingWeight(user.uid, healthProfile); 
    await saveUserWeek(user.uid, week);

    // Save supplements as medications (NEW)
    const supplementNames: Record<string, string> = {
      folicAcid: "Folic acid",
      iron: "Iron",
      calcium: "Calcium",
      vitaminD: "Vitamin D",
    };

    const onboardingMeds: Medication[] = supplements
      .filter(s => s !== "none")
      .map(s => ({
        id: crypto.randomUUID(),
        name: supplementNames[s] || s,
        dosage: "",
        frequency: "As directed by your doctor",
        source: "onboarding" as const,
        isDefault: true,
        addedAt: new Date().toISOString(),
      }));

    if (onboardingMeds.length > 0) {
      await Promise.all(onboardingMeds.map(med => saveMedication(user.uid, med)));
    }

    setSaving(false);
    goTo(9, "forward");
  };

  // animation classes
  const enterFrom = direction === "forward" ? "translate-y-4" : "-translate-y-4";
  const exitTo = direction === "forward" ? "-translate-y-4" : "translate-y-4";

  const stepStyle: React.CSSProperties = {
    transition: "opacity 220ms ease, transform 220ms ease",
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : `translateY(${direction === "forward" ? "-12px" : "12px"})`,
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <style>{`
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  .animate-fade-in {
    animation: fadeIn 800ms ease-out forwards;
  }
  .typing-cursor {
    animation: blink 1.06s step-end infinite;
  }
  .onb-step { animation: slideIn 280ms cubic-bezier(0.34, 1.56, 0.64, 1); }
  .onb-btn { transition: all 200ms ease-out; }
  .onb-btn:hover { transform: scale(1.01); }
  .onb-input:focus { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
  .onb-progress { transition: width 500ms cubic-bezier(0.4, 0, 0.2, 1); }
`}</style>
      {/* Progress bar */}
      <div className="h-0.5 bg-border w-full">
        <div
          className="h-full bg-primary onb-progress"
          style={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }}
        />
      </div>

      {/* Back button */}
      {step > 1 && step < 9 && (
        <button
          onClick={back}
          className="absolute top-5 left-5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
      )}

      {/* Step skip for step 0 — no back needed */}

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div style={stepStyle} className="w-full max-w-md onb-step">

          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="text-center space-y-8">
              <img src={icon} alt="Maya" className="w-16 h-16 mx-auto" />

              <div className="min-h-[4rem] flex items-center justify-center px-4">
                <h1 className="text-2xl font-semibold leading-relaxed">
                {welcomeWords.map((word, idx) => (
                  <span
                    key={idx}
                    className="inline-block transition-all duration-500 ease-out mr-[0.3em]"
                    style={{
                      opacity: idx < visibleWords ? 1 : 0,
                      transform: idx < visibleWords ? 'translateY(0)' : 'translateY(4px)',
                    }}
                  >
                    {word}
                  </span>
                ))}
              </h1>
              </div>

              <p className="text-muted-foreground text-sm transition-all duration-700 ease-out"
                style={{ opacity: isWelcomeComplete ? 1 : 0, transform: isWelcomeComplete ? 'translateY(0)' : 'translateY(8px)' }}>
                This takes about 2 minutes. Your information helps Maya give you personalised guidance.
              </p>

              <div className="transition-all duration-700 ease-out"
                style={{ opacity: isWelcomeComplete ? 1 : 0, transform: isWelcomeComplete ? 'translateY(0)' : 'translateY(8px)' }}>
                <Button onClick={next} className="w-full rounded-2xl h-12 onb-btn" disabled={!isWelcomeComplete}>
                  Let's begin
                </Button>
                <p className="text-[11px] text-muted-foreground/60 mt-3">
                  Your information is stored securely and never shared with third parties.
                </p>
              </div>
            </div>
          )}

          {/* Step 1 — Age */}
          {step === 1 && (
            <div className="space-y-6">
              <StepLabel>How old are you?</StepLabel>
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="number"
                min={10} max={60}
                value={age}
                onChange={e => setAge(e.target.value)}
                onKeyDown={e => e.key === "Enter" && canProceed() && next()}
                placeholder="e.g. 26"
                className="w-full h-14 text-2xl font-medium text-center rounded-2xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 transition onb-input"
              />
              <StepHint>years old</StepHint>
              <NextButton onClick={next} disabled={!canProceed()} />
            </div>
          )}

          {/* Step 2 — Height + Weight */}
          {step === 2 && (
            <div className="space-y-6">
              <StepLabel>Your height and current weight</StepLabel>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Height (cm)</label>
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="number"
                    value={heightCm}
                    onChange={e => setHeightCm(e.target.value)}
                    placeholder="158"
                    className="w-full h-14 text-xl font-medium text-center rounded-2xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 transition onb-input"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Weight (kg)</label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={e => setWeightKg(e.target.value)}
                    placeholder="62"
                    className="w-full h-14 text-xl font-medium text-center rounded-2xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 transition onb-input"
                  />
                </div>
              </div>
              <StepHint>We use this to calculate your BMI and personalise weight guidance.</StepHint>
              <NextButton onClick={next} disabled={!canProceed()} />
            </div>
          )}

          {/* Step 3 — Twins */}
          {step === 3 && (
            <div className="space-y-6">
              <StepLabel>Are you carrying twins?</StepLabel>
              <div className="space-y-3">
                {[
                  { val: "yes", label: "Yes" },
                  { val: "no", label: "No, just one" },
                  { val: "notsure", label: "Not sure yet" },
                ].map(opt => (
                  <OptionButton
                    key={opt.val}
                    selected={twins === opt.val}
                    onClick={() => setTwins(opt.val as typeof twins)}
                  >
                    {opt.label}
                  </OptionButton>
                ))}
              </div>
              <NextButton onClick={next} disabled={!canProceed()} />
            </div>
          )}

          {/* Step 4 — Week + Due date */}
          {step === 4 && (
            <div className="space-y-5">
              <StepLabel>What week of pregnancy are you in?</StepLabel>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setWeek(w => Math.max(1, w - 1))}>−</Button>
                <div className="flex-1 text-center">
                  <span className="text-4xl font-semibold">{week}</span>
                  <span className="text-muted-foreground text-sm ml-2">/ 40</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setWeek(w => Math.min(40, w + 1))}>+</Button>
              </div>
              <input
                type="range" min={1} max={40} value={week}
                onChange={e => setWeek(Number(e.target.value))}
                className="w-full accent-[var(--primary)]"
              />

              {/* Due date reveal */}
              <div className="rounded-2xl border border-border bg-card p-4 text-center space-y-3">
                <p className="text-xs text-muted-foreground">Your estimated due date</p>
                <p className="text-xl font-semibold text-primary">{formatDate(dueDate)}</p>
                {!dueDateConfirmed ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Does this look right?</p>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" onClick={() => setDueDateConfirmed(true)}>
                        Yes, that's correct
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        // let them pick a date manually
                        const input = document.getElementById("due-date-input") as HTMLInputElement;
                        input?.showPicker?.();
                      }}>
                        Adjust date
                      </Button>
                    </div>
                    <input
                      id="due-date-input"
                      type="date"
                      value={dueDate}
                      onChange={e => {
                        setDueDate(e.target.value);
                        setDueDateConfirmed(false);
                      }}
                      className="sr-only"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-sm text-primary">
                    <Check className="w-4 h-4" /> Confirmed
                  </div>
                )}
              </div>

              <NextButton onClick={next} disabled={!canProceed()} />
            </div>
          )}

          {/* Step 5 — First pregnancy */}
          {step === 5 && (
            <div className="space-y-6">
              <StepLabel>Is this your first pregnancy?</StepLabel>
              <div className="space-y-3">
                {[{ val: true, label: "Yes, first time" }, { val: false, label: "No, I've been pregnant before" }].map(opt => (
                  <OptionButton
                    key={String(opt.val)}
                    selected={isFirst === opt.val}
                    onClick={() => { setIsFirst(opt.val); setPrevLosses(null); }}
                  >
                    {opt.label}
                  </OptionButton>
                ))}
              </div>

              {isFirst === false && (
                <div
                  style={{ transition: "opacity 300ms, transform 300ms", opacity: 1, transform: "translateY(0)" }}
                  className="space-y-3 pt-2"
                >
                  <p className="text-sm text-muted-foreground">Have you experienced any pregnancy losses?</p>
                  <div className="flex gap-3">
                    {[{ val: true, label: "Yes" }, { val: false, label: "No" }].map(opt => (
                      <OptionButton
                        key={String(opt.val)}
                        selected={prevLosses === opt.val}
                        onClick={() => setPrevLosses(opt.val)}
                        small
                      >
                        {opt.label}
                      </OptionButton>
                    ))}
                  </div>
                </div>
              )}
              <NextButton onClick={next} disabled={!canProceed()} />
            </div>
          )}

          {/* Step 6 — Conditions */}
          {step === 6 && (
            <div className="space-y-5">
              <StepLabel>Any pre-existing conditions?</StepLabel>
              <StepHint>Select all that apply.</StepHint>
              <div className="space-y-2">
                {CONDITIONS.map(c => (
                  <OptionButton
                    key={c.id}
                    selected={conditions.includes(c.id)}
                    onClick={() => toggleList(c.id, conditions, setConditions, "none")}
                  >
                    {c.label}
                  </OptionButton>
                ))}
              </div>
              <NextButton onClick={next} disabled={!canProceed()} />
            </div>
          )}

          {/* Step 7 — Supplements */}
          {step === 7 && (
            <div className="space-y-5">
              <StepLabel>Are you currently taking any supplements?</StepLabel>
              <StepHint>Select all that apply.</StepHint>
              <div className="space-y-2">
                {SUPPLEMENTS.map(s => (
                  <OptionButton
                    key={s.id}
                    selected={supplements.includes(s.id)}
                    onClick={() => toggleList(s.id, supplements, setSupplements, "none")}
                  >
                    {s.label}
                  </OptionButton>
                ))}
              </div>
              <NextButton onClick={next} disabled={!canProceed()} />
            </div>
          )}

          {/* Step 8 — Blood type */}
          {step === 8 && (
            <div className="space-y-5">
              <StepLabel>What is your blood type?</StepLabel>
              <select
                ref={inputRef as React.RefObject<HTMLSelectElement>}
                value={bloodType ?? ""}
                onChange={(e) => setBloodType(e.target.value || null)}
                className="w-full h-14 px-4 text-base rounded-2xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 transition appearance-none cursor-pointer onb-input"
              >
                <option value="">Select your blood type...</option>
                {BLOOD_TYPES.map(bt => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
              <NextButton
                onClick={handleSave}
                disabled={!canProceed() || saving}
                label={saving ? "Saving..." : "Finish"}
              />
            </div>
          )}

          {/* Step 9 — Done */}
          {step === 9 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Baby className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold">Maya is ready for you 🌸</h1>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Your profile is set up. Maya will use this to give you personalised guidance throughout your pregnancy.
              </p>
              <Button onClick={onComplete} className="w-full rounded-2xl h-12 onb-btn">
                Start chatting with Maya
              </Button>
            </div>
          )}

        </div>
      </div>

      {/* Step counter */}
      {step > 0 && step < 9 && (
        <div className="pb-6 text-center text-xs text-muted-foreground">
          {step} of 8
        </div>
      )}
    </div>
  );
}

// ── Small reusable pieces ─────────────────────────────────────────────────────

function StepLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold leading-snug">{children}</h2>;
}

function StepHint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground -mt-2">{children}</p>;
}

function NextButton({ onClick, disabled, label = "Continue" }: {
  onClick: () => void; disabled: boolean; label?: string;
}) {
  return (
    <Button onClick={onClick} disabled={disabled} className="w-full rounded-2xl h-12 mt-2 onb-btn">
      {label}
    </Button>
  );
}

function OptionButton({ children, selected, onClick, small = false }: {
  children: React.ReactNode; selected: boolean; onClick: () => void; small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-2xl border font-medium text-sm onb-btn
        ${small ? "px-3 py-2.5" : "px-4 py-3.5"}
        ${selected
          ? "border-primary bg-primary/10 text-primary shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent/40"
        }
      `}
    >
      {children}
    </button>
  );
}