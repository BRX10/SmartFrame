import { useEffect, useState } from 'react';
import moment from "moment-timezone";
import "moment/locale/fr";
import { GetEventsLog } from "../services/eventsLogServices";
import Spinner from "../components/spinner";
import InfiniteScroll from "react-infinite-scroll-component";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

function eventIcon(post) {
    if (post.type_event === "server-error") {
        return (
            <span className="w-7 h-7 shrink-0 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-sm font-bold">
                ✕
            </span>
        );
    }
    if (post.type_event === "server") {
        return (
            <span className="w-7 h-7 shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">
                ✓
            </span>
        );
    }
    // user events
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
    const lnk = (href, label) => <a href={href} className="font-medium text-zinc-100 underline decoration-zinc-600 hover:text-orange-400 hover:decoration-orange-400 transition-colors">{label}</a>;

    if (post.type_event === "server-error" && post.library && post.frame && post.picture) {
        return <>Erreur lors de l'envoi de {lnk(`/library/${post.library._id.$oid}/${post.picture._id.$oid}`, post.picture.name)} sur {lnk(`/frames/${post.frame._id.$oid}`, post.frame.name)}</>;
    }
    if (post.type_event === "server" && post.library && post.frame && post.picture) {
        return <>{lnk(`/library/${post.library._id.$oid}/${post.picture._id.$oid}`, post.picture.name)} envoyée sur {lnk(`/frames/${post.frame._id.$oid}`, post.frame.name)}</>;
    }
    if (post.picture && post.frame) {
        return <>{user} a envoyé {lnk(`/library/${post.library._id.$oid}/${post.picture._id.$oid}`, post.picture.name)} sur {lnk(`/frames/${post.frame._id.$oid}`, post.frame.name)}</>;
    }
    if (post.library && post.frame) {
        return <>{user} {post.is_delete ? "a désactivé" : "a activé"} {lnk(`/library/${post.library._id.$oid}`, post.library.name)} sur {lnk(`/frames/${post.frame._id.$oid}`, post.frame.name)}</>;
    }
    if (post.picture && post.library) {
        return <>{user} {verb} {lnk(`/library/${post.library._id.$oid}/${post.picture._id.$oid}`, post.picture.name)} dans {lnk(`/library/${post.library._id.$oid}`, post.library.name)}</>;
    }
    if (post.library && !post.frame) {
        return <>{user} {verb} la bibliothèque {lnk(`/library/${post.library._id.$oid}`, post.library.name)}</>;
    }
    if (post.frame) {
        return <>{user} {verb} le cadre {lnk(`/frames/${post.frame._id.$oid}`, post.frame.name)}</>;
    }
    return null;
}

export default function Home({ token }) {
    const navigate = useNavigate();

    const [hasMore, setHasMore] = useState(true);
    const [pageServer, setPageServer] = useState(1);
    const [error, setError] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [events, setEvents] = useState([]);

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
        GetEventsLog(token)
            .then((eventsLog) => {
                setIsLoaded(true);
                setEvents(eventsLog["Évenements"] || []);
            }, (error) => {
                setIsLoaded(true);
                setError(error);
                if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 300);
            });
    }, [token, navigate]);

    if (error) return <div className="p-6 text-red-400 text-sm">Erreur : {error.message}</div>;
    if (!isLoaded) return <Spinner className="mt-40" />;

    return (
        <div className="px-4 py-4 max-w-4xl mx-auto w-full">
            {events.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-12 flex flex-col items-center gap-3 mt-8">
                    <p className="text-sm text-zinc-600">Aucune activité pour l'instant</p>
                </div>
            ) : (
                <InfiniteScroll
                    dataLength={events.length}
                    next={getData}
                    hasMore={hasMore}
                    loader={<Spinner className="my-4" />}
                    endMessage={
                        <p className="text-center text-xs text-zinc-600 py-6">— Vous avez tout vu —</p>
                    }
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
    );
}

Home.propTypes = {
    token: PropTypes.string.isRequired
}
