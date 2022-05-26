import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Table from "../../components/table";
import ButtonNavigation from "../../components/buttonNavigation";
import {
    ChangeFrameLibraryDisplay,
    ConvertKeyToStringOrientation, ConvertKeyToStringType,
    DeleteFrame,
    GetAllFrames,
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
import { GetAllLibrarys } from "../../services/librarysServices";

export default function Frames() {

    const navigate = useNavigate();

    const [selected, setSelected] = useState({ title: "Sélectionner la bibliothéque"});

    const [error, setError] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [frames, setFrames] = useState([]);
    const [librarys, setLibrarys] = useState([]);
    const [isArchive, setIsArchive] = useState(true);

    const [isOpen, setIsOpen] = useState(false);
    const [frameModal, setFrameModal] = useState({});
    const [alertModal, setAlertModal] = useState(false);
    const [typeAlertModal, setTypeAlertModal] = useState("");
    const [messageAlertModal, setMessageAlertModal] = useState("");
    const [isLoadedModal, setIsLoadedModal] = useState(false);

    useEffect(() => {
        GetAllFrames()
            .then(frames => {
                    setIsLoaded(true);
                    setFrames(frames);
                },
                (error) => {
                    setIsLoaded(true);
                    setError(error);
                });

        GetAllLibrarys()
            .then(librarys => {
                    setLibrarys(librarys);
                },
                (error) => {
                    setAlertModal(true);
                    setTypeAlertModal("error");
                    setMessageAlertModal("Il y a eud un problème lors de la récupération des bibliothéques, erreur : " + error.message);
                });
    }, [isArchive]);

    
    function openModal(id) {
        setIsOpen(true);
        
        GetFrame(id)
            .then(frame => {
                setFrameModal(frame);
                setIsLoadedModal(true);
                
                if (frame.library_display) {
                    setSelected({title: frame.library_display.name});
                }
            },
            (error) => {
                setAlertModal(true);
                setTypeAlertModal("error");
                setMessageAlertModal("Il y a eu un problème lors de la récupération du cadre, erreur : " + error.message);
                setIsLoadedModal(true);
            });
    }

    function closeModal() {
        setIsOpen(false);

        setTimeout(function() {
            setAlertModal(false);
            setFrameModal({});
            setSelected({title: "Sélectionner la bibliothéque"});
            setIsLoadedModal(false);
        }, 200);
    }
    
    function changeSelectedLibrary(idFrame, selectdLibrary) {
        setSelected(selectdLibrary);

        ChangeFrameLibraryDisplay(idFrame, selectdLibrary.id)
            .then((_) => {
                setAlertModal(true);
                setTypeAlertModal("sucess");
                setMessageAlertModal("La bibliothéque a bien été changé");
            },
            (error) => {
                setAlertModal(true)
                setTypeAlertModal("error")
                setMessageAlertModal("Il y a eu une erreur lors du changement de la bibliothéque : " + error.message)
            });
    }
    
    function archiveFrame (id) {
        DeleteFrame(id)
            .then((_) => {
                setAlertModal(true);
                setTypeAlertModal("sucess");
                setMessageAlertModal("Le cadre a bien été archivé");
                setIsArchive(!isArchive);

                setTimeout(function() {
                    setIsOpen(false);
                    setFrameModal([]);
                    setAlertModal(false);
                }, 1000);
            },
            (error) => {
                setAlertModal(true);
                setTypeAlertModal("error");
                setMessageAlertModal("Il y a eu une erreur : " + error.message);
            })
    }
    
    
    if (error) {
        return <div>Erreur : {error.message}</div>;
    } else if (!isLoaded) {
        return <Spinner className="mt-40"/>;
    } else {
        return (
            <>
                <Modal
                    isOpen={isOpen}
                    setIsOpen={closeModal} 
                >
                    <Alert
                        className="mb-8"
                        alert={alertModal}
                        typeAlert={typeAlertModal}
                        messageAlert={messageAlertModal}
                        onClose={ (e) => setAlertModal(e) }
                    />

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
                                    list={librarys}
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


                            <ButtonSimple
                                type="button"
                                title="Je l'ai Merci!"
                                className="mt-3"
                                onClick={closeModal} />
                        </>
                    )}
                </Modal>

                <Table 
                    data={frames}
                    isClick={true}
                    onClick={ (id) => openModal(id) }
                >
                    <ButtonNavigation
                        className="mb-2 ml-4"
                        title="Ajouter un cadre"
                        onClick={ () => navigate("/new_frame", { replace: true }) } />
                </Table>
            </>
        );
    }
}