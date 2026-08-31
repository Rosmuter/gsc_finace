import pandas as pd

# 1. Charger le fichier Excel en sautant les lignes d'en-tête superflues
df = pd.read_excel("CAISSE.xlsx", sheet_name="Feuil1", skiprows=6)

# 2. Nettoyer les lignes vides
df = df.dropna(subset=['Date', 'Libellé']).copy()

# 3. Formater la date au format ISO (YYYY-MM-DD)
df['date'] = pd.to_datetime(df['Date']).dt.strftime('%Y-%m-%d')

# 4. Déterminer le type et le montant
def parse_montant_and_type(row):
    entree = pd.to_numeric(row['Entrée'], errors='coerce')
    sortie = pd.to_numeric(row['Sortie'], errors='coerce')
    
    if pd.notna(entree) and entree > 0:
        return entree, 'APPRO_PC'
    elif pd.notna(sortie) and sortie > 0:
        return sortie, 'DEPENSE_PC'
    return 0.0, 'DEPENSE_PC'

res = df.apply(parse_montant_and_type, axis=1)
df['montant'] = [r[0] for r in res]
df['type'] = [r[1] for r in res]

# 5. Nettoyer le libellé et attribuer un code site par défaut (ex: MALELA ou KASUMBALESA selon le libellé)
df['libelle'] = df['Libellé'].str.strip()
df['caisse_type'] = df['Caisse'].str.strip()

# Déduction simple du site basée sur le texte
def deduce_site(libelle):
    l = libelle.upper()
    if 'KASUMBALESA' in l:
        return 'KASUMBALESA'
    elif 'MALELA' in l:
        return 'MALELA'
    return 'MALELA' # Site par défaut

df['site'] = df['libelle'].apply(deduce_site)

# 6. Sélectionner uniquement les colonnes finales pour Supabase
final_df = df[['site', 'date', 'libelle', 'montant', 'type', 'caisse_type']]

# Exporter vers un fichier CSV propre
final_df.to_csv("operations_clean.csv", index=False, encoding='utf-8')
print("Fichier 'operations_clean.csv' généré avec succès !")
print(final_df.head(10))