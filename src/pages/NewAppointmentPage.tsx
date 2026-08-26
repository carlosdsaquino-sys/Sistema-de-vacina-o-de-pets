import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Dog,
  Syringe,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  PawPrint,
  Clock,
  Plus,
  Pencil,
  MessageCircle,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { normalizePhone, todayISO, formatPhone } from '@/lib/utils';
import {
  buildAgendamentoMessage,
  logMessage,
  openWhatsApp,
} from '@/lib/whatsapp';
import type {
  Tutor,
  Pet,
  Vaccine,
  Settings,
  Especie,
} from '@/types/database';
import { DOSE_OPTIONS, ESPECIES } from '@/types/database';

interface PetFormData {
  nome: string;
  especie: Especie;
  raca: string;
  idade: string;
  peso: string;
  sexo: string;
  observacoes: string;
}

interface AppointmentData {
  petIndex: number;
  vaccine_id: string;
  dose: string;
  data_agendada: string;
  horario: string;
  observacoes: string;
}

interface CreatedWhatsAppMessage {
  petId: string;
  petName: string;
  message: string;
}

const STEPS = [
  { label: 'Tutor', icon: User },
  { label: 'Pets', icon: Dog },
  { label: 'Vacinas', icon: Syringe },
  { label: 'Data e Hora', icon: Calendar },
  { label: 'Confirmação', icon: Check },
];

const TIME_SLOTS = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
];

const EMPTY_PET: PetFormData = {
  nome: '',
  especie: 'Cão',
  raca: '',
  idade: '',
  peso: '',
  sexo: '',
  observacoes: '',
};

const petToFormData = (pet: Pet): PetFormData => ({
  nome: pet.nome || '',
  especie: (pet.especie || 'Cão') as Especie,
  raca: pet.raca || '',
  idade: pet.idade || '',
  peso: pet.peso || '',
  sexo: pet.sexo || '',
  observacoes: pet.observacoes || '',
});

export function NewAppointmentPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  // Mensagens preparadas após criar os agendamentos
  const [createdTutor, setCreatedTutor] = useState<Tutor | null>(null);
  const [createdWhatsAppMessages, setCreatedWhatsAppMessages] = useState<
    CreatedWhatsAppMessage[]
  >([]);

  // Step 1: Tutor
  const [tutorMode, setTutorMode] = useState<'search' | 'new'>('search');
  const [tutorSearch, setTutorSearch] = useState('');
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);

  // Pets já cadastrados do tutor
  const [existingPets, setExistingPets] = useState<Pet[]>([]);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [petMode, setPetMode] = useState<'existing' | 'new'>('existing');
  const [existingPetEdits, setExistingPetEdits] = useState<
    Record<string, PetFormData>
  >({});
  const [editingPetId, setEditingPetId] = useState<string | null>(null);

  const [newTutor, setNewTutor] = useState({
    nome: '',
    whatsapp: '',
    instagram: '',
    endereco: '',
    observacoes: '',
  });

  // Step 2: Novos pets
  const [petCount, setPetCount] = useState(1);
  const [pets, setPets] = useState<PetFormData[]>([{ ...EMPTY_PET }]);

  // Step 3: Vacinas (por pet)
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);

  useEffect(() => {
    supabase
      .from('tutors')
      .select('*')
      .order('nome')
      .then(({ data }) => setTutors((data as Tutor[]) || []));

    supabase
      .from('vaccines')
      .select('*')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => setVaccines((data as Vaccine[]) || []));

    supabase
      .from('settings')
      .select('*')
      .limit(1)
      .then(({ data }) =>
        setSettings((data as Settings[])?.[0] || null)
      );
  }, []);

  // Busca os pets do tutor selecionado
  useEffect(() => {
    const loadTutorPets = async () => {
      if (!selectedTutor) {
        setExistingPets([]);
        setSelectedPetIds([]);
        setExistingPetEdits({});
        setEditingPetId(null);
        return;
      }

      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('tutor_id', selectedTutor.id)
        .order('nome');

      if (error) {
        toast('Erro ao carregar os pets do tutor', 'error');
        return;
      }

      const tutorPets = (data as Pet[]) || [];

      setExistingPets(tutorPets);
      setSelectedPetIds([]);
      setExistingPetEdits(
        Object.fromEntries(
          tutorPets.map((pet) => [pet.id, petToFormData(pet)])
        )
      );
      setEditingPetId(null);
      setPetMode(tutorPets.length > 0 ? 'existing' : 'new');
    };

    loadTutorPets();
  }, [selectedTutor, toast]);

  const filteredTutors = tutors.filter((t) => {
    const q = tutorSearch.toLowerCase();

    return (
      t.nome.toLowerCase().includes(q) ||
      t.whatsapp.includes(q)
    );
  });

  const selectedExistingPets = selectedPetIds
    .map((id) => existingPets.find((pet) => pet.id === id))
    .filter((pet): pet is Pet => Boolean(pet));

  const usingExistingPets =
    !!selectedTutor && petMode === 'existing';

  const appointmentPetNames = usingExistingPets
    ? selectedExistingPets.map(
        (pet) => existingPetEdits[pet.id]?.nome || pet.nome
      )
    : pets.map((pet, index) => pet.nome || `Pet #${index + 1}`);

  const updatePet = (
    index: number,
    field: keyof PetFormData,
    value: string
  ) => {
    setPets((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      )
    );
  };

  const toggleExistingPet = (petId: string) => {
    setSelectedPetIds((prev) =>
      prev.includes(petId)
        ? prev.filter((id) => id !== petId)
        : [...prev, petId]
    );
  };

  const updateExistingPet = (
    petId: string,
    field: keyof PetFormData,
    value: string
  ) => {
    setExistingPetEdits((prev) => {
      const current =
        prev[petId] ||
        petToFormData(
          existingPets.find((pet) => pet.id === petId) as Pet
        );

      return {
        ...prev,
        [petId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const setPetCountAndResize = (count: number) => {
    setPetCount(count);

    setPets((prev) => {
      const next = [...prev];

      while (next.length < count) {
        next.push({ ...EMPTY_PET });
      }

      return next.slice(0, count);
    });
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return (
          !!selectedTutor ||
          (tutorMode === 'new' &&
            !!newTutor.nome.trim() &&
            !!newTutor.whatsapp.trim())
        );

      case 1:
        if (usingExistingPets) {
          return (
            selectedPetIds.length > 0 &&
            selectedExistingPets.every(
              (pet) =>
                (
                  existingPetEdits[pet.id]?.nome ||
                  pet.nome ||
                  ''
                ).trim() !== ''
            )
          );
        }

        return pets.every((p) => p.nome.trim() !== '');

      case 2:
        return (
          appointments.length === appointmentPetNames.length &&
          appointments.length > 0 &&
          appointments.every(
            (a) => a.vaccine_id && a.dose
          )
        );

      case 3:
        return (
          appointments.length > 0 &&
          appointments.every(
            (a) => a.data_agendada && a.horario
          )
        );

      case 4:
        return true;

      default:
        return false;
    }
  };

  const next = () => {
    if (step === 0 && tutorMode === 'new') {
      const normalized = normalizePhone(newTutor.whatsapp);

      const existing = tutors.find(
        (t) => t.whatsapp === normalized
      );

      if (existing) {
        toast(
          'Já existe um tutor com este WhatsApp. Selecione-o na busca.',
          'warning'
        );

        setSelectedTutor(existing);
        setTutorMode('search');
        setStep(1);
        return;
      }
    }

    if (step === 1) {
      const today = todayISO();

      const appointmentCount = usingExistingPets
        ? selectedExistingPets.length
        : petCount;

      setAppointments(
        Array.from(
          { length: appointmentCount },
          (_, i) => ({
            petIndex: i,
            vaccine_id: '',
            dose: '1ª dose',
            data_agendada: today,
            horario: '',
            observacoes: '',
          })
        )
      );
    }

    setStep((s) =>
      Math.min(s + 1, STEPS.length - 1)
    );
  };

  const prev = () =>
    setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setSaving(true);

    try {
      let tutorRecord = selectedTutor;
      let tutorId = tutorRecord?.id;

      // Criar tutor somente se for um tutor novo
      if (!tutorId && tutorMode === 'new') {
        const { data: newT, error } = await supabase
          .from('tutors')
          .insert({
            nome: newTutor.nome.trim(),
            whatsapp: normalizePhone(newTutor.whatsapp),
            instagram: newTutor.instagram.trim() || null,
            endereco: newTutor.endereco.trim() || null,
            observacoes: newTutor.observacoes.trim() || null,
          })
          .select()
          .single();

        if (error) throw error;

        tutorRecord = newT as Tutor;
        tutorId = tutorRecord.id;
      }

      if (!tutorId || !tutorRecord) {
        throw new Error('Tutor não definido');
      }

      // Aqui ficam os pets que realmente receberão os agendamentos.
      // Se forem pets existentes, NÃO cria novos registros.
      const appointmentPets: Pet[] = [];

      if (usingExistingPets) {
        // Atualiza os dados dos pets já cadastrados e reutiliza o mesmo ID.
        // Assim o histórico continua pertencendo ao mesmo pet.
        for (const existingPet of selectedExistingPets) {
          const edited =
            existingPetEdits[existingPet.id] ||
            petToFormData(existingPet);

          const { data: updatedPet, error } = await supabase
            .from('pets')
            .update({
              nome: edited.nome.trim(),
              especie: edited.especie,
              raca: edited.raca.trim() || null,
              idade: edited.idade.trim() || null,
              peso: edited.peso.trim() || null,
              sexo: edited.sexo || null,
              observacoes: edited.observacoes.trim() || null,
            })
            .eq('id', existingPet.id)
            .select()
            .single();

          if (error) throw error;

          appointmentPets.push(updatedPet as Pet);
        }
      } else {
        // Cria somente os novos pets
        for (const petForm of pets) {
          const { data: pet, error } = await supabase
            .from('pets')
            .insert({
              tutor_id: tutorId,
              nome: petForm.nome.trim(),
              especie: petForm.especie,
              raca: petForm.raca.trim() || null,
              idade: petForm.idade.trim() || null,
              peso: petForm.peso.trim() || null,
              sexo: petForm.sexo || null,
              observacoes:
                petForm.observacoes.trim() || null,
            })
            .select()
            .single();

          if (error) throw error;

          appointmentPets.push(pet as Pet);
        }
      }

      if (appointmentPets.length !== appointments.length) {
        throw new Error(
          'A quantidade de pets não corresponde aos agendamentos.'
        );
      }

      // Mensagens que serão disponibilizadas após salvar.
      // O WhatsApp só é aberto quando o funcionário clicar no botão,
      // evitando bloqueio de popup do navegador.
      const preparedMessages: CreatedWhatsAppMessage[] = [];

      // Criar agendamentos
      for (const apt of appointments) {
        const vaccine = vaccines.find(
          (v) => v.id === apt.vaccine_id
        );

        if (!vaccine) continue;

        const targetPet = appointmentPets[apt.petIndex];

        if (!targetPet) {
          throw new Error('Pet do agendamento não encontrado.');
        }

        // Verificar estoque
        if (vaccine.estoque_atual <= 0) {
          toast(
            `Vacina ${vaccine.nome} está sem estoque. Agendamento não criado.`,
            'error'
          );
          continue;
        }

        const { error } = await supabase
          .from('appointments')
          .insert({
            tutor_id: tutorId,
            pet_id: targetPet.id,
            vaccine_id: apt.vaccine_id,
            dose: apt.dose,
            data_agendada: apt.data_agendada,
            horario_agendado: apt.horario,
            status: 'agendado',
            observacoes:
              apt.observacoes.trim() || null,
          });

        if (error) throw error;

        const tempApt = {
          id: '',
          tutor_id: tutorId,
          pet_id: targetPet.id,
          vaccine_id: apt.vaccine_id,
          dose: apt.dose,
          data_agendada: apt.data_agendada,
          horario_agendado: apt.horario,
          status: 'agendado' as const,
          observacoes: apt.observacoes,
          created_at: '',
          updated_at: '',
        };

        const msg = buildAgendamentoMessage(
          tutorRecord,
          targetPet,
          vaccine,
          tempApt,
          settings
        );

        await logMessage(
          tutorId,
          targetPet.id,
          'agendamento',
          msg,
          'preparada'
        );

        preparedMessages.push({
          petId: targetPet.id,
          petName: targetPet.nome,
          message: msg,
        });
      }

      toast('Agendamento(s) criado(s) com sucesso!');

      if (preparedMessages.length > 0) {
        setCreatedTutor(tutorRecord);
        setCreatedWhatsAppMessages(preparedMessages);
      } else {
        navigate('/agenda');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao criar agendamento';

      toast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const progress =
    ((step + 1) / STEPS.length) * 100;

  // =========================================================
  // AGENDAMENTO CRIADO / WHATSAPP
  // =========================================================

  if (createdTutor && createdWhatsAppMessages.length > 0) {
    return (
      <Layout title="Agendamento Criado">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardBody>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-4"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                  <Check className="h-7 w-7" />
                </div>

                <div className="mt-4 text-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Agendamento criado com sucesso!
                  </h2>

                  <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                    A mensagem já foi montada com os dados do agendamento.
                    Clique abaixo para abrir o WhatsApp de{' '}
                    <span className="font-medium text-gray-700 dark:text-slate-200">
                      {createdTutor.nome}
                    </span>
                    .
                  </p>

                  <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                    WhatsApp: {formatPhone(createdTutor.whatsapp)}
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  {createdWhatsAppMessages.map((item, index) => (
                    <div
                      key={`${item.petId}-${index}`}
                      className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {item.petName}
                          </p>

                          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                            Mensagem de agendamento pronta para envio
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="success"
                          onClick={() =>
                            openWhatsApp(
                              createdTutor.whatsapp,
                              item.message
                            )
                          }
                        >
                          <MessageCircle className="h-4 w-4" />
                          Abrir WhatsApp
                        </Button>
                      </div>

                      <div className="mt-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                        <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-slate-300">
                          {item.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/agenda')}
                  >
                    Ir para a Agenda
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            </CardBody>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Novo Agendamento">
      {/* Cabeçalho / progresso */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Novo Agendamento
          </h2>

          <span className="text-sm text-gray-500 dark:text-slate-400">
            Etapa {step + 1} de {STEPS.length}
          </span>
        </div>

        <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
            initial={{ width: 0 }}
            animate={{
              width: `${progress}%`,
            }}
            transition={{
              duration: 0.4,
              ease: 'easeOut',
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                  i <= step
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500'
                }`}
              >
                {i < step ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <s.icon className="w-4 h-4" />
                )}
              </div>

              <span
                className={`text-xs ${
                  i <= step
                    ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                    : 'text-gray-400 dark:text-slate-500'
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{
            opacity: 0,
            x: 20,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          exit={{
            opacity: 0,
            x: -20,
          }}
          transition={{
            duration: 0.25,
          }}
        >
          {/* Step 0: Tutor */}
          {step === 0 && (
            <Card>
              <CardBody>
                <div className="flex rounded-lg bg-gray-100 dark:bg-slate-950 p-1 mb-4">
                  <button
                    onClick={() => setTutorMode('search')}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                      tutorMode === 'search'
                        ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                    }`}
                  >
                    Buscar Tutor
                  </button>

                  <button
                    onClick={() => {
                      setTutorMode('new');
                      setSelectedTutor(null);
                      setSelectedPetIds([]);
                      setExistingPetEdits({});
                      setEditingPetId(null);
                      setPetMode('new');
                    }}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                      tutorMode === 'new'
                        ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                    }`}
                  >
                    Novo Tutor
                  </button>
                </div>

                {tutorMode === 'search' ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />

                      <input
                        type="text"
                        value={tutorSearch}
                        onChange={(e) =>
                          setTutorSearch(e.target.value)
                        }
                        placeholder="Buscar por nome ou WhatsApp..."
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {filteredTutors.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setSelectedTutor(t);
                            setTutorMode('search');
                            setSelectedPetIds([]);
                          }}
                          className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                            selectedTutor?.id === t.id
                              ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                            {t.nome
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {t.nome}
                            </p>

                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {formatPhone(t.whatsapp)}
                            </p>
                          </div>

                          {selectedTutor?.id === t.id && (
                            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </button>
                      ))}

                      {filteredTutors.length === 0 && (
                        <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                          Nenhum tutor encontrado
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Input
                      label="Nome Completo"
                      value={newTutor.nome}
                      onChange={(e) =>
                        setNewTutor({
                          ...newTutor,
                          nome: e.target.value,
                        })
                      }
                      placeholder="Nome do tutor"
                      required
                    />

                    <Input
                      label="WhatsApp"
                      value={newTutor.whatsapp}
                      onChange={(e) =>
                        setNewTutor({
                          ...newTutor,
                          whatsapp: e.target.value,
                        })
                      }
                      placeholder="(11) 99999-9999"
                      required
                    />

                    <Input
                      label="Instagram (opcional)"
                      value={newTutor.instagram}
                      onChange={(e) =>
                        setNewTutor({
                          ...newTutor,
                          instagram: e.target.value,
                        })
                      }
                      placeholder="@usuario"
                    />

                    <Textarea
                      label="Endereço"
                      value={newTutor.endereco}
                      onChange={(e) =>
                        setNewTutor({
                          ...newTutor,
                          endereco: e.target.value,
                        })
                      }
                      rows={2}
                      placeholder="Endereço completo"
                    />
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Step 1: Pets */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Tutor existente com pets cadastrados */}
              {selectedTutor && existingPets.length > 0 && (
                <Card>
                  <CardBody>
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Pets de {selectedTutor.nome}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        Escolha um pet já cadastrado ou cadastre um novo.
                      </p>
                    </div>

                    <div className="flex rounded-lg bg-gray-100 dark:bg-slate-950 p-1 mb-4">
                      <button
                        onClick={() => setPetMode('existing')}
                        className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition ${
                          petMode === 'existing'
                            ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                            : 'text-gray-500 dark:text-slate-400'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Dog className="w-4 h-4" />
                          Pets cadastrados
                        </span>
                      </button>

                      <button
                        onClick={() => setPetMode('new')}
                        className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition ${
                          petMode === 'new'
                            ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                            : 'text-gray-500 dark:text-slate-400'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Plus className="w-4 h-4" />
                          Novo pet
                        </span>
                      </button>
                    </div>

                    {petMode === 'existing' && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                          Selecione um ou mais pets que serão vacinados:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {existingPets.map((pet) => {
                            const selected =
                              selectedPetIds.includes(pet.id);

                            const edit =
                              existingPetEdits[pet.id] ||
                              petToFormData(pet);

                            const editing =
                              editingPetId === pet.id;

                            return (
                              <div
                                key={pet.id}
                                className={`overflow-hidden rounded-xl border-2 transition-all ${
                                  selected
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                    : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                                } ${editing ? 'sm:col-span-2' : ''}`}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleExistingPet(pet.id)
                                  }
                                  className="w-full flex items-center gap-3 p-4 text-left transition hover:bg-gray-50/60 dark:hover:bg-slate-800/30"
                                >
                                  <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                      selected
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                                    }`}
                                  >
                                    <PawPrint className="w-5 h-5" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">
                                      {edit.nome}
                                    </p>

                                    <p className="text-xs text-gray-500 dark:text-slate-400">
                                      {edit.especie}
                                      {edit.raca ? ` · ${edit.raca}` : ''}
                                      {edit.idade ? ` · ${edit.idade}` : ''}
                                      {edit.peso ? ` · ${edit.peso}` : ''}
                                    </p>
                                  </div>

                                  <div
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                      selected
                                        ? 'border-emerald-600 bg-emerald-600 text-white'
                                        : 'border-gray-300 dark:border-slate-700'
                                    }`}
                                  >
                                    {selected && (
                                      <Check className="w-4 h-4" />
                                    )}
                                  </div>
                                </button>

                                {selected && (
                                  <div className="border-t border-emerald-100 dark:border-emerald-900/50 px-4 py-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingPetId(
                                          editing ? null : pet.id
                                        )
                                      }
                                      className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition"
                                    >
                                      <Pencil className="w-4 h-4" />
                                      {editing
                                        ? 'Fechar edição'
                                        : 'Editar informações do pet'}
                                    </button>

                                    {editing && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-4"
                                      >
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          <Input
                                            label="Nome do Pet"
                                            value={edit.nome}
                                            onChange={(e) =>
                                              updateExistingPet(
                                                pet.id,
                                                'nome',
                                                e.target.value
                                              )
                                            }
                                            required
                                          />

                                          <Select
                                            label="Espécie"
                                            value={edit.especie}
                                            onChange={(e) =>
                                              updateExistingPet(
                                                pet.id,
                                                'especie',
                                                e.target.value
                                              )
                                            }
                                          >
                                            {ESPECIES.map((especie) => (
                                              <option
                                                key={especie}
                                                value={especie}
                                              >
                                                {especie}
                                              </option>
                                            ))}
                                          </Select>

                                          <Input
                                            label="Raça"
                                            value={edit.raca}
                                            onChange={(e) =>
                                              updateExistingPet(
                                                pet.id,
                                                'raca',
                                                e.target.value
                                              )
                                            }
                                            placeholder="Raça"
                                          />

                                          <Input
                                            label="Idade atual"
                                            value={edit.idade}
                                            onChange={(e) =>
                                              updateExistingPet(
                                                pet.id,
                                                'idade',
                                                e.target.value
                                              )
                                            }
                                            placeholder="Ex: 3 anos"
                                          />

                                          <Input
                                            label="Peso atual"
                                            value={edit.peso}
                                            onChange={(e) =>
                                              updateExistingPet(
                                                pet.id,
                                                'peso',
                                                e.target.value
                                              )
                                            }
                                            placeholder="Ex: 7,5 kg"
                                          />

                                          <Select
                                            label="Sexo"
                                            value={edit.sexo}
                                            onChange={(e) =>
                                              updateExistingPet(
                                                pet.id,
                                                'sexo',
                                                e.target.value
                                              )
                                            }
                                          >
                                            <option value="">
                                              Não informar
                                            </option>
                                            <option value="Macho">
                                              Macho
                                            </option>
                                            <option value="Fêmea">
                                              Fêmea
                                            </option>
                                          </Select>

                                          <div className="sm:col-span-2">
                                            <Textarea
                                              label="Observações"
                                              value={edit.observacoes}
                                              onChange={(e) =>
                                                updateExistingPet(
                                                  pet.id,
                                                  'observacoes',
                                                  e.target.value
                                                )
                                              }
                                              rows={2}
                                              placeholder="Observações"
                                            />
                                          </div>
                                        </div>

                                        <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
                                          As alterações serão salvas no cadastro
                                          deste pet quando o agendamento for
                                          confirmado.
                                        </p>
                                      </motion.div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}

              {/* Tutor existente sem pets */}
              {selectedTutor && existingPets.length === 0 && (
                <Card>
                  <CardBody>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                        <Plus className="w-5 h-5" />
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Primeiro pet de {selectedTutor.nome}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                          Este tutor ainda não possui pets cadastrados. Preencha
                          os dados abaixo.
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Cadastro de novos pets */}
              {(!selectedTutor ||
                existingPets.length === 0 ||
                petMode === 'new') && (
                <>
                  <Card>
                    <CardBody>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Quantos animais serão vacinados hoje?
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((n) => (
                          <button
                            key={n}
                            onClick={() =>
                              setPetCountAndResize(n)
                            }
                            className={`flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all ${
                              petCount === n
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                : 'border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <Dog className="w-6 h-6 mb-1" />

                            <span className="text-sm font-semibold">
                              {n}{' '}
                              {n === 1
                                ? 'animal'
                                : 'animais'}
                            </span>
                          </button>
                        ))}
                      </div>

                      {petCount === 4 && (
                        <p className="mt-2 text-xs text-gray-400 dark:text-slate-500 text-center">
                          Selecione 4 para 4 ou mais animais
                        </p>
                      )}
                    </CardBody>
                  </Card>

                  {pets.map((pet, i) => (
                    <Card key={i}>
                      <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                            {i + 1}
                          </div>

                          <h4 className="font-semibold text-gray-800 dark:text-slate-100">
                            Ficha do Pet #{i + 1}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            label="Nome do Pet"
                            value={pet.nome}
                            onChange={(e) =>
                              updatePet(
                                i,
                                'nome',
                                e.target.value
                              )
                            }
                            placeholder="Nome"
                            required
                          />

                          <Select
                            label="Espécie"
                            value={pet.especie}
                            onChange={(e) =>
                              updatePet(
                                i,
                                'especie',
                                e.target.value as Especie
                              )
                            }
                          >
                            {ESPECIES.map((e) => (
                              <option
                                key={e}
                                value={e}
                              >
                                {e}
                              </option>
                            ))}
                          </Select>

                          <Input
                            label="Raça"
                            value={pet.raca}
                            onChange={(e) =>
                              updatePet(
                                i,
                                'raca',
                                e.target.value
                              )
                            }
                            placeholder="Raça"
                          />

                          <Input
                            label="Idade"
                            value={pet.idade}
                            onChange={(e) =>
                              updatePet(
                                i,
                                'idade',
                                e.target.value
                              )
                            }
                            placeholder="Ex: 2 anos"
                          />

                          <Input
                            label="Peso"
                            value={pet.peso}
                            onChange={(e) =>
                              updatePet(
                                i,
                                'peso',
                                e.target.value
                              )
                            }
                            placeholder="Ex: 5kg"
                          />

                          <Select
                            label="Sexo (opcional)"
                            value={pet.sexo}
                            onChange={(e) =>
                              updatePet(
                                i,
                                'sexo',
                                e.target.value
                              )
                            }
                          >
                            <option value="">
                              Não informar
                            </option>
                            <option value="Macho">
                              Macho
                            </option>
                            <option value="Fêmea">
                              Fêmea
                            </option>
                          </Select>
                        </div>

                        <Textarea
                          label="Observações"
                          value={pet.observacoes}
                          onChange={(e) =>
                            updatePet(
                              i,
                              'observacoes',
                              e.target.value
                            )
                          }
                          rows={2}
                          placeholder="Observações"
                          className="mt-3"
                        />
                      </CardBody>
                    </Card>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Step 2: Vacinas */}
          {step === 2 && (
            <div className="space-y-4">
              {appointmentPetNames.map((petName, i) => {
                const apt = appointments[i];

                if (!apt) return null;

                return (
                  <Card key={i}>
                    <CardBody>
                      <div className="flex items-center gap-2 mb-4">
                        <PawPrint className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />

                        <h4 className="font-semibold text-gray-800 dark:text-slate-100">
                          {petName}
                        </h4>
                      </div>

                      <div className="space-y-3">
                        <Select
                          label="Vacina"
                          value={apt.vaccine_id}
                          onChange={(e) =>
                            setAppointments((prev) =>
                              prev.map((a, j) =>
                                j === i
                                  ? {
                                      ...a,
                                      vaccine_id:
                                        e.target.value,
                                    }
                                  : a
                              )
                            )
                          }
                          required
                        >
                          <option value="">
                            Selecione a vacina
                          </option>

                          {vaccines.map((v) => (
                            <option
                              key={v.id}
                              value={v.id}
                              disabled={
                                v.estoque_atual <= 0
                              }
                            >
                              {v.nome}{' '}
                              {v.estoque_atual <= 0
                                ? '(sem estoque)'
                                : `(${v.estoque_atual} un.)`}
                            </option>
                          ))}
                        </Select>

                        <Select
                          label="Dose"
                          value={apt.dose}
                          onChange={(e) =>
                            setAppointments((prev) =>
                              prev.map((a, j) =>
                                j === i
                                  ? {
                                      ...a,
                                      dose: e.target.value,
                                    }
                                  : a
                              )
                            )
                          }
                        >
                          {DOSE_OPTIONS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </Select>

                        <Textarea
                          label="Observações (opcional)"
                          value={apt.observacoes}
                          onChange={(e) =>
                            setAppointments((prev) =>
                              prev.map((a, j) =>
                                j === i
                                  ? {
                                      ...a,
                                      observacoes:
                                        e.target.value,
                                    }
                                  : a
                              )
                            )
                          }
                          rows={2}
                        />
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Step 3: Data e Horário */}
          {step === 3 && (
            <div className="space-y-4">
              {appointmentPetNames.map((petName, i) => {
                const apt = appointments[i];

                if (!apt) return null;

                return (
                  <Card key={i}>
                    <CardBody>
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />

                        <h4 className="font-semibold text-gray-800 dark:text-slate-100">
                          {petName}
                        </h4>
                      </div>

                      <div className="space-y-5">
                        <Input
                          label="Data do Agendamento"
                          type="date"
                          value={apt.data_agendada}
                          min={todayISO()}
                          onChange={(e) =>
                            setAppointments((prev) =>
                              prev.map((a, j) =>
                                j === i
                                  ? {
                                      ...a,
                                      data_agendada: e.target.value,
                                    }
                                  : a
                              )
                            )
                          }
                          required
                        />

                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />

                            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                              Horário do Agendamento
                            </p>
                          </div>

                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {TIME_SLOTS.map((time) => (
                              <button
                                key={time}
                                type="button"
                                onClick={() =>
                                  setAppointments((prev) =>
                                    prev.map((a, j) =>
                                      j === i
                                        ? {
                                            ...a,
                                            horario: time,
                                          }
                                        : a
                                    )
                                  )
                                }
                                className={`rounded-lg border py-2.5 text-sm font-medium transition ${
                                  apt.horario === time
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/10'
                                    : 'border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60'
                                }`}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </div>

                        {apt.data_agendada && apt.horario && (
                          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5">
                            <p className="text-xs text-emerald-700 dark:text-emerald-400">
                              Agendamento selecionado:{' '}
                              <span className="font-semibold">
                                {apt.data_agendada} às {apt.horario}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Step 4: Confirmação */}
          {step === 4 && (
            <Card>
              <CardBody>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />

                    <h4 className="font-semibold text-gray-800 dark:text-slate-100">
                      Tutor
                    </h4>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    {selectedTutor
                      ? selectedTutor.nome
                      : newTutor.nome}

                    {selectedTutor
                      ? ` · ${formatPhone(
                          selectedTutor.whatsapp
                        )}`
                      : ` · ${newTutor.whatsapp}`}
                  </p>

                  <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Syringe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />

                      <h4 className="font-semibold text-gray-800 dark:text-slate-100">
                        Agendamentos
                      </h4>
                    </div>

                    <div className="space-y-3">
                      {appointments.map((apt, i) => {
                        const vaccine =
                          vaccines.find(
                            (v) =>
                              v.id === apt.vaccine_id
                          );

                        return (
                          <div
                            key={i}
                            className="rounded-lg border border-gray-100 dark:border-slate-800 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-800 dark:text-slate-100">
                                  {appointmentPetNames[i] ||
                                    `Pet #${i + 1}`}
                                </p>

                                <p className="text-sm text-gray-500 dark:text-slate-400">
                                  {vaccine?.nome ||
                                    'Vacina'}{' '}
                                  · {apt.dose}
                                </p>

                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                                  {apt.data_agendada}{' '}
                                  às {apt.horario}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navegação */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prev}
          disabled={step === 0}
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={next}
            disabled={!canProceed()}
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            loading={saving}
            variant="success"
          >
            <Check className="w-4 h-4" />
            Confirmar Agendamento
          </Button>
        )}
      </div>
    </Layout>
  );
}