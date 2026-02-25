import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Globe, X, Send, CheckCircle2, AlertCircle, Loader2, Layers, Box } from 'lucide-react';

interface GithubDeployModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

const GithubDeployModal: React.FC<GithubDeployModalProps> = ({ isOpen, onClose, projectId }) => {
    const [repoUrl, setRepoUrl] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [isDeploying, setIsDeploying] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleDeploy = async () => {
        setIsDeploying(true);
        setStatus('idle');
        setErrorMessage('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/github/deploy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    projectId,
                    repoUrl,
                    githubToken,
                    deployScope: 'project'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Session expired. Please logout and login again.");
                }
                const errorMessage = data.error || 'Deployment failed';
                const details = data.details || '';
                const combinedError = details ? `${errorMessage}: ${details}` : errorMessage;
                throw new Error(combinedError);
            }

            setStatus('success');
        } catch (error: any) {
            console.error('Deployment error:', error);
            setStatus('error');
            setErrorMessage(error.message);
        } finally {
            setIsDeploying(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                        <Github className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight">GitHub Deployment</h2>
                                        <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Connect your Production Code</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {status === 'success' ? (
                                <div className="py-12 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                                    <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Deployed Successfully!</h3>
                                    <p className="text-slate-400 text-sm mb-8">Your project is now live on GitHub.</p>
                                    <button
                                        onClick={() => window.open(repoUrl, '_blank')}
                                        className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-all"
                                    >
                                        <Globe className="w-4 h-4" />
                                        Visit Repository
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Repository URL</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                                <Globe className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="text"
                                                value={repoUrl}
                                                onChange={(e) => setRepoUrl(e.target.value)}
                                                placeholder="https://github.com/owner/repo"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Personal Access Token</label>
                                        <div className="relative group">
                                            <input
                                                type="password"
                                                value={githubToken}
                                                onChange={(e) => setGithubToken(e.target.value)}
                                                placeholder="github_pat_..."
                                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    {status === 'error' && (
                                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold leading-relaxed flex items-start gap-3">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <span>{errorMessage}</span>
                                        </div>
                                    )}

                                    <div className="pt-4 flex gap-3">
                                        <button
                                            onClick={onClose}
                                            className="flex-1 py-4 px-6 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-2xl text-xs transition-all uppercase tracking-widest"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDeploy}
                                            disabled={isDeploying || !repoUrl || !githubToken}
                                            className="flex-[2] py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-xs transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest"
                                        >
                                            {isDeploying ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                            {isDeploying ? 'Syncing...' : 'Push to Origin'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default GithubDeployModal;
