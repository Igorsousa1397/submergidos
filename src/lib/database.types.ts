export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda: {
        Row: {
          aviso: string | null
          created_at: string | null
          descricao: string | null
          dia: string | null
          id: string
          ministrante: string | null
          ordem: number | null
          titulo: string
        }
        Insert: {
          aviso?: string | null
          created_at?: string | null
          descricao?: string | null
          dia?: string | null
          id?: string
          ministrante?: string | null
          ordem?: number | null
          titulo: string
        }
        Update: {
          aviso?: string | null
          created_at?: string | null
          descricao?: string | null
          dia?: string | null
          id?: string
          ministrante?: string | null
          ordem?: number | null
          titulo?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value?: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      avisos: {
        Row: {
          autor_id: string | null
          created_at: string | null
          id: string
          publico: Database["public"]["Enums"]["aviso_publico"]
          texto: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string | null
          id?: string
          publico?: Database["public"]["Enums"]["aviso_publico"]
          texto: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string | null
          id?: string
          publico?: Database["public"]["Enums"]["aviso_publico"]
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cartas: {
        Row: {
          created_at: string | null
          id: string
          quantidade: number
          quem_procurar: string | null
          retirada: boolean
          retirada_em: string | null
          servo_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          quantidade?: number
          quem_procurar?: string | null
          retirada?: boolean
          retirada_em?: string | null
          servo_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          quantidade?: number
          quem_procurar?: string | null
          retirada?: boolean
          retirada_em?: string | null
          servo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartas_servo_id_fkey"
            columns: ["servo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      celulas: {
        Row: {
          id: string
          lider_id: string | null
          nome: string
        }
        Insert: {
          id?: string
          lider_id?: string | null
          nome: string
        }
        Update: {
          id?: string
          lider_id?: string | null
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "celulas_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      encontristas: {
        Row: {
          acordo_valor: number | null
          autoriza_imagem: boolean | null
          camiseta: string | null
          celula: string | null
          celula_id: string | null
          checkin_at: string | null
          chegou: boolean
          cpf: string | null
          created_at: string | null
          doenca_cronica: string | null
          emergencia: string | null
          id: string
          igreja: string | null
          medicamento: string | null
          nascimento: string | null
          nome: string
          onibus_id: string | null
          pagamento_id: string | null
          pagar_depois_data: string | null
          sexo: Database["public"]["Enums"]["sexo"] | null
          status: Database["public"]["Enums"]["encontrista_status"]
          termo_assinado_at: string | null
          termo_assinatura: string | null
          termo_cep: string | null
          termo_complemento: string | null
          termo_doc_path: string | null
          termo_doc_verso_path: string | null
          termo_endereco: string | null
          termo_numero: string | null
          termo_pdf_path: string | null
          termo_selfie_path: string | null
          whatsapp: string | null
        }
        Insert: {
          acordo_valor?: number | null
          autoriza_imagem?: boolean | null
          camiseta?: string | null
          celula?: string | null
          celula_id?: string | null
          checkin_at?: string | null
          chegou?: boolean
          cpf?: string | null
          created_at?: string | null
          doenca_cronica?: string | null
          emergencia?: string | null
          id?: string
          igreja?: string | null
          medicamento?: string | null
          nascimento?: string | null
          nome: string
          onibus_id?: string | null
          pagamento_id?: string | null
          pagar_depois_data?: string | null
          sexo?: Database["public"]["Enums"]["sexo"] | null
          status?: Database["public"]["Enums"]["encontrista_status"]
          termo_assinado_at?: string | null
          termo_assinatura?: string | null
          termo_cep?: string | null
          termo_complemento?: string | null
          termo_doc_path?: string | null
          termo_doc_verso_path?: string | null
          termo_endereco?: string | null
          termo_numero?: string | null
          termo_pdf_path?: string | null
          termo_selfie_path?: string | null
          whatsapp?: string | null
        }
        Update: {
          acordo_valor?: number | null
          autoriza_imagem?: boolean | null
          camiseta?: string | null
          celula?: string | null
          celula_id?: string | null
          checkin_at?: string | null
          chegou?: boolean
          cpf?: string | null
          created_at?: string | null
          doenca_cronica?: string | null
          emergencia?: string | null
          id?: string
          igreja?: string | null
          medicamento?: string | null
          nascimento?: string | null
          nome?: string
          onibus_id?: string | null
          pagamento_id?: string | null
          pagar_depois_data?: string | null
          sexo?: Database["public"]["Enums"]["sexo"] | null
          status?: Database["public"]["Enums"]["encontrista_status"]
          termo_assinado_at?: string | null
          termo_assinatura?: string | null
          termo_cep?: string | null
          termo_complemento?: string | null
          termo_doc_path?: string | null
          termo_doc_verso_path?: string | null
          termo_endereco?: string | null
          termo_numero?: string | null
          termo_pdf_path?: string | null
          termo_selfie_path?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encontristas_celula_id_fkey"
            columns: ["celula_id"]
            isOneToOne: false
            referencedRelation: "celulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encontristas_onibus_id_fkey"
            columns: ["onibus_id"]
            isOneToOne: false
            referencedRelation: "onibus"
            referencedColumns: ["id"]
          },
        ]
      }
      escalas: {
        Row: {
          created_at: string | null
          dia: string
          funcao_id: string
          id: string
          periodo: string | null
          servo_id: string
        }
        Insert: {
          created_at?: string | null
          dia: string
          funcao_id: string
          id?: string
          periodo?: string | null
          servo_id: string
        }
        Update: {
          created_at?: string | null
          dia?: string
          funcao_id?: string
          id?: string
          periodo?: string | null
          servo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalas_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_servo_id_fkey"
            columns: ["servo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      funcoes: {
        Row: {
          created_at: string | null
          id: string
          is_sistema: boolean
          nome: string
          periodo: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_sistema?: boolean
          nome: string
          periodo?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_sistema?: boolean
          nome?: string
          periodo?: string | null
        }
        Relationships: []
      }
      ocorrencias: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          local: string | null
          resolvido: boolean
          resolvido_at: string | null
          resolvido_por: string | null
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          local?: string | null
          resolvido?: boolean
          resolvido_at?: string | null
          resolvido_por?: string | null
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          local?: string | null
          resolvido?: boolean
          resolvido_at?: string | null
          resolvido_por?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onibus: {
        Row: {
          capacidade: number | null
          id: string
          identificacao: string
          responsavel_id: string | null
        }
        Insert: {
          capacidade?: number | null
          id?: string
          identificacao: string
          responsavel_id?: string | null
        }
        Update: {
          capacidade?: number | null
          id?: string
          identificacao?: string
          responsavel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onibus_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          cpf: string | null
          created_at: string | null
          email: string | null
          id: string
          nascimento: string | null
          nome: string
          pago: boolean
          primeiro: boolean
          role: string
          sexo: Database["public"]["Enums"]["sexo"] | null
        }
        Insert: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          nascimento?: string | null
          nome: string
          pago?: boolean
          primeiro?: boolean
          role?: string
          sexo?: Database["public"]["Enums"]["sexo"] | null
        }
        Update: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nascimento?: string | null
          nome?: string
          pago?: boolean
          primeiro?: boolean
          role?: string
          sexo?: Database["public"]["Enums"]["sexo"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["slug"]
          },
        ]
      }
      push_tokens: {
        Row: {
          plataforma: string | null
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          plataforma?: string | null
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          plataforma?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quarto_encontristas: {
        Row: {
          encontrista_id: string
          quarto_id: string
        }
        Insert: {
          encontrista_id: string
          quarto_id: string
        }
        Update: {
          encontrista_id?: string
          quarto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarto_encontristas_encontrista_id_fkey"
            columns: ["encontrista_id"]
            isOneToOne: false
            referencedRelation: "encontristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarto_encontristas_quarto_id_fkey"
            columns: ["quarto_id"]
            isOneToOne: false
            referencedRelation: "quartos"
            referencedColumns: ["id"]
          },
        ]
      }
      quarto_servos: {
        Row: {
          quarto_id: string
          servo_id: string
        }
        Insert: {
          quarto_id: string
          servo_id: string
        }
        Update: {
          quarto_id?: string
          servo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarto_servos_quarto_id_fkey"
            columns: ["quarto_id"]
            isOneToOne: false
            referencedRelation: "quartos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarto_servos_servo_id_fkey"
            columns: ["servo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quartos: {
        Row: {
          genero: Database["public"]["Enums"]["sexo"]
          id: string
          is_maes: boolean
          limite_encontristas: number
          limite_servos: number
          numero: string
        }
        Insert: {
          genero: Database["public"]["Enums"]["sexo"]
          id?: string
          is_maes?: boolean
          limite_encontristas?: number
          limite_servos?: number
          numero: string
        }
        Update: {
          genero?: Database["public"]["Enums"]["sexo"]
          id?: string
          is_maes?: boolean
          limite_encontristas?: number
          limite_servos?: number
          numero?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          cor: string | null
          created_at: string | null
          is_sistema: boolean
          isento_pagamento: boolean
          nome: string
          ordem: number | null
          pode_avisos: boolean
          slug: string
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          is_sistema?: boolean
          isento_pagamento?: boolean
          nome: string
          ordem?: number | null
          pode_avisos?: boolean
          slug: string
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          is_sistema?: boolean
          isento_pagamento?: boolean
          nome?: string
          ordem?: number | null
          pode_avisos?: boolean
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      financeiro_resumo: {
        Row: {
          qtd_a_receber_base: number | null
          qtd_desistencias: number | null
          qtd_pagar_depois: number | null
          qtd_pagos: number | null
          qtd_pendentes: number | null
          total_geral: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assinar_termo: {
        Args: {
          p_cep: string
          p_complemento: string
          p_doc_path: string
          p_doc_verso_path: string
          p_enc_id: string
          p_endereco: string
          p_numero: string
          p_pdf_path: string
          p_selfie_path: string
        }
        Returns: boolean
      }
      buscar_inscricao: {
        Args: { documento: string }
        Returns: {
          celula: string
          id: string
          igreja: string
          nome: string
          status: Database["public"]["Enums"]["encontrista_status"]
          termo_assinado_at: string
        }[]
      }
      current_role_slug: { Args: never; Returns: string }
      inscricoes_abertas: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      pode_avisos: { Args: never; Returns: boolean }
    }
    Enums: {
      aviso_publico: "todos" | "homens" | "mulheres"
      encontrista_status: "pago" | "pagar_depois" | "desistiu" | "pendente"
      sexo: "masculino" | "feminino"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      aviso_publico: ["todos", "homens", "mulheres"],
      encontrista_status: ["pago", "pagar_depois", "desistiu", "pendente"],
      sexo: ["masculino", "feminino"],
    },
  },
} as const
