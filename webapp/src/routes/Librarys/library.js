import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import ButtonNavigation from "../../components/buttonNavigation";
import Alert from "../../components/alert";
import Input from "../../components/input";
import PostImage from "../../components/postImage";
import {
    ConvertKeyToStringAction,
    DeleteLibrary,
    GetLibrary,
    ListAction,
    PutLibrary
} from "../../services/librarysServices";
import { GetAllPictureLibrary } from "../../services/picturesServices";
import Spinner from "../../components/spinner";
import Title from "../../components/title";
import Select from "../../components/select";

export default function Library() {

    const navigate = useNavigate();
    const params = useParams();

    const [pictures, setPictures] = useState([]);
    
    const [library, setLibrary] = useState("");
    const [delay, setDelay] = useState("");
    const [action, setAction] = useState( "");
    
    const [alert, setAlert] = useState(false);
    const [typeAlert, setTypeAlert] = useState("");
    const [messageAlert, setMessageAlert] = useState("");
    const [isLoaded, setIsLoaded] = useState(false);

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
    }, [params]);


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
                                                ]}/>
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