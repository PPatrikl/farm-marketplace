// src/services/contacts.ts

import { supabase } from '../supabaseClient'

interface SendContactParams {
  forest_listing_id?: string
  farm_listing_id?: string
  receiver_id: string
  name: string
  email: string
  message: string
  website?: string // honeypot
}

export async function sendContactMessage(params: SendContactParams) {
  const { data, error } = await supabase.functions.invoke('send-contact-message', {
    body: params,
  })

  if (error) {
    console.error('[contacts] send-contact-message error:', error.message)
    throw new Error(error.message || 'Contact request failed')
  }

  return data
}