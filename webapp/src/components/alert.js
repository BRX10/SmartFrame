export default function Alert(props) {

    function classNames(...classes) {
        return classes.filter(Boolean).join(' ')
    }
    
    return (
        <div className={classNames(
            " " + props.className,
            props.alert ? "flex justify-between items-center" : "",
            "px-4 py-3 rounded relative mb-4", 
            props.typeAlert === "sucess" ? "bg-green-100 border border-green-400 text-green-700" : "bg-red-100 border border-red-400 text-red-700"
            )} role="alert" hidden={!props.alert}>
            
            <div>
                <strong className="font-bold">{props.typeAlert === "sucess" ? "Succès" : "Erreur "}</strong>
                <span className="block sm:inline ml-1"> {props.messageAlert}</span>
            </div>
            <span onClick={ () => {props.onClose(false)}}>
                <svg className={ props.typeAlert === "sucess" ? "fill-current h-6 w-6 text-green-500" : "fill-current h-6 w-6 text-red-500"} role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Fermer</title>
                    <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
                </svg>
            </span>
            
        </div>
    );
}