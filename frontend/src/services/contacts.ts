// src/services/contacts.ts
//import { supabase } from '../supabaseClient'

interface SendContactParams {
  forest_listing_id?: string;
  farm_listing_id?: string;
  seller_id?: string; 
  name: string;
  email: string;
  message: string;
  website?: string; // honeypot, у реальных пользователей всегда пусто
}

export async function sendContactMessage(params: SendContactParams) {
  const response = await fetch("http://localhost:3001/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || "Contact request failed");
  }

  return result;
}