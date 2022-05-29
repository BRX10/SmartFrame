import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Alert from "../../components/alert";
import Input from "../../components/input";
import Button from "../../components/button";
import {AuthLogin} from "../../services/authServices";
import Title from "../../components/title";
import PropTypes from 'prop-types';

export default function Signin({ setToken }) {

    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isActive, setIsActive] = useState(false);

    const [alert, setAlert] = useState(false);
    const [typeAlert, setTypeAlert] = useState("");
    const [messageAlert, setMessageAlert] = useState("");

    function classNames(...classes) {
        return classes.filter(Boolean).join(' ')
    }

    function handleSubmit (event) {
        event.preventDefault();
        setAlert(false);
        setIsActive(true);
        
        AuthLogin(username, password)
            .then((token) => {
                    setToken(token);

                    setAlert(true);
                    setTypeAlert("sucess");
                    setMessageAlert("Authentification réussite");

                    setTimeout(function() {
                        navigate("/", { replace: true });
                        setAlert(false);
                    }, 800);
                }, 
                (error) => {
                    setIsActive(false);
                    setAlert(true);
                    setTypeAlert("error");
                    setMessageAlert("Il y a eu une erreur : " + error.message);
                });
        
    }

    return (
        <div className="flex items-center justify-center flex-col" style={{height: "100vh"}}>
            <div className={classNames('w-full max-w-md')}>
                <div className={classNames(

                    'rounded-xl bg-white',
                    'p-3 ring-white ring-opacity-60 ring-offset-2 ring-offset-orange-400 focus:outline-none focus:ring-2',
                    'dark:bg-gray-900 dark:border-gray-600'
                )}>

                    <Title
                        className="text-center mt-5 mb-10"
                        title="Connectez vous a Smart-Frame" />
                    
                    <Alert
                        className="mt-4"
                        alert={alert}
                        typeAlert={typeAlert}
                        messageAlert={messageAlert}
                        onClose={ (e) => setAlert(e) }
                    />

                    <form className="flex flex-col items-center justify-center mt-1" style={{width: "100%"}} onSubmit={handleSubmit}>
                        <Input
                            disabled={isActive}
                            title="Nom d'utilisateur"
                            name="name"
                            type="text"
                            value={username}
                            required={true}
                            onChange={(e) => setUsername(e)} />

                        <Input
                            disabled={isActive}
                            title="Mot de passe"
                            name="delay"
                            type="password"
                            value={password}
                            required={true}
                            onChange={(e) => setPassword(e)}/>
                        

                        <Button
                            disabled={isActive}
                            title="Se connecter"
                            type="submit" />
                    </form>
                </div>
            </div>
        </div>
    )
}

Signin.propTypes = {
    setToken: PropTypes.func.isRequired
}