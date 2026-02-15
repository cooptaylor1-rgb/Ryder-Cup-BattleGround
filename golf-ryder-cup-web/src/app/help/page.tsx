'use client';

/**
 * Help & FAQ Page
 *
 * Searchable, collapsible FAQ covering: trip setup, scoring,
 * captain mode, side games, offline use, and troubleshooting.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Search,
  Shield,
  Target,
  Trophy,
  WifiOff,
  Users,
  Gamepad2,
  HelpCircle,
} from 'lucide-react';
import { PageHeader, BottomNav } from '@/components/layout';

// ============================================
// DATA
// ============================================

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

const FAQ_SECTIONS: FAQSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <HelpCircle size={18} />,
    items: [
      {
        q: 'How do I create a trip?',
        a: 'Tap the "+" button on the home screen and pick a template (Classic Ryder Cup, Mini Ryder Cup, etc.). Fill in your trip name, date, and team names, then tap "Create Trip." You\'ll land on the home page where you can start adding players.',
      },
      {
        q: 'How do I invite friends to join?',
        a: 'After creating a trip, use the "Share invite link" button in the setup card on your home screen. This copies a join link you can paste into your group text. Friends open the link and they\'re in.',
      },
      {
        q: 'How many players do I need?',
        a: 'A minimum of 4 (2 per team) is needed to create a session. A full Ryder Cup uses 12 per team (24 total), but any even number works. The Mini Ryder Cup template works well with 6–8 per team.',
      },
      {
        q: 'What\'s the difference between templates?',
        a: 'Classic Ryder Cup is 3 days with foursomes, fourball, and singles (28 points). Mini Ryder Cup is a 2-day weekend format (12 points). Buddies Cup is a single day (6 points). Tap "Details" on any template to see the full session breakdown.',
      },
    ],
  },
  {
    id: 'captain-mode',
    title: 'Captain Mode',
    icon: <Shield size={18} />,
    items: [
      {
        q: 'What is captain mode?',
        a: 'Captain mode gives one person (the trip organizer) control over lineup creation, session management, and match setup. The captain sets a PIN so only they can make structural changes. Everyone else can still score matches normally.',
      },
      {
        q: 'How do I set my captain PIN?',
        a: 'Go to More → Captain Mode and set a 4-digit PIN. This PIN is securely hashed on your device — we never store it in plain text. Share it only with people you trust to manage the trip.',
      },
      {
        q: 'What can only the captain do?',
        a: 'Create and edit sessions, build lineups, assign players to matches, lock/unlock sessions, correct scores on completed holes, and manage the overall trip structure. Regular players can score their own matches.',
      },
      {
        q: 'Can I have co-captains?',
        a: 'Anyone with the captain PIN can enter captain mode, so you can share the PIN with one or two trusted co-captains. Just share the PIN directly — anyone who enters it gets captain access.',
      },
    ],
  },
  {
    id: 'scoring',
    title: 'Scoring',
    icon: <Target size={18} />,
    items: [
      {
        q: 'How do I score a match?',
        a: 'Go to the Score tab, find your match, and tap it. You\'ll see 5 scoring modes: Swipe (flick left/right for each team), Buttons (tap the winner), Strokes (enter actual scores), Best Ball (for fourball), and One-Hand (extra large buttons for use on the course).',
      },
      {
        q: 'Can I change a score after entering it?',
        a: 'Yes! Use the Undo button in the top-right of the scoring screen to undo the last entry. Captains can also correct any hole on a completed match by tapping "Edit Scores" on the match complete screen.',
      },
      {
        q: 'What does "Dormie" mean?',
        a: 'A match is dormie when one team is up by exactly the number of holes remaining. For example, 2 UP with 2 to play. The trailing team must win every remaining hole to halve the match.',
      },
      {
        q: 'How are handicap strokes applied?',
        a: 'The app follows USGA handicap allowance: 100% of the difference in singles, 90% in fourball, 50% in foursomes. Strokes are applied to holes based on the course handicap ranking (hardest holes get strokes first).',
      },
      {
        q: 'What is match play scoring?',
        a: 'In match play, you win individual holes rather than counting total strokes. The team that wins a hole goes "1 UP." The match ends when one team is up by more holes than remain (e.g., "3&2" means 3 up with 2 to play). If tied after 18, it\'s "halved" and each team gets ½ point.',
      },
    ],
  },
  {
    id: 'side-games',
    title: 'Side Games',
    icon: <Gamepad2 size={18} />,
    items: [
      {
        q: 'What side games are available?',
        a: 'Skins (win a hole outright to collect the pot), Nassau (front 9 + back 9 + overall), Wolf (rotating team selection), Vegas (digit-based team scoring), and Hammer (double-or-nothing press format).',
      },
      {
        q: 'How do side game payouts work?',
        a: 'The Settle Up tab under Bets & Side Games calculates who owes what based on game results. You can track payments and mark them as settled. The app is a calculator — no real money moves through it.',
      },
    ],
  },
  {
    id: 'standings',
    title: 'Standings & Awards',
    icon: <Trophy size={18} />,
    items: [
      {
        q: 'How are team points calculated?',
        a: 'Each match is worth 1 point. The winning team gets 1, the losing team gets 0. A halved match gives ½ point to each team. Total points across all sessions determine the overall winner.',
      },
      {
        q: 'What is the "Magic Number"?',
        a: 'The magic number shows how many more points the leading team needs to clinch the cup. When it reaches 0, that team has won and a victory banner appears.',
      },
      {
        q: 'What awards are given?',
        a: 'MVP (best overall impact), Best Record (highest win percentage), Most Wins (total match wins), Biggest Win (largest margin), Iron Man (most matches played), and more. Awards are calculated automatically from match results.',
      },
    ],
  },
  {
    id: 'offline',
    title: 'Offline & Sync',
    icon: <WifiOff size={18} />,
    items: [
      {
        q: 'Does the app work without internet?',
        a: 'Yes! The app is fully offline-capable. All your scores save to your device immediately. When you reconnect, they sync automatically. You\'ll see a sync indicator in the score page header showing the current state.',
      },
      {
        q: 'What if I lose signal during a round?',
        a: 'Keep scoring normally. Everything saves locally. When signal returns, the app syncs in the background. You\'ll see "Syncing..." then "Synced" in the header. If sync fails, a retry button appears.',
      },
      {
        q: 'How do I back up my data?',
        a: 'Go to More → Backup & Data. You can export your trip as a JSON file and import it on another device. Your data also syncs to the cloud when online.',
      },
    ],
  },
  {
    id: 'teams',
    title: 'Teams & Players',
    icon: <Users size={18} />,
    items: [
      {
        q: 'How do I assign players to teams?',
        a: 'Use the captain draft tool (Captain → Draft) to drag players onto each team. You can also assign teams in bulk when adding players. Teams need balanced rosters before you can create sessions.',
      },
      {
        q: 'Can I change a player\'s handicap mid-trip?',
        a: 'Yes. Go to More → Captain → Manage and edit any player\'s handicap. Changes apply to future matches only — completed match handicap calculations are preserved.',
      },
    ],
  },
];

// ============================================
// COMPONENTS
// ============================================

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[var(--rule)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-3 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-[length:var(--text-sm)] font-medium text-[var(--ink)]">{item.q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 mt-0.5 text-[var(--ink-tertiary)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="pb-4 -mt-1">
          <p className="text-[length:var(--text-sm)] leading-relaxed text-[var(--ink-secondary)]">
            {item.a}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function HelpPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_SECTIONS;

    const q = searchQuery.toLowerCase();
    return FAQ_SECTIONS
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Help & FAQ"
        icon={<HelpCircle size={16} className="text-[var(--masters)]" />}
        onBack={() => router.back()}
      />

      <main className="container-editorial pt-6 pb-12">
        {/* Search */}
        <div className="relative mb-8">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help topics..."
            className="input w-full pl-10"
          />
        </div>

        {/* FAQ Sections */}
        {filteredSections.length > 0 ? (
          <div className="space-y-8">
            {filteredSections.map((section) => (
              <section key={section.id}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[var(--masters)]">{section.icon}</span>
                  <h2 className="type-overline">{section.title}</h2>
                </div>
                <div className="card-editorial" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="px-4">
                    {section.items.map((item, i) => (
                      <FAQAccordion key={i} item={item} />
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Search size={40} className="mx-auto mb-4 text-[var(--ink-tertiary)] opacity-40" />
            <p className="type-title-sm text-[var(--ink-secondary)]">No results found</p>
            <p className="type-caption text-[var(--ink-tertiary)] mt-1">
              Try different keywords or browse all topics above.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink)]"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Contact */}
        <div className="mt-12 text-center">
          <p className="type-caption text-[var(--ink-tertiary)]">
            Still need help? Reach out to your trip captain or visit the
            project repository for technical support.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
