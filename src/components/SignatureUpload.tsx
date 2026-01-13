import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';

interface SignatureUploadProps {
    label: string;
    onChange: (file: string | null) => void;
    defaultImage?: string;
}

export const SignatureUpload: React.FC<SignatureUploadProps> = ({ label, onChange, defaultImage }) => {
    const [preview, setPreview] = useState<string | null>(defaultImage || null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setPreview(result);
                onChange(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const clear = () => {
        setPreview(null);
        onChange(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-zafira-muted">{label}</label>

            {preview ? (
                <div className="relative w-full h-32 border-2 border-zafira-success/50 border-dashed rounded-lg flex items-center justify-center bg-zafira-background overflow-hidden group">
                    <img src={preview} alt="Signature" className="h-full object-contain" />
                    <button
                        onClick={clear}
                        className="absolute top-2 right-2 p-1 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => inputRef.current?.click()}
                    className="w-full h-32 border-2 border-zafira-muted border-dashed rounded-lg flex flex-col items-center justify-center text-zafira-muted hover:border-zafira-highlight hover:text-zafira-highlight transition-colors bg-zafira-background/50"
                >
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-sm">Clique para enviar assinatura (PNG)</span>
                </button>
            )}

            <input
                type="file"
                ref={inputRef}
                onChange={handleFileChange}
                accept="image/png"
                className="hidden"
            />
        </div>
    );
};
