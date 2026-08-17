import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { X, Mail, Lock, User, Phone, MapPin, CheckSquare, Square, ShieldCheck, ExternalLink } from 'lucide-react';
import { LegalTermsModal } from './LegalTermsModal';
import toast from 'react-hot-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'driver' | 'parent';
}

export function AuthModal({ isOpen, onClose, type }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [termsAgreed, setTermsAgreed] = useState(true);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const handlePasswordReset = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error('Informe seu e-mail no campo acima para solicitar a redefinição de senha.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetSent(true);
      toast.success(`E-mail de redefinição enviado para ${cleanEmail}! Verifique sua caixa de entrada e spam.`, { duration: 6000 });
    } catch (err: any) {
      console.error('Erro reset senha:', err);
      if (err?.code === 'auth/user-not-found') {
        toast.error('Nenhuma conta encontrada com este e-mail.');
      } else {
        toast.error('Erro ao enviar e-mail de redefinição. Verifique o e-mail digitado.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error('Informe um e-mail válido.');
      setLoading(false);
      return;
    }

    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);

      if (isLogin) {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        toast.success('Bem-vindo de volta!');
      } else {
        if (!termsAgreed) {
          toast.error('É necessário aceitar os Termos de Adesão e a Política de Privacidade (LGPD) para prosseguir.');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: name });

        const consentMeta = {
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
          termsVersion: '2026.1',
          privacyAccepted: true,
          privacyAcceptedAt: new Date().toISOString()
        };

        if (type === 'driver') {
          await setDoc(doc(db, 'drivers', user.uid), {
            name,
            email: cleanEmail,
            phone,
            city,
            status: 'Ativo',
            role: 'admin',
            plan: 'Básico',
            pricePerStudent: 7.90,
            invoiceStatus: 'Em Dia',
            ...consentMeta
          });
          
          // Create default vehicle
          const vehicleId = `VEC_${Date.now()}`;
          await setDoc(doc(db, `drivers/${user.uid}/vehicles`, vehicleId), {
            driverId: user.uid,
            name: 'Minha Van',
            capacity: 15,
            uncleName: `Tio ${name.split(' ')[0]}`,
            city,
            state: 'SP',
            iconType: 'van-yellow'
          });
        } else {
          // Parent user record
          await setDoc(doc(db, 'users', user.uid), {
            name,
            email: cleanEmail,
            phone,
            city,
            role: 'parent',
            status: 'Ativo',
            createdAt: new Date().toISOString(),
            ...consentMeta
          });
        }
        
        toast.success('Conta criada com sucesso!');
      }
      onClose();
    } catch (error: any) {
      console.error('Erro no Submit:', error);
      if (error?.code === 'auth/unauthorized-domain') {
        toast.error('Domínio não autorizado no Firebase Auth! Adicione o seu domínio do Cloudflare no Firebase Console > Authentication > Settings > Authorized Domains.', { duration: 8000 });
      } else if (error?.code === 'auth/operation-not-allowed') {
        toast.error('Este provedor de login não está ativado no Firebase Console.', { duration: 6000 });
      } else if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password' || error?.code === 'auth/user-not-found') {
        toast.error('E-mail ou senha incorretos.');
      } else if (error?.code === 'auth/invalid-email') {
        toast.error('O formato do e-mail é inválido. Verifique se digitou corretamente.');
      } else if (error?.code === 'auth/email-already-in-use') {
        toast.error('Este e-mail já está cadastrado em outra conta. Faça login ou use o recurso de redefinir senha.');
      } else if (error?.code === 'auth/weak-password') {
        toast.error('A senha deve ter pelo menos 6 caracteres.');
      } else {
        toast.error(error.message || 'Erro na autenticação');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if driver or user profile exists
      try {
        const driverDoc = await getDoc(doc(db, 'drivers', user.uid));
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!driverDoc.exists() && !userDoc.exists()) {
          if (type === 'driver') {
            await setDoc(doc(db, 'drivers', user.uid), {
              name: user.displayName || 'Motorista',
              email: user.email,
              status: 'Ativo',
              role: 'admin',
              plan: 'Básico',
              pricePerStudent: 7.90,
              invoiceStatus: 'Em Dia'
            });
          } else {
            await setDoc(doc(db, 'users', user.uid), {
              name: user.displayName || 'Responsável',
              email: user.email,
              role: 'parent',
              status: 'Ativo',
              createdAt: new Date().toISOString()
            });
          }
        }
      } catch (profileErr) {
        console.warn('Aviso ao verificar ou criar perfil no Google Login:', profileErr);
      }
      
      toast.success('Login realizado com sucesso!');
      onClose();
    } catch (error: any) {
      console.error('Erro no Google Login:', error);
      if (error?.code === 'auth/unauthorized-domain') {
        toast.error('Domínio não autorizado no Firebase Auth! Adicione seu domínio nas configurações do Firebase.', { duration: 8000 });
      } else if (error?.code === 'auth/operation-not-allowed') {
        toast.error('O login do Google precisa ser ativado no Firebase Console: Authentication > Sign-in method > Google > Ativar.', { duration: 8000 });
      } else if (error?.code === 'auth/popup-closed-by-user') {
        toast.error('Janela de login foi fechada antes de concluir.');
      } else {
        toast.error(error.message || 'Erro ao entrar com Google');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900">
              {type === 'driver' ? 'Acesso Motorista' : 'Área do Responsável'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {isLogin ? 'Entre com sua conta' : 'Crie sua conta gratuita'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Nome Completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none"
                    required
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="tel" 
                    placeholder="WhatsApp (DDD+Num)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none"
                    required
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Sua Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none"
                    required
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="email" 
                placeholder="E-mail (aceita qualquer provedor)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="email"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="password" 
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm"
                required
              />
            </div>

            {isLogin && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className="flex items-center gap-2 text-xs font-extrabold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer select-none"
                  >
                    {rememberMe ? (
                      <CheckSquare size={18} className="text-yellow-500 fill-yellow-400/20" />
                    ) : (
                      <Square size={18} className="text-gray-400" />
                    )}
                    <span>Permanecer conectado</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-xs font-bold text-yellow-600 hover:text-yellow-700 underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                {rememberMe && (
                  <p className="text-[10px] text-gray-400 font-medium pl-6">
                    Mapeia sua sessão no celular/computador para não deslogar ao fechar o navegador.
                  </p>
                )}
              </div>
            )}

            {!isLogin && (
              <div className="pt-1">
                <div 
                  onClick={() => setTermsAgreed(!termsAgreed)}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer select-none"
                >
                  <div className="mt-0.5 shrink-0 text-yellow-500">
                    {termsAgreed ? (
                      <CheckSquare size={18} className="fill-yellow-400/20 text-yellow-500" />
                    ) : (
                      <Square size={18} className="text-gray-400" />
                    )}
                  </div>
                  <div className="text-[11px] text-gray-700 leading-tight">
                    <span>Li e concordo com os </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsLegalModalOpen(true);
                      }}
                      className="font-bold text-yellow-700 hover:text-yellow-800 underline inline-flex items-center gap-0.5"
                    >
                      Termos de Adesão, Política de Privacidade (LGPD) e Segurança
                    </button>
                    <span>.</span>
                  </div>
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gray-900 text-yellow-400 font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Processando...' : isLogin ? 'ENTRAR' : 'CADASTRAR'}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-bold">OU</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full mt-6 py-3 border border-gray-200 rounded-xl flex items-center justify-center gap-2 font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Entrar com Google
          </button>

          <div className="mt-6 text-center space-y-2">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-gray-500 hover:text-yellow-600 font-medium cursor-pointer"
            >
              {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
            </button>

            <div>
              <button
                type="button"
                onClick={() => setIsLegalModalOpen(true)}
                className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto underline font-medium cursor-pointer"
              >
                <ShieldCheck size={12} className="text-emerald-600" />
                <span>Termos de Uso, Privacidade e Segurança LGPD</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <LegalTermsModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />
    </div>
  );
}
