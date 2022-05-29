import {useNavigate, useParams} from "react-router-dom";
import { useState } from "react";
import ButtonNavigation from "../../components/buttonNavigation";
import Alert from "../../components/alert";
import Input from "../../components/input";
import Button from "../../components/button";
import DropzoneImage from "../../components/dropzone";
import { PostPictureLibrary } from "../../services/picturesServices";
import PropTypes from "prop-types";

export default function NewImage({ token }) {

    const navigate = useNavigate();
    const params = useParams();

    const [name, setName] = useState("");
    const [file, setFile] = useState();

    const [alert, setAlert] = useState(false);
    const [typeAlert, setTypeAlert] = useState("");
    const [messageAlert, setMessageAlert] = useState("");
    
    function classNames(...classes) {
        return classes.filter(Boolean).join(' ')
    }

    function handleSubmit(event ) {
        event.preventDefault();
        
        PostPictureLibrary(token, params.idLibrary, name, params.order, file)
            .then((picture) => {
                setAlert(true)
                setTypeAlert("sucess")
                setMessageAlert("L'image a bien été ajouté, id : " + picture.result)

                setName("");

                setTimeout(function() {
                    navigate("/library/"+params.idLibrary, { replace: true })
                }, 800);
            },
            (error) => {
                setAlert(true);
                setTypeAlert("error");
                setMessageAlert("Il y a eu une erreur : " + error.message);

                setTimeout(function() {
                    if (error.message === "Le token a expiré") {
                        navigate("/signout", { replace: true });
                    }
                }, 300);
            });
    }

    return (
        <div className="flex w-full flex-col items-center justify-center mt-8 px-2">
            <div className={classNames('w-full lg:max-w-10xl md:max-w-4xl')}>
                <ButtonNavigation
                    className=" mb-2 ml-4 "
                    title="<-"
                    onClick={ () => navigate("/library/"+params.idLibrary, { replace: true }) } />
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
                        onClose={ (e) => setAlert(e) }
                    />

                    <form className="flex flex-col items-center justify-center mt-1" style={{width: "100%"}} onSubmit={handleSubmit}>
                        <Input
                            title="Nom de l'image"
                            name="name"
                            type="text"
                            value={name}
                            required={true}
                            onChange={(e) => setName(e)} />

                        <Input
                            title="Ordre"
                            name="delay"
                            type="number"
                            value={params.order}
                            required={false}
                            disabled={true}/>

                        <DropzoneImage
                            className="mt-4"
                            file={file}
                            setFile={ (image) => setFile(image)}
                            title="Téléchargement de l'image"
                            subTitle="Joindre une image" />

                        <Button
                            title="Enregister"
                            type="submit" />
                    </form>
                </div>
            </div>
        </div>
    )
}


NewImage.propTypes = {
    token: PropTypes.string.isRequired
}