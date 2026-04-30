export default function ButtonSimple(props) {
    return (
        <button
            className={"inline-flex justify-center items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 px-4 py-2.5 text-sm font-medium text-zinc-100 rounded-xl border border-zinc-700 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 " + props.className}
            type={props.type}
            onClick={ props.type === "button" ? (e) => props.onClick(e) : null}
        >
            {props.title}
        </button>
    );
}