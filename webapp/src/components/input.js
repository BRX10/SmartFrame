export default function Input(props) {
    return (
        <div className={"flex mt-2 w-full " + props.className}>
            <span style={{width: "14rem"}} className="inline-flex items-center px-4 text-sm text-orange-900 bg-orange-200 border border-r-0 border-orange-300 rounded-l-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600 ">{props.title}</span>
            <input disabled={props.disabled} onChange={ (e) => props.onChange(e.target.value)} value={props.value} name={props.name} step={props.step} className="w-full rounded-none rounded-r-lg bg-orange-50 text-orange-900 block text-sm p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white cursor-default border border-orange-200 focus:outline-none focus:border-orange-200 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300" type={props.type} style={{width: "100%"}} required={props.required} />
        </div>
    );
}