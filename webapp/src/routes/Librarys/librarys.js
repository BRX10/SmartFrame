import Table from "../../components/table";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ButtonNavigation from "../../components/buttonNavigation";
import { GetAllLibrarys } from "../../services/librarysServices";
import Spinner from "../../components/spinner";

export default function Librarys() {

    const navigate = useNavigate();

    const [error, setError] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [items, setItems] = useState([]);

    useEffect(() => {
        GetAllLibrarys()
            .then((librarys) => {
                setIsLoaded(true);
                setItems(librarys);
            },
            (error) => {
                setIsLoaded(true);
                setError(error);
            });
    }, []);

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