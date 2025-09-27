-- ========================================
-- Correção das Políticas RLS para Administradores
-- ========================================
-- Atualizar políticas para reconhecer tanto 'admin' quanto 'administrador'

-- Atualizar política de SELECT
DROP POLICY IF EXISTS "Only admins can view internal financial data" ON internal_financial_data;
CREATE POLICY "Only admins can view internal financial data" ON internal_financial_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrador')
      AND profiles.approved = true
    )
  );

-- Atualizar política de INSERT
DROP POLICY IF EXISTS "Only admins can insert internal financial data" ON internal_financial_data;
CREATE POLICY "Only admins can insert internal financial data" ON internal_financial_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrador')
      AND profiles.approved = true
    )
  );

-- Atualizar política de UPDATE
DROP POLICY IF EXISTS "Only admins can update internal financial data" ON internal_financial_data;
CREATE POLICY "Only admins can update internal financial data" ON internal_financial_data
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrador')
      AND profiles.approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrador')
      AND profiles.approved = true
    )
  );

-- Atualizar política de DELETE
DROP POLICY IF EXISTS "Only admins can delete internal financial data" ON internal_financial_data;
CREATE POLICY "Only admins can delete internal financial data" ON internal_financial_data
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrador')
      AND profiles.approved = true
    )
  );

-- Políticas para tabela de colaboradores
DROP POLICY IF EXISTS "Only admins can view financial employees" ON financial_employees;
CREATE POLICY "Only admins can view financial employees" ON financial_employees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrador')
      AND profiles.approved = true
    )
  );

DROP POLICY IF EXISTS "Only admins can insert financial employees" ON financial_employees;
CREATE POLICY "Only admins can insert financial employees" ON financial_employees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrador')
      AND profiles.approved = true
    )
  );

DROP POLICY IF EXISTS "Only admins can update financial employees" ON financial_employees;
CREATE POLICY "Only admins can update financial employees" ON financial_employees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrador')
      AND profiles.approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrador')
      AND profiles.approved = true
    )
  );

DROP POLICY IF EXISTS "Only admins can delete financial employees" ON financial_employees;
CREATE POLICY "Only admins can delete financial employees" ON financial_employees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrador')
      AND profiles.approved = true
    )
  );