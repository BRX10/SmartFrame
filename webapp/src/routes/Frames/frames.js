import { useEffect, useState } from "react";
import {useNavigate, useParams} from "react-router-dom";
import Table from "../../components/table";
import ButtonNavigation from "../../components/buttonNavigation";
import {
    GetAllFrames,
} from "../../services/framesServices";
import Spinner from "../../components/spinner";
import { GetAllLibrarys } from "../../services/librarysServices";
import Frame from "./frame";
import PropTypes from "prop-types";

export default function Frames({ token }) {

    const navigate = useNavigate();
    const params = useParams();

    const [error, setError] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [frames, setFrames] = useState([]);
    const [librarys, setLibrarys] = useState([]);
    const [isArchive, setIsArchive] = useState(true);
    
    const [isOpen, setIsOpen] = useState(false);
    const [frameIdModal, setFrameIdModal] = useState(null);
    
    useEffect(() => {
        GetAllFrames(token)
            .then(frames => {
                    setIsLoaded(true);
                    setFrames(frames);
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

        GetAllLibrarys(token)
            .then(librarys => {
                    setLibrarys(librarys);
                    librarys.push({title: "Désactiver la bibliothéque sur le frame", id: "disable_library_frame"});
                    
                    if (params.idFrame) {
                        openModal(params.idFrame)
                    }
                },
                (error) => {
                    setError(error);

                    setTimeout(function() {
                        if (error.message === "Le token a expiré") {
                            navigate("/signout", { replace: true });
                        }
                    }, 300);
                });
    }, [isArchive, token, params.idFrame, navigate]);

    
    function openModal(id) {
        setFrameIdModal(id);
        setIsOpen(true);
    }

    function closeModal() {
        setIsOpen(false);

        if (params.idFrame) {
            navigate("/frames", { replace: true });
        }
    }
    
    if (error) {
        return <div>Erreur : {error.message}</div>;
    } else if (!isLoaded) {
        return <Spinner className="mt-40"/>;
    } else {
        return (
            <>
                <Frame
                    token={token}
                    isOpen={isOpen}
                    closeModal={closeModal}
                    id={frameIdModal}
                    librarys={librarys}
                    isArchive={() => setIsArchive(!isArchive)}
                />

                <Table 
                    data={frames}
                    isClick={true}
                    onClick={ (id) => openModal(id) }
                >
                    <ButtonNavigation
                        className="mb-2 ml-4"
                        title="Ajouter un cadre"
                        onClick={ () => navigate("/new_frame", { replace: true }) } />
                </Table>
            </>
        );
    }
}


Frames.propTypes = {
    token: PropTypes.string.isRequired
}