// File: seokey/frontend/src/app/settings/page.js
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Save, Settings, ListChecks, KeyRound, LogOut, Loader2 } from 'lucide-react';

// Reusable Sidebar with new theme and logout button
const Sidebar = ({ active }) => {
    const { logout } = useAuth();
    return (
        <aside className="w-64 bg-white border-r border-gray-200 p-5 flex-shrink-0 flex flex-col">
            <div className="text-2xl font-bold text-teal-600 mb-12">seokey</div>
            <nav className="flex flex-col space-y-2 flex-grow">
                <Link href="/" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${active === 'analysis' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <ListChecks size={20} /> Keyword Analysis
                </Link>
                <Link href="/saved-lists" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${active === 'lists' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <Save size={20} /> Saved Lists
                </Link>
                <Link href="/settings" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${active === 'settings' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <Settings size={20} /> Settings
                </Link>
            </nav>
            <div>
                <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut size={20} /> Logout
                </button>
            </div>
        </aside>
    );
};

// Higher-order component to protect routes
const withAuth = (Component) => {
    const AuthenticatedComponent = (props) => {
        const { isLoggedIn, loading } = useAuth();
        const router = useRouter();

        useEffect(() => {
            if (!loading && !isLoggedIn) {
                router.push('/login');
            }
        }, [isLoggedIn, loading, router]);

        if (loading || !isLoggedIn) {
            return (
                <div className="flex justify-center items-center min-h-screen bg-gray-50">
                    <Loader2 className="animate-spin text-teal-500" size={32} />
                </div>
            );
        }
        return <Component {...props} />;
    };
    return AuthenticatedComponent;
};


function SettingsPageContent() {
    return (
        <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800">
            <Sidebar active="settings" />
            <main className="flex-1 p-8 overflow-auto">
                <header className="mb-10">
                    <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
                    <p className="mt-2 text-base text-gray-500">Manage your application settings and API configurations.</p>
                </header>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm max-w-2xl">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800">API Configuration</h3>
                        <p className="text-sm text-gray-500 mt-1">Update your API keys here.</p>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col">
                            <label htmlFor="geminiKey" className="mb-2 font-semibold text-gray-700">Gemini API Key</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input 
                                    id="geminiKey"
                                    type="password"
                                    placeholder="••••••••••••••••••••••••••••"
                                    className="w-full text-base p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-sm bg-gray-50 cursor-not-allowed"
                                    disabled // Disabled for this demo
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                For security, this key is managed in your backend and cannot be changed from the UI.
                            </p>
                        </div>
                         <div className="flex flex-col">
                            <label htmlFor="serpApiKey" className="mb-2 font-semibold text-gray-700">SerpAPI Key</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input id="serpApiKey" type="password" placeholder="••••••••••••••••••••••••••••" className="w-full text-base p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-sm bg-gray-50 cursor-not-allowed" disabled />
                            </div>
                              <p className="text-xs text-gray-500 mt-2">
                                This key is also managed in your backend.
                            </p>
                        </div>
                        <div className="flex justify-end mt-4">
                             <button disabled className="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-semibold text-sm disabled:bg-teal-300 disabled:cursor-not-allowed">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default withAuth(SettingsPageContent);
