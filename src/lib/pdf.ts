import jsPDF from 'jspdf';
import QRCode from 'qrcode';

import type {
  Pet,
  Tutor,
  VaccineApplication,
  DigitalBooklet,
  Settings,
} from '@/types/database';

import { formatDate } from '@/lib/utils';

// ===========================================================
// CONVERTER IMAGEM PARA PNG
// Usado pela foto do pet e pela logo da empresa
// ===========================================================

async function imageUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Não foi possível carregar a imagem');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const img = new Image();

        img.onload = () => resolve(img);

        img.onerror = () =>
          reject(
            new Error('Erro ao processar a imagem')
          );

        img.src = objectUrl;
      }
    );

    const canvas = document.createElement('canvas');

    canvas.width =
      image.naturalWidth || image.width;

    canvas.height =
      image.naturalHeight || image.height;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error(
        'Não foi possível preparar a imagem'
      );
    }

    context.drawImage(
      image,
      0,
      0
    );

    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// ===========================================================
// TIPOS
// ===========================================================

interface PDFParams {
  pet: Pet;
  tutor?: Tutor | null;
  applications: VaccineApplication[];
  booklet: DigitalBooklet;
  settings?: Settings | null;
}

// ===========================================================
// GERAR PDF
// ===========================================================

export async function generateBookletPDF({
  pet,
  tutor,
  applications,
  booklet,
  settings,
}: PDFParams) {
  const doc = new jsPDF();

  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();

  const margin = 15;

  // =========================================================
  // CARREGAR LOGO DA EMPRESA
  // =========================================================

  let companyLogoDataUrl: string | null = null;

  if (settings?.logo_url) {
    try {
      companyLogoDataUrl =
        await imageUrlToDataUrl(
          settings.logo_url
        );
    } catch (error) {
      console.error(
        'Erro ao carregar logo da empresa para o PDF:',
        error
      );
    }
  }

  // =========================================================
  // CARREGAR FOTO DO PET
  // =========================================================

  let petPhotoDataUrl: string | null = null;

  if (pet.foto_url) {
    try {
      petPhotoDataUrl =
        await imageUrlToDataUrl(
          pet.foto_url
        );
    } catch (error) {
      console.error(
        'Erro ao carregar foto do pet para o PDF:',
        error
      );
    }
  }

  // =========================================================
  // HEADER
  // =========================================================

  const headerHeight = 45;

  doc.setFillColor(
  86,
  158,
  30
);

  doc.rect(
    0,
    0,
    pageWidth,
    headerHeight,
    'F'
  );

  // =========================================================
  // LOGO DA EMPRESA
  // =========================================================

  let companyTextX = margin;

  if (companyLogoDataUrl) {
    try {
      doc.addImage(
        companyLogoDataUrl,
        'PNG',
        margin,
        5,
        28,
        28
      );

      companyTextX =
        margin + 35;
    } catch (error) {
      console.error(
        'Erro ao adicionar logo ao PDF:',
        error
      );

      companyLogoDataUrl = null;
      companyTextX = margin;
    }
  }

  // =========================================================
  // NOME DA EMPRESA
  // =========================================================

  const companyName =
    settings?.nome_farmacia ||
    'VetFarm';

  doc.setTextColor(
    255,
    255,
    255
  );

  doc.setFont(
    'helvetica',
    'bold'
  );

  let companyFontSize = 18;

  doc.setFontSize(
    companyFontSize
  );

  while (
    doc.getTextWidth(companyName) > 90 &&
    companyFontSize > 11
  ) {
    companyFontSize -= 1;

    doc.setFontSize(
      companyFontSize
    );
  }

  doc.text(
    companyName,
    companyTextX,
    11
  );

  // =========================================================
  // SUBTÍTULO
  // =========================================================

  doc.setFontSize(8.5);

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    'Farmácia Veterinária',
    companyTextX,
    17
  );

  // =========================================================
  // DADOS DE CONTATO
  // =========================================================

  doc.setFontSize(7.5);

  doc.setFont(
    'helvetica',
    'normal'
  );

  let contactY = 23;

  // TELEFONE

  if (settings?.whatsapp) {
    doc.text(
      `Telefone: ${settings.whatsapp}`,
      companyTextX,
      contactY
    );

    contactY += 5;
  }

  // INSTAGRAM

  if (settings?.instagram) {
    doc.text(
      `Instagram: ${settings.instagram}`,
      companyTextX,
      contactY
    );

    contactY += 5;
  }

  // ENDEREÇO

  if (settings?.endereco) {
    doc.text(
      `Endereço: ${settings.endereco}`,
      companyTextX,
      contactY
    );
  }

  // =========================================================
  // TÍTULO DA CADERNETA
  // =========================================================

  doc.setTextColor(
    255,
    255,
    255
  );

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(11);

  doc.text(
    'Caderneta Digital',
    pageWidth - margin,
    15,
    {
      align: 'right',
    }
  );

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setFontSize(10);

  doc.text(
    'de Vacinação',
    pageWidth - margin,
    21,
    {
      align: 'right',
    }
  );

  // =========================================================
  // DADOS DO PET
  // =========================================================

  let y = 57;

  doc.setTextColor(
    31,
    41,
    55
  );

  doc.setFontSize(14);

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    'Dados do Pet',
    margin,
    y
  );

  // ---------------------------------------------------------
  // FOTO DO PET
  // ---------------------------------------------------------

  if (petPhotoDataUrl) {
    try {
      doc.addImage(
        petPhotoDataUrl,
        'PNG',
        margin,
        y + 5,
        28,
        28
      );
    } catch (error) {
      console.error(
        'Erro ao adicionar foto do pet ao PDF:',
        error
      );

      petPhotoDataUrl = null;
    }
  }

  const petTextX =
    petPhotoDataUrl
      ? margin + 35
      : margin;

  y += 9;

  doc.setFontSize(10);

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setTextColor(
    31,
    41,
    55
  );

  // Linha 1

  doc.text(
    `Nome: ${pet.nome}`,
    petTextX,
    y
  );

  doc.text(
    `Espécie: ${pet.especie}`,
    petTextX + 55,
    y
  );

  // Linha 2

  y += 7;

  if (pet.raca) {
    doc.text(
      `Raça: ${pet.raca}`,
      petTextX,
      y
    );
  }

  if (pet.idade) {
    doc.text(
      `Idade: ${pet.idade}`,
      petTextX + 55,
      y
    );
  }

  // Linha 3

  y += 7;

  if (pet.peso) {
    doc.text(
      `Peso: ${pet.peso}`,
      petTextX,
      y
    );
  }

  if (pet.sexo) {
    doc.text(
      `Sexo: ${pet.sexo}`,
      petTextX + 55,
      y
    );
  }

  // Espaço para a foto

  if (petPhotoDataUrl) {
    y = Math.max(
      y,
      90
    );
  }

  // =========================================================
  // DADOS DO TUTOR
  // =========================================================

  y += 10;

  doc.setFontSize(14);

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setTextColor(
    31,
    41,
    55
  );

  doc.text(
    'Dados do Tutor',
    margin,
    y
  );

  y += 7;

  doc.setFontSize(10);

  doc.setFont(
    'helvetica',
    'normal'
  );

  if (tutor) {
    doc.text(
      `Nome: ${tutor.nome}`,
      margin,
      y
    );

    y += 6;

    doc.text(
      `WhatsApp: ${tutor.whatsapp}`,
      margin,
      y
    );

    if (tutor.endereco) {
      y += 6;

      doc.text(
        `Endereço: ${tutor.endereco}`,
        margin,
        y
      );
    }
  }

  // =========================================================
  // HISTÓRICO DE VACINAÇÃO
  // =========================================================

  y += 12;

  doc.setFontSize(14);

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setTextColor(
    31,
    41,
    55
  );

  doc.text(
    'Histórico de Vacinação',
    margin,
    y
  );

  y += 7;

  if (applications.length === 0) {
    doc.setFontSize(10);

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.text(
      'Nenhuma vacina aplicada registrada.',
      margin,
      y
    );
  } else {
    // =======================================================
    // CABEÇALHO DA TABELA
    // =======================================================

    doc.setFillColor(
  243,
  250,
  238
);

    doc.rect(
      margin,
      y - 5,
      pageWidth - margin * 2,
      7,
      'F'
    );

    doc.setTextColor(
      31,
      41,
      55
    );

    doc.setFontSize(9);

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'Vacina',
      margin + 2,
      y
    );

    doc.text(
      'Dose',
      margin + 65,
      y
    );

    doc.text(
      'Data',
      margin + 95,
      y
    );

    doc.text(
      'Lote',
      margin + 125,
      y
    );

    doc.text(
      'Próxima',
      margin + 160,
      y
    );

    y += 7;

    // =======================================================
    // APLICAÇÕES
    // =======================================================

    applications.forEach(
      (app, index) => {
        const hasVeterinarian =
          Boolean(
            app.profissional
          ) ||
          Boolean(
            app.crmv
          );

        const hasSignature =
          Boolean(
            app.assinatura_url
          );

        let rowHeight = 7;

        if (hasVeterinarian) {
          rowHeight = 14;
        }

        if (hasSignature) {
          rowHeight = 32;
        }

        // ---------------------------------------------------
        // NOVA PÁGINA
        // ---------------------------------------------------

        if (
          y + rowHeight >
          pageHeight - 30
        ) {
          doc.addPage();

          y = 20;
        }

        // ---------------------------------------------------
        // FUNDO ALTERNADO
        // ---------------------------------------------------

        if (index % 2 === 0) {
          doc.setFillColor(
            249,
            250,
            251
          );

          doc.rect(
            margin,
            y - 5,
            pageWidth - margin * 2,
            rowHeight,
            'F'
          );
        }

        // ===================================================
        // DADOS DA VACINA
        // ===================================================

        doc.setFontSize(9);

        doc.setFont(
          'helvetica',
          'normal'
        );

        doc.setTextColor(
          31,
          41,
          55
        );

        doc.text(
          (
            app.vaccine?.nome ||
            'N/A'
          ).slice(0, 25),
          margin + 2,
          y
        );

        doc.text(
          app.dose || '-',
          margin + 65,
          y
        );

        doc.text(
          formatDate(
            app.data_aplicacao
          ),
          margin + 95,
          y
        );

        doc.text(
          app.lote || '-',
          margin + 125,
          y
        );

        doc.text(
          app.proxima_dose
            ? formatDate(
                app.proxima_dose
              )
            : '-',
          margin + 160,
          y
        );

        // ===================================================
        // VETERINÁRIO + CRMV
        // ===================================================

        if (hasVeterinarian) {
          doc.setFontSize(8);

          doc.setTextColor(
            75,
            85,
            99
          );

          const veterinarianText =
            [
              app.profissional,
              app.crmv,
            ]
              .filter(Boolean)
              .join(' · ');

          doc.text(
            `Veterinário: ${veterinarianText}`,
            margin + 2,
            y + 5
          );
        }

        // ===================================================
        // ASSINATURA
        // ===================================================

        if (app.assinatura_url) {
          doc.setFontSize(7);

          doc.setTextColor(
            107,
            114,
            128
          );

          doc.text(
            'Assinatura do Veterinário',
            margin + 2,
            y + 11
          );

          try {
            doc.addImage(
              app.assinatura_url,
              'PNG',
              margin + 2,
              y + 13,
              35,
              12
            );
          } catch (error) {
            console.error(
              'Erro ao adicionar assinatura ao PDF:',
              error
            );

            doc.text(
              'Assinatura registrada',
              margin + 2,
              y + 17
            );
          }
        }

        y += rowHeight;
      }
    );
  }

  // =========================================================
  // QR CODE
  // =========================================================

  let qrY =
    Math.max(
      y + 10,
      200
    );

  if (
    qrY + 45 >
    pageHeight - 15
  ) {
    doc.addPage();

    qrY = 25;
    y = 25;
  }

  const qrUrl =
    `${window.location.origin}/validar/${booklet.codigo_validacao}`;

  try {
    const qrDataUrl =
      await QRCode.toDataURL(
        qrUrl,
        {
          width: 150,
          margin: 1,
        }
      );

    doc.addImage(
      qrDataUrl,
      'PNG',
      pageWidth - 50,
      qrY,
      35,
      35
    );

    doc.setFontSize(8);

    doc.setTextColor(
      75,
      85,
      99
    );

    doc.text(
      'Escaneie para validar',
      pageWidth - 50,
      qrY + 40
    );
  } catch (error) {
    console.error(
      'Erro ao gerar QR Code:',
      error
    );
  }

  // =========================================================
  // CÓDIGO DE VALIDAÇÃO
  // =========================================================

  doc.setTextColor(
    31,
    41,
    55
  );

  doc.setFontSize(10);

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.text(
    `Código de Validação: ${booklet.codigo_validacao}`,
    margin,
    qrY + 10
  );

  // =========================================================
  // RODAPÉ
  // =========================================================

  doc.setFontSize(8);

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setTextColor(
    107,
    114,
    128
  );

  doc.text(
    `Emitido em: ${formatDate(
      new Date()
    )} | ${
      settings?.nome_farmacia ||
      'VetFarm'
    }`,
    margin,
    pageHeight - 10
  );

  // =========================================================
  // DOWNLOAD
  // =========================================================

  doc.save(
    `caderneta_${pet.nome.replace(
      /\s/g,
      '_'
    )}.pdf`
  );
}