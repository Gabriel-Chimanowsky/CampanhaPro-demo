import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log("Checking 'contacts' table...");
  const { data: contacts, error: cError } = await supabase.from('contacts').select('*').limit(1);
  if (cError) {
    console.error("Error fetching contacts:", cError.message);
  } else {
    console.log("Contacts columns:", Object.keys(contacts[0] || {}));
  }

  console.log("\nChecking 'social_tokens' table...");
  const { data: tokens, error: tError } = await supabase.from('social_tokens').select('*').limit(1);
  if (tError) {
    console.error("Error fetching social_tokens:", tError.message);
  } else {
    console.log("Social tokens columns:", Object.keys(tokens[0] || {}));
  }
}

check();
