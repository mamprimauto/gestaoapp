"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputMask } from '@/components/ui/input-mask'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Mail, Lock, UserPlus, LogIn, User, MapPin, Phone, CreditCard } from 'lucide-react'
import { validateEmail, validateCPF, validatePhone, validateCEP, validateRequired, validateMinAge, BRAZILIAN_STATES, MARITAL_STATUS_OPTIONS } from '@/lib/validations'
import { fetchAddressByCEP, removeAllMasks } from '@/lib/masks'
import type { RegistrationForm, ValidationErrors } from '@/lib/types/profile'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingCEP, setLoadingCEP] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  
  // Estados para login
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  })
  
  // Estados para registro
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>({
    email: '',
    password: '',
    full_name: '',
    birth_date: '',
    cpf: '',
    rg: '',
    phone: '',
    marital_status: 'solteiro' as const,
    address_zipcode: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    pix_key: ''
  })

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    if (isLogin) {
      if (!validateEmail(loginForm.email)) {
        newErrors.email = 'Email inválido'
      }
      if (!validateRequired(loginForm.password)) {
        newErrors.password = 'Senha obrigatória'
      }
    } else {
      // Validações para registro
      if (!validateEmail(registrationForm.email)) {
        newErrors.email = 'Email inválido'
      }
      if (registrationForm.password.length < 6) {
        newErrors.password = 'Senha deve ter pelo menos 6 caracteres'
      }
      if (!validateRequired(registrationForm.full_name)) {
        newErrors.full_name = 'Nome completo obrigatório'
      }
      if (!validateMinAge(registrationForm.birth_date)) {
        newErrors.birth_date = 'Deve ser maior de 18 anos'
      }
      if (!validateCPF(registrationForm.cpf)) {
        newErrors.cpf = 'CPF inválido'
      }
      if (!validatePhone(registrationForm.phone)) {
        newErrors.phone = 'Telefone inválido'
      }
      if (!validateCEP(registrationForm.address_zipcode)) {
        newErrors.address_zipcode = 'CEP inválido'
      }
      if (!validateRequired(registrationForm.address_street)) {
        newErrors.address_street = 'Endereço obrigatório'
      }
      if (!validateRequired(registrationForm.address_number)) {
        newErrors.address_number = 'Número obrigatório'
      }
      if (!validateRequired(registrationForm.address_city)) {
        newErrors.address_city = 'Cidade obrigatória'
      }
      if (!validateRequired(registrationForm.address_state)) {
        newErrors.address_state = 'Estado obrigatório'
      }
      // Foto de perfil agora é opcional - removido validação obrigatória
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Fazer login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      })

      if (authError) {

        throw authError
      }

      if (!authData?.user) {
        throw new Error('Usuário não encontrado após login')
      }

      // Aguardar um momento para garantir que a sessão está estabelecida
      await new Promise(resolve => setTimeout(resolve, 500))

      // Verificar se o usuário está aprovado

      // Buscar perfil com retry em caso de falha
      let profile = null
      let profileError = null
      let retries = 3
      
      while (retries > 0 && !profile) {
        const { data: profileData, error: fetchError } = await supabase
          .from('profiles')
          .select('id, email, name, role, approved, avatar_url')
          .eq('id', authData.user.id)
          .single()
        
        if (fetchError) {
          profileError = fetchError
          retries--
          if (retries > 0) {

            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } else {
          // Garantir que temos um objeto, não um array
          profile = Array.isArray(profileData) ? profileData[0] : profileData
        }
      }

      // Se não encontrou perfil após todas as tentativas
      if (!profile) {

        await supabase.auth.signOut()
        toast.error('Perfil não encontrado. Contate o administrador.')
        return
      }

      // Verificar aprovação - só aceitar boolean true
      if (profile.approved !== true) {

        await supabase.auth.signOut()
        toast.error('Sua conta ainda não foi aprovada. Aguarde a aprovação do administrador.')
        return
      }

      toast.success('Login realizado com sucesso!')
      
      // Aguardar um momento antes de redirecionar
      await new Promise(resolve => setTimeout(resolve, 500))

      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect') || '/tarefas'
      router.push(redirect)
      
    } catch (error: any) {

      toast.error(error.message || 'Erro ao fazer login')
    }
  }

  const handleRegister = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      toast.info('Criando conta de usuário...')
      
      // Criar usuário
      const { data, error } = await supabase.auth.signUp({
        email: registrationForm.email,
        password: registrationForm.password,
        options: {
          data: {
            full_name: registrationForm.full_name,
          },
        }
      })

      if (error) {

        toast.error('Erro ao criar usuário: ' + error.message)
        throw error
      }

      if (!data.user) {
        toast.error('Erro inesperado: usuário não foi criado')
        throw new Error('Usuário não foi criado')
      }

      // Criar perfil completo
      if (data.user) {
        toast.info('Salvando dados do perfil...')
        
        // Aguardar um pouco para garantir que o usuário foi criado completamente
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        try {
          const profileData = {
            id: data.user.id,
            email: registrationForm.email,
            name: registrationForm.full_name,
            avatar_url: null,
            approved: false,
            role: 'editor',
            // Campos estendidos
            full_name: registrationForm.full_name,
            birth_date: registrationForm.birth_date || null,
            cpf: removeAllMasks(registrationForm.cpf),
            rg: registrationForm.rg || null,
            phone: removeAllMasks(registrationForm.phone),
            marital_status: registrationForm.marital_status,
            address_zipcode: removeAllMasks(registrationForm.address_zipcode),
            address_street: registrationForm.address_street,
            address_number: registrationForm.address_number,
            address_complement: registrationForm.address_complement || null,
            address_neighborhood: registrationForm.address_neighborhood,
            address_city: registrationForm.address_city,
            address_state: registrationForm.address_state,
            pix_key: registrationForm.pix_key || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const { data: insertedProfile, error: profileError } = await supabase
            .from('profiles')
            .insert(profileData)
            .select()
            .single()

          if (profileError) {

            // Se o erro for de conflito (perfil já existe), tentar atualizar
            if (profileError.code === '23505') {

              toast.info('Perfil já existe, atualizando dados...')
              
              const updateData = {
                email: registrationForm.email,
                name: registrationForm.full_name,
                avatar_url: null,
                approved: false,
                role: 'editor',
                // Campos estendidos
                full_name: registrationForm.full_name,
                birth_date: registrationForm.birth_date || null,
                cpf: removeAllMasks(registrationForm.cpf),
                rg: registrationForm.rg || null,
                phone: removeAllMasks(registrationForm.phone),
                marital_status: registrationForm.marital_status,
                address_zipcode: removeAllMasks(registrationForm.address_zipcode),
                address_street: registrationForm.address_street,
                address_number: registrationForm.address_number,
                address_complement: registrationForm.address_complement || null,
                address_neighborhood: registrationForm.address_neighborhood,
                address_city: registrationForm.address_city,
                address_state: registrationForm.address_state,
                pix_key: registrationForm.pix_key || null,
                updated_at: new Date().toISOString()
              }

              const { data: updatedProfile, error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', data.user.id)
                .select()
                .single()
              
              if (updateError) {

                toast.error('Erro ao atualizar perfil: ' + updateError.message)
                throw new Error('Erro ao salvar dados do perfil')
              } else {

                toast.success('Perfil atualizado com sucesso!')
              }
            } else {
              const errorMsg = 'Erro ao salvar dados do perfil: ' + profileError.message
              toast.error(errorMsg)
              throw new Error(errorMsg)
            }
          } else {

            toast.success('Perfil criado com sucesso!')
          }
        } catch (error) {

          // Não fazer throw aqui se for erro de perfil já existente que foi tratado
          if (error instanceof Error && !error.message.includes('Erro ao salvar dados do perfil')) {
            throw error
          }
        }

        // Fazer logout imediatamente após registro
        toast.info('Finalizando registro...')
        await supabase.auth.signOut()
      }

      // Sucesso final
      toast.success('Conta criada com sucesso! Aguarde a aprovação do administrador para fazer login.')
      
      // Limpar formulário e voltar para login
      setRegistrationForm({
        email: '',
        password: '',
        full_name: '',
        birth_date: '',
        cpf: '',
        rg: '',
        phone: '',
        marital_status: 'solteiro' as const,
        address_zipcode: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        pix_key: ''
      })
      setIsLogin(true)
      
    } catch (error: any) {

      toast.error(error.message || 'Erro inesperado ao criar conta. Tente novamente.')
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário')
      return
    }

    setLoading(true)
    try {
      if (isLogin) {
        await handleLogin()
      } else {
        await handleRegister()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCEPBlur = async () => {
    if (registrationForm.address_zipcode && validateCEP(registrationForm.address_zipcode)) {
      setLoadingCEP(true)
      try {
        const addressData = await fetchAddressByCEP(registrationForm.address_zipcode)
        setRegistrationForm(prev => ({
          ...prev,
          address_street: addressData.street,
          address_neighborhood: addressData.neighborhood,
          address_city: addressData.city,
          address_state: addressData.state,
        }))
        toast.success('Endereço preenchido automaticamente!')
      } catch (error) {
        toast.error('Não foi possível buscar o endereço')
      } finally {
        setLoadingCEP(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4">
      <div className={`w-full ${isLogin ? 'max-w-md' : 'max-w-4xl'}`}>
        <Card className="bg-zinc-900 border-zinc-800 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-white">
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {isLogin 
                ? 'Faça login para continuar' 
                : 'Preencha seus dados completos para criar sua conta'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleAuth} className="space-y-6">
              {isLogin ? (
                // Formulário de Login
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="login-email" className="text-zinc-300">
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="seu@email.com"
                      className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <Label htmlFor="login-password" className="text-zinc-300">
                      Senha
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
                      className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
                  </div>
                </div>
              ) : (
                // Formulário de Registro
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Dados Pessoais */}
                  <Card className="bg-zinc-800/50 border-zinc-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Dados Pessoais
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-zinc-300">Nome Completo *</Label>
                        <Input
                          value={registrationForm.full_name}
                          onChange={(e) => setRegistrationForm(prev => ({ ...prev, full_name: e.target.value }))}
                          placeholder="Nome completo"
                          className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                        {errors.full_name && <p className="text-red-400 text-sm mt-1">{errors.full_name}</p>}
                      </div>

                      <div>
                        <Label className="text-zinc-300">Data de Nascimento *</Label>
                        <Input
                          type="date"
                          value={registrationForm.birth_date}
                          onChange={(e) => setRegistrationForm(prev => ({ ...prev, birth_date: e.target.value }))}
                          className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                        {errors.birth_date && <p className="text-red-400 text-sm mt-1">{errors.birth_date}</p>}
                      </div>

                      <div>
                        <Label className="text-zinc-300">CPF *</Label>
                        <InputMask
                          mask="cpf"
                          value={registrationForm.cpf}
                          onValueChange={(value) => setRegistrationForm(prev => ({ ...prev, cpf: value }))}
                          placeholder="000.000.000-00"
                          className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                        {errors.cpf && <p className="text-red-400 text-sm mt-1">{errors.cpf}</p>}
                      </div>

                      <div>
                        <Label className="text-zinc-300">RG</Label>
                        <Input
                          value={registrationForm.rg}
                          onChange={(e) => setRegistrationForm(prev => ({ ...prev, rg: e.target.value }))}
                          placeholder="12.345.678-9"
                          className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                      </div>

                      <div>
                        <Label className="text-zinc-300">Estado Civil *</Label>
                        <Select
                          value={registrationForm.marital_status}
                          onValueChange={(value) => setRegistrationForm(prev => ({ ...prev, marital_status: value as any }))}
                        >
                          <SelectTrigger className="mt-1 bg-zinc-800 border-zinc-700 text-white">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {MARITAL_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contato e Acesso */}
                  <Card className="bg-zinc-800/50 border-zinc-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Contato e Acesso
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-zinc-300">Email *</Label>
                        <Input
                          type="email"
                          value={registrationForm.email}
                          onChange={(e) => setRegistrationForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="seu@email.com"
                          className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                        {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                      </div>

                      <div>
                        <Label className="text-zinc-300">Senha *</Label>
                        <Input
                          type="password"
                          value={registrationForm.password}
                          onChange={(e) => setRegistrationForm(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Mínimo 6 caracteres"
                          className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                        {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
                      </div>

                      <div>
                        <Label className="text-zinc-300">Telefone *</Label>
                        <InputMask
                          mask="phone"
                          value={registrationForm.phone}
                          onValueChange={(value) => setRegistrationForm(prev => ({ ...prev, phone: value }))}
                          placeholder="(11) 99999-9999"
                          className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                        {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
                      </div>

                      <div>
                        <Label className="text-zinc-300">Chave PIX</Label>
                        <Input
                          value={registrationForm.pix_key}
                          onChange={(e) => setRegistrationForm(prev => ({ ...prev, pix_key: e.target.value }))}
                          placeholder="CPF, email, telefone ou chave aleatória"
                          className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Endereço */}
                  <Card className="bg-zinc-800/50 border-zinc-700 md:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Endereço
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-zinc-300">CEP *</Label>
                          <InputMask
                            mask="cep"
                            value={registrationForm.address_zipcode}
                            onValueChange={(value) => setRegistrationForm(prev => ({ ...prev, address_zipcode: value }))}
                            onBlur={handleCEPBlur}
                            placeholder="00000-000"
                            className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                          />
                          {loadingCEP && <p className="text-blue-400 text-sm mt-1">Buscando endereço...</p>}
                          {errors.address_zipcode && <p className="text-red-400 text-sm mt-1">{errors.address_zipcode}</p>}
                        </div>

                        <div className="md:col-span-2">
                          <Label className="text-zinc-300">Rua/Avenida *</Label>
                          <Input
                            value={registrationForm.address_street}
                            onChange={(e) => setRegistrationForm(prev => ({ ...prev, address_street: e.target.value }))}
                            placeholder="Nome da rua"
                            className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                          />
                          {errors.address_street && <p className="text-red-400 text-sm mt-1">{errors.address_street}</p>}
                        </div>

                        <div>
                          <Label className="text-zinc-300">Número *</Label>
                          <Input
                            value={registrationForm.address_number}
                            onChange={(e) => setRegistrationForm(prev => ({ ...prev, address_number: e.target.value }))}
                            placeholder="123"
                            className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                          />
                          {errors.address_number && <p className="text-red-400 text-sm mt-1">{errors.address_number}</p>}
                        </div>

                        <div>
                          <Label className="text-zinc-300">Complemento</Label>
                          <Input
                            value={registrationForm.address_complement}
                            onChange={(e) => setRegistrationForm(prev => ({ ...prev, address_complement: e.target.value }))}
                            placeholder="Apto, Bloco, etc."
                            className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                          />
                        </div>

                        <div>
                          <Label className="text-zinc-300">Bairro *</Label>
                          <Input
                            value={registrationForm.address_neighborhood}
                            onChange={(e) => setRegistrationForm(prev => ({ ...prev, address_neighborhood: e.target.value }))}
                            placeholder="Nome do bairro"
                            className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                          />
                        </div>

                        <div>
                          <Label className="text-zinc-300">Cidade *</Label>
                          <Input
                            value={registrationForm.address_city}
                            onChange={(e) => setRegistrationForm(prev => ({ ...prev, address_city: e.target.value }))}
                            placeholder="Nome da cidade"
                            className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                          />
                          {errors.address_city && <p className="text-red-400 text-sm mt-1">{errors.address_city}</p>}
                        </div>

                        <div>
                          <Label className="text-zinc-300">Estado *</Label>
                          <Select
                            value={registrationForm.address_state}
                            onValueChange={(value) => setRegistrationForm(prev => ({ ...prev, address_state: value }))}
                          >
                            <SelectTrigger className="mt-1 bg-zinc-800 border-zinc-700 text-white">
                              <SelectValue placeholder="UF" />
                            </SelectTrigger>
                            <SelectContent>
                              {BRAZILIAN_STATES.map((state) => (
                                <SelectItem key={state.value} value={state.value}>
                                  {state.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.address_state && <p className="text-red-400 text-sm mt-1">{errors.address_state}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    {isLogin ? (
                      <>
                        <LogIn className="mr-2 h-5 w-5" />
                        Entrar
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-5 w-5" />
                        Criar Conta
                      </>
                    )}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {isLogin 
                  ? 'Não tem conta? Criar uma nova' 
                  : 'Já tem conta? Fazer login'}
              </button>
            </div>

            {!isLogin && (
              <Card className="mt-4 bg-yellow-900/20 border-yellow-800/50">
                <CardContent className="p-4">
                  <p className="text-sm text-yellow-400">
                    <strong>Importante:</strong> Após criar sua conta, um administrador 
                    precisará aprová-la antes que você possa fazer login. Todos os campos 
                    marcados com * são obrigatórios.
                  </p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}