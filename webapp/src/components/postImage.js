export default function PostImage(props) {
    function classNames(...classes) {
        return classes.filter(Boolean).join(' ')
    }

    return (
        <li className="relative rounded-md p-3 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 mt-1">
            <div className="flex flex-row justify-between items-center dark:text-white">
                <h3 className="text-sm font-medium leading-5">
                    {props.title}
                </h3>

                <img 
                    style={{width: "20%", height: "40%"}}
                    src={props.image}
                    alt={props.title}/>
            </div>

            <ul className="mt-1 flex space-x-1 text-xs font-normal leading-4 text-gray-500 dark:text-gray-300">
                { props.list.map( (item, idx) => (
                    <>
                        <li>{item}</li>
                        { props.list.length-1 !== idx ? (
                            <li>&middot;</li>
                        ) : null }
                    </>
                ))}

                { props.href ? (
                    <a
                        href={props.href}
                        className={classNames(
                            'absolute inset-0 rounded-md',
                            'ring-blue-400 focus:z-10 focus:outline-none focus:ring-2'
                        )}
                    />
                ) : null}
            </ul>
        </li>
    );
}