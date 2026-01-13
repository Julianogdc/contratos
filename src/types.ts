export interface ContractData {
    // Contratante (Empresa)
    razaoSocial: string;
    cnpj: string;
    enderecoEmpresa: string;
    cepEmpresa: string;
    cidadeEmpresa: string;

    // Responsável
    responsavelNome: string;
    responsavelEstadoCivil: string;
    responsavelProfissao: string;
    responsavelRg: string;
    responsavelCpf: string;
    responsavelEndereco: string;
    responsavelCidade: string;
    responsavelEstado: string;

    // Contrato
    dataInicio: string; // ou Date
    dataFim: string;
    valorTotal: string;
    valorMensal: string;
    diaPagamento: string;
    cidadeAssinatura: string;
    dataAssinatura: string;

    contractDuration: string; // e.g., "4 meses (quatro meses)" - Validade
    quantidadeMesesPagamento: string; // e.g., "4" (para divisão do pagamento)

    // Detalhes Financeiros Extensos
    valorTotalExtenso: string;
    valorMensalExtenso: string;

    selectedServices: string[];
    serviceQuantities: Record<string, string>; // Map service name to quantity

    // Legal / Audit Data
    id?: string;
    email?: string;
    clientSignature?: string;
    ipAddress?: string;
    userAgent?: string;
    termsAccepted?: boolean;
    signedAt?: any; // Timestamp or Date
    status?: 'pending' | 'signed' | 'loading';
}
//AQUI ESCREVER OS SERVIÇOS//
export const AVAILABLE_SERVICES = [
    "Criação de [QTD] postagens semanais, com inclusão de textos e legendas nas artes",
    "Desenvolvimento e publicação de stories, incluindo assessoria para sua elaboração",
    "Gerenciamento dos impulsionamentos patrocinados",
    "Elaboração de planejamento estratégico com [QTD] conteúdos mensais, acompanhado de cronograma e apresentação dos conteúdos",
    "Produção de roteiro para reels",
    "Edição de vídeo simples",
    "Elaboração de relatório mensal de investimento e desempenho, com análise de melhorias e sugestões"
];

export const initialContractData: ContractData = {
    razaoSocial: '',
    cnpj: '',
    enderecoEmpresa: '',
    cepEmpresa: '',
    cidadeEmpresa: '',
    responsavelNome: '',
    responsavelEstadoCivil: '',
    responsavelProfissao: '',
    responsavelRg: '',
    responsavelCpf: '',
    responsavelEndereco: '',
    responsavelCidade: '',
    responsavelEstado: '',
    dataInicio: '',
    dataFim: '',
    contractDuration: '4', // Default to number for validation
    quantidadeMesesPagamento: '4',
    valorTotal: '',
    valorTotalExtenso: '',
    valorMensal: '',
    valorMensalExtenso: '',
    diaPagamento: '',
    cidadeAssinatura: 'Campo Grande/MS',
    dataAssinatura: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
    selectedServices: [],
    serviceQuantities: {} // Initialize empty map
};

