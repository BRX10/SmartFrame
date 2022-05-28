import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import ButtonNavigation from "../../components/buttonNavigation";
import Alert from "../../components/alert";
import Input from "../../components/input";
import PostImage from "../../components/postImage";
import {
    DeleteLibrary,
    GetLibrary,
    ListAction,
    PutLibrary
} from "../../services/librarysServices";
import {
    DeletePicture,
    GetAllPictureLibrary,
    GetPictureFile,
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

export default function Library() {

    const navigate = useNavigate();
    const params = useParams();

    const [pictures, setPictures] = useState([]);
    
    const [library, setLibrary] = useState("");
    const [delay, setDelay] = useState("");
    const [action, setAction] = useState( "");
    const [isArchive, setIsArchive] = useState(true);
    
    const [alert, setAlert] = useState(false);
    const [typeAlert, setTypeAlert] = useState("");
    const [messageAlert, setMessageAlert] = useState("");
    const [isLoaded, setIsLoaded] = useState(false);

    const [isOpen, setIsOpen] = useState(false);
    const [pictureModal, setPictureModal] = useState({});
    const [alertModal, setAlertModal] = useState(false);
    const [typeAlertModal, setTypeAlertModal] = useState("");
    const [messageAlertModal, setMessageAlertModal] = useState("");
    const [isLoadedModal, setIsLoadedModal] = useState(false);
    const [isLoadedSendModal, setIsLoadedSendModal] = useState(true);
    const [pictureToFrameShow, setPictureToFrameShow] = useState(null);
    const [isLoadedPctToFrame, setIsLoadedPctToFrame] = useState(true);
    const [frames, setFrames] = useState([]);
    const [selectedFrame, setSelectedFrame] = useState({ title: "Sélectionner le cadre"});
    

    function classNames(...classes) {
        return classes.filter(Boolean).join(' ')
    }

    useEffect(() => {
        GetLibrary(params.idLibrary)
            .then((library) => {
                setLibrary(library.name);
                setDelay(library.delay);
                setAction(ListAction.find(action => action.value === library.action));
                setIsLoaded(true);
            },
            (error) => {
                setAlert(true)
                setTypeAlert("error");
                setMessageAlert("Il y a eu un problème lors de la récupération de la bibliothéque, erreur : " + error.message);
                setIsLoaded(true);
            });

        GetAllPictureLibrary(params.idLibrary)
            .then((pictures) => {
                setPictures(pictures);
                setIsLoaded(true);
            }, 
            (error) => {
                setAlert(true);
                setTypeAlert("error");
                setMessageAlert("Il y a eu un problème lors de la récupération des images, erreur : " + error.message);
                setIsLoaded(true);
            });
    }, [params, isArchive]);


    function archiveLibrary () {
        setAlert(false);
        
        DeleteLibrary(params.idLibrary)
            .then((_) => {
                setAlert(true);
                setTypeAlert("sucess");
                setMessageAlert("La bibliothéque a bien été archivé");

                setTimeout(function() {
                    navigate("/librarys", { replace: true });
                }, 800);
            },
            (error) => {
                setAlert(true)
                setTypeAlert("error")
                setMessageAlert("Il y a eu une erreur : " + error.message)
            })
    }
    
    function changeLibrary (selectAction) {
        setAlert(false);
        setAction(selectAction);
        
        PutLibrary(params.idLibrary, null, null, selectAction.value)
            .then((library) => {
                setLibrary(library.name);
                setDelay(library.delay);
                setAction(ListAction.find(action => action.value === library.action));
                
                setAlert(true);
                setTypeAlert("sucess");
                setMessageAlert("La bibliothéque a bien été mis ajour");
            },
            (error) => {
                setAlert(true)
                setTypeAlert("error")
                setMessageAlert("Il y a eu une erreur : " + error.message)
            })
    }


    function openModal(id) {
        setIsOpen(true);
        setIsLoadedModal(false);
        setPictureModal(pictures.find(picture => picture.id === id));

        GetAllFrames()
            .then(frames => {
                    setIsLoadedModal(true);
                    setFrames(frames);
                },
                (_) => {
                    setIsLoadedModal(true);
                });
    }

    function closeModal() {
        setIsOpen(false);

        setTimeout(function() {
            setAlertModal(false);
            setPictureModal({});
            setSelectedFrame({ title: "Sélectionner le cadre"});
            setIsLoadedModal(false);
            setPictureToFrameShow(null);
        }, 200);
    }
    
    function changeSelectedFrame(select) {
        setSelectedFrame(select);
        setIsLoadedPctToFrame(false);
        setAlertModal(false);

        GetPictureFileToFrame(pictureModal.id, select.width, select.height)
            .then(pictureToFrame => {
                    setIsLoadedPctToFrame(true);
                    setPictureToFrameShow(URL.createObjectURL(pictureToFrame));
                },
                (_) => {
                    setIsLoadedPctToFrame(true);
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

        EventToFrameUser(selectedFrame.id, pictureModal.id)
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
                });
        
    }

    function archivePicture (id) {
        setAlertModal(false);

        DeletePicture(id)
            .then((_) => {
                    setAlertModal(true);
                    setTypeAlertModal("sucess");
                    setMessageAlertModal("L'image a bien été archivé");
                    setIsArchive(!isArchive);

                    setTimeout(function() {
                        setIsOpen(false);
                        setPictureModal([]);
                        setAlertModal(false);
                    }, 1000);
                },
                (error) => {
                    setAlertModal(true);
                    setTypeAlertModal("error");
                    setMessageAlertModal("Il y a eu une erreur : " + error.message);
                })
    }

    if (!isLoaded) {
        return <Spinner className="mt-40"/>;
    } else {
        return (
            <div className="flex w-full flex-col items-center justify-center mt-8 px-2 pb-10">
                <div className={classNames('w-full lg:max-w-10xl md:max-w-4xl')}>
                    <ButtonNavigation
                        className="mb-2 ml-4 "
                        title="<-"
                        onClick={() => navigate("/librarys", {replace: true})}/>

                    <ButtonNavigation
                        className="mb-2 ml-4 "
                        title="Archiver"
                        onClick={() => archiveLibrary()}/>

                    <div className={classNames(
                        'rounded-xl bg-white',
                        'p-3 ring-white ring-opacity-60 ring-offset-2 ring-offset-orange-400 focus:outline-none focus:ring-2',
                        'dark:bg-gray-900 dark:border-gray-600'
                    )}>

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
                                            title={pictureModal.title}/>

                                        <ButtonNavigation
                                            title="Archiver"
                                            onClick={() => archivePicture(pictureModal.id)}/>
                                    </Dialog.Title>
                                    <div className="mt-9 mb-3">
                                        
                                        <Input
                                            title="Ordre"
                                            name="delay"
                                            type="number"
                                            value={pictureModal.order}
                                            disabled={true}/>

                                        <img
                                            className="mt-3"
                                            style={{height: "15rem"}}
                                            src={pictureModal.picture}
                                            alt={pictureModal.fileName}/>

                                        <Select
                                            className="mt-5"
                                            list={frames}
                                            selected={selectedFrame}
                                            setSelected={ (select) => changeSelectedFrame(select) } />

                                        { pictureToFrameShow || !isLoadedPctToFrame ? (
                                            <>
                                                { !isLoadedPctToFrame ? (
                                                    <Spinner className="mt-10 mb-5"/>
                                                ) : null }
                                                
                                                <img
                                                    hidden={!isLoadedPctToFrame}
                                                    className="mt-3"
                                                    style={{height: "15rem"}}
                                                    src={pictureToFrameShow}
                                                    alt="pictureToFrameShow" />
                                            </>
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
                        
                        
                        <Alert
                            className="mt-4"
                            alert={alert}
                            typeAlert={typeAlert}
                            messageAlert={messageAlert}
                            onClose={(e) => setAlert(e)}
                        />

                        <form className="flex flex-col items-center justify-center mt-1" style={{width: "100%"}}>
                            <Input
                                title="Nom de la bibliothéque"
                                name="name"
                                type="text"
                                value={library}
                                required={true}
                                disabled={true}
                                onChange={(e) => setLibrary(e)}/>

                            <Input
                                title="Délai"
                                name="delay"
                                type="number"
                                step="0.1"
                                value={delay}
                                required={true}
                                disabled={true}
                                onChange={(e) => setDelay(e)}/>

                            <Select
                                className="mt-2"
                                list={ListAction}
                                selected={action}
                                setSelected={ (select) => changeLibrary(select)}/>
                        </form>
                        
                        <Title
                            title="Les photos"
                            className="mt-8 ml-3" />
                        
                        <div className={"flex w-full flex-col items-center justify-center px-2 mt-8"}>
                            <div className={classNames(
                                'w-full lg:max-w-10xl md:max-w-4xl'
                            )}>
                                <ButtonNavigation
                                    class=" mb-2 ml-4 "
                                    title="Ajouter une image"
                                    onClick={() => navigate("/new_image/" + params.idLibrary + "/" + (pictures.length + 1), {replace: true})}/>

                                <div className={classNames(
                                    'rounded-xl bg-white',
                                    'p-3 ring-white ring-opacity-60 ring-offset-2 ring-offset-orange-400 focus:outline-none focus:ring-2 ',
                                    'dark:bg-gray-900 dark:border-gray-600'
                                )}>
                                    <ul>
                                        {pictures.map((post) => (
                                            <PostImage
                                                idx={post.idx}
                                                id={post.id}
                                                image={post.picture}
                                                key={post.idx}
                                                title={post.title}
                                                list={[
                                                    post.date,
                                                    post.subTitle
                                                ]}
                                                isClick={true}
                                                onClick={ () => openModal(post.id) }/>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}