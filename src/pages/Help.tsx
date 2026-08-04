import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, MousePointerClick, Cog, AlertCircle, CalendarCheck, ShieldCheck } from 'lucide-react';
import {
  walkthroughIntro,
  walkthroughSections,
  roleRows,
  rhythmGroups,
} from '@/content/walkthrough';

export default function Help() {
  const [activeId, setActiveId] = useState<string>(walkthroughSections[0].id);

  const scrollTo = (id: string) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <Badge variant="secondary" className="rounded-full">Help &amp; Guide</Badge>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          {walkthroughIntro.title}
        </h1>
        <p className="text-sm font-medium text-muted-foreground">{walkthroughIntro.tagline}</p>
        <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed">
          {walkthroughIntro.body}
        </p>
      </header>

      {/* Mobile section picker */}
      <div className="lg:hidden">
        <Select value={activeId} onValueChange={scrollTo}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Jump to a chapter" />
          </SelectTrigger>
          <SelectContent>
            {walkthroughSections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.chapter}. {s.title}
              </SelectItem>
            ))}
            <SelectItem value="roles">Who can do what</SelectItem>
            <SelectItem value="rhythm">Ram&apos;s rhythm</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-6">
        {/* Desktop section nav */}
        <nav className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-4 space-y-1">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Chapters
            </p>
            {walkthroughSections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  activeId === s.id
                    ? 'bg-accent font-semibold text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50'
                }`}
              >
                <span className="mr-2 text-xs opacity-60">{s.chapter}</span>
                {s.title}
              </button>
            ))}
            <Separator className="my-2" />
            <button
              onClick={() => scrollTo('roles')}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent/50"
            >
              Who can do what
            </button>
            <button
              onClick={() => scrollTo('rhythm')}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent/50"
            >
              Ram&apos;s rhythm
            </button>
          </div>
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-6">
          {walkthroughSections.map((s) => (
            <Card key={s.id} id={s.id} className="rounded-2xl shadow-md scroll-mt-4">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {s.chapter}
                  </span>
                  <CardTitle className="text-lg">{s.title}</CardTitle>
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {s.subtitle}
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex gap-3 rounded-xl bg-accent/40 p-3">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm leading-relaxed">{s.want}</p>
                </div>

                <section className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <MousePointerClick className="h-4 w-4 text-primary" />
                    Where Ram clicks
                  </h3>
                  <ol className="space-y-2 pl-1">
                    {s.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-foreground">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Cog className="h-4 w-4 text-primary" />
                    What the system does
                  </h3>
                  <ul className="space-y-1.5">
                    {s.behind.map((b, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">Remember: </span>
                    {s.gotcha}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Roles */}
          <Card id="roles" className="rounded-2xl shadow-md scroll-mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Who can do what
              </CardTitle>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Roles and what changes on screen
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {roleRows.map((r) => (
                <div key={r.role} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold">{r.role}</p>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{r.canDo}</p>
                  <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed">
                    {r.onScreen}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Rhythm */}
          <Card id="rhythm" className="rounded-2xl shadow-md scroll-mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarCheck className="h-4 w-4 text-primary" />
                Ram&apos;s rhythm
              </CardTitle>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                A one-page checklist
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {rhythmGroups.map((g) => (
                <div key={g.cadence} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold">{g.cadence}</p>
                  <ul className="mt-2 space-y-1.5">
                    {g.items.map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
