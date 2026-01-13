import React, { useState } from 'react';
import { initialContractData, AVAILABLE_SERVICES } from '../types';
import type { ContractData } from '../types';

interface ContractFormProps {
    onGenerate: (data: ContractData) => void;
    extraButtons?: (data: ContractData) => React.ReactNode;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-lg font-semibold text-zafira-highlight mt-6 mb-4 border-b border-zafira-muted/20 pb-2">
        {children}
    </h3>
);

interface InputGroupProps {
    label: string;
    name: string;
    type?: string;
    placeholder?: string;
    width?: "full" | "half";
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputGroup = ({ label, name, type = "text", placeholder = "", width = "full", value, onChange }: InputGroupProps) => (
    <div className={`${width === 'half' ? 'col-span-1' : 'col-span-2'}`}>
        <label htmlFor={name} className="block text-sm font-medium text-zafira-muted mb-1">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-zafira-surface border border-zafira-muted/50 rounded-md px-3 py-2 text-zafira-text focus:outline-none focus:border-zafira-highlight focus:ring-1 focus:ring-zafira-highlight transition-colors placeholder-zafira-muted/30"
        />
    </div>
);

export const ContractForm: React.FC<ContractFormProps> = ({ onGenerate, extraButtons }) => {
    const [formData, setFormData] = useState<ContractData>(initialContractData);

    // State for services list (default + custom) - FIXED INSERTION
    const [services, setServices] = useState<string[]>(() => {
        const saved = localStorage.getItem('contract_custom_services');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge saved custom services with current available services to ensure defaults are always there
                return [...new Set([...AVAILABLE_SERVICES, ...parsed])];
            } catch (e) {
                console.error("Failed to parse saved services", e);
                return AVAILABLE_SERVICES;
            }
        }
        return AVAILABLE_SERVICES;
    });

    const [newService, setNewService] = useState('');

    const handleAddService = () => {
        if (!newService.trim()) return;
        setServices(prev => {
            const updated = [...prev, newService.trim()];
            const customOnly = updated.filter(s => !AVAILABLE_SERVICES.includes(s));
            localStorage.setItem('contract_custom_services', JSON.stringify(customOnly));
            return updated;
        });
        setNewService('');
    };

    const handleDeleteService = (serviceToDelete: string) => {
        setServices(prev => {
            const updated = prev.filter(s => s !== serviceToDelete);
            const customOnly = updated.filter(s => !AVAILABLE_SERVICES.includes(s));
            localStorage.setItem('contract_custom_services', JSON.stringify(customOnly));

            if (formData.selectedServices.includes(serviceToDelete)) {
                setFormData(fd => ({
                    ...fd,
                    selectedServices: fd.selectedServices.filter(s => s !== serviceToDelete)
                }));
            }
            return updated;
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleQuantityChange = (service: string, qty: string) => {
        setFormData(prev => ({
            ...prev,
            serviceQuantities: {
                ...prev.serviceQuantities,
                [service]: qty
            }
        }));
    };

    const handleServiceToggle = (service: string) => {
        setFormData(prev => {
            const isSelected = prev.selectedServices.includes(service);
            if (isSelected) {
                return { ...prev, selectedServices: prev.selectedServices.filter(s => s !== service) };
            } else {
                return { ...prev, selectedServices: [...prev.selectedServices, service] };
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(formData);
    };



    return (
        <form onSubmit={handleSubmit} className="bg-zafira-surface/50 p-6 rounded-xl border border-zafira-muted/20 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-2">Dados do Contrato</h2>
            <p className="text-sm text-zafira-muted mb-6">Preencha as informações para gerar o documento.</p>

            <SectionTitle>Identificação da Empresa (Contratante)</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Razão Social / Nome Fantasia" name="razaoSocial" value={formData.razaoSocial} onChange={handleChange} placeholder="Empresa do Contratante" />
                <InputGroup label="CNPJ" name="cnpj" value={formData.cnpj} onChange={handleChange} placeholder="00.000.000/0001-00" width="half" />
                <InputGroup label="Endereço (Rua, Nº)" name="enderecoEmpresa" value={formData.enderecoEmpresa} onChange={handleChange} width="half" />
                <InputGroup label="CEP" name="cepEmpresa" value={formData.cepEmpresa} onChange={handleChange} placeholder="00000-000" width="half" />
                <InputGroup label="Cidade/UF" name="cidadeEmpresa" value={formData.cidadeEmpresa} onChange={handleChange} placeholder="Campo Grande" width="half" />
            </div>

            <SectionTitle>Representante Legal</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Nome Completo" name="responsavelNome" value={formData.responsavelNome} onChange={handleChange} placeholder="Seu nome" />
                <InputGroup label="Estado Civil" name="responsavelEstadoCivil" value={formData.responsavelEstadoCivil} onChange={handleChange} width="half" />
                <InputGroup label="Profissão" name="responsavelProfissao" value={formData.responsavelProfissao} onChange={handleChange} width="half" />
                <InputGroup label="RG" name="responsavelRg" value={formData.responsavelRg} onChange={handleChange} width="half" />
                <InputGroup label="CPF" name="responsavelCpf" value={formData.responsavelCpf} onChange={handleChange} width="half" />
                <InputGroup label="Endereço Residencial (Rua, nº, Bairro)" name="responsavelEndereco" value={formData.responsavelEndereco} onChange={handleChange} />
                <InputGroup label="Cidade" name="responsavelCidade" value={formData.responsavelCidade} onChange={handleChange} width="half" />
                <InputGroup label="Estado (UF)" name="responsavelEstado" value={formData.responsavelEstado} onChange={handleChange} placeholder="MS" width="half" />
            </div>

            <SectionTitle>Detalhes do Contrato</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Data Início" name="dataInicio" value={formData.dataInicio} onChange={handleChange} placeholder="14 de outubro de 2025" width="half" />
                <InputGroup label="Data Fim" name="dataFim" value={formData.dataFim} onChange={handleChange} placeholder="14 de maio de 2026" width="half" />
                <InputGroup label="Duração (Meses de Validade)" name="contractDuration" value={formData.contractDuration} onChange={handleChange} placeholder="ex: 4" width="half" />
                <InputGroup label="Divisão Pagamento (Meses)" name="quantidadeMesesPagamento" value={formData.quantidadeMesesPagamento} onChange={handleChange} placeholder="ex: 4" width="half" />

                <InputGroup label="Valor Total (R$)" name="valorTotal" value={formData.valorTotal} onChange={handleChange} placeholder="7.800" width="half" />
                <InputGroup label="Valor Total (Por Extenso)" name="valorTotalExtenso" value={formData.valorTotalExtenso} onChange={handleChange} placeholder="sete mil e oitocentos reais" width="half" />

                <InputGroup label="Valor Mensal (R$)" name="valorMensal" value={formData.valorMensal} onChange={handleChange} placeholder="1.300" width="half" />
                <InputGroup label="Valor Mensal (Por Extenso)" name="valorMensalExtenso" value={formData.valorMensalExtenso} onChange={handleChange} placeholder="mil e trezentos reais" width="half" />

                <InputGroup label="Dia do Pagamento" name="diaPagamento" value={formData.diaPagamento} onChange={handleChange} placeholder="10" width="half" />
            </div>

            <SectionTitle>Serviços Contratados (Objeto do Contrato)</SectionTitle>
            <div className="bg-zafira-background/50 p-4 rounded-lg border border-zafira-muted/20 space-y-3">
                <p className="text-sm text-zafira-muted mb-2">Selecione os serviços que aparecerão na Cláusula 1ª:</p>
                {services.map((service, index) => {
                    if (service.includes("[QTD]")) {
                        const parts = service.split("[QTD]");
                        return (
                            <label key={index} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        className="peer h-4 w-4 bg-zafira-surface border-zafira-muted rounded focus:ring-zafira-highlight text-zafira-highlight transition-all cursor-pointer appearance-none checked:bg-zafira-highlight checked:border-zafira-highlight"
                                        checked={formData.selectedServices.includes(service)}
                                        onChange={() => handleServiceToggle(service)}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center text-white pointer-events-none opacity-0 peer-checked:opacity-100 scale-50 peer-checked:scale-100 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                                <span className="text-sm text-zafira-text group-hover:text-white transition-colors flex items-center gap-1 flex-wrap">
                                    {parts[0]}
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        name={`qty-${index}`}
                                        value={formData.serviceQuantities[service] || ''}
                                        onChange={(e) => handleQuantityChange(service, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="0"
                                        className="w-12 h-6 bg-zafira-surface border border-zafira-muted/50 rounded px-1 text-center text-xs focus:border-zafira-highlight focus:outline-none z-10"
                                    />
                                    {parts[1]}
                                </span>
                                {!AVAILABLE_SERVICES.includes(service) && (
                                    <button
                                        onClick={(e) => { e.preventDefault(); handleDeleteService(service); }}
                                        className="absolute right-2 text-zafira-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remover serviço"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </label>
                        );
                    }

                    return (
                        <div key={index} className="flex flex-col">
                            <label className="flex items-start gap-3 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors group">
                                <div className="relative flex items-center mt-0.5">
                                    <input
                                        type="checkbox"
                                        className="peer h-4 w-4 bg-zafira-surface border-zafira-muted rounded focus:ring-zafira-highlight text-zafira-highlight transition-all cursor-pointer appearance-none checked:bg-zafira-highlight checked:border-zafira-highlight"
                                        checked={formData.selectedServices.includes(service)}
                                        onChange={() => handleServiceToggle(service)}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center text-white pointer-events-none opacity-0 peer-checked:opacity-100 scale-50 peer-checked:scale-100 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                                <span className="text-sm text-zafira-text group-hover:text-white transition-colors">{service}</span>
                                {!AVAILABLE_SERVICES.includes(service) && (
                                    <button
                                        onClick={(e) => { e.preventDefault(); handleDeleteService(service); }}
                                        className="absolute right-2 text-zafira-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remover serviço"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </label>
                        </div>
                    );
                })}
            </div>

            {/* Add New Service Input */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-zafira-muted/20">
                <input
                    type="text"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    placeholder="Adicionar novo serviço (use [QTD] para quantidade variável)"
                    className="flex-1 bg-zafira-background/50 border border-zafira-muted/30 rounded px-3 py-2 text-sm text-zafira-text focus:outline-none focus:border-zafira-highlight"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddService())}
                />
                <button
                    type="button"
                    onClick={handleAddService}
                    disabled={!newService.trim()}
                    className="bg-zafira-surface hover:bg-zafira-highlight/20 text-zafira-highlight border border-zafira-highlight/30 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                    Adicionar
                </button>
            </div>

            <SectionTitle>Finalização</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Cidade" name="cidadeAssinatura" value={formData.cidadeAssinatura} onChange={handleChange} width="half" />
                <InputGroup label="Data por Extenso" name="dataAssinatura" value={formData.dataAssinatura} onChange={handleChange} width="half" />
            </div>

            <div className="mt-8 flex gap-4">
                {extraButtons && extraButtons(formData)}
                <button
                    type="submit"
                    className="flex-1 bg-zafira-highlight hover:bg-zafira-highlight/90 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg hover:shadow-zafira-highlight/20 flex items-center justify-center gap-2"
                >
                    Visualizar e Gerar PDF
                </button>
            </div>
        </form>
    );
};
