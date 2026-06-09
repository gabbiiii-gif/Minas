// Gerado por `mcp__claude_ai_Supabase__generate_typescript_types`.
// Regerar: `npm run supabase:types` (após login no Supabase CLI).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          acao: string
          ator: string | null
          criado_em: string
          id: string
          payload: Json | null
          registro_id: string
          tabela: string
        }
        Insert: {
          acao: string
          ator?: string | null
          criado_em?: string
          id?: string
          payload?: Json | null
          registro_id: string
          tabela: string
        }
        Update: Partial<Database['public']['Tables']['auditoria']['Row']>
        Relationships: []
      }
      clientes: {
        Row: {
          cpf: string | null
          created_at: string
          criado_por: string | null
          deleted_at: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          criado_por?: string | null
          deleted_at?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['clientes']['Row']>
        Relationships: []
      }
      despesas: {
        Row: {
          created_at: string
          data: string
          deleted_at: string | null
          descricao: string
          id: string
          operador_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao: string
          id?: string
          operador_id: string
          updated_at?: string
          valor: number
        }
        Update: Partial<Database['public']['Tables']['despesas']['Row']>
        Relationships: []
      }
      fechamentos_caixa: {
        Row: {
          created_at: string
          data: string
          diferenca_dinheiro: number
          diferenca_total: number
          fechado_em: string | null
          id: string
          observacao: string | null
          operador_id: string
          status: Database['public']['Enums']['fechamento_status']
          total_caderno_credito: number
          total_caderno_debito: number
          total_caderno_dinheiro: number
          total_caderno_pix: number
          total_fisico_credito: number
          total_fisico_debito: number
          total_fisico_dinheiro: number
          total_fisico_pix: number
          total_sistema_credito: number
          total_sistema_debito: number
          total_sistema_dinheiro: number
          total_sistema_pix: number
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['fechamentos_caixa']['Row']> & {
          data: string
          operador_id: string
        }
        Update: Partial<Database['public']['Tables']['fechamentos_caixa']['Row']>
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          role: Database['public']['Enums']['perfil_role']
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id: string
          nome: string
          role?: Database['public']['Enums']['perfil_role']
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
        Relationships: []
      }
      promissorias: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          status: Database['public']['Enums']['promissoria_status']
          updated_at: string
          valor_original: number
          valor_pago: number
          vencimento: string | null
          venda_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          status?: Database['public']['Enums']['promissoria_status']
          updated_at?: string
          valor_original: number
          valor_pago?: number
          vencimento?: string | null
          venda_id: string
        }
        Update: Partial<Database['public']['Tables']['promissorias']['Row']>
        Relationships: []
      }
      recebimentos_promissoria: {
        Row: {
          created_at: string
          data: string
          desconto: number
          forma_pagamento: Database['public']['Enums']['forma_pagamento']
          id: string
          operador_id: string
          promissoria_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          desconto?: number
          forma_pagamento: Database['public']['Enums']['forma_pagamento']
          id?: string
          operador_id: string
          promissoria_id: string
          updated_at?: string
          valor: number
        }
        Update: Partial<Database['public']['Tables']['recebimentos_promissoria']['Row']>
        Relationships: []
      }
      vendas: {
        Row: {
          cliente_id: string | null
          created_at: string
          data: string
          deleted_at: string | null
          forma_pagamento: Database['public']['Enums']['forma_pagamento']
          id: string
          observacao: string | null
          operador_id: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data?: string
          deleted_at?: string | null
          forma_pagamento: Database['public']['Enums']['forma_pagamento']
          id?: string
          observacao?: string | null
          operador_id: string
          updated_at?: string
          valor_total: number
        }
        Update: Partial<Database['public']['Tables']['vendas']['Row']>
        Relationships: []
      }
    }
    Views: {
      vw_despesas_diario: {
        Row: { data: string | null; operador_id: string | null; total: number | null }
        Relationships: []
      }
      vw_promissorias_em_aberto: {
        Row: {
          atrasada: boolean | null
          cliente_id: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          created_at: string | null
          id: string | null
          saldo: number | null
          status: Database['public']['Enums']['promissoria_status'] | null
          valor_original: number | null
          valor_pago: number | null
          vencimento: string | null
        }
        Relationships: []
      }
      vw_recebimentos_diario: {
        Row: {
          credito: number | null
          data: string | null
          debito: number | null
          dinheiro: number | null
          operador_id: string | null
          pix: number | null
          total_recebimentos: number | null
        }
        Relationships: []
      }
      vw_resumo_diario: {
        Row: {
          credito: number | null
          data: string | null
          debito: number | null
          dinheiro: number | null
          operador_id: string | null
          operador_nome: string | null
          pix: number | null
          promissoria: number | null
          total_vendas: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      criar_venda_com_promissoria: {
        Args: {
          p_cliente_id: string
          p_observacao: string | null
          p_valor: number
          p_vencimento: string | null
        }
        Returns: string
      }
      fechar_caixa: {
        Args: { p_caderno: Json; p_data: string; p_fisico: Json }
        Returns: string
      }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      receber_promissoria: {
        Args: {
          p_forma: Database['public']['Enums']['forma_pagamento']
          p_promissoria_id: string
          p_valor: number
        }
        Returns: string
      }
    }
    Enums: {
      fechamento_status: 'aberto' | 'conferido' | 'fechado'
      forma_pagamento: 'dinheiro' | 'pix' | 'debito' | 'credito' | 'promissoria'
      perfil_role: 'operador' | 'admin'
      promissoria_status: 'aberta' | 'parcial' | 'quitada'
    }
    CompositeTypes: Record<string, never>
  }
}

export type FormaPagamento = Database['public']['Enums']['forma_pagamento']
export type PromissoriaStatus = Database['public']['Enums']['promissoria_status']
export type FechamentoStatus = Database['public']['Enums']['fechamento_status']
export type PerfilRole = Database['public']['Enums']['perfil_role']
