import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Phone, ShieldAlert, MessageCircle, Heart } from "lucide-react";
import { useLang } from "@/contexts/lang-context";
import { tr } from "@/i18n/translations";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency support | Maya" },
      { name: "description", content: "Recognize concerning pregnancy symptoms and find immediate help." },
    ],
  }),
  component: Emergency,
});

function Emergency() {
  const { lang } = useLang();

  const SYMPTOMS = [
    tr("emg_s1", lang), tr("emg_s2", lang), tr("emg_s3", lang),
    tr("emg_s4", lang), tr("emg_s5", lang), tr("emg_s6", lang),
    tr("emg_s7", lang), tr("emg_s8", lang), tr("emg_s9", lang),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <Badge variant="secondary" className="rounded-full mb-3 bg-destructive/10 text-destructive">
          <ShieldAlert className="w-3 h-3 mr-1" />{tr("emg_badge", lang)}
        </Badge>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">{tr("emg_h1", lang)}</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl text-lg">{tr("emg_p", lang)}</p>

        <Card className="mt-8 p-6 md:p-8 rounded-3xl border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive text-destructive-foreground flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-lg">{tr("emg_call_title", lang)}</div>
              <p className="text-sm text-muted-foreground mt-1">{tr("emg_call_sub", lang)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="destructive" className="rounded-full">
                  <a href="tel:112"><Phone className="w-4 h-4 mr-2" />Call 112</a>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <a href="tel:911"><Phone className="w-4 h-4 mr-2" />Call 911</a>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">{tr("emg_warning_h2", lang)}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {SYMPTOMS.map(s => (
              <div key={s} className="flex items-start gap-3 p-4 rounded-2xl border border-border/60 bg-card/60">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-sm">{s}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="mt-10 p-6 rounded-2xl bg-card/60 border-border/60">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[image:var(--gradient-primary)] flex items-center justify-center text-primary-foreground shrink-0">
              <Heart className="w-4 h-4" fill="currentColor" />
            </div>
            <div className="flex-1">
              <div className="font-medium">{tr("emg_while_wait", lang)}</div>
              <ul className="mt-2 text-sm text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
                <li>{tr("emg_li1", lang)}</li>
                <li>{tr("emg_li2", lang)}</li>
                <li>{tr("emg_li3", lang)}</li>
                <li>{tr("emg_li4", lang)}</li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild className="rounded-full">
            <Link to="/chat"><MessageCircle className="w-4 h-4 mr-2" />{tr("emg_talk_maya", lang)}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/dashboard">{tr("emg_view_tracker", lang)}</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-12 max-w-xl mx-auto">
          {tr("emg_disclaimer", lang)}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}