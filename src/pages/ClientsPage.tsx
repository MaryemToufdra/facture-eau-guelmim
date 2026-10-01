import { useState } from "react";
import ClientForm from "../components/ClientForm";
import ClientList from "../components/ClientList";
import ConsumptionHistory from "../components/ConsumptionHistory";
import { Client } from "../types";

function ClientsPage() {
  const [view, setView] = useState<"liste" | "formulaire" | "historique">("liste");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [clientEnEdition, setClientEnEdition] = useState<Client | null>(null);
  const [clientHistorique, setClientHistorique] = useState<Client | null>(null);

  function handleClientSaved() {
    setRefreshTrigger((current) => current + 1);
    setClientEnEdition(null);
    setView("liste");
  }

  function handleAddClient() {
    setClientEnEdition(null);
    setView("formulaire");
  }

  function handleEditClient(client: Client) {
    setClientEnEdition(client);
    setView("formulaire");
  }

  function handleViewHistory(client: Client) {
    setClientHistorique(client);
    setView("historique");
  }

  function handleCancel() {
    setClientEnEdition(null);
    setClientHistorique(null);
    setView("liste");
  }

  if (view === "historique" && clientHistorique) {
    return (
      <ConsumptionHistory
        client={clientHistorique}
        onBack={handleCancel}
      />
    );
  }

  if (view === "formulaire") {
    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Gestion</p>
            <h2>{clientEnEdition ? "Modifier le client" : "Nouveau client"}</h2>
          </div>
          <button
            className="button-secondary back-button"
            type="button"
            onClick={handleCancel}
          >
            ← Retour
          </button>
        </div>
        <ClientForm
          clientToEdit={clientEnEdition ?? undefined}
          onClientAdded={handleClientSaved}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Gestion</p>
          <h2>Clients</h2>
        </div>
        <button
          className="action-button"
          type="button"
          onClick={handleAddClient}
        >
          + Ajouter un client
        </button>
      </div>
      <ClientList
        refreshTrigger={refreshTrigger}
        onEdit={handleEditClient}
        onViewHistory={handleViewHistory}
      />
    </div>
  );
}

export default ClientsPage;
