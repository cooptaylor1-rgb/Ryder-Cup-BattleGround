import type { MatchStandingData } from './pdfExportTypes';

export function getPDFStyles(): string {
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

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

export function formatStatus(match: MatchStandingData): string {
  if (match.status === 'complete') return 'Complete';
  if (match.status === 'in-progress') return `Hole ${match.currentHole || 1}`;
  return 'Upcoming';
}

export function formatGeneratedOn(date = new Date()): string {
  return date.toLocaleDateString();
}
