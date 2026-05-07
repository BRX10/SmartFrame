import { useEffect, useState } from 'react';
import moment from "moment-timezone";
import "moment/locale/fr";
import Spinner from "../../components/spinner";
import { GetActivity } from "../../services/activityServices";
import { useNavigate } from "react-router-dom";

const FILTERS = [
    { key: "all",   label: "Tout" },
    { key: "image", label: "Images" },
    { key: "music", label: "Musique" },
    { key: "esp",   label: "ESP" },
    { key: "error", label: "Erreurs" },
];

function eventStyle(category, type_event) {
    switch (category) {
        case "image":
            return {
                dot: "bg-emerald-500",
                badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                icon: "🖼",
                label: type_event === "user" ? "Manuel" : "Auto",
            };
        case "music":
            return {
                dot: type_event === "music-end" ? "bg-zinc-500" : "bg-orange-500",
                badge: type_event === "music-end"
                    ? "bg-zinc-700/50 text-zinc-400 border-zinc-700"
                    : "bg-orange-500/10 text-orange-400 border-orange-500/20",
                icon: type_event === "music-end" ? "⏹" : "♪",
                label: type_event === "music-end" ? "Fin" : "Lecture",
            };
        case "esp":
            return {
                dot: type_event === "error" ? "bg-red-500" : "bg-blue-500",
                badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                icon: "⚡",
                label: "ESP",
            };
        case "error":
            return {
                dot: "bg-red-500",
                badge: "bg-red-500/10 text-red-400 border-red-500/20",
                icon: "⚠",
                label: "Erreur",
            };
        default:
            return {
                dot: "bg-zinc-500",
                badge: "bg-zinc-700/50 text-zinc-400 border-zinc-700",
                icon: "•",
                label: type_event,
            };
    }
}

export default function Activity({ token }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    function fetchData(p = 1, type = filter, append = false) {
        const setter = append ? setLoadingMore : setLoading;
        setter(true);
        GetActivity(token, p, 50, type)
            .then(data => {
                if (append) {
                    setItems(prev => [...prev, ...data.items]);
                } else {
                    setItems(data.items);
                }
                setHasMore(data.has_more);
                setPage(p);
                setter(false);
            })
            .catch(err => {
                setError(err);
                setter(false);
                if (err.message === "Le token a expiré") {
                    setTimeout(() => navigate("/signout", { replace: true }), 300);
                }
            });
    }

    useEffect(() => {
        fetchData(1, filter, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, filter]);

    function changeFilter(key) {
        if (key === filter) return;
        setFilter(key);
        setPage(1);
        setHasMore(true);
    }

    if (error) return <div className="p-6 text-red-400 text-sm">Erreur : {error.message}</div>;

    return (
        <div className="px-4 py-4 max-w-4xl mx-auto w-full">
            {/* Barre de filtres */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {FILTERS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => changeFilter(f.key)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap ${
                            filter === f.key
                                ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                                : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <Spinner className="mt-20" />
            ) : items.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 mt-20">Aucune activite</p>
            ) : (
                <>
                    <ul className="flex flex-col gap-1.5">
                        {items.map((item, idx) => {
                            const s = eventStyle(item.category, item.type_event);
                            return (
                                <li
                                    key={item.id || idx}
                                    className={`rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3`}
                                >
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Icon */}
                                        <span className="text-sm w-5 text-center shrink-0">{s.icon}</span>

                                        {/* Dot */}
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />

                                        {/* Frame name */}
                                        {item.frame_name && (
                                            <span className="text-sm font-medium text-zinc-200">
                                                {item.frame_name}
                                            </span>
                                        )}

                                        {/* Category badge */}
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${s.badge}`}>
                                            {s.label}
                                        </span>

                                        {/* Timestamp */}
                                        <span className="text-xs text-zinc-500 ml-auto">
                                            {moment.utc(item.created_at).tz("Europe/Paris").fromNow()}
                                        </span>
                                    </div>

                                    {/* Message */}
                                    {item.message && (
                                        <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed pl-7">
                                            {item.message}
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>

                    {/* Load more */}
                    {hasMore && (
                        <div className="flex justify-center mt-4">
                            {loadingMore ? (
                                <Spinner />
                            ) : (
                                <button
                                    onClick={() => fetchData(page + 1, filter, true)}
                                    className="px-4 py-2 text-xs font-medium rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 transition-colors"
                                >
                                    Charger plus
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
