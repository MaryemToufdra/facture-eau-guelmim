import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Client, Facture, FactureAvecClient, ReleveAvecConsommation } from "../types";

type InvoiceFilter = "toutes" | "payees" | "impayees";

function formatAmount(amount: number) {
  return `${amount.toFixed(2)} DH`;
}

function FacturesPage() {
  const [view, setView] = useState<"liste" | "generer">("liste");
  const [factures, setFactures] = useState<FactureAvecClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [releves, setReleves] = useState<ReleveAvecConsommation[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedReleveId, setSelectedReleveId] = useState("");
  const [filter, setFilter] = useState<InvoiceFilter>("toutes");
  const [generatedFacture, setGeneratedFacture] = useState<Facture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadFactures = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      setFactures(await invoke<FactureAvecClient[]>("lister_factures"));
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFactures();
  }, [loadFactures]);

  async function openGeneration() {
    setView("generer");
    setGeneratedFacture(null);
    setSelectedClientId("");
    setSelectedReleveId("");
    setReleves([]);
    setError("");
    setSuccess("");

    try {
      setClients(await invoke<Client[]>("lister_clients"));
    } catch (error) {
      setError(String(error));
    }
  }

  async function handleClientChange(clientId: string) {
    setSelectedClientId(clientId);
    setSelectedReleveId("");
    setReleves([]);
    setError("");

    if (!clientId) {
      return;
    }

    try {
      setReleves(
        await invoke<ReleveAvecConsommation[]>("lister_releves_client", {
          clientId: Number(clientId),
        }),
      );
    } catch (error) {
      setError(String(error));
    }
  }

  async function generateFacture(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedClientId || !selectedReleveId) {
      setError("Veuillez sélectionner un client et un relevé.");
      return;
    }

    setIsGenerating(true);
    setError("");
    setSuccess("");

    try {
      const facture = await invoke<Facture>("calculer_facture", {
        clientId: Number(selectedClientId),
        releveId: Number(selectedReleveId),
      });
      setGeneratedFacture(facture);
      setSuccess("Facture générée avec succès.");
    } catch (error) {
      setError(String(error));
    } finally {
      setIsGenerating(false);
    }
  }

  async function changeStatus(facture: FactureAvecClient) {
    const nextStatus = facture.statut === "payee" ? "impayee" : "payee";
    setUpdatingId(facture.id);
    setError("");

    try {
      await invoke("changer_statut_facture", {
        id: facture.id,
        statut: nextStatus,
      });
      await loadFactures();
    } catch (error) {
      setError(String(error));
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredFactures = useMemo(
    () =>
      factures.filter((facture) => {
        if (filter === "payees") return facture.statut === "payee";
        if (filter === "impayees") return facture.statut === "impayee";
        return true;
      }),
    [factures, filter],
  );

  const totalImpayes = factures
    .filter((facture) => facture.statut === "impayee")
    .reduce((total, facture) => total + facture.montant_ttc, 0);

  if (view === "generer") {
    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Gestion financière</p>
            <h2>Générer une facture</h2>
          </div>
          <button
            className="button-secondary back-button"
            type="button"
            onClick={() => setView("liste")}
          >
            ← Annuler
          </button>
        </div>

        <section className="panel invoice-generator">
          <form className="client-form" onSubmit={generateFacture}>
            <label>
              1. Client
              <select
                value={selectedClientId}
                onChange={(event) => void handleClientChange(event.target.value)}
              >
                <option value="">Sélectionner un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nom} {client.prenom ?? ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              2. Relevé
              <select
                value={selectedReleveId}
                onChange={(event) => setSelectedReleveId(event.target.value)}
                disabled={!selectedClientId || releves.length === 0}
              >
                <option value="">Sélectionner un relevé</option>
                {releves.map((releve) => (
                  <option key={releve.id} value={releve.id}>
                    {releve.date_releve} — {releve.consommation_m3.toFixed(2)} m³
                  </option>
                ))}
              </select>
            </label>

            <div className="form-actions">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setView("liste")}
              >
                Annuler
              </button>
              <button type="submit" disabled={isGenerating}>
                {isGenerating
                  ? "Calcul en cours..."
                  : "Calculer et générer la facture"}
              </button>
            </div>
          </form>

          {error && <p className="form-message error">{error}</p>}
          {success && <p className="form-message success">{success}</p>}

          {generatedFacture && (
            <div className="invoice-result">
              <h3>Facture calculée</h3>
              <p>Consommation : {generatedFacture.consommation_m3.toFixed(2)} m³</p>
              <p>Montant HT : {formatAmount(generatedFacture.montant_ht)}</p>
              <p>TVA : {formatAmount(generatedFacture.montant_tva)}</p>
              <p>
                <strong>Montant TTC : {formatAmount(generatedFacture.montant_ttc)}</strong>
              </p>
              <button type="button" onClick={() => {
                setView("liste");
                void loadFactures();
              }}>
                Retour à la liste
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Gestion financière</p>
          <h2>Factures</h2>
        </div>
        <button className="action-button" type="button" onClick={() => void openGeneration()}>
          + Générer une facture
        </button>
      </div>

      {error && <p className="form-message error">{error}</p>}

      <section className="invoice-filters">
        {(["toutes", "payees", "impayees"] as InvoiceFilter[]).map((option) => (
          <button
            className={`filter-button ${filter === option ? "active" : ""}`}
            key={option}
            type="button"
            onClick={() => setFilter(option)}
          >
            {option === "toutes" ? "Toutes" : option === "payees" ? "Payées" : "Impayées"}
          </button>
        ))}
      </section>

      <section className="panel">
        {isLoading && <p>Chargement des factures...</p>}
        {!isLoading && filteredFactures.length === 0 && <p>Aucune facture.</p>}
        {!isLoading && filteredFactures.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Période</th>
                  <th>Consommation (m³)</th>
                  <th>Montant TTC</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFactures.map((facture) => (
                  <tr key={facture.id}>
                    <td>{facture.nom_client} {facture.prenom_client ?? ""}</td>
                    <td>{facture.periode}</td>
                    <td>{facture.consommation_m3.toFixed(2)}</td>
                    <td>{formatAmount(facture.montant_ttc)}</td>
                    <td>
                      <span className={`status-badge ${facture.statut}`}>
                        {facture.statut === "payee" ? "Payée" : "Impayée"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="button-secondary table-action"
                        type="button"
                        onClick={() => void changeStatus(facture)}
                        disabled={updatingId === facture.id}
                      >
                        {updatingId === facture.id
                          ? "Mise à jour..."
                          : facture.statut === "payee"
                            ? "Marquer impayée"
                            : "Marquer payée"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="invoice-total">
          Total impayé : <strong>{formatAmount(totalImpayes)}</strong>
        </p>
      </section>
    </div>
  );
}

export default FacturesPage;
