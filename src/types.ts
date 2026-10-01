export interface Client {
  id: number;
  nom: string;
  prenom: string | null;
  adresse: string | null;
  numero_compteur: string;
  type_usage: string;
  date_creation: string | null;
}

export interface ReleveAvecConsommation {
  id: number;
  date_releve: string;
  index_ancien: number;
  index_nouveau: number;
  consommation_m3: number;
}

export interface ReleveAvecClient extends ReleveAvecConsommation {
  client_id: number;
  nom_client: string;
  prenom_client: string | null;
  numero_compteur: string;
  a_facture: boolean;
}

export interface Facture {
  id: number;
  client_id: number;
  releve_id: number;
  periode: string;
  consommation_m3: number;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  statut: string;
  date_generation: string | null;
}

export interface FactureAvecClient extends Facture {
  nom_client: string;
  prenom_client: string | null;
}
