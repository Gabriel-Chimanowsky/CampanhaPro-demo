export interface CampaignDetails {
    nomeCompleto: string;
    nomeUrna?: string;
    numero?: string;
    partido?: string;
    cnpj: string;
    cpf: string;
    identidade: string;
    dataNascimento: string;
    estadoCivil: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep: string;
    orcamento: number;
    candidatePhotoUrl?: string;
    candidateVisualFeatures?: string;
    cachedCandidateDescription?: string;
}

export type AdvisorTipType = 'success' | 'warning' | 'info' | 'sparkles' | 'error';

export interface AdvisorTip {
    type: AdvisorTipType;
    title: string;
    message: string;
}
