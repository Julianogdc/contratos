import React from 'react';
import { FileText } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen flex flex-col bg-black relative overflow-hidden selection:bg-zafira-highlight selection:text-white">

            {/* Ambient Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-zafira-highlight/20 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[60vh] bg-purple-900/20 rounded-full blur-[100px] animate-pulse-slow delay-700"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[40vh] bg-indigo-900/20 rounded-full blur-[140px] animate-pulse-slow delay-1000"></div>
            </div>

            <header className="bg-zafira-surface/50 border-b border-zafira-muted/10 px-8 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
                <div className="flex items-center gap-3 mx-auto">
                    <div className="bg-zafira-highlight p-2 rounded-lg shadow-[0_0_15px_rgba(130,87,229,0.5)]">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        Gerador de Contratos <span className="text-zafira-highlight">Zafira</span>
                    </h1>
                </div>
                <div className="text-xs font-mono text-zafira-muted/50 border border-zafira-muted/10 px-2 py-1 rounded">
                    v1.0.0
                </div>
            </header>

            <main className="flex-1 p-8 max-w-7xl mx-auto w-full relative z-10">
                {children}
            </main>
        </div>
    );
};
