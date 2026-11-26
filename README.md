<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6c549c1a-007b-4355-950a-4a6930e25782

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

    ./gradlew clean assembleDebug

## Roadmap d'améliorations prioritaires

### Priorité 1 - gains rapides
- Gestion de produits/catalogue pour éviter de saisir à chaque fois le nom et le prix
- Vente multi-articles avec panier et lignes détaillées
- Historique de prix par client
- Détecter automatiquement les clients à risque selon le retard ou le montant

### Priorité 2 - confort et automatisation
- Rappels automatiques programmés et modèles de messages personnalisables
- Rappel récurrent tant qu'une dette n'est pas remboursée
- Recherche globale, tri des listes et meilleure navigation

### Priorité 3 - reporting et suivi
- Graphiques d'évolution des dettes et exports PDF/Excel
- Comparaison de périodes et classement des clients les plus fidèles

### Priorité 4 - fonctionnalités avancées
- Photos de facture, signature client et preuves de livraison
- Synchronisation cloud et multi-utilisateur pour l'équipe
- Mode sombre, widget Android et sécurité biométrique

## Plan de développement détaillé

### Phase 1 - améliorer le cœur de l'application
- Ajouter un catalogue de produits dans [src/types.ts](src/types.ts) et le persister dans [src/App.tsx](src/App.tsx)
- Réviser [src/components/NewTransactionForm.tsx](src/components/NewTransactionForm.tsx) pour permettre une vente multi-articles
- Mettre à jour les écrans de détail client et de rapport pour afficher les nouvelles données proprement

### Phase 2 - automatisation et suivi
- Étendre [src/components/Dashboard.tsx](src/components/Dashboard.tsx) avec des rappels programmés et des messages personnalisables
- Ajouter un statut client à risque basé sur l'ancienneté de la dette et le montant restant
- Introduire la recherche globale et le tri dans les listes principales

### Phase 3 - analyses et exports
- Enrichir [src/components/Reports.tsx](src/components/Reports.tsx) avec graphiques, comparaisons de périodes et exports
- Préparer une structure de données compatible PDF/Excel sans casser la sauvegarde locale existante

### Phase 4 - expérience mobile et sécurité
- Ajouter le mode sombre, un widget Android rapide et l’authentification biométrique
- Préparer la synchronisation cloud et le support multi-utilisateur dans [src/components/BackupSettings.tsx](src/components/BackupSettings.tsx) et [src/App.tsx](src/App.tsx)

## Backlog technique priorisé

### 1. Fonctionnalités métier immédiates
- [ ] Ajouter un modèle de produit avec nom et prix dans [src/types.ts](src/types.ts)
- [ ] Stocker et charger la liste des produits depuis [src/App.tsx](src/App.tsx)
- [ ] Réécrire [src/components/NewTransactionForm.tsx](src/components/NewTransactionForm.tsx) pour gérer un panier multi-lignes
- [ ] Adapter le calcul du solde en fonction d’une transaction composite

### 2. Suivi client et dette
- [ ] Ajouter un historique d’achats par client dans la vue détail
- [ ] Définir une logique de risque client (retard, montant, ancienneté)
- [ ] Afficher un badge ou un statut visuel sur la liste des clients

### 3. Automatisation et communication
- [ ] Étendre [src/components/Dashboard.tsx](src/components/Dashboard.tsx) avec des rappels planifiés
- [ ] Permettre l’édition des modèles de message dans [src/components/ReminderTemplatesSettings.tsx](src/components/ReminderTemplatesSettings.tsx)
- [ ] Ajouter un rappel récurrent tant qu’une dette reste ouverte

### 4. Analyse et reporting
- [ ] Élargir [src/components/Reports.tsx](src/components/Reports.tsx) avec graphiques et exports
- [ ] Préparer une structure de données compatible PDF/Excel
- [ ] Ajouter des vues de comparaison de période et de classement client

### 5. Expérience mobile et sécurité
- [ ] Ajouter un thème sombre et un raccourci Android rapide
- [ ] Intégrer une authentification biométrique côté mobile
- [ ] Préparer la sauvegarde automatique et la synchronisation cloud
