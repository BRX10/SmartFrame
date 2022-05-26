import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Input from "../../components/input";
import Alert from "../../components/alert";
import Button from "../../components/button";
import ButtonNavigation from "../../components/buttonNavigation";
import {PostFrame, ListType, ListOrientation} from "../../services/framesServices";
import Spinner from "../../components/spinner";
import Select from "../../components/select";

export default function NewFrame() {

    const navigate = useNavigate();

    const [frame, setFrame] = useState("");
    const [ip, setIp] = useState("");
    const [type, setType] = useState({ title: "Sélectionner le type du cadre"});
    const [key, setKey] = useState("");
    const [inch, setInch] = useState("");
    const [resolution_width, setResolution_width] = useState("");
    const [resolution_height, setResolution_height] = useState("");
    const [orientation, setOrientation] = useState({ title: "Sélectionner l'orientation"});
    
    const [isLoaded, setIsLoaded] = useState(true);
    const [alert, setAlert] = useState(false);
    const [typeAlert, setTypeAlert] = useState("");
    const [messageAlert, setMessageAlert] = useState("");
    
    function classNames(...classes) {
        return classes.filter(Boolean).join(' ')
    }

    function handleSubmit (event) {
        event.preventDefault();

        setIsLoaded(false);
        setAlert(false);
        PostFrame(frame, ip, key, inch, resolution_width, resolution_height, orientation.value, type.value)
            .then((result) => {
                setIsLoaded(true);
                setAlert(true);
                setTypeAlert("sucess");
                setMessageAlert("Le cadre a bien été ajouté, id : " + result.result);

                setFrame("");
                setIp("");
                setInch("");
                setResolution_width("");
                setResolution_height("");

                setTimeout(function() {
                    navigate("/frames", { replace: true })
                }, 800);
            },
            (error) => {
                setIsLoaded(true);
                setAlert(true);
                setTypeAlert("error");
                setMessageAlert("Il y a eu une erreur : " + error.message);
            })
    }
    
    return (
        <div className="flex w-full flex-col items-center justify-center mt-8 px-2">
            <div className={classNames('w-full lg:max-w-10xl md:max-w-4xl')}>
                <ButtonNavigation
                    className=" mb-2 ml-4 "
                    title="<-"
                    disabled={!isLoaded}
                    onClick={ () => navigate("/frames", { replace: true }) } />
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

                    { !isLoaded ? (
                        <Spinner className="mt-4 mb-4"/>
                    ) : null}
                    
                    <form className="flex justify-between flex-col items-center  mt-1" style={{width: "100%"}} onSubmit={handleSubmit}>
                        <Input
                            disabled={!isLoaded}
                            title="Nom du cadre" 
                            name="name" 
                            type="text"
                            value={frame}
                            required={true}
                            onChange={(e) => setFrame(e)} />
                        
                        <Input
                            disabled={!isLoaded}
                            title="L'adresse IP" 
                            name="ip" 
                            type="text"
                            value={ip}
                            required={true}
                            onChange={(e) => setIp(e)}/>

                        <Input
                            disabled={!isLoaded}
                            title="Clé"
                            name="key"
                            type="text"
                            value={key}
                            required={true}
                            onChange={(e) => setKey(e)}/>

                        <Select
                            className="mt-1"
                            list={ListType}
                            selected={type}
                            setSelected={ (select) => setType(select)} />
                        
                        <Input
                            disabled={!isLoaded}
                            title="Taille de l'écran" 
                            name="inch" 
                            type="number" 
                            step="0.1"
                            value={inch}
                            required={true}
                            onChange={(e) => setInch(e)}/>
                        
                        <Input
                            disabled={!isLoaded}
                            title="Largeur" 
                            name="resolution_width" 
                            type="number"
                            value={resolution_width}
                            required={true}
                            onChange={(e) => setResolution_width(e)}/>
                        
                        <Input
                            disabled={!isLoaded}
                            title="Hauteur" 
                            name="resolution_height" 
                            type="number"
                            value={resolution_height}
                            required={true}
                            onChange={(e) => setResolution_height(e)}/>

                        <Select
                            className="mt-1"
                            list={ListOrientation}
                            selected={orientation}
                            setSelected={ (select) => setOrientation(select)} />
                        
                        <Button
                            disabled={!isLoaded}
                            title="Enregister"
                            type="submit" />
                    </form>
                </div>
            </div>
        </div>
    )
}