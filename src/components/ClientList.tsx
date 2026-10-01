import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Client } from "../types";

type ClientListProps = {
  refreshTrigger?: number;
  onEdit: (client: Client) => void;
  onViewHistory: (client: Client) => void;
};

function ClientList({
  refreshTrigger = 0,
  onEdit,
  onViewHistory,
}: ClientListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingClientId, setDeletingClientId] = useState<number | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await invoke<Client[]>("lister_clients");
      setClients(result);
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch, refreshTrigger]);

  async function handleDelete(client: Client) {
    const confirmed = window.confirm(
      `Supprimer le client ${client.nom} ? Cette action est irréversible.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeletingClientId(client.id);

    try {
      await invoke("supprimer_client", { id: client.id });
      await refetch();
    } catch (error) {
      setError(String(error));
    } finally {
      setDeletingClientId(null);
    }
  }

  return (
    <section className="panel client-list">
      <h2>Clients enregistrés</h2>

      {isLoading && <p>Chargement des clients...</p>}
      {!isLoading && error && <p className="form-message error">{error}</p>}
      {!isLoading && !error && clients.length === 0 && <p>Aucun client</p>}

      {!isLoading && !error && clients.length > 0 && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Adresse</th>
                <th>N° compteur</th>
                <th>Type d’usage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.nom}</td>
                  <td>{client.prenom || "—"}</td>
                  <td>{client.adresse || "—"}</td>
                  <td>{client.numero_compteur}</td>
                  <td>{client.type_usage}</td>
                  <td className="table-actions">
                    <button
                      className="button-secondary table-action"
                      type="button"
                      onClick={() => onViewHistory(client)}
                    >
                      📊 Historique
                    </button>
                    <button
                      className="button-secondary table-action"
                      type="button"
                      onClick={() => onEdit(client)}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      className="button-danger table-action"
                      type="button"
                      onClick={() => void handleDelete(client)}
                      disabled={deletingClientId === client.id}
                    >
                      {deletingClientId === client.id
                        ? "Suppression..."
                        : "🗑️ Supprimer"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default ClientList;
