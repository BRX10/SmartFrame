import { useEffect, useState } from "react";
import ButtonNavigation from "../../components/buttonNavigation";
import Alert from "../../components/alert";
import Input from "../../components/input";
import {
    DeletePicture,
    GetPictureFileToFrame
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
        
    }, [props.pictureModal, props.token, navigate]);
    

    function closeModal() {
        props.closeModal()

        setAlertModal(false);
        setSelectedFrame({ title: "Sélectionner le cadre"});
        setPictureToFrameShow(null);
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
                    setMessageAlertModal("L'image a bien été changé");
                    setIsLoadedSendModal(true);
                },
                (error) => {
                    setAlertModal(true)
                    setTypeAlertModal("error")
                    setMessageAlertModal("Il y a eu une erreur lors du changement de l'image : " + error.message)
                    setIsLoadedSendModal(true);

                    setTimeout(function() {
                        if (error.message === "Le token a expiré") {
                            navigate("/signout", { replace: true });
                        }
                    }, 300);
                });

    }

    function archivePicture (id) {
        setAlertModal(false);
        setIsLoadedSendModal(false);

        DeletePicture(props.token, id)
            .then((_) => {
                    setAlertModal(true);
                    setTypeAlertModal("sucess");
                    setMessageAlertModal("L'image a bien été archivé");
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
                    setMessageAlertModal("Il y a eu une erreur : " + error.message);

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
                        <Title
                            title={props.pictureModal.title}/>

                        <ButtonNavigation
                            title="Archiver"
                            onClick={() => archivePicture(props.pictureModal.id)}/>
                    </Dialog.Title>
                    <div className="mt-9 mb-5">

                        <Input
                            title="Ordre"
                            name="delay"
                            type="number"
                            value={props.pictureModal.order}
                            disabled={true}/>
                        
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
                            title="Je l'ai Merci!"
                            className="mt-3"
                            onClick={closeModal} />

                        { pictureToFrameShow ? (
                            <ButtonSimple
                                type="button"
                                title="Envoyer l'image sur le cadre"
                                className="mt-3"
                                onClick={eventToFrame} />
                        ) : null}
                    </div>
                </>
            )}
        </Modal>
    )
}