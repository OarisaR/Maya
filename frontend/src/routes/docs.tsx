import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileDown,
  GripVertical,
  Lock,
  MapPinned,
  MoveLeft,
  PencilLine,
  Plus,
  Rocket,
  Save,
  Search,
  Share2,
  Shield,
  Sparkles,
  Trash2,
  Users,
  Database,
  Bot,
  Code2,
  LineChart,
  Server,
  Globe,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  buildDocsMarkdown,
  downloadTextFile,
  fetchAdminDocs,
  fetchPublicDocs,
  isAdminUser,
  saveAdminDocs,
  type DocsMember,
  type DocsState,
  updateDocsVisibility,
} from "@/lib/docs";
import { toast } from "sonner";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs | Maya" },
      { name: "description", content: "Live pitch deck and technical documentation for Maya." },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocsState | null>(null);
  const [draft, setDraft] = useState<DocsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<{ message: string; access?: DocsState["access"] } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const adminFlag = await isAdminUser().catch(() => false);
        if (cancelled) return;
        setIsAdmin(adminFlag);
        if (adminFlag) {
          const adminDocs = await fetchAdminDocs();
          if (cancelled) return;
          setDocs(adminDocs);
          setDraft(adminDocs);
          setError(null);
          return;
        }

        const publicDocs = await fetchPublicDocs();
        if (cancelled) return;
        setDocs(publicDocs);
        setDraft(publicDocs);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Docs are not available right now.";
        const access = (err as { detail?: { access?: DocsState["access"] } })?.detail?.access;
        if (!cancelled) setError({ message, access });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const visiblePitchDeck = useMemo(() => {
    if (!draft) return [];
    const q = search.trim().toLowerCase();
    if (!q) return draft.pitchDeck;
    return draft.pitchDeck.filter((section) => {
      const haystack = [section.title, section.eyebrow, section.summary, ...(section.bullets ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [draft, search]);

  const visibleFeatures = useMemo(() => {
    if (!draft) return [];
    const q = search.trim().toLowerCase();
    if (!q) return draft.featureMatrix;
    return draft.featureMatrix.filter((feature) => {
      return [feature.name, feature.status, feature.source, feature.notes].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [draft, search]);

  const visibleApis = useMemo(() => {
    if (!draft) return [];
    const q = search.trim().toLowerCase();
    if (!q) return draft.apiDocumentation;
    return draft.apiDocumentation.filter((api) => {
      return [api.method, api.path, api.auth, api.description, api.status].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [draft, search]);

  const movePitchSection = (from: number, to: number) => {
    if (!draft) return;
    const next = [...draft.pitchDeck];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setDraft({ ...draft, pitchDeck: next });
  };

  const updatePitchSection = (index: number, key: "title" | "summary" | "eyebrow", value: string) => {
    if (!draft) return;
    const next = draft.pitchDeck.map((section, i) => (i === index ? { ...section, [key]: value } : section));
    setDraft({ ...draft, pitchDeck: next });
  };

  const updatePitchBullets = (index: number, value: string) => {
    if (!draft) return;
    const bullets = value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const next = draft.pitchDeck.map((section, i) => (i === index ? { ...section, bullets } : section));
    setDraft({ ...draft, pitchDeck: next });
  };

  const updateTeam = (index: number, key: keyof DocsMember, value: string) => {
    if (!draft) return;
    const members = draft.team.members.map((member, i) => (i === index ? { ...member, [key]: value } : member));
    setDraft({ ...draft, team: { ...draft.team, members } });
  };

  const addTeamMember = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      team: {
        ...draft.team,
        members: [...draft.team.members, { fullName: "New member", role: "Role", email: "team@example.com", photoUrl: "" }],
      },
    });
  };

  const removeTeamMember = (index: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      team: {
        ...draft.team,
        members: draft.team.members.filter((_, i) => i !== index),
      },
    });
  };

  const saveVisibility = async () => {
    if (!draft) return;
    try {
      setSaving(true);
      const next = await updateDocsVisibility(draft.visibility);
      setDocs(next);
      setDraft(next);
      toast.success("Visibility updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update visibility");
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async (publish = false) => {
    if (!draft) return;
    try {
      setSaving(true);
      const next = await saveAdminDocs(draft, publish);
      setDocs(next);
      setDraft(next);
      toast.success(publish ? "Published docs snapshot" : "Draft saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save docs");
    } finally {
      setSaving(false);
    }
  };

  const exportMarkdown = () => {
    if (!draft) return;
    const markdown = buildDocsMarkdown(draft);
    downloadTextFile("maya-docs.md", markdown, "text/markdown");
    toast.success("Markdown export downloaded");
  };

  const copyLink = async () => {
    if (typeof window === "undefined") return;
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Shareable link copied");
  };

  const printPdf = () => {
    if (typeof window !== "undefined") window.print();
  };

  const access = docs?.access;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-6 py-8 md:py-12">
        {loading ? (
          <LoadingState />
        ) : error && !isAdmin ? (
          <UnavailableState error={error.message} access={error.access ?? access} />
        ) : docs && draft ? (
          <>
            <DocsHero docs={docs} userEmail={user?.email ?? undefined} onCopyLink={copyLink} onExportMd={exportMarkdown} onPrintPdf={printPdf} />
            <DocsNav />
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-8">
                <PitchDeckSection docs={draft} search={search} />
                <ProductOverviewSection docs={draft} />
                <FeatureMatrixSection docs={draft} features={visibleFeatures} />
                <DiagramSection docs={draft} />
                <TechStackSection docs={draft} />
                <ApiSection docs={draft} apis={visibleApis} />
                <DataAiSection docs={draft} />
                <RoadmapSection docs={draft} />
                <PerfSecurityAnalyticsSection docs={draft} />
                <TeamSection docs={draft} />
                <ChangelogSection docs={draft} />
              </div>

              <aside className="space-y-6 lg:sticky lg:top-24 self-start">
                <SearchCard search={search} setSearch={setSearch} />
                <LiveStatusCard docs={docs} />
                {isAdmin && (
                  <AdminPanel
                    draft={draft}
                    setDraft={setDraft}
                    dragIndex={dragIndex}
                    setDragIndex={setDragIndex}
                    onMovePitch={movePitchSection}
                    onUpdatePitch={updatePitchSection}
                    onUpdateBullets={updatePitchBullets}
                    onUpdateTeam={updateTeam}
                    onAddTeamMember={addTeamMember}
                    onRemoveTeamMember={removeTeamMember}
                    onSaveVisibility={saveVisibility}
                    onSaveDraft={() => saveDraft(false)}
                    onPublish={() => saveDraft(true)}
                    saving={saving}
                  />
                )}
              </aside>
            </div>
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

function LoadingState() {
  return (
    <Card className="p-10 rounded-3xl border-border/60">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Loading live docs...
      </div>
    </Card>
  );
}

function UnavailableState({ error, access }: { error: string; access?: DocsState["access"] }) {
  return (
    <Card className="p-8 md:p-12 rounded-[2rem] border-border/60 bg-muted/20">
      <div className="max-w-2xl">
        <Badge variant="secondary" className="rounded-full mb-4">
          <Lock className="w-3 h-3 mr-1" /> Not Available
        </Badge>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Docs are currently hidden</h1>
        <p className="mt-4 text-muted-foreground text-lg">{error}</p>
        {access && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
            <MetaStat label="Visibility" value={access.enabled ? "Enabled" : "Disabled"} />
            <MetaStat label="Start" value={access.startAt ?? "—"} />
            <MetaStat label="End" value={access.endAt ?? "—"} />
          </div>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild><Link to="/">Back home</Link></Button>
          <Button variant="outline" asChild><Link to="/chat">Open chat</Link></Button>
        </div>
      </div>
    </Card>
  );
}

function DocsHero({
  docs,
  userEmail,
  onCopyLink,
  onExportMd,
  onPrintPdf,
}: {
  docs: DocsState;
  userEmail?: string;
  onCopyLink: () => void;
  onExportMd: () => void;
  onPrintPdf: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-border/60 bg-[image:var(--gradient-hero)] p-8 md:p-10 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-3">
        <Badge className="rounded-full">
          <Sparkles className="w-3 h-3 mr-1" /> Live docs
        </Badge>
        <Badge variant="secondary" className="rounded-full">
          <CheckCircle2 className="w-3 h-3 mr-1" /> {docs.status ?? "published"}
        </Badge>
        {docs.visibility.enabled ? (
          <Badge variant="outline" className="rounded-full">
            <Eye className="w-3 h-3 mr-1" /> Scheduled access
          </Badge>
        ) : (
          <Badge variant="destructive" className="rounded-full">
            <EyeOff className="w-3 h-3 mr-1" /> Hidden
          </Badge>
        )}
      </div>
      <div className="mt-6 max-w-3xl">
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">{docs.tagline}</p>
        <h1 className="mt-3 text-4xl md:text-6xl font-semibold tracking-tight leading-tight">{docs.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{docs.summary}</p>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={onExportMd} className="rounded-full">
          <Download className="w-4 h-4 mr-2" /> Export Markdown
        </Button>
        <Button variant="outline" onClick={onPrintPdf} className="rounded-full">
          <FileDown className="w-4 h-4 mr-2" /> Export PDF
        </Button>
        <Button variant="outline" onClick={onCopyLink} className="rounded-full">
          <Share2 className="w-4 h-4 mr-2" /> Share link
        </Button>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <MetaStat label="Window" value={`${docs.visibility.startAt ?? "—"} → ${docs.visibility.endAt ?? "—"}`} />
        <MetaStat label="Updated" value={docs.updatedAt ?? "—"} />
        <MetaStat label="Signed in as" value={userEmail ?? "public visitor"} />
      </div>
    </section>
  );
}

function DocsNav() {
  const items = [
    ["Pitch", "pitch"],
    ["Overview", "overview"],
    ["Features", "features"],
    ["Architecture", "architecture"],
    ["Tech stack", "tech-stack"],
    ["API", "api"],
    ["Data + AI", "data-ai"],
    ["Roadmap", "roadmap"],
    ["Security", "security"],
    ["Team", "team"],
    ["Changelog", "changelog"],
  ];
  return (
    <div className="sticky top-16 z-30 mt-6 rounded-2xl border border-border/60 bg-background/90 backdrop-blur px-4 py-3 shadow-sm overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max text-sm">
        <MapPinned className="w-4 h-4 text-muted-foreground" />
        {items.map(([label, id]) => (
          <a key={id} href={`#${id}`} className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

function PitchDeckSection({ docs, search }: { docs: DocsState; search: string }) {
  const q = (search ?? "").trim().toLowerCase();
  const sections = q
    ? docs.pitchDeck.filter((section) => {
        const hay = [section.title, section.eyebrow, section.summary, ...(section.bullets ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
    : docs.pitchDeck;

  return (
    <Card id="pitch" className="p-6 md:p-8 rounded-[1.75rem] border-border/60">
      <SectionHeading eyebrow="Pitch deck" title="YC-style story" description="Tell the business in two minutes, and the product in one glance." search={search} />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {sections.map((section: any) => (
          <article key={section.id} className="rounded-2xl border border-border/60 p-5 bg-muted/20">
            <Badge variant="secondary" className="rounded-full mb-3">{section.eyebrow ?? "Deck"}</Badge>
            <h3 className="text-xl font-semibold">{section.title}</h3>
            {section.summary && <p className="mt-2 text-sm text-muted-foreground">{section.summary}</p>}
            {!!section.bullets?.length && (
              <ul className="mt-4 space-y-2 text-sm">
                {section.bullets.map((bullet: any) => (
                  <li key={bullet} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />{bullet}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </Card>
  );
}

function ProductOverviewSection({ docs }: { docs: DocsState }) {
  return (
    <Card id="overview" className="p-6 md:p-8 rounded-[1.75rem] border-border/60">
      <SectionHeading eyebrow="Product overview" title="What Maya does" description="The short version for reviewers who only have a minute." />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <InfoBox title="What it does" text={docs.productOverview?.whatItDoes ?? "—"} icon={<Bot className="w-4 h-4" />} />
        <InfoBox
          title="Target users"
          text={(docs.productOverview?.targetUsers ?? []).join(" · ") || "—"}
          icon={<Users className="w-4 h-4" />}
        />
        <InfoBox
          title="Core use cases"
          text={(docs.productOverview?.coreUseCases ?? []).join(" · ") || "—"}
          icon={<Rocket className="w-4 h-4" />}
        />
      </div>
    </Card>
  );
}

function FeatureMatrixSection({ docs, features }: { docs: DocsState; features: DocsState["featureMatrix"] }) {
  return (
    <Card id="features" className="p-6 md:p-8 rounded-[1.75rem] border-border/60">
      <SectionHeading eyebrow="Feature matrix" title="Current, upcoming, planned" description="Live-synced product status with clear ownership signals." />
      <div className="mt-6 grid gap-3">
        {features.map((feature) => (
          <div key={feature.name} className="rounded-2xl border border-border/60 p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between bg-muted/20">
            <div>
              <div className="font-medium">{feature.name}</div>
              <div className="text-sm text-muted-foreground">{feature.source ?? "—"} {feature.notes ? `· ${feature.notes}` : ""}</div>
            </div>
            <Badge variant={feature.status === "current" ? "default" : feature.status === "upcoming" ? "secondary" : "outline"} className="rounded-full capitalize self-start md:self-auto">
              {feature.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DiagramSection({ docs }: { docs: DocsState }) {
  return (
    <Card id="architecture" className="p-6 md:p-8 rounded-[1.75rem] border-border/60">
      <SectionHeading eyebrow="Architecture & flow" title="UI → API → services → data" description="Rendered as SVG with editable Mermaid source preserved in the backend state." />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DiagramCard
          title="Architecture diagram"
          source={docs.architecture?.mermaid ?? ""}
          nodes={["Frontend UI", "FastAPI API", "RAG / Safety / LLM", "State / Docs"]}
        />
        <DiagramCard
          title="Data flow diagram"
          source={docs.dataFlow?.mermaid ?? ""}
          nodes={["Input", "Validation + RBAC", "AI / Retrieval", "Output", "Feedback"]}
        />
      </div>
    </Card>
  );
}

function TechStackSection({ docs }: { docs: DocsState }) {
  const stack = docs.technologyStack ?? {};
  return (
    <Card id="tech-stack" className="p-6 md:p-8 rounded-[1.75rem] border-border/60">
      <SectionHeading eyebrow="Technology stack" title="Frontend, backend, AI, infra" description="A simple way to verify the stack without searching the codebase." />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(stack).map(([group, items]) => (
          <InfoBox key={group} title={group.replace(/([A-Z])/g, " $1")} text={items.join(" · ")} icon={<Server className="w-4 h-4" />} />
        ))}
      </div>
    </Card>
  );
}

function ApiSection({ docs, apis }: { docs: DocsState; apis: DocsState["apiDocumentation"] }) {
  return (
    <Card id="api" className="p-6 md:p-8 rounded-[1.75rem] border-border/60">
      <SectionHeading eyebrow="API documentation" title="What the docs system exposes" description="Public and protected routes are separated by visibility and admin auth." />
      <div className="mt-6 grid gap-3">
        {apis.map((api) => (
          <div key={`${api.method}-${api.path}`} className="rounded-2xl border border-border/60 p-4 flex flex-col md:flex-row gap-3 md:items-center justify-between bg-muted/20">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full">{api.method}</Badge>
                <code className="text-sm text-foreground">{api.path}</code>
                <Badge variant="outline" className="rounded-full">{api.auth}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{api.description}</p>
            </div>
            {api.status && <Badge className="rounded-full capitalize">{api.status}</Badge>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function DataAiSection({ docs }: { docs: DocsState }) {
  return (
    <Card id="data-ai" className="p-6 md:p-8 rounded-[1.75rem] border-border/60">
      <SectionHeading eyebrow="Data + AI" title="Data layer, AI layer, explainability" description="This keeps the technical narrative grounded in what the system actually does." />
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <DetailList title="Data layer" data={docs.dataLayer} />
        <DetailList title="AI layer" data={docs.aiLayer} />
      </div>
    </Card>
  );
}

function RoadmapSection({ docs }: { docs: DocsState }) {
  return (
    <Card id="roadmap" className="p-6 md:p-8 rounded-[1.75rem] border-border/60">
      <SectionHeading eyebrow="Roadmap" title="Short, mid, and long term" description="A clean way to show where the product is going next." />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <DetailList title="Short term" data={{ items: docs.roadmap?.shortTerm ?? [] }} />
        <DetailList title="Mid term" data={{ items: docs.roadmap?.midTerm ?? [] }} />
        <DetailList title="Long term" data={{ items: docs.roadmap?.longTerm ?? [] }} />
      </div>
    </Card>
  );
}

function PerfSecurityAnalyticsSection({ docs }: { docs: DocsState }) {
  return (
    <Card id="security" className="p-6 md:p-8 rounded-[1.75rem] border-border/60">
      <SectionHeading eyebrow="Performance, security, analytics" title="Fast, safe, measurable" description="Trust comes from clear controls and visible outcomes." />
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <DetailList title="Performance" data={docs.performance} />
        <DetailList title="Security" data={docs.security} />
        <DetailList title="Analytics" data={docs.analytics} />
      </div>
    </Card>
  );
}

function TeamSection({ docs }: { docs: DocsState }) {
  return (
    <Card id="team" className="p-6 md:p-8 rounded-[1.75rem] border-border/60">
      <SectionHeading eyebrow="Team & contributors" title="Who built Maya" description="Uniform cards, fallback avatars, and the role each person plays in the application." />
      {docs.team.name && <p className="mt-4 text-sm text-muted-foreground">Team name: {docs.team.name}</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {docs.team.members.map((member) => (
          <article key={`${member.fullName}-${member.email}`} className="rounded-2xl border border-border/60 p-4 bg-muted/20">
            <div className="aspect-square w-full rounded-2xl overflow-hidden bg-background border border-border/60 flex items-center justify-center">
              {member.photoUrl ? (
                <img src={member.photoUrl} alt={member.fullName} className="w-full h-full object-cover" />
              ) : (
                <FallbackAvatar name={member.fullName} />
              )}
            </div>
            <h3 className="mt-4 font-semibold">{member.fullName}</h3>
            <p className="text-sm text-muted-foreground">{member.role}</p>
            <a href={`mailto:${member.email}`} className="mt-2 inline-flex text-sm text-primary hover:underline break-all">{member.email}</a>
          </article>
        ))}
      </div>
    </Card>
  );
}

function ChangelogSection({ docs }: { docs: DocsState }) {
  return (
    <Card id="changelog" className="p-6 md:p-8 rounded-[1.75rem] border-border/60">
      <SectionHeading eyebrow="Changelog" title="Version history" description="A small ledger of what changed, when, and why." />
      <div className="mt-6 space-y-4">
        {(docs.changelog ?? []).map((entry) => (
          <div key={`${entry.version}-${entry.date}`} className="rounded-2xl border border-border/60 p-4 bg-muted/20">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full">{entry.version}</Badge>
              <span className="text-sm text-muted-foreground">{entry.date}</span>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {entry.changes.map((change) => (
                <li key={change} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />{change}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SearchCard({ search, setSearch }: { search: string; setSearch: (s: string) => void }) {
  return (
    <Card className="p-5 rounded-3xl border-border/60">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold">Search</h3>
      </div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Find a section, feature, API, or team member"
        className="mt-4 rounded-2xl"
      />
      <p className="mt-3 text-xs text-muted-foreground">Search filters the live sections on this page.</p>
    </Card>
  );
}

function LiveStatusCard({ docs }: { docs: DocsState }) {
  const stats = [
    { label: "Pitch sections", value: String(docs.live?.publicStats ? (docs.live.publicStats as { pitchSections?: number }).pitchSections ?? docs.pitchDeck.length : docs.pitchDeck.length) },
    { label: "Features", value: String(docs.live?.publicStats ? (docs.live.publicStats as { features?: number }).features ?? docs.featureMatrix.length : docs.featureMatrix.length) },
    { label: "Team members", value: String(docs.live?.publicStats ? (docs.live.publicStats as { teamMembers?: number }).teamMembers ?? docs.team.members.length : docs.team.members.length) },
    { label: "API endpoints", value: String(docs.live?.publicStats ? (docs.live.publicStats as { apiEndpoints?: number }).apiEndpoints ?? docs.apiDocumentation.length : docs.apiDocumentation.length) },
  ];
  return (
    <Card className="p-5 rounded-3xl border-border/60">
      <div className="flex items-center gap-2">
        <LineChart className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold">Live system view</h3>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <MetaStat key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground font-medium"><Clock3 className="w-4 h-4" /> Access window</div>
        <p className="mt-2">{docs.visibility.enabled ? "Enabled" : "Disabled"}</p>
        <p className="mt-1">{docs.visibility.startAt ?? "—"} → {docs.visibility.endAt ?? "—"}</p>
      </div>
    </Card>
  );
}

function AdminPanel({
  draft,
  setDraft,
  dragIndex,
  setDragIndex,
  onMovePitch,
  onUpdatePitch,
  onUpdateBullets,
  onUpdateTeam,
  onAddTeamMember,
  onRemoveTeamMember,
  onSaveVisibility,
  onSaveDraft,
  onPublish,
  saving,
}: {
  draft: DocsState;
  setDraft: Dispatch<SetStateAction<DocsState | null>>;
  dragIndex: number | null;
  setDragIndex: (index: number | null) => void;
  onMovePitch: (from: number, to: number) => void;
  onUpdatePitch: (index: number, key: "title" | "summary" | "eyebrow", value: string) => void;
  onUpdateBullets: (index: number, value: string) => void;
  onUpdateTeam: (index: number, key: keyof DocsMember, value: string) => void;
  onAddTeamMember: () => void;
  onRemoveTeamMember: (index: number) => void;
  onSaveVisibility: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  saving: boolean;
}) {
  return (
    <Card className="p-5 rounded-3xl border-border/60 bg-muted/20">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">Admin editor</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Visibility, scheduling, pitch deck order, and team showcase controls.</p>

      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-medium">Visibility</div>
              <div className="text-xs text-muted-foreground">Toggle on/off or schedule a publishing window.</div>
            </div>
            <Badge variant={draft.visibility.enabled ? "default" : "destructive"} className="rounded-full">
              {draft.visibility.enabled ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
              {draft.visibility.enabled ? "ON" : "OFF"}
            </Badge>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Publicly accessible</span>
            <button
              type="button"
              onClick={() => setDraft({ ...draft, visibility: { ...draft.visibility, enabled: !draft.visibility.enabled } })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${draft.visibility.enabled ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition ${draft.visibility.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledInput label="Start" type="datetime-local" value={toLocalDateTime(draft.visibility.startAt)} onChange={(value) => setDraft({ ...draft, visibility: { ...draft.visibility, startAt: fromLocalDateTime(value) } })} />
            <LabeledInput label="End" type="datetime-local" value={toLocalDateTime(draft.visibility.endAt)} onChange={(value) => setDraft({ ...draft, visibility: { ...draft.visibility, endAt: fromLocalDateTime(value) } })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledInput label="Timezone" value={draft.visibility.timezone ?? "UTC"} onChange={(value) => setDraft({ ...draft, visibility: { ...draft.visibility, timezone: value } })} />
            <LabeledInput label="Duration hours" type="number" value={draft.visibility.durationHours?.toString() ?? ""} onChange={(value) => setDraft({ ...draft, visibility: { ...draft.visibility, durationHours: value ? Number(value) : null } })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onSaveVisibility} disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> Apply visibility
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, visibility: { ...draft.visibility, startAt: "2026-06-10T00:00", endAt: "2026-06-14T23:59", enabled: true } })}>
              Default June window
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-medium">Pitch deck</div>
              <div className="text-xs text-muted-foreground">Drag sections to reorder, then edit the content inline.</div>
            </div>
            <Badge variant="secondary" className="rounded-full"><ArrowUpDown className="w-3 h-3 mr-1" /> Reorder</Badge>
          </div>
          <div className="space-y-3">
            {draft.pitchDeck.map((section, index) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex === null || dragIndex === index) return;
                  onMovePitch(dragIndex, index);
                  setDragIndex(null);
                }}
                className="rounded-2xl border border-border/60 bg-muted/20 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><GripVertical className="w-4 h-4" /> Section {index + 1}</div>
                  <Button variant="ghost" size="icon" onClick={() => onMovePitch(index, Math.max(index - 1, 0))} disabled={index === 0}>
                    <ArrowRight className="w-4 h-4 rotate-[-90deg]" />
                  </Button>
                </div>
                <div className="mt-3 grid gap-3">
                  <LabeledInput label="Eyebrow" value={section.eyebrow ?? ""} onChange={(value) => onUpdatePitch(index, "eyebrow", value)} />
                  <LabeledInput label="Title" value={section.title} onChange={(value) => onUpdatePitch(index, "title", value)} />
                  <LabeledTextarea label="Summary" value={section.summary ?? ""} onChange={(value) => onUpdatePitch(index, "summary", value)} rows={3} />
                  <LabeledTextarea label="Bullets (one per line)" value={(section.bullets ?? []).join("\n")} onChange={(value) => onUpdateBullets(index, value)} rows={4} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-medium">Team showcase</div>
              <div className="text-xs text-muted-foreground">Uniform cards with fallback avatars and contact details.</div>
            </div>
            <Button variant="outline" size="sm" onClick={onAddTeamMember}><Plus className="w-4 h-4 mr-2" /> Add member</Button>
          </div>
          <LabeledInput label="Team name" value={draft.team.name ?? ""} onChange={(value) => setDraft({ ...draft, team: { ...draft.team, name: value } })} />
          <div className="space-y-3">
            {draft.team.members.map((member, index) => (
              <div key={`${member.fullName}-${index}`} className="rounded-2xl border border-border/60 p-3 bg-muted/20">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium"><Users className="w-4 h-4" /> Member {index + 1}</div>
                  <Button variant="ghost" size="icon" onClick={() => onRemoveTeamMember(index)}><Trash2 className="w-4 h-4" /></Button>
                </div>
                <div className="grid gap-3">
                  <LabeledInput label="Photo URL" value={member.photoUrl ?? ""} onChange={(value) => onUpdateTeam(index, "photoUrl", value)} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <LabeledInput label="Full name" value={member.fullName} onChange={(value) => onUpdateTeam(index, "fullName", value)} />
                    <LabeledInput label="Role" value={member.role} onChange={(value) => onUpdateTeam(index, "role", value)} />
                  </div>
                  <LabeledInput label="Email" value={member.email} onChange={(value) => onUpdateTeam(index, "email", value)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onSaveDraft} disabled={saving}><Save className="w-4 h-4 mr-2" /> Save draft</Button>
          <Button variant="outline" onClick={onPublish} disabled={saving}><CheckCircle2 className="w-4 h-4 mr-2" /> Publish snapshot</Button>
        </div>
      </div>
    </Card>
  );
}

function DiagramCard({ title, source, nodes }: { title: string; source: string; nodes: string[] }) {
  const width = 640;
  const height = 180;
  const boxW = 120;
  const gap = 24;
  const startX = 20;
  const y = 55;
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">{title}</h3>
        <Badge variant="secondary" className="rounded-full">SVG</Badge>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full h-auto">
        {nodes.map((node, index) => {
          const x = startX + index * (boxW + gap);
          return (
            <g key={node}>
              <rect x={x} y={y} width={boxW} height="52" rx="16" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
              <text x={x + boxW / 2} y={y + 30} textAnchor="middle" fontSize="13" fill="#ffffff">{node}</text>
              {index < nodes.length - 1 && (
                <path d={`M ${x + boxW} ${y + 26} H ${x + boxW + gap - 2}`} stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrow)" />
              )}
            </g>
          );
        })}
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="hsl(var(--primary))" />
          </marker>
        </defs>
      </svg>
      {source && (
        <details className="mt-3 rounded-xl border border-border/60 bg-background p-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer text-foreground">Mermaid source</summary>
          <pre className="mt-2 whitespace-pre-wrap overflow-x-auto">{source}</pre>
        </details>
      )}
    </div>
  );
}

function DetailList({ title, data }: { title: string; data?: Record<string, string[]> }) {
  const items = data ? Object.entries(data) : [];
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
      <h3 className="font-medium">{title}</h3>
      <div className="mt-3 space-y-3 text-sm">
        {items.length ? items.map(([key, values]) => (
          <div key={key}>
            <div className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {values.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        )) : <p className="text-muted-foreground">No items yet.</p>}
      </div>
    </div>
  );
}

function InfoBox({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 p-4 bg-muted/20">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}<span>{title}</span></div>
      <p className="mt-3 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium break-words">{value}</div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, search }: { eyebrow: string; title: string; description: string; search?: string }) {
  return (
    <div>
      <Badge variant="secondary" className="rounded-full">{eyebrow}</Badge>
      <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 text-muted-foreground max-w-3xl">{description}{search ? ` · filtered by “${search}”` : ""}</p>
    </div>
  );
}

function FallbackAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return <div className="text-3xl font-semibold text-primary">{initials || "?"}</div>;
}

function LabeledInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl" />
    </label>
  );
}

function LabeledTextarea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="rounded-xl" />
    </label>
  );
}

function toLocalDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalDateTime(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}
