# Le Mauvais Flic - SaaS d'automatisation de recouvrement

> **Lien vers l'application en direct :  https://mauvais-flic-saas.vercel.app/

## Le Projet
Pour les Entreprises, courir après les factures impayées est une tâche angoissante, chronophage, et qui détériore les relations commerciales. 

**Le Mauvais Flic** est une application SaaS full-stack conçue pour automatiser cette tâche ingrate. L'utilisateur ajoute ses factures en attente et personnalise son ton. L'outil prend ensuite le relais et envoie de manière autonome des e-mails de relance à intervalles réguliers (de la piqûre de rappel amicale à la mise en demeure).

## Stack Technique

* **Frontend :** Next.js , React, TailwindCSS
* **Langage :** TypeScript
* **Backend & Base de données :** Supabase (PostgreSQL)
* **Authentification :** Supabase Auth
* **Mailing :** API Resend
* **Automatisation :** Cron Jobs

## Fonctionnalités Principales
1. **Authentification sécurisée :** Inscription et connexion gérées via Supabase avec isolation des données.
2. **Dashboard interactif :** Ajout, modification, et suivi des factures impayées.
3. **Personnalisation dynamique :** Création de modèles d'e-mails sur 3 niveaux de pression avec variables dynamiques (`[clientName]`, `[amount]`, etc.).
4. **Moteur de relance autonome :** Un script tourne en tâche de fond pour vérifier quotidiennement les échéances, incrémenter le niveau de relance, et déclencher les e-mails via Resend.

## Focus Architecture : Le Moteur d'Automatisation
La véritable valeur ajoutée de ce projet réside dans son backend. 
Le fichier `app/api/cron/route.ts` agit comme un robot indépendant. Sécurisé par un `CRON_SECRET`, il contourne intelligemment la sécurité front-end via une *Service Role Key* pour :
- Interroger les factures en attente.
- Calculer le temps écoulé depuis la dernière relance.
- Formater les textes dynamiques.
- Appeler l'API Resend et mettre à jour le statut en base de données de façon transactionnelle.
