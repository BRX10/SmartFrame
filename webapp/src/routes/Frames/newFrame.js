import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Input from "../../components/input";
import Alert from "../../components/alert";
import Button from "../../components/button";
import ButtonNavigation from "../../components/buttonNavigation";
import {PostFrame} from "../../services/framesServices";

export default function NewFrame() {

    const navigate = useNavigate();

    const [frame, setFrame] = useState("");
    const [ip, setIp] = useState("");
    const [inch, setInch] = useState("");
    const [resolution_width, setResolution_width] = useState("");
    const [resolution_height, setResolution_height] = useState("");

    const [alert, setAlert] = useState(false);
    const [typeAlert, setTypeAlert] = useState("");
    const [messageAlert, setMessageAlert] = useState("");
    
    function classNames(...classes) {
        return classes.filter(Boolean).join(' ')
    }

    function handleSubmit (event) {
        event.preventDefault();
        
        PostFrame(frame, ip, inch, resolution_width, resolution_height)
            .then((result) => {
                setAlert(true)
                setTypeAlert("sucess")
                setMessageAlert("Le cadre a bien été ajouté, id : " + result.result)

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
                console.log("error", error)
                setAlert(true)
                setTypeAlert("error")
                setMessageAlert("Il y a eu une erreur : " + error.message)
            })
    }
    
    return (
        <div className="flex w-full flex-col items-center justify-center mt-8 px-2">
            <div className={classNames('w-full lg:max-w-10xl md:max-w-4xl')}>
                <ButtonNavigation
                    className=" mb-2 ml-4 "
                    title="<-"
                    onClick={ () => navigate("/frames", { replace: true }) } />
                <div className={classNames(
                    
                    'rounded-xl bg-white',
                    'p-3 ring-white ring-opacity-60 ring-offset-2 ring-offset-orange-400 focus:outline-none focus:ring-2'
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
                            title="Nom du cadre" 
                            name="name" 
                            type="text"
                            value={frame}
                            required={true}
                            onChange={(e) => setFrame(e)} />
                        
                        <Input 
                            title="L'adresse IP" 
                            name="ip" 
                            type="text"
                            value={ip}
                            required={true}
                            onChange={(e) => setIp(e)}/>
                        
                        <Input 
                            title="Taille de l'écran" 
                            name="inch" 
                            type="number" 
                            step="0.1"
                            value={inch}
                            required={true}
                            onChange={(e) => setInch(e)}/>
                        
                        <Input 
                            title="Largeur" 
                            name="resolution_width" 
                            type="number"
                            value={resolution_width}
                            required={true}
                            onChange={(e) => setResolution_width(e)}/>
                        
                        <Input 
                            title="Hauteur" 
                            name="resolution_height" 
                            type="number"
                            value={resolution_height}
                            required={true}
                            onChange={(e) => setResolution_height(e)}/>
                        
                        <Button
                            title="Enregister"
                            type="submit" />
                    </form>
                </div>
            </div>
        </div>
    )
}