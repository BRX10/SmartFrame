export default function ButtonNavigation(props) {
    return (
        <button
            type="button"
            style={props.style}
            onClick={(e) => props.onClick(e)}
            disabled={props.disabled}
            className={"inline-flex items-center gap-1.5 justify-center bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-sm text-zinc-200 font-medium py-2 px-4 rounded-xl border border-zinc-700 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:opacity-40 " + props.className}>
            {props.title}
        </button>
    );
}