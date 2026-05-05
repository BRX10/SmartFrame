import { useEffect, useState } from "react";
import {useNavigate, useParams} from "react-router-dom";
import ButtonNavigation from "../../components/buttonNavigation";
import {
    GetAllFrames,
    ConvertKeyToStringType,
} from "../../services/framesServices";
import Spinner from "../../components/spinner";
import { GetAllLibrarys } from "../../services/librarysServices";
import Frame from "./frame";
import PropTypes from "prop-types";

const STATUS_CONFIG = {
    online:  { dot: "bg-emerald-400", label: "En ligne",  ring: "ring-emerald-400/20" },
    error:   { dot: "bg-amber-400",   label: "Erreur",    ring: "ring-amber-400/20" },
    offline: { dot: "bg-red-400",     label: "Hors ligne", ring: "ring-red-400/20" },
    unknown: { dot: "bg-zinc-500",    label: "Inconnu",   ring: "ring-zinc-500/20" },
};

export default function Frames({ token }) {

    const navigate = useNavigate();
    const params = useParams();

    const [error, setError] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [frames, setFrames] = useState([]);
    const [librarys, setLibrarys] = useState([]);
    const [isArchive, setIsArchive] = useState(true);

    const [isOpen, setIsOpen] = useState(false);
    const [frameIdModal, setFrameIdModal] = useState(null);

    useEffect(() => {
        GetAllFrames(token)
            .then(frames => {
                    setIsLoaded(true);
                    setFrames(frames);
                },
                (error) => {
                    setIsLoaded(true);
                    setError(error);

                    setTimeout(function() {
                        if (error.message === "Le token a expiré") {
                            navigate("/signout", { replace: true });
                        }
                    }, 300);
                });

        GetAllLibrarys(token)
            .then(librarys => {
                    setLibrarys(librarys);
                    librarys.push({title: "Désactiver la bibliothéque sur le frame", id: "disable_library_frame"});

                    if (params.idFrame) {
                        openModal(params.idFrame)
                    }
                },
                (error) => {
                    setError(error);

                    setTimeout(function() {
                        if (error.message === "Le token a expiré") {
                            navigate("/signout", { replace: true });
                        }
                    }, 300);
                });
    }, [isArchive, token, params.idFrame, navigate]);


    function openModal(id) {
        setFrameIdModal(id);
        setIsOpen(true);
    }

    function closeModal() {
        setIsOpen(false);

        if (params.idFrame) {
            navigate("/frames", { replace: true });
        }
    }

    if (error) {
        return <div className="px-4 py-10 text-center text-red-400">Erreur : {error.message}</div>;
    }

    if (!isLoaded) {
        return <Spinner className="mt-40"/>;
    }

    return (
        <div className="px-4 py-4 pb-10 max-w-4xl mx-auto w-full">
            <Frame
                token={token}
                isOpen={isOpen}
                closeModal={closeModal}
                id={frameIdModal}
                librarys={librarys}
                isArchive={() => setIsArchive(!isArchive)}
                onUpdate={() => setIsArchive(!isArchive)}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-100">Cadres</h2>
                <ButtonNavigation
                    title="+ Ajouter"
                    onClick={() => navigate("/new_frame", { replace: true })}
                />
            </div>

            {frames.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-10 flex flex-col items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 text-zinc-700">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
                    </svg>
                    <p className="text-sm text-zinc-600">Aucun cadre enregistré</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {frames.map((frame) => {
                        const st = STATUS_CONFIG[frame.status] || STATUS_CONFIG.unknown;
                        const libName = frame.library_display?.name;
                        return (
                            <button
                                key={frame.id}
                                onClick={() => openModal(frame.id)}
                                className="w-full text-left rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    {/* Left: name + info */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2.5 mb-1.5">
                                            {/* Status dot */}
                                            <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${st.dot} ring-4 ${st.ring}`} />
                                            <h3 className="text-sm font-semibold text-zinc-100 truncate">{frame.title}</h3>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-5 text-xs text-zinc-500">
                                            <span>{frame.inch}" — {frame.resolution_width}×{frame.resolution_height}</span>
                                            <span className="text-zinc-700">·</span>
                                            <span>{ConvertKeyToStringType(frame.type_frame)}</span>
                                            <span className="text-zinc-700">·</span>
                                            <span className="font-mono">{frame.ip}</span>
                                        </div>
                                    </div>

                                    {/* Right: status badge + library */}
                                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                                        <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                            frame.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' :
                                            frame.status === 'error' ? 'bg-amber-500/10 text-amber-400' :
                                            frame.status === 'offline' ? 'bg-red-500/10 text-red-400' :
                                            'bg-zinc-500/10 text-zinc-500'
                                        }`}>
                                            {st.label}
                                        </span>
                                        {libName && (
                                            <span className="text-[11px] text-zinc-600 truncate max-w-[140px]">
                                                {libName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


Frames.propTypes = {
    token: PropTypes.string.isRequired
}
