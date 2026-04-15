'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Gamepad2,
  HelpCircle,
  Search,
  Shield,
  Target,
  Trophy,
  Users,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: FAQItem[];
}

const FAQ_SECTIONS: FAQSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    icon: HelpCircle,
    items: [
      {
        q: 'How do I create a trip?',
        a: 'Tap the plus button on the home screen and choose a template. Add your trip name, dates, and team names, then create the trip and start building the roster.',
      },
      {
        q: 'How do I invite friends to join?',
        a: 'Open the captain invite desk and share the join link or QR code. Players can use the link or type the join code manually.',
      },
      {
        q: 'How many players do I need?',
        a: 'You need at least four players to build a session, but the templates scale. A full Ryder Cup can run all the way up to 12 per side.',
      },
      {
        q: 'What do the templates change?',
        a: 'They define the session mix, match count, and expected trip length. Classic is the full three-day shape, while mini and single-day templates compress it.',
      },
    ],
  },
  {
    id: 'captain-mode',
    title: 'Captain mode',
    icon: Shield,
    items: [
      {
        q: 'What is captain mode?',
        a: 'Captain mode unlocks structural controls: sessions, lineups, roster management, match setup, and corrections. Regular players can still score matches without it.',
      },
      {
        q: 'How do I set my captain PIN?',
        a: 'Open More and enable captain mode with a four-digit PIN. The PIN is stored locally and only the people with it can enter captain controls on that device.',
      },
      {
        q: 'What can only the captain do?',
        a: 'Captains manage sessions, lineups, player assignments, match setup, and corrections to completed cards. That keeps the competition structure from drifting.',
      },
      {
        q: 'Can we have co-captains?',
        a: 'Yes. Anyone with the captain PIN can enter captain mode, so the app supports shared control as long as the group shares the code intentionally.',
      },
    ],
  },
  {
    id: 'scoring',
    title: 'Scoring',
    icon: Target,
    items: [
      {
        q: 'How do I score a match?',
        a: 'Open Score, choose the match, and use the mode that fits the moment: swipe, buttons, strokes, best ball, or one-hand mode.',
      },
      {
        q: 'Can I change a score after entering it?',
        a: 'Yes. Players can undo the latest action, and captains can correct completed cards from the captain controls when the round needs an official fix.',
      },
      {
        q: 'What does dormie mean?',
        a: 'Dormie means the trailing side has exactly the same number of holes left as the deficit. If you are 2 down with 2 to play, you are dormie.',
      },
      {
        q: 'How are handicap strokes applied?',
        a: 'The app uses match-play handicap allowances and applies strokes to the hardest holes first based on the selected format and course data.',
      },
      {
        q: 'How does match play scoring work?',
        a: 'You win holes, not the total stroke count. The match ends once a side leads by more holes than remain, or it is halved after 18 if nobody finishes ahead.',
      },
    ],
  },
  {
    id: 'side-games',
    title: 'Side games',
    icon: Gamepad2,
    items: [
      {
        q: 'What side games are available?',
        a: 'The app supports common trip games like skins, Nassau, closest to the pin, long drive, and custom side bets the group wants to track.',
      },
      {
        q: 'How do payouts work?',
        a: 'The app tracks the ledger and helps settle who owes what. It is a calculator and trip record, not a money-transfer platform.',
      },
    ],
  },
  {
    id: 'standings',
    title: 'Standings and awards',
    icon: Trophy,
    items: [
      {
        q: 'How are team points calculated?',
        a: 'Each match is worth one point. Wins earn one, losses earn zero, and halved matches award a half-point to each side.',
      },
      {
        q: 'What is the magic number?',
        a: 'It is how many more points the leading team needs to clinch the cup. Once it reaches zero, the result is no longer catchable.',
      },
      {
        q: 'What awards are available?',
        a: 'The app tracks common end-of-trip awards like best record, most wins, MVP, biggest margin, and a few trip-stat style superlatives.',
      },
    ],
  },
  {
    id: 'offline',
    title: 'Offline and sync',
    icon: WifiOff,
    items: [
      {
        q: 'Does the app work without internet?',
        a: 'Yes. The app is offline-first. Scoring and local trip actions keep working, then sync resumes when the device reconnects.',
      },
      {
        q: 'What happens if I lose signal during a round?',
        a: 'Keep scoring. The app stores the work locally and syncs later. That is exactly the kind of day the architecture is supposed to survive.',
      },
      {
        q: 'How do I back up my data?',
        a: 'Use the backup settings to export the trip. In cloud mode, synced trip data also has a server-side home once the device reconnects.',
      },
    ],
  },
  {
    id: 'teams',
    title: 'Teams and players',
    icon: Users,
    items: [
      {
        q: 'How do I assign players to teams?',
        a: 'Use the draft room or roster management screens to assign players before building sessions and lineups.',
      },
      {
        q: 'Can I change a player handicap mid-trip?',
        a: 'Yes, but those changes should affect future cards. Completed matches should stay tied to the context they were played under.',
      },
    ],
  },
];

export default function HelpPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return FAQ_SECTIONS;
    }

    const query = searchQuery.toLowerCase();
    return FAQ_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => item.q.toLowerCase().includes(query) || item.a.toLowerCase().includes(query)
      ),
    })).filter((section) => section.items.length > 0);
  }, [searchQuery]);

  const totalMatches = filteredSections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Help"
        subtitle="Guidebook and support"
        icon={<HelpCircle size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
        backFallback="/"
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,240,241,0.99))] shadow-[0_26px_56px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Support Deck</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.2rem)] italic leading-[1.02] text-[var(--ink)]">
                The guidebook should read like a caddie book, not a shrug.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[36rem] text-sm leading-7 text-[var(--ink-secondary)]">
                Golf trips move too fast for scavenger-hunt support. This room is for the common questions,
                the scoring edge cases, and the small bits of captain logic that players always need five
                minutes before the round.
              </p>

              <div className="relative mt-[var(--space-5)]">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search help topics..."
                  className="w-full rounded-[1.2rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/86 py-[0.95rem] pl-11 pr-4 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--maroon)]"
                />
              </div>

              {searchQuery ? (
                <div className="mt-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-3)]">
                  <p className="text-sm text-[var(--ink-secondary)]">
                    {totalMatches} answer{totalMatches === 1 ? '' : 's'} across {filteredSections.length} section{filteredSections.length === 1 ? '' : 's'}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                    Clear search
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <HelpFactCard label="Topics" value={FAQ_SECTIONS.length} detail="The core rooms players actually need." />
              <HelpFactCard label="Answers" value={FAQ_SECTIONS.reduce((sum, section) => sum + section.items.length, 0)} detail="Questions already settled before the first tee." />
              <HelpFactCard label="Best starting point" value="Search" detail="When the group is in a hurry, start there." valueClassName="font-sans text-[1rem] not-italic leading-[1.25]" />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.1fr)_18rem]">
          <div className="space-y-[var(--space-4)]">
            <section className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
              <div className="flex flex-wrap gap-[var(--space-3)]">
                {FAQ_SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => {
                      const node = document.getElementById(section.id);
                      node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 px-4 py-2 text-sm font-medium text-[var(--ink)] transition-transform duration-150 hover:scale-[1.01] hover:border-[var(--maroon-subtle)]"
                  >
                    <section.icon size={15} className="text-[var(--maroon)]" />
                    {section.title}
                  </button>
                ))}
              </div>
            </section>

            {filteredSections.length > 0 ? (
              filteredSections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="rounded-[1.85rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]"
                >
                  <div className="flex items-center gap-[var(--space-3)]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[color:var(--maroon)]/10 text-[var(--maroon)]">
                      <section.icon size={18} />
                    </div>
                    <div>
                      <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">FAQ Section</p>
                      <h2 className="mt-[2px] font-serif text-[1.75rem] italic text-[var(--ink)]">
                        {section.title}
                      </h2>
                    </div>
                  </div>

                  <div className="mt-[var(--space-4)] divide-y divide-[color:var(--rule)]/65 rounded-[1.4rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 px-[var(--space-4)]">
                    {section.items.map((item) => (
                      <FAQAccordion key={item.q} item={item} />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <section className="rounded-[1.85rem] border border-dashed border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.98))] p-[var(--space-6)] text-center shadow-[0_18px_38px_rgba(41,29,17,0.05)]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[var(--surface-raised)] text-[var(--ink-tertiary)]">
                  <Search size={18} />
                </div>
                <h2 className="mt-[var(--space-3)] text-lg font-semibold text-[var(--ink)]">
                  No help topics match that search.
                </h2>
                <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">
                  Try a simpler keyword or clear the search and browse the guidebook sections above.
                </p>
                <div className="mt-[var(--space-4)]">
                  <Button variant="secondary" onClick={() => setSearchQuery('')}>
                    Clear search
                  </Button>
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-[var(--space-4)]">
            <HelpSidebarCard
              title="Start with search"
              body="The right support pattern on a golf trip is speed. Players should be able to type one term, get one answer, and get back to the round."
              icon={<Search size={18} />}
            />
            <HelpSidebarCard
              title="Captain questions deserve plain language"
              body="A rules explanation can be precise without sounding like a committee memo. The best support copy settles the issue and moves on."
              icon={<Shield size={18} />}
              tone="maroon"
            />
          </aside>
        </section>
      </main>
    </div>
  );
}

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-[var(--space-3)] py-[var(--space-4)] text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold leading-6 text-[var(--ink)]">{item.q}</span>
        <ChevronDown
          size={16}
          className={cn(
            'mt-[2px] shrink-0 text-[var(--ink-tertiary)] transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
      {open ? (
        <div className="pb-[var(--space-4)]">
          <p className="text-sm leading-7 text-[var(--ink-secondary)]">{item.a}</p>
        </div>
      ) : null}
    </div>
  );
}

function HelpFactCard({
  label,
  value,
  detail,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.55rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 p-[var(--space-4)] shadow-[0_14px_28px_rgba(41,29,17,0.05)]">
      <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <div className={cn('mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--ink)]', valueClassName)}>
        {value}
      </div>
      <p className="mt-[var(--space-2)] text-xs leading-5 text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function HelpSidebarCard({
  title,
  body,
  icon,
  tone = 'ink',
}: {
  title: string;
  body: string;
  icon: ReactNode;
  tone?: 'ink' | 'maroon';
}) {
  return (
    <aside
      className={cn(
        'rounded-[1.8rem] border p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]',
        tone === 'maroon'
          ? 'border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,240,241,0.99))]'
          : 'border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))]'
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[var(--surface-raised)] text-[var(--ink-tertiary)]">
        {icon}
      </div>
      <h3 className="mt-[var(--space-3)] font-serif text-[1.6rem] italic text-[var(--ink)]">{title}</h3>
      <p className="mt-[var(--space-3)] text-sm leading-7 text-[var(--ink-secondary)]">{body}</p>
    </aside>
  );
}
