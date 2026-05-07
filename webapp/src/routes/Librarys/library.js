import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import ButtonNavigation from "../../components/buttonNavigation";
import Alert from "../../components/alert";
import PostImage from "../../components/postImage";
import {
    DeleteLibrary,
    GetLibrary,
    ListAction,
    PutLibrary
} from "../../services/librarysServices";
import {
    GetAllPictureLibrary
} from "../../services/picturesServices";
import Spinner from "../../components/spinner";
import Select from "../../components/select";
import Image from "./image";
import PropTypes from "prop-types";

export default function Library({ token }) {

    const navigate = useNavigate();
    const params = useParams();

    const [pictures, setPictures] = useState([]);
    const [library, setLibrary] = useState("");
    const [delay, setDelay] = useState("");
    const [action, setAction] = useState("");
    const [isArchive, setIsArchive] = useState(true);

    const [alert, setAlert] = useState(false);
    const [typeAlert, setTypeAlert] = useState("");
    const [messageAlert, setMessageAlert] = useState("");
    const [isLoaded, setIsLoaded] = useState(false);

    const [editingDelay, setEditingDelay] = useState(false);
    const [delayInput, setDelayInput] = useState("");
    const [savingDelay, setSavingDelay] = useState(false);

    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState("");
    const [savingName, setSavingName] = useState(false);

    const [isOpen, setIsOpen] = useState(false);
    const [pictureModal, setPictureModal] = useState({});

    useEffect(() => {
        GetLibrary(token, params.idLibrary)
            .then((lib) => {
                setLibrary(lib.name);
                setDelay(lib.delay);
                setAction(ListAction.find(a => a.value === lib.action));
                setIsLoaded(true);
            }, (error) => {
                setAlert(true);
                setTypeAlert("error");
                setMessageAlert("Erreur : " + error.message);
                setIsLoaded(true);
                if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 300);
            });

        GetAllPictureLibrary(token, params.idLibrary)
            .then((pics) => {
                setPictures(pics);
                setIsLoaded(true);
                if (params.idPicture) openModal(params.idPicture, pics);
            }, (error) => {
                setAlert(true);
                setTypeAlert("error");
                setMessageAlert("Erreur images : " + error.message);
                setIsLoaded(true);
                if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 300);
            });
    }, [params.idPicture, isArchive, token, navigate, params.idLibrary]);


    function archiveLibrary() {
        setAlert(false);
        DeleteLibrary(token, params.idLibrary)
            .then(() => {
                setAlert(true);
                setTypeAlert("sucess");
                setMessageAlert("Bibliothèque archivée");
                setTimeout(() => navigate("/librarys", { replace: true }), 800);
            }, (error) => {
                setAlert(true);
                setTypeAlert("error");
                setMessageAlert("Erreur : " + error.message);
                if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 300);
            });
    }

    function saveDelay() {
        const val = parseInt(delayInput, 10);
        if (!val || val < 1) return;
        setSavingDelay(true);
        setAlert(false);
        PutLibrary(token, params.idLibrary, null, val, null)
            .then((lib) => {
                setDelay(lib.delay);
                setEditingDelay(false);
                setSavingDelay(false);
                setAlert(true);
                setTypeAlert("sucess");
                setMessageAlert("Délai mis à jour");
            }, (error) => {
                setSavingDelay(false);
                setAlert(true);
                setTypeAlert("error");
                setMessageAlert("Erreur : " + error.message);
                if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 300);
            });
    }

    function saveName() {
        if (!nameInput.trim()) return;
        setSavingName(true);
        setAlert(false);
        PutLibrary(token, params.idLibrary, nameInput.trim(), null, null)
            .then((lib) => {
                setLibrary(lib.name);
                setEditingName(false);
                setSavingName(false);
                setAlert(true);
                setTypeAlert("sucess");
                setMessageAlert("Nom mis à jour");
            }, (error) => {
                setSavingName(false);
                setAlert(true);
                setTypeAlert("error");
                setMessageAlert("Erreur : " + error.message);
                if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 300);
            });
    }

    function changeLibrary(selectAction) {
        setAlert(false);
        setAction(selectAction);
        PutLibrary(token, params.idLibrary, null, null, selectAction.value)
            .then((lib) => {
                setLibrary(lib.name);
                setDelay(lib.delay);
                setAction(ListAction.find(a => a.value === lib.action));
                setAlert(true);
                setTypeAlert("sucess");
                setMessageAlert("Mode de lecture mis à jour");
            }, (error) => {
                setAlert(true);
                setTypeAlert("error");
                setMessageAlert("Erreur : " + error.message);
                if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 300);
            });
    }

    function openModal(id, pct) {
        setPictureModal(pct.find(p => p.id === id));
        setIsOpen(true);
    }

    function closeModal() {
        setIsOpen(false);
        setPictureModal({});
        if (params.idPicture) navigate("/library/" + params.idLibrary, { replace: true });
    }

    if (!isLoaded) {
        return <Spinner className="mt-40" />;
    }

    return (
        <div className="px-4 py-4 pb-10 max-w-4xl mx-auto w-full">

            <Image
                token={token}
                isOpen={isOpen}
                closeModal={closeModal}
                pictureModal={pictureModal}
                isArchive={() => setIsArchive(!isArchive)}
                onRename={(id, newName) => {
                    setPictures(prev => prev.map(p => p.id === id ? { ...p, title: newName } : p));
                    setPictureModal(prev => prev.id === id ? { ...prev, title: newName } : prev);
                }}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => navigate("/librarys", { replace: true })}
                    className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
                    </svg>
                    Bibliothèques
                </button>
                <ButtonNavigation
                    title="Archiver"
                    onClick={() => archiveLibrary()}
                />
            </div>

            <Alert alert={alert} typeAlert={typeAlert} messageAlert={messageAlert} onClose={(e) => setAlert(e)} />

            {/* Library info card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 mb-5">
                {/* Nom editable */}
                {editingName ? (
                    <div className="flex items-center gap-2 mb-3">
                        <input
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-lg text-zinc-100 focus:outline-none focus:border-orange-500"
                            autoFocus
                        />
                        <button
                            onClick={saveName}
                            disabled={savingName}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-50 transition-colors"
                        >
                            {savingName ? "…" : "OK"}
                        </button>
                        <button
                            onClick={() => setEditingName(false)}
                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            Annuler
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 mb-3">
                        <h2 className="text-lg font-semibold text-zinc-100">{library}</h2>
                        <button
                            onClick={() => { setNameInput(library); setEditingName(true); }}
                            className="text-zinc-500 hover:text-orange-400 transition-colors"
                            title="Renommer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="M13.488 2.513a1.75 1.75 0 00-2.475 0L3.22 10.303a1 1 0 00-.26.443l-.97 3.516a.75.75 0 00.927.927l3.516-.97a1 1 0 00.443-.261l7.79-7.79a1.75 1.75 0 000-2.475l-.18-.18z" />
                            </svg>
                        </button>
                    </div>
                )}
                {/* Délai — éditable inline */}
                <div className="mb-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Délai entre images</p>
                    {editingDelay ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                value={delayInput}
                                onChange={e => setDelayInput(e.target.value)}
                                className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
                                placeholder="secondes"
                                autoFocus
                            />
                            <span className="text-xs text-zinc-500">secondes</span>
                            <button
                                onClick={saveDelay}
                                disabled={savingDelay}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-50 transition-colors"
                            >
                                {savingDelay ? "…" : "Sauvegarder"}
                            </button>
                            <button
                                onClick={() => setEditingDelay(false)}
                                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                Annuler
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <span className="text-zinc-200 font-medium text-sm">{delay}s</span>
                            <button
                                onClick={() => { setDelayInput(String(delay)); setEditingDelay(true); }}
                                className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                            >
                                Modifier
                            </button>
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Mode de lecture</p>
                    <Select
                        list={ListAction}
                        selected={action || { title: "—" }}
                        setSelected={(select) => changeLibrary(select)}
                    />
                </div>
            </div>

            {/* Images grid */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                    Images <span className="text-zinc-600 font-normal normal-case tracking-normal">({pictures.length})</span>
                </h3>
                <ButtonNavigation
                    title="+ Ajouter"
                    onClick={() => navigate("/new_image/" + params.idLibrary + "/" + (pictures.length + 1), { replace: true })}
                />
            </div>

            {pictures.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-10 flex flex-col items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 text-zinc-700">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <p className="text-sm text-zinc-600">Aucune image dans cette bibliothèque</p>
                </div>
            ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {pictures.map((post) => (
                        <PostImage
                            idx={post.idx}
                            id={post.id}
                            image={post.picture}
                            key={post.idx}
                            title={post.title}
                            list={[post.date, post.displayCount > 0 ? `${post.displayCount}×` : null].filter(Boolean)}
                            isClick={true}
                            onClick={() => openModal(post.id, pictures)}
                            gridMode={true}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

Library.propTypes = {
    token: PropTypes.string.isRequired
}
