import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Alert from "../../components/alert";
import Input from "../../components/input";
import Button from "../../components/button";
import { AuthLogin } from "../../services/authServices";
import PropTypes from 'prop-types';

export default function Signin({ setToken }) {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isActive, setIsActive] = useState(false);

    const [alert, setAlert] = useState(false);
    const [typeAlert, setTypeAlert] = useState("");
    const [messageAlert, setMessageAlert] = useState("");

    function handleSubmit(event) {
        event.preventDefault();
        setAlert(false);
        setIsActive(true);

        AuthLogin(username, password)
            .then((token) => {
                setToken(token);
                setTimeout(() => navigate("/", { replace: true }), 400);
            }, (error) => {
                setIsActive(false);
                setAlert(true);
                setTypeAlert("error");
                setMessageAlert("Identifiants incorrects");
            });
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">

                {/* Logo + titre */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                            <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                            <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100 1.5.75.75 0 000-1.5z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">SmartFrame</h1>
                    <p className="text-sm text-zinc-500 mt-1">Connectez-vous pour continuer</p>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                    <Alert
                        alert={alert}
                        typeAlert={typeAlert}
                        messageAlert={messageAlert}
                        onClose={(e) => setAlert(e)}
                    />

                    <form className="flex flex-col" onSubmit={handleSubmit}>
                        <Input
                            disabled={isActive}
                            title="Nom d'utilisateur"
                            name="username"
                            type="text"
                            value={username}
                            required={true}
                            onChange={(e) => setUsername(e)}
                        />
                        <Input
                            disabled={isActive}
                            title="Mot de passe"
                            name="password"
                            type="password"
                            value={password}
                            required={true}
                            onChange={(e) => setPassword(e)}
                        />
                        <Button
                            disabled={isActive}
                            title={isActive ? "Connexion…" : "Se connecter"}
                            type="submit"
                        />
                    </form>
                </div>
            </div>
        </div>
    );
}

Signin.propTypes = {
    setToken: PropTypes.func.isRequired
}
