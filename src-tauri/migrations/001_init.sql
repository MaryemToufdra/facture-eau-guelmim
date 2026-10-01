CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT,
    adresse TEXT,
    numero_compteur TEXT UNIQUE NOT NULL,
    type_usage TEXT NOT NULL DEFAULT 'domestique',
    date_creation TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tranches_tarifaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_usage TEXT NOT NULL,
    numero_tranche INTEGER NOT NULL,
    seuil_min REAL NOT NULL,
    seuil_max REAL,
    prix_m3 REAL NOT NULL,
    mode TEXT NOT NULL
);

CREATE TABLE redevances_fixes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_usage TEXT NOT NULL UNIQUE,
    montant REAL NOT NULL
);

CREATE TABLE releves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    date_releve TEXT NOT NULL,
    index_ancien REAL NOT NULL,
    index_nouveau REAL NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE factures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    releve_id INTEGER NOT NULL,
    periode TEXT NOT NULL,
    consommation_m3 REAL NOT NULL,
    montant_ht REAL NOT NULL,
    montant_tva REAL NOT NULL,
    montant_ttc REAL NOT NULL,
    statut TEXT DEFAULT 'impayee',
    date_generation TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (releve_id) REFERENCES releves(id)
);

INSERT INTO redevances_fixes (type_usage, montant) VALUES ('domestique', 6.00);

INSERT INTO tranches_tarifaires (type_usage, numero_tranche, seuil_min, seuil_max, prix_m3, mode) VALUES
('domestique', 1, 0, 6, 2.37, 'progressif'),
('domestique', 2, 6, 12, 7.39, 'progressif'),
('domestique', 3, 12, 20, 7.39, 'selectif'),
('domestique', 4, 20, 35, 10.98, 'selectif'),
('domestique', 5, 35, NULL, 11.03, 'selectif');
