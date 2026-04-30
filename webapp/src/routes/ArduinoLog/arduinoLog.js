import { useEffect, useState } from 'react';
import moment from "moment-timezone";
import "moment/locale/fr";
import Spinner from "../../components/spinner";
import InfiniteScroll from "react-infinite-scroll-component";
import { GetEventsLogArduino } from "../../services/eventsLogArduinoServices";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

function logStyle(type) {
    switch (type) {
        case "error":
        case "server-error":
            return {
                dot: "bg-red-500",
                badge: "bg-red-500/10 text-red-400 border-red-500/20",
                row: "border-red-500/10"
            };
        case "success":
        case "server":
            return {
                dot: "bg-emerald-500",
                badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                row: "border-zinc-800"
            };
        default:
            return {
                dot: "bg-zinc-500",
                badge: "bg-zinc-700/50 text-zinc-400 border-zinc-700",
                row: "border-zinc-800"
            };
    }
}

export default function ArduinoLog({ token }) {
    const navigate = useNavigate();

    const [hasMore, setHasMore] = useState(true);
    const [pageServer, setPageServer] = useState(1);
    const [error, setError] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [logs, setLogs] = useState([]);

    function getData() {
        GetEventsLogArduino(token, pageServer + 1)
            .then((eventsLogArduino) => {
                if (eventsLogArduino.length === 0) {
                    setHasMore(false);
                    return;
                }
                setLogs(prev => prev.concat(eventsLogArduino));
                setPageServer(p => p + 1);
            }, (error) => {
                setError(error);
                if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 300);
            });
    }

    useEffect(() => {
        GetEventsLogArduino(token)
            .then((eventsLogArduino) => {
                setIsLoaded(true);
                setLogs(eventsLogArduino);
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
            <InfiniteScroll
                dataLength={logs.length}
                next={getData}
                hasMore={hasMore}
                loader={<Spinner className="my-4" />}
                endMessage={
                    <p className="text-center text-xs text-zinc-600 py-4">— Fin des logs —</p>
                }
            >
                <ul className="flex flex-col gap-1.5">
                    {logs.map((log, idxLog) => {
                        const s = logStyle(log.type_event);
                        return (
                            <li
                                key={idxLog}
                                className={`rounded-xl border ${s.row} bg-zinc-900 px-4 py-3`}
                            >
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Status dot */}
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />

                                    {/* Frame name */}
                                    <a
                                        href={"/frames/" + log.frame._id.$oid}
                                        className="text-sm font-medium text-zinc-200 hover:text-orange-400 transition-colors"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {log.frame.name}
                                    </a>

                                    {/* Type badge */}
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${s.badge}`}>
                                        {log.type_event}
                                    </span>

                                    {/* Timestamp */}
                                    <span className="text-xs text-zinc-500 ml-auto">
                                        {moment.utc(log.created_at).tz("Europe/Paris").fromNow()}
                                    </span>
                                </div>

                                {/* Message */}
                                {log.message && (
                                    <p className="mt-1.5 text-xs text-zinc-400 font-mono leading-relaxed pl-3.5">
                                        {log.message}
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </InfiniteScroll>
        </div>
    );
}

ArduinoLog.propTypes = {
    token: PropTypes.string.isRequired
}
