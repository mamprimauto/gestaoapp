const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfileColumns() {
  try {
    console.log('🔍 Checking profile columns...\n');
    
    // Buscar um perfil para verificar as colunas
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }
    
    if (profiles && profiles.length > 0) {
      const profile = profiles[0];
      console.log('📊 Available columns in profiles table:');
      console.log('=====================================');
      
      const columns = Object.keys(profile);
      columns.forEach(col => {
        const value = profile[col];
        const hasValue = value !== null && value !== undefined && value !== '';
        console.log(`  ${hasValue ? '✅' : '⚪'} ${col}: ${typeof value} ${hasValue ? `(${JSON.stringify(value).substring(0, 50)})` : '(empty)'}`);
      });
      
      console.log('\n📋 Extended profile fields status:');
      console.log('=====================================');
      const extendedFields = [
        'full_name',
        'birth_date', 
        'cpf',
        'rg',
        'pix_key',
        'phone',
        'marital_status',
        'address_street',
        'address_number',
        'address_complement',
        'address_neighborhood',
        'address_city',
        'address_state',
        'address_zipcode'
      ];
      
      extendedFields.forEach(field => {
        const exists = columns.includes(field);
        const hasValue = exists && profile[field] !== null && profile[field] !== undefined && profile[field] !== '';
        console.log(`  ${exists ? (hasValue ? '✅' : '⚪') : '❌'} ${field}: ${exists ? (hasValue ? 'has data' : 'empty') : 'MISSING COLUMN'}`);
      });
      
      // Verificar se há algum perfil com dados preenchidos
      console.log('\n🔍 Checking for profiles with extended data...');
      const { data: profilesWithData, error: searchError } = await supabase
        .from('profiles')
        .select('id, name, email, full_name, cpf, pix_key, phone, address_street')
        .or('full_name.not.is.null,cpf.not.is.null,pix_key.not.is.null,phone.not.is.null')
        .limit(5);
      
      if (!searchError && profilesWithData) {
        if (profilesWithData.length > 0) {
          console.log(`\n✅ Found ${profilesWithData.length} profiles with extended data:`);
          profilesWithData.forEach(p => {
            console.log(`  - ${p.name || p.email}: ${[
              p.full_name ? 'full_name' : '',
              p.cpf ? 'cpf' : '',
              p.pix_key ? 'pix' : '',
              p.phone ? 'phone' : '',
              p.address_street ? 'address' : ''
            ].filter(Boolean).join(', ') || 'no extended data'}`);
          });
        } else {
          console.log('\n⚠️ No profiles found with extended data');
        }
      }
      
    } else {
      console.log('No profiles found in the database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkProfileColumns();