
import React, { useState, useEffect } from 'react';
import { Key, Lock, CheckCircle, AlertCircle, X, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { validateApiKey } from '../services/youtubeService';
import { validateGeminiApiKey } from '../services/geminiService';
import { encryptKey, decryptKey } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onKeySet: (key: string) => void;
}

const ApiKeyModal: React.FC<Props> = ({ isOpen, onClose, onKeySet }) => {
  // YouTube Key States
  const [ytKey, setYtKey] = useState('');
  const [ytStatus, setYtStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [ytHasStored, setYtHasStored] = useState(false);
  const [ytConfirmDelete, setYtConfirmDelete] = useState(false);

  // Gemini Key States
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [geminiHasStored, setGeminiHasStored] = useState(false);
  const [geminiConfirmDelete, setGeminiConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load YouTube Key
      const storedYt = localStorage.getItem('yt_api_key');
      if (storedYt) {
        setYtKey(decryptKey(storedYt));
        setYtHasStored(true);
      } else {
        setYtKey('');
        setYtHasStored(false);
      }
      setYtStatus('idle');
      setYtConfirmDelete(false);

      // Load Gemini Key
      const storedGemini = localStorage.getItem('gemini_api_key');
      if (storedGemini) {
        setGeminiKey(decryptKey(storedGemini));
        setGeminiHasStored(true);
      } else {
        setGeminiKey('');
        setGeminiHasStored(false);
      }
      setGeminiStatus('idle');
      setGeminiConfirmDelete(false);
    }
  }, [isOpen]);

  const handleSaveYt = async () => {
    if (!ytKey.trim()) return;
    setYtStatus('validating');
    const isValid = await validateApiKey(ytKey);
    if (isValid) {
      setYtStatus('success');
      localStorage.setItem('yt_api_key', encryptKey(ytKey));
      setYtHasStored(true);
      onKeySet(ytKey); // Notify App
      setTimeout(() => setYtStatus('idle'), 1500);
    } else {
      setYtStatus('error');
    }
  };

  const handleDeleteYt = () => {
    localStorage.removeItem('yt_api_key');
    setYtKey('');
    setYtHasStored(false);
    setYtStatus('idle');
    setYtConfirmDelete(false);
    onKeySet('');
  };

  const handleSaveGemini = async () => {
    if (!geminiKey.trim()) return;
    setGeminiStatus('validating');
    const isValid = await validateGeminiApiKey(geminiKey);
    if (isValid) {
      setGeminiStatus('success');
      localStorage.setItem('gemini_api_key', encryptKey(geminiKey));
      setGeminiHasStored(true);
      setTimeout(() => setGeminiStatus('idle'), 1500);
    } else {
      setGeminiStatus('error');
    }
  };

  const handleDeleteGemini = () => {
    localStorage.removeItem('gemini_api_key');
    setGeminiKey('');
    setGeminiHasStored(false);
    setGeminiStatus('idle');
    setGeminiConfirmDelete(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={24} />
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-slate-700 rounded-full">
            <Key className="text-white" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">API 설정 관리</h2>
        </div>

        <div className="space-y-8">
          {/* YouTube API Key Section */}
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
               <div className="bg-red-500/10 p-1.5 rounded-lg"><Key className="text-red-500" size={16}/></div>
               <h3 className="font-bold text-slate-200">YouTube Data API v3</h3>
            </div>
            
            <p className="text-xs text-slate-400 mb-3">
              유튜브 채널 및 영상 데이터를 가져오기 위해 필요합니다.
            </p>

            <div className="space-y-3">
               <input 
                  type="password" 
                  value={ytKey}
                  onChange={(e) => setYtKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !ytConfirmDelete && handleSaveYt()}
                  disabled={ytConfirmDelete}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none disabled:opacity-50"
                  placeholder="AIzaSy..."
               />
               
               {ytStatus === 'error' && (
                  <div className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={12}/> 유효하지 않은 키입니다.</div>
               )}
               {ytStatus === 'success' && (
                  <div className="text-green-400 text-xs flex items-center gap-1"><CheckCircle size={12}/> 저장되었습니다.</div>
               )}

               <div className="flex gap-2">
                 {ytConfirmDelete ? (
                    <>
                      <button type="button" onClick={handleDeleteYt} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-bold flex items-center justify-center gap-1">
                         <AlertTriangle size={14} /> 삭제 확인
                      </button>
                      <button type="button" onClick={() => setYtConfirmDelete(false)} className="px-3 bg-slate-700 text-slate-300 rounded-lg text-sm">취소</button>
                    </>
                 ) : (
                    <>
                      <button 
                         type="button" 
                         onClick={handleSaveYt}
                         disabled={ytStatus === 'validating' || !ytKey}
                         className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         {ytStatus === 'validating' ? '확인 중...' : '저장'}
                      </button>
                      {ytHasStored && (
                        <button type="button" onClick={() => setYtConfirmDelete(true)} className="px-3 bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-red-400 rounded-lg border border-slate-600">
                           <Trash2 size={16} />
                        </button>
                      )}
                    </>
                 )}
               </div>
            </div>
          </div>

          {/* Gemini API Key Section */}
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
               <div className="bg-blue-500/10 p-1.5 rounded-lg"><Sparkles className="text-blue-500" size={16}/></div>
               <h3 className="font-bold text-slate-200">Gemini API Key</h3>
            </div>
            
            <p className="text-xs text-slate-400 mb-3">
              AI 심층 분석 및 컨설팅 리포트 생성을 위해 필요합니다.
            </p>

            <div className="space-y-3">
               <input 
                  type="password" 
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !geminiConfirmDelete && handleSaveGemini()}
                  disabled={geminiConfirmDelete}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                  placeholder="AIzaSy..."
               />
               
               {geminiStatus === 'error' && (
                  <div className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={12}/> 유효하지 않은 키입니다.</div>
               )}
               {geminiStatus === 'success' && (
                  <div className="text-green-400 text-xs flex items-center gap-1"><CheckCircle size={12}/> 저장되었습니다.</div>
               )}

               <div className="flex gap-2">
                 {geminiConfirmDelete ? (
                    <>
                      <button type="button" onClick={handleDeleteGemini} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-bold flex items-center justify-center gap-1">
                         <AlertTriangle size={14} /> 삭제 확인
                      </button>
                      <button type="button" onClick={() => setGeminiConfirmDelete(false)} className="px-3 bg-slate-700 text-slate-300 rounded-lg text-sm">취소</button>
                    </>
                 ) : (
                    <>
                      <button 
                         type="button" 
                         onClick={handleSaveGemini}
                         disabled={geminiStatus === 'validating' || !geminiKey}
                         className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         {geminiStatus === 'validating' ? '확인 중...' : '저장'}
                      </button>
                      {geminiHasStored && (
                        <button type="button" onClick={() => setGeminiConfirmDelete(true)} className="px-3 bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-red-400 rounded-lg border border-slate-600">
                           <Trash2 size={16} />
                        </button>
                      )}
                    </>
                 )}
               </div>
            </div>
            <div className="mt-3 text-center">
                 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-slate-300 underline">
                   Google AI Studio에서 키 발급받기
                 </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
