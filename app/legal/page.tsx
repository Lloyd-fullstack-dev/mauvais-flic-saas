// Fichier : app/legal/page.tsx
export default function LegalPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-slate-800 font-sans">
      <main className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-black text-slate-900 mb-8">Mentions Légales</h1>
        
        <div className="space-y-6 text-slate-600">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Éditeur du site</h2>
            <p>Ce site est édité par : [Ton Nom / Ton Entreprise]</p>
            <p>Email de contact : [Ton Email]</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">2. Hébergement</h2>
            <p>Le site est hébergé par la société Vercel Inc.</p>
            <p>Adresse : 340 S Lemon Ave #4133 Walnut, CA 91789, USA.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">3. Données personnelles</h2>
            <p>Le Mauvais Flic utilise Supabase pour le stockage sécurisé des données.</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100">
          <a href="/" className="text-red-600 font-bold hover:underline">← Retour au tableau de bord</a>
        </div>
      </main>
    </div>
  );
}