/**
 * PDF Export Service
 *
 * Production-ready PDF generation for:
 * - Scorecards
 * - Match results
 * - Trip standings
 * - Player statistics
 *
 * Uses browser's print functionality with custom styles for best quality.
 */

// ============================================
// TYPES
// ============================================

export interface ScorecardData {
  tripName: string;
  courseName: string;
  date: string;
  format: string;
  player1: PlayerScoreData;
  player2: PlayerScoreData;
  result: string;
}

export interface PlayerScoreData {
  name: string;
  team: 'USA' | 'Europe';
  handicap?: number;
  scores: (number | null)[];
  frontNine: number;
  backNine: number;
  total: number;
}

export interface StandingsData {
  tripName: string;
  date: string;
  usaScore: number;
  europeScore: number;
  matches: MatchStandingData[];
  pointsToWin: number;
}

export interface MatchStandingData {
  player1: string;
  player2: string;
  team1: 'USA' | 'Europe';
  team2: 'USA' | 'Europe';
  status: 'complete' | 'in-progress' | 'upcoming';
  result?: string;
  currentHole?: number;
}

export interface PlayerStatsData {
  playerName: string;
  tripName: string;
  team: 'USA' | 'Europe';
  stats: {
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    matchesTied: number;
    pointsEarned: number;
    averageScore: number;
    bestScore: number;
    worstScore: number;
    birdies: number;
    pars: number;
    bogeys: number;
  };
}

// ============================================
// PDF GENERATION
// ============================================

/**
 * Generate and download a PDF scorecard
 */
export function exportScorecard(data: ScorecardData): void {
  const html = generateScorecardHTML(data);
  printToPDF(html, `scorecard-${slugify(data.player1.name)}-vs-${slugify(data.player2.name)}`);
}

/**
 * Generate and download standings PDF
 */
export function exportStandings(data: StandingsData): void {
  const html = generateStandingsHTML(data);
  printToPDF(html, `standings-${slugify(data.tripName)}`);
}

/**
 * Generate and download player stats PDF
 */
export function exportPlayerStats(data: PlayerStatsData): void {
  const html = generatePlayerStatsHTML(data);
  printToPDF(html, `stats-${slugify(data.playerName)}`);
}

// ============================================
// HTML TEMPLATES
// ============================================

function generateScorecardHTML(data: ScorecardData): string {
  const holes = Array.from({ length: 18 }, (_, i) => i + 1);
  const frontHoles = holes.slice(0, 9);
  const backHoles = holes.slice(9, 18);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Scorecard - ${data.player1.name} vs ${data.player2.name}</title>
  <style>${getPDFStyles()}</style>
</head>
<body>
  <div class="scorecard">
    <header class="header">
      <div class="header-left">
        <h1 class="title">${data.tripName}</h1>
        <p class="subtitle">${data.courseName} • ${data.date}</p>
      </div>
      <div class="header-right">
        <span class="format">${data.format}</span>
      </div>
    </header>

    <div class="players">
      <div class="player ${data.player1.team.toLowerCase()}">
        <span class="flag">${data.player1.team === 'USA' ? '🇺🇸' : '🇪🇺'}</span>
        <span class="name">${data.player1.name}</span>
        ${data.player1.handicap ? `<span class="handicap">HCP: ${data.player1.handicap}</span>` : ''}
      </div>
      <div class="vs">vs</div>
      <div class="player ${data.player2.team.toLowerCase()}">
        <span class="flag">${data.player2.team === 'USA' ? '🇺🇸' : '🇪🇺'}</span>
        <span class="name">${data.player2.name}</span>
        ${data.player2.handicap ? `<span class="handicap">HCP: ${data.player2.handicap}</span>` : ''}
      </div>
    </div>

    <table class="scores-table">
      <thead>
        <tr>
          <th>Hole</th>
          ${frontHoles.map(h => `<th>${h}</th>`).join('')}
          <th class="total">Out</th>
          ${backHoles.map(h => `<th>${h}</th>`).join('')}
          <th class="total">In</th>
          <th class="total">Tot</th>
        </tr>
      </thead>
      <tbody>
        <tr class="${data.player1.team.toLowerCase()}">
          <td class="player-name">${data.player1.name}</td>
          ${data.player1.scores.slice(0, 9).map(s => `<td>${s ?? '-'}</td>`).join('')}
          <td class="total">${data.player1.frontNine}</td>
          ${data.player1.scores.slice(9, 18).map(s => `<td>${s ?? '-'}</td>`).join('')}
          <td class="total">${data.player1.backNine}</td>
          <td class="total grand">${data.player1.total}</td>
        </tr>
        <tr class="${data.player2.team.toLowerCase()}">
          <td class="player-name">${data.player2.name}</td>
          ${data.player2.scores.slice(0, 9).map(s => `<td>${s ?? '-'}</td>`).join('')}
          <td class="total">${data.player2.frontNine}</td>
          ${data.player2.scores.slice(9, 18).map(s => `<td>${s ?? '-'}</td>`).join('')}
          <td class="total">${data.player2.backNine}</td>
          <td class="total grand">${data.player2.total}</td>
        </tr>
      </tbody>
    </table>

    <div class="result">
      <span class="result-label">Result:</span>
      <span class="result-value">${data.result}</span>
    </div>

    <footer class="footer">
      <p>Generated by Golf Ryder Cup App • ${new Date().toLocaleDateString()}</p>
    </footer>
  </div>
</body>
</html>
  `;
}

function generateStandingsHTML(data: StandingsData): string {
  const leader = data.usaScore > data.europeScore ? 'USA' : data.europeScore > data.usaScore ? 'Europe' : 'Tied';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Standings - ${data.tripName}</title>
  <style>${getPDFStyles()}</style>
</head>
<body>
  <div class="standings">
    <header class="header">
      <h1 class="title">${data.tripName}</h1>
      <p class="subtitle">Standings as of ${data.date}</p>
    </header>

    <div class="score-display">
      <div class="team usa ${leader === 'USA' ? 'leading' : ''}">
        <span class="flag">🇺🇸</span>
        <span class="team-name">USA</span>
        <span class="score">${data.usaScore}</span>
      </div>
      <div class="divider">-</div>
      <div class="team europe ${leader === 'Europe' ? 'leading' : ''}">
        <span class="score">${data.europeScore}</span>
        <span class="team-name">Europe</span>
        <span class="flag">🇪🇺</span>
      </div>
    </div>

    <p class="points-needed">${data.pointsToWin} points needed to win</p>

    <h2>Match Results</h2>
    <table class="matches-table">
      <thead>
        <tr>
          <th>Match</th>
          <th>Status</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        ${data.matches.map(match => `
          <tr>
            <td>
              <span class="player ${match.team1.toLowerCase()}">${match.player1}</span>
              <span class="vs">vs</span>
              <span class="player ${match.team2.toLowerCase()}">${match.player2}</span>
            </td>
            <td class="status ${match.status}">${formatStatus(match)}</td>
            <td class="result">${match.result || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <footer class="footer">
      <p>Generated by Golf Ryder Cup App • ${new Date().toLocaleDateString()}</p>
    </footer>
  </div>
</body>
</html>
  `;
}

function generatePlayerStatsHTML(data: PlayerStatsData): string {
  const winRate = data.stats.matchesPlayed > 0
    ? Math.round((data.stats.matchesWon / data.stats.matchesPlayed) * 100)
    : 0;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Player Stats - ${data.playerName}</title>
  <style>${getPDFStyles()}</style>
</head>
<body>
  <div class="player-stats">
    <header class="header">
      <h1 class="title">${data.playerName}</h1>
      <p class="subtitle">${data.tripName} • Team ${data.team}</p>
      <span class="flag large">${data.team === 'USA' ? '🇺🇸' : '🇪🇺'}</span>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">${data.stats.matchesPlayed}</span>
        <span class="stat-label">Matches Played</span>
      </div>
      <div class="stat-card highlight">
        <span class="stat-value">${data.stats.matchesWon}</span>
        <span class="stat-label">Wins</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${data.stats.matchesLost}</span>
        <span class="stat-label">Losses</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${data.stats.matchesTied}</span>
        <span class="stat-label">Ties</span>
      </div>
      <div class="stat-card large">
        <span class="stat-value">${winRate}%</span>
        <span class="stat-label">Win Rate</span>
      </div>
      <div class="stat-card large highlight">
        <span class="stat-value">${data.stats.pointsEarned}</span>
        <span class="stat-label">Points Earned</span>
      </div>
    </div>

    <h2>Scoring Statistics</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">${data.stats.averageScore}</span>
        <span class="stat-label">Average Score</span>
      </div>
      <div class="stat-card good">
        <span class="stat-value">${data.stats.bestScore}</span>
        <span class="stat-label">Best Score</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${data.stats.worstScore}</span>
        <span class="stat-label">Worst Score</span>
      </div>
    </div>

    <h2>Hole Performance</h2>
    <div class="stats-grid">
      <div class="stat-card good">
        <span class="stat-value">${data.stats.birdies}</span>
        <span class="stat-label">Birdies</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${data.stats.pars}</span>
        <span class="stat-label">Pars</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${data.stats.bogeys}</span>
        <span class="stat-label">Bogeys+</span>
      </div>
    </div>

    <footer class="footer">
      <p>Generated by Golf Ryder Cup App • ${new Date().toLocaleDateString()}</p>
    </footer>
  </div>
</body>
</html>
  `;
}

// ============================================
// STYLES
// ============================================

function getPDFStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      color: #1a1a1a;
      background: white;
      padding: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #006747;
    }

    .title {
      font-size: 28px;
      font-weight: 700;
      color: #006747;
    }

    .subtitle {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }

    .format {
      background: #006747;
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .flag {
      font-size: 24px;
    }

    .flag.large {
      font-size: 48px;
      position: absolute;
      right: 20px;
      top: 20px;
      opacity: 0.3;
    }

    /* Players */
    .players {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      margin-bottom: 24px;
    }

    .player {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-radius: 8px;
    }

    .player.usa {
      background: #f0f4ff;
      border: 2px solid #0a3161;
    }

    .player.europe {
      background: #fff7e6;
      border: 2px solid #003399;
    }

    .player .name {
      font-weight: 600;
      font-size: 16px;
    }

    .player .handicap {
      font-size: 12px;
      color: #666;
    }

    .vs {
      font-size: 14px;
      color: #999;
      font-weight: 600;
    }

    /* Scores Table */
    .scores-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 12px;
    }

    .scores-table th,
    .scores-table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: center;
    }

    .scores-table th {
      background: #006747;
      color: white;
      font-weight: 600;
    }

    .scores-table .player-name {
      text-align: left;
      font-weight: 600;
      white-space: nowrap;
    }

    .scores-table tr.usa {
      background: #f8faff;
    }

    .scores-table tr.europe {
      background: #fffbf5;
    }

    .scores-table .total {
      background: #f0f0f0;
      font-weight: 600;
    }

    .scores-table .grand {
      background: #006747;
      color: white;
    }

    /* Result */
    .result {
      text-align: center;
      padding: 16px;
      background: #f9f9f9;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .result-label {
      font-size: 14px;
      color: #666;
    }

    .result-value {
      font-size: 24px;
      font-weight: 700;
      color: #006747;
      margin-left: 8px;
    }

    /* Standings */
    .score-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 32px;
      margin-bottom: 24px;
      padding: 24px;
      background: #f9f9f9;
      border-radius: 12px;
    }

    .team {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .team.usa { flex-direction: row; }
    .team.europe { flex-direction: row-reverse; }

    .team-name {
      font-size: 18px;
      font-weight: 600;
    }

    .team .score {
      font-size: 48px;
      font-weight: 700;
    }

    .team.usa .score { color: #0a3161; }
    .team.europe .score { color: #003399; }

    .team.leading .score {
      color: #c9a227;
    }

    .divider {
      font-size: 32px;
      color: #ccc;
    }

    .points-needed {
      text-align: center;
      color: #666;
      margin-bottom: 32px;
    }

    /* Matches Table */
    .matches-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    .matches-table th,
    .matches-table td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }

    .matches-table th {
      background: #006747;
      color: white;
    }

    .matches-table .status {
      text-transform: capitalize;
    }

    .matches-table .status.complete { color: #006747; }
    .matches-table .status.in-progress { color: #c9a227; }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      padding: 20px;
      background: #f9f9f9;
      border-radius: 8px;
      text-align: center;
    }

    .stat-card.large {
      grid-column: span 1;
    }

    .stat-card.highlight {
      background: #e8f5e9;
      border: 2px solid #006747;
    }

    .stat-card.good {
      background: #e3f2fd;
    }

    .stat-value {
      display: block;
      font-size: 32px;
      font-weight: 700;
      color: #006747;
    }

    .stat-label {
      display: block;
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }

    h2 {
      font-size: 18px;
      color: #333;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #eee;
    }

    /* Footer */
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #999;
      font-size: 12px;
    }

    /* Print styles */
    @media print {
      body { padding: 0; }
      @page { margin: 0.5in; }
    }
  `;
}

// ============================================
// UTILITIES
// ============================================

function printToPDF(html: string, _filename: string): void {
  // Create a new window/iframe for printing
  // Note: filename is currently unused but preserved for future implementation
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    // Fallback: create iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      // Wait for content to load, then print
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
      }, 500);
    }
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

function formatStatus(match: MatchStandingData): string {
  if (match.status === 'complete') return 'Complete';
  if (match.status === 'in-progress') return `Hole ${match.currentHole || 1}`;
  return 'Upcoming';
}

// ============================================
// REACT HOOK
// ============================================

import { useCallback } from 'react';

export interface UsePDFExportReturn {
  exportScorecard: (data: ScorecardData) => void;
  exportStandings: (data: StandingsData) => void;
  exportPlayerStats: (data: PlayerStatsData) => void;
}

export function usePDFExport(): UsePDFExportReturn {
  const handleExportScorecard = useCallback((data: ScorecardData) => {
    exportScorecard(data);
  }, []);

  const handleExportStandings = useCallback((data: StandingsData) => {
    exportStandings(data);
  }, []);

  const handleExportPlayerStats = useCallback((data: PlayerStatsData) => {
    exportPlayerStats(data);
  }, []);

  return {
    exportScorecard: handleExportScorecard,
    exportStandings: handleExportStandings,
    exportPlayerStats: handleExportPlayerStats,
  };
}

export default usePDFExport;
