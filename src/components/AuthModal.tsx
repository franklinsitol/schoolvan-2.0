import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { X, Mail, Lock, User, Phone, MapPin } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Bem-vindo de volta!');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: name });

        if (type === 'driver') {
          await setDoc(doc(db, 'drivers', user.uid), {
            name,
            email,
            phone,
            city,
            status: 'Ativo',
            role: 'admin',
            plan: 'Básico',
            pricePerStudent: 7.90,
            invoiceStatus: 'Em Dia'
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
            email,
            phone,
            city,
            role: 'parent',
            status: 'Ativo',
            createdAt: new Date().toISOString()
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
      } else if (error?.code === 'auth/email-already-in-use') {
        toast.error('Este e-mail já está cadastrado.');
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
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if driver or user profile exists
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
      
      toast.success('Login realizado com sucesso!');
      onClose();
    } catch (error: any) {
      console.error('Erro no Google Login:', error);
      if (error?.code === 'auth/unauthorized-domain') {
        toast.error('Domínio não autorizado no Firebase Auth! Adicione seu domínio nas configurações do Firebase.', { duration: 8000 });
      } else if (error?.code === 'auth/operation-not-allowed') {
        toast.error('Login do Google não está ativado no Firebase Console > Authentication > Sign-in method.', { duration: 6000 });
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
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none"
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
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gray-900 text-yellow-400 font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
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
            className="w-full mt-6 py-3 border border-gray-200 rounded-xl flex items-center justify-center gap-2 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Entrar com Google
          </button>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-gray-500 hover:text-yellow-600 font-medium"
            >
              {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
