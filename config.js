// Налаштування. Якщо порожньо — додаток працює в ДЕМО-режимі з тестовими даними.
// Візьміть значення в Supabase → Project Settings → API.
window.ALIMAT_CONFIG = {
  SUPABASE_URL: 'https://acjyhwxbeubbzrfwbsyn.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjanlod3hiZXViYnpyZndic3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NTgwNjQsImV4cCI6MjEwNzEzNDA2NH0.BXngcTCq2FufRWDLyHfmUroZmx39tRpFI4vA_nKl6C4',
  // Контакти компанії (показуються в додатку; працівнику — після контакту його координатора)
  COMPANY: {
    name: 'Alimat Group',
    site: 'https://alimatgroup.com',
    phone: '+48 517 654 267',          // кандидати і працівники (є WhatsApp)
    whatsapp: '48517654267',
    phone_companies: '+48 453 194 629',
    email: 'kontakt@alimatgroup.com',
  },
};
