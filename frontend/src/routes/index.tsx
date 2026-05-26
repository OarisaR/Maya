import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle, ShieldCheck, Activity, Bell, Heart, Sparkles,
  ArrowRight, Star, Lock, CheckCircle2
} from "lucide-react";
import { useLang } from "@/contexts/lang-context";
import { tr } from "@/i18n/translations";
import heroImg from "@/assets/home.png";
import CountUp from "../components/CountUp";
import DotField from "../components/DotField.tsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Maya | AI Maternal Health Companion" },
      { name: "description", content: "Compassionate, intelligent maternal health support available anytime." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen text-foreground">
      <div style={{ position: 'fixed', inset: 0, zIndex: -19, width: '100vw', height: '100vh' }}>
        <DotField />
      </div>
      <SiteHeader />
      <Hero />
      <Trust />
      <Features />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  const { lang } = useLang();
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[image:var(--gradient-hero)] opacity-80 -z-10" />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl -z-10" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-pink/30 blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-6 pt-20 pb-28 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <Badge variant="secondary" className="rounded-full px-3 py-1 mb-6 bg-background/70 backdrop-blur">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
            {tr("hero_badge", lang)}
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05]">
            {tr("hero_h1a", lang)} <span className="bg-gradient-to-r from-primary to-pink bg-clip-text text-transparent">{tr("hero_h1b", lang)}</span>.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
            {tr("hero_p", lang)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full h-12 px-6 shadow-[var(--shadow-soft)]">
              <Link to="/chat"><MessageCircle className="w-4 h-4 mr-2" />{tr("hero_cta_chat", lang)}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-6">
              <Link to="/dashboard"><Activity className="w-4 h-4 mr-2" />{tr("hero_cta_track", lang)}</Link>
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5"><Lock className="w-4 h-4" />{tr("hero_private", lang)}</div>
            <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" />{tr("hero_clinical", lang)}</div>
          </div>
        </div>

        <div className="relative">
          <div className="relative rounded-[2rem] overflow-hidden shadow-[var(--shadow-card)] bg-card">
            <img src={heroImg} alt="Mother using Maya AI maternal health app" width={1024} height={1024} className="w-full h-auto border-[#7af0dc]" />
          </div>
          <FloatingCard className="absolute -left-6 top-10 float">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Sparkles className="w-3 h-3 text-primary" />Maya</div>
            <p className="text-sm">{tr("hero_float1", lang)}</p>
          </FloatingCard>
          <FloatingCard className="absolute -right-4 bottom-8 float-delay">
            <div className="flex items-center gap-2 text-xs mb-1.5"><Activity className="w-3 h-3 text-primary" />{tr("hero_tracker", lang)}</div>
            <div className="text-sm font-medium">{tr("hero_week", lang)}</div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-[60%] bg-[image:var(--gradient-primary)] rounded-full" />
            </div>
          </FloatingCard>
          <FloatingCard className="absolute right-10 -top-4 float">
            <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-pink" /><span className="text-sm">{tr("hero_visit", lang)}</span></div>
          </FloatingCard>
        </div>
      </div>
    </section>
  );
}

function FloatingCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`hidden lg:block bg-card/95 backdrop-blur border border-border rounded-2xl px-4 py-3 shadow-[var(--shadow-card)] ${className}`}>{children}</div>;
}

function Trust() {
  const { lang } = useLang();

  const stats = [
    { v: 10000, suffix: "+", l: tr("trust_conv", lang) },
    { v: 96, suffix: "%", l: tr("trust_reassured", lang) },
    { v: 24, suffix: "/7", l: tr("trust_avail", lang) },
    { v: 10, suffix: "", l: tr("trust_lang", lang) },
  ];

  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">

        {stats.map((s) => (
          <div key={s.l}>
            <div className="text-2xl md:text-3xl font-semibold">
              <CountUp to={s.v} duration={2.2} separator="," />
              {s.suffix}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {s.l}
            </div>
          </div>
        ))}

      </div>
    </section>
  );
}

function Features() {
  const { lang } = useLang();
  const items = [
    { icon: MessageCircle, t: tr("feat1_t", lang), d: tr("feat1_d", lang) },
    { icon: Activity, t: tr("feat2_t", lang), d: tr("feat2_d", lang) },
    { icon: ShieldCheck, t: tr("feat3_t", lang), d: tr("feat3_d", lang) },
  ];
  return (
    <section id="features" className="max-w-7xl mx-auto px-6 py-24">
      <div className="max-w-2xl">
        <Badge variant="secondary" className="rounded-full mb-4">{tr("feat_badge", lang)}</Badge>
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">{tr("feat_h2", lang)}</h2>
        <p className="mt-4 text-muted-foreground text-lg">{tr("feat_p", lang)}</p>
      </div>
      <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map(({ icon: Icon, t, d }) => (
          <Card key={t} className="group p-6 rounded-3xl border-border/60 hover:shadow-[var(--shadow-card)] hover:-translate-y-1 transition-all duration-300 bg-card/60 backdrop-blur">
            <div className="w-11 h-11 rounded-2xl bg-[image:var(--gradient-primary)] flex items-center justify-center text-primary-foreground mb-5 group-hover:scale-110 transition-transform">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{d}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const { lang } = useLang();
  const steps = [
    { n: "01", t: tr("how1_t", lang), d: tr("how1_d", lang) },
    { n: "02", t: tr("how2_t", lang), d: tr("how2_d", lang) },
    { n: "03", t: tr("how3_t", lang), d: tr("how3_d", lang) },
  ];
  return (
    <section id="how" className="bg-muted/30 border-y border-border/60">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="rounded-full mb-4">{tr("how_badge", lang)}</Badge>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">{tr("how_h2", lang)}</h2>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <div className="rounded-3xl bg-card border border-border/60 p-7 h-full">
                <div className="text-sm text-primary font-medium tracking-wider">{s.n}</div>
                <h3 className="mt-3 text-xl font-semibold">{s.t}</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{s.d}</p>
              </div>
              {i < 2 && <ArrowRight className="hidden md:block absolute top-1/2 -right-5 -translate-y-1/2 text-muted-foreground/40" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const { lang } = useLang();
  const items = [
    { n: "Aisha, 28", w: "Week 32", q: "Maya feels like a calm friend who knows exactly what to say at 3am when I can't sleep." },
    { n: "Priya, 31", w: "Week 18", q: "I asked about a symptom and it gently told me to call my doctor. It saved me a worried week." },
    { n: "Maria, 26", w: "Week 24", q: "It's the most reassuring app I've ever used. Warm, clear, and never judgemental." },
  ];
  return (
    <section id="testimonials" className="max-w-7xl mx-auto px-6 py-24">
      <div className="max-w-2xl">
        <Badge variant="secondary" className="rounded-full mb-4">{tr("test_badge", lang)}</Badge>
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">{tr("test_h2", lang)}</h2>
      </div>
      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {items.map(t => (
          <Card key={t.n} className="p-7 rounded-3xl border-border/60 bg-card/60">
            <div className="flex gap-0.5 text-warning mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            </div>
            <p className="text-foreground/90 leading-relaxed">"{t.q}"</p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink/40 flex items-center justify-center text-pink-foreground font-medium">{t.n[0]}</div>
              <div>
                <div className="text-sm font-medium">{t.n}</div>
                <div className="text-xs text-muted-foreground">{t.w}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  const { lang } = useLang();
  const qs: [string, string][] = [
    [tr("faq1_q", lang), tr("faq1_a", lang)],
    [tr("faq2_q", lang), tr("faq2_a", lang)],
    [tr("faq3_q", lang), tr("faq3_a", lang)],
    [tr("faq4_q", lang), tr("faq4_a", lang)],
  ];
  return (
    <section id="faq" className="bg-muted/30 border-y border-border/60">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <Badge variant="secondary" className="rounded-full mb-4">{tr("faq_badge", lang)}</Badge>
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-10">{tr("faq_h2", lang)}</h2>
        <Accordion type="single" collapsible className="space-y-3">
          {qs.map(([q, a], i) => (
            <AccordionItem key={i} value={`i${i}`} className="rounded-2xl border border-border/60 bg-card px-5">
              <AccordionTrigger className="text-left hover:no-underline font-medium">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function CTA() {
  const { lang } = useLang();
  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="rounded-[2rem] p-12 md:p-16 bg-[image:var(--gradient-primary)] text-primary-foreground relative overflow-hidden">
        <Heart className="absolute -right-10 -bottom-10 w-64 h-64 opacity-10" fill="currentColor" />
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl">{tr("cta_h2", lang)}</h2>
        <p className="mt-4 max-w-xl opacity-90">{tr("cta_p", lang)}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="secondary" className="rounded-full h-12 px-6">
            <Link to="/chat">{tr("cta_btn", lang)}</Link>
          </Button>
          <div className="flex items-center gap-2 text-sm opacity-90 px-2"><CheckCircle2 className="w-4 h-4" />{tr("cta_free", lang)}</div>
        </div>
      </div>
    </section>
  );
}