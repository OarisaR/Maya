import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Baby, Heart, Calendar, Activity, MessageCircle, Sparkles } from "lucide-react";
import { useLang } from "@/contexts/lang-context";
import { tr } from "@/i18n/translations";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Pregnancy tracker | Maya" },
      { name: "description", content: "A simple, calming pregnancy tracker — week by week." },
    ],
  }),
  component: Dashboard,
});

const MILESTONES: Record<number, { size: string; note: string }> = {
  8:  { size: "raspberry 🍇",  note: "Tiny fingers and toes are forming." },
  12: { size: "lime 🍋",       note: "Reflexes are developing — you may hear the heartbeat." },
  16: { size: "avocado 🥑",    note: "You might start feeling the first flutters." },
  20: { size: "banana 🍌",     note: "Halfway there. Anatomy scan time." },
  24: { size: "corn cob 🌽",   note: "Baby can recognize your voice." },
  28: { size: "eggplant 🍆",   note: "Third trimester begins — rest and hydrate." },
  32: { size: "squash 🎃",     note: "Baby is practicing breathing movements." },
  36: { size: "papaya",        note: "Almost full term. Pack your hospital bag." },
  40: { size: "pumpkin 🎃",    note: "Welcome week! Trust your body." },
};

function nearestMilestone(week: number) {
  const keys = Object.keys(MILESTONES).map(Number).sort((a, b) => a - b);
  return keys.reduce((acc, k) => (k <= week ? k : acc), keys[0]);
}

function Dashboard() {
  const { lang } = useLang();
  const [week, setWeek] = useState(24);

  useEffect(() => {
    const w = typeof window !== "undefined" && localStorage.getItem("mh_week");
    if (w) setWeek(Number(w));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("mh_week", String(week));
  }, [week]);

  const m = MILESTONES[nearestMilestone(week)];
  const trimester = week <= 13
    ? tr("dash_trimester1", lang)
    : week <= 27
    ? tr("dash_trimester2", lang)
    : tr("dash_trimester3", lang);
  const daysLeft = (40 - week) * 7;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
        
            <h1 className="mt-15 text-4xl md:text-5xl font-semibold tracking-tight">{tr("dash_h1", lang)}</h1>
            <p className="mt-2 text-muted-foreground">{tr("dash_p", lang)}</p>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/chat"><MessageCircle className="w-4 h-4 mr-2" />{tr("dash_ask_maya", lang)}</Link>
          </Button>
        </div>

        <Card className="p-8 rounded-3xl bg-[image:var(--gradient-hero)] border-border/60">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="text-sm text-muted-foreground">{trimester}{tr("dash_trimester_sfx", lang)}</div>
              <div className="mt-1 text-6xl font-semibold tracking-tight">{tr("dash_week", lang)} {week}</div>
              <div className="mt-2 text-muted-foreground">{tr("dash_of40", lang)} · {daysLeft} {tr("dash_days_left", lang)}</div>
              <div className="mt-6 h-2 rounded-full bg-background/60 overflow-hidden">
                <div className="h-full bg-[image:var(--gradient-primary)] rounded-full transition-all" style={{ width: `${(week / 40) * 100}%` }} />
              </div>
              <div className="mt-6">
                <Slider value={[week]} min={1} max={40} step={1} onValueChange={(v) => setWeek(v[0])} />
              </div>
            </div>
            <div className="bg-card/80 backdrop-blur rounded-2xl p-6 border border-border/50">
              <div className="flex items-center gap-2 text-primary text-sm font-medium">
                <Baby className="w-4 h-4" />{tr("dash_baby_size", lang)}
              </div>
              <div className="mt-2 text-2xl font-semibold">{tr("dash_size_prefix", lang)} {m.size}</div>
              <p className="mt-3 text-muted-foreground leading-relaxed">{m.note}</p>
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {[
            { icon: Heart,    t: tr("dash_selfcare_t", lang),  d: tr("dash_selfcare_d", lang) },
            { icon: Calendar, t: tr("dash_checkup_t", lang),   d: tr("dash_checkup_d", lang) },
            { icon: Activity, t: tr("dash_movement_t", lang),  d: week >= 20 ? tr("dash_movement_d_late", lang) : tr("dash_movement_d_early", lang) },
          ].map(({ icon: Icon, t, d }) => (
            <Card key={t} className="p-6 rounded-2xl bg-card/60 border-border/60">
              <div className="w-10 h-10 rounded-xl bg-[image:var(--gradient-primary)] flex items-center justify-center text-primary-foreground mb-4">
                <Icon className="w-4 h-4" />
              </div>
              <div className="font-medium">{t}</div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{d}</p>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-10 max-w-xl mx-auto">
          {tr("dash_disclaimer", lang)}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}