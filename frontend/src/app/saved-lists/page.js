// File: seokey/frontend/src/app/saved-lists/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Save, Settings, ListChecks, Loader2, Trash2, Eye, Calendar, LogOut, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';

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

// Custom Confirmation Modal
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md m-4">
                <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-bold text-gray-900">{title}</h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">{message}</p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button type="button" onClick={onConfirm} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm">
                        Delete
                    </button>
                    <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
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


function SavedListsPageContent() {
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token, authHeader } = useAuth();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [listToDelete, setListToDelete] = useState(null);

    const fetchLists = useCallback(async () => {
        if (!token) {
            return;
        }
        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/lists', { headers: authHeader() });
            if (!response.ok) throw new Error("Failed to fetch lists.");
            const data = await response.json();
            setLists(data);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }, [token, authHeader]);

    useEffect(() => {
        fetchLists();
    }, [fetchLists]);

    const openDeleteModal = (listId) => {
        setListToDelete(listId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (!listToDelete) return;

        const promise = fetch(`http://localhost:5000/api/lists/${listToDelete}`, {
            method: 'DELETE',
            headers: authHeader()
        }).then(response => {
            if (!response.ok) throw new Error('Failed to delete list.');
            return response.json();
        });

        toast.promise(promise, {
            loading: 'Deleting list...',
            success: () => {
                fetchLists();
                setIsDeleteModalOpen(false);
                setListToDelete(null);
                return 'List deleted successfully!';
            },
            error: (err) => {
                setIsDeleteModalOpen(false);
                setListToDelete(null);
                return err.message;
            },
        });
    };

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800">
            <Sidebar active="lists" />
             <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete List"
                message="Are you sure you want to delete this list? This action cannot be undone."
            />
            <main className="flex-1 p-8 overflow-auto">
                <header className="mb-10">
                    <h2 className="text-3xl font-bold text-gray-900">Saved Keyword Lists</h2>
                    <p className="mt-2 text-base text-gray-500">Review, manage, or delete your saved keyword analysis lists.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full flex justify-center items-center p-20">
                            <Loader2 className="animate-spin text-teal-500" size={40} />
                        </div>
                    ) : lists.length > 0 ? (
                        lists.map(list => (
                            <div key={list._id} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-lg transition-shadow">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 truncate mb-2">{list.name}</h3>
                                    <div className="flex items-center text-sm text-gray-500 mb-4">
                                        <Calendar size={14} className="mr-2" />
                                        <span>Created on: {new Date(list.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="flex justify-end items-center gap-3 border-t border-gray-100 pt-4 mt-4">
                                    <button onClick={() => openDeleteModal(list._id)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                                        <Trash2 size={16} /> Delete
                                    </button>
                                    <Link href={`/?list_id=${list._id}`} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors">
                                        <Eye size={16} /> View
                                    </Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center p-20 bg-white rounded-xl border border-dashed">
                            <h3 className="text-xl font-semibold text-gray-700">No Saved Lists Found</h3>
                            <p className="text-gray-500 mt-2">Go to the Keyword Analysis page to save your first list.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default withAuth(SavedListsPageContent);
