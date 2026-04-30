export default function Button(props) {
    return (
        <button
            disabled={props.disabled}
            onClick={props.type === "button" ? (e) => props.onClick(e) : null}
            type={props.type}
            className="mt-6 mb-2 w-full flex justify-center items-center gap-2 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-semibold text-sm py-3 px-6 rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed"
        >
            {props.title}
        </button>
    );
}