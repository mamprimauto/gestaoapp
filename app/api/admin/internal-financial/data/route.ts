import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    // Se mês e ano especificados, buscar dados específicos
    if (month && year) {
      const { data, error } = await supabase
        .from('internal_financial_data')
        .select('*')
        .eq('month', parseInt(month))
        .eq('year', parseInt(year))
        .single()

      if (error && error.code === 'PGRST116') {
        return NextResponse.json({ data: null, message: 'Nenhum dado encontrado' })
      }

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    // Buscar todos os dados
    const { data, error } = await supabase
      .from('internal_financial_data')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })

  } catch (error: any) {

    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const body = await request.json()

    const {
      month,
      year,
      faturamento_bruto,
      numero_vendas,
      equipe_fixa = 0,
      ferramentas = 0,
      investimento_google_ads = 0,
      investimento_facebook = 0,
      investimento_tiktok = 0,
      chargebacks = 0,
      reembolsos = 0,
      chargebacks_reembolsos = 0, // manter compatibilidade
      trafego_pago = 0, // compatibilidade temporária
      taxa_plataforma_percentual = 4.99,
      imposto_percentual = 10.00,
      gestor_trafego_percentual = 15.00,
      copywriter_percentual = 10.00
    } = body

    // Validações
    if (!month || !year || faturamento_bruto === undefined || numero_vendas === undefined) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: month, year, faturamento_bruto, numero_vendas' 
      }, { status: 400 })
    }

    // Usar apenas campos básicos que sabemos que existem
    const totalChargebacks = chargebacks + reembolsos || chargebacks_reembolsos || 0;

    // CALCULAR TODOS OS VALORES (já que removemos os triggers)
    const taxa_plataforma = faturamento_bruto * (taxa_plataforma_percentual / 100);
    const imposto = faturamento_bruto * (imposto_percentual / 100);
    
    // Calcular lucro bruto (receita - custos fixos - investimentos - taxa - imposto - chargebacks)
    const totalInvestimentos = (investimento_google_ads || 0) + (investimento_facebook || 0) + (investimento_tiktok || 0);
    const lucro_bruto = faturamento_bruto - 
                       (equipe_fixa || 0) - 
                       totalChargebacks - 
                       taxa_plataforma - 
                       imposto - 
                       (ferramentas || 0) - 
                       totalInvestimentos;
    
    // Calcular comissões como percentual do lucro bruto (só se tiver lucro positivo)
    const comissao_gestor = lucro_bruto > 0 ? lucro_bruto * (gestor_trafego_percentual / 100) : 0;
    const comissao_copywriter = lucro_bruto > 0 ? lucro_bruto * (copywriter_percentual / 100) : 0;
    
    // Calcular lucro líquido (descontando as comissões)
    const lucro_liquido = lucro_bruto - comissao_gestor - comissao_copywriter;
    
    // Calcular indicadores
    const ticket_medio = numero_vendas > 0 ? faturamento_bruto / numero_vendas : 0;
    const total_custos = (equipe_fixa || 0) + totalChargebacks + taxa_plataforma + imposto + (ferramentas || 0) + totalInvestimentos + comissao_gestor + comissao_copywriter;
    const roi = total_custos > 0 ? (lucro_liquido / total_custos) * 100 : 0;
    const percentual_chargeback = faturamento_bruto > 0 ? ((chargebacks || 0) / faturamento_bruto) * 100 : 0;
    const percentual_reembolso = faturamento_bruto > 0 ? ((reembolsos || 0) / faturamento_bruto) * 100 : 0;
    const margem_contribuicao = faturamento_bruto > 0 ? (lucro_bruto / faturamento_bruto) * 100 : 0;

    const { data, error } = await supabase
      .from('internal_financial_data')
      .insert({
        month: month,
        year: year,
        faturamento_bruto: faturamento_bruto,
        numero_vendas: numero_vendas,
        equipe_fixa: equipe_fixa || 0,
        ferramentas: ferramentas || 0,
        investimento_google_ads: investimento_google_ads || 0,
        investimento_facebook: investimento_facebook || 0,
        investimento_tiktok: investimento_tiktok || 0,
        chargebacks: chargebacks || 0,
        reembolsos: reembolsos || 0,
        chargebacks_reembolsos: totalChargebacks || 0,
        taxa_plataforma_percentual: taxa_plataforma_percentual || 4.99,
        imposto_percentual: imposto_percentual || 10.00,
        gestor_trafego_percentual: gestor_trafego_percentual || 15.00,
        copywriter_percentual: copywriter_percentual || 10.00,
        // VALORES CALCULADOS (agora sei que esses campos existem!)
        taxa_plataforma,
        imposto,
        lucro_liquido,
        comissao_gestor_trafego: comissao_gestor,
        comissao_copywriter: comissao_copywriter,
        ticket_medio,
        roi,
        percentual_reembolso_chargeback: percentual_reembolso,
        margem_contribuicao
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'Já existem dados para este mês/ano' 
        }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Dados financeiros criados com sucesso' })

  } catch (error: any) {

    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const body = await request.json()

    const { 
      id, 
      month,
      year,
      faturamento_bruto,
      numero_vendas,
      equipe_fixa = 0,
      ferramentas = 0,
      investimento_google_ads = 0,
      investimento_facebook = 0,
      investimento_tiktok = 0,
      chargebacks = 0,
      reembolsos = 0,
      chargebacks_reembolsos = 0,
      taxa_plataforma_percentual = 4.99,
      imposto_percentual = 10.00,
      gestor_trafego_percentual = 15.00,
      copywriter_percentual = 10.00,
      ...rest
    } = body

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório para atualização' }, { status: 400 })
    }

    // FAZER OS MESMOS CÁLCULOS DO POST
    const totalChargebacks = chargebacks + reembolsos || chargebacks_reembolsos || 0;

    const taxa_plataforma = faturamento_bruto * (taxa_plataforma_percentual / 100);
    const imposto = faturamento_bruto * (imposto_percentual / 100);
    
    const totalInvestimentos = (investimento_google_ads || 0) + (investimento_facebook || 0) + (investimento_tiktok || 0);
    const lucro_bruto = faturamento_bruto - 
                       (equipe_fixa || 0) - 
                       totalChargebacks - 
                       taxa_plataforma - 
                       imposto - 
                       (ferramentas || 0) - 
                       totalInvestimentos;
    
    // Comissões são percentuais do lucro bruto (só se tiver lucro positivo)
    const comissao_gestor = lucro_bruto > 0 ? lucro_bruto * (gestor_trafego_percentual / 100) : 0;
    const comissao_copywriter = lucro_bruto > 0 ? lucro_bruto * (copywriter_percentual / 100) : 0;
    
    // Lucro líquido desconta as comissões
    const lucro_liquido = lucro_bruto - comissao_gestor - comissao_copywriter;
    
    const ticket_medio = numero_vendas > 0 ? faturamento_bruto / numero_vendas : 0;
    const total_custos = (equipe_fixa || 0) + totalChargebacks + taxa_plataforma + imposto + (ferramentas || 0) + totalInvestimentos + comissao_gestor + comissao_copywriter;
    const roi = total_custos > 0 ? (lucro_liquido / total_custos) * 100 : 0;
    const percentual_chargeback = faturamento_bruto > 0 ? ((chargebacks || 0) / faturamento_bruto) * 100 : 0;
    const percentual_reembolso = faturamento_bruto > 0 ? ((reembolsos || 0) / faturamento_bruto) * 100 : 0;
    const margem_contribuicao = faturamento_bruto > 0 ? (lucro_bruto / faturamento_bruto) * 100 : 0;

    const updateData = {
      month,
      year,
      faturamento_bruto,
      numero_vendas,
      equipe_fixa: equipe_fixa || 0,
      ferramentas: ferramentas || 0,
      investimento_google_ads: investimento_google_ads || 0,
      investimento_facebook: investimento_facebook || 0,
      investimento_tiktok: investimento_tiktok || 0,
      chargebacks: chargebacks || 0,
      reembolsos: reembolsos || 0,
      chargebacks_reembolsos: totalChargebacks,
      taxa_plataforma_percentual,
      imposto_percentual,
      gestor_trafego_percentual,
      copywriter_percentual,
      // VALORES CALCULADOS
      taxa_plataforma,
      imposto,
      lucro_liquido,
      comissao_gestor_trafego: comissao_gestor,
      comissao_copywriter: comissao_copywriter,
      ticket_medio,
      roi,
      percentual_reembolso_chargeback: percentual_reembolso,
      margem_contribuicao,
      ...rest
    };

    const { data, error } = await supabase
      .from('internal_financial_data')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Dados financeiros atualizados com sucesso' })

  } catch (error: any) {

    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const resetAll = searchParams.get('reset_all')

    // Se reset_all=true, deletar todos os dados
    if (resetAll === 'true') {
      const { error } = await supabase
        .from('internal_financial_data')
        .delete()
        .gte('created_at', '1900-01-01') // Deleta todos os registros

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ message: 'Todos os dados financeiros foram resetados com sucesso' })
    }

    // Lógica original para deletar por ID
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const { error } = await supabase
      .from('internal_financial_data')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Dados financeiros excluídos com sucesso' })

  } catch (error: any) {

    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}