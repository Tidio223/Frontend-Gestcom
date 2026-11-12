import { PRINT_CSS, formatFCFA } from "@/lib/print";
import { COMPANY_INFO } from "@/config/company";

interface PrintableInventoryProps {
  report: any;
}

/**
 * Fiche d'inventaire imprimable : vrai tableau HTML + styles autonomes.
 * La balise <style> est embarquée dans le composant, donc le même rendu
 * sert à l'écran, à l'impression (innerHTML copié) et au PDF (html2canvas).
 */
const PrintableInventory = ({ report }: PrintableInventoryProps) => {
  const items = report?.items || [];
  const totalGros = report?.montantInventaire ?? items.reduce((s: number, i: any) => s + (i.total || 0), 0);
  const totalQty = items.reduce((s: number, i: any) => s + (i.quantitySold || 0), 0);
  const remainingValue = items.reduce((s: number, i: any) => s + (i.stockRemaining || 0) * (i.wholesalePrice || 0), 0);
  const now = new Date();

  return (
    <div className="gc-doc">
      <style>{PRINT_CSS}</style>

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
            <td>Nombre de produits</td>
            <td className="num">{items.length}</td>
            <td>Quantité vendue</td>
            <td className="num">{report?.totalProductsSold ?? totalQty}</td>
          </tr>
          <tr>
            <td>Montant de l'inventaire (prix de gros)</td>
            <td className="num">{formatFCFA(totalGros)}</td>
            <td>Valeur du stock au prix de gros</td>
            <td className="num">{formatFCFA(report?.stockValueWholesale || 0)}</td>
          </tr>
          <tr>
            <td>Date de l'inventaire</td>
            <td className="num">{new Date(report?.date).toLocaleDateString('fr-FR')}</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>

      {report?.montantStockActuel != null && (
        <>
          <h3>Bilan du stock (prix de gros)</h3>
          <table>
            <tbody>
              <tr>
                <td>Montant du stock au début</td>
                <td className="num">{formatFCFA(report.montantOuverture || 0)}</td>
              </tr>
              {(report.montantEntrees || 0) > 0 && (
                <tr>
                  <td>Entrées de stock (au prix de gros)</td>
                  <td className="num">+ {formatFCFA(report.montantEntrees)}</td>
                </tr>
              )}
              <tr>
                <td>Montant de l'inventaire (sorties au prix de gros)</td>
                <td className="num">- {formatFCFA(report.montantInventaire || 0)}</td>
              </tr>
              <tr>
                <td><strong>Montant actuel du stock</strong></td>
                <td className="num"><strong>{formatFCFA(report.montantStockActuel)}</strong></td>
              </tr>
              {Math.abs(report.ecartStock || 0) > 1 && (
                <tr>
                  <td className="gc-warn">Écart avec le stock réel ({formatFCFA(report.montantStockReel || 0)})</td>
                  <td className="num gc-warn">{formatFCFA(report.ecartStock)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      <h3>Détail des sorties de stock (prix de gros)</h3>
      {items.length === 0 ? (
        <div className="gc-empty">Aucune donnée</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Catégorie</th>
              <th className="center">Type</th>
              <th className="num">Prix gros</th>
              <th className="num">Prix détail</th>
              <th className="num">Stock</th>
              <th className="num">Quantité vendue</th>
              <th className="num">Montant vendu</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, i: number) => (
              <tr key={i}>
                <td>{item.productName || 'Produit supprimé'}</td>
                <td>{item.category || '—'}</td>
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
              <td colSpan={6}>Total</td>
              <td className="num">{totalQty}</td>
              <td className="num">{formatFCFA(totalGros)}</td>
            </tr>
            <tr>
              <td colSpan={7}>Valeur totale des produits restants (prix de gros)</td>
              <td className="num">{formatFCFA(remainingValue)}</td>
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
