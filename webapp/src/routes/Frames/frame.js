import { useEffect, useState } from "react";
import ButtonNavigation from "../../components/buttonNavigation";
import {
    ChangeFrameLibraryDisplay,
    ConvertKeyToStringOrientation,
    ConvertKeyToStringType,
    DeleteFrame,
    EventToFrame,
    GetFrame
} from "../../services/framesServices";
import { Dialog } from "@headlessui/react";
import Alert from "../../components/alert";
import Spinner from "../../components/spinner";
import Input from "../../components/input";
import Title from "../../components/title";
import ButtonSimple from "../../components/buttonSimple";
import Select from "../../components/select";
import Modal from "../../components/modal";
import {useNavigate} from "react-router-dom";

export default function Frame(props) {

    const navigate = useNavigate();
    
    const [selected, setSelected] = useState({ title: "Sélectionner la bibliothéque"});
    
    const [frameModal, setFrameModal] = useState({});
    const [alertModal, setAlertModal] = useState(false);
    const [typeAlertModal, setTypeAlertModal] = useState("");
    const [messageAlertModal, setMessageAlertModal] = useState("");
    const [isLoadedModal, setIsLoadedModal] = useState(false);
    const [isLoadedSendModal, setIsLoadedSendModal] = useState(true);


    useEffect(() => {
        if (props.isOpen) {
            GetFrame(props.token, props.id)
                .then(frame => {
                        setFrameModal(frame);
                        setIsLoadedModal(true);

                        if (frame.library_display) {
                            setSelected(props.librarys.find(library => library.id === frame.library_display._id.$oid));
                        }
                    },
                    (error) => {
                        setAlertModal(true);
                        setTypeAlertModal("error");
                        setMessageAlertModal("Il y a eu un problème lors de la récupération du cadre, erreur : " + error.message);
                        setIsLoadedModal(true);

                        setTimeout(function() {
                            if (error.message === "Le token a expiré") {
                                navigate("/signout", { replace: true });
                            }
                        }, 300);
                    });
        }
        
    }, [props.librarys, props.isOpen, props.id, props.token, navigate]);


    function closeModal() {
        props.closeModal();

        setTimeout(function() {
            setAlertModal(false);
            setFrameModal({});
            setSelected({title: "Sélectionner la bibliothéque"});
            setIsLoadedModal(false);
        }, 200);
    }
    

    function changeSelectedLibrary(idFrame, selectdLibrary) {
        setSelected(selectdLibrary);
        setIsLoadedSendModal(false);
        setAlertModal(false);

        ChangeFrameLibraryDisplay(props.token, idFrame, selectdLibrary.id)
            .then((_) => {
                    setAlertModal(true);
                    setTypeAlertModal("sucess");
                    setMessageAlertModal("La bibliothéque a bien été changé");
                    setIsLoadedSendModal(true);
                },
                (error) => {
                    setAlertModal(true)
                    setTypeAlertModal("error")
                    setMessageAlertModal("Il y a eu une erreur lors du changement de la bibliothéque : " + error.message)
                    setIsLoadedSendModal(true);

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

        EventToFrame(props.token, frameModal._id.$oid, selected.id)
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

    
    function archiveFrame (id) {
        setAlertModal(false);
        setIsLoadedSendModal(false);

        DeleteFrame(props.token, id)
            .then((_) => {
                    setAlertModal(true);
                    setTypeAlertModal("sucess");
                    setMessageAlertModal("Le cadre a bien été archivé");
                    props.isArchive();
                    setIsLoadedSendModal(true);

                    setTimeout(function() {
                        props.closeModal();
                        setFrameModal([]);
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
                            title={frameModal.name}/>

                        <ButtonNavigation
                            title="Archiver"
                            onClick={() => archiveFrame(frameModal._id.$oid)}/>
                    </Dialog.Title>
                    <div className="mt-9 mb-7">
                        <Select
                            className="mt-2"
                            list={props.librarys}
                            selected={selected}
                            setSelected={ (select) => changeSelectedLibrary(frameModal._id.$oid, select) } />

                        <Input
                            title="L'adresse IP"
                            type="text"
                            value={frameModal.ip}
                            disabled={true}/>

                        <Select
                            className="mt-2"
                            selected={{title: ConvertKeyToStringType(frameModal.type_frame), value: frameModal.type_frame}}
                            disabled={true}/>

                        <Input
                            title="Taille de l'écran"
                            name="inch"
                            value={frameModal.inch}
                            disabled={true}/>

                        <Input
                            title="Largeur"
                            name="resolution_width"
                            value={frameModal.resolution_width}
                            disabled={true}/>

                        <Input
                            title="Hauteur"
                            name="resolution_height"
                            value={frameModal.resolution_height}
                            disabled={true}/>

                        <Select
                            className="mt-2"
                            selected={{title: ConvertKeyToStringOrientation(frameModal.orientation), value: frameModal.orientation}}
                            disabled={true}/>

                    </div>

                    <div
                        className="flex justify-between items-center">
                        <ButtonSimple
                            type="button"
                            title="Je l'ai Merci!"
                            className="mt-3"
                            onClick={closeModal} />

                        <ButtonSimple
                            type="button"
                            title="Actualiser l'image!"
                            className="mt-3"
                            onClick={eventToFrame} />
                    </div>
                </>
            )}
        </Modal>
    );
}