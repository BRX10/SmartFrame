import { useEffect, useState } from "react";
import ButtonNavigation from "../../components/buttonNavigation";
import Alert from "../../components/alert";
import Input from "../../components/input";
import {
    DeletePicture,
    GetPictureFileToFrame,
    PutPicture
} from "../../services/picturesServices";
import Spinner from "../../components/spinner";
import Title from "../../components/title";
import Select from "../../components/select";
import {Dialog} from "@headlessui/react";
import {
    EventToFrameUser,
    GetAllFrames
} from "../../services/framesServices";
import ButtonSimple from "../../components/buttonSimple";
import Modal from "../../components/modal";
import {useNavigate} from "react-router-dom";

export default function Image(props) {

    const navigate = useNavigate();

    const [picture, setPicture] = useState(null);

    const [alertModal, setAlertModal] = useState(false);
    const [typeAlertModal, setTypeAlertModal] = useState("");
    const [messageAlertModal, setMessageAlertModal] = useState("");
    const [isLoadedModal, setIsLoadedModal] = useState(false);
    const [isLoadedSendModal, setIsLoadedSendModal] = useState(true);
    const [pictureToFrameShow, setPictureToFrameShow] = useState(null);
    const [isLoadedPctToFrame, setIsLoadedPctToFrame] = useState(true);
    const [frames, setFrames] = useState([]);
    const [selectedFrame, setSelectedFrame] = useState({ title: "Sélectionner le cadre"});

    // Rename state
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState("");
    const [savingName, setSavingName] = useState(false);


    useEffect(() => {
        GetAllFrames(props.token)
            .then(frames => {
                    setIsLoadedModal(true);
                    setFrames(frames);
                },
                (error) => {
                    setIsLoadedModal(true);

                    setTimeout(function() {
                        if (error.message === "Le token a expiré") {
                            navigate("/signout", { replace: true });
                        }
                    }, 300);
                });

        if (props.pictureModal.picture) {
            props.pictureModal.picture
                .then(pictureLoaded => {
                        setPicture(pictureLoaded);
                    },
                    (error) => {
                        console.log(error.message);
                    });
        }

        // Reset rename state when modal changes
        setEditingName(false);
        setNameInput("");

    }, [props.pictureModal, props.token, navigate]);


    function closeModal() {
        props.closeModal()

        setAlertModal(false);
        setSelectedFrame({ title: "Sélectionner le cadre"});
        setPictureToFrameShow(null);
        setEditingName(false);
    }

    function changeSelectedFrame(select) {
        setSelectedFrame(select);
        setIsLoadedPctToFrame(false);
        setAlertModal(false);

        GetPictureFileToFrame(props.token, props.pictureModal.id, select.width, select.height)
            .then(pictureToFrame => {
                    setIsLoadedPctToFrame(true);
                    setPictureToFrameShow(URL.createObjectURL(pictureToFrame));
                },
                (error) => {
                    setIsLoadedPctToFrame(true);

                    setTimeout(function() {
                        if (error.message === "Le token a expiré") {
                            navigate("/signout", { replace: true });
                        }
                    }, 300);
                });

    }

    function eventToFrame() {
        setIsLoadedSendModal(false);
        setAlertModal(false);

        if (selectedFrame.title === "Sélectionner le cadre") {
            setAlertModal(true)
            setTypeAlertModal("error")
            setMessageAlertModal("Aucun cadre sélectionné");
            setIsLoadedSendModal(true);
            return;
        }

        EventToFrameUser(props.token, selectedFrame.id, props.pictureModal.id)
            .then((_) => {
                    setAlertModal(true);
                    setTypeAlertModal("sucess");
                    setMessageAlertModal("Image envoyée sur le cadre");
                    setIsLoadedSendModal(true);
                },
                (error) => {
                    setAlertModal(true)
                    setTypeAlertModal("error")
                    setMessageAlertModal("Erreur : " + error.message)
                    setIsLoadedSendModal(true);

                    setTimeout(function() {
                        if (error.message === "Le token a expiré") {
                            navigate("/signout", { replace: true });
                        }
                    }, 300);
                });

    }

    function saveName() {
        if (!nameInput.trim()) return;
        setSavingName(true);
        setAlertModal(false);

        PutPicture(props.token, props.pictureModal.id, nameInput.trim())
            .then(() => {
                setSavingName(false);
                setEditingName(false);
                setAlertModal(true);
                setTypeAlertModal("sucess");
                setMessageAlertModal("Nom mis à jour");
                // Update parent data
                if (props.onRename) props.onRename(props.pictureModal.id, nameInput.trim());
            }, (error) => {
                setSavingName(false);
                setAlertModal(true);
                setTypeAlertModal("error");
                setMessageAlertModal("Erreur : " + error.message);
            });
    }

    function archivePicture (id) {
        setAlertModal(false);
        setIsLoadedSendModal(false);

        DeletePicture(props.token, id)
            .then((_) => {
                    setAlertModal(true);
                    setTypeAlertModal("sucess");
                    setMessageAlertModal("Image archivée");
                    props.isArchive();
                    setIsLoadedSendModal(true);

                    setTimeout(function() {
                        props.closeModal();
                        setAlertModal(false);
                    }, 1000);
                },
                (error) => {
                    setIsLoadedSendModal(true);
                    setAlertModal(true);
                    setTypeAlertModal("error");
                    setMessageAlertModal("Erreur : " + error.message);

                    setTimeout(function() {
                        if (error.message === "Le token a expiré") {
                            navigate("/signout", { replace: true });
                        }
                    }, 300);
                })
    }

    return (
        <Modal
            isOpen={props.isOpen}
            setIsOpen={closeModal}
        >
            <Alert
                className="mb-8"
                alert={alertModal}
                typeAlert={typeAlertModal}
                messageAlert={messageAlertModal}
                onClose={ (e) => setAlertModal(e) }
            />

            { !isLoadedSendModal ? (
                <Spinner className="mt-1 mb-5"/>
            ) : null}

            { !isLoadedModal ? (
                <Spinner className="mt-6"/>
            ) : (
                <>
                    <Dialog.Title
                        as="h3"
                        className="flex justify-between items-center mt-2"
                    >
                        {/* Nom editable */}
                        {editingName ? (
                            <div className="flex items-center gap-2 flex-1 mr-3">
                                <input
                                    type="text"
                                    value={nameInput}
                                    onChange={e => setNameInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
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
                            <div className="flex items-center gap-2 min-w-0">
                                <Title title={props.pictureModal.title} />
                                <button
                                    onClick={() => { setNameInput(props.pictureModal.title || ""); setEditingName(true); }}
                                    className="shrink-0 text-zinc-500 hover:text-orange-400 transition-colors"
                                    title="Renommer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                        <path d="M13.488 2.513a1.75 1.75 0 00-2.475 0L3.22 10.303a1 1 0 00-.26.443l-.97 3.516a.75.75 0 00.927.927l3.516-.97a1 1 0 00.443-.261l7.79-7.79a1.75 1.75 0 000-2.475l-.18-.18z" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        <ButtonNavigation
                            title="Archiver"
                            onClick={() => archivePicture(props.pictureModal.id)}/>
                    </Dialog.Title>
                    <div className="mt-9 mb-5">

                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Input
                                    title="Ordre"
                                    name="delay"
                                    type="number"
                                    value={props.pictureModal.order}
                                    disabled={true}/>
                            </div>
                            <div className="flex items-end pb-2">
                                <span className="text-xs text-zinc-500">
                                    Affichages <span className="text-zinc-300 font-medium">{props.pictureModal.displayCount > 0 ? props.pictureModal.displayCount : "N/A"}</span>
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            { picture ? (
                                <img
                                    className="mt-3"
                                    style={{maxHeight: "17rem", display: "block"}}
                                    src={picture}
                                    alt={props.pictureModal.fileName}/>
                            ) : (
                                <Spinner className="mt-20 mb-20"/>
                            )}
                        </div>

                        <Select
                            className={pictureToFrameShow ? "mt-4" : "mt-4 mb-20"}
                            list={frames}
                            selected={selectedFrame}
                            setSelected={ (select) => changeSelectedFrame(select) } />

                        { pictureToFrameShow || !isLoadedPctToFrame ? (
                            <div className="flex justify-center">
                                { !isLoadedPctToFrame ? (
                                    <Spinner className="mt-20 mb-20"/>
                                ) : (
                                    <img
                                        className="mt-3"
                                        style={{maxHeight: "17rem"}}
                                        src={pictureToFrameShow}
                                        alt="pictureToFrameShow" />
                                )}
                            </div>
                        ) : null}

                    </div>

                    <div
                        className="flex justify-between items-center">
                        <ButtonSimple
                            type="button"
                            title="Fermer"
                            className="mt-3"
                            onClick={closeModal} />

                        { pictureToFrameShow ? (
                            <ButtonSimple
                                type="button"
                                title="Envoyer →"
                                className="mt-3"
                                onClick={eventToFrame} />
                        ) : null}
                    </div>
                </>
            )}
        </Modal>
    )
}
