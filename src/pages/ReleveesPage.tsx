import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Client, ReleveAvecClient, ReleveAvecConsommation } from "../types";

type RelevesView = "liste" | "ajouter";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ReleveesPage() {
  const [view, setView] = useState<RelevesView>("liste");
  const [releves, setReleves] = useState<ReleveAvecClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [dateReleve, setDateReleve] = useState(today);
  const [indexAncien, setIndexAncien] = useState("");
  const [indexNouveau, setIndexNouveau] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadReleves = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      setReleves(await invoke<ReleveAvecClient[]>("lister_releves"));
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReleves();
  }, [loadReleves]);

  async function openAddView() {
    setView("ajouter");
    setSelectedClientId("");
    setDateReleve(today());
    setIndexAncien("");
    setIndexNouveau("");
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
    setIndexAncien("");
    setError("");

    if (!clientId) {
      return;
    }

    try {
      const history = await invoke<ReleveAvecConsommation[]>(
        "lister_releves_client",
        { clientId: Number(clientId) },
      );
      const lastReleve = history[history.length - 1];

      if (lastReleve) {
        setIndexAncien(String(lastReleve.index_nouveau));
      }
    } catch (error) {
      setError(String(error));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const ancien = Number(indexAncien || 0);
    const nouveau = Number(indexNouveau);

    if (!selectedClientId || !dateReleve || indexNouveau === "") {
      setError("Veuillez renseigner le client, la date et les index.");
      return;
    }

    if (nouveau < ancien) {
      setError(
        "L'index nouveau doit être supérieur ou égal à l'index ancien.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await invoke<number>("ajouter_releve", {
        clientId: Number(selectedClientId),
        dateReleve,
        indexAncien: ancien,
        indexNouveau: nouveau,
      });
      setSuccess("Relevé enregistré avec succès.");
      setView("liste");
      await loadReleves();
    } catch (error) {
      setError(String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredReleves = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return releves;
    }

    return releves.filter((releve) =>
      `${releve.nom_client} ${releve.prenom_client ?? ""} ${releve.numero_compteur}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [releves, search]);

  if (view === "ajouter") {
    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Suivi</p>
            <h2>Nouveau relevé</h2>
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
          <form className="client-form" onSubmit={handleSubmit}>
            <label>
              Client
              <select
                value={selectedClientId}
                onChange={(event) =>
                  void handleClientChange(event.target.value)
                }
              >
                <option value="">Sélectionner un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nom} {client.prenom ?? ""} —{" "}
                    {client.numero_compteur}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Date du relevé
              <input
                type="date"
                required
                value={dateReleve}
                onChange={(event) => setDateReleve(event.target.value)}
              />
            </label>

            <label>
              Index ancien
              <input
                type="number"
                min="0"
                step="any"
                value={indexAncien}
                onChange={(event) => setIndexAncien(event.target.value)}
              />
            </label>

            <label>
              Index nouveau
              <input
                type="number"
                min="0"
                step="any"
                required
                value={indexNouveau}
                onChange={(event) => setIndexNouveau(event.target.value)}
              />
            </label>

            <div className="form-actions">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setView("liste")}
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement..." : "Enregistrer le relevé"}
              </button>
            </div>
          </form>

          {error && <p className="form-message error">{error}</p>}
          {success && <p className="form-message success">{success}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Suivi</p>
          <h2>Relevés</h2>
        </div>
        <button
          className="action-button"
          type="button"
          onClick={() => void openAddView()}
        >
          + Nouveau relevé
        </button>
      </div>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Rechercher par nom ou numéro de compteur..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Rechercher un relevé"
        />
      </div>

      {error && <p className="form-message error">{error}</p>}

      <section className="panel">
        {isLoading && <p>Chargement des relevés...</p>}
        {!isLoading && filteredReleves.length === 0 && (
          <p>Aucun relevé enregistré.</p>
        )}
        {!isLoading && filteredReleves.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>N° compteur</th>
                  <th>Date du relevé</th>
                  <th>Index ancien</th>
                  <th>Index nouveau</th>
                  <th>Consommation (m³)</th>
                  <th>Statut facturation</th>
                </tr>
              </thead>
              <tbody>
                {filteredReleves.map((releve) => (
                  <tr key={releve.id}>
                    <td>
                      {releve.nom_client} {releve.prenom_client ?? ""}
                    </td>
                    <td>{releve.numero_compteur}</td>
                    <td>{releve.date_releve}</td>
                    <td>{releve.index_ancien}</td>
                    <td>{releve.index_nouveau}</td>
                    <td>{releve.consommation_m3.toFixed(2)}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          releve.a_facture ? "payee" : "non-facture"
                        }`}
                      >
                        {releve.a_facture ? "Facturé" : "Non facturé"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default ReleveesPage;
