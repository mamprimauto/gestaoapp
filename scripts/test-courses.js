// Script para testar e popular o sistema de cursos
// Execute com: node scripts/test-courses.js

async function testCourses() {
  console.log('🚀 Testando sistema de cursos...\n');
  
  // Teste 1: Verificar se a API de cursos está funcionando
  console.log('1. Testando API de cursos...');
  try {
    const response = await fetch('http://localhost:3001/api/courses');
    const courses = await response.json();
    console.log('✅ API funcionando. Cursos encontrados:', courses.length);
    
    if (courses.length === 0) {
      console.log('\n📝 Nenhum curso encontrado. Vamos criar um curso de exemplo...\n');
      
      // Criar um curso de exemplo
      const newCourse = {
        title: "Curso de Marketing Digital",
        description: "Aprenda as melhores estratégias de marketing digital para escalar seu negócio",
        thumbnail_url: "https://images.unsplash.com/photo-1432888622747-4eb9a8f2c853?w=800",
        instructor: "João Silva",
        category: "Marketing Digital",
        duration_minutes: 120,
        is_published: true
      };
      
      console.log('2. Criando curso de exemplo...');
      const createResponse = await fetch('http://localhost:3001/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse)
      });
      
      if (createResponse.ok) {
        const createdCourse = await createResponse.json();
        console.log('✅ Curso criado com sucesso!');
        console.log('   ID:', createdCourse.id);
        console.log('   Título:', createdCourse.title);
        
        // Adicionar aulas de exemplo
        console.log('\n3. Adicionando aulas de exemplo...');
        
        const lessons = [
          {
            title: "Introdução ao Marketing Digital",
            description: "Conceitos básicos e fundamentos",
            vimeo_id: "347119375", // ID de exemplo do Vimeo
            duration_seconds: 600,
            course_id: createdCourse.id
          },
          {
            title: "Estratégias de Conteúdo",
            description: "Como criar conteúdo que converte",
            vimeo_id: "347119376", // ID de exemplo do Vimeo
            duration_seconds: 900,
            course_id: createdCourse.id
          },
          {
            title: "Facebook Ads na Prática",
            description: "Criando campanhas que vendem",
            vimeo_id: "347119377", // ID de exemplo do Vimeo
            duration_seconds: 1200,
            course_id: createdCourse.id
          }
        ];
        
        for (const lesson of lessons) {
          const lessonResponse = await fetch('http://localhost:3001/api/lessons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lesson)
          });
          
          if (lessonResponse.ok) {
            console.log(`   ✅ Aula "${lesson.title}" adicionada`);
          } else {
            const error = await lessonResponse.text();
            console.log(`   ❌ Erro ao adicionar aula: ${error}`);
          }
        }
        
        console.log('\n🎉 Sistema de cursos configurado com sucesso!');
        console.log('📌 Acesse /cursos para ver o curso criado');
        console.log('📌 Acesse /equipe > Cursos para gerenciar');
        
      } else {
        const error = await createResponse.text();
        console.log('❌ Erro ao criar curso:', error);
        console.log('\n⚠️  Possível problema:');
        console.log('1. As tabelas não existem no banco de dados');
        console.log('2. Você não está autenticado como admin');
        console.log('\nSolução:');
        console.log('1. Execute o script SQL em scripts/db/060_courses_system.sql no Supabase');
        console.log('2. Faça login como admin e tente novamente');
      }
    } else {
      console.log('\n✅ Sistema de cursos já configurado!');
      console.log(`📚 ${courses.length} curso(s) encontrado(s)`);
      courses.forEach(course => {
        console.log(`   - ${course.title} (${course.lessons?.length || 0} aulas)`);
      });
    }
    
  } catch (error) {
    console.log('❌ Erro ao conectar com a API:', error.message);
    console.log('\n⚠️  Verifique se o servidor está rodando em http://localhost:3001');
  }
}

// Executar o teste
testCourses().catch(console.error);