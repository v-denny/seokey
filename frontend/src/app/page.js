// File: seokey/frontend/src/app/page.js
'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { 
    ChevronUp, ChevronDown, ChevronsUpDown, Search, FileDown, Trash2, 
    Link as LinkIcon, ListChecks, Loader2, Save, X, Settings, ChevronLeft, ChevronRight, LogOut, LogIn, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- Reusable Components ---

const EditableCell = ({ getValue, row, column, table }) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);
  const onBlur = () => table.options.meta?.updateData(row.index, column.id, value);
  useEffect(() => setValue(initialValue), [initialValue]);
  return <input value={value || ''} onChange={e => setValue(e.target.value)} onBlur={onBlur} className="w-full bg-transparent p-1 focus:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded transition-all" placeholder="Add a note..." />;
};

const IndeterminateCheckbox = ({ indeterminate, className = '', ...rest }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (typeof indeterminate === 'boolean') ref.current.indeterminate = !rest.checked && indeterminate;
  }, [ref, indeterminate, rest.checked]);
  return <input type="checkbox" ref={ref} className={className + ' cursor-pointer h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500'} {...rest} />;
};

const Sidebar = ({ active }) => {
    const { isLoggedIn, logout } = useAuth();
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
                {isLoggedIn ? (
                    <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut size={20} /> Logout
                    </button>
                ) : (
                    <Link href="/login" className="flex items-center justify-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors">
                        <LogIn size={20} /> Login or Register
                    </Link>
                )}
            </div>
        </aside>
    );
};

const AuthRequiredModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md m-4 text-center">
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 absolute top-4 right-4"><X size={20}/></button>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Feature Requires Account</h3>
                <p className="text-gray-600 mb-6">Please log in or create an account to save your keyword lists.</p>
                <div className="flex justify-center gap-4">
                    <Link href="/login" className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold text-sm">Login</Link>
                    <Link href="/register" className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-sm">Register</Link>
                </div>
            </div>
        </div>
    );
};

const SaveListModal = ({ isOpen, onClose, onSave, listName, setListName, isSaving }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md m-4 transform transition-all">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Save Keyword List</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X /></button>
                </div>
                <p className="text-gray-600 mb-5">Enter a name for your list. This will save all keywords currently in the table.</p>
                <input type="text" value={listName} onChange={(e) => setListName(e.target.value)} placeholder="e.g., 'Competitor Analysis - Q3'" className="w-full text-base p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition" />
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-sm transition-colors">Cancel</button>
                    <button onClick={onSave} disabled={!listName || isSaving} className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-not-allowed font-semibold text-sm flex items-center gap-2 transition-colors">
                        {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                        {isSaving ? 'Saving...' : 'Save List'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Page Logic Component ---
function DashboardPageContent() {
    const router = useRouter();
    const { isLoggedIn, authHeader } = useAuth();
    const searchParams = useSearchParams();
    const listId = searchParams.get('list_id');

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pageTitle, setPageTitle] = useState('Keyword Analysis');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [sorting, setSorting] = useState([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [rowSelection, setRowSelection] = useState({});
    const [urlToAnalyze, setUrlToAnalyze] = useState('');
    const [activeTab, setActiveTab] = useState('url');
    const [keywordsToAnalyze, setKeywordsToAnalyze] = useState('');

    useEffect(() => {
        const fetchListData = async (id) => {
            if (!isLoggedIn) {
                toast.error("You must be logged in to view saved lists.");
                router.push('/login');
                return;
            }
            setLoading(true);
            try {
                const response = await fetch(`http://localhost:5000/api/lists/${id}`, { headers: authHeader() });
                if (!response.ok) throw new Error('Failed to fetch list data.');
                const listData = await response.json();
                setData(listData.keywords);
                setPageTitle(listData.name);
            } catch (error) {
                toast.error(error.message);
                router.push('/');
            } finally {
                setLoading(false);
            }
        };

        if (listId) {
            fetchListData(listId);
        } else {
            setPageTitle('Keyword Analysis');
            setData([]);
            setLoading(false);
        }
    }, [listId, router, authHeader, isLoggedIn]);

    const handleAnalyzeUrl = async (e) => {
        e.preventDefault();
        if (!urlToAnalyze) return;
        setIsAnalyzing(true);
        setData([]);
        setPageTitle(`Analysis for ${urlToAnalyze}`);
        try {
            const response = await fetch('http://localhost:5000/api/analyze-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: urlToAnalyze }),
            });
            if (!response.ok) throw new Error('Failed to analyze URL');
            const analysisResult = await response.json();
            setData(analysisResult);
            toast.success('URL analysis complete!');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAnalyzeKeywords = async (e) => {
        e.preventDefault();
        const keywords = keywordsToAnalyze.split('\n').map(k => k.trim()).filter(k => k);
        if (keywords.length === 0) {
            toast.error("Please enter at least one keyword.");
            return;
        }
        setIsAnalyzing(true);
        setData([]);
        setPageTitle(`Analysis for ${keywords.length} keywords`);
        try {
            const response = await fetch('http://localhost:5000/api/keywords/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords }),
            });
            if (!response.ok) throw new Error('Failed to analyze keywords.');
            const analysisResult = await response.json();
            setData(analysisResult);
            toast.success('Keyword analysis complete!');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveClick = () => {
        if (isLoggedIn) {
            setNewListName(pageTitle);
            setIsSaveModalOpen(true);
        } else {
            setIsAuthModalOpen(true);
        }
    };

    const handleSaveList = async () => {
        if (!newListName || data.length === 0) return;
        setIsSaving(true);
        try {
            const response = await fetch('http://localhost:5000/api/lists', {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ name: newListName, keywords: data }),
            });
            if (!response.ok) throw new Error('Failed to save the list.');
            toast.success(`List "${newListName}" saved!`);
            setIsSaveModalOpen(false);
            setNewListName('');
            router.push('/saved-lists');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const columnHelper = createColumnHelper();
    const columns = useMemo(() => [
        { id: 'select', header: ({ table }) => <IndeterminateCheckbox checked={table.getIsAllRowsSelected()} indeterminate={table.getIsSomeRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />, cell: ({ row }) => <IndeterminateCheckbox checked={row.getIsSelected()} disabled={!row.getCanSelect()} indeterminate={row.getIsSomeSelected()} onChange={row.getToggleSelectedHandler()} /> },
        columnHelper.accessor('keyword', { header: 'Keyword', cell: info => <span className="font-semibold text-gray-800">{info.getValue()}</span>, minSize: 200 }),
        columnHelper.accessor('category', { header: 'Category', cell: info => info.getValue() ? <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">{info.getValue()}</span> : null }),
        columnHelper.accessor('search_results', { header: 'Search Results', cell: info => info.getValue()?.toLocaleString() ?? 'N/A' }),
        columnHelper.accessor('difficulty', { 
            header: 'Difficulty', 
            cell: info => {
                const value = info.getValue();
                if (value === null || value === undefined) return 'N/A';
                const color = value > 60 ? 'bg-red-500' : value > 30 ? 'bg-yellow-500' : 'bg-green-500';
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className={`${color} h-2.5 rounded-full`} style={{ width: `${value}%` }}></div>
                        </div>
                        <span className="font-medium text-gray-700">{value}</span>
                    </div>
                );
            }
        }),
        columnHelper.accessor('top_competitor', { header: 'Top Competitor', cell: info => <span className="text-sm text-blue-600 hover:underline">{info.getValue()}</span> }),
        columnHelper.accessor('notes', { header: 'Notes', cell: EditableCell, size: 250 }),
    ], [columnHelper]);

    const table = useReactTable({
        data,
        columns,
        state: { sorting, globalFilter, rowSelection },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        enableRowSelection: true,
        meta: { updateData: (rowIndex, columnId, value) => setData(old => old.map((row, index) => index === rowIndex ? { ...old[rowIndex], [columnId]: value } : row)) },
    });
    
    const deleteSelectedRows = () => {
        const selectedIndexes = Object.keys(rowSelection).map(Number);
        setData(currentData => currentData.filter((_, index) => !selectedIndexes.includes(index)));
        setRowSelection({});
        toast.success(`${selectedIndexes.length} row(s) deleted from table.`);
    };

    const exportSelectedRows = () => {
        const selectedData = table.getSelectedRowModel().flatRows.map(row => row.original);
        if (selectedData.length === 0) return;
        const csvContent = [Object.keys(selectedData[0]).join(','), ...selectedData.map(row => Object.values(row).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${pageTitle.replace(/ /g, '_')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800">
            <Sidebar active="analysis" />
            <AuthRequiredModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
            <SaveListModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={handleSaveList} listName={newListName} setListName={setNewListName} isSaving={isSaving} />

            <main className="flex-1 p-8 overflow-auto">
                <header className="mb-10">
                    <h2 className="text-3xl font-bold text-gray-900 truncate">{pageTitle}</h2>
                    <p className="mt-2 text-base text-gray-500">{listId ? `Viewing a saved list. Edit notes or export data below.` : `Analyze keywords from a webpage or a manual list.`}</p>
                </header>
                
                {!listId && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                        <div className="flex border-b border-gray-200 mb-6">
                            <button onClick={() => setActiveTab('url')} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold -mb-px border-b-2 ${activeTab === 'url' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <LinkIcon size={16}/> Analyze from Webpage
                            </button>
                            <button onClick={() => setActiveTab('manual')} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold -mb-px border-b-2 ${activeTab === 'manual' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <FileText size={16}/> Analyze from Keyword List
                            </button>
                        </div>
                        
                        {activeTab === 'url' && (
                             <form onSubmit={handleAnalyzeUrl} className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-grow">
                                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input type="url" value={urlToAnalyze} onChange={(e) => setUrlToAnalyze(e.target.value)} required placeholder="https://example.com/blog/my-article" className="w-full text-base p-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow shadow-sm"/>
                                </div>
                                <button type="submit" disabled={isAnalyzing || !urlToAnalyze} className="flex justify-center items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-not-allowed font-semibold transition-all shadow-sm hover:shadow-md">
                                    {isAnalyzing ? <><Loader2 className="animate-spin" />Analyzing...</> : 'Analyze URL'}
                                </button>
                            </form>
                        )}
                        
                        {activeTab === 'manual' && (
                             <form onSubmit={handleAnalyzeKeywords} className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-grow">
                                    <textarea value={keywordsToAnalyze} onChange={(e) => setKeywordsToAnalyze(e.target.value)} required placeholder="Enter one keyword per line..." rows="4" className="w-full text-base p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow shadow-sm"/>
                                </div>
                                <button type="submit" disabled={isAnalyzing || !keywordsToAnalyze} className="flex justify-center items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-not-allowed font-semibold transition-all shadow-sm hover:shadow-md">
                                    {isAnalyzing ? <><Loader2 className="animate-spin" />Analyzing...</> : 'Analyze Keywords'}
                                </button>
                            </form>
                        )}
                    </div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-5 gap-4">
                        <div className="relative w-full md:w-auto md:min-w-[300px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} className="w-full p-2.5 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow shadow-sm" placeholder="Filter results..." />
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleSaveClick} disabled={data.length === 0} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg disabled:bg-teal-300 hover:bg-teal-700 text-sm font-medium transition-colors shadow-sm hover:shadow-md"><Save size={16} /> Save List</button>
                            <button onClick={exportSelectedRows} disabled={Object.keys(rowSelection).length === 0 || data.length === 0} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm"><FileDown size={16} /> Export</button>
                            <button onClick={deleteSelectedRows} disabled={Object.keys(rowSelection).length === 0 || data.length === 0} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 hover:text-red-600 hover:border-red-300 text-sm font-medium transition-colors shadow-sm"><Trash2 size={16} /> Delete</button>
                        </div>
                    </div>

                    <div className="overflow-x-auto border-t border-gray-200">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                {table.getHeaderGroups().map(headerGroup => (<tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (<th key={header.id} colSpan={header.colSpan} className="p-4 text-sm font-semibold tracking-wider text-gray-600 first:pl-6 last:pr-6" style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                                        <div onClick={header.column.getToggleSortingHandler()} className={`flex items-center gap-2 ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {{asc: <ChevronUp size={16} className="text-teal-600" />, desc: <ChevronDown size={16} className="text-teal-600" />}[header.column.getIsSorted()] ?? (header.column.getCanSort() ? <ChevronsUpDown size={16} className="text-gray-400" /> : null)}
                                        </div>
                                    </th>))}
                                </tr>))}
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {(loading || isAnalyzing) ? (
                                    <tr><td colSpan={columns.length} className="text-center p-10"><div className="flex justify-center items-center gap-3 text-gray-500"><Loader2 className="animate-spin" /> {isAnalyzing ? 'Analyzing URL...' : 'Loading data...'}</div></td></tr>
                                ) : table.getRowModel().rows.length === 0 ? (
                                    <tr><td colSpan={columns.length} className="text-center p-10 text-gray-500">No keywords to display. Analyze a URL or enter a list to get started.</td></tr>
                                ) : table.getRowModel().rows.map(row => (<tr key={row.id} className="hover:bg-teal-50/50 transition-colors">
                                    {row.getVisibleCells().map(cell => (<td key={cell.id} className="p-4 text-sm text-gray-700 first:pl-6 last:pr-6">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>))}
                                </tr>))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-1 border-t border-gray-200 flex-wrap gap-3 text-sm">
                        <div className="text-gray-600">
                            {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="p-2 border rounded-md hover:bg-gray-100 disabled:opacity-50 transition-colors"><ChevronLeft size={18} /></button>
                            <span className="font-semibold text-gray-700">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
                            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="p-2 border rounded-md hover:bg-gray-100 disabled:opacity-50 transition-colors"><ChevronRight size={18} /></button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// This wrapper is needed to use Suspense for useSearchParams
export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen bg-gray-50 text-gray-600">
                <Loader2 className="animate-spin mr-3 text-teal-500" />
                Loading Dashboard...
            </div>
        }>
            <DashboardPageContent />
        </Suspense>
    );
}
