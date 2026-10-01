import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Client } from "../types";

type ReleveAvecConsommation = {
  id: number;
  date_releve: string;
  index_ancien: number;
  index_nouveau: number;
  consommation_m3: number;
};

type ConsumptionHistoryProps = {
  client: Client;
  onBack: () => void;
};

function ConsumptionHistory({
  client,
  onBack,
}: ConsumptionHistoryProps) {
  const [releves, setReleves] = useState<ReleveAvecConsommation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      setError("");

      try {
        const result = await invoke<ReleveAvecConsommation[]>(
          "lister_releves_client",
          { clientId: client.id },
        );
        setReleves(result);
      } catch (error) {
        setError(String(error));
      } finally {
        setIsLoading(false);
      }
    }

    void loadHistory();
  }, [client.id]);

  const lastReleve = releves[releves.length - 1];
  const lastConsumption = lastReleve?.consommation_m3 ?? null;
  const previousConsumptions = releves
    .slice(0, -1)
    .map((releve) => releve.consommation_m3);
  const previousAverage = useMemo(() => {
    if (previousConsumptions.length === 0) {
      return null;
    }

    return (
      previousConsumptions.reduce((total, value) => total + value, 0) /
      previousConsumptions.length
    );
  }, [previousConsumptions]);
  const isAbnormal =
    lastConsumption !== null &&
    previousAverage !== null &&
    lastConsumption > previousAverage * 1.5;
  const maximumConsumption = Math.max(
    ...releves.map((releve) => releve.consommation_m3),
    1,
  );

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Suivi client</p>
          <h2>Historique de consommation - {client.nom}</h2>
        </div>
        <button
          className="button-secondary back-button"
          type="button"
          onClick={onBack}
        >
          ← Retour
        </button>
      </div>

      {isLoading && <section className="panel"><p>Chargement de l'historique...</p></section>}
      {!isLoading && error && <p className="form-message error">{error}</p>}
      {!isLoading && !error && releves.length === 0 && (
        <section className="panel">
          <p>Aucun relevé enregistré pour ce client.</p>
        </section>
      )}

      {!isLoading && !error && releves.length > 0 && (
        <>
          {isAbnormal && (
            <div className="consumption-alert">
              ⚠️ Consommation inhabituelle détectée :{" "}
              {lastConsumption?.toFixed(2)} m³ ce mois, contre une moyenne de{" "}
              {previousAverage?.toFixed(2)} m³ habituellement. Vérifiez une
              possible fuite d'eau.
            </div>
          )}

          <section className="panel">
            <h3>Évolution de la consommation</h3>
            <div className="consumption-chart" aria-label="Graphique de consommation">
              {releves.map((releve) => (
                <div className="chart-bar-group" key={releve.id}>
                  <div
                    className={`chart-bar ${
                      isAbnormal && releve.id === lastReleve?.id
                        ? "abnormal"
                        : ""
                    }`}
                    style={{
                      height: `${Math.max(
                        (releve.consommation_m3 / maximumConsumption) * 100,
                        4,
                      )}%`,
                    }}
                    title={`${releve.consommation_m3.toFixed(2)} m³`}
                  >
                    <span>{releve.consommation_m3.toFixed(1)}</span>
                  </div>
                  <small>{releve.date_releve}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h3>Relevés</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date du relevé</th>
                    <th>Index ancien</th>
                    <th>Index nouveau</th>
                    <th>Consommation (m³)</th>
                  </tr>
                </thead>
                <tbody>
                  {releves.map((releve) => (
                    <tr key={releve.id}>
                      <td>{releve.date_releve}</td>
                      <td>{releve.index_ancien}</td>
                      <td>{releve.index_nouveau}</td>
                      <td>{releve.consommation_m3.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default ConsumptionHistory;
