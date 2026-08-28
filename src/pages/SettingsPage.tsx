import { useCallback, useEffect, useState } from 'react';

import {
  Save,
  Store,
  MessageSquare,
  BookOpen,
  ImagePlus,
  Bot,
  Bell,
  AlertTriangle,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { PageHeader } from '@/components/layout/PageHeader';

import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';

import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';

import { useToast } from '@/contexts/ToastContext';

import { supabase } from '@/lib/supabase';

import type {
  Settings,
  MessageTemplates,
} from '@/types/database';

// =========================================================
// EXTENSÃO DAS CONFIGURAÇÕES
// =========================================================

type ExtendedSettings = Settings & {
  // =======================================================
  // AUTOMAÇÕES
  // =======================================================

  auto_lembrete_proxima_dose?: boolean;
  auto_lembrete_dias_antes?: number;

  auto_aviso_atraso?: boolean;
  auto_atraso_dias_depois?: number;

  // =======================================================
  // PLANOS DA CADERNETA
  // =======================================================

  booklet_price_monthly?: number | null;
  booklet_price_annual?: number | null;
};

// =========================================================
// PÁGINA
// =========================================================

export function SettingsPage() {
  const { toast } = useToast();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [form, setForm] =
    useState<ExtendedSettings | null>(
      null
    );

  // =========================================================
  // LOGO
  // =========================================================

  const [logoFile, setLogoFile] =
    useState<File | null>(null);

  const [
    logoPreview,
    setLogoPreview,
  ] = useState<string | null>(
    null
  );

  // =========================================================
  // CARREGAR CONFIGURAÇÕES
  // =========================================================

  const load =
    useCallback(async () => {
      setLoading(true);

      try {
        const {
          data,
          error,
        } =
          await supabase
            .from('settings')
            .select('*')
            .limit(1);

        if (error) {
          throw error;
        }

        const settings =
          (data as ExtendedSettings[])?.[0] ||
          null;

        if (!settings) {
          setForm(null);

          return;
        }

        // ===================================================
        // NORMALIZAR CAMPOS
        // ===================================================

        const normalizedSettings: ExtendedSettings =
          {
            ...settings,

            // ===============================================
            // PREÇOS
            // ===============================================

            booklet_price_monthly:
              settings.booklet_price_monthly ??
              settings.booklet_price ??
              0,

            booklet_price_annual:
              settings.booklet_price_annual ??
              settings.booklet_price ??
              0,

            // ===============================================
            // AUTOMAÇÕES
            // ===============================================

            auto_lembrete_proxima_dose:
              settings.auto_lembrete_proxima_dose ??
              true,

            auto_lembrete_dias_antes:
              settings.auto_lembrete_dias_antes ??
              3,

            auto_aviso_atraso:
              settings.auto_aviso_atraso ??
              true,

            auto_atraso_dias_depois:
              settings.auto_atraso_dias_depois ??
              1,
          };

        setForm(
          normalizedSettings
        );

        setLogoPreview(
          normalizedSettings.logo_url ||
            null
        );
      } catch (error) {
        console.error(
          'Erro ao carregar configurações:',
          error
        );

        toast(
          'Erro ao carregar configurações',
          'error'
        );
      } finally {
        setLoading(false);
      }
    }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // =========================================================
  // SELECIONAR LOGO
  // =========================================================

  const handleLogoChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        'image/'
      )
    ) {
      toast(
        'Selecione um arquivo de imagem.',
        'error'
      );

      event.target.value =
        '';

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      toast(
        'A logo deve ter no máximo 5 MB.',
        'error'
      );

      event.target.value =
        '';

      return;
    }

    setLogoFile(file);

    const previewUrl =
      URL.createObjectURL(
        file
      );

    setLogoPreview(
      previewUrl
    );
  };

  // =========================================================
  // UPLOAD DA LOGO
  // =========================================================

  const uploadLogo =
    async () => {
      if (!form) {
        return null;
      }

      if (!logoFile) {
        return (
          form.logo_url ||
          null
        );
      }

      // =====================================================
      // IDENTIFICAR A EMPRESA DO USUÁRIO LOGADO
      // =====================================================

      const {
        data: organizationId,
        error: organizationError,
      } =
        await supabase.rpc(
          'current_organization_id'
        );

      if (
        organizationError ||
        !organizationId
      ) {
        throw new Error(
          'Não foi possível identificar a empresa do usuário.'
        );
      }

      // =====================================================
      // EXTENSÃO DO ARQUIVO
      // =====================================================

      const extension =
        logoFile.name
          .split('.')
          .pop()
          ?.toLowerCase() ||
        'png';

      // =====================================================
      // CAMINHO MULTIEMPRESA
      // organization_id/logo/logo-arquivo.ext
      // =====================================================

      const filePath =
        `${organizationId}/logo/logo-${Date.now()}.${extension}`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from(
            'company-assets'
          )
          .upload(
            filePath,
            logoFile,
            {
              cacheControl:
                '3600',

              upsert:
                false,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      const { data } =
        supabase.storage
          .from(
            'company-assets'
          )
          .getPublicUrl(
            filePath
          );

      return data.publicUrl;
    };

  // =========================================================
  // SALVAR CONFIGURAÇÕES
  // =========================================================

  const handleSave =
    async () => {
      if (!form) {
        return;
      }

      // =====================================================
      // VALIDAR PREÇOS
      // =====================================================

      const monthlyPrice =
        Number(
          form.booklet_price_monthly ??
            0
        );

      const annualPrice =
        Number(
          form.booklet_price_annual ??
            0
        );

      if (
        monthlyPrice <
        0
      ) {
        toast(
          'O preço mensal não pode ser negativo.',
          'warning'
        );

        return;
      }

      if (
        annualPrice <
        0
      ) {
        toast(
          'O preço anual não pode ser negativo.',
          'warning'
        );

        return;
      }

      // =====================================================
      // VALIDAR AUTOMAÇÕES
      // =====================================================

      if (
        Number(
          form.auto_lembrete_dias_antes
        ) < 0
      ) {
        toast(
          'Os dias do lembrete não podem ser negativos.',
          'warning'
        );

        return;
      }

      if (
        Number(
          form.auto_atraso_dias_depois
        ) < 0
      ) {
        toast(
          'Os dias de atraso não podem ser negativos.',
          'warning'
        );

        return;
      }

      setSaving(true);

      try {
        const logoUrl =
          await uploadLogo();

        const { error } =
          await supabase
            .from(
              'settings'
            )
            .update({
              // =============================================
              // IDENTIDADE
              // =============================================

              nome_farmacia:
                form.nome_farmacia,

              logo_url:
                logoUrl,

              // =============================================
              // CONTATO
              // =============================================

              whatsapp:
                form.whatsapp,

              endereco:
                form.endereco,

              instagram:
                form.instagram,

              // =============================================
              // RESPONSÁVEL TÉCNICO
              // =============================================

              responsavel_tecnico:
                form.responsavel_tecnico,

              crmv_clinica:
                form.crmv_clinica,

              // =============================================
              // FUNCIONAMENTO
              // =============================================

              horario_funcionamento:
                form.horario_funcionamento,

              // =============================================
              // CADERNETA
              // =============================================

              pdf_info:
                form.pdf_info,

              // Preço antigo mantido por compatibilidade
              booklet_price:
                annualPrice,

              // Novos preços
              booklet_price_monthly:
                monthlyPrice,

              booklet_price_annual:
                annualPrice,

              // =============================================
              // TEMPLATES WHATSAPP
              // =============================================

              message_templates:
                form.message_templates,

              // =============================================
              // AUTOMAÇÕES
              // =============================================

              auto_lembrete_proxima_dose:
                form.auto_lembrete_proxima_dose ??
                true,

              auto_lembrete_dias_antes:
                Number(
                  form.auto_lembrete_dias_antes ??
                    3
                ),

              auto_aviso_atraso:
                form.auto_aviso_atraso ??
                true,

              auto_atraso_dias_depois:
                Number(
                  form.auto_atraso_dias_depois ??
                    1
                ),
            })
            .eq(
              'id',
              form.id
            );

        if (error) {
          throw error;
        }

        setForm({
          ...form,

          logo_url:
            logoUrl,

          booklet_price:
            annualPrice,

          booklet_price_monthly:
            monthlyPrice,

          booklet_price_annual:
            annualPrice,
        });

        setLogoPreview(
          logoUrl
        );

        setLogoFile(
          null
        );

        toast(
          'Configurações salvas com sucesso!'
        );
      } catch (error) {
        console.error(
          'Erro ao salvar configurações:',
          error
        );

        toast(
          'Erro ao salvar configurações',
          'error'
        );
      } finally {
        setSaving(false);
      }
    };

  // =========================================================
  // TEMPLATE DE MENSAGENS
  // =========================================================

  const updateTemplate = (
    key: keyof MessageTemplates,
    value: string
  ) => {
    if (!form) {
      return;
    }

    setForm({
      ...form,

      message_templates: {
        ...form.message_templates,

        [key]:
          value,
      },
    });
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (
    loading ||
    !form
  ) {
    return (
      <Layout title="Configurações">

        <div className="space-y-4">

          <div className="h-32 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />

          <div className="h-64 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />

        </div>

      </Layout>
    );
  }

  // =========================================================
  // PÁGINA
  // =========================================================

  return (
    <Layout
      title="Configurações"
      actions={
        <Button
          onClick={
            handleSave
          }
          loading={
            saving
          }
        >
          <Save className="w-4 h-4" />

          Salvar
        </Button>
      }
    >
      <PageHeader
        title="Configurações"
        description="Configure os dados do estabelecimento, cadernetas, mensagens e automações"
      />

      <div className="space-y-6">

        {/* ================================================= */}
        {/* DADOS DO ESTABELECIMENTO */}
        {/* ================================================= */}

        <Card>
          <CardHeader>

            <div className="flex items-center gap-2">

              <Store className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />

              <CardTitle>
                Dados do Estabelecimento
              </CardTitle>

            </div>

          </CardHeader>

          <CardBody>

            <div className="space-y-6">

              {/* =========================================== */}
              {/* LOGO */}
              {/* =========================================== */}

              <div>

                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Logo da Empresa
                </label>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                  <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-900">

                    {logoPreview ? (
                      <img
                        src={
                          logoPreview
                        }
                        alt="Logo da empresa"
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <Store className="h-10 w-10 text-gray-300 dark:text-slate-600" />
                    )}

                  </div>

                  <div className="space-y-2">

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">

                      <ImagePlus className="h-4 w-4" />

                      {logoPreview
                        ? 'Trocar Logo'
                        : 'Selecionar Logo'}

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/*"
                        className="hidden"
                        onChange={
                          handleLogoChange
                        }
                      />

                    </label>

                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      PNG, JPG ou WEBP. Máximo 5 MB.
                    </p>

                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      Recomendamos uma imagem quadrada ou com fundo transparente.
                    </p>

                  </div>

                </div>

              </div>

              {/* =========================================== */}
              {/* DADOS */}
              {/* =========================================== */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <Input
                  label="Nome da Farmácia/Pet Shop"
                  value={
                    form.nome_farmacia ||
                    ''
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,

                      nome_farmacia:
                        e.target.value,
                    })
                  }
                />

                <Input
                  label="WhatsApp"
                  value={
                    form.whatsapp ||
                    ''
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,

                      whatsapp:
                        e.target.value,
                    })
                  }
                  placeholder="(11) 99999-9999"
                />

                <Input
                  label="Instagram"
                  value={
                    form.instagram ||
                    ''
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,

                      instagram:
                        e.target.value,
                    })
                  }
                  placeholder="@suaempresa"
                />

                <Input
                  label="Horário de Funcionamento"
                  value={
                    form.horario_funcionamento ||
                    ''
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,

                      horario_funcionamento:
                        e.target.value,
                    })
                  }
                  placeholder="Seg-Sex 8h-18h, Sáb 8h-12h"
                />

                <Input
                  label="Responsável Técnico"
                  value={
                    form.responsavel_tecnico ||
                    ''
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,

                      responsavel_tecnico:
                        e.target.value,
                    })
                  }
                  placeholder="Nome do médico veterinário"
                />

                <Input
                  label="CRMV"
                  value={
                    form.crmv_clinica ||
                    ''
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,

                      crmv_clinica:
                        e.target.value,
                    })
                  }
                  placeholder="CRMV-SP 12345"
                />

                <div className="sm:col-span-2">

                  <Textarea
                    label="Endereço"
                    value={
                      form.endereco ||
                      ''
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,

                        endereco:
                          e.target.value,
                      })
                    }
                    rows={2}
                    placeholder="Rua, número, bairro, cidade..."
                  />

                </div>

              </div>

            </div>

          </CardBody>
        </Card>

        {/* ================================================= */}
        {/* CADERNETA DIGITAL */}
        {/* ================================================= */}

        <Card>
          <CardHeader>

            <div className="flex items-center gap-2">

              <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />

              <CardTitle>
                Caderneta Digital
              </CardTitle>

            </div>

          </CardHeader>

          <CardBody>

            <div className="space-y-6">

              {/* =========================================== */}
              {/* DESCRIÇÃO */}
              {/* =========================================== */}

              <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 p-4">

                <div className="flex items-start gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">

                    <BookOpen className="w-5 h-5" />

                  </div>

                  <div>

                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      Planos da Caderneta Digital
                    </p>

                    <p className="mt-1 text-xs leading-5 text-emerald-700/80 dark:text-emerald-400">
                      Defina os valores cobrados para acesso mensal ou anual à caderneta digital do pet.
                    </p>

                  </div>

                </div>

              </div>

              {/* =========================================== */}
              {/* PLANOS */}
              {/* =========================================== */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* ========================================= */}
                {/* MENSAL */}
                {/* ========================================= */}

                <div className="rounded-2xl border border-gray-200 dark:border-slate-800 p-5">

                  <div className="flex items-center gap-3 mb-4">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">

                      <CalendarDays className="w-5 h-5" />

                    </div>

                    <div>

                      <p className="font-bold text-gray-900 dark:text-white">
                        Plano Mensal
                      </p>

                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Acesso por 1 mês
                      </p>

                    </div>

                  </div>

                  <Input
                    label="Valor mensal (R$)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.booklet_price_monthly ??
                      0
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,

                        booklet_price_monthly:
                          Math.max(
                            0,
                            Number(
                              e.target.value
                            )
                          ),
                      })
                    }
                    placeholder="19,90"
                  />

                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                    Após o pagamento, a caderneta ficará válida por 1 mês.
                  </p>

                </div>

                {/* ========================================= */}
                {/* ANUAL */}
                {/* ========================================= */}

                <div className="relative overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-900/60 p-5">

                  <div className="absolute right-0 top-0">

                    <span className="inline-flex rounded-bl-xl bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      12 meses
                    </span>

                  </div>

                  <div className="flex items-center gap-3 mb-4">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">

                      <CalendarRange className="w-5 h-5" />

                    </div>

                    <div>

                      <p className="font-bold text-gray-900 dark:text-white">
                        Plano Anual
                      </p>

                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Acesso por 1 ano
                      </p>

                    </div>

                  </div>

                  <Input
                    label="Valor anual (R$)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.booklet_price_annual ??
                      0
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,

                        booklet_price_annual:
                          Math.max(
                            0,
                            Number(
                              e.target.value
                            )
                          ),
                      })
                    }
                    placeholder="149,90"
                  />

                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                    Após o pagamento, a caderneta ficará válida por 1 ano.
                  </p>

                </div>

              </div>

              {/* =========================================== */}
              {/* PDF */}
              {/* =========================================== */}

              <div className="border-t border-gray-100 dark:border-slate-800 pt-5">

                <Textarea
                  label="Informações que aparecem no PDF"
                  value={
                    form.pdf_info ||
                    ''
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,

                      pdf_info:
                        e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Informações adicionais no rodapé do PDF"
                />

              </div>

            </div>

          </CardBody>
        </Card>

        {/* ================================================= */}
        {/* AUTOMAÇÕES */}
        {/* ================================================= */}

        <Card>

          <CardHeader>

            <div className="flex items-center gap-2">

              <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />

              <CardTitle>
                Automações de Mensagens
              </CardTitle>

            </div>

          </CardHeader>

          <CardBody>

            <div className="space-y-5">

              <p className="text-sm text-gray-500 dark:text-slate-400">
                O VetFarm verifica automaticamente as próximas doses e vacinas atrasadas. As mensagens ficam disponíveis na Central de Mensagens para envio pelo WhatsApp.
              </p>

              {/* =========================================== */}
              {/* LEMBRETE PRÓXIMA DOSE */}
              {/* =========================================== */}

              <div className="rounded-xl border border-gray-200 dark:border-slate-800 p-4">

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                  <div className="flex gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">

                      <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />

                    </div>

                    <div>

                      <p className="font-semibold text-gray-900 dark:text-white">
                        Lembrete de Próxima Dose
                      </p>

                      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        Cria automaticamente um lembrete antes da data prevista para a próxima dose.
                      </p>

                    </div>

                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">

                    <input
                      type="checkbox"
                      checked={
                        form.auto_lembrete_proxima_dose ??
                        true
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,

                          auto_lembrete_proxima_dose:
                            e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
                    />

                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      Ativado
                    </span>

                  </label>

                </div>

                <div className="mt-5 max-w-xs">

                  <Input
                    label="Enviar lembrete quantos dias antes?"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.auto_lembrete_dias_antes ??
                      3
                    }
                    disabled={
                      !form.auto_lembrete_proxima_dose
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,

                        auto_lembrete_dias_antes:
                          Math.max(
                            0,
                            Number(
                              e.target.value
                            )
                          ),
                      })
                    }
                  />

                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                    Exemplo: 3 dias → uma dose prevista para 10/09 aparece na Central a partir de 07/09.
                  </p>

                </div>

              </div>

              {/* =========================================== */}
              {/* VACINA ATRASADA */}
              {/* =========================================== */}

              <div className="rounded-xl border border-gray-200 dark:border-slate-800 p-4">

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                  <div className="flex gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30">

                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />

                    </div>

                    <div>

                      <p className="font-semibold text-gray-900 dark:text-white">
                        Aviso de Vacina Atrasada
                      </p>

                      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        Cria automaticamente um aviso quando a próxima dose não for realizada dentro do prazo.
                      </p>

                    </div>

                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">

                    <input
                      type="checkbox"
                      checked={
                        form.auto_aviso_atraso ??
                        true
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,

                          auto_aviso_atraso:
                            e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
                    />

                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      Ativado
                    </span>

                  </label>

                </div>

                <div className="mt-5 max-w-xs">

                  <Input
                    label="Criar aviso quantos dias depois?"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.auto_atraso_dias_depois ??
                      1
                    }
                    disabled={
                      !form.auto_aviso_atraso
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,

                        auto_atraso_dias_depois:
                          Math.max(
                            0,
                            Number(
                              e.target.value
                            )
                          ),
                      })
                    }
                  />

                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                    Exemplo: 1 dia → se a dose era prevista para 10/09 e não foi aplicada, o aviso entra na Central em 11/09.
                  </p>

                </div>

              </div>

              {/* =========================================== */}
              {/* STATUS DO CRON */}
              {/* =========================================== */}

              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4">

                <div className="flex gap-3">

                  <Bot className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />

                  <div>

                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      Verificação automática
                    </p>

                    <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-400">
                      O Supabase verifica diariamente as doses e prepara novas mensagens pendentes na Central de Mensagens. O envio final continua manual pelo WhatsApp.
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </CardBody>

        </Card>

        {/* ================================================= */}
        {/* TEMPLATES WHATSAPP */}
        {/* ================================================= */}

        <Card>

          <CardHeader>

            <div className="flex items-center gap-2">

              <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />

              <CardTitle>
                Templates de Mensagens (WhatsApp)
              </CardTitle>

            </div>

          </CardHeader>

          <CardBody>

            <div className="space-y-4">

              {/* =========================================== */}
              {/* AGENDAMENTO */}
              {/* =========================================== */}

              <div>

                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Mensagem de Agendamento
                </label>

                <Textarea
                  value={
                    form.message_templates
                      .agendamento
                  }
                  onChange={(e) =>
                    updateTemplate(
                      'agendamento',
                      e.target.value
                    )
                  }
                  rows={4}
                />

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  Variáveis:{' '}
                  {
                    '{NOME}, {PET}, {DATA}, {HORA}, {FARMACIA}, {VACINA}, {DOSE}'
                  }
                </p>

              </div>

              {/* =========================================== */}
              {/* CONFIRMAÇÃO */}
              {/* =========================================== */}

              <div>

                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Mensagem de Confirmação
                </label>

                <Textarea
                  value={
                    form.message_templates
                      .confirmacao
                  }
                  onChange={(e) =>
                    updateTemplate(
                      'confirmacao',
                      e.target.value
                    )
                  }
                  rows={3}
                />

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  Variáveis: {'{NOME}, {PET}, {DATA}, {HORA}, {FARMACIA}'}
                </p>

              </div>

              {/* =========================================== */}
              {/* LEMBRETE */}
              {/* =========================================== */}

              <div>

                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Lembrete de Próxima Dose
                </label>

                <Textarea
                  value={
                    form.message_templates
                      .lembrete
                  }
                  onChange={(e) =>
                    updateTemplate(
                      'lembrete',
                      e.target.value
                    )
                  }
                  rows={3}
                />

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  Variáveis: {'{NOME}, {PET}, {VACINA}, {DATA}, {FARMACIA}'}
                </p>

              </div>

              {/* =========================================== */}
              {/* ATRASADA */}
              {/* =========================================== */}

              <div>

                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Vacina Atrasada
                </label>

                <Textarea
                  value={
                    form.message_templates
                      .atrasada
                  }
                  onChange={(e) =>
                    updateTemplate(
                      'atrasada',
                      e.target.value
                    )
                  }
                  rows={3}
                />

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  Variáveis: {'{NOME}, {PET}, {VACINA}, {DATA}, {FARMACIA}'}
                </p>

              </div>

            </div>

          </CardBody>

        </Card>

      </div>

      {/* =================================================== */}
      {/* BOTÃO FINAL */}
      {/* =================================================== */}

      <div className="mt-6 flex justify-end">

        <Button
          onClick={
            handleSave
          }
          loading={
            saving
          }
          size="lg"
        >
          <Save className="w-4 h-4" />

          Salvar Configurações
        </Button>

      </div>

    </Layout>
  );
}