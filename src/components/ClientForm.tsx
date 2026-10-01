import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Client } from "../types";

type ClientFormValues = {
  nom: string;
  prenom: string;
  adresse: string;
  numero_compteur: string;
  type_usage: string;
};

type ClientFormProps = {
  onClientAdded: () => void;
  onCancel: () => void;
  clientToEdit?: Client;
};

const initialValues: ClientFormValues = {
  nom: "",
  prenom: "",
  adresse: "",
  numero_compteur: "",
  type_usage: "domestique",
};

const usageOptions = [
  "domestique",
  "administration",
  "preferentiel",
  "industriel",
  "hotel",
];

function ClientForm({ onClientAdded, onCancel, clientToEdit }: ClientFormProps) {
  const [values, setValues] = useState<ClientFormValues>(() =>
    clientToEdit
      ? {
          nom: clientToEdit.nom,
          prenom: clientToEdit.prenom ?? "",
          adresse: clientToEdit.adresse ?? "",
          numero_compteur: clientToEdit.numero_compteur,
          type_usage: clientToEdit.type_usage,
        }
      : initialValues,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = clientToEdit !== undefined;

  useEffect(() => {
    setValues(
      clientToEdit
        ? {
            nom: clientToEdit.nom,
            prenom: clientToEdit.prenom ?? "",
            adresse: clientToEdit.adresse ?? "",
            numero_compteur: clientToEdit.numero_compteur,
            type_usage: clientToEdit.type_usage,
          }
        : initialValues,
    );
    setMessage("");
    setError("");
  }, [clientToEdit]);

  function updateField(field: keyof ClientFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      if (clientToEdit) {
        await invoke("modifier_client", {
          id: clientToEdit.id,
          nom: values.nom,
          prenom: values.prenom || null,
          adresse: values.adresse || null,
          numeroCompteur: values.numero_compteur,
          typeUsage: values.type_usage,
        });
      } else {
        await invoke<number>("ajouter_client", {
          nom: values.nom,
          prenom: values.prenom || null,
          adresse: values.adresse || null,
          numeroCompteur: values.numero_compteur,
          typeUsage: values.type_usage,
        });
      }

      setMessage(
        isEditing
          ? "Client modifié avec succès."
          : "Client ajouté avec succès.",
      );
      setValues(initialValues);
      onClientAdded();
    } catch (error) {
      setError(String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <h2>{isEditing ? "Modifier le client" : "Ajouter un client"}</h2>
      <form className="client-form" onSubmit={handleSubmit}>
        <label>
          Nom <span aria-hidden="true">*</span>
          <input
            required
            value={values.nom}
            onChange={(event) => updateField("nom", event.target.value)}
          />
        </label>

        <label>
          Prénom
          <input
            value={values.prenom}
            onChange={(event) => updateField("prenom", event.target.value)}
          />
        </label>

        <label>
          Adresse
          <textarea
            rows={3}
            value={values.adresse}
            onChange={(event) => updateField("adresse", event.target.value)}
          />
        </label>

        <label>
          N° compteur <span aria-hidden="true">*</span>
          <input
            required
            value={values.numero_compteur}
            onChange={(event) =>
              updateField("numero_compteur", event.target.value)
            }
          />
        </label>

        <label>
          Type d’usage
          <select
            value={values.type_usage}
            onChange={(event) => updateField("type_usage", event.target.value)}
          >
            {usageOptions.map((usage) => (
              <option key={usage} value={usage}>
                {usage}
              </option>
            ))}
          </select>
        </label>

        <div className="form-actions">
          <button
            className="button-secondary"
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEditing
                ? "Enregistrement..."
                : "Ajout en cours..."
              : isEditing
                ? "Enregistrer les modifications"
                : "Ajouter le client"}
          </button>
        </div>
      </form>

      {message && <p className="form-message success">{message}</p>}
      {error && <p className="form-message error">{error}</p>}
    </section>
  );
}

export default ClientForm;
