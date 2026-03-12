import { generatePlayerStatsHTML, generateScorecardHTML, generateStandingsHTML } from './pdfExportSections';
import { slugify } from './pdfExportLayout';
import type { PlayerStatsData, ScorecardData, StandingsData } from './pdfExportTypes';

export function exportScorecardDocument(data: ScorecardData): void {
  const html = generateScorecardHTML(data);
  printToPDF(html, `scorecard-${slugify(data.player1.name)}-vs-${slugify(data.player2.name)}`);
}

export function exportStandingsDocument(data: StandingsData): void {
  const html = generateStandingsHTML(data);
  printToPDF(html, `standings-${slugify(data.tripName)}`);
}

export function exportPlayerStatsDocument(data: PlayerStatsData): void {
  const html = generatePlayerStatsHTML(data);
  printToPDF(html, `stats-${slugify(data.playerName)}`);
}

export function printToPDF(html: string, _filename: string): void {
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
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

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
}
