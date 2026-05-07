import { useLocation, Outlet, useNavigate } from 'react-router-dom';

// Icons inline SVG (no extra dep, heroicons shapes)
function IconHome({ active }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
            stroke="currentColor" strokeWidth={active ? 0 : 1.8}
            className={`w-6 h-6 transition-colors ${active ? 'text-orange-500' : 'text-zinc-500'}`}>
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
    );
}

function IconFrames({ active }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
            stroke="currentColor" strokeWidth={active ? 0 : 1.8}
            className={`w-6 h-6 transition-colors ${active ? 'text-orange-500' : 'text-zinc-500'}`}>
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
    );
}

function IconLibrary({ active }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
            stroke="currentColor" strokeWidth={active ? 0 : 1.8}
            className={`w-6 h-6 transition-colors ${active ? 'text-orange-500' : 'text-zinc-500'}`}>
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
    );
}

function IconSettings({ active }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
            stroke="currentColor" strokeWidth={active ? 0 : 1.8}
            className={`w-6 h-6 transition-colors ${active ? 'text-orange-500' : 'text-zinc-500'}`}>
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function IconLogs({ active }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
            stroke="currentColor" strokeWidth={active ? 0 : 1.8}
            className={`w-6 h-6 transition-colors ${active ? 'text-orange-500' : 'text-zinc-500'}`}>
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
    );
}

function IconLogout() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={1.8}
            className="w-5 h-5 text-zinc-500 hover:text-red-400 transition-colors">
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
    );
}

const NAV_ITEMS = [
    { path: '/',          label: 'Home',     Icon: IconHome    },
    { path: '/frames',    label: 'Cadres',   Icon: IconFrames  },
    { path: '/librarys',  label: 'Médias',   Icon: IconLibrary },
    { path: '/arduinologs', label: 'Logs',   Icon: IconLogs    },
    { path: '/settings',    label: 'Réglages', Icon: IconSettings },
];

function isActive(pathname, path) {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
}

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className="flex h-full bg-zinc-950">

            {/* ── SIDEBAR — desktop only ── */}
            <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-zinc-800 bg-zinc-950 h-full fixed left-0 top-0 z-40">
                {/* Logo */}
                <div className="flex items-center gap-2.5 px-5 py-6 border-b border-zinc-800">
                    <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                            <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                            <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100 1.5.75.75 0 000-1.5z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <span className="text-zinc-100 font-semibold tracking-tight">SmartFrame</span>
                </div>

                {/* Nav items */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV_ITEMS.map(({ path, label, Icon }) => {
                        const active = isActive(location.pathname, path);
                        return (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                                    ${active
                                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                                    }`}
                            >
                                <Icon active={active} />
                                {label}
                            </button>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="px-4 py-4 border-t border-zinc-800">
                    <button
                        onClick={() => navigate('/signout')}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <IconLogout />
                        Se déconnecter
                    </button>
                </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="flex-1 md:ml-56 flex flex-col min-h-full pb-20 md:pb-0">
                {/* Top bar — page title */}
                <TopBar pathname={location.pathname} />

                {/* Page content */}
                <div className="flex-1">
                    <Outlet />
                </div>
            </main>

            {/* ── BOTTOM TAB BAR — mobile only ── */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-800 safe-bottom">
                <div className="flex items-stretch h-14">
                    {NAV_ITEMS.map(({ path, label, Icon }) => {
                        const active = isActive(location.pathname, path);
                        return (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-opacity active:opacity-60"
                            >
                                <span className={active ? 'tab-active-glow' : ''}>
                                    <Icon active={active} />
                                </span>
                                <span className={`text-[10px] font-medium transition-colors ${active ? 'text-orange-500' : 'text-zinc-500'}`}>
                                    {label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}

function TopBar({ pathname }) {
    const titles = {
        '':            'Home',
        'frames':      'Cadres',
        'new_frame':   'Nouveau cadre',
        'librarys':    'Bibliothèques',
        'library':     'Bibliothèque',
        'new_library': 'Nouvelle bibliothèque',
        'new_image':   'Nouvelle image',
        'arduinologs': 'Logs',
        'settings':    'Réglages',
    };
    const segment = pathname.split('/')[1] ?? '';
    const title = titles[segment] ?? '';

    return (
        <header className="sticky top-0 z-30 flex items-center px-4 md:px-6 h-14
            bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60">
            <h1 className="text-base font-semibold text-zinc-100 tracking-tight">
                {title}
            </h1>
        </header>
    );
}
