export default function Button(props) {
    return (
        <button
            disabled={props.disabled}
            onClick={ props.type === "button" ? (e) => props.onClick(e) : null}
            type={props.type}
            className="mt-8 mb-2 bg-orange-200 hover:bg-orange-300 text-orange-500 font-bold py-2 px-4 border-b-4 border-orange-300 cursor-default hover:border-orange-500 hover:text-orange-900 rounded focus:outline-none focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 "
        >
            {props.title}
        </button>
    );
}