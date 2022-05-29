import { useNavigate } from "react-router-dom";
import {AuthSignout} from "../../services/authServices";

import PropTypes from "prop-types";
import Signin from "./signin";
import {useEffect} from "react";

export default function Signout({token, delToken}) {
    
    const navigate = useNavigate();

    useEffect(() => {
        AuthSignout(token)
            .then((_) => {
                    delToken();
                    navigate("/", { replace: true });
                });
    }, [token, delToken, navigate]);

    return (<></>)
}

Signin.propTypes = {
    delToken: PropTypes.func.isRequired
}