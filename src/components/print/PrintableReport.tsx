import { PRINT_CSS, formatFCFA } from "@/lib/print";
import { COMPANY_INFO } from "@/config/company";

interface BilanLine {
  label: string;
  value: string;
  ecart?: boolean;
}

interface PrintableReportProps {
  report: any;
  title: string;
  summary: { label: string; value: string }[];
  bilan: BilanLine[] | null;
  /** Colonnes du tableau de détails, déjà traduites en français. */
  headers: { key: string; label: string }[];
  /** Formate une cellule (montants FCFA, dates JJ/MM/AAAA, statuts traduits). */
  formatCell: (key: string, value: any) => string;
}

const CURRENCY_KEYS = ['amount', 'total', 'totalSpent', 'revenue', 'totalRevenue'];

/**
 * Fiche de rapport imprimable : vrai tableau HTML + styles autonomes.
 * Le <style> embarqué garantit le même rendu à l'écran, à l'impression
 * (innerHTML copié dans la fenêtre) et au PDF (html2canvas).
 */
const PrintableReport = ({ report, title, summary, bilan, headers, formatCell }: PrintableReportProps) => {
  const rows: any[] = report?.data || [];
  const now = new Date();
  const isSales = report?.type === 'sales';

  // Totaux par type de vente (gros / détail) + total général
  const totals = isSales
    ? rows.reduce(
        (acc, r: any) => {
          const amount = Number(r.amount) || 0;
          if ((r.typeVente || 'detail') === 'gros') acc.gros += amount;
          else acc.detail += amount;
          acc.all += amount;
          return acc;
        },
        { gros: 0, detail: 0, all: 0 }
      )
    : null;

  // Total générique pour les autres rapports (première clé monétaire trouvée)
  const genericTotalKey = !isSales
    ? headers.find((h) => CURRENCY_KEYS.includes(h.key))?.key
    : undefined;
  const genericTotal = genericTotalKey
    ? rows.reduce((s: number, r: any) => s + (Number(r[genericTotalKey]) || 0), 0)
    : null;

  const isNumericColumn = (key: string) =>
    CURRENCY_KEYS.includes(key) || ['quantity', 'stock', 'reserved', 'available', 'orders', 'totalOrders'].includes(key);

  return (
    <div className="gc-doc">
      <style>{PRINT_CSS}</style>

      <div className="gc-header">
        <h2>{title}</h2>
        <p>Imprimé le {now.toLocaleDateString('fr-FR')} à {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
        <p className="gc-company">{COMPANY_INFO.name} - {COMPANY_INFO.description}</p>
      </div>

      {summary.length > 0 && (
        <>
          <h3>Résumé</h3>
          <table>
            <tbody>
              {summary.map((item, i) => (
                <tr key={i}>
                  <td>{item.label}</td>
                  <td className="num">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {bilan && (
        <>
          <h3>Bilan du stock (prix de gros)</h3>
          <table>
            <tbody>
              {bilan.map((item, i) => (
                <tr key={i}>
                  <td className={item.ecart ? 'gc-warn' : ''}>{item.label}</td>
                  <td className={`num ${item.ecart ? 'gc-warn' : ''}`}>{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h3>Détails</h3>
      {rows.length === 0 ? (
        <div className="gc-empty">Aucune donnée</div>
      ) : (
        <table>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h.key} className={isNumericColumn(h.key) ? 'num' : ''}>{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, i: number) => (
              <tr key={i}>
                {headers.map((h) => (
                  <td key={h.key} className={isNumericColumn(h.key) ? 'num' : ''}>
                    {formatCell(h.key, row[h.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            {totals && (
              <>
                <tr>
                  <td colSpan={headers.length - 1}>Total ventes en gros</td>
                  <td className="num">{formatFCFA(totals.gros)}</td>
                </tr>
                <tr>
                  <td colSpan={headers.length - 1}>Total ventes au détail</td>
                  <td className="num">{formatFCFA(totals.detail)}</td>
                </tr>
                <tr>
                  <td colSpan={headers.length - 1}>Total général</td>
                  <td className="num">{formatFCFA(totals.all)}</td>
                </tr>
              </>
            )}
            {genericTotalKey && genericTotal != null && (
              <tr>
                <td colSpan={headers.length - 1}>Total général</td>
                <td className="num">{formatCell(genericTotalKey, genericTotal)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      )}

      <div className="gc-sign">
        <p className="gc-sign-city">Fait à Kayes, le {now.toLocaleDateString('fr-FR')}</p>
        <div className="gc-sign-row">
          <div className="gc-sign-box">
            <div className="gc-sign-line">Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableReport;
