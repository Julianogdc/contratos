import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Link as LinkIcon, Save, FileText, CheckCircle, Clock, Download, AlertTriangle, Info, X, Trash2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { ContractForm } from '../components/ContractForm';
import { SignatureUpload } from '../components/SignatureUpload';
import type { ContractData } from '../types';
import zafiraSignature from '../assets/zafira-signature.png';
import zafiraLogo from '../assets/zafira-logo.png';
import { generateContractPDF } from '../utils/generatePDF';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc } from 'firebase/firestore';

export function AdminDashboard() {
    const [clientSignature, setClientSignature] = useState<string | null>(null);
    const [showSignatures, setShowSignatures] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [contracts, setContracts] = useState<any[]>([]);

    // Custom Notification State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', visible: boolean }>({
        message: '',
        type: 'info',
        visible: false
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
    };

    useEffect(() => {
        const fetchContracts = async () => {
            try {
                const q = query(collection(db, "contracts"), orderBy("createdAt", "desc"), limit(20));
                const querySnapshot = await getDocs(q);
                const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setContracts(docs);
            } catch (error) {
                console.error("Error fetching contracts:", error);
                showToast("Erro ao carregar contratos recentes.", 'error');
            }
        };
        fetchContracts();
    }, [generatedLink]); // Refresh when new link is created

    const handleGeneratePDF = (data: ContractData) => {
        // Generate PDF locally
        generateContractPDF(data, zafiraSignature, clientSignature, zafiraLogo, false);
        showToast("PDF gerado com sucesso!", 'success');
    };

    const handleDownloadSigned = (contract: any) => {
        if (contract.clientSignature) {
            // Re-generate PDF with the stored signature
            generateContractPDF(contract as ContractData, zafiraSignature, contract.clientSignature, zafiraLogo);
            showToast("Download iniciado!", 'success');
        } else {
            showToast("Assinatura do cliente não encontrada.", 'error');
        }
    };

    const handleCreateLink = async (data: ContractData) => {
        setLoading(true);
        try {
            // Save to Firestore
            const accessKey = crypto.randomUUID();
            await addDoc(collection(db, "contracts"), {
                ...data,
                createdAt: new Date(),
                status: "pending",
                clientSignature: null,
                accessKey: accessKey
            });

            const link = `${window.location.origin}/c/${accessKey}`;
            setGeneratedLink(link);
            showToast("Link gerado e contrato salvo!", 'success');
        } catch (e) {
            console.error("Error adding document: ", e);
            showToast("Erro ao gerar link! Verifique o console.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResetData = async () => {
        if (!confirm("Tem certeza que deseja APAGAR TODOS os contratos e zerar os dados salvos? Essa ação não pode ser desfeita.")) return;

        setLoading(true);
        try {
            // 1. Delete all contracts from Firestore (Client-side batching)
            // Note: Batch limit is 500. Assuming test data is small.
            const querySnapshot = await getDocs(collection(db, "contracts"));
            const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            // 2. Clear LocalStorage
            localStorage.clear();

            setContracts([]);
            setGeneratedLink(null);
            showToast("Sistema zerado com sucesso!", 'success');
        } catch (error) {
            console.error("Error resetting data:", error);
            showToast("Erro ao zerar dados.", 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            {/* TOAST NOTIFICATION */}
            {toast.visible && (
                <div className="fixed top-6 right-6 z-[100] animate-slide-in-right">
                    <div className={`
                        flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl backdrop-blur-md border border-white/10
                        ${toast.type === 'success' ? 'bg-green-900/80 text-green-100' : ''}
                        ${toast.type === 'error' ? 'bg-red-900/80 text-red-100' : ''}
                        ${toast.type === 'info' ? 'bg-gray-900/80 text-white' : ''}
                    `}>
                        {toast.type === 'success' && <CheckCircle className="text-green-400" size={24} />}
                        {toast.type === 'error' && <AlertTriangle className="text-red-400" size={24} />}
                        {toast.type === 'info' && <Info className="text-blue-400" size={24} />}
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">
                                {toast.type === 'success' ? 'Sucesso' : toast.type === 'error' ? 'Atenção' : 'Informação'}
                            </span>
                            <span className="text-xs opacity-90">{toast.message}</span>
                        </div>
                        <button onClick={() => setToast(prev => ({ ...prev, visible: false }))} className="ml-2 opacity-50 hover:opacity-100">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col items-center gap-10 pb-20">

                {/* Action Header */}
                <div className="w-full max-w-4xl flex justify-between items-center mb-[-20px] z-10">
                    <h2 className="text-xl font-bold text-white">Novo Contrato</h2>
                </div>

                {/* Glowing Border Container containing the Form */}
                <div className="relative group max-w-4xl w-full p-[2px] overflow-hidden rounded-xl">
                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_300deg,#ae7eff_360deg)] animate-border-spin"></div>
                    <div className="relative bg-zafira-background rounded-[10px] h-full">
                        <ContractForm
                            onGenerate={handleGeneratePDF}
                            extraButtons={(data) => (
                                <button
                                    type="button"
                                    onClick={() => handleCreateLink(data)}
                                    disabled={loading}
                                    className="flex-1 bg-zafira-purple hover:bg-zafira-purple/90 text-white font-bold py-3 px-6 rounded-lg transition-all transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-zafira-purple/50 flex items-center justify-center gap-2"
                                >
                                    {loading ? 'Salvando...' : (
                                        <>
                                            <Save size={20} />
                                            Salvar e Gerar Link
                                        </>
                                    )}
                                </button>
                            )}
                        />
                    </div>
                </div>

                {generatedLink && (
                    <div className="max-w-4xl w-full bg-emerald-500/10 border border-emerald-500/50 px-6 py-4 rounded-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-2 rounded-full">
                                <LinkIcon size={20} className="text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="text-emerald-400 font-bold text-sm">Contrato Criado com Sucesso!</h4>
                                <p className="text-emerald-400/70 text-xs">Envie este link para seu cliente assinar.</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <input
                                readOnly
                                value={generatedLink}
                                className="bg-black/30 border border-emerald-500/30 rounded px-3 py-2 text-xs text-white/80 font-mono w-64 focus:outline-none"
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(generatedLink);
                                    showToast("Link copiado para a área de transferência!", 'success');
                                }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded text-xs transition-colors"
                            >
                                Copiar
                            </button>
                        </div>
                    </div>
                )}

                {/* Contracts List Section */}
                <div className="max-w-4xl w-full mt-8">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <FileText className="text-zafira-purple" />
                        Contratos Recentes
                    </h3>

                    <div className="bg-zafira-surface rounded-xl border border-zafira-muted/20 overflow-hidden">
                        {contracts.length === 0 ? (
                            <div className="p-8 text-center text-zafira-muted">
                                Nenhum contrato gerado ainda.
                            </div>
                        ) : (
                            <div className="divide-y divide-zafira-muted/10">
                                {contracts.map((contract) => (
                                    <div key={contract.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium text-white">{contract.razaoSocial}</span>
                                            <span className="text-xs text-zafira-muted flex items-center gap-2">
                                                {contract.createdAt?.seconds ? new Date(contract.createdAt.seconds * 1000).toLocaleDateString() : 'data desconhecida'}
                                                •
                                                {contract.status === 'signed' ? (
                                                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle size={10} /> Assinado</span>
                                                ) : (
                                                    <span className="text-amber-400 flex items-center gap-1"><Clock size={10} /> Pendente</span>
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    const linkId = contract.accessKey || contract.id;
                                                    navigator.clipboard.writeText(`${window.location.origin}/c/${linkId}`);
                                                    showToast("Link copiado!", 'info');
                                                }}
                                                className="p-2 hover:bg-white/10 rounded-lg text-zafira-muted hover:text-white transition-colors"
                                                title="Copiar Link"
                                            >
                                                <LinkIcon size={16} />
                                            </button>
                                            {contract.status === 'signed' && (
                                                <button
                                                    onClick={() => handleDownloadSigned(contract)}
                                                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-colors"
                                                    title="Baixar PDF Assinado"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Section: Signatures & Instructions */}
                <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="bg-zafira-surface rounded-xl border border-zafira-muted/20 overflow-hidden h-fit">
                        <button
                            onClick={() => setShowSignatures(!showSignatures)}
                            className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                        >
                            <h3 className="text-lg font-semibold text-white">Configurar Assinaturas</h3>
                            {showSignatures ? <ChevronUp className="text-zafira-muted" /> : <ChevronDown className="text-zafira-muted" />}
                        </button>

                        {showSignatures && (
                            <div className="p-6 border-t border-zafira-muted/20 space-y-6">
                                <div>
                                    <p className="text-sm font-medium text-zafira-muted mb-2">Contratada (Zafira)</p>
                                    <div className="p-4 bg-white/5 rounded-lg border border-zafira-muted/20 flex justify-center">
                                        <img src={zafiraSignature} alt="Zafira Signature" className="h-16 object-contain filter invert" />
                                    </div>
                                </div>

                                <SignatureUpload
                                    label="Assinatura do Contratante (Opcional para PDF Local)"
                                    onChange={setClientSignature}
                                />
                            </div>
                        )}
                    </div>

                    <div className="bg-zafira-surface rounded-xl border border-zafira-muted/20 overflow-hidden h-fit">
                        <button
                            onClick={() => setShowInstructions(!showInstructions)}
                            className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                        >
                            <h3 className="text-lg font-semibold text-white">Instruções</h3>
                            {showInstructions ? <ChevronUp className="text-zafira-muted" /> : <ChevronDown className="text-zafira-muted" />}
                        </button>

                        {showInstructions && (
                            <div className="p-6 border-t border-zafira-muted/20">
                                <ul className="list-disc list-inside text-sm text-zafira-muted space-y-2">
                                    <li>Preencha todos os campos obrigatórios.</li>
                                    <li>Clique em "Gerar PDF" para baixar o contrato localmente.</li>
                                    <li>Clique em "Salvar e Gerar Link" para criar um link para o cliente assinar online.</li>
                                    <li>O link gerado aparecerá logo acima do contrato.</li>
                                    <li>Acompanhe os contratos assinados na lista abaixo.</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="max-w-4xl w-full flex justify-center mt-12 mb-4 opacity-50 hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleResetData}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/5 hover:bg-red-500/10 text-red-400/60 hover:text-red-400 text-xs font-medium rounded-lg border border-red-500/10 hover:border-red-500/30 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] group"
                    >
                        <Trash2 size={14} className="group-hover:animate-pulse" />
                        Zerar Sistema e Limpar Banco de Dados
                    </button>
                </div>

                {/* Footer */}
                <div className="flex flex-col items-center justify-center mt-8 gap-3 opacity-40 hover:opacity-100 transition-all duration-300 pb-8">
                    <img src={zafiraLogo} alt="Zafira Comunicação" className="h-5 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
                    <p className="text-zafira-muted/60 text-[10px] tracking-wider uppercase">
                        Desenvolvido por <strong className="text-zafira-purple hover:text-zafira-highlight transition-colors">Zafira Comunicação & Marketing</strong>
                    </p>
                </div>

            </div>
        </Layout>
    );
}
