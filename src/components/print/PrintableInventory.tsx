import { PRINT_CSS, formatFCFA } from "@/lib/print";
import { COMPANY_INFO } from "@/config/company";

interface PrintableInventoryProps {
  report: any;
}

export interface InventoryBilan {
  debut: number;   // Stock au début = stock actuel + vendu
  vendu: number;   // Vendu pendant la période (prix de gros)
  reste: number;   // Il reste en stock = valeur actuelle du stock (prix de gros)
  diff: number;    // Différence = valeur du stock réel − montant actuel du stock
}

/**
 * Calcule le bilan simple de la fiche :
 * - Stock au début = valeur actuelle du stock + total vendu
 * - Vendu pendant la période = montant de l'inventaire
 * - Il reste en stock = valeur actuelle du stock (Σ stock × prix de gros)
 * - Différence = valeur du stock réel − montant actuel du stock
 *   (0 quand les ventes sont bien enregistrées)
 */
export const computeInventoryBilan = (report: any): InventoryBilan => {
  const items: any[] = report?.items || [];
  const vendu = report?.montantInventaire ?? items.reduce((s: number, i: any) => s + (i.total || 0), 0);
  const reste = report?.stockValueActuel
    ?? items.reduce((s: number, i: any) => s + (i.stockRemaining || 0) * (i.wholesalePrice || 0), 0);
  const debut = reste + vendu;

  // Différence : UNIQUEMENT le comptage physique saisi (calculé côté backend
  // avec le stock actuel). Sans comptage → 0. Jamais de valeur enregistrée.
  const diff = report?.ecartComptage ?? 0;

  return { debut, vendu, reste, diff };
};

const diffMessage = (diff: number) => {
  if (Math.abs(diff) < 1) return { text: 'Aucune différence, tout est correct', className: 'gc-ok' };
  if (diff < 0) return { text: `Il manque ${formatFCFA(Math.abs(diff))} de marchandise`, className: 'gc-bad' };
  return { text: `Il y a ${formatFCFA(diff)} de plus que prévu`, className: 'gc-warn2' };
};

/**
 * Fiche d'inventaire imprimable : vrai tableau HTML + styles autonomes.
 * Le <style> embarqué garantit le même rendu à l'écran, à l'impression
 * (innerHTML copié dans la fenêtre) et au PDF (html2canvas).
 */
const PrintableInventory = ({ report }: PrintableInventoryProps) => {
  const items: any[] = report?.items || [];
  const bilan = computeInventoryBilan(report);
  const totalQty = items.reduce((s: number, i: any) => s + (i.quantitySold || 0), 0);
  const totalVendu = items.reduce((s: number, i: any) => s + (i.total || 0), 0);
  const message = diffMessage(bilan.diff);
  const now = new Date();

  return (
    <div className="gc-doc">
      <style>{`
        ${PRINT_CSS}
        .gc-doc .gc-ok { color: #166534; font-weight: bold; }
        .gc-doc .gc-bad { color: #b91c1c; font-weight: bold; }
        .gc-doc .gc-warn2 { color: #b45309; font-weight: bold; }
        .gc-doc .gc-diff-msg { border: 1px solid #000; padding: 8px 10px; margin: 10px 0; font-size: 12px; }
      `}</style>

      <div className="gc-header">
        <h2>RAPPORT D'INVENTAIRE</h2>
        <p>{report?.period}</p>
        <p>
          Imprimé le {now.toLocaleDateString('fr-FR')} à {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="gc-company">{COMPANY_INFO.name} - {COMPANY_INFO.description}</p>
      </div>

      <h3>Résumé</h3>
      <table>
        <tbody>
          <tr>
            <td>Stock au début</td>
            <td className="num">{formatFCFA(bilan.debut)}</td>
          </tr>
          <tr>
            <td>Vendu pendant la période</td>
            <td className="num">- {formatFCFA(bilan.vendu)}</td>
          </tr>
          <tr>
            <td><strong>Il reste en stock</strong></td>
            <td className="num"><strong>{formatFCFA(bilan.reste)}</strong></td>
          </tr>
          <tr>
            <td>Différence constatée</td>
            <td className={`num ${message.className}`}>{formatFCFA(bilan.diff)}</td>
          </tr>
        </tbody>
      </table>

      <div className={`gc-diff-msg ${message.className}`}>
        {message.text}
      </div>

      <h3>Détail des ventes</h3>
      {items.length === 0 ? (
        <div className="gc-empty">Aucune donnée</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th className="center">Type</th>
              <th className="num">Prix gros</th>
              <th className="num">Prix détail</th>
              <th className="num">Stock restant</th>
              <th className="num">Quantité vendue</th>
              <th className="num">Montant</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, i: number) => (
              <tr key={i}>
                <td>{item.productName || 'Produit supprimé'}</td>
                <td className="center">{item.typeVente === 'gros' ? 'Gros' : 'Détail'}</td>
                <td className="num">{formatFCFA(item.wholesalePrice ?? item.unitPrice)}</td>
                <td className="num">{formatFCFA(item.retailPrice || 0)}</td>
                <td className="num">{item.stockRemaining ?? 0} {item.unit || ''}</td>
                <td className="num">{item.quantitySold}</td>
                <td className="num">{formatFCFA(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>Total</td>
              <td className="num">{totalQty}</td>
              <td className="num">{formatFCFA(totalVendu)}</td>
            </tr>
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

export default PrintableInventory;
