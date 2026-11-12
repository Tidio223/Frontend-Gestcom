/**
 * Impression autonome GestCom.
 *
 * PRINT_CSS est une feuille de style dédiée (fond blanc, texte noir, Arial,
 * vrais tableaux avec bordures). Elle est embarquée dans les composants
 * Printable* via une balise <style>, donc écran, impression et PDF
 * (html2canvas) utilisent exactement le même rendu.
 */
export const PRINT_CSS = `
  .gc-doc {
    background: #ffffff;
    color: #000000;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    line-height: 1.4;
    padding: 10px;
  }
  .gc-doc * { box-sizing: border-box; }
  .gc-doc .gc-header {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
    margin-bottom: 16px;
  }
  .gc-doc .gc-header h2 { font-size: 18px; font-weight: bold; margin: 0 0 4px 0; }
  .gc-doc .gc-header p { margin: 2px 0; font-size: 11px; }
  .gc-doc .gc-header .gc-company { font-size: 10px; color: #333; }
  .gc-doc h3 { font-size: 13px; font-weight: bold; margin: 14px 0 6px 0; }
  .gc-doc table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
  .gc-doc thead { display: table-header-group; }
  .gc-doc tfoot { display: table-footer-group; }
  .gc-doc tr { page-break-inside: avoid; }
  .gc-doc th, .gc-doc td { border: 1px solid #000; padding: 5px 7px; font-size: 11px; text-align: left; }
  .gc-doc th { background: #eeeeee; font-weight: bold; }
  .gc-doc td.num, .gc-doc th.num { text-align: right; }
  .gc-doc td.center, .gc-doc th.center { text-align: center; }
  .gc-doc tfoot td { font-weight: bold; background: #f7f7f7; }
  .gc-doc .gc-kv { margin: 2px 0; font-size: 11.5px; }
  .gc-doc .gc-warn { color: #92400e; }
  .gc-doc .gc-note { font-size: 10px; color: #555; margin-top: 4px; }
  .gc-doc .gc-empty { border: 1px solid #999; padding: 18px; text-align: center; font-size: 11px; }
  .gc-doc .gc-sign { margin-top: 42px; page-break-inside: avoid; }
  .gc-doc .gc-sign-city { font-size: 11.5px; margin-bottom: 42px; }
  .gc-doc .gc-sign-row { display: flex; justify-content: flex-end; }
  .gc-doc .gc-sign-box { width: 200px; text-align: center; }
  .gc-doc .gc-sign-line { border-top: 1px solid #000; padding-top: 4px; font-size: 11px; }
  @media print {
    @page { size: A4; margin: 15mm; }
    .gc-doc { padding: 0; }
    .no-print { display: none !important; }
  }
`;

/**
 * Ouvre une fenêtre d'impression avec un document HTML autonome.
 * bodyHtml peut contenir une balise <style> (rendue aussi dans la fenêtre).
 */
export const printHtmlDocument = (title: string, bodyHtml: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>body { margin: 0; background: #fff; }</style>
  </head>
  <body>${bodyHtml}</body>
</html>`);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
  return true;
};

/** Format "5 500 F CFA" pour les documents imprimés. */
export const formatFCFA = (amount: number) =>
  `${Math.round(Number(amount) || 0).toLocaleString('fr-FR')} F CFA`;
