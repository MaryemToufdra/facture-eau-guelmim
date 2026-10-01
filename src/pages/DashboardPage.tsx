import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Client } from "../types";

function DashboardPage() {
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadClientCount() {
      try {
        const clients = await invoke<Client[]>("lister_clients");
        setClientCount(clients.length);
      } catch (error) {
        setError(String(error));
      }
    }

    void loadClientCount();
  }, []);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Vue d’ensemble</p>
          <h2>Dashboard</h2>
        </div>
      </div>
      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-icon">👥</span>
          <div>
            <p className="stat-label">Clients enregistrés</p>
            <strong>{clientCount ?? "—"}</strong>
          </div>
        </article>
      </div>
      {error && <p className="form-message error">{error}</p>}
      <section className="panel placeholder-panel">
        <h3>Activité</h3>
        <p>Les statistiques de relevés et de factures seront disponibles prochainement.</p>
      </section>
    </div>
  );
}

export default DashboardPage;
