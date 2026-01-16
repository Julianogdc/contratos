import { jsPDF } from 'jspdf';
import type { ContractData } from '../types';



// Helper to load image
const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Restore for external URLs
        img.onload = () => resolve(img);
        img.onerror = (e) => {
            console.error("Image load error for url:", url, e);
            reject(e);
        };
        // Cache bust to ensure fresh CORS request
        const separator = url.includes('?') ? '&' : '?';
        img.src = `${url}${separator}t=${new Date().getTime()}`;
    });
};

// Helper to ensure signature is black (fix for white/light signatures on white paper)
const ensureImageIsBlack = (img: HTMLImageElement): string => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return img.src;

    ctx.drawImage(img, 0, 0);

    // Get image data
    let imageData;
    try {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
        console.error("Canvas tainted, returning original image", e);
        return img.src;
    }

    const data = imageData.data;

    // Force ALL non-transparent pixels to be PURE BLACK OPAQUE
    // We assume the signature is likely white or light colored on transparent bg
    for (let i = 0; i < data.length; i += 4) {
        // If pixel determines ANY visibility (Alpha > 5)
        // If pixel determines ANY visibility (Alpha > 5)
        if (data[i + 3] > 5) {
            data[i] = 0;       // R -> Black
            data[i + 1] = 0;   // G
            data[i + 2] = 0;   // B
            data[i + 3] = 255; // Alpha -> Fully Opaque (BOLD)
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
};

export const generateContractPDF = async (data: ContractData, contractorSignature: string | null, clientSignature: string | null, logoSrc: string | null, includeAuditLog: boolean = true, returnBlob: boolean = false) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let cursorY = 20;

    // Colors
    const ZAFIRA_PURPLE = '#472d76'; // Darker purple for print readability, or stick to #8257e5

    // Reference image uses a deep purple/blue. Let's use a standard purple.
    doc.setTextColor(0, 0, 0);

    // --- Header ---
    // Logo Centered
    if (logoSrc) {
        try {
            const logoWidth = 50;
            const logoHeight = 16;
            const logoX = (pageWidth - logoWidth) / 2;
            const logoImg = await loadImage(logoSrc);
            doc.addImage(logoImg, 'PNG', logoX, 10, logoWidth, logoHeight);
        } catch (e) {
            console.error("Logo add failed", e);
            // Fallback text if logo fails
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.setTextColor(0, 0, 0);
            doc.text("zafira", pageWidth / 2, 25, { align: "center" });
        }
    }

    // Line below header
    doc.setDrawColor(ZAFIRA_PURPLE);
    doc.setLineWidth(1.0);
    doc.line(margin, 35, pageWidth - margin, 35);

    cursorY = 50;
    doc.setTextColor(0, 0, 0);

    // Helper to add text and advance cursor
    const addText = (text: string, fontSize: number = 10, font: 'helvetica' | 'times' = 'helvetica', style: 'normal' | 'bold' | 'italic' = 'normal', align: 'left' | 'center' | 'justify' | 'right' = 'justify', customLineHeight: number | null = null) => {
        doc.setFont(font, style);
        doc.setFontSize(fontSize);

        // Standardize: All text in black (0, 0, 0)
        doc.setTextColor(0, 0, 0);

        const lines = doc.splitTextToSize(text, contentWidth);
        const lineHeight = fontSize * 0.5; // Adjust spacing

        // Check page break (leave space for footer)
        if (cursorY + (lines.length * lineHeight) > pageHeight - margin - 25) {
            addFooter();
            doc.addPage();
            addHeaderRepeated();
            cursorY = 30;
            // CRITICAL FIX: Reset color to black after footer (which sets it to purple)
            doc.setTextColor(0, 0, 0);
            doc.setDrawColor(0, 0, 0);
            // CRITICAL FIX: Reset font style to the intended style for this text block
            // because addFooter() changes it to 'bold'
            doc.setFont(font, style);
        }

        doc.text(lines, align === 'center' ? pageWidth / 2 : (align === 'right' ? pageWidth - margin : margin), cursorY, { align: align === 'justify' ? 'left' : align, maxWidth: contentWidth, lineHeightFactor: 1.15 });

        // If customLineHeight is provided, use it, otherwise use flexible spacing
        // REDUCED DEFAULT SPACING FROM 3 TO 1.5 for tighter layout
        cursorY += (lines.length * lineHeight) + (customLineHeight !== null ? customLineHeight : 1.5);
    };

    const addSpace = (h: number) => {
        cursorY += h;
        // Check page break on space?
        if (cursorY > pageHeight - margin - 20) {
            addFooter();
            doc.addPage();
            addHeaderRepeated();
            cursorY = 30;
            doc.setTextColor(0, 0, 0); // Reset color
            doc.setDrawColor(0, 0, 0); // Reset draw color
        }
    };

    const addSectionTitle = (title: string) => {
        // "Keep with next" logic: Check if there's enough space for Title + ~30mm of content
        // If not, force page break before the title.
        // Increased threshold to 70 to be even safer and avoid orphan headers
        if (cursorY > pageHeight - margin - 70) {
            addFooter();
            doc.addPage();
            addHeaderRepeated();
            cursorY = 20; // Start at top margin if pushed
            doc.setTextColor(0, 0, 0); // Reset color
            doc.setDrawColor(0, 0, 0); // Reset draw color
        }
        // Use customLineHeight=2 to provide slight breathing room but keep it connected
        addText(title, 10, 'helvetica', 'bold', 'center', 2);
        doc.setFont('helvetica', 'normal'); // Reset to normal immediately after title
    };

    const addHeaderRepeated = () => {
        // Minimal header for continuation pages
        // doc.setTextColor(ZAFIRA_PURPLE);
        // doc.text("zafira", margin, 15);
        // doc.line(margin, 20, pageWidth - margin, 20);
    };

    const addFooter = () => {
        const footerY = pageHeight - 15;
        doc.setDrawColor(ZAFIRA_PURPLE);
        doc.setLineWidth(1.0); // Thicker line for consistency
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(ZAFIRA_PURPLE);
        doc.setDrawColor(ZAFIRA_PURPLE);

        // Manual centering: Shift left to compensate for charSpace visual expansion
        // Visual Center = Anchor + (Spacing / 2)
        // We want Visual Center = PageCenter (105)
        // Thus Anchor should be PageCenter - (Spacing / 2)
        // Estimating Spacing ~60-65mm for charSpace=3
        // Shift needed approx 32mm left.
        // Shift needed approx 32mm left.
        doc.text("LABORATÓRIO CRIATIVO", (pageWidth / 2) - 32, footerY, { align: 'center', charSpace: 3 });
    };

    // --- Content ---

    // --- Content Based on JSON Model ---

    // --- Content Based on JSON Model ---

    addSectionTitle('CONTRATO DE PRESTAÇÃO DE SERVIÇOS – ZAFIRA COMUNICAÇÃO');
    addSpace(5);

    addSectionTitle('IDENTIFICAÇÃO DAS PARTES');

    // CONTRATANTE
    const contratanteText = `CONTRATANTE: ${data.razaoSocial}, CNPJ: ${data.cnpj}, localizada na ${data.enderecoEmpresa}. CEP: ${data.cepEmpresa}. Cidade: ${data.cidadeEmpresa} Responsável que responde pela empresa:${data.responsavelNome} , ${data.responsavelEstadoCivil}, ${data.responsavelProfissao}, carteira de identidade nº ${data.responsavelRg},CPF. nº ${data.responsavelCpf}, domiciliado: ${data.responsavelEndereco},Cidade:${data.responsavelCidade}, no Estado de${data.responsavelEstado}.`;
    addText(contratanteText, 9, 'helvetica', 'normal', 'justify');

    // CONTRATADA
    const contratadaText = `CONTRATADA: ZAFIRA COMUNICAÇÃO E MARKETING, CNPJ: 28.077.026/0001-57. Responsável legal pela empresa: Gabriéli Dias da Silva, brasileira, solteira, jornalista, carteira de identidade nº 1.916.790, CPF nº 065.724.891-76, residente e domiciliado na Rua Ourinhos, 74  Bairro Vila Carvalho, Cep 79005270, Cidade e Estado Campo Grande/MS.`;
    addText(contratadaText, 9, 'helvetica', 'normal', 'justify');

    addText('As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas seguintes e pelas condições de preço, forma e termo de pagamento descritas no presente.', 9, 'helvetica', 'normal', 'justify');
    addSpace(3);

    addSectionTitle('DO OBJETO DO CONTRATO');
    addText(`Cláusula 1ª. É objeto do presente contrato a prestação do serviço de gerenciamento de redes sociais:`, 9, 'helvetica', 'normal', 'left');

    const servicesList = data.selectedServices.length > 0
        ? data.selectedServices.map((s) => {
            let text = s;
            if (s.includes("[QTD]")) {
                text = s.replace("[QTD]", data.serviceQuantities?.[s] || "X");
            }
            return `• ${text}`;
        }).join('\n')
        : "• Gestão de redes sociais";

    addText(servicesList, 9, 'helvetica', 'normal', 'left');

    addText(`utilizando mecanismos para alcançar mais pessoas e divulgar os serviços no período do dia ${data.dataInicio} a ${data.dataFim}`, 9, 'helvetica', 'normal', 'justify');
    addText(`§1º. O presente contrato tem validade de ${data.contractDuration} meses, podendo ser renovado por igual período sucessiva e automaticamente, conforme anuência das partes.`, 9, 'helvetica', 'normal', 'justify');

    addSpace(2);
    addSectionTitle('OBRIGAÇÕES DO CONTRATANTE');
    const clausesContratante = [
        "Cláusula 2ª. O CONTRATANTE deverá fornecer a CONTRATADA todas as informações necessárias à realização do serviço, devendo especificar os detalhes necessários à perfeita consecução do mesmo, e a forma de como ele deve ser entregue.",
        "Cláusula 3ª. O CONTRATANTE deverá efetuar o pagamento na forma e condições estabelecidas na cláusula 12ª.",
        "Cláusula 4ª. O CONTRATANTE deverá comunicar a CONTRATADA se precisar finalizar o serviço antes do prazo estabelecido no contrato com trinta dias de antecedência.",
        "Cláusula 5ª. Se responsabilizar única e exclusivamente, sem qualquer vinculação com a CONTRATADA, em relação às postagens que eventualmente produzir e publicar em suas redes sociais, uma vez que não fazem parte do objeto contratado com a CONTRATADA.",
        "Cláusula 6ª. Promover através de seu representante, o acompanhamento e fiscalizar, sustar, recusar, mandar desfazer ou refazer qualquer serviço que não esteja de acordo com a técnica atual, normas ou especificações que atendem ao objeto contratado, ficando certo que, em nenhuma hipótese, a falta de fiscalização do CONTRATANTE eximirá a CONTRATADA de suas responsabilidades provenientes do contrato."
    ];
    clausesContratante.forEach(clause => addText(clause, 9, 'helvetica', 'normal', 'justify'));

    addSpace(1);
    addSectionTitle('OBRIGAÇÕES DA CONTRATADA');
    const clausesContratada = [
        "Cláusula 7ª. É dever da CONTRATADA oferecer ao contratante a cópia do presente instrumento, contendo todas as especificidades da prestação de serviço contratada.",
        "Cláusula 8ª. Guardar sigilo de todas as informações que forem postas à sua disposição para a execução dos trabalhos, não podendo utilizar e/ou resguardar quaisquer informações recebidas, sob pena de responsabilizar-se por perdas e danos.",
        "Cláusula 9ª. Garantir a execução deste contrato por sua equipe de profissionais, sendo permitida a subcontratação por parte da CONTRATADA, sob sua exclusiva responsabilidade.",
        "Cláusula 10ª. A CONTRATADA deverá fornecer Nota Fiscal de Serviços, referente ao (s) pagamento (s) efetuado (s) pelo CONTRATANTE.",
        "Cláusula 11ª. Enviar para a CONTRATANTE todos os materiais produzidos do objetivo deste contrato finalizados."
    ];
    clausesContratada.forEach(clause => addText(clause, 9, 'helvetica', 'normal', 'justify'));

    addSpace(1);
    addSectionTitle('DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO');

    const valorTotal = data.valorTotal || "0,00";
    const valorTotalExtenso = data.valorTotalExtenso ? `(${data.valorTotalExtenso})` : "";
    const meses = data.quantidadeMesesPagamento || "4";
    const valorMensal = data.valorMensal || "0,00";
    const valorMensalExtenso = data.valorMensalExtenso ? `(${data.valorMensalExtenso})` : "";
    const diaPagamento = data.diaPagamento || "10";

    addText(`Cláusula 12ª. O presente serviço será remunerado pela quantia de R$${valorTotal} ${valorTotalExtenso} sendo dividido em ${meses}, totalizando mensalmente em R$${valorMensal} ${valorMensalExtenso} referente aos serviços efetivamente prestados conforme a Cláusula 1ª. O pagamento será realizado todo dia${diaPagamento} do mês. Devendo ser pago em dinheiro, pix ou outra forma de pagamento em que ocorra a prévia concordância de ambas as partes. E o valor combinado entre ambas as partes para o impulsionamento. Devendo ser pago em boleto bancário, pix ou cartão de crédito.`, 9, 'helvetica', 'normal', 'justify');
    addText("Cláusula 13ª. Em caso de inadimplemento das prestações avançadas acima incidirá sobre o valor devido, multa pecuniária de 2% e juros de mora de 5% ao mês mais correção monetária.", 9, 'helvetica', 'normal', 'justify');
    addText("Parágrafo único. Em caso de cobrança judicial, devem ser acrescidas custas processuais e 30% de honorários advocatícios.", 9, 'helvetica', 'normal', 'justify');

    addSpace(1);
    addSectionTitle('DAS CONDIÇÕES EM GERAIS');
    const clausesGerais = [
        "Cláusula 14ª. No caso de não haver o cumprimento de qualquer uma das cláusulas do presente instrumento, a parte que não cumpriu deverá pagar uma multa de 30% do valor total do contrato para a outra parte.",
        "Cláusula 15ª. Salvo com a expressa autorização do CONTRATANTE, não pode a CONTRATADA transferir ou subcontratar os serviços previstos neste instrumento, sob o risco de ocorrer a rescisão imediata.",
        "Cláusula 16ª. Todos os serviços extraordinários, ou seja, aqueles não previstos no objeto deste contrato e que forem necessários ou solicitados pela CONTRATANTE, serão cobrados à parte, com preços previamente convencionados.",
        "Cláusulas 17ª. Todos os documentos produzidos pela CONTRATADA passarão a ser de propriedade da CONTRATANTE, podendo ser utilizados, a qualquer tempo, para qualquer finalidade, sem necessidade de autorização prévia ou posterior da CONTRATADA."
    ];
    clausesGerais.forEach(clause => addText(clause, 9, 'helvetica', 'normal', 'justify'));

    addSectionTitle('DO FORO');
    addText("Cláusula 18ª. Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da comarca de Campo Grande/MS.", 9, 'helvetica', 'normal', 'justify');

    addSpace(2);
    addText(`Campo Grande, ${data.dataAssinatura}`, 10, 'helvetica', 'normal', 'left');

    addSpace(15);

    // Signatures
    if (cursorY > pageHeight - 60) {
        addFooter();
        doc.addPage();
        addHeaderRepeated();
        cursorY = 40;
    }

    const sigY = cursorY + 10;

    // Contratada (Zafira) - Left
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, sigY, margin + 70, sigY);
    doc.setFont('helvetica', 'normal');
    doc.text('Gabriéli Dias da Silva', margin, sigY + 5);
    doc.setFontSize(8);
    doc.text('ZAFIRA COMUNICAÇÃO', margin, sigY + 10);

    if (contractorSignature) {
        try {
            // Preload image
            const imgEl = await loadImage(contractorSignature);

            // Fix Color: FORCE BLACK AND BOLD
            const correctedSignature = ensureImageIsBlack(imgEl);

            doc.addImage(correctedSignature, 'PNG', margin + 5, sigY - 25, 40, 20);

        } catch (e) {
            console.error("Error adding contractor signature", e);
        }
    }

    // Contratante - Right
    const rightX = pageWidth - margin - 70;
    doc.line(rightX, sigY, rightX + 70, sigY);
    doc.setFontSize(10);
    doc.text(data.responsavelNome || "CONTRATANTE", rightX, sigY + 5);
    doc.setFontSize(8);
    doc.text(data.razaoSocial || "EMPRESA", rightX, sigY + 10);

    if (clientSignature) {
        try {
            doc.addImage(clientSignature, 'PNG', rightX + 5, sigY - 25, 40, 20);
        } catch (e) {
            console.error("Error adding client signature", e);
        }
    }

    // Footer on last page
    addFooter();


    // --- FINAL PAGE: AUDIT LOG (Log de Auditoria) ---
    if (includeAuditLog) {
        doc.addPage();

        // Generate simple hash (simulation for client-side purely for unique ID representation)
        const generateHash = (str: string) => {
            let hash = 0;
            if (str.length === 0) return hash.toString();
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(16) + 'x' + Date.now().toString(16);
        };

        // Create a fingerprint from key contract data + signatures
        const fingerprintSource = JSON.stringify({
            id: data.id,
            razao: data.razaoSocial,
            cnpj: data.cnpj,
            created: new Date().toISOString()
        }) + (clientSignature || '') + (contractorSignature || '');

        const docHash = generateHash(fingerprintSource);
        const docId = data.id || `LOC-${Date.now().toString(36).toUpperCase()}`;

        // Header for Audit Page
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("LOG DE AUDITORIA E ASSINATURA ELETRÔNICA", 105, 20, { align: "center" });

        doc.setDrawColor(128, 0, 128); // Purple line
        doc.setLineWidth(0.5);
        doc.line(20, 25, 190, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        // doc.text(`Identificador do Documento: ${docId}`, 20, 35);

        let currentY = 55;

        // Helper for Audit Sections
        const addAuditSection = (title: string, items: { label: string, value: string }[]) => {
            doc.setFillColor(245, 245, 245); // Light gray bg
            doc.rect(20, currentY, 170, 8 + (items.length * 6), 'F');

            doc.setFont('helvetica', 'bold');
            doc.text(title, 25, currentY + 6);

            doc.setFont('helvetica', 'normal');
            items.forEach((item, index) => {
                const y = currentY + 12 + (index * 6);
                doc.text(`${item.label}:`, 25, y);
                doc.setFont('helvetica', 'bold');
                doc.text(item.value, 60, y);
                doc.setFont('helvetica', 'normal');
            });

            currentY += 20 + (items.length * 6);
        };

        // 1. Signatory Data
        addAuditSection("DADOS DO SIGNATÁRIO (CONTRATANTE)", [
            { label: "Nome", value: data.responsavelNome },
            { label: "CPF", value: data.responsavelCpf },
            { label: "Email", value: data.email || "Não informado no cadastro / Presencial" },
            { label: "Empresa", value: data.razaoSocial }
        ]);

        // 2. Technical Evidence
        addAuditSection("EVIDÊNCIAS TÉCNICAS E RASTREABILIDADE", [
            { label: "ID do Documento", value: docId },
            { label: "Hash Assinatura (Simulado)", value: docHash.substring(0, 32).toUpperCase() },
            { label: "Endereço IP", value: data.ipAddress || "Não registrado (Assinatura Local)" },
            { label: "Data/Hora (UTC)", value: data.signedAt ? new Date(data.signedAt.seconds ? data.signedAt.seconds * 1000 : data.signedAt).toUTCString() : new Date().toUTCString() },
            { label: "Data/Hora (Brasília)", value: data.signedAt ? new Date(data.signedAt.seconds ? data.signedAt.seconds * 1000 : data.signedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : new Date().toLocaleString('pt-BR') },
            { label: "User Agent", value: data.userAgent ? data.userAgent.substring(0, 50) + "..." : "Não registrado" }
        ]);

        // 3. Legal Declaration
        doc.setFont('helvetica', 'bold');
        doc.text("DECLARAÇÃO DE ACEITE E VALIDADE JURÍDICA", 20, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        const legalParagraph1 = "O signatário declara que leu e aceitou integralmente os Termos e Condições de Uso, a Política de Privacidade e o Termo de Aceite de Assinatura Eletrônica da plataforma Zafira.";
        const legalParagraph2 = "A assinatura eletrônica aposta neste documento representa a livre manifestação de vontade das partes, realizada por meio eletrônico, sendo juridicamente válida para fins de contratos de natureza privada, nos termos do ordenamento jurídico brasileiro.";
        const legalParagraph3 = "As evidências técnicas registradas neste Log de Auditoria reforçam a autenticidade, a integridade e a rastreabilidade do ato de assinatura, sem prejuízo de outros meios de comprovação admitidos em direito, conforme a legislação brasileira.";

        const textLines = doc.splitTextToSize(`${legalParagraph1}\n\n${legalParagraph2}\n\n${legalParagraph3}`, 170);
        doc.text(textLines, 20, currentY);

        currentY += 20;

        // 4. Hash/Signature Visual
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("REPRESENTAÇÃO VISUAL DA ASSINATURA", 20, currentY);
        currentY += 5;
        if (clientSignature) {
            doc.addImage(clientSignature, 'PNG', 20, currentY, 60, 30);
        } else {
            doc.text("[Assinatura Digital Pendente]", 20, currentY + 10);
        }

        currentY += 40;

        // Footer Logic (Repeated or Helper)
        doc.setDrawColor(128, 0, 128); // Purple
        doc.setLineWidth(0.5);
        doc.line(20, 280, 190, 280);
        doc.setFontSize(8);
        doc.setTextColor(128, 0, 128);
        doc.text("DOCUMENTO ASSINADO ELETRONICAMENTE E AUDITADO POR ZAFIRA HUB", 105, 285, { align: "center" });
    }

    // Save or Return
    if (returnBlob) {
        return doc.output('blob');
    }
    doc.save(`Contrato_Zafira_${data.razaoSocial.replace(/\s+/g, '_')}.pdf`);
};
