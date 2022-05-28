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

export default function Frames() {

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
        GetAllFrames()
            .then(frames => {
                    setIsLoaded(true);
                    setFrames(frames);
                },
                (error) => {
                    setIsLoaded(true);
                    setError(error);
                });

        GetAllLibrarys()
            .then(librarys => {
                    setLibrarys(librarys);
                    
                    if (params.idFrame) {
                        openModal(params.idFrame)
                    }
                },
                (error) => {
                    setError(error);
                });
    }, [isArchive]);

    
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
                    isOpen={isOpen}
                    closeModal={closeModal}
                    id={frameIdModal}
                    librarys={librarys}
                    setIsArchive={setIsArchive}
                    isArchive={setIsArchive}
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