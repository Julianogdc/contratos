import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ContractData } from '../types';
import SignatureCanvas from 'react-signature-canvas';
import { generateContractPDF } from '../utils/generatePDF';
// Removed generateContractPDF as it is no longer used here.
import zafiraSignature from '../assets/zafira-signature.png';
import zafiraLogo from '../assets/zafira-logo.png';
import { ShieldCheck, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export function ClientContractView() {
    const { id } = useParams();
    const [contract, setContract] = useState<ContractData | null>(null);
    const [status, setStatus] = useState<'loading' | 'pending' | 'signed'>('loading');
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const sigCanvas = useRef<SignatureCanvas>(null);

    const [resolvedId, setResolvedId] = useState<string | null>(null);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [emailSent, setEmailSent] = useState(false);

    // Legal & Compliance State
    const [ipAddress, setIpAddress] = useState<string>('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [isSigning, setIsSigning] = useState(false);

    // Modals
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

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
        // Capture IP for Audit Log
        fetch('https://api.ipify.org?format=json')
            .then(response => response.json())
            .then(data => setIpAddress(data.ip))
            .catch(err => console.error("Could not fetch IP", err));

        if (!id) return;

        const fetchContract = async () => {
            try {
                let data: ContractData | null = null;
                let finalId = id;

                // 1. Try finding by Access Key
                const q = query(collection(db, "contracts"), where("accessKey", "==", id));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    data = doc.data() as ContractData;
                    finalId = doc.id;
                } else {
                    // 2. Fallback to direct ID
                    const docRef = doc(db, "contracts", id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        data = docSnap.data() as ContractData;
                    }
                }

                if (data) {
                    setContract(data);
                    setResolvedId(finalId);
                    setStatus((data.status as any) || 'pending');
                    if (data.clientSignature) setSignatureData(data.clientSignature);
                    if (data.email) setRecipientEmail(data.email);
                } else {
                    showToast("Contrato não encontrado!", 'error');
                }
            } catch (e) {
                console.error("Error fetching contract:", e);
                showToast("Erro ao carregar o contrato. Tente novamente.", 'error');
            } finally {
                if (status === 'loading') setStatus('pending');
            }
        };
        fetchContract();
    }, [id]);

    const handleClear = () => {
        sigCanvas.current?.clear();
    };

    const handleSign = async () => {
        // console.log("handleSign initiated");

        if (!termsAccepted) {
            showToast("⚠️ Por favor, leia e aceite os Termos e Condições para continuar.", 'error');
            return;
        }

        try {
            if (!sigCanvas.current) {
                showToast("Erro: Componente de assinatura não carregou. Tente recarregar a página.", 'error');
                return;
            }

            if (sigCanvas.current.isEmpty()) {
                showToast("✍️ Por favor, faça sua assinatura no quadro antes de confirmar.", 'error');
                return;
            }

            // CRASH FIX: Using getCanvas() instead of getTrimmedCanvas() to avoid trim-canvas dependency issues
            const canvas = sigCanvas.current.getCanvas();
            if (!canvas) {
                showToast("Erro ao capturar assinatura.", 'error');
                return;
            }
            const signature = canvas.toDataURL('image/png');

            if (!resolvedId) {
                showToast("Erro interno: ID do contrato não encontrado.", 'error');
                return;
            }

            setIsSigning(true);

            const docRef = doc(db, "contracts", resolvedId);

            // Saving Legal Metadata
            await updateDoc(docRef, {
                status: 'signed',
                clientSignature: signature,
                signedAt: new Date(),
                ipAddress: ipAddress,
                userAgent: navigator.userAgent,
                termsAccepted: true
            });

            setSignatureData(signature);
            setStatus('signed');
            showToast("✅ Assinatura salva com sucesso! Log de auditoria gerado.", 'success');

        } catch (e: any) {
            console.error("Critical Error in handleSign:", e);
            showToast(`Ocorreu um erro ao assinar: ${e.message}`, 'error');
        } finally {
            setIsSigning(false);
        }
    };

    if (!contract) return <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">Carregando contrato...</div>;

    return (
        <div className="min-h-screen bg-[#09090b] py-8 px-4 font-[Helvetica,Arial,sans-serif] relative overflow-hidden">

            {/* Background Decoration */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]"></div>
            </div>

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

            {/* Paper Container */}
            <div className="max-w-[210mm] mx-auto bg-[#fafafa] shadow-2xl min-h-[297mm] relative flex flex-col z-10">

                {/* Header Line */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-zafira-purple"></div>

                <div className="p-[20mm] flex-1">
                    {/* Header: Logo & Title */}
                    <div className="flex flex-col items-center mb-8 gap-4">
                        <img src={zafiraLogo} alt="Zafira Logo" className="h-16 object-contain" />
                        <div className="w-full h-[1px] bg-zafira-purple"></div>
                    </div>

                    <h1 className="text-center font-bold text-sm uppercase mb-8">CONTRATO DE PRESTAÇÃO DE SERVIÇOS – ZAFIRA COMUNICAÇÃO</h1>

                    <div className="space-y-6 text-[11px] leading-[1.3] text-justify text-black">

                        {/* IDENTIFICAÇÃO */}
                        <section>
                            <h2 className="font-bold text-center mb-2 uppercase text-black">IDENTIFICAÇÃO DAS PARTES</h2>
                            <p className="mb-2">
                                <strong>CONTRATANTE:</strong> {contract.razaoSocial}, CNPJ: {contract.cnpj}, localizada na {contract.enderecoEmpresa}. CEP: {contract.cepEmpresa}. Cidade: {contract.cidadeEmpresa} Responsável que responde pela empresa: {contract.responsavelNome}, {contract.responsavelEstadoCivil}, {contract.responsavelProfissao}, carteira de identidade nº {contract.responsavelRg}, CPF. nº {contract.responsavelCpf}, domiciliado: {contract.responsavelEndereco}, Cidade: {contract.responsavelCidade}, no Estado de {contract.responsavelEstado}.
                            </p>
                            <p className="mb-2">
                                <strong>CONTRATADA:</strong> ZAFIRA COMUNICAÇÃO E MARKETING, CNPJ: 28.077.026/0001-57. Responsável legal pela empresa: Gabriéli Dias da Silva, brasileira, solteira, jornalista, carteira de identidade nº 1.916.790, CPF nº 065.724.891-76, residente e domiciliado na Rua Ourinhos, 74 Bairro Vila Carvalho, Cep 79005270, Cidade e Estado Campo Grande/MS.
                            </p>
                            <p>
                                As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas seguintes e pelas condições de preço, forma e termo de pagamento descritas no presente.
                            </p>
                        </section>

                        {/* OBJETO */}
                        <section>
                            <h2 className="font-bold text-center mb-2 uppercase text-black">DO OBJETO DO CONTRATO</h2>
                            <p className="mb-1">Cláusula 1ª. É objeto do presente contrato a prestação do serviço de gerenciamento de redes sociais:</p>
                            <ul className="list-none pl-0 mb-2">
                                {contract.selectedServices.length > 0 ? contract.selectedServices.map((s, i) => {
                                    let text = s;
                                    if (s.includes("[QTD]")) text = s.replace("[QTD]", contract.serviceQuantities?.[s] || "X");
                                    return <li key={i}>• {text}</li>
                                }) : <li>• Gestão de redes sociais</li>}
                            </ul>
                            <p className="mb-2">
                                utilizando mecanismos para alcançar mais pessoas e divulgar os serviços no período do dia {contract.dataInicio} a {contract.dataFim}
                            </p>
                            <p>
                                §1º. O presente contrato tem validade de {contract.contractDuration || "4"} meses, podendo ser renovado por igual período sucessiva e automaticamente, conforme anuência das partes.
                            </p>
                        </section>

                        {/* OBRIGAÇÕES CONTRATANTE */}
                        <section>
                            <h2 className="font-bold text-center mb-2 uppercase text-black">OBRIGAÇÕES DO CONTRATANTE</h2>
                            <p>Cláusula 2ª. O CONTRATANTE deverá fornecer a CONTRATADA todas as informações necessárias à realização do serviço, devendo especificar os detalhes necessários à perfeita consecução do mesmo, e a forma de como ele deve ser entregue.</p>
                            <p>Cláusula 3ª. O CONTRATANTE deverá efetuar o pagamento na forma e condições estabelecidas na cláusula 12ª.</p>
                            <p>Cláusula 4ª. O CONTRATANTE deverá comunicar a CONTRATADA se precisar finalizar o serviço antes do prazo estabelecido no contrato com trinta dias de antecedência.</p>
                            <p>Cláusula 5ª. Se responsabilizar única e exclusivamente, sem qualquer vinculação com a CONTRATADA, em relação às postagens que eventualmente produzir e publicar em suas redes sociais, uma vez que não fazem parte do objeto contratado com a CONTRATADA.</p>
                            <p>Cláusula 6ª. Promover através de seu representante, o acompanhamento e fiscalizar, sustar, recusar, mandar desfazer ou refazer qualquer serviço que não esteja de acordo com a técnica atual, normas ou especificações que atendem ao objeto contratado, ficando certo que, em nenhuma hipótese, a falta de fiscalização do CONTRATANTE eximirá a CONTRATADA de suas responsabilidades provenientes do contrato.</p>
                        </section>

                        {/* OBRIGAÇÕES CONTRATADA */}
                        <section>
                            <h2 className="font-bold text-center mb-2 uppercase text-black">OBRIGAÇÕES DA CONTRATADA</h2>
                            <p>Cláusula 7ª. É dever da CONTRATADA oferecer ao contratante a cópia do presente instrumento, contendo todas as especificidades da prestação de serviço contratada.</p>
                            <p>Cláusula 8ª. Guardar sigilo de todas as informações que forem postas à sua disposição para a execução dos trabalhos, não podendo utilizar e/ou resguardar quaisquer informações recebidas, sob pena de responsabilizar-se por perdas e danos.</p>
                            <p>Cláusula 9ª. Garantir a execução deste contrato por sua equipe de profissionais, sendo permitida a subcontratação por parte da CONTRATADA, sob sua exclusiva responsabilidade.</p>
                            <p>Cláusula 10ª. A CONTRATADA deverá fornecer Nota Fiscal de Serviços, referente ao (s) pagamento (s) efetuado (s) pelo CONTRATANTE.</p>
                            <p>Cláusula 11ª. Enviar para a CONTRATANTE todos os materiais produzidos do objetivo deste contrato finalizados.</p>
                        </section>

                        {/* PAGAMENTO */}
                        <section>
                            <h2 className="font-bold text-center mb-2 uppercase text-black">DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO</h2>
                            <p>
                                Cláusula 12ª. O presente serviço será remunerado pela quantia de R${contract.valorTotal} {contract.valorTotalExtenso ? `(${contract.valorTotalExtenso})` : ""} sendo dividido em {contract.quantidadeMesesPagamento || "4"} meses, totalizando mensalmente em R${contract.valorMensal} {contract.valorMensalExtenso ? `(${contract.valorMensalExtenso})` : ""} referente aos serviços efetivamente prestados conforme a Cláusula 1ª. O pagamento será realizado todo dia {contract.diaPagamento} do mês. Devendo ser pago em dinheiro, pix ou outra forma de pagamento em que ocorra a prévia concordância de ambas as partes. E o valor combinado entre ambas as partes para o impulsionamento. Devendo ser pago em boleto bancário, pix ou cartão de crédito.
                            </p>
                            <p>Cláusula 13ª. Em caso de inadimplemento das prestações avançadas acima incidirá sobre o valor devido, multa pecuniária de 2% e juros de mora de 5% ao mês mais correção monetária.</p>
                            <p>Parágrafo único. Em caso de cobrança judicial, devem ser acrescidas custas processuais e 30% de honorários advocatícios.</p>
                        </section>

                        {/* GERAIS */}
                        <section>
                            <h2 className="font-bold text-center mb-2 uppercase text-black">DAS CONDIÇÕES EM GERAIS</h2>
                            <p>Cláusula 14ª. No caso de não haver o cumprimento de qualquer uma das cláusulas do presente instrumento, a parte que não cumpriu deverá pagar uma multa de 30% do valor total do contrato para a outra parte.</p>
                            <p>Cláusula 15ª. Salvo com a expressa autorização do CONTRATANTE, não pode a CONTRATADA transferir ou subcontratar os serviços previstos neste instrumento, sob o risco de ocorrer a rescisão imediata.</p>
                            <p>Cláusula 16ª. Todos os serviços extraordinários, ou seja, aqueles não previstos no objeto deste contrato e que forem necessários ou solicitados pela CONTRATANTE, serão cobrados à parte, com preços previamente convencionados.</p>
                            <p>Cláusulas 17ª. Todos os documentos produzidos pela CONTRATADA passarão a ser de propriedade da CONTRATANTE, podendo ser utilizados, a qualquer tempo, para qualquer finalidade, sem necessidade de autorização prévia ou posterior da CONTRATADA.</p>
                            <p>Cláusula 18ª. Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da comarca de Campo Grande/MS.</p>
                        </section>

                        {/* FORO */}
                        <section className="text-center pt-4">
                            <h2 className="font-bold text-center mb-2 uppercase text-black">DO FORO</h2>
                            <p>Campo Grande, {contract.dataAssinatura}</p>
                        </section>

                        {/* ASSINATURAS */}
                        <section className="mt-12 flex justify-between pt-8 pb-4">
                            <div className="w-[45%] border-t border-black pt-2 text-center relative">
                                {zafiraSignature && <img src={zafiraSignature} className="h-12 absolute -top-12 left-1/2 -translate-x-1/2 filter invert brightness-0" />}
                                <p className="font-bold">Gabriéli Dias da Silva</p>
                                <p className="text-[10px]">ZAFIRA COMUNICAÇÃO</p>
                            </div>
                            <div className="w-[45%] border-t border-black pt-2 text-center relative">
                                {signatureData && <img src={signatureData} className="h-12 absolute -top-12 left-1/2 -translate-x-1/2" />}
                                <p className="font-bold">{contract.responsavelNome}</p>
                                <p className="text-[10px]">{contract.razaoSocial}</p>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer Line */}
                <div className="border-t border-zafira-purple py-4 text-center">
                    <p className="text-zafira-purple text-[8px] font-bold tracking-[0.3em]">LABORATÓRIO CRIATIVO</p>
                </div>

                {/* ACTION AREA: Terms & Signature */}
                {status !== 'signed' && (
                    <div className="bg-gray-50 border-t border-gray-200 p-8 flex flex-col items-center gap-6 mt-8 rounded-b-lg">

                        <div className="text-center">
                            <h3 className="text-lg font-bold text-black mb-1">Assinatura Digital</h3>
                            <p className="text-sm text-gray-600">Por favor, assine no quadro abaixo para validar este contrato.</p>
                        </div>

                        {/* Signature Canvas */}
                        <div className="border-2 border-dashed border-gray-400 bg-white rounded-lg w-full max-w-lg shadow-sm">
                            <SignatureCanvas
                                ref={sigCanvas}
                                penColor="black"
                                canvasProps={{ className: 'w-full h-40 md:h-48 cursor-crosshair' }}
                            />
                        </div>

                        {/* COMPLIANCE CHECKBOX - REQUIRED */}
                        <div className="w-full max-w-lg bg-white p-4 rounded border border-gray-200 shadow-sm">
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <div className="relative flex items-center pt-1">
                                    <input
                                        type="checkbox"
                                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 shadow-sm transition-all checked:border-zafira-purple checked:bg-zafira-purple hover:border-zafira-purple"
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                    />
                                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="text-xs text-gray-600">
                                    Declaro que li e concordo com os <button onClick={() => setShowTerms(true)} className="text-zafira-purple font-bold hover:underline">Termos e Condições</button>,
                                    a <button onClick={() => setShowPrivacy(true)} className="text-zafira-purple font-bold hover:underline">Política de Privacidade (LGPD)</button>
                                    e o <span className="font-bold">Termo de Aceite de Assinatura Eletrônica</span>.
                                </div>
                            </label>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-4 w-full max-w-lg">
                            <button
                                onClick={handleClear}
                                className="flex-1 py-4 border border-gray-300 rounded-lg text-gray-600 font-bold hover:bg-white transition-colors uppercase text-sm tracking-wide"
                            >
                                Limpar
                            </button>
                            <button
                                onClick={handleSign}
                                disabled={isSigning || !termsAccepted}
                                className="flex-[2] py-4 bg-[#6d28d9] hover:bg-[#5b21b6] disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-xl shadow-purple-900/20 transition-all transform active:scale-[0.98] uppercase text-sm tracking-wide flex items-center justify-center gap-2"
                            >
                                {isSigning ? 'Salvando...' : 'Assinar e Concluir'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Success Badge & Email Action */}
                {status === 'signed' && (
                    <div className="p-8 flex flex-col items-center gap-4 bg-green-50 border-t border-green-100 mt-8 rounded-b-lg">
                        <div className="flex items-center gap-2 text-green-700 font-bold text-lg">
                            <ShieldCheck size={24} />
                            Contrato Assinado e Validado!
                        </div>
                        <p className="text-xs text-center text-green-800 max-w-md mb-4">
                            O documento foi registrado com sucesso em nossa base segura, incluindo Log de Auditoria com IP ({ipAddress}) e Carimbo de Tempo.
                        </p>

                        {!emailSent ? (
                            <div className="w-full max-w-md bg-white p-6 rounded-xl border border-green-200 shadow-sm">
                                <h3 className="text-center font-bold text-gray-800 mb-2">Receber via E-mail</h3>
                                <p className="text-center text-xs text-gray-500 mb-4">
                                    Para sua segurança, enviamos o contrato assinado diretamente para o seu e-mail.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <input
                                        type="email"
                                        placeholder="Seu melhor e-mail"
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-black"
                                    />
                                    <button
                                        onClick={async () => {
                                            if (!recipientEmail.includes('@') || !recipientEmail.includes('.')) {
                                                showToast("Digite um e-mail válido!", 'error');
                                                return;
                                            }

                                            // N8N WEBHOOK URL - Replace this with your actual N8N Webhook URL
                                            const N8N_WEBHOOK_URL = "";

                                            try {
                                                if (resolvedId && contract) {
                                                    let uploadSuccess = false;

                                                    // 1. Generate PDF Blob
                                                    const contractWithAudit = {
                                                        ...contract,
                                                        clientSignature: signatureData || undefined, // Fix type compatibility
                                                        ipAddress,
                                                        userAgent: navigator.userAgent,
                                                        signedAt: new Date(),
                                                        termsAccepted: true,
                                                        id: resolvedId
                                                    };

                                                    // Generate PDF Blob
                                                    // Note: We need to import the generatePDF function again or ensure it's available
                                                    // Since we removed it from imports earlier, we'll need to re-add it or rely on a different flow.
                                                    // Assuming we restore the import or use the existing logic if it was kept.
                                                    // Checking imports... we removed it. I will re-add the import in a separate step.
                                                    // For now, let's write the logic assuming the function is available.

                                                    // Actually, a better approach for reliability if imports are messy:
                                                    // Just update the Firestore status and let the user know, 
                                                    // UNLESS they specifically want the Frontend to push the file.

                                                    // IF N8N URL IS PROVIDED:
                                                    if (N8N_WEBHOOK_URL) {
                                                        showToast("Gerando PDF e enviando...", 'info');

                                                        // We need the generate function here. 
                                                        // I will assume the import is restored or will be restored.
                                                        const pdfBlob = await generateContractPDF(contractWithAudit, zafiraSignature, signatureData, zafiraLogo, true, true);

                                                        const formData = new FormData();
                                                        formData.append('email', recipientEmail);
                                                        formData.append('contract_id', resolvedId);
                                                        formData.append('client_name', contract.razaoSocial);
                                                        formData.append('file', pdfBlob as Blob, `Contrato_${contract.razaoSocial.replace(/\s+/g, '_')}.pdf`);

                                                        await fetch(N8N_WEBHOOK_URL, {
                                                            method: 'POST',
                                                            body: formData
                                                        });
                                                        uploadSuccess = true;
                                                    }

                                                    // 2. Update Firestore (Always do this as backup/log)
                                                    const docRef = doc(db, "contracts", resolvedId);
                                                    await updateDoc(docRef, {
                                                        sentToEmail: recipientEmail,
                                                        emailStatus: uploadSuccess ? 'sent_via_webhook' : 'pending_send',
                                                        emailRequestedAt: new Date()
                                                    });

                                                    setEmailSent(true);
                                                    showToast("Solicitação de envio recebida com sucesso!", 'success');
                                                }
                                            } catch (e) {
                                                console.error("Error saving email", e);
                                                showToast("Erro ao processar envio.", 'error');
                                            }
                                        }}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
                                    >
                                        <CheckCircle size={20} />
                                        Enviar para meu E-mail
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-6 rounded-xl border border-green-200 shadow-sm text-center animate-in fade-in slide-in-from-bottom-2">
                                <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                                <h3 className="font-bold text-gray-800 mb-1">E-mail Cadastrado!</h3>
                                <p className="text-sm text-gray-600">
                                    Em breve você receberá o contrato assinado em: <br />
                                    <span className="font-bold text-green-700">{recipientEmail}</span>
                                </p>
                                <p className="text-[10px] text-gray-400 mt-4">
                                    Verifique também sua caixa de Spam/Lixo Eletrônico.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Credit */}
            <div className="text-center mt-8 text-gray-500 text-xs">
                Desenvolvido por Zafira Laboratório Criativo
            </div>

            {/* TERMS MODAL */}
            {showTerms && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 relative">
                        <button onClick={() => setShowTerms(false)} className="absolute top-4 right-4 text-gray-500 hover:text-black"><X /></button>
                        <h3 className="font-bold text-lg mb-4">Termos e Condições de Uso & Aceite Eletrônico</h3>
                        <div className="space-y-4 text-sm text-gray-700 text-justify">
                            <p>1. <strong>Validade Jurídica:</strong> Ao utilizar esta plataforma para assinatura eletrônica, as partes reconhecem que a manifestação de vontade realizada por meio eletrônico é juridicamente válida, nos termos do ordenamento jurídico brasileiro, especialmente do Código Civil e da legislação aplicável às assinaturas eletrônicas, sendo adequada para contratos de natureza privada.</p>
                            <p>2. <strong>Declaração do Signatário:</strong> O signatário declara que é o titular dos dados informados e que a assinatura eletrônica aposta corresponde à sua livre e consciente manifestação de vontade, responsabilizando-se pela veracidade das informações prestadas, nos termos da legislação vigente.</p>
                            <p>3. <strong>Registro de Evidências (Log de Auditoria):</strong> Para fins de segurança, rastreabilidade e comprovação do ato, o sistema registrará automaticamente dados técnicos, incluindo endereço IP, data e hora da assinatura e informações do dispositivo utilizado, os quais comporão o Log de Auditoria vinculado ao documento assinado.</p>
                            <p>4. <strong>Aceite Eletrônico:</strong> Ao clicar em “Assinar e Concluir”, o usuário declara que leu, compreendeu e concorda com o conteúdo do documento apresentado, bem como com estes Termos e Condições, reconhecendo a validade do aceite eletrônico.</p>
                        </div>
                        <button onClick={() => setShowTerms(false)} className="mt-6 w-full bg-zafira-purple text-white py-3 rounded font-bold">Entendi e Fechar</button>
                    </div>
                </div>
            )}

            {/* PRIVACY MODAL */}
            {showPrivacy && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 relative">
                        <button onClick={() => setShowPrivacy(false)} className="absolute top-4 right-4 text-gray-500 hover:text-black"><X /></button>
                        <h3 className="font-bold text-lg mb-4">Política de Privacidade (LGPD) — Trecho Essencial</h3>
                        <div className="space-y-4 text-sm text-gray-700 text-justify">
                            <p>Em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados – LGPD):</p>
                            <p>1. <strong>Coleta de Dados:</strong> São coletados dados pessoais e técnicos, como nome, e-mail, endereço IP, data e hora, informações do dispositivo e assinatura eletrônica, exclusivamente para a finalidade de formalização, validação e comprovação do aceite e da assinatura do documento.</p>
                            <p>2. <strong>Armazenamento e Segurança:</strong> Os dados são armazenados em ambiente seguro, com medidas técnicas e administrativas adequadas à proteção contra acesso não autorizado, perda ou alteração indevida, podendo ser utilizados apenas para as finalidades descritas ou para cumprimento de obrigação legal.</p>
                            <p>3. <strong>Retenção:</strong> Os dados serão mantidos pelo prazo necessário para atender às finalidades contratuais e legais, inclusive para fins de prova e auditoria, observado o prazo prescricional aplicável.</p>
                        </div>
                        <button onClick={() => setShowPrivacy(false)} className="mt-6 w-full bg-zafira-purple text-white py-3 rounded font-bold">Entendi e Fechar</button>
                    </div>
                </div>
            )}

        </div>
    );
}
