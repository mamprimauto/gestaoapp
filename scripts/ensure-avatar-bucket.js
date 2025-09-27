const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ensureAvatarBucket() {
  try {
    console.log('🔧 Checking avatars bucket...');
    
    // Listar buckets existentes
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
    } else {
      console.log('Existing buckets:', buckets?.map(b => b.name) || []);
    }
    
    // Verificar se o bucket avatars existe
    const avatarBucket = buckets?.find(b => b.name === 'avatars');
    
    if (!avatarBucket) {
      console.log('Creating avatars bucket...');
      
      // Criar o bucket como público
      const { data, error } = await supabase.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
      } else {
        console.log('✅ Avatars bucket created successfully!');
      }
    } else {
      console.log('✅ Avatars bucket already exists');
      console.log('Bucket configuration:', {
        name: avatarBucket.name,
        public: avatarBucket.public,
        fileSizeLimit: avatarBucket.file_size_limit,
        allowedMimeTypes: avatarBucket.allowed_mime_types
      });
      
      // Se o bucket existe mas não é público, atualizar
      if (!avatarBucket.public) {
        console.log('⚠️ Bucket is not public, updating...');
        const { error: updateError } = await supabase.storage.updateBucket('avatars', {
          public: true,
          fileSizeLimit: 5242880,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
        });
        
        if (updateError) {
          console.error('Error updating bucket:', updateError);
        } else {
          console.log('✅ Bucket updated to public');
        }
      }
    }
    
    // Testar upload de um arquivo pequeno
    console.log('\n📝 Testing bucket access...');
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = 'Test file for avatar bucket';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, new Blob([testContent], { type: 'text/plain' }), {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
    } else {
      console.log('✅ Test upload successful');
      
      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(testFileName);
      
      console.log('Public URL:', publicUrl);
      
      // Limpar arquivo de teste
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([testFileName]);
      
      if (!deleteError) {
        console.log('✅ Test file cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

ensureAvatarBucket();