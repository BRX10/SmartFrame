export default function ButtonSimple(props) {
    return (
        <button
            className={"inline-flex justify-center rounded-md border border-transparent bg-orange-50 px-4 py-2 text-sm text-orange-900 hover:bg-orange-100 cursor-default rounded-lg focus:outline-none focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 " + props.className }
            type={props.type}
            onClick={ props.type === "button" ? (e) => props.onClick(e) : null}
        >
            {props.title}
        </button>
    );
}