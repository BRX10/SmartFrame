export default function ButtonNavigation(props) {
    return (
        <button
            type="button"
            style={props.style}
            onClick={(e) => props.onClick(e)}
            disabled={props.disabled}
            className={"inline-flex cursor-default justify-center bg-white hover:bg-orange-100 text-sm text-orange-800 font-semibold py-2 px-4 rounded-lg border border-orange-200 focus:outline-none focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-600 dark:focus-visible:border-gray-400 dark:hover:bg-gray-400 dark:hover:text-gray-900 "+ props.className}>
            {props.title}
        </button>
    );
}