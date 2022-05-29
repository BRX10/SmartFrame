import Table from "../../components/table";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ButtonNavigation from "../../components/buttonNavigation";
import { GetAllLibrarys } from "../../services/librarysServices";
import Spinner from "../../components/spinner";
import PropTypes from "prop-types";

export default function Librarys({ token }) {

    const navigate = useNavigate();

    const [error, setError] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [items, setItems] = useState([]);

    useEffect(() => {
        GetAllLibrarys(token)
            .then((librarys) => {
                setIsLoaded(true);
                setItems(librarys);
            },
            (error) => {
                setIsLoaded(true);
                setError(error);

                setTimeout(function() {
                    if (error.message === "Le token a expiré") {
                        navigate("/signout", { replace: true });
                    }
                }, 300);
            });
    }, [token, navigate]);

    if (error) {
        return <div>Erreur : {error.message}</div>;
    } else if (!isLoaded) {
        return <Spinner className="mt-40"/>;
    } else {
        return (
            <Table 
                data={items}
                isClick={true}
                onClick={ (id) => navigate("/library/"+id, { replace: true }) }
            >
                <ButtonNavigation
                    className=" mb-2 ml-4 "
                    title="Ajouter une bibliothéque"
                    onClick={ () => navigate("/new_library", { replace: true }) } />
            </Table>
        );
    }
}

Librarys.propTypes = {
    token: PropTypes.string.isRequired
}