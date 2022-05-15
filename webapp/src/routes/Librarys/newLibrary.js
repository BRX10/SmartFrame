import { useNavigate } from "react-router-dom";
import { useState } from "react";
import ButtonNavigation from "../../components/buttonNavigation";
import Alert from "../../components/alert";
import Input from "../../components/input";
import Button from "../../components/button";
import { PostLibrary } from "../../services/librarysServices";

export default function NewLibrary() {

    const navigate = useNavigate();

    const [library, setLibrary] = useState("");
    const [delay, setDelay] = useState("");

    const [alert, setAlert] = useState(false);
    const [typeAlert, setTypeAlert] = useState("");
    const [messageAlert, setMessageAlert] = useState("");

    function classNames(...classes) {
        return classes.filter(Boolean).join(' ')
    }

    function handleSubmit (event) {
        event.preventDefault();

        PostLibrary(library, delay)
            .then((library) => {
                setAlert(true)
                setTypeAlert("sucess")
                setMessageAlert("La bibliothéque a bien été ajouté, id : " + library.result)

                setLibrary("");
                setDelay("");

                setTimeout(function() {
                    navigate("/library/"+library.result, { replace: true })
                }, 800);
            }, 
            (error) => {
                setAlert(true)
                setTypeAlert("error")
                setMessageAlert("Il y a eu une erreur : " + error.message)
            });
    }
    
    return (
        <div className="flex w-full flex-col items-center justify-center mt-8 px-2">
            <div className={classNames('w-full lg:max-w-10xl md:max-w-4xl')}>
                <ButtonNavigation
                    className=" mb-2 ml-4 "
                    title="<-"
                    onClick={ () => navigate("/librarys", { replace: true }) } />
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
                            title="Nom de la bibliothéque"
                            name="name"
                            type="text"
                            value={library}
                            required={true}
                            onChange={(e) => setLibrary(e)} />

                        <Input
                            title="Délai"
                            name="delay"
                            type="number"
                            value={delay}
                            required={true}
                            onChange={(e) => setDelay(e)}/>
                        
                        <Button
                            title="Enregister"
                            type="submit" />
                    </form>
                </div>
            </div>
        </div>
    )
}