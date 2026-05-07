import { useEffect, useState } from 'react';
import moment from "moment-timezone";
import "moment/locale/fr";
import { GetEventsLog } from "../services/eventsLogServices";
import { GetAllFrames, EventToFrame } from "../services/framesServices";
import { GetPictureFile } from "../services/picturesServices";
import Spinner from "../components/spinner";
import InfiniteScroll from "react-infinite-scroll-component";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

// ── Frame status card ────────────────────────────────────────────────────────

function FrameStatusCard({ frame, token, onRefreshSuccess }) {
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [thumbUrl, setThumbUrl] = useState(null);

    // Thumbnail from current_picture (enriched by API frames list)
    useEffect(() => {
        const picId = frame?.current_picture?.id || frame?.last_picture_id;
        if (!picId) return;
        let alive = true;
        GetPictureFile(token, picId)
            .then(blob => { if (alive) setThumbUrl(URL.createObjectURL(blob)); })
            .catch(() => {});
        return () => { alive = false; };
    }, [token, frame?.current_picture?.id, frame?.last_picture_id]);

    function refresh() {
        if (!frame?.library_display) return;
        setSending(true);
        setSent(false);
        EventToFrame(token, frame._id.$oid, frame.library_display._id.$oid)
            .then((res) => {
                setSending(false);
                setSent(true);
                setTimeout(() => setSent(false), 3000);
                // Re-fetch frames to update thumbnail & status
                if (onRefreshSuccess) onRefreshSuccess();
                // Immediate thumbnail update from enriched response
                if (res?.last_picture_id) {
                    GetPictureFile(token, res.last_picture_id)
                        .then(blob => setThumbUrl(URL.createObjectURL(blob)))
                        .catch(() => {});
                }
            })
            .catch(() => setSending(false));
    }

    if (!frame) return (
        <div className="shrink-0 w-56 h-32 rounded-2xl border border-zinc-800 bg-zinc-900 flex items-center justify-center">
            <Spinner />
        </div>
    );

    const library = frame.library_display;

    // Pastille statut basee sur frame.status calcule par l'API
    const statusMap = {
        online:  { color: 'bg-emerald-500', label: 'En ligne' },
        error:   { color: 'bg-red-500',     label: 'Erreur recente' },
        offline: { color: 'bg-zinc-600',    label: 'Hors ligne' },
        unknown: { color: 'bg-amber-500',   label: 'Statut inconnu' },
    };
    const status = statusMap[frame.status] || statusMap.unknown;

    return (
        <div className="shrink-0 w-48 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden flex flex-col">
            {/* Thumbnail */}
            <div className="w-full aspect-[4/3] bg-zinc-800 flex items-center justify-center overflow-hidden">
                {thumbUrl ? (
                    <img src={thumbUrl} alt="Affichage actuel" className="w-full h-full object-cover" />
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-zinc-700">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                )}
            </div>

            <div className="p-3 flex flex-col gap-2 flex-1">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <a href={`/frames/${frame._id.$oid}`} className="font-semibold text-sm text-zinc-100 truncate hover:text-orange-400 transition-colors">
                        {frame.name}
                    </a>
                    <span className={`w-2 h-2 rounded-full shrink-0 ml-2 ${status.color}`} title={status.label} />
                </div>

                {/* Library & delay */}
                {library ? (
                    <div className="flex flex-col gap-0.5">
                        <a href={`/library/${library._id.$oid}`} className="text-xs text-orange-400 hover:underline truncate">
                            {library.name}
                        </a>
                        <p className="text-xs text-zinc-500">
                            Toutes les <span className="text-zinc-300">{library.delay}s</span>
                        </p>
                    </div>
                ) : (
                    <p className="text-xs text-zinc-600 italic">Aucune bibliothèque active</p>
                )}

                {/* Last image name */}
                {frame.current_picture?.name && (
                    <p className="text-[10px] text-zinc-600 truncate">
                        <span className="text-zinc-500">{frame.current_picture.name}</span>
                    </p>
                )}

                {/* Refresh button */}
                <button
                    onClick={refresh}
                    disabled={sending || !library}
                    className={`mt-auto w-full flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg transition-all
                        ${sent
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40'
                        }`}
                >
                    {sending ? (
                        <><div className="w-3 h-3 border border-zinc-600 border-t-orange-400 rounded-full animate-spin" /> Envoi…</>
                    ) : sent ? (
                        <>✓ Image actualisée</>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 01.75.75v3.182a.75.75 0 01-.75.75h-3.182a.75.75 0 010-1.5h1.37l-.84-.841a4.5 4.5 0 00-7.08 1.401.75.75 0 01-1.405-.516A6 6 0 0112.52 3.10l.841.84V3.227a.75.75 0 01.75-.75zm-.911 7.5A.75.75 0 0113.199 11a6 6 0 01-9.47 2.71l-.84-.84v1.371a.75.75 0 01-1.5 0V11.06a.75.75 0 01.75-.75h3.182a.75.75 0 010 1.5H4.75l.84.841A4.5 4.5 0 0012.75 11.6a.75.75 0 011.175.377z" clipRule="evenodd" />
                            </svg>
                            Actualiser
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// ── Event feed helpers ───────────────────────────────────────────────────────

function eventIcon(post) {
    if (post.type_event === "server-error") {
        return (
            <span className="w-7 h-7 shrink-0 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-sm font-bold">✕</span>
        );
    }
    if (post.type_event === "server") {
        return (
            <span className="w-7 h-7 shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">✓</span>
        );
    }
    return (
        <span className="w-7 h-7 shrink-0 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-orange-400">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A6.483 6.483 0 0010 16.5a6.483 6.483 0 004.793-2.11A5.99 5.99 0 0010 12z" clipRule="evenodd" />
            </svg>
        </span>
    );
}

function eventText(post) {
    const user = post.user?.username ?? "—";
    const verb = post.is_delete ? "a archivé" : "a ajouté";
    const lnk = (href, label) => (
        <a href={href} className="font-medium text-zinc-100 underline decoration-zinc-600 hover:text-orange-400 hover:decoration-orange-400 transition-colors">{label}</a>
    );

    if (post.type_event === "server-error" && post.library && post.frame && post.picture)
        return <>Erreur lors de l'envoi de {lnk(`/library/${post.library._id.$oid}/${post.picture._id.$oid}`, post.picture.name)} sur {lnk(`/frames/${post.frame._id.$oid}`, post.frame.name)}</>;
    if (post.type_event === "server" && post.library && post.frame && post.picture)
        return <>{lnk(`/library/${post.library._id.$oid}/${post.picture._id.$oid}`, post.picture.name)} envoyée sur {lnk(`/frames/${post.frame._id.$oid}`, post.frame.name)}</>;
    if (post.picture && post.frame)
        return <>{user} a envoyé {lnk(`/library/${post.library._id.$oid}/${post.picture._id.$oid}`, post.picture.name)} sur {lnk(`/frames/${post.frame._id.$oid}`, post.frame.name)}</>;
    if (post.library && post.frame)
        return <>{user} {post.is_delete ? "a désactivé" : "a activé"} {lnk(`/library/${post.library._id.$oid}`, post.library.name)} sur {lnk(`/frames/${post.frame._id.$oid}`, post.frame.name)}</>;
    if (post.picture && post.library)
        return <>{user} {verb} {lnk(`/library/${post.library._id.$oid}/${post.picture._id.$oid}`, post.picture.name)} dans {lnk(`/library/${post.library._id.$oid}`, post.library.name)}</>;
    if (post.library && !post.frame)
        return <>{user} {verb} la bibliothèque {lnk(`/library/${post.library._id.$oid}`, post.library.name)}</>;
    if (post.frame)
        return <>{user} {verb} le cadre {lnk(`/frames/${post.frame._id.$oid}`, post.frame.name)}</>;
    return null;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Home({ token }) {
    const navigate = useNavigate();

    const [hasMore, setHasMore] = useState(true);
    const [pageServer, setPageServer] = useState(1);
    const [error, setError] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [events, setEvents] = useState([]);
    const [frames, setFrames] = useState([]);

    function getData() {
        GetEventsLog(token, pageServer + 1)
            .then((eventsLog) => {
                const all = eventsLog["Évenements"] || [];
                if (all.length === 0) { setHasMore(false); return; }
                setEvents(prev => prev.concat(all));
                setPageServer(p => p + 1);
            }, (error) => {
                if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 200);
                setError(error);
            });
    }

    useEffect(() => {
        // Load events
        GetEventsLog(token)
            .then((eventsLog) => {
                setIsLoaded(true);
                setEvents(eventsLog["Évenements"] || []);
            }, (error) => {
                setIsLoaded(true);
                setError(error);
                if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 300);
            });

        // Load frames for status cards
        GetAllFrames(token)
            .then(setFrames)
            .catch(() => {});
    }, [token, navigate]);

    // Re-fetch frames after a successful refresh to update thumbnails & status
    function refreshFrames() {
        GetAllFrames(token).then(setFrames).catch(() => {});
    }

    if (error) return <div className="p-6 text-red-400 text-sm">Erreur : {error.message}</div>;
    if (!isLoaded) return <Spinner className="mt-40" />;

    return (
        <div className="max-w-4xl mx-auto w-full">

            {/* ── Frame status cards ── */}
            {frames.length > 0 && (
                <div className="px-4 pt-4 pb-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Cadres actifs</p>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
                         style={{ scrollbarWidth: 'none' }}>
                        {frames.map(f => (
                            <FrameStatusCard
                                key={f.id}
                                frame={f}
                                token={token}
                                onRefreshSuccess={refreshFrames}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Activity feed ── */}
            <div className="px-4 py-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Activité récente</p>

                {events.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-800 p-12 flex flex-col items-center gap-3">
                        <p className="text-sm text-zinc-600">Aucune activité pour l'instant</p>
                    </div>
                ) : (
                    <InfiniteScroll
                        dataLength={events.length}
                        next={getData}
                        hasMore={hasMore}
                        loader={<Spinner className="my-4" />}
                        endMessage={<p className="text-center text-xs text-zinc-600 py-6">— Vous avez tout vu —</p>}
                    >
                        <ul className="flex flex-col gap-1.5">
                            {events.map((post, idx) => {
                                const text = eventText(post);
                                if (!text) return null;
                                return (
                                    <li key={idx} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                                        {eventIcon(post)}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-zinc-400 leading-snug">{text}</p>
                                            <p className="mt-1.5 text-xs text-zinc-600">
                                                {moment.utc(post.created_at).tz("Europe/Paris").fromNow()}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </InfiniteScroll>
                )}
            </div>
        </div>
    );
}

Home.propTypes = {
    token: PropTypes.string.isRequired
}
