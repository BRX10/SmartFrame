import { useEffect, useState } from "react";
import {
    ChangeFrameLibraryDisplay,
    ConvertKeyToStringOrientation,
    ConvertKeyToStringType,
    DeleteFrame,
    EventToFrame,
    GetFrame,
    UpdateFrame
} from "../../services/framesServices";
import { Dialog } from "@headlessui/react";
import Alert from "../../components/alert";
import Spinner from "../../components/spinner";
import Select from "../../components/select";
import Modal from "../../components/modal";
import { useNavigate } from "react-router-dom";

export default function Frame(props) {
    const navigate = useNavigate();

    const [selected, setSelected] = useState({ title: "Sélectionner la bibliothèque" });
    const [frameModal, setFrameModal] = useState({});
    const [alertModal, setAlertModal] = useState(false);
    const [typeAlertModal, setTypeAlertModal] = useState("");
    const [messageAlertModal, setMessageAlertModal] = useState("");
    const [isLoadedModal, setIsLoadedModal] = useState(false);
    const [isLoadedSendModal, setIsLoadedSendModal] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Edit states
    const [editingField, setEditingField] = useState(null); // 'name' | 'ip' | null
    const [fieldInput, setFieldInput] = useState("");
    const [savingField, setSavingField] = useState(false);

    useEffect(() => {
        if (props.isOpen) {
            setConfirmDelete(false);
            setEditingField(null);
            GetFrame(props.token, props.id)
                .then(frame => {
                    setFrameModal(frame);
                    setIsLoadedModal(true);
                    if (frame.library_display) {
                        setSelected(props.librarys.find(l => l.id === frame.library_display._id.$oid) || { title: "Sélectionner la bibliothèque" });
                    }
                }, (error) => {
                    setAlertModal(true);
                    setTypeAlertModal("error");
                    setMessageAlertModal("Erreur de chargement : " + error.message);
                    setIsLoadedModal(true);
                    if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 300);
                });
        }
    }, [props.librarys, props.isOpen, props.id, props.token, navigate]);

    function closeModal() {
        props.closeModal();
        setTimeout(() => {
            setAlertModal(false);
            setFrameModal({});
            setSelected({ title: "Sélectionner la bibliothèque" });
            setIsLoadedModal(false);
            setConfirmDelete(false);
            setEditingField(null);
        }, 200);
    }

    function startEdit(field) {
        setEditingField(field);
        setFieldInput(field === 'name' ? (frameModal.name || '') : (frameModal.ip || ''));
    }

    function saveField() {
        if (!fieldInput.trim()) return;
        setSavingField(true);
        setAlertModal(false);

        const data = {};
        data[editingField] = fieldInput.trim();

        UpdateFrame(props.token, frameModal._id.$oid, data)
            .then(() => {
                setSavingField(false);
                setFrameModal(prev => ({ ...prev, [editingField]: fieldInput.trim() }));
                setEditingField(null);
                setAlertModal(true);
                setTypeAlertModal("sucess");
                setMessageAlertModal(editingField === 'name' ? "Nom mis à jour" : "IP mise à jour");
                if (props.onUpdate) props.onUpdate();
            }, (error) => {
                setSavingField(false);
                setAlertModal(true);
                setTypeAlertModal("error");
                setMessageAlertModal("Erreur : " + error.message);
                if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 300);
            });
    }

    function changeSelectedLibrary(idFrame, selectdLibrary) {
        setSelected(selectdLibrary);
        setIsLoadedSendModal(false);
        setAlertModal(false);

        ChangeFrameLibraryDisplay(props.token, idFrame, selectdLibrary.id)
            .then(() => {
                setAlertModal(true);
                setTypeAlertModal("sucess");
                setMessageAlertModal("Bibliothèque mise à jour");
                setIsLoadedSendModal(true);
            }, (error) => {
                setAlertModal(true);
                setTypeAlertModal("error");
                setMessageAlertModal("Erreur : " + error.message);
                setIsLoadedSendModal(true);
                if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 300);
            });
    }

    function eventToFrame() {
        setIsLoadedSendModal(false);
        setAlertModal(false);

        EventToFrame(props.token, frameModal._id.$oid, selected.id)
            .then(() => {
                setAlertModal(true);
                setTypeAlertModal("sucess");
                setMessageAlertModal("Image actualisée sur le cadre");
                setIsLoadedSendModal(true);
            }, (error) => {
                setAlertModal(true);
                setTypeAlertModal("error");
                setMessageAlertModal("Erreur : " + error.message);
                setIsLoadedSendModal(true);
                if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 300);
            });
    }

    function archiveFrame(id) {
        setAlertModal(false);
        setIsLoadedSendModal(false);

        DeleteFrame(props.token, id)
            .then(() => {
                setAlertModal(true);
                setTypeAlertModal("sucess");
                setMessageAlertModal("Cadre supprimé");
                props.isArchive();
                setIsLoadedSendModal(true);
                setTimeout(() => { props.closeModal(); setFrameModal([]); setAlertModal(false); }, 1000);
            }, (error) => {
                setIsLoadedSendModal(true);
                setAlertModal(true);
                setTypeAlertModal("error");
                setMessageAlertModal("Erreur : " + error.message);
                if (error.message === "Le token a expiré") setTimeout(() => navigate("/signout", { replace: true }), 300);
            });
    }

    const library = frameModal.library_display;

    return (
        <Modal isOpen={props.isOpen} setIsOpen={closeModal}>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <Dialog.Title as="h3" className="text-base font-semibold text-zinc-100 truncate pr-4 flex items-center gap-2">
                    {editingField === 'name' ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={fieldInput}
                                onChange={e => setFieldInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') setEditingField(null); }}
                                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
                                autoFocus
                            />
                            <button onClick={saveField} disabled={savingField} className="text-xs font-medium px-2 py-1 rounded-lg bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-50">{savingField ? "…" : "OK"}</button>
                            <button onClick={() => setEditingField(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Annuler</button>
                        </div>
                    ) : (
                        <>
                            {frameModal.name || "Cadre"}
                            <button onClick={() => startEdit('name')} className="text-zinc-500 hover:text-orange-400 transition-colors" title="Renommer">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                    <path d="M13.488 2.513a1.75 1.75 0 00-2.475 0L3.22 10.303a1 1 0 00-.26.443l-.97 3.516a.75.75 0 00.927.927l3.516-.97a1 1 0 00.443-.261l7.79-7.79a1.75 1.75 0 000-2.475l-.18-.18z" />
                                </svg>
                            </button>
                        </>
                    )}
                </Dialog.Title>
                <button
                    onClick={closeModal}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shrink-0"
                    aria-label="Fermer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>
            </div>

            <Alert alert={alertModal} typeAlert={typeAlertModal} messageAlert={messageAlertModal} onClose={(e) => setAlertModal(e)} />

            {!isLoadedSendModal && <Spinner className="my-3" />}

            {!isLoadedModal ? (
                <Spinner className="my-8" />
            ) : (
                <>
                    {/* Bibliothèque active */}
                    <div className="mb-5">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Bibliothèque active</p>
                        <Select
                            list={props.librarys}
                            selected={selected}
                            setSelected={(select) => changeSelectedLibrary(frameModal._id.$oid, select)}
                        />
                        {library && (
                            <p className="mt-1.5 text-xs text-zinc-500">
                                Délai : <span className="text-zinc-300 font-medium">{library.delay}s</span>
                                <span className="mx-2">·</span>
                                <a href={`/library/${library._id.$oid}`} className="text-orange-400 hover:underline">
                                    Modifier la bibliothèque →
                                </a>
                            </p>
                        )}
                    </div>

                    {/* Bouton actualiser */}
                    <button
                        onClick={eventToFrame}
                        disabled={!isLoadedSendModal || !selected.id}
                        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-semibold text-sm py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed mb-5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                        </svg>
                        Actualiser
                    </button>

                    {/* Infos techniques — editables */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 divide-y divide-zinc-800 mb-5">
                        <EditableInfoRow
                            label="Adresse IP"
                            value={frameModal.ip}
                            editing={editingField === 'ip'}
                            editValue={fieldInput}
                            saving={savingField}
                            onEdit={() => startEdit('ip')}
                            onChange={setFieldInput}
                            onSave={saveField}
                            onCancel={() => setEditingField(null)}
                        />
                        <InfoRow label="Type" value={ConvertKeyToStringType(frameModal.type_frame)} />
                        <InfoRow label="Écran" value={`${frameModal.inch}" — ${frameModal.resolution_width}×${frameModal.resolution_height}`} />
                        <InfoRow label="Orientation" value={ConvertKeyToStringOrientation(frameModal.orientation)} />
                    </div>

                    {/* Danger zone */}
                    <div className="border border-red-500/20 rounded-xl p-3">
                        {!confirmDelete ? (
                            <button
                                onClick={() => setConfirmDelete(true)}
                                className="w-full text-sm text-red-400 hover:text-red-300 py-1 transition-colors"
                            >
                                Supprimer ce cadre
                            </button>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <p className="text-xs text-red-400 text-center">Confirmer la suppression ?</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setConfirmDelete(false)}
                                        className="flex-1 text-sm py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={() => archiveFrame(frameModal._id.$oid)}
                                        className="flex-1 text-sm py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </Modal>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex justify-between items-center px-3 py-2.5">
            <span className="text-xs text-zinc-500">{label}</span>
            <span className="text-xs text-zinc-300 font-medium">{value}</span>
        </div>
    );
}

function EditableInfoRow({ label, value, editing, editValue, saving, onEdit, onChange, onSave, onCancel }) {
    if (editing) {
        return (
            <div className="flex items-center gap-2 px-3 py-2">
                <span className="text-xs text-zinc-500 shrink-0">{label}</span>
                <input
                    type="text"
                    value={editValue}
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
                    autoFocus
                />
                <button onClick={onSave} disabled={saving} className="text-xs px-2 py-1 rounded bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-50">{saving ? "…" : "OK"}</button>
                <button onClick={onCancel} className="text-xs text-zinc-500 hover:text-zinc-300">Annuler</button>
            </div>
        );
    }
    return (
        <div className="flex justify-between items-center px-3 py-2.5 group">
            <span className="text-xs text-zinc-500">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-300 font-medium">{value}</span>
                <button onClick={onEdit} className="text-zinc-600 hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all" title="Modifier">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                        <path d="M13.488 2.513a1.75 1.75 0 00-2.475 0L3.22 10.303a1 1 0 00-.26.443l-.97 3.516a.75.75 0 00.927.927l3.516-.97a1 1 0 00.443-.261l7.79-7.79a1.75 1.75 0 000-2.475l-.18-.18z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
