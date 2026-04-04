import { NextResponse } from 'next/server';
// NOUVEAU : On importe createClient directement pour fabriquer le passe-partout
import { createClient } from '@supabase/supabase-js'; 
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// NOUVEAU : On crée une connexion Supabase spéciale "Robot" avec la clé secrète qui contourne le RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) { 
  // --- LE CADENAS DE SÉCURITÉ ---
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: "Accès refusé. Seul Vercel possède la clé." }, 
      { status: 401 }
    );
  }
  // ------------------------------

  try {
    // 1. On cherche toutes les factures "en attente" (pending)
    // ATTENTION : J'ai rajouté "user_id" ici pour pouvoir lire le profil
    const { data: invoices, error } = await supabaseAdmin
      .from('invoices')
      .select('*, clients(name, email, user_id)')
      .eq('status', 'pending');

    if (error) throw error;
    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ message: "Aucune facture en attente." });
    }

    const today = new Date();
    let emailsSent = 0;

    // 2. On analyse chaque facture
    for (const invoice of invoices) {
      const dueDate = new Date(invoice.due_date);

      if (dueDate < today && invoice.reminder_level < 3) {
        
        // On cherche le paramètre personnalisé de l'utilisateur
        // On gère le cas où clients serait un tableau selon la structure Supabase
        const clientId = Array.isArray(invoice.clients) ? invoice.clients[0]?.user_id : invoice.clients?.user_id;
        
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('reminder_interval_days')
          .eq('id', clientId)
          .single();
        
        const customInterval = invoice.custom_interval_days || profile?.reminder_interval_days || 7;
        let shouldSendEmail = false;

        if (invoice.reminder_level === 0) {
          shouldSendEmail = true;
        } else if (invoice.last_reminder_date) {
          const lastReminder = new Date(invoice.last_reminder_date);
          const diffTime = Math.abs(today.getTime() - lastReminder.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays >= customInterval) {
            shouldSendEmail = true;
          }
        }

        if (shouldSendEmail) {
          const clientEmail = Array.isArray(invoice.clients) ? invoice.clients[0]?.email : invoice.clients?.email;
          const clientName = Array.isArray(invoice.clients) ? invoice.clients[0]?.name : invoice.clients?.name;
          
          let emailSubject = "";
          let emailText = "";

          if (invoice.reminder_level === 0) {
            emailSubject = `Rappel amical : Facture ${invoice.invoice_number} arrivée à échéance`;
            emailText = `Bonjour ${clientName},\n\nSauf erreur de notre part, la facture ${invoice.invoice_number} d'un montant de ${invoice.amount}€ est arrivée à échéance le ${invoice.due_date}.\n\nPourriez-vous procéder au règlement rapidement ?\n\nCordialement,\nLe service comptabilité.`;
          } else if (invoice.reminder_level === 1) {
            emailSubject = `URGENT : Facture ${invoice.invoice_number} en retard`;
            emailText = `Bonjour ${clientName},\n\nNous n'avons toujours pas reçu le paiement de la facture ${invoice.invoice_number} (${invoice.amount}€).\nMerci de régulariser la situation sous 48h.\n\nCordialement.`;
          } else {
            emailSubject = `MISE EN DEMEURE : Facture ${invoice.invoice_number}`;
            emailText = `Bonjour,\n\nCeci est une mise en demeure concernant la facture ${invoice.invoice_number}. Sans réception de votre paiement de ${invoice.amount}€, des pénalités de retard légales seront appliquées.\n\nService Recouvrement.`;
          }

          // On envoie l'e-mail
          await resend.emails.send({
            from: 'Recouvrement <onboarding@resend.dev>',
            to: clientEmail,
            subject: emailSubject,
            text: emailText,
          });

          // On met à jour la base de données
          await supabaseAdmin
            .from('invoices')
            .update({ 
              reminder_level: invoice.reminder_level + 1,
              last_reminder_date: new Date().toISOString()
            })
            .eq('id', invoice.id);

          emailsSent++;
        }
      }
    }

    return NextResponse.json({ message: `${emailsSent} e-mail(s) de relance envoyé(s) !` });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}