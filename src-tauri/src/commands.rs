use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use tauri::State;
use tauri_plugin_sql::{DbInstances, DbPool};

// À vérifier/ajuster selon le taux TVA en vigueur
const TVA_TAUX: f64 = 0.07;
const DATABASE_URL: &str = "sqlite:facture.db";

#[derive(Debug, Serialize, Deserialize)]
pub struct Client {
    pub id: i64,
    pub nom: String,
    pub prenom: Option<String>,
    pub adresse: Option<String>,
    pub numero_compteur: String,
    pub type_usage: String,
    pub date_creation: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Releve {
    pub id: i64,
    pub client_id: i64,
    pub date_releve: String,
    pub index_ancien: f64,
    pub index_nouveau: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TrancheTarifaire {
    pub id: i64,
    pub type_usage: String,
    pub numero_tranche: i64,
    pub seuil_min: f64,
    pub seuil_max: Option<f64>,
    pub prix_m3: f64,
    pub mode: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Facture {
    pub id: i64,
    pub client_id: i64,
    pub releve_id: i64,
    pub periode: String,
    pub consommation_m3: f64,
    pub montant_ht: f64,
    pub montant_tva: f64,
    pub montant_ttc: f64,
    pub statut: String,
    pub date_generation: Option<String>,
}

fn sqlite_pool(db_instances: &DbInstances) -> Result<SqlitePool, String> {
    let instances = db_instances
        .0
        .try_read()
        .map_err(|_| "Impossible d'accéder aux connexions SQLite.".to_string())?;

    match instances.get(DATABASE_URL) {
        Some(DbPool::Sqlite(pool)) => Ok(pool.clone()),
        None => Err(format!(
            "La base de données {DATABASE_URL} n'est pas encore chargée."
        )),
    }
}

#[tauri::command]
pub async fn ajouter_client(
    db_instances: State<'_, DbInstances>,
    nom: String,
    prenom: Option<String>,
    adresse: Option<String>,
    numero_compteur: String,
    type_usage: String,
) -> Result<i64, String> {
    let pool = sqlite_pool(&db_instances)?;

    let result = sqlx::query(
        "INSERT INTO clients (nom, prenom, adresse, numero_compteur, type_usage)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(nom)
    .bind(prenom)
    .bind(adresse)
    .bind(numero_compteur)
    .bind(type_usage)
    .execute(&pool)
    .await
    .map_err(|error| {
        let message = error.to_string();
        if message.contains("UNIQUE constraint failed: clients.numero_compteur") {
            "Ce numéro de compteur existe déjà.".to_string()
        } else {
            format!("Impossible d'ajouter le client : {message}")
        }
    })?;

    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn lister_clients(
    db_instances: State<'_, DbInstances>,
) -> Result<Vec<Client>, String> {
    let pool = sqlite_pool(&db_instances)?;
    let rows = sqlx::query(
        "SELECT id, nom, prenom, adresse, numero_compteur, type_usage, date_creation
         FROM clients
         ORDER BY id",
    )
    .fetch_all(&pool)
    .await
    .map_err(|error| format!("Impossible de lister les clients : {error}"))?;

    rows.into_iter()
        .map(|row| {
            Ok(Client {
                id: row.try_get("id").map_err(|error| error.to_string())?,
                nom: row.try_get("nom").map_err(|error| error.to_string())?,
                prenom: row.try_get("prenom").map_err(|error| error.to_string())?,
                adresse: row.try_get("adresse").map_err(|error| error.to_string())?,
                numero_compteur: row
                    .try_get("numero_compteur")
                    .map_err(|error| error.to_string())?,
                type_usage: row.try_get("type_usage").map_err(|error| error.to_string())?,
                date_creation: row
                    .try_get("date_creation")
                    .map_err(|error| error.to_string())?,
            })
        })
        .collect()
}

#[tauri::command]
pub async fn ajouter_releve(
    db_instances: State<'_, DbInstances>,
    client_id: i64,
    date_releve: String,
    index_ancien: f64,
    index_nouveau: f64,
) -> Result<i64, String> {
    if index_nouveau < index_ancien {
        return Err(
            "L'index nouveau doit être supérieur ou égal à l'index ancien.".to_string()
        );
    }

    let pool = sqlite_pool(&db_instances)?;
    let result = sqlx::query(
        "INSERT INTO releves (client_id, date_releve, index_ancien, index_nouveau)
         VALUES (?, ?, ?, ?)",
    )
    .bind(client_id)
    .bind(date_releve)
    .bind(index_ancien)
    .bind(index_nouveau)
    .execute(&pool)
    .await
    .map_err(|error| format!("Impossible d'ajouter le relevé : {error}"))?;

    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn calculer_facture(
    db_instances: State<'_, DbInstances>,
    client_id: i64,
    releve_id: i64,
) -> Result<Facture, String> {
    let pool = sqlite_pool(&db_instances)?;

    let releve_row = sqlx::query(
        "SELECT id, client_id, date_releve, index_ancien, index_nouveau
         FROM releves
         WHERE id = ? AND client_id = ?",
    )
    .bind(releve_id)
    .bind(client_id)
    .fetch_optional(&pool)
    .await
    .map_err(|error| format!("Impossible de récupérer le relevé : {error}"))?
    .ok_or_else(|| "Relevé introuvable pour ce client.".to_string())?;

    let releve = Releve {
        id: releve_row
            .try_get("id")
            .map_err(|error| error.to_string())?,
        client_id: releve_row
            .try_get("client_id")
            .map_err(|error| error.to_string())?,
        date_releve: releve_row
            .try_get("date_releve")
            .map_err(|error| error.to_string())?,
        index_ancien: releve_row
            .try_get("index_ancien")
            .map_err(|error| error.to_string())?,
        index_nouveau: releve_row
            .try_get("index_nouveau")
            .map_err(|error| error.to_string())?,
    };
    let consommation_m3 = releve.index_nouveau - releve.index_ancien;

    let client_row = sqlx::query("SELECT type_usage FROM clients WHERE id = ?")
        .bind(client_id)
        .fetch_optional(&pool)
        .await
        .map_err(|error| format!("Impossible de récupérer le client : {error}"))?
        .ok_or_else(|| "Client introuvable.".to_string())?;
    let type_usage: String = client_row
        .try_get("type_usage")
        .map_err(|error| error.to_string())?;

    let tranche_rows = sqlx::query(
        "SELECT id, type_usage, numero_tranche, seuil_min, seuil_max, prix_m3, mode
         FROM tranches_tarifaires
         WHERE type_usage = ?
         ORDER BY numero_tranche",
    )
    .bind(&type_usage)
    .fetch_all(&pool)
    .await
    .map_err(|error| format!("Impossible de récupérer les tranches tarifaires : {error}"))?;

    let tranches: Vec<TrancheTarifaire> = tranche_rows
        .into_iter()
        .map(|row| {
            Ok(TrancheTarifaire {
                id: row.try_get("id").map_err(|error| error.to_string())?,
                type_usage: row.try_get("type_usage").map_err(|error| error.to_string())?,
                numero_tranche: row
                    .try_get("numero_tranche")
                    .map_err(|error| error.to_string())?,
                seuil_min: row.try_get("seuil_min").map_err(|error| error.to_string())?,
                seuil_max: row.try_get("seuil_max").map_err(|error| error.to_string())?,
                prix_m3: row.try_get("prix_m3").map_err(|error| error.to_string())?,
                mode: row.try_get("mode").map_err(|error| error.to_string())?,
            })
        })
        .collect::<Result<_, String>>()?;

    if tranches.is_empty() {
        return Err(format!(
            "Aucune tranche tarifaire configurée pour l'usage {type_usage}."
        ));
    }

    let cout_consommation = if consommation_m3 <= 12.0 {
        let tranche_progressive = |numero_tranche: i64| {
            tranches
                .iter()
                .find(|tranche| tranche.numero_tranche == numero_tranche)
                .ok_or_else(|| format!("Tranche tarifaire {numero_tranche} introuvable."))
        };
        let tranche1 = tranche_progressive(1)?;
        let tranche2 = tranche_progressive(2)?;
        consommation_m3.min(6.0) * tranche1.prix_m3
            + (consommation_m3 - 6.0).max(0.0) * tranche2.prix_m3
    } else {
        let tranche = tranches
            .iter()
            .find(|tranche| {
                consommation_m3 >= tranche.seuil_min
                    && tranche
                        .seuil_max
                        .is_none_or(|seuil_max| consommation_m3 <= seuil_max)
            })
            .ok_or_else(|| {
                format!(
                    "Aucune tranche tarifaire ne couvre une consommation de {consommation_m3} m³."
                )
            })?;
        consommation_m3 * tranche.prix_m3
    };

    let redevance_row =
        sqlx::query("SELECT montant FROM redevances_fixes WHERE type_usage = ?")
            .bind(&type_usage)
            .fetch_optional(&pool)
            .await
            .map_err(|error| format!("Impossible de récupérer la redevance fixe : {error}"))?
            .ok_or_else(|| format!("Aucune redevance fixe configurée pour l'usage {type_usage}."))?;
    let redevance_fixe: f64 = redevance_row
        .try_get("montant")
        .map_err(|error| error.to_string())?;

    let montant_ht = cout_consommation + redevance_fixe;
    let montant_tva = montant_ht * TVA_TAUX;
    let montant_ttc = montant_ht + montant_tva;

    let facture_row = sqlx::query(
        "INSERT INTO factures (
            client_id, releve_id, periode, consommation_m3,
            montant_ht, montant_tva, montant_ttc, statut
         )
         VALUES (?, ?, strftime('%Y-%m', 'now'), ?, ?, ?, ?, 'impayee')
         RETURNING id, client_id, releve_id, periode, consommation_m3,
                   montant_ht, montant_tva, montant_ttc, statut, date_generation",
    )
    .bind(client_id)
    .bind(releve_id)
    .bind(consommation_m3)
    .bind(montant_ht)
    .bind(montant_tva)
    .bind(montant_ttc)
    .fetch_one(&pool)
    .await
    .map_err(|error| format!("Impossible d'enregistrer la facture : {error}"))?;

    Ok(Facture {
        id: facture_row
            .try_get("id")
            .map_err(|error| error.to_string())?,
        client_id: facture_row
            .try_get("client_id")
            .map_err(|error| error.to_string())?,
        releve_id: facture_row
            .try_get("releve_id")
            .map_err(|error| error.to_string())?,
        periode: facture_row
            .try_get("periode")
            .map_err(|error| error.to_string())?,
        consommation_m3: facture_row
            .try_get("consommation_m3")
            .map_err(|error| error.to_string())?,
        montant_ht: facture_row
            .try_get("montant_ht")
            .map_err(|error| error.to_string())?,
        montant_tva: facture_row
            .try_get("montant_tva")
            .map_err(|error| error.to_string())?,
        montant_ttc: facture_row
            .try_get("montant_ttc")
            .map_err(|error| error.to_string())?,
        statut: facture_row
            .try_get("statut")
            .map_err(|error| error.to_string())?,
        date_generation: facture_row
            .try_get("date_generation")
            .map_err(|error| error.to_string())?,
    })
}
