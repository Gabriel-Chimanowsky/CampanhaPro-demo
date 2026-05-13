import * as React from 'react';
import Button from './ui/Button';
import { LogoutIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { LOGO_COLOR_BASE64 } from '../constants';

interface HeaderProps {
    onLogin?: () => void;
    logoUrl?: string | null;
}

const UserMenu = () => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;
    
    const userInitial = user.name.charAt(0).toUpperCase();

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors"
            >
                <span>{user.name}</span>
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[#4ac7f0]">
                    {userInitial}
                </div>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#161b22] border border-white/10 rounded-xl shadow-2xl backdrop-blur-3xl z-20 overflow-hidden">
                    <div className="py-1">
                        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                            <p className="text-sm font-semibold text-slate-200">{user.name}</p>
                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                            <p className="text-xs font-bold text-[#4ac7f0] mt-1">{user.type}</p>
                        </div>
                        <button 
                            onClick={logout}
                            className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm text-rose-400 hover:bg-white/5 transition-colors"
                        >
                            <LogoutIcon /> Sair da Plataforma
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

import { Link } from 'react-router-dom';

const Header = ({ logoUrl }: HeaderProps) => {
  const { user } = useAuth();
  
    return (
        <header className="bg-[#0d1117]/80 backdrop-blur-xl sticky top-0 z-50 no-print border-b border-white/5">
            <div className="container mx-auto px-4 sm:px-6 md:px-8 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Link to="/">
                        <img src={logoUrl || LOGO_COLOR_BASE64} alt="Campanha Pró Logo" className="h-10" />
                    </Link>
                </div>
                <nav className="flex items-center gap-2">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <Link to="/app" className="text-sm font-medium text-[#4ac7f0] hover:underline">Painel</Link>
                            <UserMenu />
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                             <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-slate-50">Login</Link>
                             <Link to="/register">
                                <Button variant="primary" className="text-sm py-1.5 px-4 h-auto">Cadastrar</Button>
                             </Link>
                        </div>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Header;